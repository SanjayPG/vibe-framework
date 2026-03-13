import { Page, Locator } from 'playwright';
import { VibeConfiguration } from './VibeConfiguration';
import { VibeResult } from '../models/VibeResult';
import { NLParser } from '../parsing/NLParser';
import { AutoHealBridge } from '../integration/AutoHealBridge';
import { ActionExecutor } from '../actions/ActionExecutor';
import { ActionType } from '../models/ActionType';
import { MetricsCollector } from '../reporting/MetricsCollector';
import { ConsoleReporter } from '../reporting/ConsoleReporter';
import { HTMLReporter } from '../reporting/HTMLReporter';
import { JSONExporter } from '../reporting/JSONExporter';
import { CSVExporter } from '../reporting/CSVExporter';
import { VideoRecorder } from '../utils/VideoRecorder';

/**
 * Main Vibe session for natural language automation
 */
export class VibeSession {
  private page: Page;
  private config: VibeConfiguration;
  private parser: NLParser;
  private autoHeal: AutoHealBridge;
  private executor: ActionExecutor;

  // Reporting
  private metrics: MetricsCollector;
  private reporter: ConsoleReporter;
  private reportingEnabled: boolean;

  // Video recording
  private videoRecorder?: VideoRecorder;

  constructor(page: Page, config: VibeConfiguration) {
    this.page = page;
    this.config = config;

    // Initialize components
    // Use parsingProvider if set (for local models), otherwise use aiProvider
    this.parser = new NLParser({
      aiProvider: config.parsingProvider || config.aiProvider,
      aiApiKey: config.aiApiKey,
      aiModel: config.aiModel,
      enableAIParsing: config.parsing.enableAIParsing,
      confidenceThreshold: config.parsing.confidenceThreshold,
      maxRetries: config.retry.maxRetries,
      localModelConfig: config.localModelConfig
    });

    this.autoHeal = new AutoHealBridge(page, config);
    this.executor = new ActionExecutor(page);

    // Initialize reporting
    this.reportingEnabled = config.reporting?.enabled ?? true;
    this.metrics = new MetricsCollector(
      {
        console: {
          enabled: this.reportingEnabled,
          colors: config.reporting?.colors ?? true,
          progress: true,
          verbose: config.reporting?.verbose ?? false
        }
      },
      {
        mode: config.mode,
        aiProvider: config.aiProvider,
        aiModel: config.aiModel,
        cacheEnabled: config.cache.enabled
      }
    );
    this.reporter = new ConsoleReporter(
      config.reporting?.colors ?? true,
      config.reporting?.verbose ?? false
    );

    // Initialize video recorder if configured
    if (config.video && config.video.mode !== 'off') {
      this.videoRecorder = new VideoRecorder(
        config.video.mode,
        config.video.dir || './vibe-reports/videos'
      );
    }

    // Print session start and start default test
    if (this.reportingEnabled && config.reporting?.console !== false) {
      this.reporter.printSessionStart(this.metrics.getSessionId());
      // Start a default test to collect actions
      this.metrics.startTest('Vibe Session');
    }
  }

  /**
   * Execute a natural language action
   * @param command Natural language command (e.g., "click the login button")
   */
  async do(command: string): Promise<VibeResult> {
    this.validateInput(command);

    // Start tracking action
    if (this.reportingEnabled) {
      this.metrics.startAction(command);
    } else {
      console.log(`\n→ Executing: "${command}"`);
    }

    const actionStartTime = Date.now();
    let screenshotBase64: string | undefined;

    try {
      // Step 1: Parse natural language command
      const parseStart = Date.now();
      const parsedCommand = await this.parser.parse(command);
      const parseEnd = Date.now();

      if (!this.reportingEnabled) {
        console.log(`  Parsed: ${parsedCommand.action} on "${parsedCommand.element}"`);
      }

      // Track parsing metrics
      if (this.reportingEnabled) {
        this.metrics.recordParsing(
          parsedCommand.action,
          parsedCommand.element || command,
          parseEnd - parseStart,
          parsedCommand.metadata?.cacheHit ?? false,
          parsedCommand.metadata?.aiCalled ?? false
        );
      }

      // Step 2: Find element using AutoHeal
      const findStart = Date.now();
      const locator = await this.autoHeal.find(parsedCommand.element || command);
      const findEnd = Date.now();

      // Get AutoHeal metadata
      const autoHealMeta = (locator as any)._autoHealMetadata || {};

      // Track element finding metrics
      if (this.reportingEnabled) {
        this.metrics.recordElementFinding(
          findEnd - findStart,
          autoHealMeta.cacheHit ?? false,
          autoHealMeta.healed ?? false,
          autoHealMeta.selector,
          this.config.aiModel || undefined
        );
      }

      // Step 3: Execute action
      const execStart = Date.now();
      const result = await this.executor.execute(parsedCommand, locator);
      const execEnd = Date.now();

      // Take screenshot on success if enabled
      if (this.config.reporting?.includeScreenshots && this.reportingEnabled) {
        try {
          const screenshot = await this.page.screenshot();
          screenshotBase64 = `data:image/png;base64,${screenshot.toString('base64')}`;
        } catch (screenshotError) {
          // Silently ignore screenshot errors on success
        }
      }

      // Track execution metrics
      if (this.reportingEnabled) {
        this.metrics.recordExecution(execEnd - execStart);
        this.metrics.endAction(true, undefined, screenshotBase64);

        // Print action progress
        const actionMetrics = this.metrics.getLastAction();
        if (actionMetrics) {
          this.reporter.printAction(actionMetrics);
        }
      }

      return result;

    } catch (error: any) {
      // Take screenshot on failure
      if (this.config.screenshotOnFailure || (this.config.reporting?.includeScreenshots && this.reportingEnabled)) {
        try {
          const screenshot = await this.page.screenshot();
          screenshotBase64 = `data:image/png;base64,${screenshot.toString('base64')}`;

          if (!this.reportingEnabled) {
            // Save to file in non-reporting mode
            const fs = await import('fs');
            const screenshotPath = `./screenshots/error-${Date.now()}.png`;
            await fs.promises.mkdir('./screenshots', { recursive: true });
            await fs.promises.writeFile(screenshotPath, screenshot);
            console.log(`  Screenshot saved: ${screenshotPath}`);
          }
        } catch (screenshotError) {
          if (!this.reportingEnabled) {
            console.warn(`  Could not save screenshot: ${screenshotError}`);
          }
        }
      }

      // Track failed action
      if (this.reportingEnabled) {
        this.metrics.endAction(false, error.message, screenshotBase64);

        // Print failed action
        const actionMetrics = this.metrics.getLastAction();
        if (actionMetrics) {
          this.reporter.printAction(actionMetrics);
        }
      } else {
        console.error(`✗ Failed: ${error.message}`);
      }

      throw error;
    }
  }

  /**
   * Verify a condition
   * @param assertion Natural language assertion (e.g., "verify dashboard is loaded")
   */
  async check(assertion: string): Promise<VibeResult> {
    // Prepend "verify" if not present
    const command = assertion.toLowerCase().startsWith('verify')
      ? assertion
      : `verify ${assertion}`;

    return await this.do(command);
  }

  /**
   * Find an element by natural language description
   * @param description Natural language element description
   */
  async find(description: string): Promise<Locator> {
    console.log(`\n→ Finding: "${description}"`);
    return await this.autoHeal.find(description);
  }

  /**
   * Extract text or value from an element
   * @param description Natural language extraction request
   */
  async extract(description: string): Promise<string | null> {
    // Prepend "extract" if not present
    const command = description.toLowerCase().startsWith('extract')
      ? description
      : `extract ${description}`;

    const result = await this.do(command);
    return result.extractedValue || null;
  }

  /**
   * Wait for a condition
   * @param condition Natural language condition
   */
  async waitUntil(condition: string): Promise<VibeResult> {
    // Prepend "wait" if not present
    const command = condition.toLowerCase().startsWith('wait')
      ? condition
      : `wait for ${condition}`;

    return await this.do(command);
  }

  /**
   * Navigate to a URL
   * @param url URL to navigate to
   */
  async goto(url: string): Promise<void> {
    console.log(`\n→ Navigating to: ${url}`);
    await this.page.goto(url);
    console.log(`✓ Navigated to ${url}`);
  }

  /**
   * Count elements matching a description
   * @param description Natural language element description
   * @returns Number of matching elements
   */
  async count(description: string): Promise<number> {
    console.log(`\n→ Counting: "${description}"`);
    const locator = await this.autoHeal.find(description);
    const count = await locator.count();
    console.log(`✓ Found ${count} element(s)`);
    return count;
  }

  /**
   * Find all elements matching a description
   * @param description Natural language element description
   * @returns Array of locators
   */
  async findAll(description: string): Promise<Locator[]> {
    console.log(`\n→ Finding all: "${description}"`);
    const locator = await this.autoHeal.find(description);
    const count = await locator.count();
    const locators = Array.from({ length: count }, (_, i) => locator.nth(i));
    console.log(`✓ Found ${count} element(s)`);
    return locators;
  }

  /**
   * Ask a question about the page and get an answer from AI
   * @param question Natural language question (e.g., "How many products are listed?")
   * @returns Answer as a string
   */
  async ask(question: string): Promise<string> {
    this.validateInput(question, 'Question');

    // Start tracking action
    if (this.reportingEnabled) {
      this.metrics.startAction(`ask: ${question}`);
    } else {
      console.log(`\n→ Asking: "${question}"`);
    }

    try {
      // Get page content for AI analysis
      const contentStart = Date.now();
      const bodyLocator = this.page.locator('body');
      const textContent = await bodyLocator.innerText();
      const contentEnd = Date.now();

      // Use AI to answer the question
      const aiStart = Date.now();
      const answer = await this.askAI(question, textContent);
      const aiEnd = Date.now();

      // Track metrics
      if (this.reportingEnabled) {
        this.metrics.recordParsing('ASK', 'page content', 0, false, false);
        this.metrics.recordElementFinding(contentEnd - contentStart, true, false, 'body');
        this.metrics.recordExecution(aiEnd - aiStart);
        this.metrics.endAction(true);

        // Print action progress
        const actionMetrics = this.metrics.getLastAction();
        if (actionMetrics) {
          this.reporter.printAction(actionMetrics);
        }
      } else {
        console.log(`✓ Answer: "${answer}"`);
      }

      return answer;

    } catch (error: any) {
      // Track failed action
      if (this.reportingEnabled) {
        this.metrics.endAction(false, error.message);

        // Print failed action
        const actionMetrics = this.metrics.getLastAction();
        if (actionMetrics) {
          this.reporter.printAction(actionMetrics);
        }
      } else {
        console.error(`✗ Failed to answer question: ${error.message}`);
      }

      throw error;
    }
  }

  /**
   * Validate input command/question
   */
  private validateInput(input: string, type: string = 'Command'): void {
    if (!input || input.trim().length === 0) {
      throw new Error(`${type} cannot be empty`);
    }

    if (input.length > 2000) {
      throw new Error(
        `${type} too long (${input.length} characters). Maximum is 2000 characters.`
      );
    }
  }

  /**
   * Use AI to answer a question about page content
   */
  private async askAI(question: string, pageText: string): Promise<string> {
    if (!this.config.aiApiKey) {
      throw new Error('AI API key required for ask() method');
    }

    // Build prompt for question answering
    const prompt = `You are analyzing a web page. Answer this question based on the page content.

Page content (text only):
${pageText.substring(0, 10000)}

Question: ${question}

Provide a concise, direct answer. If it's a counting question, return only the number. If it's asking for specific text, return only that text. Be precise and brief.

Answer:`;

    const provider = this.config.aiProvider.toString();

    try {
      // OPENAI
      if (provider === 'OPENAI') {
        const model = this.config.aiModel || 'gpt-4o-mini';
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.config.aiApiKey}`
          },
          body: JSON.stringify({
            model: model,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.1,
            max_tokens: 500
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`OpenAI API error (${response.status}): ${errorText}`);
        }

        const data: any = await response.json();
        if (!data.choices?.[0]?.message) {
          throw new Error(`Invalid OpenAI response: ${JSON.stringify(data)}`);
        }
        return data.choices[0].message.content.trim();
      }

      // ANTHROPIC (Claude)
      else if (provider === 'ANTHROPIC') {
        const model = this.config.aiModel || 'claude-3-5-sonnet-20241022';
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': this.config.aiApiKey,
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model: model,
            max_tokens: 500,
            temperature: 0.1,
            messages: [{ role: 'user', content: prompt }]
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Anthropic API error (${response.status}): ${errorText}`);
        }

        const data: any = await response.json();
        if (!data.content?.[0]?.text) {
          throw new Error(`Invalid Anthropic response: ${JSON.stringify(data)}`);
        }
        return data.content[0].text.trim();
      }

      // DEEPSEEK
      else if (provider === 'DEEPSEEK') {
        const model = this.config.aiModel || 'deepseek-chat';
        const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.config.aiApiKey}`
          },
          body: JSON.stringify({
            model: model,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.1,
            max_tokens: 500
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`DeepSeek API error (${response.status}): ${errorText}`);
        }

        const data: any = await response.json();
        if (!data.choices?.[0]?.message) {
          throw new Error(`Invalid DeepSeek response: ${JSON.stringify(data)}`);
        }
        return data.choices[0].message.content.trim();
      }

      // GROK
      else if (provider === 'GROK') {
        const model = this.config.aiModel || 'grok-beta';
        const response = await fetch('https://api.x.ai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.config.aiApiKey}`
          },
          body: JSON.stringify({
            model: model,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.1,
            max_tokens: 500
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Grok API error (${response.status}): ${errorText}`);
        }

        const data: any = await response.json();
        if (!data.choices?.[0]?.message) {
          throw new Error(`Invalid Grok response: ${JSON.stringify(data)}`);
        }
        return data.choices[0].message.content.trim();
      }

      // GROQ
      else if (provider === 'GROQ') {
        const model = this.config.aiModel || 'llama-3.3-70b-versatile';
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.config.aiApiKey}`
          },
          body: JSON.stringify({
            model: model,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.1,
            max_tokens: 500
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Groq API error (${response.status}): ${errorText}`);
        }

        const data: any = await response.json();
        if (!data.choices?.[0]?.message) {
          throw new Error(`Invalid Groq response: ${JSON.stringify(data)}`);
        }
        return data.choices[0].message.content.trim();
      }

      // GEMINI (default)
      else {
        const { GeminiAIService } = await import('../utils/GeminiAIService');
        const aiService = new GeminiAIService(
          this.config.aiApiKey,
          this.config.aiModel || 'gemini-2.0-flash-exp'
        );

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${aiService['model']}:generateContent?key=${aiService['apiKey']}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                temperature: 0.1,
                maxOutputTokens: 500
              }
            })
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Gemini API error (${response.status}): ${errorText}`);
        }

        const data: any = await response.json();
        if (!data.candidates?.[0]?.content) {
          throw new Error(`Invalid Gemini response: ${JSON.stringify(data)}`);
        }
        return data.candidates[0].content.parts[0].text.trim();
      }
    } catch (error: any) {
      throw new Error(`AI question answering failed: ${error.message}`);
    }
  }

  /**
   * Warm cache by pre-healing elements in background
   * @param descriptions Array of element descriptions to warm
   */
  async warmCache(descriptions: string[]): Promise<void> {
    // TODO: Implement
    console.warn('warmCache not implemented yet');
  }

  /**
   * Auto-warm cache for common elements on current page
   */
  async autoWarmCache(): Promise<void> {
    // TODO: Implement
    console.warn('autoWarmCache not implemented yet');
  }

  /**
   * Stop training and save recorded selectors
   */
  async stopTraining(): Promise<void> {
    // TODO: Implement
    console.warn('stopTraining not implemented yet');
  }

  /**
   * Start a new test section
   * @param testName Name of the test
   */
  startTest(testName: string): void {
    if (!this.reportingEnabled) return;

    // End current test if any
    this.metrics.endTest('passed');

    // Start new test
    this.metrics.startTest(testName);

    if (this.config.reporting?.console !== false) {
      console.log(`\n${'─'.repeat(60)}`);
      console.log(`📝 ${testName}`);
      console.log('─'.repeat(60));
    }
  }

  /**
   * End current test
   * @param status Test status (passed, failed, skipped)
   * @param error Optional error if test failed
   */
  endTest(status: 'passed' | 'failed' | 'skipped' = 'passed', error?: Error): void {
    if (!this.reportingEnabled) return;

    this.metrics.endTest(status, error);

    if (this.config.reporting?.console !== false) {
      const statusIcon = status === 'passed' ? '✅' : status === 'failed' ? '❌' : '⊘';
      const statusText = status.toUpperCase();
      console.log(`\n${statusIcon} Test ${statusText}\n`);
    }
  }

  /**
   * Get execution metrics
   */
  getMetrics(): any {
    if (!this.reportingEnabled) {
      return {};
    }
    return this.metrics.getSessionSummary();
  }

  /**
   * Get latency report
   */
  getLatencyReport(): any {
    if (!this.reportingEnabled) {
      return {};
    }
    const summary = this.metrics.getSessionSummary();
    return {
      averageLatency: summary.aggregated.averageLatency,
      totalLatency: summary.aggregated.totalLatency,
      fastestAction: summary.performance.fastestAction,
      slowestAction: summary.performance.slowestAction,
      latencyByPhase: {
        parsing: summary.aggregated.totalLatency * 0.15, // Rough estimate
        elementFinding: summary.aggregated.totalLatency * 0.75,
        execution: summary.aggregated.totalLatency * 0.10
      }
    };
  }

  /**
   * Get video path if recording is enabled
   * Note: Video is only available after page/context closes
   * @returns Path to the video file or null
   */
  async getVideoPath(): Promise<string | null> {
    if (!this.videoRecorder || !this.videoRecorder.isEnabled()) {
      return null;
    }

    try {
      return await this.videoRecorder.getVideoPath(this.page);
    } catch (error) {
      // Video not available yet
      return null;
    }
  }

  /**
   * Attach video to the last action (for manual video attachment)
   * @param videoPath Path to the video file
   */
  attachVideo(videoPath: string): void {
    if (!this.reportingEnabled) return;

    const lastAction = this.metrics.getLastAction();
    if (lastAction) {
      lastAction.video = videoPath;
    }
  }

  /**
   * Shutdown session and cleanup resources
   */
  async shutdown(): Promise<void> {
    if (this.reportingEnabled) {
      // Try to get video path if available
      if (this.videoRecorder) {
        try {
          const videoPath = await this.getVideoPath();
          if (videoPath) {
            const summary = this.metrics.getSessionSummary();
            const allPassed = summary.aggregated.failedTests === 0;
            const finalVideoPath = await this.videoRecorder.handleVideo(videoPath, allPassed);

            // Attach video to session if kept
            if (finalVideoPath && this.reportingEnabled) {
              // Add video to the last test
              const tests = summary.tests;
              if (tests.length > 0) {
                const lastTest = tests[tests.length - 1];
                if (lastTest.actions.length > 0) {
                  lastTest.actions[lastTest.actions.length - 1].video = finalVideoPath;
                }
              }
            }
          }
        } catch (error) {
          // Video not available, continue without it
        }
      }

      // End the current test (if any)
      this.metrics.endTest('passed');

      // Get and print summary
      const summary = this.metrics.getSessionSummary();
      this.reporter.printSessionSummary(summary);

      // Generate HTML report (if enabled)
      if (this.config.reporting?.html !== false) {
        try {
          const htmlReporter = new HTMLReporter(
            this.config.reporting?.outputDir || './vibe-reports'
          );
          const reportPath = await htmlReporter.generateReport(summary);
          console.log(`\n📊 HTML Report: ${reportPath}`);
        } catch (error: any) {
          console.warn(`\n⚠️  Failed to generate HTML report: ${error.message}`);
        }
      }

      // Generate JSON report (if enabled)
      if (this.config.reporting?.json) {
        try {
          const jsonExporter = new JSONExporter();
          const jsonPath = await jsonExporter.export(summary);
          console.log(`📄 JSON Report: ${jsonPath}`);
        } catch (error: any) {
          console.warn(`⚠️  Failed to generate JSON report: ${error.message}`);
        }
      }

      // Generate CSV reports (if enabled)
      if (this.config.reporting?.csv) {
        try {
          const csvExporter = new CSVExporter();
          const csvPath = await csvExporter.export(summary);
          console.log(`📊 CSV Report: ${csvPath}`);

          // Also export summary CSV
          const summaryPath = await csvExporter.exportSummary(summary);
          console.log(`📋 CSV Summary: ${summaryPath}`);
        } catch (error: any) {
          console.warn(`⚠️  Failed to generate CSV report: ${error.message}`);
        }
      }
    } else {
      console.log('Shutting down Vibe session');
    }

    // Save parse cache to disk
    this.parser.shutdown();
  }
}
