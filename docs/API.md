# Vibe Framework API Reference

Complete API documentation for @sdetsanjay/vibe-framework.

## Table of Contents

- [Installation](#installation)
- [Factory Function](#factory-function)
- [VibeBuilder](#vibebuilder)
- [VibeSession](#vibesession)
- [Configuration Types](#configuration-types)
- [Models and Enums](#models-and-enums)

---

## Installation

```bash
npm install @sdetsanjay/vibe-framework playwright
```

---

## Factory Function

### `vibe()`

Creates a new VibeBuilder instance for configuring a Vibe session.

**Returns:** `VibeBuilder`

**Example:**
```typescript
import { vibe } from '@sdetsanjay/vibe-framework';

const session = vibe()
  .withPage(page)
  .withAIProvider('GROQ', apiKey)
  .build();
```

---

## VibeBuilder

Fluent builder for creating and configuring VibeSession instances.

### Methods

#### `withPage(page: Page): VibeBuilder`

**Required** - Sets the Playwright page instance.

**Parameters:**
- `page` - Playwright Page object

**Returns:** `VibeBuilder` for chaining

**Example:**
```typescript
const session = vibe()
  .withPage(page)
  .build();
```

#### `withMode(mode: VibeMode): VibeBuilder`

Sets the execution mode for the session.

**Parameters:**
- `mode` - One of:
  - `'pure-ai'` - Fresh AI analysis every time (like ZeroStep)
  - `'smart-cache'` - Cache selectors with AI fallback (default)

**Returns:** `VibeBuilder` for chaining

**Example:**
```typescript
const session = vibe()
  .withPage(page)
  .withMode('smart-cache')
  .build();
```

#### `withAIProvider(provider: AIProvider, apiKey: string): VibeBuilder`

**Required** - Configures the AI provider for natural language processing.

**Parameters:**
- `provider` - AI provider name (see [AIProvider](#aiprovider))
- `apiKey` - API key for the provider

**Returns:** `VibeBuilder` for chaining

**Example:**
```typescript
const session = vibe()
  .withPage(page)
  .withAIProvider('GROQ', process.env.GROQ_API_KEY!)
  .build();
```

#### `withReporting(options: ReportingOptions): VibeBuilder`

Enables reporting features.

**Parameters:**
- `options.html` - Generate HTML report (default: false)
- `options.json` - Generate JSON report (default: false)
- `options.csv` - Generate CSV report (default: false)
- `options.console` - Enable console output (default: true)
- `options.outputDir` - Output directory (default: './vibe-reports')
- `options.includeScreenshots` - Embed screenshots (default: true)
- `options.includeVideos` - Embed videos (default: false)

**Returns:** `VibeBuilder` for chaining

**Example:**
```typescript
const session = vibe()
  .withPage(page)
  .withReporting({
    html: true,
    json: true,
    console: true,
    includeVideos: true
  })
  .build();
```

#### `withVideo(mode: VideoMode, options?: VideoOptions): VibeBuilder`

Configures video recording for test sessions.

**Parameters:**
- `mode` - Video recording mode (see [VideoMode](#videomode))
- `options.dir` - Video output directory (default: './vibe-reports/videos')

**Returns:** `VibeBuilder` for chaining

**Example:**
```typescript
const session = vibe()
  .withPage(page)
  .withVideo('retain-on-failure', { dir: './videos' })
  .build();
```

#### `withCache(type: CacheType, options?: CacheOptions): VibeBuilder`

Configures caching strategy.

**Parameters:**
- `type` - Cache type: `'lru'` or `'file'`
- `options.maxSize` - Maximum cache entries (default: 1000)
- `options.ttl` - Time to live in milliseconds (default: 86400000)
- `options.cacheDir` - Directory for file cache (default: './autoheal-cache')

**Returns:** `VibeBuilder` for chaining

**Example:**
```typescript
const session = vibe()
  .withPage(page)
  .withCache('file', { maxSize: 5000, ttl: 3600000 })
  .build();
```

#### `startTraining(sessionName: string): VibeBuilder`

Enables training mode to record selectors for zero-cost CI/CD replay.

**Parameters:**
- `sessionName` - Unique name for this training session

**Returns:** `VibeBuilder` for chaining

**Example:**
```typescript
// Record selectors locally
const session = vibe()
  .withPage(page)
  .startTraining('login-flow')
  .build();

await session.do('click login button');
await session.stopTraining();
```

#### `loadTrainingData(sessionName: string): VibeBuilder`

Loads previously recorded training data for replay without AI calls.

**Parameters:**
- `sessionName` - Name of the training session to load

**Returns:** `VibeBuilder` for chaining

**Example:**
```typescript
// Replay in CI without AI
const session = vibe()
  .withPage(page)
  .loadTrainingData('login-flow')
  .build();

await session.do('click login button'); // No AI call!
```

#### `build(): VibeSession`

Builds and returns the configured VibeSession.

**Returns:** `VibeSession`

**Throws:** Error if required configuration is missing (page, AI provider)

**Example:**
```typescript
const session = vibe()
  .withPage(page)
  .withAIProvider('GROQ', apiKey)
  .build();
```

---

## VibeSession

Main session interface for natural language automation.

### Methods

#### `do(command: string): Promise<VibeResult>`

Execute any natural language action.

**Parameters:**
- `command` - Natural language description of the action

**Returns:** `Promise<VibeResult>` with execution details

**Example:**
```typescript
await session.do('click the login button');
await session.do('type hello@example.com into email field');
await session.do('select USA from country dropdown');
```

#### `check(assertion: string): Promise<VibeResult>`

Verify a condition or assertion.

**Parameters:**
- `assertion` - Natural language description of what to verify

**Returns:** `Promise<VibeResult>` with verification result

**Example:**
```typescript
const result = await session.check('verify dashboard is loaded');
if (result.success) {
  console.log('Dashboard loaded successfully');
}
```

#### `extract(description: string): Promise<string>`

Extract text or value from an element.

**Parameters:**
- `description` - Natural language description of what to extract

**Returns:** `Promise<string>` with extracted value

**Example:**
```typescript
const userName = await session.extract('user name from header');
const totalPrice = await session.extract('total price from cart');
```

#### `find(description: string): Promise<Locator>`

Find an element and return its Playwright locator.

**Parameters:**
- `description` - Natural language description of the element

**Returns:** `Promise<Locator>` - Playwright locator for further actions

**Example:**
```typescript
const loginButton = await session.find('login button');
await loginButton.click();
await loginButton.hover();
```

#### `waitUntil(condition: string, options?: { timeout?: number }): Promise<VibeResult>`

Wait for a condition to be met.

**Parameters:**
- `condition` - Natural language description of the condition
- `options.timeout` - Maximum wait time in milliseconds (default: 30000)

**Returns:** `Promise<VibeResult>` when condition is met

**Example:**
```typescript
await session.waitUntil('loading spinner disappears');
await session.waitUntil('success message appears', { timeout: 5000 });
```

#### `goto(url: string): Promise<void>`

Navigate to a URL (convenience wrapper for page.goto).

**Parameters:**
- `url` - URL to navigate to

**Returns:** `Promise<void>`

**Example:**
```typescript
await session.goto('https://example.com');
```

#### `stopTraining(): Promise<void>`

Stop training mode and save recorded selectors.

**Returns:** `Promise<void>`

**Example:**
```typescript
await session.startTraining();
// ... perform actions ...
await session.stopTraining(); // Saves training data
```

#### `shutdown(): Promise<void>`

Clean up resources and generate reports. Call at end of test.

**Returns:** `Promise<void>`

**Example:**
```typescript
test('example test', async ({ page }) => {
  const session = vibe().withPage(page).build();

  // ... test actions ...

  await session.shutdown(); // Generate reports
});
```

---

## Configuration Types

### `VibeConfiguration`

Complete configuration interface for VibeSession.

```typescript
interface VibeConfiguration {
  page: Page;
  mode?: VibeMode;
  aiProvider?: AIProvider;
  apiKey?: string;
  cacheType?: CacheType;
  cacheOptions?: CacheOptions;
  executionStrategy?: ExecutionStrategy;
  reporting?: ReportingOptions;
  video?: {
    mode: VideoMode;
    options?: VideoOptions;
  };
  training?: {
    sessionName: string;
    mode: 'record' | 'replay';
  };
}
```

### `ReportingOptions`

```typescript
interface ReportingOptions {
  html?: boolean;           // Generate HTML report
  json?: boolean;           // Generate JSON report
  csv?: boolean;            // Generate CSV report
  console?: boolean;        // Console output
  outputDir?: string;       // Output directory
  includeScreenshots?: boolean;
  includeVideos?: boolean;
}
```

### `CacheOptions`

```typescript
interface CacheOptions {
  maxSize?: number;    // Max cache entries
  ttl?: number;        // Time to live (ms)
  cacheDir?: string;   // Directory for file cache
}
```

### `VideoOptions`

```typescript
interface VideoOptions {
  dir?: string;        // Video output directory
}
```

---

## Models and Enums

### `AIProvider`

Supported AI providers.

```typescript
type AIProvider =
  | 'OPENAI'      // OpenAI (GPT-4, GPT-4o-mini)
  | 'GEMINI'      // Google Gemini
  | 'ANTHROPIC'   // Anthropic Claude
  | 'DEEPSEEK'    // DeepSeek
  | 'GROK'        // xAI Grok
  | 'GROQ'        // Groq (fast inference)
  | 'LOCAL';      // Self-hosted models
```

### `VibeMode`

Execution modes.

```typescript
type VibeMode =
  | 'pure-ai'      // Fresh AI analysis every time
  | 'smart-cache'; // Cache with AI fallback (recommended)
```

### `CacheType`

Cache storage strategies.

```typescript
type CacheType =
  | 'lru'   // In-memory LRU cache
  | 'file'; // File-based persistent cache
```

### `VideoMode`

Video recording modes.

```typescript
type VideoMode =
  | 'on'                  // Record all tests
  | 'off'                 // No recording
  | 'retain-on-failure'   // Keep failed tests only
  | 'on-first-retry';     // Record retries
```

### `ActionType`

Types of actions that can be performed.

```typescript
enum ActionType {
  CLICK = 'click',
  TYPE = 'type',
  SELECT = 'select',
  VERIFY = 'verify',
  EXTRACT = 'extract',
  WAIT = 'wait',
  NAVIGATE = 'navigate'
}
```

### `VibeCommand`

Command model for executed actions.

```typescript
interface VibeCommand {
  id: string;
  command: string;
  actionType: ActionType;
  timestamp: number;
  selector?: string;
  value?: string;
}
```

### `VibeResult`

Result model for action execution.

```typescript
interface VibeResult {
  success: boolean;
  command: VibeCommand;
  executionTime: number;
  error?: string;
  screenshot?: string;
  fromCache?: boolean;
}
```

---

## Complete Example

```typescript
import { test } from '@playwright/test';
import { vibe } from '@sdetsanjay/vibe-framework';
import dotenv from 'dotenv';

dotenv.config();

test('Complete workflow example', async ({ page }) => {
  // Configure session
  const session = vibe()
    .withPage(page)
    .withMode('smart-cache')
    .withAIProvider('GROQ', process.env.GROQ_API_KEY!)
    .withReporting({
      html: true,
      json: true,
      console: true,
      includeVideos: true
    })
    .withVideo('retain-on-failure')
    .withCache('file', { maxSize: 5000 })
    .build();

  // Navigate
  await page.goto('https://www.saucedemo.com');

  // Login
  await session.do('type "standard_user" into username field');
  await session.do('type "secret_sauce" into password field');
  await session.do('click the login button');

  // Verify
  await session.check('verify products page loaded');

  // Extract data
  const firstProduct = await session.extract('name of first product');
  console.log('First product:', firstProduct);

  // Add to cart
  await session.do('click add to cart button for first product');
  await session.check('verify cart badge shows 1 item');

  // Wait for element
  await session.waitUntil('shopping cart icon shows count');

  // Navigate to cart
  await session.do('click shopping cart icon');

  // Verify cart
  const cartTotal = await session.extract('cart total price');
  console.log('Cart total:', cartTotal);

  // Clean up
  await session.shutdown();
});
```

---

## Error Handling

All methods return Promises and may throw errors. Always handle errors appropriately:

```typescript
try {
  await session.do('click non-existent button');
} catch (error) {
  console.error('Action failed:', error);
}

// Or check result
const result = await session.check('verify element exists');
if (!result.success) {
  console.error('Verification failed:', result.error);
}
```

---

## Performance Tips

1. **Use smart-cache mode** for development (default)
2. **Enable training mode** for CI/CD (zero AI cost)
3. **Use file cache** for persistence across runs
4. **Parallel testing** with 4 workers for 2.5x-3.5x speedup
5. **Choose Groq** for fastest AI responses (free tier)
6. **Batch similar actions** to leverage caching

---

## Support

- [GitHub Issues](https://github.com/SanjayPG/vibe-framework/issues)
- [Demo Repository](https://github.com/SanjayPG/vibe-framework-demo)
- [npm Package](https://www.npmjs.com/package/@sdetsanjay/vibe-framework)
