# Consolidated Reports - Parallel Test Results

## Overview

When running tests in **parallel mode**, each worker generates its own individual session report. The **Consolidated Reporter** merges all parallel worker results into a single comprehensive HTML report that provides:

- **Aggregated metrics** across all workers
- **Individual session summaries** for each worker
- **Performance comparisons** between workers
- **Combined statistics** (tests, actions, cache, AI, locks)
- **Links to detailed reports** for each session

## Quick Start

### 1. Run Tests in Parallel

```bash
# Run with 4 workers
npm run test:pw:parallel

# Or specify worker count manually
npx playwright test --workers=4
```

This generates individual session reports in `vibe-reports/`:
```
vibe-reports/
├── report-{session-1}.html    # Worker 1 report
├── report-{session-2}.html    # Worker 2 report
├── report-{session-3}.html    # Worker 3 report
├── report-{session-4}.html    # Worker 4 report
├── session-{session-1}.json   # Worker 1 data
├── session-{session-2}.json   # Worker 2 data
...
```

### 2. Generate Consolidated Report

```bash
# Using npm script (recommended)
npm run report:consolidated

# Or directly
npx ts-node scripts/generate-consolidated-report.ts
```

This creates:
```
vibe-reports/
└── consolidated-report.html    # ← Merged view of all workers
```

### 3. View the Report

Open `vibe-reports/consolidated-report.html` in your browser to see:

✅ **Overall Summary** - Total tests, pass rate, actions, etc.
✅ **Worker Breakdown** - Individual performance for each worker
✅ **Performance Comparison** - Duration and efficiency per worker
✅ **Cache Statistics** - Shared cache hit rates across workers
✅ **AI Usage** - Total API calls and estimated costs
✅ **Lock Performance** - Parallel execution metrics

## Report Structure

### Overall Summary Section

Shows aggregated metrics across all workers:

| Metric | Description |
|--------|-------------|
| **Total Tests** | Combined test count from all workers |
| **Pass Rate** | Overall success percentage |
| **Total Actions** | Sum of all actions executed |
| **Parallel Workers** | Number of workers used |
| **Cache Performance** | Combined cache hit rate |
| **AI Calls** | Total API calls and estimated cost |
| **Lock Performance** | Parallel execution overhead |

### Individual Worker Sessions Table

| Column | Description |
|--------|-------------|
| **Worker #** | Worker identifier (1, 2, 3, ...) |
| **Session ID** | Unique session identifier |
| **Tests** | Passed/Total for this worker |
| **Actions** | Successful/Total actions |
| **Duration** | Worker execution time |
| **Cache Hit Rate** | Worker-specific cache performance |
| **Status** | PASSED/FAILED badge |
| **Reports** | Links to HTML/JSON/CSV reports |

### Performance Breakdown

Visual cards showing each worker's:
- Execution duration
- Number of tests
- Number of actions
- Average latency

## Metrics Explained

### Aggregated Test Metrics

```
Total Tests: 20
├── Passed: 18 (90%)
├── Failed: 2 (10%)
└── Skipped: 0 (0%)
```

**Calculation:** Sum of all tests across all workers.

### Aggregated Action Metrics

```
Total Actions: 150
├── Successful: 145 (96.67%)
└── Failed: 5 (3.33%)
```

**Calculation:** Sum of all actions executed by all workers.

### Cache Performance

```
Cache Hit Rate: 85.5%
├── Hits: 120
├── Misses: 20
└── Total Operations: 140
```

**Calculation:** Total cache hits / total cache operations across all workers.

**Note:** Workers share the cache, so later workers benefit from entries cached by earlier workers.

### AI Usage

```
Total AI Calls: 45
Estimated Cost: $0.000540
```

**Calculation:** Sum of all OpenAI API calls and costs across all workers.

### Lock Performance (Parallel Mode)

```
Lock Acquisitions: 250
Timeouts: 2 (0.8%)
Avg Wait Time: 15.3ms
Status: HEALTHY
```

**Calculation:** Aggregated lock statistics from parallel execution.

**Status Levels:**
- 🟢 **HEALTHY** - Timeout rate < 1%
- 🟡 **CAUTION** - Timeout rate 1-5%
- 🔴 **WARNING** - Timeout rate > 5%

## Advanced Usage

### Custom Output Directory

```bash
# Generate consolidated report from custom directory
npx ts-node scripts/generate-consolidated-report.ts ./custom-reports
```

### Programmatic Usage

```typescript
import { generateConsolidatedReport } from './src/reporting/ConsolidatedReporter';

async function createReport() {
  const reportPath = await generateConsolidatedReport('./vibe-reports');
  console.log(`Report created: ${reportPath}`);
}

createReport();
```

### Integration with CI/CD

**Example GitHub Actions:**

```yaml
- name: Run Parallel Tests
  run: npm run test:pw:parallel

- name: Generate Consolidated Report
  run: npm run report:consolidated

- name: Upload Report
  uses: actions/upload-artifact@v3
  with:
    name: vibe-consolidated-report
    path: vibe-reports/consolidated-report.html
```

## Workflow Example

### Typical Workflow

```bash
# 1. Run tests in parallel (4 workers)
npm run test:pw:parallel

# Output:
# ✓ 2 tests passed (Worker 1)
# ✓ 3 tests passed (Worker 2)
# ✓ 2 tests passed (Worker 3)
# ✓ 1 test passed (Worker 4)

# 2. Generate consolidated report
npm run report:consolidated

# Output:
# ✅ Consolidated report generated: ./vibe-reports/consolidated-report.html
#    Combined 4 session(s) into single report

# 3. Open report
start vibe-reports/consolidated-report.html  # Windows
open vibe-reports/consolidated-report.html   # macOS
xdg-open vibe-reports/consolidated-report.html  # Linux
```

### What You'll See

**Before Consolidation:**
```
vibe-reports/
├── index.html                    # Latest worker report
├── report-{session-1}.html       # Worker 1
├── report-{session-2}.html       # Worker 2
├── report-{session-3}.html       # Worker 3
└── report-{session-4}.html       # Worker 4
```

**After Consolidation:**
```
vibe-reports/
├── consolidated-report.html      # ← MERGED VIEW (all workers)
├── index.html                    # Latest worker report
├── report-{session-1}.html       # Worker 1 (linked from consolidated)
├── report-{session-2}.html       # Worker 2 (linked from consolidated)
├── report-{session-3}.html       # Worker 3 (linked from consolidated)
└── report-{session-4}.html       # Worker 4 (linked from consolidated)
```

## Benefits

### Single Source of Truth
- **One report** instead of N worker reports
- Easy to share with stakeholders
- Quick overview of entire test run

### Performance Insights
- Compare worker efficiency
- Identify slow workers
- Detect load imbalances

### Cache Optimization
- See shared cache effectiveness
- Understand cache hit rates across workers
- Validate parallel cache sharing

### Cost Tracking
- Total AI API costs across all workers
- Identify expensive test scenarios
- Budget tracking for CI runs

### Troubleshooting
- Quickly find failed workers
- Navigate to detailed worker reports
- Analyze lock contention issues

## Comparison: Individual vs Consolidated

| Feature | Individual Reports | Consolidated Report |
|---------|-------------------|---------------------|
| **Workers shown** | 1 worker per file | All workers in one file |
| **Aggregated metrics** | ❌ No | ✅ Yes |
| **Performance comparison** | ❌ Manual | ✅ Automatic |
| **Navigation** | N separate files | 1 file with links |
| **CI artifact** | Multiple files | Single file |
| **Share with team** | Confusing | Clear |
| **File size** | 100KB - 1MB each | 10KB (compact) |

## Troubleshooting

### No Session Files Found

**Error:**
```
Error: No session files found to consolidate
```

**Solution:**
```bash
# Run tests first to generate session reports
npm run test:pw:parallel

# Then generate consolidated report
npm run report:consolidated
```

### Missing Individual Reports

**Issue:** Consolidated report shows workers, but individual report links are broken.

**Cause:** Session HTML files were deleted.

**Solution:** Keep all `report-{sessionId}.html` files in the same directory as `consolidated-report.html`.

### Outdated Metrics

**Issue:** Consolidated report doesn't show latest test run.

**Cause:** Old session JSON files still present.

**Solution:**
```bash
# Clean old reports
rm -rf vibe-reports/session-*.json vibe-reports/report-*.html

# Run fresh test
npm run test:pw:parallel

# Generate new consolidated report
npm run report:consolidated
```

## File Reference

| File | Purpose |
|------|---------|
| `src/reporting/ConsolidatedReporter.ts` | Core implementation |
| `scripts/generate-consolidated-report.ts` | CLI script |
| `vibe-reports/consolidated-report.html` | Generated report |
| `vibe-reports/session-{id}.json` | Source data (per worker) |

## Next Steps

- ✅ Run tests in parallel: `npm run test:pw:parallel`
- ✅ Generate consolidated report: `npm run report:consolidated`
- ✅ View report: Open `vibe-reports/consolidated-report.html`
- 📖 See also: [PARALLEL_TESTING.md](./PARALLEL_TESTING.md)
