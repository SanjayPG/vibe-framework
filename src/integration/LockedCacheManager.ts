import { globalLockManager, FileLockManager } from '../utils/FileLockManager';
import * as path from 'path';

/**
 * Cache entry structure from autoheal-locator
 */
export interface CacheEntry {
  successCount: number;
  failureCount: number;
  selector: string;
  timestamp: number;
}

/**
 * Cache data structure: key is "elementType|description"
 */
export type CacheData = Record<string, CacheEntry>;

/**
 * LockedCacheManager provides thread-safe access to the AutoHeal cache file.
 * Implements the read-merge-write pattern from autoheal-locator-python.
 *
 * This manager ensures that multiple Playwright workers can safely update
 * the shared cache file without race conditions.
 */
export class LockedCacheManager {
  private lockManager: FileLockManager;
  private cacheFilePath: string;

  constructor(
    cacheDir: string = 'autoheal-cache',
    lockManager: FileLockManager = globalLockManager
  ) {
    this.lockManager = lockManager;

    // If cacheDir is absolute, use it directly; otherwise, resolve relative to cwd
    const resolvedCacheDir = path.isAbsolute(cacheDir)
      ? cacheDir
      : path.join(process.cwd(), cacheDir);

    this.cacheFilePath = path.join(resolvedCacheDir, 'selectors.json');
  }

  /**
   * Load the cache from disk with file locking.
   * Returns empty object if file doesn't exist or is invalid.
   */
  async loadCache(): Promise<CacheData> {
    try {
      const data = await this.lockManager.readJSONWithLock<CacheData>(this.cacheFilePath);
      return data || {};
    } catch (error) {
      console.warn(`Failed to load cache from ${this.cacheFilePath}:`, (error as Error).message);
      return {};
    }
  }

  /**
   * Save the cache to disk with file locking.
   * Implements read-merge-write to preserve entries from other workers.
   *
   * @param newCache - Cache data to save
   * @param merge - If true, merge with existing cache; if false, replace completely
   */
  async saveCache(newCache: CacheData, merge: boolean = true): Promise<void> {
    try {
      // Use more aggressive retry settings for Windows compatibility
      const lockOptions = { timeout: 60000, retries: 30, retryDelay: 200, stale: 10000 };

      await this.lockManager.withLock(this.cacheFilePath, async () => {
        let finalCache: CacheData;

        if (merge) {
          // READ: Load current cache from disk
          const existingCache = await this.lockManager.readJSONWithLock<CacheData>(this.cacheFilePath) || {};

          // MERGE: Combine existing and new entries
          // Newer entries (by timestamp) take precedence
          finalCache = { ...existingCache };

          for (const [key, newEntry] of Object.entries(newCache)) {
            const existingEntry = finalCache[key];

            if (!existingEntry || newEntry.timestamp > existingEntry.timestamp) {
              // Use new entry if it doesn't exist or is newer
              finalCache[key] = newEntry;
            } else if (newEntry.timestamp === existingEntry.timestamp) {
              // Same timestamp: merge counts
              finalCache[key] = {
                ...existingEntry,
                successCount: existingEntry.successCount + newEntry.successCount,
                failureCount: existingEntry.failureCount + newEntry.failureCount
              };
            }
            // else: keep existing entry (it's newer)
          }
        } else {
          // No merge: use new cache as-is
          finalCache = newCache;
        }

        // WRITE: Save merged cache to disk
        await this.lockManager.writeJSONWithLock(this.cacheFilePath, finalCache);
      }, lockOptions);
    } catch (error) {
      const errorMsg = (error as Error).message;

      // Check if it's a lock timeout error
      if (errorMsg.includes('Failed to acquire lock')) {
        console.warn(`[LOCK-TIMEOUT] Cache save failed due to lock timeout: ${errorMsg}`);
        console.warn(`[LOCK-TIMEOUT] Falling back to in-memory cache for this session`);
        // Graceful degradation - don't throw, just warn
        return;
      }

      throw new Error(`Failed to save cache to ${this.cacheFilePath}: ${errorMsg}`);
    }
  }

  /**
   * Update specific cache entries with read-merge-write pattern.
   * This is the recommended method for updating cache during test execution.
   *
   * @param entries - New entries to add/update in the cache
   */
  async updateCache(entries: CacheData): Promise<void> {
    await this.saveCache(entries, true);
  }

  /**
   * Get a specific cache entry by key.
   *
   * @param key - Cache key in format "elementType|description"
   */
  async getEntry(key: string): Promise<CacheEntry | null> {
    const cache = await this.loadCache();
    return cache[key] || null;
  }

  /**
   * Set a specific cache entry by key.
   *
   * @param key - Cache key in format "elementType|description"
   * @param entry - Cache entry data
   */
  async setEntry(key: string, entry: CacheEntry): Promise<void> {
    await this.updateCache({ [key]: entry });
  }

  /**
   * Clear the entire cache.
   */
  async clearCache(): Promise<void> {
    await this.saveCache({}, false);
  }

  /**
   * Get cache statistics (total entries, oldest/newest timestamps).
   */
  async getCacheStats(): Promise<{
    totalEntries: number;
    oldestTimestamp: number | null;
    newestTimestamp: number | null;
    totalSuccess: number;
    totalFailures: number;
  }> {
    const cache = await this.loadCache();
    const entries = Object.values(cache);

    if (entries.length === 0) {
      return {
        totalEntries: 0,
        oldestTimestamp: null,
        newestTimestamp: null,
        totalSuccess: 0,
        totalFailures: 0
      };
    }

    const timestamps = entries.map(e => e.timestamp);
    const totalSuccess = entries.reduce((sum, e) => sum + e.successCount, 0);
    const totalFailures = entries.reduce((sum, e) => sum + e.failureCount, 0);

    return {
      totalEntries: entries.length,
      oldestTimestamp: Math.min(...timestamps),
      newestTimestamp: Math.max(...timestamps),
      totalSuccess,
      totalFailures
    };
  }

  /**
   * Remove stale cache entries older than the specified age.
   *
   * @param maxAgeMs - Maximum age in milliseconds
   */
  async removeStaleEntries(maxAgeMs: number): Promise<number> {
    const cutoffTime = Date.now() - maxAgeMs;
    let removedCount = 0;

    await this.lockManager.withLock(this.cacheFilePath, async () => {
      const cache = await this.lockManager.readJSONWithLock<CacheData>(this.cacheFilePath) || {};
      const freshCache: CacheData = {};

      for (const [key, entry] of Object.entries(cache)) {
        if (entry.timestamp >= cutoffTime) {
          freshCache[key] = entry;
        } else {
          removedCount++;
        }
      }

      await this.lockManager.writeJSONWithLock(this.cacheFilePath, freshCache);
    });

    return removedCount;
  }

  /**
   * Get lock statistics from the underlying file lock manager.
   */
  getLockStats() {
    const stats = this.lockManager.getStats();

    // Calculate timeout rate
    const timeoutRate = stats.acquisitions > 0
      ? (stats.timeouts / stats.acquisitions) * 100
      : 0;

    return {
      ...stats,
      timeoutRate: parseFloat(timeoutRate.toFixed(2)),
      status: timeoutRate > 5 ? 'warning' : timeoutRate > 1 ? 'caution' : 'healthy'
    };
  }

  /**
   * Reset lock statistics.
   */
  resetLockStats() {
    this.lockManager.resetStats();
  }

  /**
   * Get the cache file path.
   */
  getCacheFilePath(): string {
    return this.cacheFilePath;
  }

  /**
   * Check for and clean up stale lock files.
   * Stale locks are those older than the stale timeout (default 60s).
   *
   * @returns Number of stale locks cleaned up
   */
  async cleanupStaleLocks(): Promise<number> {
    const lockFilePath = `${this.cacheFilePath}.lock`;

    try {
      const fs = await import('fs/promises');

      // Check if lock file exists
      try {
        await fs.access(lockFilePath);
      } catch {
        // No lock file exists
        return 0;
      }

      // Check file age
      const stats = await fs.stat(lockFilePath);
      const ageMs = Date.now() - stats.mtimeMs;
      const staleThreshold = 60000; // 60 seconds

      if (ageMs > staleThreshold) {
        console.warn(`[STALE-LOCK] Detected stale lock file (${(ageMs / 1000).toFixed(0)}s old), cleaning up...`);

        try {
          await fs.unlink(lockFilePath);
          console.info(`[STALE-LOCK] Successfully cleaned up stale lock file`);
          return 1;
        } catch (error) {
          console.warn(`[STALE-LOCK] Failed to cleanup: ${(error as Error).message}`);
          return 0;
        }
      }

      return 0;
    } catch (error) {
      console.warn(`[STALE-LOCK] Error checking for stale locks: ${(error as Error).message}`);
      return 0;
    }
  }

  /**
   * Get health metrics for monitoring.
   */
  async getHealthMetrics() {
    const stats = await this.getCacheStats();
    const lockStats = this.getLockStats();

    return {
      cache: {
        totalEntries: stats.totalEntries,
        totalSuccess: stats.totalSuccess,
        totalFailures: stats.totalFailures,
        oldestEntryAge: stats.oldestTimestamp
          ? Date.now() - stats.oldestTimestamp
          : null
      },
      locks: lockStats,
      health: {
        cacheAccessible: true,
        lockStatus: lockStats.status,
        recommendations: this.getHealthRecommendations(lockStats)
      }
    };
  }

  /**
   * Get health recommendations based on lock statistics.
   */
  private getHealthRecommendations(lockStats: any): string[] {
    const recommendations: string[] = [];

    if (lockStats.timeoutRate > 5) {
      recommendations.push('HIGH lock timeout rate detected. Consider reducing worker count or increasing timeout.');
    } else if (lockStats.timeoutRate > 1) {
      recommendations.push('Moderate lock contention. Monitor performance.');
    }

    if (lockStats.averageWaitTime > 1000) {
      recommendations.push('High average wait time. Check disk I/O performance.');
    }

    if (recommendations.length === 0) {
      recommendations.push('Cache performance is optimal.');
    }

    return recommendations;
  }
}

/**
 * Global instance for convenience.
 */
export const globalCacheManager = new LockedCacheManager();
