import { test, expect } from '@playwright/test';
import { vibe } from '../src';
import 'dotenv/config';

/**
 * Test: Local/Custom AI Model Integration
 *
 * Demonstrates using local or custom AI model endpoints:
 * - Localhost (http://localhost:8000)
 * - Cloudflare tunnels (https://xyz.trycloudflare.com)
 * - ngrok tunnels (https://xyz.ngrok.io)
 * - Google Colab endpoints
 *
 * Your endpoint URL: https://princess-practices-carey-terms.trycloudflare.com/chat
 */

let vibeSession: any;

test.afterEach(async () => {
  if (vibeSession) {
    await vibeSession.shutdown();
    vibeSession = null;
  }
});

test.describe('Local Model Integration', () => {

  test('should use Cloudflare tunnel endpoint', async ({ page }) => {
    // Get configuration from .env - NO HARDCODED DEFAULTS
    const localModelUrl = process.env.LOCAL_MODEL_URL;
    const localModelName = process.env.LOCAL_MODEL_NAME;
    const localModelApiPath = process.env.LOCAL_MODEL_API_PATH || '/v1/chat/completions'; // Only this has default

    if (!localModelUrl) {
      throw new Error('LOCAL_MODEL_URL not set in .env file. Please add: LOCAL_MODEL_URL=https://your-endpoint-url');
    }

    await page.goto('https://www.saucedemo.com');

    // Initialize Vibe with Cloudflare tunnel endpoint
    vibeSession = vibe()
      .withPage(page)
      .withMode('smart-cache')
      .withAIProvider('GROQ' as any) // Use GROQ for AutoHeal (element finding)
      .withLocalModel(localModelUrl, {
        apiPath: localModelApiPath,
        model: localModelName,
        format: 'openai',
        timeout: 60000 // Cloudflare tunnels can be slower
      })
      .withReporting({
        colors: true,
        verbose: true,
        html: true,
        json: true,
        csv: true,
        includeScreenshots: true
      })
      .build();

    vibeSession.startTest('Cloudflare Tunnel Test');

    console.log('\n🌐 Testing Cloudflare Tunnel Endpoint\n');
    console.log(`   Endpoint: ${localModelUrl}/chat\n`);
    console.log(`   Source: ${process.env.LOCAL_MODEL_URL ? '.env (LOCAL_MODEL_URL)' : 'default'}\n`);

    // Test natural language commands
    await vibeSession.do('type standard_user into username field');
    console.log('✅ Step 1: Username entered using local model');

    await vibeSession.do('type secret_sauce into password field');
    console.log('✅ Step 2: Password entered using local model');

    await vibeSession.do('click the login button');
    console.log('✅ Step 3: Login button clicked using local model');

    // Verify login success
    await expect(page).toHaveURL(/.*inventory.html/);
    console.log('✅ Step 4: Login successful!');

    vibeSession.endTest('passed');
  });

  test.skip('should use localhost endpoint', async ({ page }) => {
    // Skip by default - requires local server running
    await page.goto('https://www.saucedemo.com');

    vibeSession = vibe()
      .withPage(page)
      .withMode('smart-cache')
      .withLocalModel('http://localhost:8000', {
        apiPath: '/chat',
        format: 'openai',
        timeout: 30000
      })
      .withReporting({
        colors: true,
        verbose: true,
        html: true,
        json: true,
        csv: true,
        includeScreenshots: true
      })
      .build();

    vibeSession.startTest('Localhost Test');

    console.log('\n💻 Testing Localhost Endpoint\n');
    console.log('   Endpoint: http://localhost:8000/chat\n');

    await vibeSession.do('type standard_user into username');
    console.log('✅ Username entered using localhost model');

    await vibeSession.do('type secret_sauce into password');
    console.log('✅ Password entered using localhost model');

    await vibeSession.do('click login button');
    console.log('✅ Login button clicked using localhost model');

    await expect(page).toHaveURL(/.*inventory.html/);

    vibeSession.endTest('passed');
  });

  test.skip('should use custom endpoint with headers', async ({ page }) => {
    await page.goto('https://www.saucedemo.com');

    // Example: Custom endpoint with authentication
    vibeSession = vibe()
      .withPage(page)
      .withMode('smart-cache')
      .withLocalModel('https://your-custom-endpoint.com', {
        apiPath: '/v1/chat/completions',
        headers: {
          'Authorization': 'Bearer your-custom-token',
          'X-Custom-Header': 'value'
        },
        format: 'openai',
        model: 'custom-model-v1',
        temperature: 0.1,
        maxTokens: 200,
        timeout: 45000
      })
      .withReporting({
        colors: true,
        verbose: true,
        html: true,
        json: true,
        csv: true,
        includeScreenshots: true
      })
      .build();

    vibeSession.startTest('Custom Endpoint Test');

    console.log('\n🔒 Testing Custom Endpoint with Auth\n');

    await vibeSession.do('type standard_user into username');
    await vibeSession.do('type secret_sauce into password');
    await vibeSession.do('click login button');

    await expect(page).toHaveURL(/.*inventory.html/);

    vibeSession.endTest('passed');
  });

  test.skip('should handle complex commands with local model', async ({ page }) => {
    await page.goto('file:///C:/Users/debsa/OneDrive/Desktop/HtmlTest/Test11.html');

    vibeSession = vibe()
      .withPage(page)
      .withMode('smart-cache')
      .withLocalModel('https://princess-practices-carey-terms.trycloudflare.com', {
        apiPath: '/chat',
        format: 'openai',
        timeout: 60000
      })
      .withReporting({
        colors: true,
        verbose: true,
        html: true,
        json: true,
        csv: true,
        includeScreenshots: true
      })
      .build();

    vibeSession.startTest('Complex Commands with Local Model');

    console.log('\n🔍 Testing complex command parsing with local model\n');

    // Test positional button
    page.once('dialog', async dialog => {
      console.log(`   Alert: "${dialog.message()}"`);
      expect(dialog.message()).toBe('First button is clicked');
      await dialog.accept();
    });
    await vibeSession.do('click the first submit button');
    console.log('✅ First button clicked (positional)');

    await page.goto('file:///C:/Users/debsa/OneDrive/Desktop/HtmlTest/Test11.html');

    // Test second button
    page.once('dialog', async dialog => {
      expect(dialog.message()).toBe('Second button is clicked');
      await dialog.accept();
    });
    await vibeSession.do('click the second submit button');
    console.log('✅ Second button clicked (ordinal)');

    vibeSession.endTest('passed');
  });

  test.skip('should compare local model performance', async ({ page }) => {
    await page.goto('https://www.saucedemo.com');

    vibeSession = vibe()
      .withPage(page)
      .withMode('smart-cache')
      .withLocalModel('https://princess-practices-carey-terms.trycloudflare.com', {
        apiPath: '/chat',
        format: 'openai',
        timeout: 60000
      })
      .withReporting({
        colors: true,
        verbose: true,
        html: true,
        json: true,
        csv: true,
        includeScreenshots: true
      })
      .build();

    vibeSession.startTest('Local Model Performance Test');

    console.log('\n⚡ Performance Test with Local Model\n');

    const startTime = Date.now();

    // Execute multiple commands
    await vibeSession.do('type standard_user into username');
    await vibeSession.do('type secret_sauce into password');
    await vibeSession.do('click login button');

    const duration = Date.now() - startTime;

    console.log(`\n📊 Total Duration: ${duration}ms`);
    console.log('   Local models can vary in speed based on:');
    console.log('   - Network latency (tunnel/localhost)');
    console.log('   - Model size and hardware');
    console.log('   - Server load');

    await expect(page).toHaveURL(/.*inventory.html/);

    vibeSession.endTest('passed');
  });
});

/**
 * Configuration Examples
 */
test.describe.skip('Configuration Examples', () => {

  test('Example: Localhost with default settings', async ({ page }) => {
    const session = vibe()
      .withPage(page)
      .withLocalModel('http://localhost:8000')
      .build();

    // Uses defaults:
    // - apiPath: '/chat'
    // - format: 'openai'
    // - timeout: 30000ms
  });

  test('Example: Cloudflare tunnel from Colab', async ({ page }) => {
    const session = vibe()
      .withPage(page)
      .withLocalModel('https://your-unique-url.trycloudflare.com', {
        apiPath: '/chat',
        format: 'openai',
        timeout: 60000 // Tunnels can be slower
      })
      .build();
  });

  test('Example: ngrok tunnel', async ({ page }) => {
    const session = vibe()
      .withPage(page)
      .withLocalModel('https://abc123.ngrok.io', {
        apiPath: '/api/chat',
        format: 'openai',
        timeout: 45000
      })
      .build();
  });

  test('Example: Custom format endpoint', async ({ page }) => {
    const session = vibe()
      .withPage(page)
      .withLocalModel('http://localhost:5000', {
        apiPath: '/predict',
        format: 'custom', // Uses simple { message, temperature, max_tokens } format
        model: 'my-custom-model',
        temperature: 0.1,
        maxTokens: 200
      })
      .build();
  });

  test('Example: With authentication', async ({ page }) => {
    const session = vibe()
      .withPage(page)
      .withLocalModel('https://api.example.com', {
        apiPath: '/v1/completions',
        headers: {
          'Authorization': 'Bearer sk-custom-key',
          'X-API-Version': '2024-01'
        },
        format: 'openai'
      })
      .build();
  });
});
