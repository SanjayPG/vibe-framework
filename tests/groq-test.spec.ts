import { test, expect } from '@playwright/test';
import { vibe } from '../src';
import 'dotenv/config';

/**
 * Test: Groq API Integration
 *
 * Demonstrates using Groq's Llama models for natural language parsing
 * Groq provides extremely fast inference (20-50x faster than OpenAI)
 */

let vibeSession: any;

test.afterEach(async () => {
  if (vibeSession) {
    await vibeSession.shutdown();
    vibeSession = null;
  }
});

test.describe('Groq API Integration', () => {

  test('should use Groq for natural language parsing', async ({ page }) => {
    await page.goto('https://www.saucedemo.com');

    // Initialize Vibe with Groq API
    vibeSession = vibe()
      .withPage(page)
      .withMode('smart-cache')
      .withAIProvider('GROQ' as any, process.env.GROQ_API_KEY)  // Using Groq!
      .withReporting({
        colors: true,
        verbose: true,
        html: true,
        json: true,
        csv: true,
        includeScreenshots: true
      })
      .build();

    vibeSession.startTest('Groq API Test');

    console.log('\n🚀 Testing Groq API (Llama 3.3 70B Versatile)\n');

    // Test natural language commands with Groq
    await vibeSession.do('type standard_user into username field');
    console.log('✅ Step 1: Username entered using Groq parsing');

    await vibeSession.do('type secret_sauce into password field');
    console.log('✅ Step 2: Password entered using Groq parsing');

    await vibeSession.do('click the login button');
    console.log('✅ Step 3: Login button clicked using Groq parsing');

    // Verify login success
    await expect(page).toHaveURL(/.*inventory.html/);
    console.log('✅ Step 4: Login successful!');

    vibeSession.endTest('passed');
  });

  test('should handle complex commands with Groq', async ({ page }) => {
    await page.goto('file:///C:/Users/debsa/OneDrive/Desktop/HtmlTest/Test11.html');

    vibeSession = vibe()
      .withPage(page)
      .withMode('smart-cache')
      .withAIProvider('GROQ' as any, process.env.GROQ_API_KEY)
      .withReporting({
        colors: true,
        verbose: true,
        html: true,
        json: true,
        csv: true,
        includeScreenshots: true
      })
      .build();

    vibeSession.startTest('Groq Complex Commands');

    console.log('\n🔍 Testing complex command parsing with Groq\n');

    // Test 1: Click checkbox
    await vibeSession.do('check the subscribe checkbox');
    console.log('✅ Checkbox clicked');

    // Test 2: Positional button
    page.once('dialog', async dialog => {
      console.log(`   Alert: "${dialog.message()}"`);
      expect(dialog.message()).toBe('First button is clicked');
      await dialog.accept();
    });
    await vibeSession.do('click the first submit button');
    console.log('✅ First button clicked (positional)');

    await page.goto('file:///C:/Users/debsa/OneDrive/Desktop/HtmlTest/Test11.html');

    // Test 3: Second button
    page.once('dialog', async dialog => {
      expect(dialog.message()).toBe('Second button is clicked');
      await dialog.accept();
    });
    await vibeSession.do('click the second submit button');
    console.log('✅ Second button clicked (ordinal)');

    vibeSession.endTest('passed');
  });

  test('should compare Groq performance', async ({ page }) => {
    await page.goto('https://www.saucedemo.com');

    vibeSession = vibe()
      .withPage(page)
      .withMode('smart-cache')
      .withAIProvider('GROQ' as any, process.env.GROQ_API_KEY)
      .withReporting({
        colors: true,
        verbose: true,
        html: true,
        json: true,
        csv: true,
        includeScreenshots: true
      })
      .build();

    vibeSession.startTest('Groq Performance Test');

    console.log('\n⚡ Performance Test with Groq\n');

    const startTime = Date.now();

    // Execute multiple commands
    await vibeSession.do('type standard_user into username');
    await vibeSession.do('type secret_sauce into password');
    await vibeSession.do('click login button');

    const duration = Date.now() - startTime;

    console.log(`\n📊 Total Duration: ${duration}ms`);
    console.log('   Expected: Groq is 20-50x faster than OpenAI for parsing');

    await expect(page).toHaveURL(/.*inventory.html/);

    vibeSession.endTest('passed');
  });
});
