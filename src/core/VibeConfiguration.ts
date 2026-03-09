/**
 * Vibe framework operation modes
 */
export type VibeMode = 'pure-ai' | 'smart-cache' | 'training' | 'trained';

/**
 * Video recording modes (Playwright-compatible)
 */
export type VideoMode = 'off' | 'on' | 'retain-on-failure' | 'on-first-retry';

/**
 * AI Provider types (matching autoheal-locator)
 */
export enum AIProvider {
  GEMINI = 'GEMINI',
  OPENAI = 'OPENAI',
  ANTHROPIC = 'ANTHROPIC',
  DEEPSEEK = 'DEEPSEEK',
  GROK = 'GROK',
  GROQ = 'GROQ',
  LOCAL = 'LOCAL'
}

/**
 * Cache type (matching autoheal-locator)
 */
export enum CacheType {
  MEMORY = 'MEMORY',
  PERSISTENT_FILE = 'PERSISTENT_FILE'
}

/**
 * Execution strategy (matching autoheal-locator)
 */
export enum ExecutionStrategy {
  SMART_SEQUENTIAL = 'SMART_SEQUENTIAL',
  DOM_FIRST = 'DOM_FIRST',
  VISUAL_FIRST = 'VISUAL_FIRST',
  PARALLEL = 'PARALLEL'
}

/**
 * Complete Vibe configuration
 */
export interface VibeConfiguration {
  /** Operation mode */
  mode: VibeMode;

  /** AI provider (for AutoHeal element finding) */
  aiProvider: AIProvider;

  /** AI API key */
  aiApiKey?: string;

  /** AI model name (optional override) */
  aiModel?: string;

  /** Parsing provider (defaults to aiProvider if not set) */
  parsingProvider?: AIProvider;

  /** Local model configuration (for LOCAL parsing provider) */
  localModelConfig?: {
    baseUrl: string;
    apiPath?: string;
    headers?: Record<string, string>;
    model?: string;
    temperature?: number;
    maxTokens?: number;
    timeout?: number;
    format?: 'openai' | 'custom';
  };

  /** Execution strategy */
  executionStrategy: ExecutionStrategy;

  /** Cache configuration */
  cache: {
    enabled: boolean;
    type: CacheType;
    maxSize: number;
    expireAfterWriteMs: number;
  };

  /** Optimization settings */
  optimization: {
    enableCacheWarming: boolean;
    enableTrainingMode: boolean;
    enablePredictiveHealing: boolean;
    maxLatencyMs: number;
  };

  /** Parsing settings */
  parsing: {
    enableAIParsing: boolean;
    enableFuzzyMatching: boolean;
    confidenceThreshold: number;
  };

  /** Error handling */
  retry: {
    maxRetries: number;
    retryDelayMs: number;
  };

  /** Screenshot on failure */
  screenshotOnFailure: boolean;

  /** Training mode settings */
  training?: {
    sessionName?: string;
    outputPath?: string;
  };

  /** Reporting configuration */
  reporting?: {
    enabled?: boolean;
    console?: boolean;
    colors?: boolean;
    verbose?: boolean;
    html?: boolean;
    json?: boolean;
    csv?: boolean;
    outputDir?: string;
    includeScreenshots?: boolean;
    includeVideos?: boolean;
  };

  /** Video recording configuration (Playwright-compatible) */
  video?: {
    mode: VideoMode;
    size?: {
      width: number;
      height: number;
    };
    dir?: string;
  };
}

/**
 * Mode-based configuration presets
 */
export const MODE_CONFIGS: Record<VibeMode, Partial<VibeConfiguration>> = {
  'pure-ai': {
    cache: {
      enabled: true,
      type: CacheType.MEMORY,
      maxSize: 0, // Disable cache
      expireAfterWriteMs: 0
    },
    optimization: {
      enableCacheWarming: false,
      enableTrainingMode: false,
      enablePredictiveHealing: false,
      maxLatencyMs: 10000
    }
  },
  'smart-cache': {
    cache: {
      enabled: true,
      type: CacheType.PERSISTENT_FILE,
      maxSize: 10000,
      expireAfterWriteMs: 24 * 60 * 60 * 1000 // 24 hours
    },
    optimization: {
      enableCacheWarming: true,
      enableTrainingMode: false,
      enablePredictiveHealing: true,
      maxLatencyMs: 5000
    }
  },
  'training': {
    cache: {
      enabled: true,
      type: CacheType.PERSISTENT_FILE,
      maxSize: 10000,
      expireAfterWriteMs: 24 * 60 * 60 * 1000
    },
    optimization: {
      enableCacheWarming: false,
      enableTrainingMode: true,
      enablePredictiveHealing: false,
      maxLatencyMs: 10000
    }
  },
  'trained': {
    cache: {
      enabled: true,
      type: CacheType.MEMORY,
      maxSize: 0, // Use training data only
      expireAfterWriteMs: 0
    },
    optimization: {
      enableCacheWarming: false,
      enableTrainingMode: true,
      enablePredictiveHealing: false,
      maxLatencyMs: 1000
    }
  }
};

/**
 * Default configuration
 */
export const DEFAULT_CONFIG: VibeConfiguration = {
  mode: 'smart-cache',
  aiProvider: AIProvider.GEMINI,
  executionStrategy: ExecutionStrategy.SMART_SEQUENTIAL,
  cache: {
    enabled: true,
    type: CacheType.PERSISTENT_FILE,
    maxSize: 10000,
    expireAfterWriteMs: 24 * 60 * 60 * 1000
  },
  optimization: {
    enableCacheWarming: true,
    enableTrainingMode: false,
    enablePredictiveHealing: true,
    maxLatencyMs: 5000
  },
  parsing: {
    enableAIParsing: true,
    enableFuzzyMatching: true,
    confidenceThreshold: 0.5
  },
  retry: {
    maxRetries: 3,
    retryDelayMs: 1000
  },
  screenshotOnFailure: true
};
