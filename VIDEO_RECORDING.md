# Video Recording in Vibe Framework

**Date**: December 31, 2024
**Status**: ✅ Fully Implemented
**Playwright Compatible**: Yes

## Overview

Vibe Framework now supports Playwright-compatible video recording for all tests. Videos are automatically embedded in HTML reports with inline playback and fullscreen mode.

## Features

✅ **Playwright-Compatible API** - Same modes and configuration as Playwright Test
✅ **Multiple Recording Modes** - on, off, retain-on-failure, on-first-retry
✅ **HTML Report Integration** - Videos embedded with inline player and fullscreen
✅ **Smart Storage** - Automatic cleanup based on test results
✅ **Custom Video Size** - Configure resolution (default: 1280x720)
✅ **Flexible Output** - Custom directory for video storage

## Recording Modes

### 1. 'on' - Record All Tests
Records video for every test, regardless of pass/fail status.

```typescript
const session = vibe()
  .withPage(page)
  .withVideo('on')
  .build();
```

**Use case**: Full test coverage, debugging, documentation

### 2. 'retain-on-failure' - Keep Only Failures
Records all tests but automatically deletes videos from successful tests.

```typescript
const session = vibe()
  .withPage(page)
  .withVideo('retain-on-failure')
  .build();
```

**Use case**: CI/CD pipelines, reducing storage costs

### 3. 'on-first-retry' - Record Retries Only
Records video only when a test is retried for the first time.

```typescript
const session = vibe()
  .withPage(page)
  .withVideo('on-first-retry')
  .build();
```

**Use case**: Flaky test diagnosis

### 4. 'off' - No Recording (Default)
No video recording.

```typescript
const session = vibe()
  .withPage(page)
  // No .withVideo() call
  .build();
```

**Use case**: Normal development, faster execution

## Configuration Options

### Basic Setup

```typescript
import { chromium } from 'playwright';
import { vibe } from 'vibe-framework';

// 1. Create browser context with video recording
const browser = await chromium.launch();
const context = await browser.newContext({
  recordVideo: {
    dir: './videos',
    size: { width: 1280, height: 720 }
  }
});
const page = await context.newPage();

// 2. Configure Vibe session
const session = vibe()
  .withPage(page)
  .withVideo('on', {
    dir: './vibe-reports/videos',
    size: { width: 1280, height: 720 }
  })
  .build();

// 3. Run your tests
await session.goto('https://example.com');
await session.do('click login button');

// 4. Cleanup
await session.shutdown();
await context.close();
await browser.close();
```

### Custom Video Size

```typescript
vibe()
  .withPage(page)
  .withVideo('on', {
    size: { width: 1920, height: 1080 } // Full HD
  })
  .build();
```

### Custom Output Directory

```typescript
vibe()
  .withPage(page)
  .withVideo('retain-on-failure', {
    dir: './test-artifacts/videos'
  })
  .build();
```

### With Reporting

```typescript
vibe()
  .withPage(page)
  .withVideo('on')
  .withReporting({
    enabled: true,
    html: true,
    includeVideos: true  // Embed videos in HTML report
  })
  .build();
```

## HTML Report Integration

Videos are automatically embedded in HTML reports when `includeVideos: true` is set:

### Features
- **Inline Video Player** - Play videos directly in the report
- **Fullscreen Mode** - Click button to open video in fullscreen
- **Timeline Integration** - Videos linked to specific actions
- **Responsive Design** - Works on all screen sizes

### HTML Report Preview

```html
<!-- Video player with controls -->
<video class="video-player" controls preload="metadata">
  <source src="./videos/test-video.webm" type="video/webm">
</video>
<button onclick="openVideoFullscreen()">⛶ Fullscreen</button>
```

## Complete Example

```typescript
import { chromium } from 'playwright';
import { vibe } from 'vibe-framework';
import 'dotenv/config';

async function runTest() {
  // Setup browser with video recording
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    recordVideo: {
      dir: './vibe-reports/videos',
      size: { width: 1280, height: 720 }
    }
  });
  const page = await context.newPage();

  // Create Vibe session with video recording
  const session = vibe()
    .withPage(page)
    .withMode('smart-cache')
    .withAIProvider('OPENAI', process.env.OPENAI_API_KEY)
    .withVideo('retain-on-failure', {
      dir: './vibe-reports/videos'
    })
    .withReporting({
      enabled: true,
      html: true,
      includeVideos: true
    })
    .build();

  try {
    // Run test
    await session.goto('https://www.saucedemo.com');
    await session.do('type standard_user into username');
    await session.do('type secret_sauce into password');
    await session.do('click the login button');
    await session.check('verify dashboard is loaded');

    console.log('✅ Test passed - video deleted (retain-on-failure)');
  } catch (error) {
    console.log('❌ Test failed - video saved for debugging');
    throw error;
  } finally {
    // Cleanup
    await session.shutdown();
    await context.close();
    await browser.close();
  }
}

runTest().catch(console.error);
```

## Important Notes

### Video Availability
⚠️ **Videos are only available after the page/browser context closes.**

Playwright records video during test execution but the file is only accessible after `context.close()` is called. The Vibe Framework automatically handles this in the `shutdown()` method.

### Browser Context Requirement
Video recording must be configured at the **browser context** level, not the page level:

```typescript
// ✅ CORRECT
const context = await browser.newContext({
  recordVideo: { dir: './videos' }
});

// ❌ WRONG - Cannot record video on page directly
const page = await browser.newPage();
```

### Supported Formats
Playwright records videos in **WebM** format by default. All modern browsers support playback.

## File Structure

After running tests with video recording:

```
vibe-framework/
├── vibe-reports/
│   ├── videos/
│   │   ├── test-2024-12-31-abc123.webm
│   │   └── test-2024-12-31-def456.webm
│   ├── index.html (with embedded videos)
│   └── screenshots/
├── examples/
│   └── video-recording-demo.ts
└── package.json
```

## Performance Considerations

### Storage Impact
- **1 minute of 1280x720 video** ≈ 5-10 MB
- **'retain-on-failure' mode** saves significant space in CI/CD
- **Automatic cleanup** prevents disk space issues

### Execution Impact
- **Minimal overhead** (~2-5% slower)
- **No impact** on test reliability
- **Parallel execution** supported

## Troubleshooting

### Video Not Saved
**Problem**: Video file not found after test
**Solution**: Ensure you call `await session.shutdown()` and `await context.close()`

### Video Player Not Showing
**Problem**: Video doesn't appear in HTML report
**Solution**: Check `includeVideos: true` in reporting config

### Large Video Files
**Problem**: Videos taking too much disk space
**Solution**: Use `'retain-on-failure'` mode or reduce video size

### Browser Compatibility
**Problem**: Video won't play in browser
**Solution**: Use a modern browser (Chrome, Firefox, Edge, Safari 14.1+)

## API Reference

### `withVideo(mode, options?)`

**Parameters:**
- `mode: VideoMode` - Recording mode ('on', 'off', 'retain-on-failure', 'on-first-retry')
- `options?: object`
  - `size?: { width: number; height: number }` - Video resolution (default: 1280x720)
  - `dir?: string` - Output directory (default: './vibe-reports/videos')

**Returns:** `VibeBuilder`

**Example:**
```typescript
vibe()
  .withPage(page)
  .withVideo('on', {
    size: { width: 1920, height: 1080 },
    dir: './test-videos'
  })
  .build();
```

### `getVideoPath()`

Get the video path for the current session (available after context close).

**Returns:** `Promise<string | null>`

**Example:**
```typescript
const videoPath = await session.getVideoPath();
console.log('Video saved to:', videoPath);
```

### `attachVideo(videoPath)`

Manually attach a video to the last action.

**Parameters:**
- `videoPath: string` - Path to the video file

**Example:**
```typescript
session.attachVideo('./custom-video.webm');
```

## Comparison with Playwright Test

| Feature | Playwright Test | Vibe Framework |
|---------|----------------|----------------|
| Video Modes | ✅ on, off, retain-on-failure, on-first-retry | ✅ Same |
| Custom Size | ✅ Configurable | ✅ Configurable |
| HTML Reports | ✅ Embedded videos | ✅ Embedded videos |
| API | `video: { mode: 'on' }` | `.withVideo('on')` |
| Fullscreen | ✅ Supported | ✅ Supported |
| Auto Cleanup | ✅ Based on mode | ✅ Based on mode |

## Conclusion

Vibe Framework's video recording feature provides Playwright-compatible video recording with seamless HTML report integration. Perfect for debugging, documentation, and CI/CD pipelines.

**Next Steps:**
- See `examples/video-recording-demo.ts` for full working examples
- Check the HTML report to see embedded videos in action
- Configure video modes based on your testing needs
