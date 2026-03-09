# Vibe Framework Reporting System

## Overview

The reporting system provides beautiful, real-time console output and comprehensive metrics tracking for Vibe test automation sessions.

## Components

### 1. MetricsCollector (`MetricsCollector.ts`)
Tracks all execution metrics:
- Action-level metrics (latency, success/failure, costs)
- Test-level summaries
- Session-level aggregations
- Cache performance
- AI usage and costs

**Key Methods:**
- `startTest(name)` - Begin tracking a test
- `endTest(status, error?)` - Finalize test metrics
- `startAction(command)` - Begin tracking an action
- `recordParsing(...)` - Track NL parsing phase
- `recordElementFinding(...)` - Track AutoHeal phase
- `recordExecution(...)` - Track action execution phase
- `endAction(success, error?, screenshot?)` - Finalize action metrics
- `getLastAction()` - Get most recent action for display
- `getSessionSummary()` - Get complete session statistics
- `getSessionId()` - Get unique session identifier

### 2. ConsoleReporter (`ConsoleReporter.ts`)
Displays beautiful colored terminal output:
- Session start banner
- Real-time action progress
- Color-coded latency (green/yellow/red)
- Cache status indicators
- Test summaries
- Comprehensive session summary

**Key Methods:**
- `printSessionStart(sessionId)` - Show session banner
- `printTestStart(testName)` - Show test header
- `printAction(action)` - Show action result in real-time
- `printTestEnd(test)` - Show test summary
- `printSessionSummary(summary)` - Show final report

## Integration

Reporting is integrated into `VibeSession`:

```typescript
// Enabled by default
const session = vibe()
  .withPage(page)
  .build();

await session.do('click button');  // Tracked automatically
await session.shutdown();  // Prints summary
```

## Configuration

Via `VibeBuilder`:

```typescript
// Custom configuration
const session = vibe()
  .withReporting({
    enabled: true,
    colors: true,
    verbose: false
  })
  .build();

// Disable reporting
const session = vibe()
  .withoutReporting()
  .build();
```

## Data Models

Defined in `../models/VibeMetrics.ts`:
- `ActionMetrics` - Single action data
- `TestSummary` - Test-level aggregation
- `SessionSummary` - Session-level aggregation
- `ReportConfig` - Configuration options

## Output Example

```
╔════════════════════════════════════════════════════════════╗
║                Vibe Test Session Started                   ║
╚════════════════════════════════════════════════════════════╝
  Session ID: abc-123-def-456

▶ Login Flow Test
  ────────────────────────────────────────────────────────────
  ✓ type username into email field
    Latency: 73ms | Parse✓ | AutoHeal✓
  ✓ click the login button
    Latency: 55ms | Parse✓ | AutoHeal✓

  ✓ PASSED (3000ms)

  Metrics:
    Actions: 2/2 passed
    Average Latency: 64ms
    Cache Hit Rate: 100.0%
    AI Calls: 0
    Estimated Cost: $0.000000

╔════════════════════════════════════════════════════════════╗
║                   Test Session Summary                     ║
╚════════════════════════════════════════════════════════════╝

  Overall Results:
    ✓ Passed: 1
    Success Rate: 100.0%

  Performance:
    Average Latency: 64ms
    ⚡ Fastest: click the login button (55ms)

  Cache Performance:
    Hits: 2
    Hit Rate: 100.0%

  AI Usage:
    Total AI Calls: 0

  Cost Analysis:
    💰 Estimated Total: $0.000000

╔════════════════════════════════════════════════════════════╗
║                   ✓ ALL TESTS PASSED!                      ║
╚════════════════════════════════════════════════════════════╝
```

## Color Coding

- **Green** - Success, fast latency (<50ms)
- **Yellow** - Medium latency (50-200ms), cache miss
- **Red** - Failure, slow latency (>200ms)
- **Blue** - AI healing occurred
- **Cyan** - Headers and titles
- **Dim** - Metadata and labels

## Metrics Tracked

### Per Action
- Command (natural language)
- Action type (CLICK, FILL, etc.)
- Element description
- Success/failure
- Total latency
- Latency breakdown (parsing, finding, execution)
- Cache status (parse cache, AutoHeal cache)
- AI usage (parse AI, healing AI)
- Estimated cost
- Selector (if available)
- Screenshot (on failure)

### Per Test
- Test name
- Start/end time
- Duration
- Status (passed/failed/skipped)
- All actions
- Aggregated metrics

### Per Session
- Session ID
- Start/end time
- Total duration
- Configuration (mode, AI provider)
- All tests
- Aggregated metrics
- Performance insights (fastest, slowest, most expensive)

## Cost Estimation

Costs are estimated based on:
- **Parse AI call**: ~80 tokens ≈ $0.000012
- **Healing AI call**: ~4000 tokens ≈ $0.0004
- Varies by provider (Gemini cheaper than OpenAI)

## Future Enhancements

Planned features:
- HTML reporter (Playwright-style)
- JSON exporter (CI/CD integration)
- CSV exporter (spreadsheet analysis)
- Screenshot/video capture
- Test lifecycle API
- Progress bar
- Live dashboard

## TODOs

High priority:
- [ ] Fix cache hit detection (get from NLParser/AutoHeal)
- [ ] Get actual selector from AutoHeal
- [ ] Pass actual config to session summary

See `../../REPORTING_NEXT_STEPS.md` for detailed roadmap.

## Files

- `MetricsCollector.ts` - Metrics tracking
- `ConsoleReporter.ts` - Terminal output
- `../models/VibeMetrics.ts` - Type definitions
- `README.md` - This file

## Examples

See `../../examples/`:
- `reporting-demo-simple.ts` - Standalone demo
- `reporting-demo.ts` - Full browser demo
- `reporting-integration-test.ts` - Integration test

## Testing

```bash
# Build
npm run build

# Test simple demo
npx ts-node examples/reporting-demo-simple.ts

# Test integration
npx ts-node examples/reporting-integration-test.ts
```

---

**Status:** Phase 1 Complete ✅
**Last Updated:** 2025-12-29
