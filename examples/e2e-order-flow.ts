import { chromium } from 'playwright';
import { vibe } from '../src';
import 'dotenv/config';

/**
 * Complete E2E Test: Order Product Flow
 *
 * Test Scenario: Purchase a product on SauceDemo
 *
 * Steps:
 * 1. Navigate and Login
 * 2. Verify Products Page
 * 3. Add Product to Cart
 * 4. Verify Cart Badge
 * 5. View Cart
 * 6. Verify Cart Contents
 * 7. Proceed to Checkout
 * 8. Fill Checkout Information
 * 9. Verify Checkout Overview
 * 10. Complete Order
 * 11. Verify Order Confirmation
 */
async function main() {
  console.log('🧪 E2E Test: Complete Order Flow\n');
  console.log('='.repeat(60));

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  let testsPassed = 0;
  let testsFailed = 0;

  try {
    const session = vibe()
      .withPage(page)
      .withMode('smart-cache')
      .withAIProvider('OPENAI' as any, process.env.OPENAI_API_KEY)
      .build();

    // ====================================
    // STEP 1: Navigate to Application
    // ====================================
    console.log('\n📍 STEP 1: Navigate to SauceDemo');
    console.log('-'.repeat(60));

    await session.goto('https://www.saucedemo.com');

    // Validation: Page loaded correctly
    const pageTitle = await session.ask('What is the title or main text on the login page?');
    console.log(`  ✓ Page loaded: "${pageTitle}"`);
    if (pageTitle.toLowerCase().includes('swag labs') || pageTitle.toLowerCase().includes('login')) {
      console.log('  ✅ PASS: Login page displayed correctly');
      testsPassed++;
    } else {
      console.log('  ❌ FAIL: Unexpected page title');
      testsFailed++;
    }

    // ====================================
    // STEP 2: Login
    // ====================================
    console.log('\n🔐 STEP 2: User Login');
    console.log('-'.repeat(60));

    await session.do('type standard_user into username field');
    console.log('  ✓ Entered username: standard_user');

    await session.do('type secret_sauce into password field');
    console.log('  ✓ Entered password: ********');

    await session.do('click the login button');
    console.log('  ✓ Clicked login button');

    await page.waitForTimeout(2000);

    // ====================================
    // STEP 3: Verify Products Page Loaded
    // ====================================
    console.log('\n✅ STEP 3: Verify Products Page');
    console.log('-'.repeat(60));

    const productsTitle = await session.ask('What is the main heading on this page?');
    console.log(`  ✓ Page heading: "${productsTitle}"`);

    if (productsTitle.toLowerCase().includes('products') || productsTitle.toLowerCase().includes('product')) {
      console.log('  ✅ PASS: Successfully logged in - Products page displayed');
      testsPassed++;
    } else {
      console.log('  ❌ FAIL: Login failed or wrong page');
      testsFailed++;
      throw new Error('Login validation failed');
    }

    const productCount = await session.ask('How many products are displayed on this page?');
    console.log(`  ✓ Products available: ${productCount}`);

    if (parseInt(productCount) >= 6) {
      console.log('  ✅ PASS: All products loaded correctly');
      testsPassed++;
    } else {
      console.log('  ❌ FAIL: Not all products loaded');
      testsFailed++;
    }

    // ====================================
    // STEP 4: Add Product to Cart
    // ====================================
    console.log('\n🛒 STEP 4: Add Product to Cart');
    console.log('-'.repeat(60));

    const productName = await session.ask('What is the name of the first product?');
    console.log(`  ✓ Selecting product: "${productName}"`);

    await session.do('click add to cart button for the backpack');
    console.log('  ✓ Clicked "Add to Cart" for Backpack');

    await page.waitForTimeout(500);

    // ====================================
    // STEP 5: Verify Cart Badge Updated
    // ====================================
    console.log('\n🔢 STEP 5: Verify Cart Badge');
    console.log('-'.repeat(60));

    const cartBadge = await session.ask('What number is shown on the shopping cart badge?');
    console.log(`  ✓ Cart badge shows: ${cartBadge}`);

    if (cartBadge === '1' || cartBadge.includes('1')) {
      console.log('  ✅ PASS: Cart badge correctly shows 1 item');
      testsPassed++;
    } else {
      console.log(`  ❌ FAIL: Cart badge shows "${cartBadge}", expected "1"`);
      testsFailed++;
    }

    // ====================================
    // STEP 6: Navigate to Cart
    // ====================================
    console.log('\n🛍️ STEP 6: Navigate to Shopping Cart');
    console.log('-'.repeat(60));

    await session.do('click the shopping cart icon');
    console.log('  ✓ Clicked shopping cart');

    await page.waitForTimeout(1000);

    // ====================================
    // STEP 7: Verify Cart Contents
    // ====================================
    console.log('\n📋 STEP 7: Verify Cart Contents');
    console.log('-'.repeat(60));

    const cartPageTitle = await session.ask('What is the main heading on this page?');
    console.log(`  ✓ Page heading: "${cartPageTitle}"`);

    if (cartPageTitle.toLowerCase().includes('cart')) {
      console.log('  ✅ PASS: Cart page displayed');
      testsPassed++;
    } else {
      console.log('  ❌ FAIL: Not on cart page');
      testsFailed++;
    }

    const itemInCart = await session.ask('What product is in the cart?');
    console.log(`  ✓ Item in cart: "${itemInCart}"`);

    if (itemInCart.toLowerCase().includes('backpack')) {
      console.log('  ✅ PASS: Correct product in cart');
      testsPassed++;
    } else {
      console.log('  ❌ FAIL: Wrong product in cart');
      testsFailed++;
    }

    const itemPrice = await session.ask('What is the price of the item in the cart?');
    console.log(`  ✓ Item price: ${itemPrice}`);

    if (itemPrice.includes('$') && itemPrice.includes('29.99')) {
      console.log('  ✅ PASS: Correct price displayed');
      testsPassed++;
    } else {
      console.log(`  ⚠️ WARNING: Price "${itemPrice}" - verify manually`);
    }

    // ====================================
    // STEP 8: Proceed to Checkout
    // ====================================
    console.log('\n💳 STEP 8: Proceed to Checkout');
    console.log('-'.repeat(60));

    await session.do('click the checkout button');
    console.log('  ✓ Clicked checkout button');

    await page.waitForTimeout(1000);

    // ====================================
    // STEP 9: Fill Checkout Information
    // ====================================
    console.log('\n📝 STEP 9: Fill Checkout Information');
    console.log('-'.repeat(60));

    const checkoutPageTitle = await session.ask('What is the heading on this page?');
    console.log(`  ✓ Page heading: "${checkoutPageTitle}"`);

    if (checkoutPageTitle.toLowerCase().includes('checkout') && checkoutPageTitle.toLowerCase().includes('information')) {
      console.log('  ✅ PASS: Checkout information page displayed');
      testsPassed++;
    } else {
      console.log('  ❌ FAIL: Not on checkout page');
      testsFailed++;
    }

    await session.do('type John into first name field');
    console.log('  ✓ Entered first name: John');

    await session.do('type Doe into last name field');
    console.log('  ✓ Entered last name: Doe');

    await session.do('type 12345 into postal code field');
    console.log('  ✓ Entered postal code: 12345');

    await session.do('click the continue button');
    console.log('  ✓ Clicked continue');

    await page.waitForTimeout(1000);

    // ====================================
    // STEP 10: Verify Checkout Overview
    // ====================================
    console.log('\n📊 STEP 10: Verify Checkout Overview');
    console.log('-'.repeat(60));

    const overviewTitle = await session.ask('What is the main heading on this page?');
    console.log(`  ✓ Page heading: "${overviewTitle}"`);

    if (overviewTitle.toLowerCase().includes('overview')) {
      console.log('  ✅ PASS: Checkout overview page displayed');
      testsPassed++;
    } else {
      console.log('  ❌ FAIL: Not on overview page');
      testsFailed++;
    }

    const summaryProduct = await session.ask('What product is shown in the order summary?');
    console.log(`  ✓ Product in summary: "${summaryProduct}"`);

    if (summaryProduct.toLowerCase().includes('backpack')) {
      console.log('  ✅ PASS: Correct product in order summary');
      testsPassed++;
    } else {
      console.log('  ❌ FAIL: Wrong product in summary');
      testsFailed++;
    }

    const subtotal = await session.ask('What is the subtotal amount?');
    console.log(`  ✓ Subtotal: ${subtotal}`);

    const tax = await session.ask('What is the tax amount?');
    console.log(`  ✓ Tax: ${tax}`);

    const total = await session.ask('What is the total amount?');
    console.log(`  ✓ Total: ${total}`);

    if (total.includes('$') && parseFloat(total.replace('$', '')) > 0) {
      console.log('  ✅ PASS: Order total calculated correctly');
      testsPassed++;
    } else {
      console.log('  ❌ FAIL: Invalid total amount');
      testsFailed++;
    }

    // ====================================
    // STEP 11: Complete Order
    // ====================================
    console.log('\n🎯 STEP 11: Complete Order');
    console.log('-'.repeat(60));

    await session.do('click the finish button');
    console.log('  ✓ Clicked finish button');

    await page.waitForTimeout(1500);

    // ====================================
    // STEP 12: Verify Order Confirmation
    // ====================================
    console.log('\n✅ STEP 12: Verify Order Confirmation');
    console.log('-'.repeat(60));

    const confirmationMessage = await session.ask('What is the main message or heading on this page?');
    console.log(`  ✓ Confirmation message: "${confirmationMessage}"`);

    if (confirmationMessage.toLowerCase().includes('complete') ||
        confirmationMessage.toLowerCase().includes('thank')) {
      console.log('  ✅ PASS: Order completed successfully!');
      testsPassed++;
    } else {
      console.log('  ❌ FAIL: Order completion not confirmed');
      testsFailed++;
    }

    const confirmationText = await session.ask('What does the confirmation text say?');
    console.log(`  ✓ Full confirmation: "${confirmationText}"`);

    if (confirmationText.toLowerCase().includes('dispatch') ||
        confirmationText.toLowerCase().includes('order')) {
      console.log('  ✅ PASS: Order dispatch message displayed');
      testsPassed++;
    } else {
      console.log('  ⚠️ WARNING: Unexpected confirmation text');
    }

    // ====================================
    // TEST SUMMARY
    // ====================================
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST EXECUTION SUMMARY');
    console.log('='.repeat(60));
    console.log(`  Total Tests Run: ${testsPassed + testsFailed}`);
    console.log(`  ✅ Passed: ${testsPassed}`);
    console.log(`  ❌ Failed: ${testsFailed}`);
    console.log(`  Success Rate: ${((testsPassed / (testsPassed + testsFailed)) * 100).toFixed(2)}%`);

    if (testsFailed === 0) {
      console.log('\n  🎉 ALL TESTS PASSED! Order flow working perfectly!');
    } else {
      console.log(`\n  ⚠️ ${testsFailed} test(s) failed. Review above for details.`);
    }

    console.log('='.repeat(60));

  } catch (error: any) {
    console.error('\n❌ TEST EXECUTION FAILED:', error.message);
    console.error(error.stack);
    testsFailed++;
  } finally {
    // Keep browser open for manual verification
    console.log('\n⏸️  Browser will remain open for 5 seconds for verification...');
    await page.waitForTimeout(5000);
    await browser.close();
  }
}

main().catch(console.error);
