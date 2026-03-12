import { Page } from 'playwright';
import { VideoMode } from '../core/VibeConfiguration';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Video recording manager for Vibe Framework
 * Handles video recording similar to Playwright Test
 */
export class VideoRecorder {
  private videoMode: VideoMode;
  private videoDir: string;
  private currentVideoPath: string | null = null;
  private testPassed: boolean = true;

  constructor(mode: VideoMode, dir: string) {
    this.videoMode = mode;
    this.videoDir = dir;

    // Ensure video directory exists
    if (mode !== 'off') {
      fs.mkdirSync(this.videoDir, { recursive: true });
    }
  }

  /**
   * Check if video recording is enabled
   */
  isEnabled(): boolean {
    return this.videoMode !== 'off';
  }

  /**
   * Get the video path from the page's context (if available)
   * @param page Playwright page
   */
  async getVideoPath(page: Page): Promise<string | null> {
    if (this.videoMode === 'off') {
      return null;
    }

    try {
      const video = page.video();
      if (!video) {
        return null;
      }

      // Get the video path
      // Note: Video is only available after page/context closes
      const videoPath = await video.path();
      this.currentVideoPath = videoPath;
      return videoPath;
    } catch (error) {
      // Video not available yet or not recording
      return null;
    }
  }

  /**
   * Mark test as passed or failed (for retain-on-failure mode)
   * @param passed Whether the test passed
   */
  setTestStatus(passed: boolean): void {
    this.testPassed = passed;
  }

  /**
   * Handle video cleanup based on mode
   * @param videoPath Path to the video file
   * @param passed Whether the test passed
   */
  async handleVideo(videoPath: string | null, passed: boolean): Promise<string | null> {
    if (!videoPath || this.videoMode === 'off') {
      return null;
    }

    // Determine if we should keep the video
    const shouldKeep = this.shouldKeepVideo(passed);

    if (!shouldKeep && fs.existsSync(videoPath)) {
      try {
        await fs.promises.unlink(videoPath);
        return null;
      } catch (error) {
        // If deletion fails, just return the path
        console.warn(`Failed to delete video: ${videoPath}`);
        return videoPath;
      }
    }

    // Move video to our custom directory if needed
    if (shouldKeep) {
      const filename = path.basename(videoPath);
      const newPath = path.join(this.videoDir, filename);

      try {
        // Copy video to our directory
        if (videoPath !== newPath) {
          // Wait for file to be fully written and unlocked
          let copied = false;
          for (let attempt = 0; attempt < 5; attempt++) {
            try {
              await this.sleep(500 * (attempt + 1)); // Wait 500ms, 1s, 1.5s, 2s, 2.5s

              // Check if file exists and has content
              const stats = await fs.promises.stat(videoPath);
              if (stats.size > 0) {
                // Copy the file
                await fs.promises.copyFile(videoPath, newPath);
                copied = true;

                // Verify copy has content
                const copiedStats = await fs.promises.stat(newPath);
                if (copiedStats.size === 0) {
                  console.warn(`Copied video is empty, retrying...`);
                  copied = false;
                  continue;
                }
                break;
              } else if (attempt < 4) {
                // File exists but empty, wait longer
                continue;
              }
            } catch (copyError) {
              if (attempt === 4) {
                console.warn(`Failed to copy video after ${attempt + 1} attempts: ${copyError}`);
                return videoPath; // Return original path
              }
            }
          }

          if (copied) {
            // Try to delete original (non-blocking)
            try {
              await this.sleep(200);
              await fs.promises.unlink(videoPath);
            } catch (unlinkError) {
              // Deletion failed, but copy succeeded - that's OK
              console.log(`Video copied to: ${newPath} (original kept in test-results)`);
            }
            return newPath;
          } else {
            // Copy failed, return original
            return videoPath;
          }
        }
        return newPath;
      } catch (error) {
        console.warn(`Failed to handle video: ${error}`);
        // Return original path if anything fails
        return videoPath;
      }
    }

    return videoPath;
  }

  /**
   * Determine if video should be kept based on mode and test result
   */
  private shouldKeepVideo(passed: boolean): boolean {
    switch (this.videoMode) {
      case 'off':
        return false;
      case 'on':
        return true;
      case 'retain-on-failure':
        return !passed;
      case 'on-first-retry':
        // For now, keep all videos (retry logic would need to be implemented in test runner)
        return true;
      default:
        return false;
    }
  }

  /**
   * Get relative video path for HTML reports
   * @param videoPath Absolute video path
   */
  getRelativePath(videoPath: string): string {
    return path.relative(process.cwd(), videoPath);
  }

  /**
   * Sleep utility for retry delays
   * @param ms Milliseconds to sleep
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
