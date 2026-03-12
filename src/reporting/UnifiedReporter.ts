import * as fs from 'fs';
import * as path from 'path';

/**
 * Unified Reporter - Generates a single interactive HTML report with session selector
 */
export class UnifiedReporter {
  private outputDir: string;

  constructor(outputDir: string = './vibe-reports') {
    this.outputDir = outputDir;
  }

  /**
   * Generate unified report from all session JSON files
   */
  async generateUnifiedReport(): Promise<string> {
    // Ensure output directory exists
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }

    // Load all sessions
    const sessions = this.loadAllSessions();

    if (sessions.length === 0) {
      throw new Error('No session files found in ' + this.outputDir);
    }

    // Generate unified HTML
    const html = this.generateHTML(sessions);

    // Write to unified-report.html
    const outputPath = path.join(this.outputDir, 'unified-report.html');
    fs.writeFileSync(outputPath, html, 'utf-8');

    return outputPath;
  }

  /**
   * Load all session-*.json files from output directory
   */
  private loadAllSessions(): any[] {
    const files = fs.readdirSync(this.outputDir);
    const sessionFiles = files.filter(f => f.startsWith('session-') && f.endsWith('.json'));

    const sessions = sessionFiles.map(file => {
      const filePath = path.join(this.outputDir, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(content);
    });

    // Sort by start time (newest first)
    sessions.sort((a, b) => {
      const timeA = new Date(a.session.startTime).getTime();
      const timeB = new Date(b.session.startTime).getTime();
      return timeB - timeA;
    });

    return sessions;
  }

  /**
   * Generate complete HTML document
   */
  private generateHTML(sessions: any[]): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Vibe Unified Test Report</title>
    <style>
        ${this.getStyles()}
    </style>
</head>
<body>
    ${this.generateUnifiedHeader(sessions)}
    ${this.generateSessionSelector(sessions)}
    ${sessions.map((session, index) => this.generateSessionContent(session, index)).join('')}

    <!-- Lightbox for screenshots -->
    <div id="lightbox" class="lightbox" onclick="closeLightbox()">
        <span class="lightbox-close">&times;</span>
        <img id="lightbox-image" class="lightbox-content" alt="Screenshot">
    </div>

    <script>
        ${this.getScripts()}
    </script>
</body>
</html>`;
  }

  /**
   * Generate unified header with overall stats
   */
  private generateUnifiedHeader(sessions: any[]): string {
    const totalTests = sessions.reduce((sum, s) => sum + s.summary.tests.total, 0);
    const passedTests = sessions.reduce((sum, s) => sum + s.summary.tests.passed, 0);
    const failedTests = sessions.reduce((sum, s) => sum + s.summary.tests.failed, 0);
    const statusClass = failedTests === 0 ? 'success' : 'failure';
    const passRate = totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(1) : '0.0';

    return `
    <div class="unified-header">
        <div class="header-content">
            <div class="logo">
                <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                    <circle cx="20" cy="20" r="18" stroke="currentColor" stroke-width="2"/>
                    <path d="M15 20L18 23L25 16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
                <h1>Vibe Unified Test Report</h1>
            </div>
            <div class="header-stats">
                <div class="stat ${statusClass}">
                    <div class="stat-value">${passedTests}/${totalTests}</div>
                    <div class="stat-label">Tests Passed</div>
                </div>
                <div class="stat">
                    <div class="stat-value">${passRate}%</div>
                    <div class="stat-label">Success Rate</div>
                </div>
                <div class="stat">
                    <div class="stat-value">${sessions.length}</div>
                    <div class="stat-label">Sessions</div>
                </div>
            </div>
        </div>
        <div class="header-meta">
            <span>Generated: ${new Date().toLocaleString()}</span>
            <span>Sessions: ${sessions.length}</span>
            <span>Total Tests: ${totalTests}</span>
        </div>
    </div>`;
  }

  /**
   * Generate session selector (tabs + mobile dropdown)
   */
  private generateSessionSelector(sessions: any[]): string {
    if (sessions.length === 1) {
      // Don't show selector if only one session
      return '';
    }

    const tabs = sessions.map((session, index) => {
      const sessionNum = index + 1;
      const status = session.summary.tests.failed > 0 ? 'failed' : 'passed';
      const icon = status === 'passed' ? '✓' : '✗';
      const testCount = session.summary.tests.total;
      const activeClass = index === 0 ? 'active' : '';

      return `
        <button class="tab-button ${activeClass} status-${status}"
                onclick="switchSession('session-${index}')">
          Worker ${sessionNum} ${icon} (${testCount} test${testCount !== 1 ? 's' : ''})
        </button>`;
    }).join('');

    const dropdownOptions = sessions.map((session, index) => {
      const sessionNum = index + 1;
      const status = session.summary.tests.failed > 0 ? '✗' : '✓';
      const testCount = session.summary.tests.total;
      const selected = index === 0 ? 'selected' : '';

      return `
        <option value="session-${index}" ${selected}>
          Worker ${sessionNum} ${status} (${testCount} test${testCount !== 1 ? 's' : ''})
        </option>`;
    }).join('');

    return `
    <div class="session-selector">
        <div class="session-tabs-container">
            ${tabs}
        </div>
        <select class="session-dropdown" onchange="switchSession(this.value)">
            ${dropdownOptions}
        </select>
    </div>`;
  }

  /**
   * Generate content for a single session
   */
  private generateSessionContent(session: any, index: number): string {
    const isActive = index === 0;
    const displayStyle = isActive ? '' : 'style="display:none"';

    return `
    <div class="session-content ${isActive ? 'active' : ''}"
         data-session="session-${index}"
         ${displayStyle}>
        <div class="container">
            ${this.generateSessionHeader(session, index + 1)}
            ${this.generateOverview(session)}
            ${this.generateTestsList(session)}
        </div>
    </div>`;
  }

  /**
   * Generate session header
   */
  private generateSessionHeader(session: any, workerNum: number): string {
    const startTime = new Date(session.session.startTime).toLocaleString();
    const config = session.session.config;

    return `
    <div class="session-header">
        <h2>Worker ${workerNum} Session</h2>
        <div class="session-meta">
            <span>Session ID: ${session.session.id}</span>
            <span>Started: ${startTime}</span>
            <span>Duration: ${session.session.durationFormatted}</span>
            <span>Mode: ${config.mode}</span>
            <span>AI: ${config.aiProvider}</span>
        </div>
    </div>`;
  }

  /**
   * Generate overview cards
   */
  private generateOverview(session: any): string {
    const summary = session.summary;

    return `
    <section class="overview">
        <h2>Overview</h2>
        <div class="overview-grid">
            <div class="card">
                <h3>Actions</h3>
                <div class="card-content">
                    <div class="metric-row">
                        <span class="label">Total</span>
                        <span class="value">${summary.actions.total}</span>
                    </div>
                    <div class="metric-row success">
                        <span class="label">Successful</span>
                        <span class="value">${summary.actions.successful}</span>
                    </div>
                    <div class="metric-row failure">
                        <span class="label">Failed</span>
                        <span class="value">${summary.actions.failed}</span>
                    </div>
                </div>
            </div>

            <div class="card">
                <h3>Performance</h3>
                <div class="card-content">
                    <div class="metric-row">
                        <span class="label">Average Latency</span>
                        <span class="value">${summary.performance.averageLatencyMs}ms</span>
                    </div>
                    <div class="metric-row">
                        <span class="label">Total Time</span>
                        <span class="value">${summary.performance.totalLatencyMs}ms</span>
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
                        <span class="value">${summary.cache.hitRate}</span>
                    </div>
                    <div class="metric-row success">
                        <span class="label">Hits</span>
                        <span class="value">${summary.cache.hits}</span>
                    </div>
                    <div class="metric-row">
                        <span class="label">Healings</span>
                        <span class="value">${summary.cache.healings}</span>
                    </div>
                </div>
            </div>

            <div class="card">
                <h3>AI Usage</h3>
                <div class="card-content">
                    <div class="metric-row">
                        <span class="label">Total Calls</span>
                        <span class="value">${summary.ai.totalCalls}</span>
                    </div>
                    <div class="metric-row">
                        <span class="label">Parse Calls</span>
                        <span class="value">${summary.ai.parseCalls}</span>
                    </div>
                    <div class="metric-row">
                        <span class="label">Estimated Cost</span>
                        <span class="value">${summary.ai.estimatedCost}</span>
                    </div>
                </div>
            </div>
        </div>
    </section>`;
  }

  /**
   * Generate tests list with actions and videos
   */
  private generateTestsList(session: any): string {
    const tests = session.tests;

    return `
    <section class="tests-section">
        <h2>Tests (${tests.length})</h2>
        ${tests.map((test: any) => this.generateTestWithVideo(test)).join('')}
    </section>`;
  }

  /**
   * Generate individual test with actions timeline and video
   */
  private generateTestWithVideo(test: any): string {
    const statusIcon = test.status === 'passed' ? '✓' : '✗';
    const statusClass = test.status === 'passed' ? 'success' : 'failure';

    return `
    <div class="test-group">
        <div class="test-header ${statusClass}">
            <div class="test-header-left">
                <span class="test-icon">${statusIcon}</span>
                <span class="test-name">${test.name}</span>
            </div>
            <div class="test-header-right">
                <span class="test-duration">${test.durationFormatted}</span>
            </div>
        </div>

        <div class="test-stats">
            <span>${test.actions.length} actions</span>
            <span>${test.metrics.successfulActions} passed</span>
            ${test.metrics.failedActions > 0 ? `<span class="failure">${test.metrics.failedActions} failed</span>` : ''}
            <span>Avg: ${test.metrics.averageLatencyMs}ms</span>
            <span>Cache: ${test.metrics.cacheHitRate}</span>
            ${test.metrics.estimatedCost ? `<span>AI Cost: ${test.metrics.estimatedCost}</span>` : ''}
        </div>

        ${this.generateActionsTimeline(test.actions)}
        ${this.generateTestVideo(test)}
    </div>`;
  }

  /**
   * Generate actions timeline for a test
   */
  private generateActionsTimeline(actions: any[]): string {
    return `
    <div class="actions-timeline">
        <h4>Actions Timeline</h4>
        ${actions.map((action, index) => `
        <div class="timeline-item ${action.success ? 'success' : 'failure'}">
            <div class="timeline-marker">${index + 1}</div>
            <div class="timeline-content">
                <div class="timeline-header" onclick="toggleAction(this)">
                    <div class="timeline-header-left">
                        <span class="toggle-icon">▶</span>
                        <span class="timeline-status">${action.success ? '✓' : '✗'}</span>
                        <span class="timeline-command">${action.command}</span>
                    </div>
                    <div class="timeline-header-right">
                        <span class="timeline-latency ${this.getLatencyClass(action.latency.totalMs)}">${action.latency.totalMs}ms</span>
                    </div>
                </div>
                <div class="timeline-details-wrapper">
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
                                Parse: ${action.latency.parsing}ms |
                                Find: ${action.latency.elementFinding}ms |
                                Execute: ${action.latency.execution}ms
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
                                ${action.ai.healingAICalled ? `<span class="ai-badge">Cost: $${action.ai.estimatedCost.toFixed(6)}</span>` : ''}
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
                                     onclick="openLightbox('${action.screenshot.replace(/'/g, "\\'")}'); event.stopPropagation();"
                                     alt="Screenshot"
                                     title="Click to enlarge">
                            </span>
                        </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        </div>
        `).join('')}
    </div>`;
  }

  /**
   * Generate video section for a test
   */
  private generateTestVideo(test: any): string {
    // Try to find video path from Playwright test-results
    const testStartTime = new Date(test.startTime).getTime();
    const videoPath = this.getTestVideoPathByTime(testStartTime);

    if (!videoPath) {
      return ''; // No video available
    }

    return `
    <div class="test-video-section">
        <h4>🎬 Test Recording</h4>
        <video class="test-video-player" controls preload="metadata">
            <source src="${videoPath}" type="video/webm">
            Your browser does not support video playback.
        </video>
        <button class="btn-video-fullscreen" onclick="openVideoFullscreen('${videoPath}')">
            ⛶ Fullscreen
        </button>
    </div>`;
  }

  /**
   * Get video path for a test based on timestamp (from Playwright test-results)
   */
  private getTestVideoPathByTime(testStartTime: number): string | null {
    const testResultsDir = path.join(this.outputDir, '../test-results');

    // Check if test-results directory exists
    if (!fs.existsSync(testResultsDir)) {
      return null;
    }

    try {
      // Read all directories in test-results
      const entries = fs.readdirSync(testResultsDir, { withFileTypes: true });

      // Find video with closest modification time to test start time
      let closestVideo: string | null = null;
      let closestTimeDiff = Infinity;

      for (const entry of entries) {
        if (entry.isDirectory()) {
          const videoPath = path.join(testResultsDir, entry.name, 'video.webm');

          // Check if video exists in this directory
          if (fs.existsSync(videoPath)) {
            const stats = fs.statSync(videoPath);
            const videoTime = stats.mtimeMs;
            const timeDiff = Math.abs(videoTime - testStartTime);

            // Update closest match if this video is closer in time
            if (timeDiff < closestTimeDiff) {
              closestTimeDiff = timeDiff;
              closestVideo = `../test-results/${entry.name}/video.webm`;
            }
          }
        }
      }

      // Only return if the video was created within 5 minutes of test start
      if (closestVideo && closestTimeDiff < 5 * 60 * 1000) {
        return closestVideo;
      }
    } catch (error) {
      console.warn(`Failed to search for video: ${error}`);
    }

    return null;
  }

  /**
   * Get latency class for styling
   */
  private getLatencyClass(ms: number): string {
    if (ms < 50) return 'fast';
    if (ms < 200) return 'medium';
    return 'slow';
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

        /* Unified Header */
        .unified-header {
            background: white;
            padding: 30px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            margin-bottom: 20px;
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

        /* Session Selector */
        .session-selector {
            background: white;
            padding: 20px;
            margin-bottom: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .session-tabs-container {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
        }

        .tab-button {
            padding: 10px 20px;
            border: 2px solid #e0e0e0;
            background: white;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            transition: all 0.2s;
        }

        .tab-button:hover {
            background: #f5f5f5;
        }

        .tab-button.active {
            border-color: #00a8e8;
            background: #e3f2fd;
            color: #00a8e8;
        }

        .tab-button.status-passed {
            border-left: 4px solid #2ecc71;
        }

        .tab-button.status-failed {
            border-left: 4px solid #e74c3c;
        }

        .session-dropdown {
            display: none;
            width: 100%;
            padding: 10px;
            border: 2px solid #e0e0e0;
            border-radius: 6px;
            font-size: 14px;
            background: white;
            cursor: pointer;
        }

        /* Session Content */
        .session-content {
            animation: fadeIn 0.3s;
        }

        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }

        .container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 0 20px 20px 20px;
        }

        .session-header {
            background: white;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .session-header h2 {
            margin-bottom: 10px;
            color: #333;
        }

        .session-meta {
            display: flex;
            gap: 20px;
            font-size: 13px;
            color: #666;
            flex-wrap: wrap;
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

        /* Tests Section */
        .tests-section {
            background: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .tests-section h2 {
            font-size: 20px;
            margin-bottom: 20px;
        }

        .test-group {
            margin-bottom: 30px;
            padding: 20px;
            background: #f9f9f9;
            border-radius: 8px;
            border-left: 4px solid #2ecc71;
        }

        .test-group:has(.test-header.failure) {
            border-left-color: #e74c3c;
        }

        .test-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
        }

        .test-header-left {
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .test-icon {
            font-size: 20px;
        }

        .test-header.success .test-icon {
            color: #2ecc71;
        }

        .test-header.failure .test-icon {
            color: #e74c3c;
        }

        .test-name {
            font-size: 18px;
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
            margin-bottom: 15px;
        }

        .test-stats .failure {
            color: #e74c3c;
            font-weight: 600;
        }

        /* Actions Timeline */
        .actions-timeline {
            margin-top: 20px;
        }

        .actions-timeline h4 {
            font-size: 16px;
            margin-bottom: 15px;
            color: #666;
        }

        .timeline-item {
            display: flex;
            gap: 15px;
            background: white;
            border-radius: 6px;
            border-left: 4px solid #2ecc71;
            margin-bottom: 10px;
            overflow: hidden;
            transition: box-shadow 0.2s;
        }

        .timeline-item:hover {
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }

        .timeline-item.failure {
            border-left-color: #e74c3c;
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

        /* Video Section */
        .test-video-section {
            margin-top: 20px;
            padding: 20px;
            background: white;
            border-radius: 6px;
        }

        .test-video-section h4 {
            font-size: 16px;
            margin-bottom: 15px;
            color: #333;
        }

        .test-video-player {
            max-width: 800px;
            width: 100%;
            border-radius: 4px;
            border: 2px solid #e0e0e0;
            background: #000;
            display: block;
            margin-bottom: 10px;
        }

        .btn-video-fullscreen {
            padding: 8px 16px;
            background: #00a8e8;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
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

        /* Responsive */
        @media (max-width: 768px) {
            .header-stats {
                flex-direction: column;
                gap: 15px;
            }

            .overview-grid {
                grid-template-columns: 1fr;
            }

            .session-tabs-container {
                display: none;
            }

            .session-dropdown {
                display: block;
            }

            .test-video-player {
                max-width: 100%;
            }
        }
    `;
  }

  /**
   * Get JavaScript for interactivity
   */
  private getScripts(): string {
    return `
        // Switch between sessions
        function switchSession(sessionId) {
            // Hide all sessions
            document.querySelectorAll('.session-content').forEach(el => {
                el.style.display = 'none';
                el.classList.remove('active');
            });

            // Show selected session
            const selected = document.querySelector('[data-session="' + sessionId + '"]');
            if (selected) {
                selected.style.display = 'block';
                selected.classList.add('active');
            }

            // Update active tab
            document.querySelectorAll('.tab-button').forEach(btn => {
                btn.classList.remove('active');
            });

            const tabButtons = document.querySelectorAll('.tab-button');
            const sessionIndex = parseInt(sessionId.replace('session-', ''));
            if (tabButtons[sessionIndex]) {
                tabButtons[sessionIndex].classList.add('active');
            }

            // Update dropdown
            const dropdown = document.querySelector('.session-dropdown');
            if (dropdown) {
                dropdown.value = sessionId;
            }
        }

        // Toggle action details
        function toggleAction(headerElement) {
            const timelineItem = headerElement.closest('.timeline-item');
            if (timelineItem) {
                timelineItem.classList.toggle('expanded');
            }
        }

        // Open video in fullscreen modal
        function openVideoFullscreen(videoSrc) {
            let modal = document.getElementById('video-modal');

            // Create modal if it doesn't exist
            if (!modal) {
                modal = document.createElement('div');
                modal.id = 'video-modal';
                modal.className = 'video-modal';
                modal.innerHTML = \`
                    <span class="video-modal-close" onclick="closeVideoModal()">&times;</span>
                    <video id="video-modal-player" class="video-modal-content" controls autoplay>
                        <source id="video-modal-source" src="" type="video/webm">
                    </video>
                \`;
                document.body.appendChild(modal);

                // Close on background click
                modal.addEventListener('click', function(e) {
                    if (e.target === modal) {
                        closeVideoModal();
                    }
                });

                // Prevent video clicks from closing modal
                const video = modal.querySelector('video');
                video.addEventListener('click', function(e) {
                    e.stopPropagation();
                });
            }

            const video = document.getElementById('video-modal-player');
            const source = document.getElementById('video-modal-source');
            source.src = videoSrc;
            video.load();
            modal.style.display = 'block';
            document.body.style.overflow = 'hidden';
        }

        // Close video modal
        function closeVideoModal() {
            const modal = document.getElementById('video-modal');
            const video = document.getElementById('video-modal-player');
            if (modal && video) {
                modal.style.display = 'none';
                video.pause();
                document.body.style.overflow = 'auto';
            }
        }

        // Open lightbox with screenshot
        function openLightbox(imageSrc) {
            const lightbox = document.getElementById('lightbox');
            const lightboxImage = document.getElementById('lightbox-image');
            lightboxImage.src = imageSrc;
            lightbox.style.display = 'block';
            document.body.style.overflow = 'hidden';
        }

        // Close lightbox
        function closeLightbox() {
            const lightbox = document.getElementById('lightbox');
            lightbox.style.display = 'none';
            document.body.style.overflow = 'auto';
        }

        // Close modal on ESC key
        document.addEventListener('keydown', function(event) {
            if (event.key === 'Escape') {
                closeLightbox();
                closeVideoModal();
            }
        });

        // Initialize on page load
        window.addEventListener('load', function() {
            console.log('Unified report loaded successfully');
        });
    `;
  }
}
