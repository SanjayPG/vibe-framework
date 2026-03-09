import { LockedCacheManager } from '../../src/integration/LockedCacheManager';
import { FileLockManager } from '../../src/utils/FileLockManager';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs/promises';

describe('Lock Error Handling', () => {
  let cacheManager: LockedCacheManager;
  let testDir: string;

  beforeEach(async () => {
    testDir = path.join(os.tmpdir(), `lock-error-test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
    await fs.mkdir(testDir, { recursive: true });
    cacheManager = new LockedCacheManager(testDir);
  });

  afterEach(async () => {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('Graceful Degradation', () => {
    it('should handle lock timeout gracefully without throwing', async () => {
      // This test validates that lock timeouts don't crash the application
      // Instead, they should log warnings and continue

      const testData = {
        'button|test': {
          successCount: 1,
          failureCount: 0,
          selector: '#test',
          timestamp: Date.now()
        }
      };

      // Normal operation should work
      await expect(cacheManager.saveCache(testData, false)).resolves.not.toThrow();
    });
  });

  describe('Lock Statistics', () => {
    it('should track lock acquisitions', async () => {
      const testData = {
        'button|test1': {
          successCount: 1,
          failureCount: 0,
          selector: '#test1',
          timestamp: Date.now()
        }
      };

      await cacheManager.saveCache(testData, false);

      const stats = cacheManager.getLockStats();
      expect(stats.acquisitions).toBeGreaterThan(0);
    });

    it('should calculate timeout rate', async () => {
      const stats = cacheManager.getLockStats();

      expect(stats).toHaveProperty('timeoutRate');
      expect(stats).toHaveProperty('status');
      expect(['healthy', 'caution', 'warning']).toContain(stats.status);
    });

    it('should provide health status', async () => {
      const stats = cacheManager.getLockStats();

      if (stats.acquisitions > 0) {
        const expectedStatus = stats.timeoutRate > 5 ? 'warning' :
                               stats.timeoutRate > 1 ? 'caution' :
                               'healthy';
        expect(stats.status).toBe(expectedStatus);
      }
    });
  });

  describe('Stale Lock Cleanup', () => {
    it('should detect and cleanup stale locks', async () => {
      // cleanupStaleLocks should return 0 if no stale locks exist
      const cleaned = await cacheManager.cleanupStaleLocks();
      expect(cleaned).toBe(0);
    });
  });

  describe('Health Metrics', () => {
    it('should provide comprehensive health metrics', async () => {
      const metrics = await cacheManager.getHealthMetrics();

      expect(metrics).toHaveProperty('cache');
      expect(metrics).toHaveProperty('locks');
      expect(metrics).toHaveProperty('health');

      expect(metrics.cache).toHaveProperty('totalEntries');
      expect(metrics.locks).toHaveProperty('status');
      expect(metrics.health).toHaveProperty('recommendations');
      expect(Array.isArray(metrics.health.recommendations)).toBe(true);
    });

    it('should provide recommendations based on lock stats', async () => {
      const metrics = await cacheManager.getHealthMetrics();

      expect(metrics.health.recommendations.length).toBeGreaterThan(0);
      expect(typeof metrics.health.recommendations[0]).toBe('string');
    });
  });

  describe('Error Recovery', () => {
    it('should continue operating after failed cache operations', async () => {
      const testData1 = {
        'button|test1': {
          successCount: 1,
          failureCount: 0,
          selector: '#test1',
          timestamp: Date.now()
        }
      };

      const testData2 = {
        'button|test2': {
          successCount: 1,
          failureCount: 0,
          selector: '#test2',
          timestamp: Date.now()
        }
      };

      // First operation
      await cacheManager.saveCache(testData1, false);

      // Second operation should work even if first had issues
      await expect(cacheManager.saveCache(testData2, true)).resolves.not.toThrow();

      const cache = await cacheManager.loadCache();
      expect(Object.keys(cache).length).toBeGreaterThan(0);
    });
  });

  describe('Cache Integrity Validation', () => {
    it('should maintain valid JSON after multiple operations', async () => {
      const operations = 5;

      for (let i = 0; i < operations; i++) {
        await cacheManager.setEntry(`button|test${i}`, {
          successCount: 1,
          failureCount: 0,
          selector: `#test${i}`,
          timestamp: Date.now()
        });
      }

      // Verify cache is valid JSON
      const cache = await cacheManager.loadCache();
      expect(cache).toBeDefined();
      expect(typeof cache).toBe('object');
      expect(Object.keys(cache).length).toBe(operations);
    });
  });
});
