import { LockedCacheManager, CacheEntry, CacheData } from '../../src/integration/LockedCacheManager';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

describe('LockedCacheManager', () => {
  let cacheManager: LockedCacheManager;
  let testDir: string;
  let cacheDir: string;

  beforeEach(async () => {
    // Create unique temp directory for each test
    testDir = path.join(os.tmpdir(), `cache-test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
    cacheDir = path.join(testDir, 'autoheal-cache');
    await fs.mkdir(cacheDir, { recursive: true });

    cacheManager = new LockedCacheManager(cacheDir);

    // Give proper-lockfile time to initialize
    await new Promise(resolve => setTimeout(resolve, 50));
  }, 10000);

  afterEach(async () => {
    // Cleanup
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('loadCache', () => {
    it('should return empty object if cache file does not exist', async () => {
      const cache = await cacheManager.loadCache();
      expect(cache).toEqual({});
    });

    it('should load existing cache from file', async () => {
      const testCache: CacheData = {
        'button|login': {
          successCount: 5,
          failureCount: 0,
          selector: '#login-btn',
          timestamp: Date.now()
        }
      };

      await cacheManager.saveCache(testCache, false);

      const loaded = await cacheManager.loadCache();
      expect(loaded).toEqual(testCache);
    });
  });

  describe('saveCache', () => {
    it('should save cache to file without merge', async () => {
      const testCache: CacheData = {
        'input|username': {
          successCount: 1,
          failureCount: 0,
          selector: '#username',
          timestamp: Date.now()
        }
      };

      await cacheManager.saveCache(testCache, false);

      const loaded = await cacheManager.loadCache();
      expect(loaded).toEqual(testCache);
    });

    it('should merge with existing cache when merge=true', async () => {
      const initialCache: CacheData = {
        'input|username': {
          successCount: 1,
          failureCount: 0,
          selector: '#username',
          timestamp: 1000
        }
      };

      await cacheManager.saveCache(initialCache, false);

      const newCache: CacheData = {
        'input|password': {
          successCount: 1,
          failureCount: 0,
          selector: '#password',
          timestamp: 2000
        }
      };

      await cacheManager.saveCache(newCache, true);

      const loaded = await cacheManager.loadCache();
      expect(Object.keys(loaded)).toHaveLength(2);
      expect(loaded['input|username']).toBeDefined();
      expect(loaded['input|password']).toBeDefined();
    });

    it('should use newer entry when timestamps differ', async () => {
      const oldCache: CacheData = {
        'button|submit': {
          successCount: 1,
          failureCount: 0,
          selector: '#old-submit',
          timestamp: 1000
        }
      };

      await cacheManager.saveCache(oldCache, false);

      const newCache: CacheData = {
        'button|submit': {
          successCount: 2,
          failureCount: 0,
          selector: '#new-submit',
          timestamp: 2000
        }
      };

      await cacheManager.saveCache(newCache, true);

      const loaded = await cacheManager.loadCache();
      expect(loaded['button|submit'].selector).toBe('#new-submit');
      expect(loaded['button|submit'].timestamp).toBe(2000);
    });

    it('should merge counts for entries with same timestamp', async () => {
      const cache1: CacheData = {
        'button|submit': {
          successCount: 3,
          failureCount: 1,
          selector: '#submit',
          timestamp: 1000
        }
      };

      await cacheManager.saveCache(cache1, false);

      const cache2: CacheData = {
        'button|submit': {
          successCount: 2,
          failureCount: 1,
          selector: '#submit',
          timestamp: 1000
        }
      };

      await cacheManager.saveCache(cache2, true);

      const loaded = await cacheManager.loadCache();
      expect(loaded['button|submit'].successCount).toBe(5);
      expect(loaded['button|submit'].failureCount).toBe(2);
    });
  });

  describe('updateCache', () => {
    it('should update specific entries', async () => {
      const initial: CacheData = {
        'input|username': {
          successCount: 1,
          failureCount: 0,
          selector: '#username',
          timestamp: 1000
        }
      };

      await cacheManager.saveCache(initial, false);

      const updates: CacheData = {
        'input|password': {
          successCount: 1,
          failureCount: 0,
          selector: '#password',
          timestamp: 2000
        }
      };

      await cacheManager.updateCache(updates);

      const loaded = await cacheManager.loadCache();
      expect(Object.keys(loaded)).toHaveLength(2);
    });
  });

  describe('getEntry and setEntry', () => {
    it('should get and set individual entries', async () => {
      const entry: CacheEntry = {
        successCount: 5,
        failureCount: 0,
        selector: '#test',
        timestamp: Date.now()
      };

      await cacheManager.setEntry('button|test', entry);

      const retrieved = await cacheManager.getEntry('button|test');
      expect(retrieved).toEqual(entry);
    });

    it('should return null for non-existent entry', async () => {
      const entry = await cacheManager.getEntry('button|nonexistent');
      expect(entry).toBeNull();
    });
  });

  describe('clearCache', () => {
    it('should clear all cache entries', async () => {
      const testCache: CacheData = {
        'button|login': {
          successCount: 5,
          failureCount: 0,
          selector: '#login',
          timestamp: Date.now()
        }
      };

      await cacheManager.saveCache(testCache, false);

      await cacheManager.clearCache();

      const loaded = await cacheManager.loadCache();
      expect(loaded).toEqual({});
    });
  });

  describe('getCacheStats', () => {
    it('should return stats for empty cache', async () => {
      const stats = await cacheManager.getCacheStats();

      expect(stats.totalEntries).toBe(0);
      expect(stats.oldestTimestamp).toBeNull();
      expect(stats.newestTimestamp).toBeNull();
      expect(stats.totalSuccess).toBe(0);
      expect(stats.totalFailures).toBe(0);
    });

    it('should calculate cache statistics', async () => {
      const testCache: CacheData = {
        'button|login': {
          successCount: 5,
          failureCount: 1,
          selector: '#login',
          timestamp: 1000
        },
        'input|username': {
          successCount: 3,
          failureCount: 0,
          selector: '#username',
          timestamp: 2000
        }
      };

      await cacheManager.saveCache(testCache, false);

      const stats = await cacheManager.getCacheStats();

      expect(stats.totalEntries).toBe(2);
      expect(stats.oldestTimestamp).toBe(1000);
      expect(stats.newestTimestamp).toBe(2000);
      expect(stats.totalSuccess).toBe(8);
      expect(stats.totalFailures).toBe(1);
    });
  });

  describe('removeStaleEntries', () => {
    it('should remove entries older than max age', async () => {
      const now = Date.now();
      const testCache: CacheData = {
        'button|old': {
          successCount: 1,
          failureCount: 0,
          selector: '#old',
          timestamp: now - 10000 // 10 seconds ago
        },
        'button|new': {
          successCount: 1,
          failureCount: 0,
          selector: '#new',
          timestamp: now - 1000 // 1 second ago
        }
      };

      await cacheManager.saveCache(testCache, false);

      const removedCount = await cacheManager.removeStaleEntries(5000); // 5 seconds

      expect(removedCount).toBe(1);

      const loaded = await cacheManager.loadCache();
      expect(Object.keys(loaded)).toHaveLength(1);
      expect(loaded['button|new']).toBeDefined();
      expect(loaded['button|old']).toBeUndefined();
    });
  });

  describe('parallel write safety', () => {
    it('should safely handle concurrent updates from multiple workers', async () => {
      const workerCount = 3;
      const entriesPerWorker = 5;

      const workerPromises = [];

      for (let worker = 0; worker < workerCount; worker++) {
        workerPromises.push(
          (async () => {
            for (let i = 0; i < entriesPerWorker; i++) {
              const entry: CacheEntry = {
                successCount: 1,
                failureCount: 0,
                selector: `#worker-${worker}-entry-${i}`,
                timestamp: Date.now() + i
              };

              await cacheManager.setEntry(`button|worker-${worker}-entry-${i}`, entry);
            }
          })()
        );
      }

      await Promise.all(workerPromises);

      const loaded = await cacheManager.loadCache();
      const totalExpected = workerCount * entriesPerWorker;

      expect(Object.keys(loaded)).toHaveLength(totalExpected);
    }, 15000);

    it('should preserve all updates when multiple workers update simultaneously', async () => {
      // Initialize with a base entry
      await cacheManager.saveCache({
        'button|counter': {
          successCount: 0,
          failureCount: 0,
          selector: '#counter',
          timestamp: Date.now()
        }
      }, false);

      const updateCount = 5;
      const updatePromises = [];

      // Simulate multiple workers trying to update the same entry
      for (let i = 0; i < updateCount; i++) {
        updatePromises.push(
          cacheManager.updateCache({
            [`button|update-${i}`]: {
              successCount: 1,
              failureCount: 0,
              selector: `#update-${i}`,
              timestamp: Date.now() + i
            }
          })
        );
      }

      await Promise.all(updatePromises);

      const loaded = await cacheManager.loadCache();

      // Should have the initial entry plus all updates
      expect(Object.keys(loaded).length).toBeGreaterThanOrEqual(updateCount);

      // Verify all updates are present
      for (let i = 0; i < updateCount; i++) {
        expect(loaded[`button|update-${i}`]).toBeDefined();
      }
    });
  });
});
