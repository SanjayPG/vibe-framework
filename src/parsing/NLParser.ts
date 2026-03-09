import { VibeCommand } from '../models/VibeCommand';
import { AIService } from '../utils/AIService';
import { GeminiAIService } from '../utils/GeminiAIService';
import { OpenAIService } from '../utils/OpenAIService';
import { AnthropicService } from '../utils/AnthropicService';
import { DeepSeekService } from '../utils/DeepSeekService';
import { GroqService } from '../utils/GroqService';
import { LocalModelService } from '../utils/LocalModelService';
import { AIProvider } from '../core/VibeConfiguration';

/**
 * Configuration for NL Parser
 */
export interface NLParserConfig {
  aiProvider: AIProvider;
  aiApiKey?: string;
  aiModel?: string;
  enableAIParsing: boolean;
  confidenceThreshold: number;
  maxRetries: number;
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
}

/**
 * Natural Language Parser with AI and caching
 */
export class NLParser {
  private aiService?: AIService;
  private config: NLParserConfig;
  private parseCache: Map<string, VibeCommand> = new Map();

  constructor(config: NLParserConfig) {
    this.config = config;

    // Initialize AI service if AI parsing is enabled
    if (config.enableAIParsing) {
      // LOCAL provider doesn't need API key
      if (config.aiProvider === AIProvider.LOCAL || config.aiApiKey) {
        this.aiService = this.createAIService(config.aiProvider, config.aiApiKey, config.aiModel, config.localModelConfig);
      }
    }
  }

  /**
   * Parse a natural language command
   */
  async parse(command: string): Promise<VibeCommand> {
    const startTime = Date.now();

    // Validation
    if (!command || command.trim().length < 3) {
      throw new Error('Command too short. Example: "click login button"');
    }

    if (command.length > 500) {
      console.warn(`Command very long (${command.length} chars), truncating to 500`);
      command = command.substring(0, 500);
    }

    // Check cache first
    const normalized = this.normalizeCommand(command);
    if (this.parseCache.has(normalized)) {
      const cached = this.parseCache.get(normalized)!;
      console.log(`Parse cache HIT for: "${command}"`);
      return {
        ...cached,
        originalCommand: command,
        metadata: {
          ...cached.metadata,
          cacheHit: true,
          aiCalled: false
        }
      };
    }

    // AI parsing
    if (this.config.enableAIParsing) {
      if (!this.aiService) {
        throw new Error('AI parsing enabled but no AI service configured. Check API key.');
      }

      const result = await this.parseWithAI(command);

      // Add metadata
      result.metadata = {
        ...result.metadata,
        cacheHit: false,
        aiCalled: true
      };

      // Cache the result
      this.parseCache.set(normalized, result);
      console.log(`Parse cache MISS for: "${command}" - cached for next time`);

      return result;
    } else {
      throw new Error('AI parsing disabled. Enable with withAIParsing(true) or use simple command format.');
    }
  }

  /**
   * Parse using AI with retry logic
   */
  private async parseWithAI(command: string): Promise<VibeCommand> {
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        const response = await this.aiService!.parseCommand({ command });

        // Validate confidence
        if (response.confidence < this.config.confidenceThreshold) {
          throw new Error(
            `Low confidence (${response.confidence}). ` +
            `Command may be unclear. Try being more specific.`
          );
        }

        // Build VibeCommand
        const vibeCommand: VibeCommand = {
          originalCommand: command,
          action: response.action,
          element: response.element,
          parameters: response.parameters,
          confidence: response.confidence,
          metadata: {
            parsedBy: 'ai',
            parsingTime: Date.now(),
            reasoning: response.reasoning
          }
        };

        return vibeCommand;

      } catch (error: any) {
        lastError = error;

        // Check if retryable
        if (this.isRetryableError(error)) {
          const delay = 1000 * attempt;
          console.warn(`AI parsing attempt ${attempt}/${this.config.maxRetries} failed, retrying in ${delay}ms...`);
          await this.sleep(delay);
          continue;
        }

        // Non-retryable error, fail immediately
        throw error;
      }
    }

    // All retries failed
    throw new Error(`AI parsing failed after ${this.config.maxRetries} attempts: ${lastError?.message}`);
  }

  /**
   * Create AI service based on provider
   */
  private createAIService(
    provider: AIProvider,
    apiKey?: string,
    model?: string,
    localModelConfig?: NLParserConfig['localModelConfig']
  ): AIService {
    switch (provider) {
      case AIProvider.GEMINI:
        return new GeminiAIService(apiKey!, model || 'gemini-2.0-flash-exp');

      case AIProvider.OPENAI:
        return new OpenAIService(apiKey!, model || 'gpt-4o-mini');

      case AIProvider.ANTHROPIC:
        return new AnthropicService(apiKey!, model || 'claude-3-5-sonnet-20241022');

      case AIProvider.DEEPSEEK:
        return new DeepSeekService(apiKey!, model || 'deepseek-chat');

      case AIProvider.GROK:
        throw new Error('Grok provider not yet implemented. Use GROQ for similar Llama-based models.');

      case AIProvider.GROQ:
        return new GroqService(apiKey!, model || 'llama-3.3-70b-versatile');

      case AIProvider.LOCAL:
        if (!localModelConfig || !localModelConfig.baseUrl) {
          throw new Error('LOCAL provider requires localModelConfig with baseUrl. Use .withLocalModel()');
        }
        return new LocalModelService({
          baseUrl: localModelConfig.baseUrl,
          apiPath: localModelConfig.apiPath,
          headers: localModelConfig.headers,
          model: model || localModelConfig.model,
          temperature: localModelConfig.temperature,
          maxTokens: localModelConfig.maxTokens,
          timeout: localModelConfig.timeout,
          format: localModelConfig.format
        });

      default:
        throw new Error(`Unknown AI provider: ${provider}`);
    }
  }

  /**
   * Normalize command for cache key
   * Lowercase and trim whitespace
   */
  private normalizeCommand(command: string): string {
    return command.toLowerCase().trim().replace(/\s+/g, ' ');
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: any): boolean {
    const message = error.message?.toLowerCase() || '';
    return (
      message.includes('rate limit') ||
      message.includes('timeout') ||
      message.includes('network') ||
      message.includes('api error') ||
      message.includes('503') ||
      message.includes('429')
    );
  }

  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Clear parse cache
   */
  clearCache(): void {
    this.parseCache.clear();
    console.log('Parse cache cleared');
  }

  /**
   * Get cache stats
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.parseCache.size,
      keys: Array.from(this.parseCache.keys())
    };
  }
}
