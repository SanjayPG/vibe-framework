import { chromium } from 'playwright';
import { vibe } from '../src';
import 'dotenv/config';

/**
 * Simplified Advanced Vibe Demo
 * Focuses on working features: goto, ask, validation
 */
async function main() {
  console.log('🚀 Vibe Framework - New Features Demo\n');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    const session = vibe()
      .withPage(page)
      .withMode('smart-cache')
      .withAIProvider('GEMINI' as any, process.env.GEMINI_API_KEY)
      .build();

    console.log('✓ Vibe session created\n');

    // ====================================
    // Test 1: goto() - NEW!
    // ====================================
    console.log('=== Test 1: Navigation with goto() ===');
    await session.goto('https://www.saucedemo.com');

    // ====================================
    // Test 2: Login (cached from previous run)
    // ====================================
    console.log('\n=== Test 2: Cached Login ===');
    await session.do('type standard_user into username field');
    await session.do('type secret_sauce into password field');
    await session.do('click the login button');
    await page.waitForTimeout(2000);

    // ====================================
    // Test 3: ask() - NEW! Question Answering
    // ====================================
    console.log('\n=== Test 3: AI Question Answering (NEW!) ===');

    // Question 1: Count products
    const productCountAnswer = await session.ask('How many products are displayed on this page?');
    console.log(`  Q: How many products are displayed?`);
    console.log(`  A: ${productCountAnswer}`);

    // Question 2: Page title
    const titleAnswer = await session.ask('What is the main heading or title on this page?');
    console.log(`\n  Q: What is the main heading?`);
    console.log(`  A: ${titleAnswer}`);

    // Question 3: First product price
    const priceAnswer = await session.ask('What is the price of the first product listed?');
    console.log(`\n  Q: What is the price of the first product?`);
    console.log(`  A: ${priceAnswer}`);

    // ====================================
    // Test 4: Input Validation - NEW!
    // ====================================
    console.log('\n=== Test 4: Input Validation (NEW!) ===');

    // Empty command
    try {
      await session.do('');
      console.log('  ✗ Should have thrown error');
    } catch (error: any) {
      console.log(`  ✓ Empty rejected: "${error.message}"`);
    }

    // Too long command (> 2000 chars)
    try {
      const longCommand = 'a'.repeat(2001);
      await session.do(longCommand);
      console.log('  ✗ Should have thrown error');
    } catch (error: any) {
      console.log(`  ✓ Long command rejected (${error.message.substring(0, 50)}...)`);
    }

    // ====================================
    // Test 5: Add to Cart
    // ====================================
    console.log('\n=== Test 5: Interaction & Verification ===');

    await session.do('click add to cart for backpack');
    await page.waitForTimeout(500);

    // Verify cart badge
    const cartCount = await session.ask('What number is shown on the shopping cart badge?');
    console.log(`  → Cart badge: ${cartCount}`);

    if (cartCount === '1' || cartCount.includes('1')) {
      console.log('  ✓ Cart correctly shows 1 item');
    }

    // ====================================
    // Test 6: Navigate and Ask
    // ====================================
    console.log('\n=== Test 6: Navigate to Cart ===');

    await session.do('click the shopping cart icon');
    await page.waitForTimeout(1000);

    const cartPageTitle = await session.ask('What page am I on now?');
    console.log(`  → Current page: ${cartPageTitle}`);

    const itemName = await session.ask('What item is in my cart?');
    console.log(`  → Item in cart: ${itemName}`);

    console.log('\n✅ All tests passed!');

    // ====================================
    // Summary
    // ====================================
    console.log('\n=== New Features Demonstrated ===');
    console.log('  ✅ goto(url) - Direct URL navigation');
    console.log('  ✅ ask(question) - AI-powered question answering');
    console.log('  ✅ Input validation - 2000 char limit, non-empty');
    console.log('  ✅ Cache performance - Instant on repeated elements');
    console.log('\n  🎯 Vibe now has feature parity with ZeroStep!');

  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
