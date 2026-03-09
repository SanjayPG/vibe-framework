import { ActionType } from './ActionType';

/**
 * Represents a parsed natural language command
 */
export interface VibeCommand {
  /** Original natural language command */
  originalCommand: string;

  /** Extracted action type */
  action: ActionType;

  /** Element description for finding */
  element?: string;

  /** Additional parameters (e.g., text to type, expected value) */
  parameters?: {
    text?: string;
    value?: string;
    timeout?: number;
    [key: string]: any;
  };

  /** Confidence score from parsing (0-1) */
  confidence: number;

  /** Metadata about parsing */
  metadata?: {
    parsedBy?: 'ai' | 'pattern';
    parsingTime?: number;
    [key: string]: any;
  };
}
