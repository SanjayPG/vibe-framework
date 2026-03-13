import { AIService, ParseRequest, ParseResponse } from './AIService';
import { ActionType, isValidActionType } from '../models/ActionType';

/**
 * Anthropic (Claude) service for parsing natural language commands
 * Supports Claude 3.5 Sonnet, Claude 3 Opus, Claude 3 Haiku
 */
export class AnthropicService implements AIService {
  private apiKey: string;
  private model: string;
  private baseUrl = 'https://api.anthropic.com/v1/messages';

  constructor(apiKey: string, model: string = 'claude-3-5-sonnet-20241022') {
    this.apiKey = apiKey;
    this.model = model;
  }

  async parseCommand(request: ParseRequest): Promise<ParseResponse> {
    const prompt = this.buildPrompt(request.command);

    try {
      const { content, usage } = await this.callAnthropicAPI(prompt);
      return this.parseResponse(content, request.command, usage);
    } catch (error: any) {
      throw new Error(`Anthropic parsing failed: ${error.message}`);
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

  private async callAnthropicAPI(prompt: string): Promise<{ content: string; usage: any }> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 200,
        temperature: 0.1, // Low temperature for consistent parsing
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      })
    });

    if (!response.ok) {
      const errorData: any = await response.json().catch(() => ({}));
      const errorMessage = errorData.error?.message || response.statusText;
      throw new Error(`Anthropic API error (${response.status}): ${errorMessage}`);
    }

    const data: any = await response.json();

    if (!data.content || data.content.length === 0) {
      throw new Error('No response from Anthropic API');
    }

    const content = data.content[0].text;
    const usage = data.usage; // Extract token usage

    return { content, usage };
  }

  private parseResponse(responseText: string, originalCommand: string, usage?: any): ParseResponse {
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

      // Extract token usage (Anthropic format)
      const tokenUsage = usage ? {
        promptTokens: usage.input_tokens || 0,
        completionTokens: usage.output_tokens || 0,
        totalTokens: (usage.input_tokens || 0) + (usage.output_tokens || 0)
      } : undefined;

      return {
        action: parsed.action as ActionType,
        element: parsed.element,
        parameters: parsed.parameters || {},
        confidence,
        reasoning: parsed.reasoning,
        tokenUsage
      };
    } catch (error: any) {
      throw new Error(`Failed to parse Anthropic response: ${error.message}. Response: ${responseText}`);
    }
  }
}
