import { readFileSync } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULTS = {
  siteName: 'Website',
  timezone: 'UTC',
  conversionEvents: [],
  defaultPeriods: {
    day: 14,
    week: 8,
    month: 6,
  },
  reportLimits: {
    channels: 8,
    landingPages: 12,
    devices: 4,
  },
  focusPages: [],
  thresholds: {
    sessionsDropRatio: 0.2,
    conversionRateDropRatio: 0.15,
    engagementRateDropPoints: 0.08,
    mobileVsDesktopRateRatio: 0.7,
    minChannelSessionShare: 0.1,
    minLandingPageSessions: 30,
    landingPageRateGapRatio: 0.3,
  },
};

export const ROOT_DIR = fileURLToPath(new URL('../../', import.meta.url));

export function loadDotEnv(envPath) {
  try {
    const contents = readFileSync(envPath, 'utf8');
    for (const rawLine of contents.split(/\r?\n/u)) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) {
        continue;
      }
      const separatorIndex = line.indexOf('=');
      if (separatorIndex === -1) {
        continue;
      }
      const key = line.slice(0, separatorIndex).trim();
      let value = line.slice(separatorIndex + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!(key in process.env)) {
        process.env[key] = value;
      }
    }
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }
}

export async function loadConfig({ configPath, cliOptions = {} }) {
  loadDotEnv(path.resolve(ROOT_DIR, '.env'));

  const resolvedConfigPath = configPath
    ? path.resolve(process.cwd(), configPath)
    : path.resolve(ROOT_DIR, 'ga4.config.json');

  let fileConfig = {};
  try {
    const raw = await fs.readFile(resolvedConfigPath, 'utf8');
    fileConfig = JSON.parse(raw);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw new Error(`Failed to read config at ${resolvedConfigPath}: ${error.message}`);
    }
  }

  const config = mergeConfigs(DEFAULTS, fileConfig);
  config.siteName = cliOptions.siteName || config.siteName;
  config.propertyId =
    cliOptions.propertyId ||
    process.env.GA4_PROPERTY_ID ||
    process.env.GOOGLE_ANALYTICS_PROPERTY_ID ||
    config.propertyId;
  config.timezone = cliOptions.timezone || process.env.GA4_TIMEZONE || config.timezone;
  config.conversionEvents = normalizeStringList(
    cliOptions.conversionEvents ?? config.conversionEvents,
  );
  config.focusPages = normalizeStringList(config.focusPages);

  if (!config.propertyId && !cliOptions.dryRun) {
    throw new Error(
      'Missing GA4 property ID. Set GA4_PROPERTY_ID in .env or ga4.config.json, or pass --property-id.',
    );
  }

  return {
    ...config,
    configPath: resolvedConfigPath,
  };
}

export function getServiceAccountOptions(cliOptions = {}) {
  return {
    keyPath:
      cliOptions.serviceAccountKeyPath ||
      process.env.GA4_SERVICE_ACCOUNT_KEY_PATH ||
      process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH,
    json:
      cliOptions.serviceAccountJson ||
      process.env.GA4_SERVICE_ACCOUNT_JSON ||
      process.env.GOOGLE_SERVICE_ACCOUNT_JSON,
  };
}

export function parseArgs(argv) {
  const options = {
    granularity: 'week',
    outputDir: '.ga4-reports',
    format: 'both',
    failOnAlert: false,
    dryRun: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) {
      continue;
    }

    const [flag, inlineValue] = token.split('=', 2);
    const value = inlineValue ?? argv[index + 1];
    const consumesNext = inlineValue === undefined;

    switch (flag) {
      case '--help':
        options.help = true;
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--fail-on-alert':
        options.failOnAlert = true;
        break;
      case '--stdout':
        options.stdout = true;
        break;
      case '--granularity':
        options.granularity = value;
        if (consumesNext) index += 1;
        break;
      case '--periods':
        options.periods = Number(value);
        if (consumesNext) index += 1;
        break;
      case '--config':
        options.configPath = value;
        if (consumesNext) index += 1;
        break;
      case '--output-dir':
        options.outputDir = value;
        if (consumesNext) index += 1;
        break;
      case '--format':
        options.format = value;
        if (consumesNext) index += 1;
        break;
      case '--property-id':
        options.propertyId = value;
        if (consumesNext) index += 1;
        break;
      case '--timezone':
        options.timezone = value;
        if (consumesNext) index += 1;
        break;
      case '--site-name':
        options.siteName = value;
        if (consumesNext) index += 1;
        break;
      case '--conversion-events':
        options.conversionEvents = value.split(',');
        if (consumesNext) index += 1;
        break;
      case '--service-account-key-path':
        options.serviceAccountKeyPath = value;
        if (consumesNext) index += 1;
        break;
      case '--service-account-json':
        options.serviceAccountJson = value;
        if (consumesNext) index += 1;
        break;
      default:
        throw new Error(`Unknown option: ${flag}`);
    }
  }

  const allowedFormats = new Set(['both', 'json', 'markdown']);
  if (!allowedFormats.has(options.format)) {
    throw new Error(`Unsupported format "${options.format}". Use both, json, or markdown.`);
  }

  return options;
}

export function parseGranularities(value) {
  const requested = String(value || 'week')
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
  const allowed = new Set(['day', 'week', 'month']);

  if (requested.length === 0) {
    return ['week'];
  }

  for (const granularity of requested) {
    if (!allowed.has(granularity)) {
      throw new Error(`Unsupported granularity "${granularity}". Use day, week, or month.`);
    }
  }

  return [...new Set(requested)];
}

function mergeConfigs(baseConfig, overrideConfig) {
  if (Array.isArray(baseConfig) || Array.isArray(overrideConfig)) {
    return overrideConfig ?? baseConfig;
  }

  if (typeof baseConfig !== 'object' || baseConfig === null) {
    return overrideConfig ?? baseConfig;
  }

  const merged = { ...baseConfig };
  for (const [key, value] of Object.entries(overrideConfig || {})) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      merged[key] = mergeConfigs(baseConfig[key] ?? {}, value);
    } else {
      merged[key] = value;
    }
  }
  return merged;
}

function normalizeStringList(values) {
  if (!Array.isArray(values)) {
    return [];
  }

  return values
    .map((value) => String(value).trim())
    .filter(Boolean);
}
