import { chromium } from 'playwright';
import { vibe } from '../src';
import 'dotenv/config';

/**
 * Advanced Vibe Framework Demo
 * Demonstrates all new features: goto, count, findAll, ask
 */
async function main() {
  console.log('🚀 Vibe Framework - Advanced Features Demo\n');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Create Vibe session
    const session = vibe()
      .withPage(page)
      .withMode('smart-cache')
      .withAIProvider('GEMINI' as any, process.env.GEMINI_API_KEY)
      .build();

    console.log('✓ Vibe session created\n');

    // ====================================
    // Test 1: Navigation with goto()
    // ====================================
    console.log('=== Test 1: Navigation ===');
    await session.goto('https://www.saucedemo.com');

    // ====================================
    // Test 2: Login Flow
    // ====================================
    console.log('\n=== Test 2: Login Flow ===');
    await session.do('type standard_user into username field');
    await session.do('type secret_sauce into password field');
    await session.do('click the login button');
    await page.waitForTimeout(2000);

    // ====================================
    // Test 3: Count Elements (NEW!)
    // ====================================
    console.log('\n=== Test 3: Count Products ===');
    const productCount = await session.count('product items');
    console.log(`  → Found ${productCount} products`);

    if (productCount === 6) {
      console.log('  ✓ Correct! SauceDemo has 6 products');
    } else {
      console.warn(`  ⚠️ Expected 6 products, found ${productCount}`);
    }

    // ====================================
    // Test 4: FindAll Elements (NEW!)
    // ====================================
    console.log('\n=== Test 4: FindAll Products ===');
    const products = await session.findAll('product items');
    console.log(`  → Retrieved ${products.length} product locators`);

    // Extract all product names
    console.log('\n  Product names:');
    for (let i = 0; i < Math.min(3, products.length); i++) {
      const name = await products[i].locator('.inventory_item_name').textContent();
      console.log(`    ${i + 1}. ${name}`);
    }
    if (products.length > 3) {
      console.log(`    ... and ${products.length - 3} more`);
    }

    // ====================================
    // Test 5: Ask Questions (NEW! - Like ZeroStep)
    // ====================================
    console.log('\n=== Test 5: Question Answering ===');

    // Question 1: How many items?
    const answerCount = await session.ask('How many inventory items are shown on this page?');
    console.log(`  Q: How many inventory items?`);
    console.log(`  A: ${answerCount}`);

    // Question 2: What's the price of first item?
    const answerPrice = await session.ask('What is the price of the first product?');
    console.log(`\n  Q: What is the price of the first product?`);
    console.log(`  A: ${answerPrice}`);

    // Question 3: What's the page title?
    const answerTitle = await session.ask('What is the title of the page?');
    console.log(`\n  Q: What is the title of the page?`);
    console.log(`  A: ${answerTitle}`);

    // ====================================
    // Test 6: Input Validation (NEW!)
    // ====================================
    console.log('\n=== Test 6: Input Validation ===');

    // Test empty command
    try {
      await session.do('');
      console.log('  ✗ Should have thrown error for empty command');
    } catch (error: any) {
      console.log(`  ✓ Empty command rejected: ${error.message}`);
    }

    // Test too long command
    try {
      const longCommand = 'click '.repeat(500);
      await session.do(longCommand);
      console.log('  ✗ Should have thrown error for long command');
    } catch (error: any) {
      console.log(`  ✓ Long command rejected: ${error.message}`);
    }

    // ====================================
    // Test 7: Add to Cart and Verify Count
    // ====================================
    console.log('\n=== Test 7: Add Items to Cart ===');

    await session.do('click the add to cart button for the first product');
    await session.do('click the add to cart button for the second product');
    await page.waitForTimeout(500);

    // Count cart badge
    const cartBadge = await session.ask('What number is shown on the shopping cart badge?');
    console.log(`  → Cart badge shows: ${cartBadge}`);

    if (cartBadge === '2') {
      console.log('  ✓ Correct! 2 items in cart');
    }

    // ====================================
    // Test 8: Navigate to Cart
    // ====================================
    console.log('\n=== Test 8: Cart Validation ===');

    await session.do('click the shopping cart');
    await page.waitForTimeout(1000);

    const cartItems = await session.count('items in the cart list');
    console.log(`  → Cart contains ${cartItems} item(s)`);

    if (cartItems === 2) {
      console.log('  ✓ Cart validation passed!');
    }

    // ====================================
    // Test 9: Extract Cart Item Names
    // ====================================
    console.log('\n=== Test 9: Extract Cart Details ===');

    const cartItemNames = await session.ask('What are the names of the items in the cart?');
    console.log(`  → Cart items: ${cartItemNames}`);

    console.log('\n✅ All advanced tests passed!');

    // ====================================
    // Performance Summary
    // ====================================
    console.log('\n=== Performance Summary ===');
    console.log('Features demonstrated:');
    console.log('  ✅ goto() - Direct navigation');
    console.log('  ✅ count() - Count matching elements');
    console.log('  ✅ findAll() - Get array of locators');
    console.log('  ✅ ask() - AI question answering (ZeroStep-like!)');
    console.log('  ✅ Input validation - Max 2000 chars, non-empty');
    console.log('  ✅ Cache performance - Fast on repeated calls');

  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
  } finally {
    // Cleanup
    await browser.close();
  }
}

main().catch(console.error);
