import { chromium } from 'playwright';
import { vibe } from '../src';
import 'dotenv/config';

/**
 * Test: Reporting Integration
 *
 * This example tests the integrated reporting system in VibeSession
 */
async function main() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Create Vibe session WITH reporting enabled (default)
    const session = vibe()
      .withPage(page)
      .withMode('smart-cache')
      .withAIProvider('GEMINI' as any, process.env.GEMINI_API_KEY)
      .withReporting({
        colors: true,
        verbose: false,
        html: true,
        includeScreenshots: true // ← Enable screenshots
      })
      .build();

    console.log('\n🧪 Testing Vibe Reporting Integration\n');

    // Navigate to test site
    await page.goto('https://www.saucedemo.com');

    // Test 1: Login flow
    await session.do('type standard_user into username field');
    await session.do('type secret_sauce into password field');
    await session.do('click the login button');

    // Wait for page load
    await page.waitForTimeout(2000);

    // Test 2: Product interaction
    await session.do('click add to cart button for the backpack');

    // Test 3: Ask question
    try {
      const itemCount = await session.ask('How many items are in the cart?');
      console.log(`\n📊 Cart has: ${itemCount} items`);
    } catch (e) {
      console.log('\n⚠️  Ask test skipped (may require AI)');
    }

    // Shutdown - this will print the session summary
    await session.shutdown();

  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
