import { chromium } from 'playwright';
import { vibe } from '../src';
import 'dotenv/config';

/**
 * Demo: Multiple Tests with Collapsible Sections
 *
 * This example shows how multiple tests appear in the HTML report
 * with each test having collapsible action details
 */
async function main() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Create Vibe session
    const session = vibe()
      .withPage(page)
      .withMode('smart-cache')
      .withAIProvider('GEMINI' as any, process.env.GEMINI_API_KEY)
      .withReporting({
        colors: true,
        verbose: false,
        html: true,
        json: true,
        csv: true,
        includeScreenshots: true
      })
      .build();

    console.log('\n🧪 Running Multiple Test Demo\n');

    // Navigate to test site
    await page.goto('https://www.saucedemo.com');

    // ===== TEST 1: User Login =====
    session.startTest('Test 1: User Login Flow');

    await session.do('type standard_user into username field');
    await session.do('type secret_sauce into password field');
    await session.do('click the login button');

    // Wait for navigation
    await page.waitForTimeout(2000);

    session.endTest('passed');

    // ===== TEST 2: Add Products to Cart =====
    session.startTest('Test 2: Add Multiple Products to Cart');

    await session.do('click add to cart button for the backpack');
    await session.do('click add to cart button for the bike light');
    await session.do('click add to cart button for the bolt t-shirt');
    await session.do('click the shopping cart icon');

    // Wait to see the cart
    await page.waitForTimeout(1000);

    session.endTest('passed');

    // Shutdown and generate reports
    await session.shutdown();

    console.log('\n' + '='.repeat(60));
    console.log('📊 Reports Generated!');
    console.log('='.repeat(60));
    console.log('\n📁 Check vibe-reports/ directory:');
    console.log('  • index.html      - Interactive report with 2 collapsible tests');
    console.log('  • *.json          - Structured data export');
    console.log('  • *.csv           - Spreadsheet exports\n');
    console.log('💡 Open index.html to see:');
    console.log('  • Two separate test sections');
    console.log('  • Each test has collapsible action details');
    console.log('  • Screenshots with lightbox viewer');
    console.log('  • Search and filter functionality\n');

  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
