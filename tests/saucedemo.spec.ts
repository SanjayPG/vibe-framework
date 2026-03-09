import { test, expect } from '@playwright/test';
import { vibe } from '../src';
import 'dotenv/config';

// Shared Vibe session across tests
let vibeSession: any;

test.beforeAll(async () => {
  console.log('\n🚀 Initializing Vibe for Playwright tests\n');
});

test.afterAll(async () => {
  if (vibeSession) {
    await vibeSession.shutdown();
  }
});

test.describe('User Login Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Create Vibe session for each test
    vibeSession = vibe()
      .withPage(page)
      .withMode('smart-cache')
      .withAIProvider('LOCAL' as any, process.env.LOCAL_MODEL_URL)
      .withReporting({
        colors: true,
        verbose: false,
        html: true,
        json: true,
        csv: true,
        includeScreenshots: true
      })
      .build();

    vibeSession.startTest('User Login Flow');
    await page.goto('https://www.saucedemo.com');
  });

  test.only('should login with valid credentials', async ({ page }) => {
    await vibeSession.do('type standard_user into username field');
    await vibeSession.do('type secret_sauce into password field');
    await vibeSession.do('click the login button');

    // Verify login success
    await expect(page).toHaveURL(/.*inventory.html/);

    vibeSession.endTest('passed');
  });
});

test.describe('Shopping Cart Operations', () => {
  test.beforeEach(async ({ page }) => {
    // Create Vibe session
    const localModelUrl = process.env.LOCAL_MODEL_URL;
    const localModelName = process.env.LOCAL_MODEL_NAME;
    const localModelApiPath = process.env.LOCAL_MODEL_API_PATH || '/v1/chat/completions';

    if (!localModelUrl) {
      throw new Error('LOCAL_MODEL_URL not set in .env file. Please add: LOCAL_MODEL_URL=https://your-endpoint-url');
    }

    vibeSession = vibe()
      .withPage(page)
      .withMode('smart-cache')
      .withAIProvider('GROQ' as any) // Use GROQ for AutoHeal (element finding)
      .withLocalModel(localModelUrl, {
        apiPath: localModelApiPath,
        model: localModelName,
        format: 'openai',
        timeout: 60000
      })
      .withReporting({
        colors: true,
        verbose: false,
        html: true,
        json: true,
        csv: true,
        includeScreenshots: true
      })
      .build();

    vibeSession.startTest('Shopping Cart Operations');

    // Login first
    await page.goto('https://www.saucedemo.com');
    await vibeSession.do('type standard_user into username field');
    await vibeSession.do('type secret_sauce into password field');
    await vibeSession.do('click the login button');
    await page.waitForURL(/.*inventory.html/);
  });

  test.only('should add single product to cart', async ({ page }) => {
    await vibeSession.do('click add to cart button for the backpack');

    // Verify cart badge shows 1 item
    const cartBadge = await page.locator('.shopping_cart_badge').textContent();
    expect(cartBadge).toBe('1');

    vibeSession.endTest('passed');
  });
});
