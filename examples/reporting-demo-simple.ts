import { ConsoleReporter } from '../src/reporting/ConsoleReporter';
import { ActionMetrics, SessionSummary } from '../src/models/VibeMetrics';

/**
 * Simple Reporting Demo - Shows what the output looks like
 */
async function main() {
  const reporter = new ConsoleReporter(true, false);

  // Demo session start
  reporter.printSessionStart('abc-123-def-456');

  // Demo test 1
  console.log();
  reporter.printTestStart('Login Flow Test');

  // Simulate some actions
  const actions: ActionMetrics[] = [
    {
      id: '1',
      timestamp: Date.now(),
      command: 'type standard_user into username field',
      actionType: 'FILL',
      element: 'username field',
      success: true,
      latencyMs: 73,
      latencyBreakdown: { parsing: 45, elementFinding: 20, execution: 8 },
      cache: { parseCache: 'hit' as const, autoHealCache: 'hit' as const },
      ai: { parseAICalled: false, healingAICalled: false, estimatedCost: 0 },
      selector: '#user-name'
    },
    {
      id: '2',
      timestamp: Date.now(),
      command: 'type secret_sauce into password field',
      actionType: 'FILL',
      element: 'password field',
      success: true,
      latencyMs: 65,
      latencyBreakdown: { parsing: 42, elementFinding: 18, execution: 5 },
      cache: { parseCache: 'hit' as const, autoHealCache: 'hit' as const },
      ai: { parseAICalled: false, healingAICalled: false, estimatedCost: 0 },
      selector: '#password'
    },
    {
      id: '3',
      timestamp: Date.now(),
      command: 'click the login button',
      actionType: 'CLICK',
      element: 'login button',
      success: true,
      latencyMs: 55,
      latencyBreakdown: { parsing: 38, elementFinding: 12, execution: 5 },
      cache: { parseCache: 'hit' as const, autoHealCache: 'hit' as const },
      ai: { parseAICalled: false, healingAICalled: false, estimatedCost: 0 },
      selector: '#login-button'
    }
  ];

  actions.forEach(action => reporter.printAction(action));

  reporter.printTestEnd({
    name: 'Login Flow Test',
    startTime: Date.now() - 3000,
    endTime: Date.now(),
    duration: 3000,
    status: 'passed',
    actions: actions,
    metrics: {
      totalActions: 3,
      successfulActions: 3,
      failedActions: 0,
      totalLatency: 193,
      averageLatency: 64,
      cacheHitRate: 100,
      aiCallCount: 0,
      totalEstimatedCost: 0
    }
  });

  // Demo test 2 with AI healing
  reporter.printTestStart('Product Selection Test');

  const action4: ActionMetrics = {
    id: '4',
    timestamp: Date.now(),
    command: 'click add to cart for the backpack',
    actionType: 'CLICK',
    element: 'add to cart button',
    success: true,
    latencyMs: 1614,
    latencyBreakdown: { parsing: 55, elementFinding: 1534, execution: 25 },
    cache: { parseCache: 'miss' as const, autoHealCache: 'healed' as const },
    ai: {
      parseAICalled: true,
      healingAICalled: true,
      estimatedCost: 0.000416,
      model: 'gemini-2.0-flash-exp'
    },
    selector: 'button[data-test="add-to-cart-sauce-labs-backpack"]'
  };

  reporter.printAction(action4);

  reporter.printTestEnd({
    name: 'Product Selection Test',
    startTime: Date.now() - 2000,
    endTime: Date.now(),
    duration: 2000,
    status: 'passed',
    actions: [action4],
    metrics: {
      totalActions: 1,
      successfulActions: 1,
      failedActions: 0,
      totalLatency: 1614,
      averageLatency: 1614,
      cacheHitRate: 0,
      aiCallCount: 2,
      totalEstimatedCost: 0.000416
    }
  });

  // Final session summary
  const summary: SessionSummary = {
    sessionId: 'demo-session-123',
    startTime: Date.now() - 12000,
    endTime: Date.now(),
    duration: 12000,
    config: {
      mode: 'smart-cache',
      aiProvider: 'GEMINI',
      aiModel: 'gemini-2.0-flash-exp',
      cacheEnabled: true
    },
    tests: [],
    aggregated: {
      totalTests: 2,
      passedTests: 2,
      failedTests: 0,
      skippedTests: 0,
      totalActions: 4,
      successfulActions: 4,
      failedActions: 0,
      totalLatency: 1807,
      averageLatency: 451,
      cacheHits: 3,
      cacheMisses: 1,
      cacheHealings: 1,
      cacheHitRate: 75,
      parseAICalls: 1,
      healingAICalls: 1,
      totalAICalls: 2,
      totalEstimatedCost: 0.000416
    },
    performance: {
      fastestAction: actions[2],
      slowestAction: action4,
      mostExpensiveAction: action4
    }
  };

  reporter.printSessionSummary(summary);

  console.log('\n📁 Reports will be saved to: ./vibe-reports/');
  console.log('   - HTML Report: ./vibe-reports/index.html (Coming soon!)');
  console.log('   - JSON Export: ./vibe-reports/results.json (Coming soon!)');
  console.log('   - CSV Export: ./vibe-reports/results.csv (Coming soon!)');
  console.log();
}

main().catch(console.error);
