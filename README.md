# Vibe Framework

[![npm version](https://img.shields.io/npm/v/@sdetsanjay/vibe-framework.svg)](https://www.npmjs.com/package/@sdetsanjay/vibe-framework)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Natural language automation framework with AI-powered element healing for Playwright.

Built on [@sdetsanjay/autoheal-locator](https://www.npmjs.com/package/@sdetsanjay/autoheal-locator) for intelligent element detection and self-healing capabilities.

## Features

- 🗣️ **True Natural Language**: Write commands ANY way you want
- 🤖 **Multi-AI Provider Support**: OpenAI, Gemini, Anthropic, DeepSeek, Groq, Grok, and local models
- ⚡ **Smart Caching**: 95-99% latency reduction on cached runs
- 🎯 **Training Mode**: Record once, replay forever in CI/CD without AI calls
- 🔧 **Self-Healing**: Automatically adapts to UI changes via autoheal-locator
- 🎥 **Video Recording**: Playwright-compatible video recording with HTML embedding
- 🚀 **Parallel Testing**: Thread-safe execution with file locking (2.5x-3.5x speedup)
- 📊 **Rich Reporting**: HTML, JSON, CSV, and console reports

## Installation

```bash
npm install @sdetsanjay/vibe-framework playwright
```

**Note**: Playwright is a peer dependency and must be installed separately.

## Quick Start

```typescript
import { chromium } from 'playwright';
import { vibe } from '@sdetsanjay/vibe-framework';

// Set your API key (or use environment variable)
process.env.GROQ_API_KEY = 'your-groq-api-key';

const browser = await chromium.launch();
const page = await browser.newPage();

// Create Vibe session
const session = vibe()
  .withPage(page)
  .withMode('smart-cache')
  .withAIProvider('GROQ', process.env.GROQ_API_KEY!)
  .build();

// Use natural language!
await page.goto('https://www.saucedemo.com');
await session.do('type "standard_user" into username field');
await session.do('type "secret_sauce" into password field');
await session.do('click the login button');

const result = await session.check('verify products page loaded');
console.log('Login successful:', result.success);

await session.shutdown();
await browser.close();
```

## Complete Examples

See the [vibe-framework-demo](https://github.com/SanjayPG/vibe-framework-demo) repository for complete working examples, including:
- SauceDemo login flow
- Parallel test execution
- Multiple AI provider configurations
- Training mode examples

## Environment Setup

Create a `.env` file in your project root:

```env
# Choose one or more providers:
GROQ_API_KEY=your_key_here          # Groq (Extremely fast, free tier)
GEMINI_API_KEY=your_key_here        # Google Gemini (Free tier available)
OPENAI_API_KEY=your_key_here        # OpenAI (GPT-4, GPT-4o-mini)
ANTHROPIC_API_KEY=your_key_here     # Anthropic Claude
DEEPSEEK_API_KEY=your_key_here      # DeepSeek
GROK_API_KEY=your_key_here          # Grok

# Or use local models (FREE!)
AUTOHEAL_AI_PROVIDER=LOCAL
LOCAL_MODEL_URL=https://your-tunnel.trycloudflare.com
```

**Recommended for getting started:**
- **Fast & Free**: [Groq](https://console.groq.com/) - Fastest, generous free tier
- **Free Tier**: [Gemini](https://aistudio.google.com/app/apikey) - Google's AI

## Usage with Playwright Test

```typescript
import { test } from '@playwright/test';
import { vibe } from '@sdetsanjay/vibe-framework';
import dotenv from 'dotenv';

dotenv.config();

test('Login to application', async ({ page }) => {
  const session = vibe()
    .withPage(page)
    .withMode('smart-cache')
    .withAIProvider('GROQ', process.env.GROQ_API_KEY!)
    .withReporting({ html: true, console: true })
    .build();

  await page.goto('https://www.saucedemo.com');

  await session.do('type "standard_user" into username field');
  await session.do('type "secret_sauce" into password field');
  await session.do('click the login button');

  const result = await session.check('verify products page loaded');
  console.log('Login successful:', result.success);

  await session.shutdown();
});
```

Run tests with:
```bash
npx playwright test
```

## Parallel Testing

Vibe Framework is thread-safe and supports parallel execution:

```bash
# Run with 4 workers (2.5x-3.5x faster)
npx playwright test --workers=4

# Run with 2 workers (safer for CI)
npx playwright test --workers=2
```

File-based locking prevents cache race conditions during parallel execution.

## Configuration Modes

### Smart Cache (Default)
Best for development and most test scenarios.

```typescript
const session = vibe()
  .withPage(page)
  .withMode('smart-cache')
  .build();
```

### Pure AI (Like ZeroStep)
Fresh AI analysis every time - most reliable for dynamic content.

```typescript
const session = vibe()
  .withPage(page)
  .withMode('pure-ai')
  .build();
```

### Training Mode (for CI/CD)
Record selectors once, replay without AI calls.

```typescript
// Local: Record
const session = vibe()
  .withPage(page)
  .startTraining('my-test-suite')
  .build();

await session.do("click login");
await session.stopTraining();

// CI/CD: Replay
const ciSession = vibe()
  .withPage(page)
  .loadTrainingData('my-test-suite')
  .build();

await ciSession.do("click login"); // Instant, no AI call!
```

### Video Recording (Playwright-Compatible)
Record videos of your tests with multiple modes.

```typescript
// Create browser context with video
const browser = await chromium.launch();
const context = await browser.newContext({
  recordVideo: {
    dir: './videos',
    size: { width: 1280, height: 720 }
  }
});
const page = await context.newPage();

// Configure Vibe with video recording
const session = vibe()
  .withPage(page)
  .withVideo('retain-on-failure', {  // Keep only failed tests
    dir: './vibe-reports/videos'
  })
  .withReporting({
    html: true,
    includeVideos: true  // Embed in HTML report
  })
  .build();

// Run tests - videos automatically saved and embedded
await session.goto('https://example.com');
await session.do('click login');
await session.shutdown();
await context.close();
```

**Video Modes:**
- `'on'` - Record all tests
- `'retain-on-failure'` - Keep only failed tests
- `'on-first-retry'` - Record only retries
- `'off'` - No recording (default)

See [VIDEO_RECORDING.md](./VIDEO_RECORDING.md) for complete documentation.

## API Reference

### VibeBuilder (Factory)

Create a vibe session using the builder pattern:

```typescript
const session = vibe()
  .withPage(page)                    // Required: Playwright page
  .withMode('smart-cache')           // Optional: 'pure-ai', 'smart-cache', or custom
  .withAIProvider('GROQ', apiKey)    // Required: AI provider and key
  .withReporting({ html: true })     // Optional: Enable reports
  .withVideo('retain-on-failure')    // Optional: Video recording
  .build();
```

### VibeSession Methods

#### `do(command: string): Promise<VibeResult>`
Execute any natural language action.

```typescript
await session.do("click the login button");
await session.do("type hello@example.com into email");
await session.do("select USA from country dropdown");
```

#### `check(assertion: string): Promise<VibeResult>`
Verify a condition.

```typescript
await session.check("verify dashboard is loaded");
await session.check("the success message is visible");
```

#### `extract(description: string): Promise<string>`
Extract text or value from an element.

```typescript
const name = await session.extract("user name from header");
const price = await session.extract("total price from cart");
```

#### `find(description: string): Promise<Locator>`
Find an element and return its Playwright locator.

```typescript
const loginButton = await session.find("login button");
await loginButton.click();
```

#### `waitUntil(condition: string): Promise<VibeResult>`
Wait for a condition to be met.

```typescript
await session.waitUntil("loading spinner disappears");
```

#### `shutdown(): Promise<void>`
Clean up and generate reports (call at end of test).

```typescript
await session.shutdown();
```

### Natural Language Examples

```typescript
// Clicking - any phrasing works!
await session.do("click the login button");
await session.do("press the submit button");
await session.do("hit that blue checkout button");

// Typing
await session.do("type hello@example.com into email");
await session.do("fill the password with secret123");
await session.do("enter John in the first name field");

// Selecting
await session.do("select USA from country dropdown");
await session.do("choose Premium from plan options");

// Navigation
await session.do("click on the Settings link");
await session.do("navigate to the Profile tab");
```

## Supported AI Providers

| Provider | Speed | Cost | Free Tier | Best For |
|----------|-------|------|-----------|----------|
| **Groq** | ⚡⚡⚡⚡⚡ Fastest | Free | ✅ Generous | Development, CI/CD |
| **Gemini** | ⚡⚡⚡⚡ Very Fast | ~$0.03/100 cmds | ✅ Yes | Development |
| **OpenAI** | ⚡⚡⚡ Fast | ~$0.10/100 cmds | ❌ No | Production |
| **DeepSeek** | ⚡⚡⚡ Fast | ~$0.01/100 cmds | ✅ Yes | Budget-friendly |
| **Anthropic** | ⚡⚡⚡ Fast | ~$0.30/100 cmds | ❌ No | High accuracy |

**Cost with caching**: Subsequent runs cost $0 regardless of provider!

## Documentation

- [API Reference](./docs/API.md) - Complete API documentation
- [Parallel Testing Guide](./docs/PARALLEL_TESTING.md) - Thread-safe parallel execution
- [Video Recording Guide](./VIDEO_RECORDING.md) - Video recording configuration
- [Demo Repository](https://github.com/SanjayPG/vibe-framework-demo) - Working examples

## Requirements

- Node.js 16+
- Playwright 1.40+ (peer dependency)
- TypeScript 5.2+ (for TypeScript projects)
- AI API key (Groq or Gemini recommended for free tiers)

## Dependencies

This package automatically installs:
- [@sdetsanjay/autoheal-locator](https://www.npmjs.com/package/@sdetsanjay/autoheal-locator) - AI-powered element healing
- dotenv - Environment variable management
- proper-lockfile - Thread-safe file locking
- uuid - Unique identifier generation

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## Author

Sanjay Gorai

## License

MIT - see [LICENSE](./LICENSE) file for details
