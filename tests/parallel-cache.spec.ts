import { test, expect } from '@playwright/test';
import { LockedCacheManager } from '../src/integration/LockedCacheManager';
import * as fs from 'fs/promises';

/**
 * Integration test for parallel cache safety
 * Run with: npx playwright test parallel-cache.spec.ts --workers=3
 */

test.describe('Parallel Cache Safety Integration', () => {
  const cacheManager = new LockedCacheManager();

  test.beforeAll(async () => {
    // Clear cache before tests
    await cacheManager.clearCache();
  });

  test('worker 1 - should write cache entries', async () => {
    const workerName = 'worker-1';

    for (let i = 0; i < 3; i++) {
      await cacheManager.setEntry(`button|${workerName}-${i}`, {
        successCount: 1,
        failureCount: 0,
        selector: `#${workerName}-${i}`,
        timestamp: Date.now()
      });

      // Small delay to simulate real test execution
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    const cache = await cacheManager.loadCache();
    expect(Object.keys(cache).length).toBeGreaterThanOrEqual(3);
  });

  test('worker 2 - should write cache entries', async () => {
    const workerName = 'worker-2';

    for (let i = 0; i < 3; i++) {
      await cacheManager.setEntry(`button|${workerName}-${i}`, {
        successCount: 1,
        failureCount: 0,
        selector: `#${workerName}-${i}`,
        timestamp: Date.now()
      });

      await new Promise(resolve => setTimeout(resolve, 100));
    }

    const cache = await cacheManager.loadCache();
    expect(Object.keys(cache).length).toBeGreaterThanOrEqual(3);
  });

  test('worker 3 - should write cache entries', async () => {
    const workerName = 'worker-3';

    for (let i = 0; i < 3; i++) {
      await cacheManager.setEntry(`button|${workerName}-${i}`, {
        successCount: 1,
        failureCount: 0,
        selector: `#${workerName}-${i}`,
        timestamp: Date.now()
      });

      await new Promise(resolve => setTimeout(resolve, 100));
    }

    const cache = await cacheManager.loadCache();
    expect(Object.keys(cache).length).toBeGreaterThanOrEqual(3);
  });

  test.afterAll(async () => {
    // Verify all entries were preserved
    const finalCache = await cacheManager.loadCache();
    const stats = await cacheManager.getCacheStats();

    console.log('\n=== Cache Test Results ===');
    console.log(`Total entries: ${stats.totalEntries}`);
    console.log(`Expected minimum: 9 (3 workers × 3 entries)`);
    console.log(`Lock stats:`, cacheManager.getLockStats());

    // Should have all 9 entries (3 workers × 3 entries each)
    expect(stats.totalEntries).toBeGreaterThanOrEqual(9);

    // Verify cache file is valid JSON
    const cacheFilePath = cacheManager.getCacheFilePath();
    const fileContent = await fs.readFile(cacheFilePath, 'utf-8');
    const parsed = JSON.parse(fileContent);
    expect(parsed).toBeDefined();
    expect(typeof parsed).toBe('object');
  });
});
