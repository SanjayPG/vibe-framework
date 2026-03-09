import { chromium } from 'playwright';
import { vibe } from '../src';
import 'dotenv/config';

/**
 * Test: JSON and CSV Export
 *
 * This example tests the JSON and CSV export functionality
 */
async function main() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Create Vibe session with JSON and CSV export enabled
    const session = vibe()
      .withPage(page)
      .withMode('smart-cache')
      .withAIProvider('GEMINI' as any, process.env.GEMINI_API_KEY)
      .withReporting({
        colors: true,
        verbose: false,
        html: true,
        json: true,  // ← Enable JSON export
        csv: true,   // ← Enable CSV export
        includeScreenshots: false // Disable screenshots for smaller files
      })
      .build();

    console.log('\n🧪 Testing JSON and CSV Export\n');

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
    await session.do('click add to cart button for the bike light');

    // Test 3: Navigate to cart
    await session.do('click the shopping cart icon');

    // Shutdown - this will generate HTML, JSON, and CSV reports
    await session.shutdown();

    console.log('\n✅ Reports generated successfully!');
    console.log('\nCheck vibe-reports/ directory for:');
    console.log('  • index.html - Interactive HTML report');
    console.log('  • session-report.json - Full session data in JSON');
    console.log('  • session-report.csv - Action details in CSV');
    console.log('  • session-summary.csv - Summary statistics in CSV\n');

  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
