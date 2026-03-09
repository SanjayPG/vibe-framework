import { ActionType } from '../models/ActionType';

/**
 * Request for parsing a natural language command
 */
export interface ParseRequest {
  command: string;
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
