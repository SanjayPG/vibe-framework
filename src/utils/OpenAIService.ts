import { AIService, ParseRequest, ParseResponse } from './AIService';
import { ActionType, isValidActionType } from '../models/ActionType';

/**
 * OpenAI service for parsing natural language commands
 * Supports GPT-4, GPT-4o, GPT-3.5-turbo
 */
export class OpenAIService implements AIService {
  private apiKey: string;
  private model: string;
  private baseUrl = 'https://api.openai.com/v1/chat/completions';

  constructor(apiKey: string, model: string = 'gpt-4o-mini') {
    this.apiKey = apiKey;
    this.model = model;
  }

  async parseCommand(request: ParseRequest): Promise<ParseResponse> {
    const prompt = this.buildPrompt(request.command);

    try {
      const response = await this.callOpenAIAPI(prompt);
      return this.parseResponse(response, request.command);
    } catch (error: any) {
      throw new Error(`OpenAI parsing failed: ${error.message}`);
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

  private async callOpenAIAPI(prompt: string): Promise<any> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: this.model,
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
        temperature: 0.1, // Low temperature for consistent parsing
        max_tokens: 200,
        response_format: { type: 'json_object' } // Ensure JSON response
      })
    });

    if (!response.ok) {
      const errorData: any = await response.json().catch(() => ({}));
      const errorMessage = errorData.error?.message || response.statusText;
      throw new Error(`OpenAI API error (${response.status}): ${errorMessage}`);
    }

    const data: any = await response.json();

    if (!data.choices || data.choices.length === 0) {
      throw new Error('No response from OpenAI API');
    }

    const content = data.choices[0].message.content;
    return content;
  }

  private parseResponse(responseText: string, originalCommand: string): ParseResponse {
    try {
      // Remove markdown code blocks if present (shouldn't happen with json_object mode)
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
      throw new Error(`Failed to parse OpenAI response: ${error.message}. Response: ${responseText}`);
    }
  }
}
