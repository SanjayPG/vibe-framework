import { Page, Locator } from 'playwright';
import { VibeConfiguration, AIProvider, CacheType, ExecutionStrategy } from '../core/VibeConfiguration';

// Dynamically import autoheal-locator types
type AutoHealLocator = any;
type AutoHealModule = any;

/**
 * Bridge to autoheal-locator-js
 * Handles all element finding and healing
 */
export class AutoHealBridge {
  private autoHeal: AutoHealLocator | null = null;
  private page: Page;
  private config: VibeConfiguration;
  private autoHealModule: AutoHealModule | null = null;

  constructor(page: Page, config: VibeConfiguration) {
    this.page = page;
    this.config = config;
  }

  /**
   * Initialize AutoHeal locator
   * Should be called before using find()
   */
  async initialize(): Promise<void> {
    try {
      // Dynamically import autoheal-locator with all enums
      this.autoHealModule = await import('@sdetsanjay/autoheal-locator');
      const { AutoHealLocator } = this.autoHealModule;

      // Build AutoHeal configuration from Vibe config
      const autoHealConfig = this.buildAutoHealConfig();

      // Create AutoHeal instance
      this.autoHeal = AutoHealLocator.builder()
        .withPlaywrightPage(this.page)
        .withConfiguration(autoHealConfig)
        .build();

      console.log(`AutoHeal initialized with mode: ${this.config.mode}`);
    } catch (error: any) {
      throw new Error(`Failed to initialize AutoHeal: ${error.message}`);
    }
  }

  /**
   * Find element using AutoHeal with natural language description
   * @param description Natural language element description
   * @param initialSelector Optional initial selector hint (can be generic)
   */
  async find(description: string, initialSelector?: string): Promise<Locator & { _autoHealMetadata?: any }> {
    if (!this.autoHeal) {
      await this.initialize();
    }

    try {
      // Use a generic selector if none provided
      const selector = initialSelector || this.generateGenericSelector(description);

      // Get metrics before
      const metricsBefore = this.autoHeal.getMetrics?.() || { successful_requests: 0 };
      const cacheBefore = this.autoHeal.getCacheMetrics?.() || { hitCount: 0, missCount: 0 };

      // Call AutoHeal to find the element
      // AutoHeal will:
      // 1. Try the selector
      // 2. Check cache
      // 3. Use AI healing if needed
      // 4. Return Playwright Locator
      const locator = await this.autoHeal.find(
        this.page,
        selector,
        description
      );

      // Get metrics after
      const metricsAfter = this.autoHeal.getMetrics?.() || { successful_requests: 0 };
      const cacheAfter = this.autoHeal.getCacheMetrics?.() || { hitCount: 0, missCount: 0 };

      // Determine if cache was hit or healing occurred
      const cacheHit = cacheAfter.hitCount > cacheBefore.hitCount;
      const cacheMiss = cacheAfter.missCount > cacheBefore.missCount;
      const healed = metricsAfter.successful_requests > metricsBefore.successful_requests && cacheMiss;

      // Try to get the actual selector used by extracting element attributes
      let actualSelector = selector;
      try {
        const element = await locator.first();
        const id = await element.getAttribute('id');
        const className = await element.getAttribute('class');
        const tagName = await element.evaluate((el: any) => el.tagName.toLowerCase());

        if (id) {
          actualSelector = `#${id}`;
        } else if (className) {
          const firstClass = className.split(' ')[0];
          actualSelector = `${tagName}.${firstClass}`;
        } else {
          actualSelector = tagName;
        }
      } catch (e) {
        // If we can't get element details, use the original selector
        actualSelector = selector;
      }

      // Attach metadata to locator
      (locator as any)._autoHealMetadata = {
        cacheHit,
        healed,
        selector: actualSelector,
        description
      };

      return locator as Locator & { _autoHealMetadata?: any };
    } catch (error: any) {
      throw new Error(`AutoHeal failed to find element "${description}": ${error.message}`);
    }
  }

  /**
   * Check if an element exists
   */
  async isElementPresent(description: string): Promise<boolean> {
    try {
      const locator = await this.find(description);
      const count = await locator.count();
      return count > 0;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get AutoHeal metrics
   */
  getMetrics(): any {
    if (!this.autoHeal) {
      return {};
    }
    return this.autoHeal.getMetrics?.() || {};
  }

  /**
   * Get cache metrics
   */
  getCacheMetrics(): any {
    if (!this.autoHeal) {
      return {};
    }
    return this.autoHeal.getCacheMetrics?.() || {};
  }

  /**
   * Clear AutoHeal cache
   */
  clearCache(): void {
    if (this.autoHeal && this.autoHeal.clearCache) {
      this.autoHeal.clearCache();
    }
  }

  /**
   * Build AutoHeal configuration from Vibe configuration
   */
  private buildAutoHealConfig(): any {
    if (!this.autoHealModule) {
      throw new Error('AutoHeal module not loaded');
    }

    // Get AutoHeal's enums
    const { AIProvider: AHAIProvider, CacheType: AHCacheType, ExecutionStrategy: AHExecutionStrategy } = this.autoHealModule;

    // Get the appropriate default model for the provider if not specified
    const model = this.config.aiModel || this.getDefaultModelForProvider(this.config.aiProvider);

    return {
      ai: {
        provider: this.mapAIProvider(this.config.aiProvider, AHAIProvider),
        apiKey: this.config.aiApiKey || process.env[this.getEnvVarForProvider(this.config.aiProvider)],
        model: model,
        temperature: 0.1
      },
      cache: {
        type: this.mapCacheType(this.config.cache.type, AHCacheType),
        maxSize: this.config.cache.maxSize,
        expireAfterWriteMs: this.config.cache.expireAfterWriteMs
      },
      performance: {
        executionStrategy: this.mapExecutionStrategy(this.config.executionStrategy, AHExecutionStrategy),
        elementTimeout: 10000
      }
    };
  }

  /**
   * Map Vibe AI provider to AutoHeal provider enum
   */
  private mapAIProvider(provider: AIProvider, AHAIProvider: any): any {
    const mapping: Record<AIProvider, string> = {
      [AIProvider.GEMINI]: 'GEMINI',
      [AIProvider.OPENAI]: 'OPENAI',
      [AIProvider.ANTHROPIC]: 'ANTHROPIC',
      [AIProvider.DEEPSEEK]: 'DEEPSEEK',
      [AIProvider.GROK]: 'GROK',
      [AIProvider.GROQ]: 'GROQ',
      [AIProvider.LOCAL]: 'LOCAL'
    };

    const providerKey = mapping[provider];
    return AHAIProvider[providerKey];
  }

  /**
   * Map Vibe cache type to AutoHeal cache type enum
   */
  private mapCacheType(cacheType: CacheType, AHCacheType: any): any {
    const mapping: Record<CacheType, string> = {
      [CacheType.MEMORY]: 'MEMORY',
      [CacheType.PERSISTENT_FILE]: 'PERSISTENT_FILE'
    };

    const cacheKey = mapping[cacheType];
    return AHCacheType[cacheKey];
  }

  /**
   * Map Vibe execution strategy to AutoHeal strategy enum
   */
  private mapExecutionStrategy(strategy: ExecutionStrategy, AHExecutionStrategy: any): any {
    const mapping: Record<ExecutionStrategy, string> = {
      [ExecutionStrategy.SMART_SEQUENTIAL]: 'SMART_SEQUENTIAL',
      [ExecutionStrategy.DOM_FIRST]: 'DOM_FIRST',
      [ExecutionStrategy.VISUAL_FIRST]: 'VISUAL_FIRST',
      [ExecutionStrategy.PARALLEL]: 'PARALLEL'
    };

    const strategyKey = mapping[strategy];
    return AHExecutionStrategy[strategyKey];
  }

  /**
   * Get environment variable name for AI provider
   */
  private getEnvVarForProvider(provider: AIProvider): string {
    const envVars: Record<AIProvider, string> = {
      [AIProvider.GEMINI]: 'GEMINI_API_KEY',
      [AIProvider.OPENAI]: 'OPENAI_API_KEY',
      [AIProvider.ANTHROPIC]: 'ANTHROPIC_API_KEY',
      [AIProvider.DEEPSEEK]: 'DEEPSEEK_API_KEY',
      [AIProvider.GROK]: 'GROK_API_KEY',
      [AIProvider.GROQ]: 'GROQ_API_KEY',
      [AIProvider.LOCAL]: '' // No API key needed for LOCAL
    };
    return envVars[provider];
  }

  /**
   * Get default model for AI provider
   */
  private getDefaultModelForProvider(provider: AIProvider): string {
    const defaultModels: Record<AIProvider, string> = {
      [AIProvider.GEMINI]: 'gemini-2.0-flash-exp',
      [AIProvider.OPENAI]: 'gpt-4o-mini',
      [AIProvider.ANTHROPIC]: 'claude-3-5-sonnet-20241022',
      [AIProvider.DEEPSEEK]: 'deepseek-chat',
      [AIProvider.GROK]: 'grok-beta',
      [AIProvider.GROQ]: 'llama-3.3-70b-versatile',
      [AIProvider.LOCAL]: 'local-model'
    };
    return defaultModels[provider];
  }

  /**
   * Generate a generic selector from description
   * This is just a hint - AutoHeal will heal it if it doesn't work
   */
  private generateGenericSelector(description: string): string {
    const lowerDesc = description.toLowerCase();

    // Try to infer element type
    if (lowerDesc.includes('button')) {
      return 'button';
    } else if (lowerDesc.includes('input') || lowerDesc.includes('field')) {
      return 'input';
    } else if (lowerDesc.includes('link')) {
      return 'a';
    } else if (lowerDesc.includes('dropdown') || lowerDesc.includes('select')) {
      return 'select';
    } else if (lowerDesc.includes('checkbox')) {
      return 'input[type="checkbox"]';
    } else if (lowerDesc.includes('radio')) {
      return 'input[type="radio"]';
    }

    // Default: any element
    return '*';
  }
}
