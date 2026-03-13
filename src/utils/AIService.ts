import { ActionType } from '../models/ActionType';

/**
 * Request for parsing a natural language command
 */
export interface ParseRequest {
  command: string;
}

/**
 * Token usage from AI response
 */
export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

/**
 * Response from AI parsing
 */
export interface ParseResponse {
  action: ActionType;
  element?: string;
  parameters?: {
    text?: string;
    value?: string;
    timeout?: number;
    [key: string]: any;
  };
  confidence: number;
  reasoning?: string;
  tokenUsage?: TokenUsage;  // NEW: Actual token usage from AI
}

/**
 * Interface for AI service providers
 */
export interface AIService {
  /**
   * Parse a natural language command into structured format
   */
  parseCommand(request: ParseRequest): Promise<ParseResponse>;
}
