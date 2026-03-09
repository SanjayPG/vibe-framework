import { chromium } from 'playwright';
import { vibe, AIProvider } from '../src';
import 'dotenv/config';

/**
 * Simple Test with Video Recording
 * Uses Gemini (free) instead of OpenAI for better reliability
 */
async function main() {
  console.log('🎥 Running Simple Test with Video Recording...\n');

  // Create browser with video recording
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    recordVideo: {
      dir: './vibe-reports/videos',
      size: { width: 1280, height: 720 }
    }
  });
  const page = await context.newPage();

  // Create Vibe session with GEMINI (free and reliable)
  const session = vibe()
    .withPage(page)
    .withMode('smart-cache')
    .withAIProvider(AIProvider.GEMINI)  // Using Gemini (free tier)
    .withVideo('on', {
      dir: './vibe-reports/videos'
    })
    .withReporting({
      enabled: true,
      html: true,
      includeScreenshots: true,
      includeVideos: true,
      outputDir: './vibe-reports'
    })
    .build();

  try {
    session.startTest('Google Search Demo');

    // Navigate to Google
    await session.goto('https://www.google.com');

    // Accept cookies if present (may fail, that's ok)
    try {
      await page.click('button:has-text("Accept all")', { timeout: 2000 });
    } catch (e) {
      // Cookies dialog not present, continue
    }

    // Search for "Playwright"
    await session.do('type Playwright into the search box');
    await session.do('press Enter on the search box');

    // Wait a moment for results
    await page.waitForTimeout(2000);

    session.endTest('passed');
    console.log('\n✅ Test passed!');

  } catch (error: any) {
    session.endTest('failed', error);
    console.log('\n❌ Test failed:', error.message);
  } finally {
    // Shutdown and generate reports
    console.log('\n⏳ Generating reports...');
    await session.shutdown();
    await context.close();
    await browser.close();

    console.log('\n✅ Complete!');
    console.log('📊 HTML Report: ./vibe-reports/index.html');
    console.log('🎥 Video: ./vibe-reports/videos/');
    console.log('\n💡 Opening report in Chrome...');
  }
}

main()
  .then(() => {
    // Open the report in Chrome
    const { exec } = require('child_process');
    const path = require('path');
    const reportPath = path.resolve('./vibe-reports/index.html');
    exec(`start chrome "file:///${reportPath.replace(/\\/g, '/')}"`);
  })
  .catch(console.error);
