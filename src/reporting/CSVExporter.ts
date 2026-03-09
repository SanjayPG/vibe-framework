import { SessionSummary } from '../models/VibeMetrics';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Exports session data to CSV format
 */
export class CSVExporter {
  /**
   * Export session summary to CSV file
   */
  async export(summary: SessionSummary, outputPath?: string): Promise<string> {
    // Default output path with sessionId for parallel safety
    const filePath = outputPath || path.join(process.cwd(), 'vibe-reports', `actions-${summary.sessionId}.csv`);

    // Ensure directory exists
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });

    // Generate CSV content
    const csv = this.generateCSV(summary);

    // Write CSV file
    await fs.writeFile(filePath, csv, 'utf-8');

    return filePath;
  }

  /**
   * Export session summary to CSV string
   */
  exportToString(summary: SessionSummary): string {
    return this.generateCSV(summary);
  }

  /**
   * Generate CSV content
   */
  private generateCSV(summary: SessionSummary): string {
    const rows: string[] = [];

    // Header row
    rows.push(this.generateHeader());

    // Data rows (one per action)
    for (const test of summary.tests) {
      for (const action of test.actions) {
        rows.push(this.generateRow(summary, test, action));
      }
    }

    return rows.join('\n');
  }

  /**
   * Generate CSV header
   */
  private generateHeader(): string {
    return [
      // Session info
      'Session ID',
      'Session Start',
      'Session Mode',
      'AI Provider',

      // Test info
      'Test Name',
      'Test Status',
      'Test Duration (ms)',

      // Action info
      'Action ID',
      'Action Timestamp',
      'Command',
      'Action Type',
      'Element',
      'Selector',
      'Success',
      'Error',

      // Latency
      'Total Latency (ms)',
      'Parsing Latency (ms)',
      'Element Finding Latency (ms)',
      'Execution Latency (ms)',

      // Cache
      'Parse Cache',
      'AutoHeal Cache',

      // AI
      'Parse AI Called',
      'Healing AI Called',
      'AI Model',
      'Estimated Cost ($)',

      // Screenshot
      'Has Screenshot'
    ].join(',');
  }

  /**
   * Generate CSV row for an action
   */
  private generateRow(summary: SessionSummary, test: any, action: any): string {
    return [
      // Session info
      this.escape(summary.sessionId),
      this.escape(new Date(summary.startTime).toISOString()),
      this.escape(summary.config.mode || 'smart-cache'),
      this.escape(summary.config.aiProvider || 'GEMINI'),

      // Test info
      this.escape(test.name),
      this.escape(test.status),
      test.duration,

      // Action info
      this.escape(action.id),
      this.escape(new Date(action.timestamp).toISOString()),
      this.escape(action.command),
      this.escape(action.actionType || ''),
      this.escape(action.element || ''),
      this.escape(action.selector || ''),
      action.success ? 'true' : 'false',
      this.escape(action.error || ''),

      // Latency
      action.latencyMs,
      action.latencyBreakdown.parsing,
      action.latencyBreakdown.elementFinding,
      action.latencyBreakdown.execution,

      // Cache
      this.escape(action.cache.parseCache),
      this.escape(action.cache.autoHealCache),

      // AI
      action.ai.parseAICalled ? 'true' : 'false',
      action.ai.healingAICalled ? 'true' : 'false',
      this.escape(action.ai.model || ''),
      action.ai.estimatedCost.toFixed(8),

      // Screenshot
      action.screenshot ? 'true' : 'false'
    ].join(',');
  }

  /**
   * Escape CSV value (handle commas, quotes, newlines)
   */
  private escape(value: string | number): string {
    if (typeof value === 'number') return value.toString();
    if (!value) return '';

    // If value contains comma, quote, or newline, wrap in quotes and escape quotes
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }

    return value;
  }

  /**
   * Export summary statistics to separate CSV
   */
  async exportSummary(summary: SessionSummary, outputPath?: string): Promise<string> {
    const filePath = outputPath || path.join(process.cwd(), 'vibe-reports', `summary-${summary.sessionId}.csv`);

    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });

    const rows: string[] = [];

    // Session summary
    rows.push('Metric,Value');
    rows.push(`Session ID,${this.escape(summary.sessionId)}`);
    rows.push(`Start Time,${this.escape(new Date(summary.startTime).toISOString())}`);
    rows.push(`Duration (ms),${summary.duration}`);
    rows.push(`Mode,${this.escape(summary.config.mode || 'smart-cache')}`);
    rows.push(`AI Provider,${this.escape(summary.config.aiProvider || 'GEMINI')}`);
    rows.push('');

    // Test summary
    rows.push('Test Summary,');
    rows.push(`Total Tests,${summary.aggregated.totalTests}`);
    rows.push(`Passed Tests,${summary.aggregated.passedTests}`);
    rows.push(`Failed Tests,${summary.aggregated.failedTests}`);
    rows.push(`Skipped Tests,${summary.aggregated.skippedTests}`);
    rows.push(`Pass Rate (%),${summary.aggregated.totalTests > 0 ? ((summary.aggregated.passedTests / summary.aggregated.totalTests) * 100).toFixed(2) : '0'}`);
    rows.push('');

    // Action summary
    rows.push('Action Summary,');
    rows.push(`Total Actions,${summary.aggregated.totalActions}`);
    rows.push(`Successful Actions,${summary.aggregated.successfulActions}`);
    rows.push(`Failed Actions,${summary.aggregated.failedActions}`);
    rows.push(`Success Rate (%),${summary.aggregated.totalActions > 0 ? ((summary.aggregated.successfulActions / summary.aggregated.totalActions) * 100).toFixed(2) : '0'}`);
    rows.push('');

    // Performance
    rows.push('Performance,');
    rows.push(`Total Latency (ms),${summary.aggregated.totalLatency}`);
    rows.push(`Average Latency (ms),${Math.round(summary.aggregated.averageLatency)}`);
    if (summary.performance.fastestAction) {
      rows.push(`Fastest Action,${this.escape(summary.performance.fastestAction.command)}`);
      rows.push(`Fastest Latency (ms),${summary.performance.fastestAction.latencyMs}`);
    }
    if (summary.performance.slowestAction) {
      rows.push(`Slowest Action,${this.escape(summary.performance.slowestAction.command)}`);
      rows.push(`Slowest Latency (ms),${summary.performance.slowestAction.latencyMs}`);
    }
    rows.push('');

    // Cache
    rows.push('Cache Performance,');
    rows.push(`Cache Hits,${summary.aggregated.cacheHits}`);
    rows.push(`Cache Misses,${summary.aggregated.cacheMisses}`);
    rows.push(`Cache Healings,${summary.aggregated.cacheHealings}`);
    rows.push(`Hit Rate (%),${summary.aggregated.cacheHitRate.toFixed(2)}`);
    rows.push('');

    // AI Usage
    rows.push('AI Usage,');
    rows.push(`Parse Calls,${summary.aggregated.parseAICalls}`);
    rows.push(`Healing Calls,${summary.aggregated.healingAICalls}`);
    rows.push(`Total AI Calls,${summary.aggregated.totalAICalls}`);
    rows.push(`Estimated Cost ($),${summary.aggregated.totalEstimatedCost.toFixed(6)}`);

    await fs.writeFile(filePath, rows.join('\n'), 'utf-8');

    return filePath;
  }
}
