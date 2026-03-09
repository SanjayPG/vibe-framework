import { SessionSummary } from '../models/VibeMetrics';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Exports session data to JSON format
 */
export class JSONExporter {
  /**
   * Export session summary to JSON file
   */
  async export(summary: SessionSummary, outputPath?: string): Promise<string> {
    // Default output path with sessionId for parallel safety
    const filePath = outputPath || path.join(process.cwd(), 'vibe-reports', `session-${summary.sessionId}.json`);

    // Ensure directory exists
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });

    // Prepare data for export (remove screenshots to reduce file size)
    const exportData = this.prepareData(summary);

    // Write JSON file
    await fs.writeFile(filePath, JSON.stringify(exportData, null, 2), 'utf-8');

    return filePath;
  }

  /**
   * Export session summary to JSON string
   */
  exportToString(summary: SessionSummary, pretty: boolean = true): string {
    const exportData = this.prepareData(summary);
    return JSON.stringify(exportData, null, pretty ? 2 : 0);
  }

  /**
   * Prepare data for export (remove screenshots, add metadata)
   */
  private prepareData(summary: SessionSummary): any {
    return {
      exportedAt: new Date().toISOString(),
      exportFormat: 'vibe-json-v1',
      session: {
        id: summary.sessionId,
        startTime: new Date(summary.startTime).toISOString(),
        endTime: new Date(summary.endTime).toISOString(),
        durationMs: summary.duration,
        durationFormatted: this.formatDuration(summary.duration),
        config: summary.config
      },
      summary: {
        tests: {
          total: summary.aggregated.totalTests,
          passed: summary.aggregated.passedTests,
          failed: summary.aggregated.failedTests,
          skipped: summary.aggregated.skippedTests,
          passRate: summary.aggregated.totalTests > 0
            ? ((summary.aggregated.passedTests / summary.aggregated.totalTests) * 100).toFixed(2) + '%'
            : '0%'
        },
        actions: {
          total: summary.aggregated.totalActions,
          successful: summary.aggregated.successfulActions,
          failed: summary.aggregated.failedActions,
          successRate: summary.aggregated.totalActions > 0
            ? ((summary.aggregated.successfulActions / summary.aggregated.totalActions) * 100).toFixed(2) + '%'
            : '0%'
        },
        performance: {
          totalLatencyMs: summary.aggregated.totalLatency,
          averageLatencyMs: Math.round(summary.aggregated.averageLatency),
          fastestAction: summary.performance.fastestAction ? {
            command: summary.performance.fastestAction.command,
            latencyMs: summary.performance.fastestAction.latencyMs
          } : null,
          slowestAction: summary.performance.slowestAction ? {
            command: summary.performance.slowestAction.command,
            latencyMs: summary.performance.slowestAction.latencyMs
          } : null
        },
        cache: {
          hits: summary.aggregated.cacheHits,
          misses: summary.aggregated.cacheMisses,
          healings: summary.aggregated.cacheHealings,
          hitRate: summary.aggregated.cacheHitRate.toFixed(2) + '%'
        },
        ai: {
          parseCalls: summary.aggregated.parseAICalls,
          healingCalls: summary.aggregated.healingAICalls,
          totalCalls: summary.aggregated.totalAICalls,
          estimatedCost: '$' + summary.aggregated.totalEstimatedCost.toFixed(6)
        }
      },
      tests: summary.tests.map(test => ({
        name: test.name,
        status: test.status,
        startTime: new Date(test.startTime).toISOString(),
        durationMs: test.duration,
        durationFormatted: this.formatDuration(test.duration),
        error: test.error,
        metrics: {
          totalActions: test.metrics.totalActions,
          successfulActions: test.metrics.successfulActions,
          failedActions: test.metrics.failedActions,
          averageLatencyMs: Math.round(test.metrics.averageLatency),
          cacheHitRate: test.metrics.cacheHitRate.toFixed(2) + '%',
          aiCallCount: test.metrics.aiCallCount,
          estimatedCost: '$' + test.metrics.totalEstimatedCost.toFixed(6)
        },
        actions: test.actions.map(action => ({
          id: action.id,
          timestamp: new Date(action.timestamp).toISOString(),
          command: action.command,
          actionType: action.actionType,
          element: action.element,
          selector: action.selector,
          success: action.success,
          error: action.error,
          latency: {
            totalMs: action.latencyMs,
            parsing: action.latencyBreakdown.parsing,
            elementFinding: action.latencyBreakdown.elementFinding,
            execution: action.latencyBreakdown.execution
          },
          cache: {
            parseCache: action.cache.parseCache,
            autoHealCache: action.cache.autoHealCache
          },
          ai: {
            parseAICalled: action.ai.parseAICalled,
            healingAICalled: action.ai.healingAICalled,
            model: action.ai.model,
            estimatedCost: action.ai.estimatedCost
          },
          // Note: Screenshots excluded to reduce file size
          hasScreenshot: !!action.screenshot
        }))
      }))
    };
  }

  /**
   * Format duration in human-readable format
   */
  private formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
    const minutes = Math.floor(ms / 60000);
    const seconds = ((ms % 60000) / 1000).toFixed(0);
    return `${minutes}m ${seconds}s`;
  }
}
