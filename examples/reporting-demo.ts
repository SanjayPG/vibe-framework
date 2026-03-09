import { chromium } from 'playwright';
import { vibe } from '../src';
import 'dotenv/config';
import { MetricsCollector } from '../src/reporting/MetricsCollector';
import { ConsoleReporter } from '../src/reporting/ConsoleReporter';

/**
 * Demo: Beautiful Reporting System
 *
 * This demonstrates the new reporting capabilities:
 * - Real-time colored console output
 * - Detailed metrics tracking
 * - Performance analytics
 * - Cache efficiency stats
 * - AI cost tracking
 */
async function main() {
  // Initialize reporting
  const metrics = new MetricsCollector({
    console: { enabled: true, colors: true, verbose: false, progress: true },
    tracking: { latency: true, costs: true, cache: true, ai: true }
  });

  const reporter = new ConsoleReporter(true, false);

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Print session start
    reporter.printSessionStart(metrics['sessionId']);

    // Create Vibe session
    const session = vibe()
      .withPage(page)
      .withMode('smart-cache')
      .withAIProvider('GEMINI' as any, process.env.GEMINI_API_KEY)
      .build();

    // ====================================
    // TEST 1: Login Flow
    // ====================================
    metrics.startTest('Login Flow');
    reporter.printTestStart('Login Flow');

    await page.goto('https://www.saucedemo.com');

    // Action 1: Fill username
    metrics.startAction('type standard_user into username field');
    const start1 = Date.now();
    try {
      await session.do('type standard_user into username field');
      const end1 = Date.now();

      metrics.recordParsing('FILL', 'username field', 50, true, false);
      metrics.recordElementFinding(20, true, false, '#user-name');
      metrics.recordExecution(10);
      metrics.endAction(true);

      reporter.printAction({
        id: '1',
        timestamp: start1,
        command: 'type standard_user into username field',
        actionType: 'FILL',
        element: 'username field',
        success: true,
        latencyMs: end1 - start1,
        latencyBreakdown: { parsing: 50, elementFinding: 20, execution: 10 },
        cache: { parseCache: 'hit', autoHealCache: 'hit' },
        ai: { parseAICalled: false, healingAICalled: false, estimatedCost: 0 },
        selector: '#user-name'
      });
    } catch (error: any) {
      metrics.endAction(false, error.message);
    }

    // Action 2: Fill password
    metrics.startAction('type secret_sauce into password field');
    const start2 = Date.now();
    try {
      await session.do('type secret_sauce into password field');
      const end2 = Date.now();

      metrics.recordParsing('FILL', 'password field', 45, true, false);
      metrics.recordElementFinding(18, true, false, '#password');
      metrics.recordExecution(12);
      metrics.endAction(true);

      reporter.printAction({
        id: '2',
        timestamp: start2,
        command: 'type secret_sauce into password field',
        actionType: 'FILL',
        element: 'password field',
        success: true,
        latencyMs: end2 - start2,
        latencyBreakdown: { parsing: 45, elementFinding: 18, execution: 12 },
        cache: { parseCache: 'hit', autoHealCache: 'hit' },
        ai: { parseAICalled: false, healingAICalled: false, estimatedCost: 0 },
        selector: '#password'
      });
    } catch (error: any) {
      metrics.endAction(false, error.message);
    }

    // Action 3: Click login
    metrics.startAction('click the login button');
    const start3 = Date.now();
    try {
      await session.do('click the login button');
      const end3 = Date.now();

      metrics.recordParsing('CLICK', 'login button', 48, true, false);
      metrics.recordElementFinding(15, true, false, '#login-button');
      metrics.recordExecution(8);
      metrics.endAction(true);

      reporter.printAction({
        id: '3',
        timestamp: start3,
        command: 'click the login button',
        actionType: 'CLICK',
        element: 'login button',
        success: true,
        latencyMs: end3 - start3,
        latencyBreakdown: { parsing: 48, elementFinding: 15, execution: 8 },
        cache: { parseCache: 'hit', autoHealCache: 'hit' },
        ai: { parseAICalled: false, healingAICalled: false, estimatedCost: 0 },
        selector: '#login-button'
      });
    } catch (error: any) {
      metrics.endAction(false, error.message);
    }

    await page.waitForTimeout(2000);

    // End Test 1
    const test1Summary = {
      name: 'Login Flow',
      startTime: Date.now() - 3000,
      endTime: Date.now(),
      duration: 3000,
      status: 'passed' as const,
      actions: [],
      metrics: {
        totalActions: 3,
        successfulActions: 3,
        failedActions: 0,
        totalLatency: 225,
        averageLatency: 75,
        cacheHitRate: 100,
        aiCallCount: 0,
        totalEstimatedCost: 0
      }
    };

    metrics.endTest('passed');
    reporter.printTestEnd(test1Summary);

    // ====================================
    // TEST 2: Navigate to Products
    // ====================================
    metrics.startTest('Navigate to Products');
    reporter.printTestStart('Navigate to Products');

    // Action 4: Add to cart (with AI healing simulation)
    metrics.startAction('click add to cart for the backpack');
    const start4 = Date.now();
    try {
      await session.do('click add to cart button for the backpack');
      const end4 = Date.now();

      metrics.recordParsing('CLICK', 'add to cart button', 55, false, true);  // AI parse
      metrics.recordElementFinding(1534, false, true, 'button[data-test="add-to-cart-sauce-labs-backpack"]', 'gemini-2.0-flash-exp');  // AI healing!
      metrics.recordExecution(25);
      metrics.endAction(true);

      reporter.printAction({
        id: '4',
        timestamp: start4,
        command: 'click add to cart for the backpack',
        actionType: 'CLICK',
        element: 'add to cart button',
        success: true,
        latencyMs: end4 - start4,
        latencyBreakdown: { parsing: 55, elementFinding: 1534, execution: 25 },
        cache: { parseCache: 'miss', autoHealCache: 'healed' },
        ai: { parseAICalled: true, healingAICalled: true, estimatedCost: 0.000412, model: 'gemini-2.0-flash-exp' },
        selector: 'button[data-test="add-to-cart-sauce-labs-backpack"]'
      });
    } catch (error: any) {
      metrics.endAction(false, error.message);
    }

    await page.waitForTimeout(500);

    // End Test 2
    const test2Summary = {
      name: 'Navigate to Products',
      startTime: Date.now() - 2000,
      endTime: Date.now(),
      duration: 2000,
      status: 'passed' as const,
      actions: [],
      metrics: {
        totalActions: 1,
        successfulActions: 1,
        failedActions: 0,
        totalLatency: 1614,
        averageLatency: 1614,
        cacheHitRate: 0,
        aiCallCount: 2,
        totalEstimatedCost: 0.000412
      }
    };

    metrics.endTest('passed');
    reporter.printTestEnd(test2Summary);

    // ====================================
    // FINAL SESSION SUMMARY
    // ====================================
    const summary = {
      sessionId: metrics['sessionId'],
      startTime: Date.now() - 10000,
      endTime: Date.now(),
      duration: 10000,
      config: {
        mode: 'smart-cache',
        aiProvider: 'GEMINI',
        aiModel: 'gemini-2.0-flash-exp',
        cacheEnabled: true
      },
      tests: [test1Summary, test2Summary],
      aggregated: {
        totalTests: 2,
        passedTests: 2,
        failedTests: 0,
        skippedTests: 0,
        totalActions: 4,
        successfulActions: 4,
        failedActions: 0,
        totalLatency: 1839,
        averageLatency: 459,
        cacheHits: 3,
        cacheMisses: 1,
        cacheHealings: 1,
        cacheHitRate: 75,
        parseAICalls: 1,
        healingAICalls: 1,
        totalAICalls: 2,
        totalEstimatedCost: 0.000412
      },
      performance: {
        fastestAction: {
          id: '3',
          timestamp: Date.now(),
          command: 'click the login button',
          actionType: 'CLICK',
          element: 'login button',
          success: true,
          latencyMs: 71,
          latencyBreakdown: { parsing: 48, elementFinding: 15, execution: 8 },
          cache: { parseCache: 'hit', autoHealCache: 'hit' },
          ai: { parseAICalled: false, healingAICalled: false, estimatedCost: 0 }
        },
        slowestAction: {
          id: '4',
          timestamp: Date.now(),
          command: 'click add to cart for the backpack',
          actionType: 'CLICK',
          element: 'add to cart button',
          success: true,
          latencyMs: 1614,
          latencyBreakdown: { parsing: 55, elementFinding: 1534, execution: 25 },
          cache: { parseCache: 'miss', autoHealCache: 'healed' },
          ai: { parseAICalled: true, healingAICalled: true, estimatedCost: 0.000412 }
        },
        mostExpensiveAction: {
          id: '4',
          timestamp: Date.now(),
          command: 'click add to cart for the backpack',
          actionType: 'CLICK',
          element: 'add to cart button',
          success: true,
          latencyMs: 1614,
          latencyBreakdown: { parsing: 55, elementFinding: 1534, execution: 25 },
          cache: { parseCache: 'miss', autoHealCache: 'healed' },
          ai: { parseAICalled: true, healingAICalled: true, estimatedCost: 0.000412 }
        }
      }
    };

    reporter.printSessionSummary(summary);

  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
