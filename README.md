# OTA Trip Guide Site

## Commands

All commands run from this directory.

| Command | Action |
| :--- | :--- |
| `npm run dev` | Start the Astro dev server |
| `npm run build` | Build the production site |
| `npm run preview` | Preview the built site |
| `npm run ga4:daily` | Analyze the last 14 complete days |
| `npm run ga4:weekly` | Analyze the last 8 complete weeks |
| `npm run ga4:monthly` | Analyze the last 6 complete months |
| `npm run ga4:overview` | Generate day, week, and month reports together |

## GA4 Analysis CLI

The GA4 CLI is implemented in `scripts/ga4/analyze.mjs`. It talks to the Google Analytics Data API directly, so no extra npm package is required.

### 1. Prepare credentials

1. Create a Google service account.
2. Add that service account as at least `Viewer` on the GA4 property.
3. Save the JSON key locally, for example at `./secrets/ga4-service-account.json`.

### 2. Add local config

Copy `ga4.config.example.json` to `ga4.config.json` and set:

- `propertyId`
- `timezone`
- `conversionEvents`
- `focusPages`
- threshold values if the defaults are too sensitive

Copy `.env.example` to `.env` and set:

- `GA4_PROPERTY_ID`
- `GA4_SERVICE_ACCOUNT_KEY_PATH`

### 3. Validate locally

```sh
node scripts/ga4/analyze.mjs --dry-run --granularity day,week,month
```

That prints the exact current and previous windows the CLI will compare.

### 4. Generate a report

```sh
npm run ga4:overview
```

Output files are written to `.ga4-reports/` as both JSON and Markdown.

### Useful flags

```sh
node scripts/ga4/analyze.mjs --stdout
node scripts/ga4/analyze.mjs --granularity week --periods 12
node scripts/ga4/analyze.mjs --conversion-events generate_lead,purchase
node scripts/ga4/analyze.mjs --fail-on-alert
```

`--fail-on-alert` exits with code `2` when a high-severity alert is detected, which is useful in cron or GitHub Actions.
