import { SessionSummary, TestSummary, ActionMetrics } from '../models/VibeMetrics';

/**
 * ANSI color codes for terminal output
 */
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',

  // Foreground colors
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',

  // Background colors
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m'
};

/**
 * Beautiful console reporter with real-time progress
 */
export class ConsoleReporter {
  private useColors: boolean;
  private verbose: boolean;

  constructor(useColors: boolean = true, verbose: boolean = false) {
    this.useColors = useColors;
    this.verbose = verbose;
  }

  /**
   * Print session start
   */
  printSessionStart(sessionId: string): void {
    console.log();
    this.printBox('Vibe Test Session Started', 'cyan');
    console.log(`  ${this.dim('Session ID:')} ${sessionId}`);
    console.log();
  }

  /**
   * Print test start
   */
  printTestStart(testName: string): void {
    console.log();
    console.log(this.bright(this.cyan(`▶ ${testName}`)));
    console.log(this.dim('  ' + '─'.repeat(60)));
  }

  /**
   * Print action (real-time)
   */
  printAction(action: ActionMetrics): void {
    const icon = action.success ? this.green('✓') : this.red('✗');
    const latency = this.formatLatency(action.latencyMs);
    const cache = this.formatCacheStatus(action.cache);

    console.log(`  ${icon} ${action.command}`);

    if (this.verbose) {
      console.log(`    ${this.dim('Action:')} ${action.actionType}`);
      console.log(`    ${this.dim('Element:')} ${action.element}`);
      console.log(`    ${this.dim('Latency:')} ${latency}`);
      console.log(`    ${this.dim('Cache:')} ${cache}`);

      if (action.ai.parseAICalled || action.ai.healingAICalled) {
        const aiInfo = `Parse: ${action.ai.parseAICalled ? 'Yes' : 'No'}, Healing: ${action.ai.healingAICalled ? 'Yes' : 'No'}`;
        console.log(`    ${this.dim('AI Calls:')} ${aiInfo}`);
        console.log(`    ${this.dim('Cost:')} $${action.ai.estimatedCost.toFixed(6)}`);
      }
    }

    if (!action.success && action.error) {
      console.log(`    ${this.red('Error:')} ${action.error}`);
    }
  }

  /**
   * Print test end
   */
  printTestEnd(test: TestSummary): void {
    const icon = test.status === 'passed' ? this.green('✓') : this.red('✗');
    const statusText = test.status === 'passed' ? this.green(test.status.toUpperCase()) : this.red(test.status.toUpperCase());

    console.log();
    console.log(`  ${icon} ${statusText} ${this.dim(`(${test.duration}ms)`)}`);

    // Print test metrics
    console.log();
    console.log(this.dim('  Metrics:'));
    console.log(`    Actions: ${test.metrics.successfulActions}/${test.metrics.totalActions} passed`);
    console.log(`    Average Latency: ${test.metrics.averageLatency.toFixed(0)}ms`);
    console.log(`    Cache Hit Rate: ${test.metrics.cacheHitRate.toFixed(1)}%`);
    console.log(`    AI Calls: ${test.metrics.aiCallCount}`);
    console.log(`    Estimated Cost: $${test.metrics.totalEstimatedCost.toFixed(6)}`);

    console.log();
  }

  /**
   * Print session summary
   */
  printSessionSummary(summary: SessionSummary): void {
    console.log();
    this.printBox('Test Session Summary', 'blue');
    console.log();

    // Overall status
    const passRate = (summary.aggregated.passedTests / summary.aggregated.totalTests * 100).toFixed(1);
    console.log(this.bright('  Overall Results:'));
    console.log(`    ${this.green('✓')} Passed: ${this.green(summary.aggregated.passedTests.toString())}`);
    console.log(`    ${this.red('✗')} Failed: ${this.red(summary.aggregated.failedTests.toString())}`);
    console.log(`    ${this.dim('○')} Skipped: ${this.dim(summary.aggregated.skippedTests.toString())}`);
    console.log(`    ${this.dim('Success Rate:')} ${passRate}%`);
    console.log();

    // Action metrics
    console.log(this.bright('  Action Metrics:'));
    console.log(`    Total Actions: ${summary.aggregated.totalActions}`);
    console.log(`    ${this.green('Success:')} ${summary.aggregated.successfulActions}`);
    console.log(`    ${this.red('Failed:')} ${summary.aggregated.failedActions}`);
    console.log();

    // Performance
    console.log(this.bright('  Performance:'));
    console.log(`    Total Time: ${this.formatDuration(summary.duration)}`);
    console.log(`    Average Latency: ${summary.aggregated.averageLatency.toFixed(0)}ms`);
    console.log(`    Total Latency: ${this.formatDuration(summary.aggregated.totalLatency)}`);

    if (summary.performance.fastestAction) {
      console.log(`    ${this.green('⚡ Fastest:')} ${summary.performance.fastestAction.command} (${summary.performance.fastestAction.latencyMs}ms)`);
    }
    if (summary.performance.slowestAction) {
      console.log(`    ${this.yellow('🐌 Slowest:')} ${summary.performance.slowestAction.command} (${summary.performance.slowestAction.latencyMs}ms)`);
    }
    console.log();

    // Cache performance
    console.log(this.bright('  Cache Performance:'));
    console.log(`    ${this.green('Hits:')} ${summary.aggregated.cacheHits}`);
    console.log(`    ${this.yellow('Misses:')} ${summary.aggregated.cacheMisses}`);
    console.log(`    ${this.blue('Healings:')} ${summary.aggregated.cacheHealings}`);
    console.log(`    ${this.dim('Hit Rate:')} ${summary.aggregated.cacheHitRate.toFixed(1)}%`);
    console.log();

    // AI usage
    console.log(this.bright('  AI Usage:'));
    console.log(`    Parse Calls: ${summary.aggregated.parseAICalls}`);
    console.log(`    Healing Calls: ${summary.aggregated.healingAICalls}`);
    console.log(`    Total AI Calls: ${summary.aggregated.totalAICalls}`);
    console.log();

    // Cost
    console.log(this.bright('  Cost Analysis:'));
    console.log(`    ${this.green('💰')} Estimated Total: ${this.green('$' + summary.aggregated.totalEstimatedCost.toFixed(6))}`);

    if (summary.performance.mostExpensiveAction) {
      console.log(`    Most Expensive: ${summary.performance.mostExpensiveAction.command} ($${summary.performance.mostExpensiveAction.ai.estimatedCost.toFixed(6)})`);
    }
    console.log();

    // Lock statistics (parallel execution monitoring)
    if (summary.lockStats) {
      console.log(this.bright('  Lock Performance (Parallel Mode):'));
      console.log(`    Acquisitions: ${summary.lockStats.acquisitions}`);
      console.log(`    Timeouts: ${summary.lockStats.timeouts}`);
      console.log(`    Avg Wait Time: ${summary.lockStats.averageWaitTime.toFixed(1)}ms`);
      console.log(`    Timeout Rate: ${summary.lockStats.timeoutRate.toFixed(2)}%`);

      const statusColor = summary.lockStats.status === 'healthy' ? this.green :
                         summary.lockStats.status === 'caution' ? this.yellow :
                         this.red;
      console.log(`    Status: ${statusColor(summary.lockStats.status.toUpperCase())}`);
      console.log();
    }

    // Final message
    if (summary.aggregated.failedTests === 0) {
      this.printBox('✓ ALL TESTS PASSED!', 'green');
    } else {
      this.printBox(`✗ ${summary.aggregated.failedTests} TEST(S) FAILED`, 'red');
    }
    console.log();
  }

  /**
   * Helper: Print a colored box
   */
  private printBox(text: string, boxColor: 'green' | 'red' | 'blue' | 'cyan' | 'yellow' | 'magenta'): void {
    const width = 60;
    const padding = Math.max(0, Math.floor((width - text.length - 2) / 2));
    const line = '═'.repeat(width);

    // Map color name to color function
    const colorMap: Record<string, (text: string) => string> = {
      green: this.green.bind(this),
      red: this.red.bind(this),
      blue: this.blue.bind(this),
      cyan: this.cyan.bind(this),
      yellow: this.yellow.bind(this),
      magenta: this.magenta.bind(this)
    };

    const colorFn = colorMap[boxColor] || ((t: string) => t);

    console.log(colorFn('╔' + line + '╗'));
    console.log(colorFn('║' + ' '.repeat(padding) + text + ' '.repeat(width - padding - text.length) + '║'));
    console.log(colorFn('╚' + line + '╝'));
  }

  /**
   * Helper: Format latency
   */
  private formatLatency(ms: number): string {
    if (ms < 50) return this.green(`${ms}ms`);
    if (ms < 200) return this.yellow(`${ms}ms`);
    return this.red(`${ms}ms`);
  }

  /**
   * Helper: Format cache status
   */
  private formatCacheStatus(cache: { parseCache: string; autoHealCache: string }): string {
    const parse = cache.parseCache === 'hit' ? this.green('Parse✓') : this.yellow('Parse✗');
    let heal: string;

    if (cache.autoHealCache === 'hit') {
      heal = this.green('AutoHeal✓');
    } else if (cache.autoHealCache === 'healed') {
      heal = this.blue('Healed🔧');
    } else {
      heal = this.yellow('AutoHeal✗');
    }

    return `${parse} | ${heal}`;
  }

  /**
   * Helper: Format duration
   */
  private formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
    return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
  }

  // Color functions
  private color(code: string, text: string): string {
    return this.useColors ? `${code}${text}${colors.reset}` : text;
  }

  private green(text: string): string { return this.color(colors.green, text); }
  private red(text: string): string { return this.color(colors.red, text); }
  private yellow(text: string): string { return this.color(colors.yellow, text); }
  private blue(text: string): string { return this.color(colors.blue, text); }
  private cyan(text: string): string { return this.color(colors.cyan, text); }
  private magenta(text: string): string { return this.color(colors.magenta, text); }
  private dim(text: string): string { return this.color(colors.dim, text); }
  private bright(text: string): string { return this.color(colors.bright, text); }
}
