import { chromium } from 'playwright';
import { vibe, AIProvider } from '../src';
import 'dotenv/config';

/**
 * Quick Video Recording Test
 * Simple test to demonstrate video recording in HTML reports
 */
async function main() {
  console.log('🎥 Running Quick Video Test...\n');

  // Create browser with video recording
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
    .withAIProvider(AIProvider.OPENAI, process.env.OPENAI_API_KEY)
    .withVideo('on', {
      dir: './vibe-reports/videos',
      size: { width: 1280, height: 720 }
    })
    .withReporting({
      enabled: true,
      html: true,
      json: false,
      csv: false,
      includeScreenshots: true,
      includeVideos: true,
      outputDir: './vibe-reports'
    })
    .build();

  try {
    // Run a simple test on SauceDemo
    session.startTest('SauceDemo Login Test');

    await session.goto('https://www.saucedemo.com');
    await session.do('type standard_user into the username field');
    await session.do('type secret_sauce into the password field');
    await session.do('click the login button');
    await session.check('verify the products page is loaded');

    session.endTest('passed');

    console.log('\n✅ Test passed successfully!');
  } catch (error: any) {
    session.endTest('failed', error);
    console.log('\n❌ Test failed:', error.message);
  } finally {
    // Shutdown and generate reports
    await session.shutdown();
    await context.close();
    await browser.close();

    console.log('\n📊 Reports generated in ./vibe-reports/');
    console.log('📝 HTML Report: ./vibe-reports/index.html');
    console.log('🎥 Videos: ./vibe-reports/videos/');
  }
}

main().catch(console.error);
