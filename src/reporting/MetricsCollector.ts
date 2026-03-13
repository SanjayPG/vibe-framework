import { v4 as uuidv4 } from 'uuid';
import {
  ActionMetrics,
  TestSummary,
  SessionSummary,
  ReportConfig,
  DEFAULT_REPORT_CONFIG
} from '../models/VibeMetrics';

/**
 * Collects and tracks metrics during test execution
 */
export class MetricsCollector {
  private sessionId: string;
  private sessionStartTime: number;
  private config: ReportConfig;
  private sessionConfig: {
    mode?: string;
    aiProvider?: string;
    aiModel?: string;
    cacheEnabled?: boolean;
  };

  private currentTest: TestSummary | null = null;
  private tests: TestSummary[] = [];
  private currentAction: Partial<ActionMetrics> | null = null;
  private lockStats?: any;

  constructor(
    config: Partial<ReportConfig> = {},
    sessionConfig?: {
      mode?: string;
      aiProvider?: string;
      aiModel?: string;
      cacheEnabled?: boolean;
    }
  ) {
    this.sessionId = uuidv4();
    this.sessionStartTime = Date.now();
    this.config = { ...DEFAULT_REPORT_CONFIG, ...config };
    this.sessionConfig = sessionConfig || {};
  }

  /**
   * Start tracking a new test
   */
  startTest(name: string): void {
    this.currentTest = {
      name,
      startTime: Date.now(),
      endTime: 0,
      duration: 0,
      status: 'passed',
      actions: [],
      metrics: {
        totalActions: 0,
        successfulActions: 0,
        failedActions: 0,
        totalLatency: 0,
        averageLatency: 0,
        cacheHitRate: 0,
        aiCallCount: 0,
        totalEstimatedCost: 0
      }
    };
  }

  /**
   * End current test
   */
  endTest(status: 'passed' | 'failed' | 'skipped', error?: Error): void {
    if (!this.currentTest) return;

    this.currentTest.endTime = Date.now();
    this.currentTest.duration = this.currentTest.endTime - this.currentTest.startTime;
    this.currentTest.status = status;

    if (error) {
      this.currentTest.error = {
        message: error.message,
        stack: error.stack
      };
    }

    // Calculate aggregated metrics
    this.calculateTestMetrics(this.currentTest);

    this.tests.push(this.currentTest);
    this.currentTest = null;
  }

  /**
   * Start tracking an action
   */
  startAction(command: string): void {
    this.currentAction = {
      id: uuidv4(),
      timestamp: Date.now(),
      command,
      latencyBreakdown: {
        parsing: 0,
        elementFinding: 0,
        execution: 0
      },
      cache: {
        parseCache: 'miss',
        autoHealCache: 'miss'
      },
      ai: {
        parseAICalled: false,
        healingAICalled: false,
        estimatedCost: 0
      }
    };
  }

  /**
   * Record parsing metrics
   */
  recordParsing(
    actionType: string,
    element: string,
    latencyMs: number,
    cacheHit: boolean,
    aiCalled: boolean,
    provider?: string,
    model?: string,
    tokenUsage?: { promptTokens: number; completionTokens: number; totalTokens: number }
  ): void {
    if (!this.currentAction) return;

    this.currentAction.actionType = actionType;
    this.currentAction.element = element;
    this.currentAction.latencyBreakdown!.parsing = latencyMs;
    this.currentAction.cache!.parseCache = cacheHit ? 'hit' : 'miss';
    this.currentAction.ai!.parseAICalled = aiCalled;

    if (aiCalled && tokenUsage) {
      // Calculate real cost using CostCalculator
      const { CostCalculator } = require('../utils/CostCalculator');
      const cost = CostCalculator.calculateCost(provider || 'GROQ', model || 'llama-3.3-70b-versatile', tokenUsage);
      this.currentAction.ai!.estimatedCost += cost;

      // Store token usage for transparency
      if (!this.currentAction.ai!.tokenUsage) {
        this.currentAction.ai!.tokenUsage = { parse: 0, healing: 0 };
      }
      this.currentAction.ai!.tokenUsage.parse = tokenUsage.totalTokens;
    } else if (aiCalled) {
      // Fallback to estimate if no token usage data
      this.currentAction.ai!.estimatedCost += 0.000012;
    }
  }

  /**
   * Record element finding metrics
   */
  recordElementFinding(
    latencyMs: number,
    cacheHit: boolean,
    healed: boolean,
    selector?: string,
    model?: string
  ): void {
    if (!this.currentAction) return;

    this.currentAction.latencyBreakdown!.elementFinding = latencyMs;
    this.currentAction.cache!.autoHealCache = healed ? 'healed' : (cacheHit ? 'hit' : 'miss');
    this.currentAction.selector = selector;

    if (healed) {
      this.currentAction.ai!.healingAICalled = true;
      this.currentAction.ai!.model = model;

      // Estimate cost: ~4000 tokens DOM + 100 output = 4100 tokens
      // Varies by provider, using average
      // Gemini: ~$0.0003, OpenAI: ~$0.0006
      this.currentAction.ai!.estimatedCost += 0.0004;
    }
  }

  /**
   * Record action execution
   */
  recordExecution(latencyMs: number): void {
    if (!this.currentAction) return;
    this.currentAction.latencyBreakdown!.execution = latencyMs;
  }

  /**
   * End action tracking
   */
  endAction(success: boolean, error?: string, screenshot?: string): void {
    if (!this.currentAction || !this.currentTest) return;

    const action = this.currentAction as ActionMetrics;
    action.success = success;
    action.error = error;
    action.screenshot = screenshot;
    action.latencyMs =
      action.latencyBreakdown.parsing +
      action.latencyBreakdown.elementFinding +
      action.latencyBreakdown.execution;

    this.currentTest.actions.push(action);
    this.currentAction = null;
  }

  /**
   * Get the last completed action
   */
  getLastAction(): ActionMetrics | null {
    if (!this.currentTest || this.currentTest.actions.length === 0) {
      return null;
    }
    return this.currentTest.actions[this.currentTest.actions.length - 1];
  }

  /**
   * Get session ID
   */
  getSessionId(): string {
    return this.sessionId;
  }

  /**
   * Get current session summary
   */
  /**
   * Set lock statistics for the session (for parallel execution monitoring).
   */
  setLockStats(lockStats: any): void {
    this.lockStats = lockStats;
  }

  getSessionSummary(): SessionSummary {
    const now = Date.now();
    const summary: SessionSummary = {
      sessionId: this.sessionId,
      startTime: this.sessionStartTime,
      endTime: now,
      duration: now - this.sessionStartTime,
      config: {
        mode: this.sessionConfig.mode || 'smart-cache',
        aiProvider: this.sessionConfig.aiProvider || 'GEMINI',
        aiModel: this.sessionConfig.aiModel,
        cacheEnabled: this.sessionConfig.cacheEnabled ?? true
      },
      tests: this.tests,
      aggregated: {
        totalTests: this.tests.length,
        passedTests: this.tests.filter(t => t.status === 'passed').length,
        failedTests: this.tests.filter(t => t.status === 'failed').length,
        skippedTests: this.tests.filter(t => t.status === 'skipped').length,

        totalActions: 0,
        successfulActions: 0,
        failedActions: 0,

        totalLatency: 0,
        averageLatency: 0,

        cacheHits: 0,
        cacheMisses: 0,
        cacheHealings: 0,
        cacheHitRate: 0,

        parseAICalls: 0,
        healingAICalls: 0,
        totalAICalls: 0,

        totalEstimatedCost: 0
      },
      performance: {
        fastestAction: null,
        slowestAction: null,
        mostExpensiveAction: null
      },
      lockStats: this.lockStats // Include lock statistics if available
    };

    // Calculate aggregated metrics
    this.calculateSessionMetrics(summary);

    return summary;
  }

  /**
   * Calculate test-level metrics
   */
  private calculateTestMetrics(test: TestSummary): void {
    const actions = test.actions;

    test.metrics.totalActions = actions.length;
    test.metrics.successfulActions = actions.filter(a => a.success).length;
    test.metrics.failedActions = actions.filter(a => !a.success).length;
    test.metrics.totalLatency = actions.reduce((sum, a) => sum + a.latencyMs, 0);
    test.metrics.averageLatency = test.metrics.totalLatency / (actions.length || 1);

    const cacheHits = actions.filter(a =>
      a.cache.parseCache === 'hit' && a.cache.autoHealCache === 'hit'
    ).length;
    test.metrics.cacheHitRate = (cacheHits / (actions.length || 1)) * 100;

    test.metrics.aiCallCount = actions.filter(a =>
      a.ai.parseAICalled || a.ai.healingAICalled
    ).length;

    test.metrics.totalEstimatedCost = actions.reduce(
      (sum, a) => sum + a.ai.estimatedCost, 0
    );
  }

  /**
   * Calculate session-level metrics
   */
  private calculateSessionMetrics(summary: SessionSummary): void {
    const allActions = summary.tests.flatMap(t => t.actions);

    summary.aggregated.totalActions = allActions.length;
    summary.aggregated.successfulActions = allActions.filter(a => a.success).length;
    summary.aggregated.failedActions = allActions.filter(a => !a.success).length;
    summary.aggregated.totalLatency = allActions.reduce((sum, a) => sum + a.latencyMs, 0);
    summary.aggregated.averageLatency = summary.aggregated.totalLatency / (allActions.length || 1);

    summary.aggregated.cacheHits = allActions.filter(a =>
      a.cache.parseCache === 'hit' || a.cache.autoHealCache === 'hit'
    ).length;
    summary.aggregated.cacheMisses = allActions.filter(a =>
      a.cache.parseCache === 'miss' && a.cache.autoHealCache === 'miss'
    ).length;
    summary.aggregated.cacheHealings = allActions.filter(a =>
      a.cache.autoHealCache === 'healed'
    ).length;
    summary.aggregated.cacheHitRate =
      (summary.aggregated.cacheHits / (allActions.length || 1)) * 100;

    summary.aggregated.parseAICalls = allActions.filter(a => a.ai.parseAICalled).length;
    summary.aggregated.healingAICalls = allActions.filter(a => a.ai.healingAICalled).length;
    summary.aggregated.totalAICalls =
      summary.aggregated.parseAICalls + summary.aggregated.healingAICalls;

    summary.aggregated.totalEstimatedCost = allActions.reduce(
      (sum, a) => sum + a.ai.estimatedCost, 0
    );

    // Find performance extremes
    if (allActions.length > 0) {
      summary.performance.fastestAction = allActions.reduce((min, a) =>
        a.latencyMs < min.latencyMs ? a : min
      );
      summary.performance.slowestAction = allActions.reduce((max, a) =>
        a.latencyMs > max.latencyMs ? a : max
      );
      summary.performance.mostExpensiveAction = allActions.reduce((max, a) =>
        a.ai.estimatedCost > max.ai.estimatedCost ? a : max
      );
    }
  }
}
