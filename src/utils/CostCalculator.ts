import { AIProvider } from '../core/VibeConfiguration';

/**
 * Token usage from AI response
 */
export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

/**
 * Provider pricing configuration (per 1M tokens)
 */
interface ProviderPricing {
  inputPer1M: number;
  outputPer1M: number;
}

/**
 * Real-time cost calculator based on actual token usage
 * Pricing as of January 2025
 */
export class CostCalculator {
  private static readonly PRICING: Record<string, ProviderPricing> = {
    // OpenAI pricing
    'gpt-4o': {
      inputPer1M: 2.50,
      outputPer1M: 10.00
    },
    'gpt-4o-mini': {
      inputPer1M: 0.15,
      outputPer1M: 0.60
    },
    'gpt-4-turbo': {
      inputPer1M: 10.00,
      outputPer1M: 30.00
    },
    'gpt-3.5-turbo': {
      inputPer1M: 0.50,
      outputPer1M: 1.50
    },

    // Groq pricing (FREE!)
    'llama-3.3-70b-versatile': {
      inputPer1M: 0.00,
      outputPer1M: 0.00
    },
    'llama-3.1-70b-versatile': {
      inputPer1M: 0.00,
      outputPer1M: 0.00
    },
    'mixtral-8x7b-32768': {
      inputPer1M: 0.00,
      outputPer1M: 0.00
    },

    // Gemini pricing
    'gemini-2.0-flash-exp': {
      inputPer1M: 0.00,  // Free tier
      outputPer1M: 0.00
    },
    'gemini-1.5-pro': {
      inputPer1M: 1.25,
      outputPer1M: 5.00
    },
    'gemini-1.5-flash': {
      inputPer1M: 0.075,
      outputPer1M: 0.30
    },

    // DeepSeek pricing
    'deepseek-chat': {
      inputPer1M: 0.14,
      outputPer1M: 0.28
    },
    'deepseek-coder': {
      inputPer1M: 0.14,
      outputPer1M: 0.28
    },

    // Anthropic pricing
    'claude-3-5-sonnet-20241022': {
      inputPer1M: 3.00,
      outputPer1M: 15.00
    },
    'claude-3-opus': {
      inputPer1M: 15.00,
      outputPer1M: 75.00
    },
    'claude-3-haiku': {
      inputPer1M: 0.25,
      outputPer1M: 1.25
    },

    // LOCAL models (FREE!)
    'LOCAL': {
      inputPer1M: 0.00,
      outputPer1M: 0.00
    }
  };

  /**
   * Calculate actual cost based on token usage
   */
  static calculateCost(
    provider: AIProvider | string,
    model: string,
    tokenUsage: TokenUsage
  ): number {
    // LOCAL models are always free
    if (provider === AIProvider.LOCAL || provider === 'LOCAL') {
      return 0;
    }

    // Get pricing for this model
    const pricing = this.PRICING[model.toLowerCase()];

    if (!pricing) {
      console.warn(`[COST] Unknown model "${model}", using default estimate`);
      return this.getDefaultEstimate(tokenUsage);
    }

    // Groq is free
    if (pricing.inputPer1M === 0 && pricing.outputPer1M === 0) {
      return 0;
    }

    // Calculate actual cost
    const inputCost = (tokenUsage.promptTokens / 1_000_000) * pricing.inputPer1M;
    const outputCost = (tokenUsage.completionTokens / 1_000_000) * pricing.outputPer1M;

    return inputCost + outputCost;
  }

  /**
   * Fallback estimate when model is unknown
   */
  private static getDefaultEstimate(tokenUsage: TokenUsage): number {
    // Conservative estimate using GPT-4o-mini pricing
    const inputCost = (tokenUsage.promptTokens / 1_000_000) * 0.15;
    const outputCost = (tokenUsage.completionTokens / 1_000_000) * 0.60;
    return inputCost + outputCost;
  }

  /**
   * Get pricing info for a model
   */
  static getPricing(model: string): ProviderPricing | undefined {
    return this.PRICING[model.toLowerCase()];
  }

  /**
   * Check if a model is free
   */
  static isFree(provider: AIProvider | string, model: string): boolean {
    if (provider === AIProvider.LOCAL || provider === 'LOCAL') {
      return true;
    }

    const pricing = this.PRICING[model.toLowerCase()];
    return pricing ? (pricing.inputPer1M === 0 && pricing.outputPer1M === 0) : false;
  }

  /**
   * Format cost for display
   */
  static formatCost(cost: number): string {
    if (cost === 0) {
      return '$0.000000 (FREE!)';
    }
    return `$${cost.toFixed(6)}`;
  }
}
