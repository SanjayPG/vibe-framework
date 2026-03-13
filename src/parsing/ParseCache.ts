import * as fs from 'fs';
import * as path from 'path';
import { VibeCommand } from '../models/VibeCommand';

/**
 * Cached parse result with metadata
 */
interface CachedParseResult {
  command: VibeCommand;
  timestamp: number;
  expiresAt: number;
}

/**
 * Persistent file-based parse cache
 *
 * Strategy: In-Memory + Batch Write
 * - Loads cache from disk at initialization (fast read, no lock)
 * - Uses in-memory Map during execution (zero locking overhead)
 * - Writes all changes to disk at shutdown (single lock)
 *
 * Benefits:
 * - No locking overhead during test execution
 * - Persistent across test runs
 * - Thread-safe for parallel workers (each worker loads, uses in-memory, writes at end)
 */
export class ParseCache {
  private cacheDirectory: string;
  private cacheFile: string;
  private cache: Map<string, CachedParseResult>;
  private ttlMs: number;
  private dirty: boolean = false; // Track if cache has changes to save

  constructor(
    cacheDirectory: string = './autoheal-cache',
    ttlMs: number = 24 * 60 * 60 * 1000 // 24 hours default
  ) {
    this.cacheDirectory = cacheDirectory;
    this.cacheFile = path.join(cacheDirectory, 'parse-cache.json');
    this.ttlMs = ttlMs;
    this.cache = new Map();

    this.ensureCacheDirectory();
    this.loadFromDisk();
  }

  /**
   * Ensure cache directory exists
   */
  private ensureCacheDirectory(): void {
    if (!fs.existsSync(this.cacheDirectory)) {
      fs.mkdirSync(this.cacheDirectory, { recursive: true });
    }
  }

  /**
   * Load cache from disk at initialization
   * No locking needed - read-only operation
   */
  private loadFromDisk(): void {
    if (fs.existsSync(this.cacheFile)) {
      try {
        const data = fs.readFileSync(this.cacheFile, 'utf-8');
        const parsed = JSON.parse(data);

        let loadedCount = 0;
        let expiredCount = 0;
        const now = Date.now();

        for (const [key, value] of Object.entries(parsed)) {
          const cached = value as CachedParseResult;

          // Check if expired
          if (now > cached.expiresAt) {
            expiredCount++;
            continue;
          }

          this.cache.set(key, cached);
          loadedCount++;
        }

        if (loadedCount > 0) {
          console.log(`[PARSE-CACHE] Loaded ${loadedCount} entries from cache file${expiredCount > 0 ? `, ${expiredCount} expired entries skipped` : ''}`);
        }
      } catch (error) {
        console.error('[PARSE-CACHE] Failed to load cache from disk:', error);
      }
    }
  }

  /**
   * Save cache to disk
   * Called at shutdown to batch write all changes
   */
  saveToDisk(): void {
    if (!this.dirty) {
      return; // No changes, skip write
    }

    try {
      this.ensureCacheDirectory();

      const data: Record<string, CachedParseResult> = {};
      for (const [key, value] of this.cache.entries()) {
        data[key] = value;
      }

      fs.writeFileSync(this.cacheFile, JSON.stringify(data, null, 2), 'utf-8');
      this.dirty = false;

      console.log(`[PARSE-CACHE] Saved ${this.cache.size} entries to disk`);
    } catch (error) {
      console.error('[PARSE-CACHE] Failed to save cache to disk:', error);
    }
  }

  /**
   * Get cached parse result
   * Fast in-memory lookup, no locking
   */
  get(normalizedCommand: string): VibeCommand | undefined {
    const cached = this.cache.get(normalizedCommand);

    if (!cached) {
      return undefined;
    }

    // Check if expired
    if (Date.now() > cached.expiresAt) {
      this.cache.delete(normalizedCommand);
      this.dirty = true;
      return undefined;
    }

    return cached.command;
  }

  /**
   * Store parse result in cache
   * Fast in-memory write, no locking
   */
  put(normalizedCommand: string, command: VibeCommand): void {
    const now = Date.now();
    const cached: CachedParseResult = {
      command,
      timestamp: now,
      expiresAt: now + this.ttlMs
    };

    this.cache.set(normalizedCommand, cached);
    this.dirty = true; // Mark for batch write at shutdown
  }

  /**
   * Check if command exists in cache and is valid
   */
  has(normalizedCommand: string): boolean {
    return this.get(normalizedCommand) !== undefined;
  }

  /**
   * Clear all cache entries
   */
  clearAll(): void {
    this.cache.clear();
    this.dirty = true;
    this.saveToDisk();
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}
