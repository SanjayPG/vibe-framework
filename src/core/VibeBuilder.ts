import { Page } from 'playwright';
import { VibeSession } from './VibeSession';
import {
  VibeConfiguration,
  DEFAULT_CONFIG,
  MODE_CONFIGS,
  VibeMode,
  AIProvider,
  ExecutionStrategy,
  CacheType,
  VideoMode
} from './VibeConfiguration';

/**
 * Builder for creating VibeSession instances with fluent API
 */
export class VibeBuilder {
  private config: VibeConfiguration;
  private page?: Page;

  constructor() {
    // Start with default config
    this.config = { ...DEFAULT_CONFIG };
  }

  /**
   * Set the Playwright page
   */
  withPage(page: Page): this {
    this.page = page;
    return this;
  }

  /**
   * Set operation mode (pure-ai, smart-cache, training, trained)
   * This sets multiple config options based on the mode preset
   */
  withMode(mode: VibeMode): this {
    this.config.mode = mode;

    // Apply mode-specific config
    const modeConfig = MODE_CONFIGS[mode];
    if (modeConfig.cache) {
      this.config.cache = { ...this.config.cache, ...modeConfig.cache };
    }
    if (modeConfig.optimization) {
      this.config.optimization = { ...this.config.optimization, ...modeConfig.optimization };
    }

    return this;
  }

  /**
   * Set AI provider
   */
  withAIProvider(provider: AIProvider, apiKey?: string): this {
    this.config.aiProvider = provider;
    if (apiKey) {
      this.config.aiApiKey = apiKey;
    }
    return this;
  }

  /**
   * Set AI model (optional override)
   */
  withAIModel(model: string): this {
    this.config.aiModel = model;
    return this;
  }

  /**
   * Configure local/custom AI model endpoint
   *
   * Supports:
   * - Localhost: http://localhost:8000
   * - Cloudflare tunnels: https://xyz.trycloudflare.com
   * - ngrok: https://xyz.ngrok.io
   * - Google Colab: https://xyz.trycloudflare.com (from Colab)
   *
   * @param baseUrl - The base URL of your endpoint
   * @param options - Optional configuration
   *
   * @example
   * ```typescript
   * // Localhost
   * vibe().withLocalModel('http://localhost:8000').build()
   *
   * // Cloudflare tunnel
   * vibe().withLocalModel('https://princess-practices-carey-terms.trycloudflare.com').build()
   *
   * // With custom options
   * vibe().withLocalModel('http://localhost:5000', {
   *   apiPath: '/v1/chat',
   *   headers: { 'Authorization': 'Bearer token' },
   *   timeout: 60000
   * }).build()
   * ```
   */
  withLocalModel(baseUrl: string, options?: {
    apiPath?: string;
    headers?: Record<string, string>;
    model?: string;
    temperature?: number;
    maxTokens?: number;
    timeout?: number;
    format?: 'openai' | 'custom';
  }): this {
    // Set LOCAL for both parsing AND AutoHeal element finding
    this.config.aiProvider = AIProvider.LOCAL;
    this.config.parsingProvider = AIProvider.LOCAL;
    this.config.localModelConfig = {
      baseUrl,
      apiPath: options?.apiPath || '/chat',
      headers: options?.headers || {},
      model: options?.model || 'local-model',
      temperature: options?.temperature ?? 0.1,
      maxTokens: options?.maxTokens || 200,
      timeout: options?.timeout || 30000,
      format: options?.format || 'openai'
    };
    return this;
  }

  /**
   * Set execution strategy
   */
  withStrategy(strategy: ExecutionStrategy): this {
    this.config.executionStrategy = strategy;
    return this;
  }

  /**
   * Enable/disable AI parsing
   */
  withAIParsing(enabled: boolean): this {
    this.config.parsing.enableAIParsing = enabled;
    return this;
  }

  /**
   * Enable/disable cache warming
   */
  withCacheWarming(enabled: boolean): this {
    this.config.optimization.enableCacheWarming = enabled;
    return this;
  }

  /**
   * Start training mode with session name
   */
  startTraining(sessionName: string): this {
    this.config.optimization.enableTrainingMode = true;
    this.config.training = {
      sessionName,
      outputPath: `./vibe-training/${sessionName}.json`
    };
    return this;
  }

  /**
   * Load training data for trained mode
   */
  loadTrainingData(sessionName: string): this {
    this.withMode('trained');
    this.config.training = {
      sessionName,
      outputPath: `./vibe-training/${sessionName}.json`
    };
    return this;
  }

  /**
   * Set cache type
   */
  withCacheType(type: CacheType): this {
    this.config.cache.type = type;
    return this;
  }

  /**
   * Set cache size
   */
  withCacheSize(maxSize: number): this {
    this.config.cache.maxSize = maxSize;
    return this;
  }

  /**
   * Enable/disable screenshots on failure
   */
  withScreenshotOnFailure(enabled: boolean): this {
    this.config.screenshotOnFailure = enabled;
    return this;
  }

  /**
   * Set max retries
   */
  withMaxRetries(maxRetries: number): this {
    this.config.retry.maxRetries = maxRetries;
    return this;
  }

  /**
   * Configure reporting
   */
  withReporting(options?: {
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
  }): this {
    this.config.reporting = {
      enabled: options?.enabled ?? true,
      console: options?.console ?? true,
      colors: options?.colors ?? true,
      verbose: options?.verbose ?? false,
      html: options?.html ?? true,
      json: options?.json ?? false,
      csv: options?.csv ?? false,
      outputDir: options?.outputDir ?? './vibe-reports',
      includeScreenshots: options?.includeScreenshots ?? false,
      includeVideos: options?.includeVideos ?? false
    };
    return this;
  }

  /**
   * Disable reporting (shortcut for withReporting({ enabled: false }))
   */
  withoutReporting(): this {
    this.config.reporting = { enabled: false };
    return this;
  }

  /**
   * Configure video recording (Playwright-compatible)
   *
   * @param mode - Video recording mode:
   *   - 'off': No video recording (default)
   *   - 'on': Record video for all tests
   *   - 'retain-on-failure': Record video, keep only failures
   *   - 'on-first-retry': Record only on first retry
   * @param options - Optional video configuration
   *
   * @example
   * ```typescript
   * // Record all tests
   * vibe().withPage(page).withVideo('on').build()
   *
   * // Record only failures
   * vibe().withPage(page).withVideo('retain-on-failure').build()
   *
   * // Custom size
   * vibe().withPage(page).withVideo('on', {
   *   size: { width: 1280, height: 720 }
   * }).build()
   * ```
   */
  withVideo(
    mode: VideoMode,
    options?: {
      size?: { width: number; height: number };
      dir?: string;
    }
  ): this {
    this.config.video = {
      mode,
      size: options?.size || { width: 1280, height: 720 },
      dir: options?.dir || './vibe-reports/videos'
    };
    return this;
  }

  /**
   * Build the VibeSession
   */
  build(): VibeSession {
    if (!this.page) {
      throw new Error('Page is required. Use withPage() to set the Playwright page.');
    }

    if (!this.config.aiApiKey) {
      // Try to get from environment
      this.config.aiApiKey = this.getApiKeyFromEnv(this.config.aiProvider);
    }

    // Auto-detect LOCAL model configuration from environment variables
    // If LOCAL_MODEL_URL is set but parsingProvider is not LOCAL, automatically use LOCAL
    const envLocalModelConfig = this.getLocalModelConfigFromEnv();
    if (envLocalModelConfig && !this.config.parsingProvider) {
      console.log('🔧 Detected LOCAL model configuration in environment variables');
      console.log(`   Using: ${envLocalModelConfig.baseUrl}`);
      this.config.parsingProvider = AIProvider.LOCAL;
      this.config.localModelConfig = envLocalModelConfig;
    }

    // Load LOCAL model configuration from environment if parsingProvider is LOCAL but config not set
    if (this.config.parsingProvider === AIProvider.LOCAL && !this.config.localModelConfig) {
      this.config.localModelConfig = envLocalModelConfig || this.getLocalModelConfigFromEnv();
    }

    return new VibeSession(this.page, this.config);
  }

  /**
   * Get API key from environment based on provider
   */
  private getApiKeyFromEnv(provider: AIProvider): string | undefined {
    const envVars: Record<AIProvider, string> = {
      [AIProvider.GEMINI]: 'GEMINI_API_KEY',
      [AIProvider.OPENAI]: 'OPENAI_API_KEY',
      [AIProvider.ANTHROPIC]: 'ANTHROPIC_API_KEY',
      [AIProvider.DEEPSEEK]: 'DEEPSEEK_API_KEY',
      [AIProvider.GROK]: 'GROK_API_KEY',
      [AIProvider.GROQ]: 'GROQ_API_KEY',
      [AIProvider.LOCAL]: '' // No API key needed for local models
    };

    const envVar = envVars[provider];
    return process.env[envVar];
  }

  /**
   * Get LOCAL model configuration from environment variables
   *
   * Supports multiple environment variable formats:
   * - LOCAL_MODEL_URL, LOCAL_MODEL_API_PATH, etc. (recommended)
   * - AUTOHEAL_LOCAL_MODEL_URL, etc. (alternative)
   * - LOCAL_AI_URL (alternative)
   */
  private getLocalModelConfigFromEnv(): any {
    // Get base URL from multiple possible env vars
    const baseUrl = process.env.LOCAL_MODEL_URL ||
                    process.env.AUTOHEAL_LOCAL_MODEL_URL ||
                    process.env.LOCAL_AI_URL;

    if (!baseUrl) {
      return undefined; // No LOCAL model config in environment
    }

    return {
      baseUrl,
      apiPath: process.env.LOCAL_MODEL_API_PATH ||
               process.env.AUTOHEAL_LOCAL_MODEL_API_PATH ||
               '/v1/chat/completions',
      model: process.env.LOCAL_MODEL_NAME ||
             process.env.AUTOHEAL_LOCAL_MODEL_NAME ||
             process.env.LOCAL_MODEL_MODEL ||
             'local-model',
      format: (process.env.LOCAL_MODEL_FORMAT ||
              process.env.AUTOHEAL_LOCAL_MODEL_FORMAT ||
              'openai') as 'openai' | 'custom',
      timeout: parseInt(process.env.LOCAL_MODEL_TIMEOUT ||
                       process.env.AUTOHEAL_LOCAL_MODEL_TIMEOUT ||
                       '60000'),
      temperature: parseFloat(process.env.LOCAL_MODEL_TEMPERATURE ||
                             process.env.AUTOHEAL_LOCAL_MODEL_TEMPERATURE ||
                             '0.1'),
      maxTokens: parseInt(process.env.LOCAL_MODEL_MAX_TOKENS ||
                         process.env.AUTOHEAL_LOCAL_MODEL_MAX_TOKENS ||
                         '200'),
      headers: {} // Headers can't be easily loaded from env vars (would need JSON parsing)
    };
  }
}

/**
 * Factory function for creating VibeBuilder
 */
export function vibe(): VibeBuilder {
  return new VibeBuilder();
}
