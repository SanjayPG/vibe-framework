import { AIService, ParseRequest, ParseResponse } from './AIService';
import { ActionType, isValidActionType } from '../models/ActionType';

/**
 * Configuration for local/custom AI model endpoints
 */
export interface LocalModelConfig {
  /** Base URL of the endpoint (e.g., http://localhost:8000 or https://xyz.trycloudflare.com) */
  baseUrl: string;

  /** API path (default: /chat) */
  apiPath?: string;

  /** Custom headers (e.g., API keys, auth tokens) */
  headers?: Record<string, string>;

  /** Model name (optional, for providers that support multiple models) */
  model?: string;

  /** Temperature for generation (default: 0.1) */
  temperature?: number;

  /** Max tokens (default: 200) */
  maxTokens?: number;

  /** Timeout in milliseconds (default: 30000) */
  timeout?: number;

  /** Request format: 'openai' | 'custom' */
  format?: 'openai' | 'custom';
}

/**
 * LocalModelService - Supports local and custom AI model endpoints
 *
 * Features:
 * - Localhost endpoints (http://localhost:8000)
 * - Cloudflare tunnels (https://xyz.trycloudflare.com)
 * - ngrok tunnels (https://xyz.ngrok.io)
 * - Google Colab endpoints
 * - Any custom OpenAI-compatible API
 *
 * Example endpoints:
 * - http://localhost:8000/chat
 * - http://127.0.0.1:5000/v1/chat/completions
 * - https://princess-practices-carey-terms.trycloudflare.com/chat
 * - https://abc123.ngrok.io/api/chat
 */
export class LocalModelService implements AIService {
  private config: Required<LocalModelConfig>;

  constructor(config: LocalModelConfig) {
    // Set defaults
    this.config = {
      baseUrl: config.baseUrl.replace(/\/$/, ''), // Remove trailing slash
      apiPath: config.apiPath || '/chat',
      headers: config.headers || {},
      model: config.model || 'local-model',
      temperature: config.temperature ?? 0.1,
      maxTokens: config.maxTokens || 200,
      timeout: config.timeout || 30000,
      format: config.format || 'openai'
    };

    // Validate URL
    if (!this.config.baseUrl.startsWith('http://') && !this.config.baseUrl.startsWith('https://')) {
      throw new Error(`Invalid baseUrl: Must start with http:// or https://. Got: ${this.config.baseUrl}`);
    }

    console.log(`[LOCAL-MODEL] Initialized endpoint: ${this.getFullUrl()}`);
    console.log(`[LOCAL-MODEL] Format: ${this.config.format}`);
  }

  async parseCommand(request: ParseRequest): Promise<ParseResponse> {
    const prompt = this.buildPrompt(request.command);

    try {
      const response = await this.callLocalAPI(prompt);
      return this.parseResponse(response, request.command);
    } catch (error: any) {
      throw new Error(`Local model parsing failed: ${error.message}`);
    }
  }

  private buildPrompt(command: string): string {
    return `You are a test automation command parser. Parse this natural language test command into structured JSON.

Command: "${command}"

Extract:
1. Action type: One of [CLICK, FILL, SELECT, VERIFY, CHECK, WAIT, HOVER, EXTRACT]
2. Element description: What element to interact with (if applicable)
3. Parameters: Additional data like text to type, values to select, etc.
4. Confidence: How confident you are in this parsing (0.0 to 1.0)

Examples:
- "click the login button" → {"action": "CLICK", "element": "login button", "confidence": 0.95}
- "type john@example.com into email field" → {"action": "FILL", "element": "email field", "parameters": {"text": "john@example.com"}, "confidence": 0.95}
- "verify dashboard is loaded" → {"action": "VERIFY", "element": "dashboard", "parameters": {"expectedState": "loaded"}, "confidence": 0.90}
- "select USA from country dropdown" → {"action": "SELECT", "element": "country dropdown", "parameters": {"value": "USA"}, "confidence": 0.95}

IMPORTANT:
- Return ONLY valid JSON, no markdown code blocks
- Use exact action types listed above
- Be specific with element descriptions
- If command is unclear, set lower confidence

Return JSON format:
{
  "action": "ACTION_TYPE",
  "element": "element description",
  "parameters": {},
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation"
}`;
  }

  private getFullUrl(): string {
    return `${this.config.baseUrl}${this.config.apiPath}`;
  }

  private async callLocalAPI(prompt: string): Promise<any> {
    const url = this.getFullUrl();

    // Build request body based on format
    const body = this.buildRequestBody(prompt);

    // Build headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...this.config.headers
    };

    console.log(`[LOCAL-MODEL] Calling: ${url}`);
    console.log(`[LOCAL-MODEL] Request format: ${this.config.format}`);

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorText = '';
        try {
          errorText = await response.text();
        } catch (e) {
          errorText = response.statusText;
        }
        throw new Error(`Local model API error (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      console.log(`[LOCAL-MODEL] Response received`);

      return this.extractContent(data);
    } catch (error: any) {
      clearTimeout(timeoutId);

      if (error.name === 'AbortError') {
        throw new Error(`Local model API timeout after ${this.config.timeout}ms`);
      }

      throw error;
    }
  }

  private buildRequestBody(prompt: string): any {
    if (this.config.format === 'openai') {
      // OpenAI-compatible format
      return {
        model: this.config.model,
        messages: [
          {
            role: 'system',
            content: 'You are a precise test automation command parser. Always return valid JSON without markdown formatting.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: this.config.temperature,
        max_tokens: this.config.maxTokens,
        response_format: { type: 'json_object' }
      };
    } else {
      // Custom format - simple message field
      return {
        message: prompt,
        temperature: this.config.temperature,
        max_tokens: this.config.maxTokens,
        model: this.config.model
      };
    }
  }

  private extractContent(data: any): string {
    // Check for error response first
    if (data.error) {
      const errorMsg = typeof data.error === 'string' ? data.error : JSON.stringify(data.error);
      const details = data.details ? ` Details: ${data.details}` : '';
      throw new Error(`Server returned error: ${errorMsg}${details}`);
    }

    // Try OpenAI format first
    if (data.choices && data.choices.length > 0) {
      const content = data.choices[0].message?.content || data.choices[0].text;
      if (content) {
        console.log(`[LOCAL-MODEL] Extracted from OpenAI format`);
        return content;
      }
    }

    // Try direct response format
    if (data.response) {
      console.log(`[LOCAL-MODEL] Extracted from response field`);
      return data.response;
    }

    // Try content field
    if (data.content) {
      console.log(`[LOCAL-MODEL] Extracted from content field`);
      return data.content;
    }

    // Try message field
    if (data.message) {
      console.log(`[LOCAL-MODEL] Extracted from message field`);
      return data.message;
    }

    // Try text field
    if (data.text) {
      console.log(`[LOCAL-MODEL] Extracted from text field`);
      return data.text;
    }

    console.error(`[LOCAL-MODEL] Full response:`, JSON.stringify(data, null, 2));
    throw new Error(`Could not extract content from response. Response keys: ${Object.keys(data).join(', ')}`);
  }

  private parseResponse(responseText: string, originalCommand: string): ParseResponse {
    try {
      // Remove markdown code blocks if present
      let cleanedText = responseText.trim();
      if (cleanedText.startsWith('```json')) {
        cleanedText = cleanedText.replace(/```json\n?/, '').replace(/```$/, '').trim();
      } else if (cleanedText.startsWith('```')) {
        cleanedText = cleanedText.replace(/```\n?/, '').replace(/```$/, '').trim();
      }

      const parsed = JSON.parse(cleanedText);

      // Validate action type
      if (!isValidActionType(parsed.action)) {
        throw new Error(`Invalid action type: ${parsed.action}`);
      }

      // Ensure confidence is between 0 and 1
      const confidence = Math.max(0, Math.min(1, parsed.confidence || 0.5));

      return {
        action: parsed.action as ActionType,
        element: parsed.element,
        parameters: parsed.parameters || {},
        confidence,
        reasoning: parsed.reasoning
      };
    } catch (error: any) {
      throw new Error(`Failed to parse local model response: ${error.message}. Response: ${responseText}`);
    }
  }

  /**
   * Test connectivity to the local endpoint
   */
  async testConnection(): Promise<boolean> {
    try {
      const testPrompt = this.buildPrompt('click test button');
      await this.callLocalAPI(testPrompt);
      console.log(`[LOCAL-MODEL] ✅ Connection test successful`);
      return true;
    } catch (error: any) {
      console.error(`[LOCAL-MODEL] ❌ Connection test failed: ${error.message}`);
      return false;
    }
  }
}

/**
 * Factory function to create LocalModelService with common presets
 */
export function createLocalModel(preset: 'localhost' | 'cloudflare' | 'ngrok' | 'colab' | 'custom', options: Partial<LocalModelConfig> = {}): LocalModelService {
  const presets: Record<string, Partial<LocalModelConfig>> = {
    localhost: {
      baseUrl: 'http://localhost:8000',
      apiPath: '/chat',
      format: 'openai'
    },
    cloudflare: {
      // User provides baseUrl via options
      apiPath: '/chat',
      format: 'openai',
      timeout: 60000 // Cloudflare tunnels can be slower
    },
    ngrok: {
      // User provides baseUrl via options
      apiPath: '/chat',
      format: 'openai',
      timeout: 45000
    },
    colab: {
      // User provides baseUrl via options (Colab with cloudflare)
      apiPath: '/chat',
      format: 'openai',
      timeout: 60000
    },
    custom: {
      // User provides all via options
    }
  };

  const config = {
    ...presets[preset],
    ...options
  };

  if (!config.baseUrl) {
    throw new Error(`baseUrl is required for preset '${preset}'`);
  }

  return new LocalModelService(config as LocalModelConfig);
}
