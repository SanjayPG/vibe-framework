/**
 * Comprehensive metrics and reporting models for Vibe
 */

/**
 * Action execution result with detailed metrics
 */
export interface ActionMetrics {
  /** Unique ID for this action */
  id: string;

  /** Timestamp when action started */
  timestamp: number;

  /** Original natural language command */
  command: string;

  /** Parsed action type (CLICK, FILL, etc) */
  actionType: string;

  /** Element description */
  element: string;

  /** Success or failure */
  success: boolean;

  /** Error message if failed */
  error?: string;

  /** Total latency in milliseconds */
  latencyMs: number;

  /** Breakdown of latency */
  latencyBreakdown: {
    parsing: number;      // NL parsing time
    elementFinding: number; // AutoHeal element finding
    execution: number;     // Action execution
  };

  /** Cache performance */
  cache: {
    parseCache: 'hit' | 'miss';
    autoHealCache: 'hit' | 'miss' | 'healed';
  };

  /** AI usage */
  ai: {
    parseAICalled: boolean;
    healingAICalled: boolean;
    model?: string;
    estimatedCost: number; // USD
    tokenUsage?: {
      parse: number;
      healing: number;
    };
  };

  /** Screenshot path if captured */
  screenshot?: string;

  /** Video path if captured */
  video?: string;

  /** Selector that was used/healed */
  selector?: string;
}

/**
 * Test-level summary
 */
export interface TestSummary {
  /** Test name */
  name: string;

  /** Start time */
  startTime: number;

  /** End time */
  endTime: number;

  /** Duration in ms */
  duration: number;

  /** Pass/fail status */
  status: 'passed' | 'failed' | 'skipped';

  /** All actions in this test */
  actions: ActionMetrics[];

  /** Aggregated metrics */
  metrics: {
    totalActions: number;
    successfulActions: number;
    failedActions: number;
    totalLatency: number;
    averageLatency: number;
    cacheHitRate: number;
    aiCallCount: number;
    totalEstimatedCost: number;
  };

  /** Error details if test failed */
  error?: {
    message: string;
    stack?: string;
  };
}

/**
 * Session-level summary (entire test run)
 */
export interface SessionSummary {
  /** Session ID */
  sessionId: string;

  /** Start time */
  startTime: number;

  /** End time */
  endTime: number;

  /** Total duration */
  duration: number;

  /** Configuration used */
  config: {
    mode: string;
    aiProvider: string;
    aiModel?: string;
    cacheEnabled: boolean;
  };

  /** All tests */
  tests: TestSummary[];

  /** Aggregated metrics across all tests */
  aggregated: {
    totalTests: number;
    passedTests: number;
    failedTests: number;
    skippedTests: number;

    totalActions: number;
    successfulActions: number;
    failedActions: number;

    totalLatency: number;
    averageLatency: number;

    cacheHits: number;
    cacheMisses: number;
    cacheHealings: number;
    cacheHitRate: number;

    parseAICalls: number;
    healingAICalls: number;
    totalAICalls: number;

    totalEstimatedCost: number;
  };

  /** Performance breakdown */
  performance: {
    fastestAction: ActionMetrics | null;
    slowestAction: ActionMetrics | null;
    mostExpensiveAction: ActionMetrics | null;
  };

  /** Lock statistics (for parallel execution monitoring) */
  lockStats?: {
    acquisitions: number;
    timeouts: number;
    totalWaitTime: number;
    averageWaitTime: number;
    timeoutRate: number;
    status: 'healthy' | 'caution' | 'warning';
  };
}

/**
 * Report configuration options
 */
export interface ReportConfig {
  /** Enable console output */
  console: {
    enabled: boolean;
    colors: boolean;
    progress: boolean;
    verbose: boolean;
  };

  /** Screenshot capture */
  screenshots: {
    enabled: boolean;
    onFailure: boolean;
    onSuccess: boolean;
    path: string;
  };

  /** Video recording */
  video: {
    enabled: boolean;
    path: string;
  };

  /** Export formats */
  export: {
    html: boolean;
    json: boolean;
    csv: boolean;
    outputDir: string;
  };

  /** What metrics to track */
  tracking: {
    latency: boolean;
    costs: boolean;
    cache: boolean;
    ai: boolean;
  };
}

/**
 * Default report configuration
 */
export const DEFAULT_REPORT_CONFIG: ReportConfig = {
  console: {
    enabled: true,
    colors: true,
    progress: true,
    verbose: false
  },
  screenshots: {
    enabled: true,
    onFailure: true,
    onSuccess: false,
    path: './vibe-reports/screenshots'
  },
  video: {
    enabled: false,
    path: './vibe-reports/videos'
  },
  export: {
    html: true,
    json: true,
    csv: false,
    outputDir: './vibe-reports'
  },
  tracking: {
    latency: true,
    costs: true,
    cache: true,
    ai: true
  }
};
