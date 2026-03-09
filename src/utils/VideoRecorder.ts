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
          await fs.promises.copyFile(videoPath, newPath);
          await fs.promises.unlink(videoPath);
        }
        return newPath;
      } catch (error) {
        console.warn(`Failed to move video: ${error}`);
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
}
