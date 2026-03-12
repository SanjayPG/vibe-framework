import { SessionSummary } from '../models/VibeMetrics';
import * as fs from 'fs';
import * as path from 'path';
import { globalLockManager } from '../utils/FileLockManager';

/**
 * HTML Reporter - Generates beautiful Playwright-style HTML reports
 */
export class HTMLReporter {
  private outputDir: string;

  constructor(outputDir: string = './vibe-reports') {
    this.outputDir = outputDir;
  }

  /**
   * Generate HTML report from session summary
   */
  async generateReport(summary: SessionSummary): Promise<string> {
    // Ensure output directory exists
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }

    // Convert absolute video paths to relative paths
    this.normalizeVideoPaths(summary);

    // Generate HTML content
    const html = this.generateHTML(summary);

    // Write to file with sessionId for parallel safety
    const sessionReportPath = path.join(this.outputDir, `report-${summary.sessionId}.html`);
    fs.writeFileSync(sessionReportPath, html, 'utf-8');

    // Also create/update index.html as the latest report for convenience
    // Use file locking to prevent race conditions in parallel execution
    const indexPath = path.join(this.outputDir, 'index.html');
    try {
      await globalLockManager.writeWithLock(indexPath, html, { timeout: 5000, retries: 3 });
    } catch (error) {
      // If lock fails, it's not critical - session report is safe
      console.warn(`[REPORT] Failed to update index.html (race condition prevented): ${(error as Error).message}`);
    }

    return sessionReportPath;
  }

  /**
   * Convert absolute video paths to relative paths for HTML
   */
  private normalizeVideoPaths(summary: SessionSummary): void {
    summary.tests.forEach(test => {
      test.actions.forEach(action => {
        if (action.video) {
          // Convert absolute path to relative path from report directory
          const absolutePath = path.resolve(action.video);
          const reportDir = path.resolve(this.outputDir);
          const relativePath = path.relative(reportDir, absolutePath);
          // Convert backslashes to forward slashes for browser compatibility
          action.video = './' + relativePath.replace(/\\/g, '/');
        }
      });
    });
  }

  /**
   * Generate complete HTML document
   */
  private generateHTML(summary: SessionSummary): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Vibe Test Report - ${new Date(summary.startTime).toLocaleString()}</title>
    <style>
        ${this.getStyles()}
    </style>
</head>
<body>
    <div class="container">
        ${this.generateHeader(summary)}
        ${this.generateOverview(summary)}
        ${this.generatePerformanceCharts(summary)}
        ${this.generateCacheStats(summary)}
        ${this.generateCostBreakdown(summary)}
        ${this.generateTestsList(summary)}
        ${this.generateActionsTimeline(summary)}
    </div>
    <script>
        ${this.getScripts()}
    </script>
</body>
</html>`;
  }

  /**
   * Generate header section
   */
  private generateHeader(summary: SessionSummary): string {
    const passRate = (summary.aggregated.passedTests / summary.aggregated.totalTests * 100).toFixed(1);
    const statusClass = summary.aggregated.failedTests === 0 ? 'success' : 'failure';

    return `
    <header class="header">
        <div class="header-content">
            <div class="logo">
                <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                    <circle cx="20" cy="20" r="18" stroke="currentColor" stroke-width="2"/>
                    <path d="M15 20L18 23L25 16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
                <h1>Vibe Test Report</h1>
            </div>
            <div class="header-stats">
                <div class="stat ${statusClass}">
                    <div class="stat-value">${summary.aggregated.passedTests}/${summary.aggregated.totalTests}</div>
                    <div class="stat-label">Tests Passed</div>
                </div>
                <div class="stat">
                    <div class="stat-value">${passRate}%</div>
                    <div class="stat-label">Success Rate</div>
                </div>
                <div class="stat">
                    <div class="stat-value">${this.formatDuration(summary.duration)}</div>
                    <div class="stat-label">Duration</div>
                </div>
            </div>
        </div>
        <div class="header-meta">
            <span>Session ID: ${summary.sessionId}</span>
            <span>Started: ${new Date(summary.startTime).toLocaleString()}</span>
            <span>Mode: ${summary.config.mode}</span>
            <span>AI: ${summary.config.aiProvider}</span>
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
    </header>`;
  }

  /**
   * Generate overview section
   */
  private generateOverview(summary: SessionSummary): string {
    return `
    <section class="overview">
        <h2>Overview</h2>
        <div class="overview-grid">
            <div class="card">
                <h3>Actions</h3>
                <div class="card-content">
                    <div class="metric-row">
                        <span class="label">Total</span>
                        <span class="value">${summary.aggregated.totalActions}</span>
                    </div>
                    <div class="metric-row success">
                        <span class="label">Successful</span>
                        <span class="value">${summary.aggregated.successfulActions}</span>
                    </div>
                    <div class="metric-row failure">
                        <span class="label">Failed</span>
                        <span class="value">${summary.aggregated.failedActions}</span>
                    </div>
                </div>
            </div>

            <div class="card">
                <h3>Performance</h3>
                <div class="card-content">
                    <div class="metric-row">
                        <span class="label">Average Latency</span>
                        <span class="value">${summary.aggregated.averageLatency.toFixed(0)}ms</span>
                    </div>
                    <div class="metric-row">
                        <span class="label">Total Time</span>
                        <span class="value">${this.formatDuration(summary.aggregated.totalLatency)}</span>
                    </div>
                    ${summary.performance.fastestAction ? `
                    <div class="metric-row">
                        <span class="label">⚡ Fastest</span>
                        <span class="value">${summary.performance.fastestAction.latencyMs}ms</span>
                    </div>
                    ` : ''}
                </div>
            </div>

            <div class="card">
                <h3>Cache Performance</h3>
                <div class="card-content">
                    <div class="metric-row">
                        <span class="label">Hit Rate</span>
                        <span class="value">${summary.aggregated.cacheHitRate.toFixed(1)}%</span>
                    </div>
                    <div class="metric-row success">
                        <span class="label">Hits</span>
                        <span class="value">${summary.aggregated.cacheHits}</span>
                    </div>
                    <div class="metric-row">
                        <span class="label">Healings</span>
                        <span class="value">${summary.aggregated.cacheHealings}</span>
                    </div>
                </div>
            </div>

            <div class="card">
                <h3>AI Usage</h3>
                <div class="card-content">
                    <div class="metric-row">
                        <span class="label">Total Calls</span>
                        <span class="value">${summary.aggregated.totalAICalls}</span>
                    </div>
                    <div class="metric-row">
                        <span class="label">Parse Calls</span>
                        <span class="value">${summary.aggregated.parseAICalls}</span>
                    </div>
                    <div class="metric-row">
                        <span class="label">Estimated Cost</span>
                        <span class="value">$${summary.aggregated.totalEstimatedCost.toFixed(6)}</span>
                    </div>
                </div>
            </div>
        </div>
    </section>`;
  }

  /**
   * Generate performance charts
   */
  private generatePerformanceCharts(summary: SessionSummary): string {
    const allActions = summary.tests.flatMap(t => t.actions);

    return `
    <section class="charts">
        <h2>Performance Distribution</h2>
        <div class="chart-container">
            <canvas id="latencyChart" width="400" height="200"></canvas>
        </div>
        <div class="chart-data" style="display:none;">
            ${JSON.stringify(allActions.map(a => ({
                command: a.command,
                latency: a.latencyMs,
                parsing: a.latencyBreakdown.parsing,
                finding: a.latencyBreakdown.elementFinding,
                execution: a.latencyBreakdown.execution
            })))}
        </div>
    </section>`;
  }

  /**
   * Generate cache statistics
   */
  private generateCacheStats(summary: SessionSummary): string {
    const hitRate = summary.aggregated.cacheHitRate.toFixed(1);
    const missRate = (100 - summary.aggregated.cacheHitRate).toFixed(1);

    return `
    <section class="cache-stats">
        <h2>Cache Performance</h2>
        <div class="progress-bar">
            <div class="progress-segment hit" style="width: ${hitRate}%">
                <span>${summary.aggregated.cacheHits} Hits (${hitRate}%)</span>
            </div>
            <div class="progress-segment miss" style="width: ${missRate}%">
                <span>${summary.aggregated.cacheMisses} Misses (${missRate}%)</span>
            </div>
        </div>
        ${summary.aggregated.cacheHealings > 0 ? `
        <div class="healing-info">
            🔧 ${summary.aggregated.cacheHealings} elements healed and cached for future runs
        </div>
        ` : ''}
    </section>`;
  }

  /**
   * Generate cost breakdown
   */
  private generateCostBreakdown(summary: SessionSummary): string {
    const allActions = summary.tests.flatMap(t => t.actions);
    const mostExpensive = summary.performance.mostExpensiveAction;

    return `
    <section class="cost-breakdown">
        <h2>Cost Analysis</h2>
        <div class="cost-grid">
            <div class="cost-card">
                <div class="cost-value">$${summary.aggregated.totalEstimatedCost.toFixed(6)}</div>
                <div class="cost-label">Total Estimated Cost</div>
            </div>
            <div class="cost-card">
                <div class="cost-value">${summary.aggregated.parseAICalls}</div>
                <div class="cost-label">Parse AI Calls</div>
            </div>
            <div class="cost-card">
                <div class="cost-value">${summary.aggregated.healingAICalls}</div>
                <div class="cost-label">Healing AI Calls</div>
            </div>
            ${mostExpensive ? `
            <div class="cost-card">
                <div class="cost-value">$${mostExpensive.ai.estimatedCost.toFixed(6)}</div>
                <div class="cost-label">Most Expensive Action</div>
                <div class="cost-detail">${mostExpensive.command}</div>
            </div>
            ` : ''}
        </div>
    </section>`;
  }

  /**
   * Generate tests list
   */
  private generateTestsList(summary: SessionSummary): string {
    return `
    <section class="tests-list">
        <h2>Tests (${summary.tests.length})</h2>
        ${summary.tests.map(test => `
        <div class="test-item ${test.status}">
            <div class="test-header">
                <span class="test-icon">${test.status === 'passed' ? '✓' : '✗'}</span>
                <span class="test-name">${test.name}</span>
                <span class="test-duration">${test.duration}ms</span>
            </div>
            <div class="test-stats">
                <span>${test.actions.length} actions</span>
                <span>${test.metrics.successfulActions} passed</span>
                ${test.metrics.failedActions > 0 ? `<span class="failure">${test.metrics.failedActions} failed</span>` : ''}
                <span>Avg: ${test.metrics.averageLatency.toFixed(0)}ms</span>
                <span>Cache: ${test.metrics.cacheHitRate.toFixed(1)}%</span>
            </div>
        </div>
        `).join('')}
    </section>`;
  }

  /**
   * Generate actions timeline
   */
  private generateActionsTimeline(summary: SessionSummary): string {
    const allActions = summary.tests.flatMap(t => t.actions);

    return `
    <section class="timeline">
        <div class="timeline-header-bar">
            <h2>Actions Timeline (${allActions.length})</h2>
            <div class="timeline-controls">
                <input type="text" id="searchActions" class="search-input" placeholder="Search actions..." onkeyup="filterActions()">
                <select id="filterStatus" class="filter-select" onchange="filterActions()">
                    <option value="all">All Status</option>
                    <option value="success">✓ Passed</option>
                    <option value="failure">✗ Failed</option>
                </select>
                <button class="btn-control" onclick="expandAll()">Expand All</button>
                <button class="btn-control" onclick="collapseAll()">Collapse All</button>
            </div>
        </div>
        <div class="timeline-container">
            ${allActions.map((action, index) => `
            <div class="timeline-item ${action.success ? 'success' : 'failure'}" data-index="${index}">
                <div class="timeline-marker">${index + 1}</div>
                <div class="timeline-content">
                    <div class="timeline-header" onclick="toggleAction(${index})">
                        <div class="timeline-header-left">
                            <span class="toggle-icon">▶</span>
                            <span class="timeline-status">${action.success ? '✓' : '✗'}</span>
                            <span class="timeline-command">${action.command}</span>
                        </div>
                        <div class="timeline-header-right">
                            <span class="timeline-latency ${this.getLatencyClass(action.latencyMs)}">${action.latencyMs}ms</span>
                        </div>
                    </div>
                    <div class="timeline-details-wrapper" id="action-details-${index}">
                        <div class="timeline-details">
                            <div class="detail-row">
                                <span class="detail-label">Action Type:</span>
                                <span class="detail-value">${action.actionType}</span>
                            </div>
                            ${action.selector ? `
                            <div class="detail-row">
                                <span class="detail-label">Selector:</span>
                                <span class="detail-value"><code>${action.selector}</code></span>
                            </div>
                            ` : ''}
                            <div class="detail-row">
                                <span class="detail-label">Latency Breakdown:</span>
                                <span class="detail-value">
                                    Parse: ${action.latencyBreakdown.parsing}ms |
                                    Find: ${action.latencyBreakdown.elementFinding}ms |
                                    Execute: ${action.latencyBreakdown.execution}ms
                                </span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Cache Status:</span>
                                <span class="detail-value">
                                    <span class="cache-badge ${action.cache.parseCache}">${action.cache.parseCache === 'hit' ? '✓' : '✗'} Parse Cache</span>
                                    <span class="cache-badge ${action.cache.autoHealCache}">${action.cache.autoHealCache === 'hit' ? '✓' : action.cache.autoHealCache === 'healed' ? '🔧' : '✗'} AutoHeal</span>
                                </span>
                            </div>
                            ${action.ai.parseAICalled || action.ai.healingAICalled ? `
                            <div class="detail-row">
                                <span class="detail-label">AI Usage:</span>
                                <span class="detail-value">
                                    ${action.ai.parseAICalled ? '✓ Parse' : ''}
                                    ${action.ai.healingAICalled ? '✓ Healing' : ''}
                                    <span class="ai-badge">Cost: $${action.ai.estimatedCost.toFixed(6)}</span>
                                </span>
                            </div>
                            ` : ''}
                            ${action.error ? `
                            <div class="detail-row error">
                                <span class="detail-label">Error:</span>
                                <span class="detail-value">${action.error}</span>
                            </div>
                            ` : ''}
                            ${action.screenshot ? `
                            <div class="detail-row">
                                <span class="detail-label">Screenshot:</span>
                                <span class="detail-value">
                                    <img src="${action.screenshot}"
                                         class="screenshot-thumbnail"
                                         onclick="openLightbox('${action.screenshot}')"
                                         alt="Screenshot"
                                         title="Click to enlarge">
                                </span>
                            </div>
                            ` : ''}
                            ${action.video ? `
                            <div class="detail-row">
                                <span class="detail-label">Video:</span>
                                <span class="detail-value">
                                    <video class="video-player" controls preload="metadata">
                                        <source src="${action.video}" type="video/webm">
                                        Your browser does not support the video tag.
                                    </video>
                                    <button class="btn-video-fullscreen" onclick="openVideoFullscreen('${action.video}')">
                                        ⛶ Fullscreen
                                    </button>
                                </span>
                            </div>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>
            `).join('')}
        </div>
    </section>

    <!-- Lightbox for screenshots -->
    <div id="lightbox" class="lightbox" onclick="closeLightbox()">
        <span class="lightbox-close">&times;</span>
        <img id="lightbox-image" class="lightbox-content" alt="Screenshot">
    </div>

    <!-- Video fullscreen modal -->
    <div id="video-modal" class="video-modal" onclick="closeVideoModal()">
        <span class="video-modal-close">&times;</span>
        <video id="video-modal-player" class="video-modal-content" controls autoplay>
            <source id="video-modal-source" src="" type="video/webm">
        </video>
    </div>`;
  }

  /**
   * Get CSS styles
   */
  private getStyles(): string {
    return `
        * { margin: 0; padding: 0; box-sizing: border-box; }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: #f5f5f5;
            color: #333;
            line-height: 1.6;
        }

        .container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 20px;
        }

        /* Header */
        .header {
            background: white;
            padding: 30px;
            border-radius: 8px;
            margin-bottom: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .header-content {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
        }

        .logo {
            display: flex;
            align-items: center;
            gap: 15px;
        }

        .logo svg {
            color: #00a8e8;
        }

        .logo h1 {
            font-size: 24px;
            color: #333;
        }

        .header-stats {
            display: flex;
            gap: 30px;
        }

        .stat {
            text-align: center;
        }

        .stat-value {
            font-size: 32px;
            font-weight: bold;
            color: #666;
        }

        .stat.success .stat-value {
            color: #2ecc71;
        }

        .stat.failure .stat-value {
            color: #e74c3c;
        }

        .stat-label {
            font-size: 12px;
            color: #999;
            text-transform: uppercase;
        }

        .header-meta {
            display: flex;
            gap: 20px;
            font-size: 13px;
            color: #666;
            flex-wrap: wrap;
        }

        /* Video Banner */
        .video-banner {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-top: 20px;
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

        .btn-playwright-report:active {
            transform: translateY(0);
        }

        /* Overview */
        .overview {
            margin-bottom: 20px;
        }

        .overview h2 {
            font-size: 20px;
            margin-bottom: 15px;
            color: #333;
        }

        .overview-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 15px;
        }

        .card {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .card h3 {
            font-size: 14px;
            color: #666;
            margin-bottom: 15px;
            text-transform: uppercase;
            font-weight: 600;
        }

        .card-content {
            display: flex;
            flex-direction: column;
            gap: 10px;
        }

        .metric-row {
            display: flex;
            justify-content: space-between;
            font-size: 14px;
        }

        .metric-row.success .value {
            color: #2ecc71;
            font-weight: 600;
        }

        .metric-row.failure .value {
            color: #e74c3c;
            font-weight: 600;
        }

        /* Charts */
        .charts {
            background: white;
            padding: 30px;
            border-radius: 8px;
            margin-bottom: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .charts h2 {
            font-size: 20px;
            margin-bottom: 20px;
        }

        .chart-container {
            max-width: 100%;
            height: 300px;
        }

        /* Cache Stats */
        .cache-stats {
            background: white;
            padding: 30px;
            border-radius: 8px;
            margin-bottom: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .cache-stats h2 {
            font-size: 20px;
            margin-bottom: 20px;
        }

        .progress-bar {
            display: flex;
            height: 40px;
            border-radius: 4px;
            overflow: hidden;
            background: #e0e0e0;
        }

        .progress-segment {
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: 600;
            font-size: 14px;
            transition: width 0.3s;
            min-width: 0;
        }

        .progress-segment span {
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            padding: 0 5px;
        }

        .progress-segment.hit {
            background: #2ecc71;
        }

        .progress-segment.miss {
            background: #f39c12;
        }

        .healing-info {
            margin-top: 15px;
            padding: 10px;
            background: #e3f2fd;
            border-left: 4px solid #2196f3;
            border-radius: 4px;
            font-size: 14px;
            line-height: 1.5;
            word-wrap: break-word;
        }

        /* Cost Breakdown */
        .cost-breakdown {
            background: white;
            padding: 30px;
            border-radius: 8px;
            margin-bottom: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .cost-breakdown h2 {
            font-size: 20px;
            margin-bottom: 20px;
        }

        .cost-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
        }

        .cost-card {
            padding: 20px;
            background: #f9f9f9;
            border-radius: 6px;
            text-align: center;
        }

        .cost-value {
            font-size: 24px;
            font-weight: bold;
            color: #2ecc71;
        }

        .cost-label {
            font-size: 12px;
            color: #666;
            margin-top: 5px;
        }

        .cost-detail {
            font-size: 11px;
            color: #999;
            margin-top: 5px;
        }

        /* Tests List */
        .tests-list {
            background: white;
            padding: 30px;
            border-radius: 8px;
            margin-bottom: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .tests-list h2 {
            font-size: 20px;
            margin-bottom: 20px;
        }

        .test-item {
            padding: 15px;
            border-left: 4px solid #2ecc71;
            background: #f9f9f9;
            margin-bottom: 10px;
            border-radius: 4px;
        }

        .test-item.failed {
            border-left-color: #e74c3c;
        }

        .test-header {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 10px;
        }

        .test-icon {
            font-size: 18px;
            color: #2ecc71;
        }

        .test-item.failed .test-icon {
            color: #e74c3c;
        }

        .test-name {
            flex: 1;
            font-weight: 600;
        }

        .test-duration {
            color: #666;
            font-size: 14px;
        }

        .test-stats {
            display: flex;
            gap: 15px;
            font-size: 13px;
            color: #666;
        }

        .test-stats .failure {
            color: #e74c3c;
        }

        /* Timeline */
        .timeline {
            background: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .timeline-header-bar {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
        }

        .timeline h2 {
            font-size: 20px;
            margin: 0;
        }

        .timeline-controls {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
            align-items: center;
        }

        .search-input {
            padding: 6px 12px;
            border: 1px solid #d0d0d0;
            border-radius: 4px;
            font-size: 13px;
            min-width: 200px;
            outline: none;
        }

        .search-input:focus {
            border-color: #00a8e8;
            box-shadow: 0 0 0 2px rgba(0, 168, 232, 0.1);
        }

        .filter-select {
            padding: 6px 12px;
            border: 1px solid #d0d0d0;
            border-radius: 4px;
            font-size: 13px;
            cursor: pointer;
            background: white;
            outline: none;
        }

        .filter-select:focus {
            border-color: #00a8e8;
        }

        .btn-control {
            padding: 6px 12px;
            background: #f0f0f0;
            border: 1px solid #d0d0d0;
            border-radius: 4px;
            cursor: pointer;
            font-size: 13px;
            color: #333;
            transition: background 0.2s;
        }

        .btn-control:hover {
            background: #e0e0e0;
        }

        .btn-control:active {
            background: #d0d0d0;
        }

        .timeline-item.hidden {
            display: none;
        }

        .timeline-container {
            display: flex;
            flex-direction: column;
            gap: 15px;
        }

        .timeline-item {
            display: flex;
            gap: 15px;
            background: white;
            border-radius: 6px;
            border-left: 4px solid #2ecc71;
            border: 1px solid #e0e0e0;
            overflow: hidden;
            transition: box-shadow 0.2s;
        }

        .timeline-item:hover {
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }

        .timeline-item.success {
            border-left: 4px solid #2ecc71;
        }

        .timeline-item.failure {
            border-left: 4px solid #e74c3c;
        }

        .timeline-marker {
            width: 30px;
            height: 30px;
            border-radius: 50%;
            background: #00a8e8;
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            font-weight: bold;
            flex-shrink: 0;
            margin: 15px 0 0 15px;
        }

        .timeline-content {
            flex: 1;
        }

        .timeline-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 15px 15px 15px 0;
            cursor: pointer;
            user-select: none;
        }

        .timeline-header:hover {
            background: #f9f9f9;
        }

        .timeline-header-left {
            display: flex;
            align-items: center;
            gap: 10px;
            flex: 1;
        }

        .timeline-header-right {
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .toggle-icon {
            font-size: 12px;
            color: #666;
            transition: transform 0.2s;
            display: inline-block;
        }

        .timeline-item.expanded .toggle-icon {
            transform: rotate(90deg);
        }

        .timeline-status {
            font-size: 16px;
            font-weight: bold;
        }

        .timeline-item.success .timeline-status {
            color: #2ecc71;
        }

        .timeline-item.failure .timeline-status {
            color: #e74c3c;
        }

        .timeline-command {
            font-weight: 500;
            color: #333;
            flex: 1;
        }

        .timeline-latency {
            font-size: 13px;
            padding: 4px 10px;
            border-radius: 4px;
            background: #2ecc71;
            color: white;
            font-weight: 500;
        }

        .timeline-latency.medium {
            background: #f39c12;
        }

        .timeline-latency.slow {
            background: #e74c3c;
        }

        .timeline-details-wrapper {
            max-height: 0;
            overflow: hidden;
            transition: max-height 0.3s ease-out;
        }

        .timeline-item.expanded .timeline-details-wrapper {
            max-height: 1000px;
        }

        .timeline-details {
            padding: 0 15px 15px 15px;
            border-top: 1px solid #e0e0e0;
        }

        .detail-row {
            display: flex;
            padding: 8px 0;
            gap: 15px;
            align-items: flex-start;
        }

        .detail-row.error {
            background: #ffebee;
            padding: 10px;
            border-radius: 4px;
            margin-top: 5px;
        }

        .detail-label {
            font-weight: 600;
            color: #666;
            min-width: 130px;
            font-size: 13px;
        }

        .detail-value {
            color: #333;
            font-size: 13px;
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
            align-items: center;
        }

        .detail-value code {
            background: #f5f5f5;
            padding: 3px 8px;
            border-radius: 3px;
            font-family: 'Consolas', 'Monaco', monospace;
            font-size: 12px;
            color: #d63384;
        }

        .timeline-cache {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
        }

        .cache-badge {
            font-size: 11px;
            padding: 3px 8px;
            border-radius: 3px;
            background: #e0e0e0;
        }

        .cache-badge.hit {
            background: #d4edda;
            color: #155724;
        }

        .cache-badge.healed {
            background: #cce5ff;
            color: #004085;
        }

        .ai-badge {
            font-size: 11px;
            padding: 3px 8px;
            border-radius: 3px;
            background: #fff3cd;
            color: #856404;
        }

        /* Screenshots */
        .screenshot-thumbnail {
            max-width: 300px;
            max-height: 200px;
            border-radius: 4px;
            border: 2px solid #e0e0e0;
            cursor: pointer;
            transition: transform 0.2s, border-color 0.2s;
            display: block;
        }

        .screenshot-thumbnail:hover {
            transform: scale(1.05);
            border-color: #00a8e8;
            box-shadow: 0 4px 8px rgba(0,0,0,0.2);
        }

        /* Lightbox */
        .lightbox {
            display: none;
            position: fixed;
            z-index: 9999;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.9);
            cursor: zoom-out;
        }

        .lightbox-content {
            display: block;
            margin: auto;
            max-width: 90%;
            max-height: 90%;
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            animation: zoom 0.3s;
        }

        @keyframes zoom {
            from { transform: translate(-50%, -50%) scale(0.5); }
            to { transform: translate(-50%, -50%) scale(1); }
        }

        .lightbox-close {
            position: absolute;
            top: 20px;
            right: 40px;
            color: white;
            font-size: 40px;
            font-weight: bold;
            cursor: pointer;
            transition: color 0.2s;
        }

        .lightbox-close:hover {
            color: #00a8e8;
        }

        .timeline-error {
            margin-top: 10px;
            padding: 10px;
            background: #f8d7da;
            color: #721c24;
            border-radius: 4px;
            font-size: 13px;
        }

        /* Video Player */
        .video-player {
            max-width: 640px;
            width: 100%;
            border-radius: 4px;
            border: 2px solid #e0e0e0;
            background: #000;
            display: block;
            margin-bottom: 8px;
        }

        .btn-video-fullscreen {
            padding: 6px 12px;
            background: #00a8e8;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 13px;
            transition: background 0.2s;
        }

        .btn-video-fullscreen:hover {
            background: #0086b3;
        }

        /* Video Modal */
        .video-modal {
            display: none;
            position: fixed;
            z-index: 10000;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.95);
            cursor: pointer;
        }

        .video-modal-content {
            display: block;
            margin: auto;
            max-width: 95%;
            max-height: 95%;
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
        }

        .video-modal-close {
            position: absolute;
            top: 20px;
            right: 40px;
            color: white;
            font-size: 40px;
            font-weight: bold;
            cursor: pointer;
            transition: color 0.2s;
            z-index: 10001;
        }

        .video-modal-close:hover {
            color: #00a8e8;
        }

        @media (max-width: 768px) {
            .header-stats {
                flex-direction: column;
                gap: 15px;
            }

            .overview-grid {
                grid-template-columns: 1fr;
            }

            .cost-grid {
                grid-template-columns: 1fr;
            }

            .video-player {
                max-width: 100%;
            }

            .video-banner {
                flex-direction: column;
                align-items: stretch;
            }

            .btn-playwright-report {
                width: 100%;
                text-align: center;
            }
        }
    `;
  }

  /**
   * Get JavaScript for interactivity
   */
  private getScripts(): string {
    return `
        // Toggle action details
        function toggleAction(index) {
            const item = document.querySelector('.timeline-item[data-index="' + index + '"]');
            if (item) {
                item.classList.toggle('expanded');
            }
        }

        // Expand all actions
        function expandAll() {
            document.querySelectorAll('.timeline-item').forEach(item => {
                item.classList.add('expanded');
            });
        }

        // Collapse all actions
        function collapseAll() {
            document.querySelectorAll('.timeline-item').forEach(item => {
                item.classList.remove('expanded');
            });
        }

        // Filter actions by search and status
        function filterActions() {
            const searchTerm = document.getElementById('searchActions').value.toLowerCase();
            const statusFilter = document.getElementById('filterStatus').value;

            document.querySelectorAll('.timeline-item').forEach(item => {
                const command = item.querySelector('.timeline-command').textContent.toLowerCase();
                const status = item.classList.contains('success') ? 'success' : 'failure';

                const matchesSearch = command.includes(searchTerm);
                const matchesStatus = statusFilter === 'all' || statusFilter === status;

                if (matchesSearch && matchesStatus) {
                    item.classList.remove('hidden');
                } else {
                    item.classList.add('hidden');
                }
            });
        }

        // Open lightbox with screenshot
        function openLightbox(imageSrc) {
            const lightbox = document.getElementById('lightbox');
            const lightboxImage = document.getElementById('lightbox-image');
            lightboxImage.src = imageSrc;
            lightbox.style.display = 'block';
            document.body.style.overflow = 'hidden'; // Prevent scrolling
        }

        // Close lightbox
        function closeLightbox() {
            const lightbox = document.getElementById('lightbox');
            lightbox.style.display = 'none';
            document.body.style.overflow = 'auto'; // Re-enable scrolling
        }

        // Close lightbox on ESC key
        document.addEventListener('keydown', function(event) {
            if (event.key === 'Escape') {
                closeLightbox();
                closeVideoModal();
            }
        });

        // Open video in fullscreen modal
        function openVideoFullscreen(videoSrc) {
            const modal = document.getElementById('video-modal');
            const video = document.getElementById('video-modal-player');
            const source = document.getElementById('video-modal-source');
            source.src = videoSrc;
            video.load();
            modal.style.display = 'block';
            document.body.style.overflow = 'hidden';
            event.stopPropagation();
        }

        // Close video modal
        function closeVideoModal() {
            const modal = document.getElementById('video-modal');
            const video = document.getElementById('video-modal-player');
            modal.style.display = 'none';
            video.pause();
            document.body.style.overflow = 'auto';
        }

        // Prevent video modal from closing when clicking video
        document.addEventListener('DOMContentLoaded', function() {
            const videoModal = document.getElementById('video-modal-player');
            if (videoModal) {
                videoModal.addEventListener('click', function(event) {
                    event.stopPropagation();
                });
            }
        });

        // Chart rendering (simple bar chart)
        function renderLatencyChart() {
            const canvas = document.getElementById('latencyChart');
            if (!canvas) return;

            const dataEl = document.querySelector('.chart-data');
            if (!dataEl) return;

            const actions = JSON.parse(dataEl.textContent);
            const ctx = canvas.getContext('2d');

            // Simple bar chart
            const maxLatency = Math.max(...actions.map(a => a.latency));
            const barWidth = canvas.width / actions.length;

            actions.forEach((action, i) => {
                const barHeight = (action.latency / maxLatency) * (canvas.height - 40);
                const x = i * barWidth;
                const y = canvas.height - barHeight - 20;

                // Draw bar
                ctx.fillStyle = action.latency < 50 ? '#2ecc71' : action.latency < 200 ? '#f39c12' : '#e74c3c';
                ctx.fillRect(x + 2, y, barWidth - 4, barHeight);

                // Draw label
                ctx.fillStyle = '#666';
                ctx.font = '10px sans-serif';
                ctx.save();
                ctx.translate(x + barWidth/2, canvas.height - 5);
                ctx.rotate(-Math.PI/4);
                ctx.fillText(action.latency + 'ms', 0, 0);
                ctx.restore();
            });
        }

        // Render charts when page loads
        window.addEventListener('load', () => {
            renderLatencyChart();
        });
    `;
  }

  /**
   * Helper: Format duration
   */
  private formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
    return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
  }

  /**
   * Helper: Get latency class
   */
  private getLatencyClass(ms: number): string {
    if (ms < 50) return 'fast';
    if (ms < 200) return 'medium';
    return 'slow';
  }
}
