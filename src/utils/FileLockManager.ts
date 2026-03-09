import * as lockfile from 'proper-lockfile';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Configuration options for file locking operations
 */
export interface LockOptions {
  /**
   * Maximum time to wait for lock acquisition (milliseconds)
   * @default 30000 (30 seconds)
   */
  timeout?: number;

  /**
   * Time after which a lock is considered stale (milliseconds)
   * @default 60000 (60 seconds)
   */
  stale?: number;

  /**
   * Number of retry attempts for lock acquisition
   * @default 5
   */
  retries?: number;

  /**
   * Delay between retry attempts (milliseconds)
   * @default 100
   */
  retryDelay?: number;
}

/**
 * Statistics for lock operations
 */
export interface LockStats {
  acquisitions: number;
  timeouts: number;
  totalWaitTime: number;
  averageWaitTime: number;
}

/**
 * FileLockManager provides thread-safe file operations using file-based locking.
 * Implements the locking strategy from autoheal-locator-python with proper-lockfile.
 */
export class FileLockManager {
  private static readonly DEFAULT_OPTIONS: Required<LockOptions> = {
    timeout: 30000,    // 30 seconds
    stale: 60000,      // 60 seconds
    retries: 5,
    retryDelay: 100
  };

  private stats: LockStats = {
    acquisitions: 0,
    timeouts: 0,
    totalWaitTime: 0,
    averageWaitTime: 0
  };

  /**
   * Execute an operation within a file lock.
   * Implements read-merge-write pattern from autoheal-locator-python.
   *
   * @param filePath - Absolute path to the file to lock
   * @param operation - Async operation to execute while holding the lock
   * @param options - Lock configuration options
   * @returns Result of the operation
   * @throws Error if lock cannot be acquired within timeout
   */
  async withLock<T>(
    filePath: string,
    operation: () => Promise<T>,
    options?: LockOptions
  ): Promise<T> {
    const opts = { ...FileLockManager.DEFAULT_OPTIONS, ...options };
    const startTime = Date.now();

    // Ensure parent directory exists
    await this.ensureDirectory(filePath);

    // Ensure file exists (create empty file if needed)
    await this.ensureFileExists(filePath);

    let lastError: Error | null = null;

    // Retry logic with exponential backoff
    for (let attempt = 0; attempt < opts.retries; attempt++) {
      try {
        const release = await lockfile.lock(filePath, {
          retries: {
            retries: 0, // We handle retries ourselves
            minTimeout: opts.retryDelay,
            maxTimeout: opts.retryDelay
          },
          stale: opts.stale,
          realpath: false // Important for Windows compatibility
        });

        try {
          // Execute operation while holding lock
          const result = await operation();

          // Update statistics
          const waitTime = Date.now() - startTime;
          this.updateStats(waitTime, false);

          return result;
        } finally {
          // Always release lock
          await release();
        }
      } catch (error) {
        lastError = error as Error;

        // Check if we've exceeded timeout
        if (Date.now() - startTime > opts.timeout) {
          this.updateStats(Date.now() - startTime, true);
          throw new Error(
            `Failed to acquire lock for ${filePath} within ${opts.timeout}ms. ` +
            `Attempts: ${attempt + 1}/${opts.retries}. ` +
            `Error: ${lastError.message}`
          );
        }

        // Wait before retry (exponential backoff)
        if (attempt < opts.retries - 1) {
          const backoffDelay = opts.retryDelay * Math.pow(2, attempt);
          await this.sleep(backoffDelay);
        }
      }
    }

    // All retries exhausted
    this.updateStats(Date.now() - startTime, true);
    throw new Error(
      `Failed to acquire lock for ${filePath} after ${opts.retries} attempts. ` +
      `Last error: ${lastError?.message || 'Unknown error'}`
    );
  }

  /**
   * Read a file's contents with lock protection.
   *
   * @param filePath - Path to file to read
   * @param options - Lock configuration options
   * @returns File contents as string
   */
  async readWithLock(filePath: string, options?: LockOptions): Promise<string> {
    return this.withLock(filePath, async () => {
      try {
        return await fs.readFile(filePath, 'utf-8');
      } catch (error) {
        // If file doesn't exist, return empty string
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
          return '';
        }
        throw error;
      }
    }, options);
  }

  /**
   * Write content to a file with lock protection.
   *
   * @param filePath - Path to file to write
   * @param content - Content to write
   * @param options - Lock configuration options
   */
  async writeWithLock(
    filePath: string,
    content: string,
    options?: LockOptions
  ): Promise<void> {
    return this.withLock(filePath, async () => {
      await fs.writeFile(filePath, content, 'utf-8');
    }, options);
  }

  /**
   * Read JSON file with lock protection and parse it.
   *
   * @param filePath - Path to JSON file
   * @param options - Lock configuration options
   * @returns Parsed JSON object
   */
  async readJSONWithLock<T = any>(
    filePath: string,
    options?: LockOptions
  ): Promise<T | null> {
    const content = await this.readWithLock(filePath, options);

    if (!content || content.trim() === '') {
      return null;
    }

    try {
      return JSON.parse(content);
    } catch (error) {
      throw new Error(
        `Failed to parse JSON from ${filePath}: ${(error as Error).message}`
      );
    }
  }

  /**
   * Write object to JSON file with lock protection.
   *
   * @param filePath - Path to JSON file
   * @param data - Object to serialize and write
   * @param options - Lock configuration options
   */
  async writeJSONWithLock(
    filePath: string,
    data: any,
    options?: LockOptions
  ): Promise<void> {
    // Serialize JSON before acquiring lock to minimize lock hold time
    const content = JSON.stringify(data, null, 2);
    await this.writeWithLock(filePath, content, options);
  }

  /**
   * Get current lock operation statistics.
   */
  getStats(): Readonly<LockStats> {
    return { ...this.stats };
  }

  /**
   * Reset lock operation statistics.
   */
  resetStats(): void {
    this.stats = {
      acquisitions: 0,
      timeouts: 0,
      totalWaitTime: 0,
      averageWaitTime: 0
    };
  }

  /**
   * Check if a lock file exists for the given file.
   *
   * @param filePath - Path to check for lock
   * @returns True if lock file exists
   */
  async isLocked(filePath: string): Promise<boolean> {
    try {
      return await lockfile.check(filePath, { realpath: false });
    } catch {
      return false;
    }
  }

  /**
   * Ensure the parent directory of a file exists.
   */
  private async ensureDirectory(filePath: string): Promise<void> {
    const dir = path.dirname(filePath);
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch (error) {
      // Ignore if directory already exists
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
        throw error;
      }
    }
  }

  /**
   * Ensure a file exists (create empty file if it doesn't).
   */
  private async ensureFileExists(filePath: string): Promise<void> {
    try {
      await fs.access(filePath);
    } catch {
      // File doesn't exist, create it
      try {
        await fs.writeFile(filePath, '', 'utf-8');
      } catch (error) {
        // Ignore race condition if another process created it
        if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
          throw error;
        }
      }
    }
  }

  /**
   * Update lock statistics.
   */
  private updateStats(waitTime: number, timeout: boolean): void {
    this.stats.acquisitions++;
    this.stats.totalWaitTime += waitTime;
    this.stats.averageWaitTime = this.stats.totalWaitTime / this.stats.acquisitions;

    if (timeout) {
      this.stats.timeouts++;
    }
  }

  /**
   * Sleep for a specified duration.
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Singleton instance for global use.
 */
export const globalLockManager = new FileLockManager();
