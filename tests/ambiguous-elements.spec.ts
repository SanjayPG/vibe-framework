import { test, expect } from '@playwright/test';
import { vibe } from '../src';
import 'dotenv/config';

/**
 * Test: Ambiguous Element Identification
 *
 * This test validates Vibe's ability to identify the correct element when multiple
 * identical elements exist on the page. The AI should use contextual clues from
 * the natural language command to select the right element.
 *
 * Test Scenarios:
 * 1. Two identical "Submit" buttons - distinguish by "first" vs "second"
 * 2. Two identical "Add to cart" buttons - distinguish by product name context
 */

// Shared Vibe session
let vibeSession: any;

test.afterEach(async () => {
  if (vibeSession) {
    await vibeSession.shutdown();
    vibeSession = null;
  }
});

test.describe('Ambiguous Element Identification', () => {

  test('should identify correct Submit button using positional description', async ({ page }) => {
    // Navigate to test page with multiple identical buttons
    await page.goto('file:///C:/Users/debsa/OneDrive/Desktop/HtmlTest/Test11.html');

    // Initialize Vibe
    vibeSession = vibe()
      .withPage(page)
      .withMode('smart-cache')
      .withAIProvider('OPENAI' as any, process.env.OPENAI_API_KEY)
      .withReporting({
        colors: true,
        verbose: true,
        html: true,
        json: true,
        csv: true,
        includeScreenshots: true
      })
      .build();

    vibeSession.startTest('Identify First Submit Button');

    // Test 1: Click the FIRST submit button using contextual description
    console.log('\n🔍 Test 1: Clicking FIRST submit button...');

    // Listen for the alert
    page.once('dialog', async dialog => {
      console.log(`   Alert received: "${dialog.message()}"`);
      expect(dialog.message()).toBe('First button is clicked');
      await dialog.accept();
    });

    // Use natural language with positional context
    await vibeSession.do('click the first submit button');
    console.log('   ✅ First submit button clicked successfully');

    vibeSession.endTest('passed');

    // Wait a bit for any navigation
    await page.waitForTimeout(1000);
  });

  test('should identify correct Submit button using ordinal description', async ({ page }) => {
    await page.goto('file:///C:/Users/debsa/OneDrive/Desktop/HtmlTest/Test11.html');

    vibeSession = vibe()
      .withPage(page)
      .withMode('smart-cache')
      .withAIProvider('OPENAI' as any, process.env.OPENAI_API_KEY)
      .withReporting({
        colors: true,
        verbose: true,
        html: true,
        json: true,
        csv: true,
        includeScreenshots: true
      })
      .build();

    vibeSession.startTest('Identify Second Submit Button');

    // Test 2: Click the SECOND submit button using contextual description
    console.log('\n🔍 Test 2: Clicking SECOND submit button...');

    page.once('dialog', async dialog => {
      console.log(`   Alert received: "${dialog.message()}"`);
      expect(dialog.message()).toBe('Second button is clicked');
      await dialog.accept();
    });

    // Use natural language with positional context
    await vibeSession.do('click the second submit button');
    console.log('   ✅ Second submit button clicked successfully');

    vibeSession.endTest('passed');
    await page.waitForTimeout(1000);
  });

  test('should identify correct "Add to cart" button by product context', async ({ page }) => {
    await page.goto('file:///C:/Users/debsa/OneDrive/Desktop/HtmlTest/Test11.html');

    vibeSession = vibe()
      .withPage(page)
      .withMode('smart-cache')
      .withAIProvider('OPENAI' as any, process.env.OPENAI_API_KEY)
      .withReporting({
        colors: true,
        verbose: true,
        html: true,
        json: true,
        csv: true,
        includeScreenshots: true
      })
      .build();

    vibeSession.startTest('Add Product 1 to Cart');

    // Test 3: Add Product 1 to cart
    console.log('\n🔍 Test 3: Adding Product 1 to cart...');

    // Verify Product 1 section exists
    const product1 = await page.locator('text=Product 1').count();
    expect(product1).toBeGreaterThan(0);

    // Click the "Add to cart" button for Product 1
    // The AI should understand the context and click the button near "Product 1"
    await vibeSession.do('click the add to cart button for Product 1');
    console.log('   ✅ Product 1 add to cart button clicked');

    vibeSession.endTest('passed');
    await page.waitForTimeout(500);
  });

  test('should identify correct "Add to cart" button for Product 2', async ({ page }) => {
    await page.goto('file:///C:/Users/debsa/OneDrive/Desktop/HtmlTest/Test11.html');

    vibeSession = vibe()
      .withPage(page)
      .withMode('smart-cache')
      .withAIProvider('OPENAI' as any, process.env.OPENAI_API_KEY)
      .withReporting({
        colors: true,
        verbose: true,
        html: true,
        json: true,
        csv: true,
        includeScreenshots: true
      })
      .build();

    vibeSession.startTest('Add Product 2 to Cart');

    // Test 4: Add Product 2 to cart
    console.log('\n🔍 Test 4: Adding Product 2 to cart...');

    const product2 = await page.locator('text=Product 2').count();
    expect(product2).toBeGreaterThan(0);

    // Click the "Add to cart" button for Product 2
    await vibeSession.do('click the add to cart button for Product 2');
    console.log('   ✅ Product 2 add to cart button clicked');

    vibeSession.endTest('passed');
    await page.waitForTimeout(500);
  });

  test('should handle multiple ambiguous elements in sequence', async ({ page }) => {
    await page.goto('file:///C:/Users/debsa/OneDrive/Desktop/HtmlTest/Test11.html');

    vibeSession = vibe()
      .withPage(page)
      .withMode('smart-cache')
      .withAIProvider('OPENAI' as any, process.env.OPENAI_API_KEY)
      .withReporting({
        colors: true,
        verbose: true,
        html: true,
        json: true,
        csv: true,
        includeScreenshots: true
      })
      .build();

    vibeSession.startTest('Sequential Ambiguous Interactions');

    console.log('\n🔍 Test 5: Sequential ambiguous element interactions...');

    // Sequence of interactions with ambiguous elements

    // 1. Click subscribe checkbox
    await vibeSession.do('click the subscribe checkbox');
    console.log('   ✅ Step 1: Subscribe checkbox clicked');

    // 2. Add Product 1 to cart
    await vibeSession.do('click add to cart for Product 1');
    console.log('   ✅ Step 2: Product 1 added to cart');

    // 3. Add Product 2 to cart
    await vibeSession.do('click add to cart for Product 2');
    console.log('   ✅ Step 3: Product 2 added to cart');

    // 4. Click first submit button
    page.once('dialog', async dialog => {
      console.log(`   Alert: "${dialog.message()}"`);
      await dialog.accept();
    });
    await vibeSession.do('click the first submit button');
    console.log('   ✅ Step 4: First submit button clicked');

    vibeSession.endTest('passed');
    await page.waitForTimeout(500);
  });

  test('should use semantic descriptions to identify buttons', async ({ page }) => {
    await page.goto('file:///C:/Users/debsa/OneDrive/Desktop/HtmlTest/Test11.html');

    vibeSession = vibe()
      .withPage(page)
      .withMode('smart-cache')
      .withAIProvider('OPENAI' as any, process.env.OPENAI_API_KEY)
      .withReporting({
        colors: true,
        verbose: true,
        html: true,
        json: true,
        csv: true,
        includeScreenshots: true
      })
      .build();

    vibeSession.startTest('Semantic Descriptions');

    console.log('\n🔍 Test 6: Using semantic/descriptive language...');

    // Test using various semantic descriptions

    // Describe by position in DOM
    page.once('dialog', async dialog => {
      await dialog.accept();
    });
    await vibeSession.do('click the top submit button');
    console.log('   ✅ Top submit button clicked using semantic description');

    await page.waitForTimeout(1000);
    await page.goto('file:///C:/Users/debsa/OneDrive/Desktop/HtmlTest/Test11.html');

    // Describe by product context with different wording
    await vibeSession.do('add the first product to cart');
    console.log('   ✅ First product added using alternate wording');

    vibeSession.endTest('passed');
    await page.waitForTimeout(500);
  });

  test('should report detailed metrics for ambiguous element resolution', async ({ page }) => {
    await page.goto('file:///C:/Users/debsa/OneDrive/Desktop/HtmlTest/Test11.html');

    vibeSession = vibe()
      .withPage(page)
      .withMode('smart-cache')
      .withAIProvider('OPENAI' as any, process.env.OPENAI_API_KEY)
      .withReporting({
        colors: true,
        verbose: true,
        html: true,
        json: true,
        csv: true,
        includeScreenshots: true
      })
      .build();

    vibeSession.startTest('Metrics Validation');

    console.log('\n🔍 Test 7: Metrics validation for ambiguous elements...');

    // Perform multiple ambiguous element interactions
    page.once('dialog', async dialog => await dialog.accept());
    await vibeSession.do('click the first submit button');

    await page.goto('file:///C:/Users/debsa/OneDrive/Desktop/HtmlTest/Test11.html');
    page.once('dialog', async dialog => await dialog.accept());
    await vibeSession.do('click the second submit button');

    await page.goto('file:///C:/Users/debsa/OneDrive/Desktop/HtmlTest/Test11.html');
    await vibeSession.do('add Product 1 to cart');

    await vibeSession.do('add Product 2 to cart');

    vibeSession.endTest('passed');

    // Get session summary
    const summary = vibeSession.getSessionSummary();

    console.log(`\n📊 Session Metrics:`);
    console.log(`   Total Actions: ${summary.aggregated.totalActions}`);
    console.log(`   Successful: ${summary.aggregated.successfulActions}`);
    console.log(`   Failed: ${summary.aggregated.failedActions}`);
    console.log(`   Cache Hit Rate: ${summary.aggregated.cacheHitRate.toFixed(2)}%`);
    console.log(`   AI Calls: ${summary.aggregated.totalAICalls}`);
    console.log(`   Estimated Cost: $${summary.aggregated.totalEstimatedCost.toFixed(6)}`);

    // Validate metrics
    expect(summary.aggregated.totalActions).toBeGreaterThan(0);
    expect(summary.aggregated.successfulActions).toBe(summary.aggregated.totalActions);
    expect(summary.aggregated.failedActions).toBe(0);

    console.log('   ✅ All metrics validated');
  });
});
