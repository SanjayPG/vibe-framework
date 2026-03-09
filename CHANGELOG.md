# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-03-09

### Added
- Initial release of @sdetsanjay/vibe-framework
- Natural language automation API with fluent builder pattern
  - `do()` - Execute natural language actions
  - `check()` - Verify conditions
  - `extract()` - Extract text/values from elements
  - `find()` - Find elements by natural language
  - `waitUntil()` - Wait for conditions
- Multi-AI provider support
  - GEMINI (Google Gemini)
  - OPENAI (GPT-4, GPT-4o-mini)
  - ANTHROPIC (Claude)
  - DEEPSEEK (DeepSeek)
  - GROK (xAI Grok)
  - GROQ (Fast inference)
  - LOCAL (Self-hosted models)
- Training mode for zero-cost CI/CD execution
  - Record selectors locally
  - Replay in CI without AI calls
  - Automatic training data management
- Video recording with multiple modes
  - 'on' - Record all tests
  - 'retain-on-failure' - Keep only failed tests
  - 'on-first-retry' - Record retries
  - 'off' - No recording
  - HTML report embedding
- Rich reporting system
  - HTML reports with embedded screenshots and videos
  - JSON reports for programmatic access
  - CSV reports for data analysis
  - Console output with color coding
- Thread-safe parallel testing
  - File-based locking mechanism
  - Safe concurrent cache access
  - 2.5x-3.5x speedup with 4 workers
- Smart caching strategies
  - LRU (Least Recently Used) cache
  - File-based persistent cache
  - Cache validation and invalidation
  - 95-99% latency reduction
- Local model support
  - Localhost integration
  - Cloudflare Tunnel support
  - ngrok tunnel support
  - Ollama compatibility
  - Custom OpenAI-compatible endpoints

### Dependencies
- @sdetsanjay/autoheal-locator: ^1.1.0 - AI-powered element healing
- dotenv: ^17.2.3 - Environment variable management
- proper-lockfile: ^4.1.2 - Thread-safe file operations
- uuid: ^13.0.0 - Unique identifier generation
- Peer: playwright: ^1.40.0 - Browser automation

### Technical Details
- Built with TypeScript 5.2+
- Full type definitions included
- CommonJS module format
- Node.js 16+ required
- Playwright 1.40+ peer dependency

## [Unreleased]

### Future Enhancements
- Support for additional AI providers
- Enhanced reporting with test analytics
- Performance optimization for large test suites
- Advanced caching strategies
