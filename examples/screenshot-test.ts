import { chromium } from 'playwright';
import { vibe } from '../src';

async function main() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('\n🧪 Testing Screenshot Functionality\n');

  // Create Vibe session with screenshots enabled
  const session = vibe()
    .withPage(page)
    .withMode('smart-cache')
    .withAIProvider('GEMINI' as any, process.env.GEMINI_API_KEY)
    .withReporting({
      colors: true,
      verbose: false,
      html: true,
      includeScreenshots: true // ← Enable screenshots for all actions
    })
    .build();

  try {
    // Navigate to demo site
    await page.goto('https://www.saucedemo.com');

    // Success actions (with screenshots)
    await session.do('type standard_user into username field');
    await session.do('type secret_sauce into password field');
    await session.do('click the login button');

    console.log('\n✅ Login successful! Screenshots captured.\n');

    // Intentionally cause a failure to capture error screenshot
    console.log('🔴 Testing failure screenshot...\n');
    try {
      await session.do('click the non-existent button'); // This will fail
    } catch (error) {
      console.log('✅ Failure screenshot captured!\n');
    }

    // More success actions
    await session.do('click add to cart button for the backpack');

  } catch (error: any) {
    console.error('Error:', error.message);
  } finally {
    // Shutdown and generate report
    await session.shutdown();

    console.log('\n📊 Report generated with screenshots!');
    console.log('Open vibe-reports/index.html to see screenshots\n');
    console.log('Features:');
    console.log('  • Click any screenshot thumbnail to enlarge');
    console.log('  • Lightbox viewer with zoom animation');
    console.log('  • Press ESC or click outside to close');
    console.log('  • Screenshots embedded as base64 (no external files)\n');

    await browser.close();
  }
}

main().catch(console.error);
