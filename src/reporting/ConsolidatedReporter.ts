import * as fs from 'fs';
import * as path from 'path';

/**
 * JSON Export Format (from JSONExporter)
 */
interface SessionExport {
  exportedAt: string;
  exportFormat: string;
  session: {
    id: string;
    startTime: string;
    endTime: string;
    durationMs: number;
    durationFormatted: string;
    config: {
      mode: string;
      aiProvider: string;
      cacheEnabled: boolean;
    };
  };
  summary: {
    tests: {
      total: number;
      passed: number;
      failed: number;
      skipped: number;
      passRate: string;
    };
    actions: {
      total: number;
      successful: number;
      failed: number;
      successRate: string;
    };
    performance: {
      totalLatencyMs: number;
      averageLatencyMs: number;
      fastestAction?: {
        command: string;
        latencyMs: number;
      };
      slowestAction?: {
        command: string;
        latencyMs: number;
      };
    };
    cache: {
      hits: number;
      misses: number;
      healings: number;
      hitRate: string;
    };
    ai: {
      parseCalls: number;
      healingCalls: number;
      totalCalls: number;
      estimatedCost: string;
    };
  };
  tests: any[];
  lockStats?: {
    acquisitions: number;
    timeouts: number;
    totalWaitTime: number;
    averageWaitTime: number;
    timeoutRate: number;
    status: 'healthy' | 'caution' | 'warning';
  };
}

/**
 * ConsolidatedReporter - Merges multiple parallel session reports into a single comprehensive view
 *
 * Features:
 * - Aggregates metrics from all parallel workers
 * - Shows individual session summaries
 * - Provides links to detailed session reports
 * - Calculates overall statistics
 */
export class ConsolidatedReporter {
  private outputDir: string;

  constructor(outputDir: string = './vibe-reports') {
    this.outputDir = outputDir;
  }

  /**
   * Generate consolidated report from all session JSON files
   */
  async generateConsolidatedReport(): Promise<string> {
    // Find all session JSON files
    const sessionFiles = this.findSessionFiles();

    if (sessionFiles.length === 0) {
      throw new Error('No session files found to consolidate');
    }

    // Load all session summaries
    const sessions = sessionFiles.map(file => this.loadSessionExport(file));

    // Generate consolidated HTML
    const html = this.generateHTML(sessions);

    // Write consolidated report
    const outputPath = path.join(this.outputDir, 'consolidated-report.html');
    fs.writeFileSync(outputPath, html, 'utf-8');

    console.log(`\n✅ Consolidated report generated: ${outputPath}`);
    console.log(`   Combined ${sessions.length} session(s) into single report\n`);

    return outputPath;
  }

  /**
   * Find all session JSON files in output directory
   */
  private findSessionFiles(): string[] {
    if (!fs.existsSync(this.outputDir)) {
      return [];
    }

    return fs.readdirSync(this.outputDir)
      .filter(file => file.startsWith('session-') && file.endsWith('.json'))
      .map(file => path.join(this.outputDir, file))
      .sort(); // Sort for consistent ordering
  }

  /**
   * Load session export from JSON file
   */
  private loadSessionExport(filePath: string): SessionExport {
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  }

  /**
   * Calculate aggregated metrics across all sessions
   */
  private calculateAggregatedMetrics(sessions: SessionExport[]) {
    const totalTests = sessions.reduce((sum, s) => sum + s.summary.tests.total, 0);
    const passedTests = sessions.reduce((sum, s) => sum + s.summary.tests.passed, 0);
    const failedTests = sessions.reduce((sum, s) => sum + s.summary.tests.failed, 0);
    const skippedTests = sessions.reduce((sum, s) => sum + s.summary.tests.skipped, 0);

    const totalActions = sessions.reduce((sum, s) => sum + s.summary.actions.total, 0);
    const successfulActions = sessions.reduce((sum, s) => sum + s.summary.actions.successful, 0);
    const failedActions = sessions.reduce((sum, s) => sum + s.summary.actions.failed, 0);

    const totalDuration = sessions.reduce((sum, s) => sum + s.session.durationMs, 0);
    const avgDuration = totalDuration / sessions.length;

    const totalCacheHits = sessions.reduce((sum, s) => sum + (s.summary.cache?.hits || 0), 0);
    const totalCacheMisses = sessions.reduce((sum, s) => sum + (s.summary.cache?.misses || 0), 0);
    const totalCacheOps = totalCacheHits + totalCacheMisses;

    const totalAICalls = sessions.reduce((sum, s) => sum + (s.summary.ai?.totalCalls || 0), 0);
    const totalCost = sessions.reduce((sum, s) => {
      const cost = s.summary.ai?.estimatedCost || '$0.000000';
      return sum + parseFloat(cost.replace('$', ''));
    }, 0);

    // Lock statistics (if available)
    const totalLockAcquisitions = sessions.reduce((sum, s) => sum + (s.lockStats?.acquisitions || 0), 0);
    const totalLockTimeouts = sessions.reduce((sum, s) => sum + (s.lockStats?.timeouts || 0), 0);
    const avgLockWaitTime = sessions.reduce((sum, s) => sum + (s.lockStats?.averageWaitTime || 0), 0) / sessions.length;

    return {
      tests: {
        total: totalTests,
        passed: passedTests,
        failed: failedTests,
        skipped: skippedTests,
        passRate: totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(2) : '0.00'
      },
      actions: {
        total: totalActions,
        successful: successfulActions,
        failed: failedActions,
        successRate: totalActions > 0 ? ((successfulActions / totalActions) * 100).toFixed(2) : '0.00'
      },
      performance: {
        totalDuration,
        avgDuration: Math.round(avgDuration),
        workers: sessions.length
      },
      cache: {
        hits: totalCacheHits,
        misses: totalCacheMisses,
        total: totalCacheOps,
        hitRate: totalCacheOps > 0 ? ((totalCacheHits / totalCacheOps) * 100).toFixed(2) : '0.00'
      },
      ai: {
        totalCalls: totalAICalls,
        estimatedCost: `$${totalCost.toFixed(6)}`
      },
      locks: totalLockAcquisitions > 0 ? {
        acquisitions: totalLockAcquisitions,
        timeouts: totalLockTimeouts,
        avgWaitTime: avgLockWaitTime.toFixed(1),
        timeoutRate: totalLockAcquisitions > 0 ? ((totalLockTimeouts / totalLockAcquisitions) * 100).toFixed(2) : '0.00'
      } : null
    };
  }

  /**
   * Generate consolidated HTML report
   */
  private generateHTML(sessions: SessionExport[]): string {
    const aggregated = this.calculateAggregatedMetrics(sessions);
    const earliestStart = new Date(Math.min(...sessions.map(s => new Date(s.session.startTime).getTime())));
    const latestEnd = new Date(Math.max(...sessions.map(s => new Date(s.session.endTime).getTime())));

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Vibe Framework - Consolidated Test Report</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 20px;
      line-height: 1.6;
    }
    .container {
      max-width: 1400px;
      margin: 0 auto;
      background: white;
      border-radius: 12px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 40px;
      text-align: center;
    }
    .header h1 {
      font-size: 2.5em;
      margin-bottom: 10px;
      font-weight: 700;
    }
    .header p {
      font-size: 1.1em;
      opacity: 0.9;
    }
    .content {
      padding: 40px;
    }
    .section {
      margin-bottom: 40px;
    }
    .section h2 {
      font-size: 1.8em;
      margin-bottom: 20px;
      color: #333;
      border-bottom: 3px solid #667eea;
      padding-bottom: 10px;
    }
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }
    .metric-card {
      background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
      padding: 20px;
      border-radius: 8px;
      border-left: 4px solid #667eea;
    }
    .metric-card h3 {
      font-size: 0.9em;
      color: #666;
      margin-bottom: 10px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .metric-card .value {
      font-size: 2.5em;
      font-weight: 700;
      color: #333;
    }
    .metric-card .subtitle {
      font-size: 0.9em;
      color: #888;
      margin-top: 5px;
    }
    .pass { color: #22c55e; }
    .fail { color: #ef4444; }
    .skip { color: #f59e0b; }
    .sessions-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
      background: white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      border-radius: 8px;
      overflow: hidden;
    }
    .sessions-table th {
      background: #667eea;
      color: white;
      padding: 15px;
      text-align: left;
      font-weight: 600;
    }
    .sessions-table td {
      padding: 15px;
      border-bottom: 1px solid #e5e7eb;
    }
    .sessions-table tr:hover {
      background: #f9fafb;
    }
    .sessions-table a {
      color: #667eea;
      text-decoration: none;
      font-weight: 500;
    }
    .sessions-table a:hover {
      text-decoration: underline;
    }
    .badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 0.85em;
      font-weight: 600;
    }
    .badge-success { background: #dcfce7; color: #16a34a; }
    .badge-warning { background: #fef3c7; color: #d97706; }
    .badge-error { background: #fee2e2; color: #dc2626; }
    .info-box {
      background: #f0f9ff;
      border-left: 4px solid #3b82f6;
      padding: 15px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .info-box strong {
      color: #1e40af;
    }
    .footer {
      background: #f9fafb;
      padding: 20px;
      text-align: center;
      color: #666;
      border-top: 1px solid #e5e7eb;
    }
    /* Video Banner */
    .video-banner {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin: 20px 40px;
      padding: 15px 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 8px;
      gap: 15px;
      flex-wrap: wrap;
    }
    .video-banner-content {
      display: flex;
      align-items: center;
      gap: 15px;
      flex: 1;
    }
    .video-banner-icon {
      font-size: 32px;
      line-height: 1;
    }
    .video-banner-text {
      display: flex;
      flex-direction: column;
      gap: 3px;
    }
    .video-banner-title {
      font-size: 16px;
      font-weight: 600;
      color: white;
    }
    .video-banner-description {
      font-size: 13px;
      color: rgba(255, 255, 255, 0.9);
    }
    .btn-playwright-report {
      padding: 10px 20px;
      background: white;
      color: #667eea;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 600;
      text-decoration: none;
      transition: all 0.2s;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      white-space: nowrap;
    }
    .btn-playwright-report:hover {
      background: #f0f0f0;
      transform: translateY(-1px);
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
    }
    @media (max-width: 768px) {
      .video-banner {
        flex-direction: column;
        align-items: stretch;
      }
      .btn-playwright-report {
        width: 100%;
        text-align: center;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎯 Vibe Framework - Consolidated Test Report</h1>
      <p>Parallel Execution Summary - ${sessions.length} Worker${sessions.length > 1 ? 's' : ''}</p>
      <p style="margin-top: 10px; font-size: 0.9em;">
        ${earliestStart.toLocaleString()} - ${latestEnd.toLocaleString()}
      </p>
    </div>

    <div class="video-banner">
      <div class="video-banner-content">
        <div class="video-banner-icon">🎬</div>
        <div class="video-banner-text">
          <div class="video-banner-title">Watch Test Videos</div>
          <div class="video-banner-description">Videos are available in the Playwright report</div>
        </div>
      </div>
      <a href="../playwright-report/index.html" target="_blank" class="btn-playwright-report">
        Open Playwright Report
      </a>
    </div>

    <div class="content">
      <!-- Overall Summary -->
      <div class="section">
        <h2>📊 Overall Summary</h2>
        <div class="metrics-grid">
          <div class="metric-card">
            <h3>Total Tests</h3>
            <div class="value">${aggregated.tests.total}</div>
            <div class="subtitle">
              <span class="pass">${aggregated.tests.passed} passed</span> •
              <span class="fail">${aggregated.tests.failed} failed</span>
              ${aggregated.tests.skipped > 0 ? ` • <span class="skip">${aggregated.tests.skipped} skipped</span>` : ''}
            </div>
          </div>

          <div class="metric-card">
            <h3>Pass Rate</h3>
            <div class="value ${parseFloat(aggregated.tests.passRate) >= 90 ? 'pass' : parseFloat(aggregated.tests.passRate) >= 70 ? 'skip' : 'fail'}">
              ${aggregated.tests.passRate}%
            </div>
            <div class="subtitle">Across all workers</div>
          </div>

          <div class="metric-card">
            <h3>Total Actions</h3>
            <div class="value">${aggregated.actions.total}</div>
            <div class="subtitle">
              <span class="pass">${aggregated.actions.successful} successful</span> •
              <span class="fail">${aggregated.actions.failed} failed</span>
            </div>
          </div>

          <div class="metric-card">
            <h3>Parallel Workers</h3>
            <div class="value">${aggregated.performance.workers}</div>
            <div class="subtitle">Running simultaneously</div>
          </div>

          <div class="metric-card">
            <h3>Cache Performance</h3>
            <div class="value">${aggregated.cache.hitRate}%</div>
            <div class="subtitle">
              ${aggregated.cache.hits} hits • ${aggregated.cache.misses} misses
            </div>
          </div>

          <div class="metric-card">
            <h3>AI Calls</h3>
            <div class="value">${aggregated.ai.totalCalls}</div>
            <div class="subtitle">Cost: ${aggregated.ai.estimatedCost}</div>
          </div>

          ${aggregated.locks ? `
          <div class="metric-card">
            <h3>Lock Performance</h3>
            <div class="value">${aggregated.locks.timeoutRate}%</div>
            <div class="subtitle">
              ${aggregated.locks.acquisitions} acquisitions • ${aggregated.locks.timeouts} timeouts
            </div>
          </div>

          <div class="metric-card">
            <h3>Avg Lock Wait</h3>
            <div class="value">${aggregated.locks.avgWaitTime}<span style="font-size: 0.5em;">ms</span></div>
            <div class="subtitle">Average wait time</div>
          </div>
          ` : ''}
        </div>

        ${aggregated.performance.workers > 1 ? `
        <div class="info-box">
          <strong>ℹ️ Parallel Execution:</strong> Tests ran across ${aggregated.performance.workers} workers simultaneously.
          Individual worker times: ${sessions.map(s => s.session.durationFormatted).join(', ')}.
          Average duration per worker: ${(aggregated.performance.avgDuration / 1000).toFixed(2)}s.
        </div>
        ` : ''}
      </div>

      <!-- Individual Sessions -->
      <div class="section">
        <h2>🔍 Individual Worker Sessions</h2>
        <table class="sessions-table">
          <thead>
            <tr>
              <th>Worker #</th>
              <th>Session ID</th>
              <th>Tests</th>
              <th>Actions</th>
              <th>Duration</th>
              <th>Cache Hit Rate</th>
              <th>Status</th>
              <th>Reports</th>
            </tr>
          </thead>
          <tbody>
            ${sessions.map((session, index) => `
            <tr>
              <td><strong>Worker ${index + 1}</strong></td>
              <td><code style="font-size: 0.85em; color: #666;">${session.session.id.substring(0, 8)}...</code></td>
              <td>
                <span class="pass">${session.summary.tests.passed}</span> / ${session.summary.tests.total}
                ${session.summary.tests.failed > 0 ? `<span class="fail"> (${session.summary.tests.failed} failed)</span>` : ''}
              </td>
              <td>
                <span class="pass">${session.summary.actions.successful}</span> / ${session.summary.actions.total}
              </td>
              <td>${session.session.durationFormatted}</td>
              <td>${session.summary.cache?.hitRate || '0.00%'}</td>
              <td>
                ${session.summary.tests.failed > 0
                  ? '<span class="badge badge-error">FAILED</span>'
                  : '<span class="badge badge-success">PASSED</span>'}
              </td>
              <td>
                <a href="report-${session.session.id}.html" target="_blank">HTML</a> •
                <a href="session-${session.session.id}.json" target="_blank">JSON</a> •
                <a href="actions-${session.session.id}.csv" target="_blank">CSV</a>
              </td>
            </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <!-- Performance Breakdown -->
      <div class="section">
        <h2>⚡ Performance Breakdown</h2>
        <div class="metrics-grid">
          ${sessions.map((session, index) => `
          <div class="metric-card">
            <h3>Worker ${index + 1}</h3>
            <div class="value" style="font-size: 1.5em;">${session.session.durationFormatted}</div>
            <div class="subtitle">
              ${session.summary.tests.total} tests •
              ${session.summary.actions.total} actions<br>
              Avg latency: ${session.summary.performance?.averageLatencyMs || 0}ms
            </div>
          </div>
          `).join('')}
        </div>
      </div>
    </div>

    <div class="footer">
      <p><strong>Generated by Vibe Framework</strong> - AI-Powered Natural Language Testing</p>
      <p style="margin-top: 5px; font-size: 0.9em;">
        Report generated: ${new Date().toLocaleString()}
      </p>
    </div>
  </div>
</body>
</html>`;
  }
}

/**
 * Standalone function to generate consolidated report
 */
export async function generateConsolidatedReport(outputDir: string = './vibe-reports'): Promise<string> {
  const reporter = new ConsolidatedReporter(outputDir);
  return reporter.generateConsolidatedReport();
}
