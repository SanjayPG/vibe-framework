import { VibeCommand } from './VibeCommand';

/**
 * Result of executing a Vibe command
 */
export interface VibeResult {
  /** Whether the action succeeded */
  success: boolean;

  /** The command that was executed */
  command: VibeCommand;

  /** Execution time in milliseconds */
  executionTime: number;

  /** Error message if failed */
  error?: string;

  /** Stack trace if failed */
  stackTrace?: string;

  /** Extracted value (for EXTRACT action) */
  extractedValue?: string | null;

  /** Verification result (for CHECK/VERIFY actions) */
  verified?: boolean;

  /** Metadata about execution */
  metadata?: {
    cacheHit?: boolean;
    healingPerformed?: boolean;
    selector?: string;
    [key: string]: any;
  };
}
