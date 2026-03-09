# Vibe Framework - Export Guide

## Overview

Vibe Framework supports exporting test session data in multiple formats:
- **HTML** - Interactive web-based report with charts and filtering
- **JSON** - Structured data for programmatic analysis
- **CSV** - Spreadsheet-friendly format for data analysis

## Configuration

Enable exports in your Vibe session:

```typescript
const session = vibe()
  .withPage(page)
  .withReporting({
    html: true,  // Default: true
    json: true,  // Default: false
    csv: true,   // Default: false
    outputDir: './vibe-reports'  // Default directory
  })
  .build();
```

## HTML Report

### Features
- **Interactive UI** with search and filtering
- **Collapsible action details** (Playwright-inspired)
- **Screenshot support** with lightbox viewer
- **Performance charts** and metrics visualization
- **Cache analysis** and AI usage statistics
- **Self-contained** - single HTML file with embedded assets

### Location
`vibe-reports/index.html`

### Usage
Open in any modern web browser. No external dependencies required.

## JSON Export

### Features
- **Full session data** in structured format
- **Metadata** - session ID, timestamps, duration
- **Test summaries** - pass/fail status, metrics
- **Action details** - latency breakdown, cache hits, AI usage
- **Performance stats** - fastest/slowest actions, costs
- **Programmatic access** - easy to parse with any JSON library

### Location
`vibe-reports/session-report.json`

### Structure
```json
{
  "exportedAt": "2025-12-29T20:28:06.982Z",
  "exportFormat": "vibe-json-v1",
  "session": {
    "id": "d534020e-6cfc-4064-91ea-c8847142653f",
    "startTime": "2025-12-29T20:27:55.093Z",
    "endTime": "2025-12-29T20:28:06.507Z",
    "durationMs": 11414,
    "durationFormatted": "11.41s",
    "config": {
      "mode": "smart-cache",
      "aiProvider": "GEMINI",
      "cacheEnabled": true
    }
  },
  "summary": {
    "tests": { ... },
    "actions": { ... },
    "performance": { ... },
    "cache": { ... },
    "ai": { ... }
  },
  "tests": [
    {
      "name": "Vibe Session",
      "status": "passed",
      "metrics": { ... },
      "actions": [ ... ]
    }
  ]
}
```

### Use Cases
- **CI/CD Integration** - Parse results in build pipelines
- **Custom Reporting** - Build your own dashboards
- **Trend Analysis** - Track performance over time
- **Data Warehousing** - Store historical test data
- **API Integration** - Send results to external systems

### Example: Parse JSON in Node.js
```typescript
import * as fs from 'fs';

const report = JSON.parse(
  fs.readFileSync('vibe-reports/session-report.json', 'utf-8')
);

console.log(`Session ID: ${report.session.id}`);
console.log(`Duration: ${report.session.durationFormatted}`);
console.log(`Success Rate: ${report.summary.actions.successRate}`);
console.log(`Total Cost: ${report.summary.ai.estimatedCost}`);

// Find slow actions
const slowActions = report.tests[0].actions
  .filter(a => a.latency.totalMs > 2000)
  .map(a => ({ command: a.command, latency: a.latency.totalMs }));

console.log('Slow actions:', slowActions);
```

## CSV Export

### Features
Two CSV files are generated:

#### 1. Action Details (`session-report.csv`)
- **One row per action** with all metrics
- **Columns**: Session ID, Test Name, Command, Action Type, Element, Selector, Success, Latency breakdown, Cache status, AI usage, Cost
- **Easy analysis** in Excel, Google Sheets, or data tools
- **Filtering** by test, action type, success/failure

#### 2. Summary Statistics (`session-summary.csv`)
- **Key-value format** for summary metrics
- **Sections**: Session info, Test summary, Action summary, Performance, Cache, AI usage
- **Quick overview** of session results

### Location
- `vibe-reports/session-report.csv` - Action details
- `vibe-reports/session-summary.csv` - Summary stats

### Action Details Structure
```csv
Session ID,Session Start,Session Mode,AI Provider,Test Name,Test Status,Test Duration (ms),Action ID,Action Timestamp,Command,Action Type,Element,Selector,Success,Error,Total Latency (ms),Parsing Latency (ms),Element Finding Latency (ms),Execution Latency (ms),Parse Cache,AutoHeal Cache,Parse AI Called,Healing AI Called,AI Model,Estimated Cost ($),Has Screenshot
d534020e-...,2025-12-29T20:27:55.093Z,smart-cache,GEMINI,Vibe Session,passed,11412,e8b3b5b3-...,2025-12-29T20:27:56.489Z,type standard_user into username field,FILL,username field,#user-name,true,,1521,1171,319,31,miss,hit,true,false,,0.00001200,false
```

### Summary Structure
```csv
Metric,Value
Session ID,d534020e-6cfc-4064-91ea-c8847142653f
Duration (ms),11414
Mode,smart-cache
AI Provider,GEMINI

Test Summary,
Total Tests,1
Passed Tests,1
Failed Tests,0

Performance,
Average Latency (ms),1333
Fastest Action,click the login button

Cache Performance,
Hit Rate (%),83.33

AI Usage,
Total AI Calls,6
Estimated Cost ($),0.000072
```

### Use Cases
- **Spreadsheet Analysis** - Open in Excel/Sheets for pivot tables and charts
- **Data Science** - Import into Python pandas or R for statistical analysis
- **Reporting** - Create custom reports and dashboards
- **Trend Analysis** - Compare metrics across multiple test runs
- **Cost Tracking** - Monitor AI usage and costs over time

### Example: Analyze CSV in Python
```python
import pandas as pd

# Load action details
df = pd.read_csv('vibe-reports/session-report.csv')

# Average latency by action type
print(df.groupby('Action Type')['Total Latency (ms)'].mean())

# Cache hit rate
cache_hits = len(df[df['AutoHeal Cache'] == 'hit'])
hit_rate = (cache_hits / len(df)) * 100
print(f'Cache hit rate: {hit_rate:.2f}%')

# Total cost
total_cost = df['Estimated Cost ($)'].sum()
print(f'Total cost: ${total_cost:.6f}')

# Actions that required healing
healed = df[df['Healing AI Called'] == True]
print(f'Actions healed: {len(healed)}')
```

### Example: Analyze CSV in Excel
1. Open `session-report.csv` in Excel
2. Insert Pivot Table
3. Rows: Action Type
4. Values: Average of Total Latency (ms), Count of Success
5. Filter: Success = true
6. Create charts for visualization

## Programmatic Export

You can also export programmatically using the exporter classes directly:

```typescript
import { JSONExporter } from './reporting/JSONExporter';
import { CSVExporter } from './reporting/CSVExporter';

const summary = session.getSessionSummary();

// JSON export
const jsonExporter = new JSONExporter();
await jsonExporter.export(summary, './custom-path/report.json');
const jsonString = jsonExporter.exportToString(summary);

// CSV export
const csvExporter = new CSVExporter();
await csvExporter.export(summary, './custom-path/actions.csv');
await csvExporter.exportSummary(summary, './custom-path/summary.csv');
const csvString = csvExporter.exportToString(summary);
```

## File Size Considerations

### Screenshots
- **HTML**: Screenshots embedded as base64 (increases file size)
- **JSON**: Screenshot data excluded by default (set `hasScreenshot` flag instead)
- **CSV**: Only boolean flag indicating if screenshot exists

To reduce file sizes, disable screenshots when not needed:
```typescript
.withReporting({
  includeScreenshots: false  // Reduces HTML size significantly
})
```

### Large Test Runs
For sessions with 100+ actions:
- **HTML**: ~100KB - 5MB (depending on screenshots)
- **JSON**: ~10KB - 500KB
- **CSV**: ~5KB - 100KB (most compact)

## Best Practices

### During Development
```typescript
.withReporting({
  html: true,           // Interactive viewing
  json: false,          // Not needed yet
  csv: false,           // Not needed yet
  includeScreenshots: true  // Debug visually
})
```

### In CI/CD
```typescript
.withReporting({
  html: true,           // For viewing in artifacts
  json: true,           // For build pipeline analysis
  csv: true,            // For trend tracking
  includeScreenshots: false  // Reduce artifact size
})
```

### For Analysis/Reporting
```typescript
.withReporting({
  html: false,          // Don't need interactive view
  json: true,           // Programmatic access
  csv: true,            // Spreadsheet analysis
  includeScreenshots: false
})
```

## Integration Examples

### Store in Database
```typescript
import { JSONExporter } from './reporting/JSONExporter';
import { db } from './database';

const summary = session.getSessionSummary();
const exporter = new JSONExporter();
const data = JSON.parse(exporter.exportToString(summary));

await db.testRuns.insert({
  sessionId: data.session.id,
  timestamp: data.session.startTime,
  duration: data.session.durationMs,
  successRate: parseFloat(data.summary.actions.successRate),
  totalCost: parseFloat(data.summary.ai.estimatedCost.replace('$', '')),
  rawData: data
});
```

### Send to Monitoring Service
```typescript
import { JSONExporter } from './reporting/JSONExporter';
import axios from 'axios';

const summary = session.getSessionSummary();
const exporter = new JSONExporter();
const data = JSON.parse(exporter.exportToString(summary));

await axios.post('https://monitoring.example.com/test-results', {
  sessionId: data.session.id,
  status: data.summary.tests.passRate === '100%' ? 'passed' : 'failed',
  metrics: data.summary
});
```

### Generate Trend Report
```typescript
import { CSVExporter } from './reporting/CSVExporter';
import * as fs from 'fs';

const summary = session.getSessionSummary();
const exporter = new CSVExporter();

// Append to historical data
const csv = exporter.exportToString(summary);
const rows = csv.split('\n').slice(1); // Skip header
fs.appendFileSync('historical-results.csv', rows.join('\n') + '\n');
```

## Troubleshooting

### Exports Not Generated
- Check that reporting is enabled: `.withReporting({ enabled: true })`
- Verify the output directory is writable
- Check console for error messages

### Large File Sizes
- Disable screenshots: `includeScreenshots: false`
- Use CSV instead of HTML for large datasets
- Exclude JSON if not needed

### CSV Not Opening Correctly
- Ensure UTF-8 encoding
- Check for commas in command text (properly escaped)
- Use Excel's "Import Data" feature instead of double-clicking

### JSON Parse Errors
- Verify JSON is valid using online validators
- Check for proper file write completion
- Look for disk space issues

## Future Enhancements

Planned features:
- **XML export** for integration with testing frameworks
- **PDF reports** for executive summaries
- **Database export** direct integration with SQL databases
- **Real-time streaming** export to monitoring services
- **Custom templates** for HTML reports
- **Compression** for large datasets

## Support

For issues or questions about exports:
1. Check this guide
2. Review example files in `examples/export-test.ts`
3. Open an issue on GitHub
4. Join our community discussions
