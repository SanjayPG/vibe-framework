import { chromium } from 'playwright';
import { vibe } from '../src';
import 'dotenv/config';

/**
 * Video Recording Demo
 *
 * Demonstrates Playwright-compatible video recording in Vibe Framework.
 * Shows all video modes: 'on', 'retain-on-failure', 'on-first-retry', 'off'
 */
async function main() {
  console.log('🎥 Vibe Framework - Video Recording Demo\n');

  // ============================================
  // Example 1: Record ALL tests ('on' mode)
  // ============================================
  console.log('=== Example 1: Record All Tests ===');

  // Create browser context with video recording enabled
  const browser1 = await chromium.launch({ headless: false });
  const context1 = await browser1.newContext({
    recordVideo: {
      dir: './vibe-reports/videos',
      size: { width: 1280, height: 720 }
    }
  });
  const page1 = await context1.newPage();

  const session1 = vibe()
    .withPage(page1)
    .withMode('smart-cache')
    .withAIProvider('OPENAI', process.env.OPENAI_API_KEY)
    .withVideo('on', {
      dir: './vibe-reports/videos',
      size: { width: 1280, height: 720 }
    })
    .withReporting({
      enabled: true,
      html: true,
      includeVideos: true
    })
    .build();

  try {
    await session1.goto('https://www.saucedemo.com');
    await session1.do('type standard_user into username');
    await session1.do('type secret_sauce into password');
    await session1.do('click the login button');
    await session1.check('verify dashboard is loaded');

    console.log('✅ Test passed - video will be saved\n');
  } catch (error) {
    console.log('❌ Test failed - video will still be saved\n');
  } finally {
    await session1.shutdown();
    await context1.close();
    await browser1.close();
  }

  // ============================================
  // Example 2: Retain only on failure ('retain-on-failure' mode)
  // ============================================
  console.log('\n=== Example 2: Retain Only Failures ===');

  const browser2 = await chromium.launch({ headless: false });
  const context2 = await browser2.newContext({
    recordVideo: {
      dir: './vibe-reports/videos',
      size: { width: 1280, height: 720 }
    }
  });
  const page2 = await context2.newPage();

  const session2 = vibe()
    .withPage(page2)
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
    await session2.goto('https://www.saucedemo.com');
    await session2.do('type standard_user into username');
    await session2.do('type secret_sauce into password');
    await session2.do('click the login button');

    console.log('✅ Test passed - video will be DELETED (retain-on-failure)\n');
  } catch (error) {
    console.log('❌ Test failed - video will be KEPT\n');
  } finally {
    await session2.shutdown();
    await context2.close();
    await browser2.close();
  }

  // ============================================
  // Example 3: No video recording ('off' mode)
  // ============================================
  console.log('\n=== Example 3: No Video Recording ===');

  const browser3 = await chromium.launch({ headless: false });
  const page3 = await browser3.newPage();

  const session3 = vibe()
    .withPage(page3)
    .withMode('smart-cache')
    .withAIProvider('OPENAI', process.env.OPENAI_API_KEY)
    // No .withVideo() call means 'off' by default
    .withReporting({
      enabled: true,
      html: true
    })
    .build();

  try {
    await session3.goto('https://www.saucedemo.com');
    await session3.do('click the login button');

    console.log('✅ Test complete - no video recorded\n');
  } catch (error) {
    console.log('❌ Test failed - no video available\n');
  } finally {
    await session3.shutdown();
    await browser3.close();
  }

  console.log('\n=== Video Recording Summary ===');
  console.log('✅ Videos are embedded in HTML reports');
  console.log('✅ Playwright-compatible modes:');
  console.log('   - "on": Record all tests');
  console.log('   - "retain-on-failure": Keep only failed tests');
  console.log('   - "on-first-retry": Record only retries');
  console.log('   - "off": No recording (default)');
  console.log('\n📁 Check ./vibe-reports/ for HTML report with embedded videos');
}

main().catch(console.error);
