#!/usr/bin/env node
/**
 * Generate Consolidated Report - CLI Tool
 *
 * Usage:
 *   npx ts-node scripts/generate-consolidated-report.ts
 *   npx ts-node scripts/generate-consolidated-report.ts ./custom-output-dir
 */

import { generateConsolidatedReport } from '../src/reporting/ConsolidatedReporter';
import * as path from 'path';

async function main() {
  const outputDir = process.argv[2] || './vibe-reports';
  const resolvedDir = path.resolve(outputDir);

  console.log(`\n🔄 Generating consolidated report from: ${resolvedDir}\n`);

  try {
    const reportPath = await generateConsolidatedReport(resolvedDir);
    console.log(`\n✅ Success! Open the report:\n   ${reportPath}\n`);
    process.exit(0);
  } catch (error) {
    console.error(`\n❌ Error: ${(error as Error).message}\n`);
    process.exit(1);
  }
}

main();
