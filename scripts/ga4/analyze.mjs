#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';

import { analyzeGranularity } from './analytics.mjs';
import { getAccessToken } from './auth.mjs';
import {
  ROOT_DIR,
  getServiceAccountOptions,
  loadConfig,
  parseArgs,
  parseGranularities,
} from './config.mjs';
import { buildDateWindow, summarizeWindow } from './date-ranges.mjs';
import { buildInsights, renderMarkdown } from './insights.mjs';

const HELP_TEXT = `Usage:
  node scripts/ga4/analyze.mjs [options]

Options:
  --granularity day,week,month   Comma-separated buckets to fetch. Default: week
  --periods 8                    Number of buckets per granularity
  --config ./ga4.config.json     Config file path
  --property-id 123456789        Override GA4 property ID
  --timezone Asia/Tokyo          Override report timezone
  --conversion-events a,b        Override conversion event names
  --output-dir .ga4-reports      Output directory for markdown/json
  --format both                  one of: both, json, markdown
  --stdout                       Print markdown report to stdout
  --fail-on-alert                Exit with code 2 when any high-severity alert is found
  --dry-run                      Validate config and print the comparison windows
  --help                         Show this help

Credentials:
  Set GA4_SERVICE_ACCOUNT_KEY_PATH or GA4_SERVICE_ACCOUNT_JSON.
  The service account needs at least Viewer access on the GA4 property.
`;

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    process.stdout.write(HELP_TEXT);
    return;
  }

  const config = await loadConfig({
    configPath: options.configPath,
    cliOptions: options,
  });
  const granularities = parseGranularities(options.granularity);
  const requestedReports = granularities.map((granularity) => {
    const periods = Number.isFinite(options.periods)
      ? options.periods
      : config.defaultPeriods[granularity] ?? config.defaultPeriods.week;

    return {
      granularity,
      periods,
      window: buildDateWindow({
        granularity,
        periods,
        timezone: config.timezone,
      }),
    };
  });

  if (options.dryRun) {
    process.stdout.write(
      `${JSON.stringify(
        {
          configPath: config.configPath,
          propertyId: config.propertyId ?? null,
          timezone: config.timezone,
          conversionEvents: config.conversionEvents,
          windows: requestedReports.map((report) => summarizeWindow(report.window)),
        },
        null,
        2,
      )}\n`,
    );
    return;
  }

  const accessToken = await getAccessToken(getServiceAccountOptions(options));
  const reports = [];
  for (const request of requestedReports) {
    const report = await analyzeGranularity({
      accessToken,
      propertyId: config.propertyId,
      granularity: request.granularity,
      window: request.window,
      config,
    });
    reports.push({
      ...report,
      insights: buildInsights(report, config),
    });
  }

  const generatedAt = new Date().toISOString();
  const payload = {
    siteName: config.siteName,
    generatedAt,
    propertyId: config.propertyId,
    timezone: config.timezone,
    reports,
  };
  const markdown = renderMarkdown({
    siteName: config.siteName,
    generatedAt,
    reports,
    config,
  });

  if (options.stdout) {
    process.stdout.write(`${markdown}\n`);
  }

  if (!options.stdout || options.outputDir) {
    await writeOutputs({
      outputDir: path.resolve(ROOT_DIR, options.outputDir),
      format: options.format,
      payload,
      markdown,
    });
  }

  if (
    options.failOnAlert &&
    reports.some((report) => report.insights.some((insight) => insight.severity === 'high'))
  ) {
    process.exitCode = 2;
  }
}

async function writeOutputs({ outputDir, format, payload, markdown }) {
  await fs.mkdir(outputDir, { recursive: true });
  const stamp = payload.generatedAt.replace(/[:.]/g, '-');
  const writes = [];

  if (format === 'both' || format === 'json') {
    writes.push(
      fs.writeFile(
        path.join(outputDir, `ga4-report-${stamp}.json`),
        `${JSON.stringify(payload, null, 2)}\n`,
        'utf8',
      ),
    );
  }

  if (format === 'both' || format === 'markdown') {
    writes.push(
      fs.writeFile(path.join(outputDir, `ga4-report-${stamp}.md`), `${markdown}\n`, 'utf8'),
    );
  }

  await Promise.all(writes);
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});
