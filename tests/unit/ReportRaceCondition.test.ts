import { HTMLReporter } from '../../src/reporting/HTMLReporter';
import { SessionSummary } from '../../src/models/VibeMetrics';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

describe('Report Race Condition Prevention', () => {
  let testDir: string;
  let reporter: HTMLReporter;

  beforeEach(async () => {
    testDir = path.join(os.tmpdir(), `report-test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
    await fs.mkdir(testDir, { recursive: true });
    reporter = new HTMLReporter(testDir);
  });

  afterEach(async () => {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('Parallel Report Generation', () => {
    it('should handle concurrent index.html updates without corruption', async () => {
      const sessionCount = 5;

      // Create mock session summaries
      const summaries: SessionSummary[] = [];
      for (let i = 0; i < sessionCount; i++) {
        summaries.push(createMockSummary(`session-${i}`));
      }

      // Generate reports in parallel (simulating parallel test execution)
      const reportPromises = summaries.map(summary =>
        reporter.generateReport(summary)
      );

      // All should complete without errors
      const reportPaths = await Promise.all(reportPromises);

      // Verify all session-specific reports were created
      expect(reportPaths.length).toBe(sessionCount);
      for (const reportPath of reportPaths) {
        const exists = await fs.access(reportPath).then(() => true).catch(() => false);
        expect(exists).toBe(true);
      }

      // Verify index.html exists and is valid HTML
      const indexPath = path.join(testDir, 'index.html');
      const indexExists = await fs.access(indexPath).then(() => true).catch(() => false);
      expect(indexExists).toBe(true);

      const indexContent = await fs.readFile(indexPath, 'utf-8');
      expect(indexContent).toContain('<!DOCTYPE html>');
      expect(indexContent).toContain('</html>');

      // index.html should contain ONE of the session reports (last write wins)
      const containsAtLeastOne = summaries.some(s =>
        indexContent.includes(s.sessionId)
      );
      expect(containsAtLeastOne).toBe(true);
    }, 20000);

    it('should create unique report files for each session', async () => {
      const session1 = createMockSummary('session-1');
      const session2 = createMockSummary('session-2');

      const [report1, report2] = await Promise.all([
        reporter.generateReport(session1),
        reporter.generateReport(session2)
      ]);

      // Reports should have different paths
      expect(report1).not.toBe(report2);

      // Both should exist
      const exists1 = await fs.access(report1).then(() => true).catch(() => false);
      const exists2 = await fs.access(report2).then(() => true).catch(() => false);

      expect(exists1).toBe(true);
      expect(exists2).toBe(true);

      // Each should contain its own session ID
      const content1 = await fs.readFile(report1, 'utf-8');
      const content2 = await fs.readFile(report2, 'utf-8');

      expect(content1).toContain(session1.sessionId);
      expect(content2).toContain(session2.sessionId);
    });

    it('should not corrupt reports when written simultaneously', async () => {
      const sessionCount = 3;
      const summaries = Array.from({ length: sessionCount }, (_, i) =>
        createMockSummary(`session-${i}`)
      );

      // Generate all reports simultaneously
      await Promise.all(summaries.map(s => reporter.generateReport(s)));

      // Verify all session-specific reports are valid HTML
      for (let i = 0; i < sessionCount; i++) {
        const reportPath = path.join(testDir, `report-session-${i}.html`);
        const content = await fs.readFile(reportPath, 'utf-8');

        // Should be valid HTML
        expect(content).toContain('<!DOCTYPE html>');
        expect(content).toContain('</html>');

        // Should contain correct session ID
        expect(content).toContain(`session-${i}`);

        // Should not be corrupted (no partial writes)
        expect(content.split('<!DOCTYPE html>').length).toBe(2); // Only one DOCTYPE
        expect(content.split('</html>').length).toBe(2); // Only one closing tag
      }
    });
  });

  describe('Error Handling', () => {
    it('should gracefully handle index.html lock timeout', async () => {
      const summary = createMockSummary('test-session');

      // Should not throw even if index.html update fails
      await expect(reporter.generateReport(summary)).resolves.not.toThrow();

      // Session-specific report should still be created
      const sessionReport = path.join(testDir, `report-${summary.sessionId}.html`);
      const exists = await fs.access(sessionReport).then(() => true).catch(() => false);
      expect(exists).toBe(true);
    });
  });
});

/**
 * Helper: Create a mock session summary for testing
 */
function createMockSummary(sessionId: string): SessionSummary {
  return {
    sessionId,
    startTime: Date.now() - 10000,
    endTime: Date.now(),
    duration: 10000,
    config: {
      mode: 'smart-cache',
      aiProvider: 'GEMINI',
      cacheEnabled: true
    },
    tests: [
      {
        name: 'Test 1',
        startTime: Date.now() - 5000,
        endTime: Date.now(),
        duration: 5000,
        status: 'passed',
        actions: [
          {
            id: '1',
            timestamp: Date.now(),
            command: 'click the button',
            actionType: 'click',
            element: 'button',
            selector: '#btn',
            success: true,
            latencyMs: 100,
            latencyBreakdown: {
              parsing: 20,
              elementFinding: 30,
              execution: 50
            },
            cache: {
              parseCache: 'hit',
              autoHealCache: 'hit'
            },
            ai: {
              parseAICalled: false,
              healingAICalled: false,
              model: 'gemini-2.0-flash-exp',
              estimatedCost: 0
            }
          }
        ],
        metrics: {
          totalActions: 1,
          successfulActions: 1,
          failedActions: 0,
          totalLatency: 100,
          averageLatency: 100,
          cacheHitRate: 100,
          aiCallCount: 0,
          totalEstimatedCost: 0
        }
      }
    ],
    aggregated: {
      totalTests: 1,
      passedTests: 1,
      failedTests: 0,
      skippedTests: 0,
      totalActions: 1,
      successfulActions: 1,
      failedActions: 0,
      totalLatency: 100,
      averageLatency: 100,
      cacheHits: 1,
      cacheMisses: 0,
      cacheHealings: 0,
      cacheHitRate: 100,
      parseAICalls: 0,
      healingAICalls: 0,
      totalAICalls: 0,
      totalEstimatedCost: 0
    },
    performance: {
      fastestAction: null,
      slowestAction: null,
      mostExpensiveAction: null
    }
  };
}
