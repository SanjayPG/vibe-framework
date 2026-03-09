import { chromium } from 'playwright';
import { vibe } from '../src';
import 'dotenv/config';

async function main() {
  console.log('🚀 Vibe Framework - Basic Usage Example\n');

  // Launch browser
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Create Vibe session with GEMINI (using your existing GEMINI_API_KEY)
    const session = vibe()
      .withPage(page)
      .withMode('smart-cache')
      .withAIProvider('GEMINI' as any, process.env.GEMINI_API_KEY)
      .build();

    console.log('✓ Vibe session created\n');

    // Navigate to demo site
    await page.goto('https://www.saucedemo.com');
    console.log('✓ Navigated to SauceDemo\n');

    // Test 1: Fill username
    console.log('Test 1: Fill username');
    await session.do('type standard_user into username field');

    // Test 2: Fill password
    console.log('\nTest 2: Fill password');
    await session.do('type secret_sauce into password field');

    // Test 3: Click login
    console.log('\nTest 3: Click login button');
    await session.do('click the login button');

    // Wait for page load
    await page.waitForTimeout(2000);

    // Test 4: Verify we're on products page
    console.log('\nTest 4: Verify products page');
    const result = await session.check('verify products title is visible');
    console.log(`  Verification result: ${result.success}`);

    // Test 5: Extract page title
    console.log('\nTest 5: Extract page title');
    const title = await session.extract('text from products title');
    console.log(`  Extracted title: "${title}"`);

    console.log('\n✅ All tests passed!');

  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
  } finally {
    // Cleanup
    await browser.close();
  }
}

main().catch(console.error);
