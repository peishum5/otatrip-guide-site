import { formatBucketLabel, formatReadableBucket } from './date-ranges.mjs';

const DATA_API_BASE_URL = 'https://analyticsdata.googleapis.com/v1beta';

export async function analyzeGranularity({
  accessToken,
  propertyId,
  granularity,
  window,
  config,
}) {
  const usesFilteredSessions = config.conversionEvents.length > 0;
  const overviewMetrics = [
    'totalUsers',
    'sessions',
    'engagedSessions',
    'averageSessionDuration',
    'screenPageViews',
  ];
  const { channels, landingPages, devices } = config.reportLimits;

  const [
    currentOverview,
    previousOverview,
    currentSeries,
    previousSeries,
    currentChannels,
    previousChannels,
    currentLandingPages,
    previousLandingPages,
    currentDevices,
    previousDevices,
    currentConversions,
    previousConversions,
    currentChannelConversions,
    previousChannelConversions,
    currentLandingConversions,
    previousLandingConversions,
    currentDeviceConversions,
    previousDeviceConversions,
  ] = await Promise.all([
    runReport({ accessToken, propertyId, dateRange: window.current, metrics: overviewMetrics }),
    runReport({ accessToken, propertyId, dateRange: window.previous, metrics: overviewMetrics }),
    runReport({
      accessToken,
      propertyId,
      dateRange: window.current,
      dimensions: [window.bucketDimension],
      metrics: overviewMetrics,
      orderByDimension: window.bucketDimension,
      limit: 200,
    }),
    runReport({
      accessToken,
      propertyId,
      dateRange: window.previous,
      dimensions: [window.bucketDimension],
      metrics: overviewMetrics,
      orderByDimension: window.bucketDimension,
      limit: 200,
    }),
    runReport({
      accessToken,
      propertyId,
      dateRange: window.current,
      dimensions: ['sessionDefaultChannelGroup'],
      metrics: ['sessions', 'engagedSessions', 'screenPageViews'],
      orderByMetric: 'sessions',
      limit: Math.max(channels * 2, 20),
    }),
    runReport({
      accessToken,
      propertyId,
      dateRange: window.previous,
      dimensions: ['sessionDefaultChannelGroup'],
      metrics: ['sessions', 'engagedSessions', 'screenPageViews'],
      orderByMetric: 'sessions',
      limit: Math.max(channels * 2, 20),
    }),
    runReport({
      accessToken,
      propertyId,
      dateRange: window.current,
      dimensions: ['landingPagePlusQueryString'],
      metrics: ['sessions', 'engagedSessions', 'screenPageViews'],
      orderByMetric: 'sessions',
      limit: Math.max(landingPages * 4, 60),
    }),
    runReport({
      accessToken,
      propertyId,
      dateRange: window.previous,
      dimensions: ['landingPagePlusQueryString'],
      metrics: ['sessions', 'engagedSessions', 'screenPageViews'],
      orderByMetric: 'sessions',
      limit: Math.max(landingPages * 4, 60),
    }),
    runReport({
      accessToken,
      propertyId,
      dateRange: window.current,
      dimensions: ['deviceCategory'],
      metrics: ['sessions', 'engagedSessions', 'screenPageViews'],
      orderByMetric: 'sessions',
      limit: devices,
    }),
    runReport({
      accessToken,
      propertyId,
      dateRange: window.previous,
      dimensions: ['deviceCategory'],
      metrics: ['sessions', 'engagedSessions', 'screenPageViews'],
      orderByMetric: 'sessions',
      limit: devices,
    }),
    fetchConversionSummary({
      accessToken,
      propertyId,
      dateRange: window.current,
      bucketDimension: window.bucketDimension,
      config,
    }),
    fetchConversionSummary({
      accessToken,
      propertyId,
      dateRange: window.previous,
      bucketDimension: window.bucketDimension,
      config,
    }),
    fetchConversionBreakdown({
      accessToken,
      propertyId,
      dateRange: window.current,
      config,
      dimension: 'sessionDefaultChannelGroup',
      limit: Math.max(channels * 2, 20),
    }),
    fetchConversionBreakdown({
      accessToken,
      propertyId,
      dateRange: window.previous,
      config,
      dimension: 'sessionDefaultChannelGroup',
      limit: Math.max(channels * 2, 20),
    }),
    fetchConversionBreakdown({
      accessToken,
      propertyId,
      dateRange: window.current,
      config,
      dimension: 'landingPagePlusQueryString',
      limit: Math.max(landingPages * 4, 60),
    }),
    fetchConversionBreakdown({
      accessToken,
      propertyId,
      dateRange: window.previous,
      config,
      dimension: 'landingPagePlusQueryString',
      limit: Math.max(landingPages * 4, 60),
    }),
    fetchConversionBreakdown({
      accessToken,
      propertyId,
      dateRange: window.current,
      config,
      dimension: 'deviceCategory',
      limit: devices,
    }),
    fetchConversionBreakdown({
      accessToken,
      propertyId,
      dateRange: window.previous,
      config,
      dimension: 'deviceCategory',
      limit: devices,
    }),
  ]);

  const overview = mergeOverview(currentOverview, currentConversions, usesFilteredSessions);
  const previous = mergeOverview(previousOverview, previousConversions, usesFilteredSessions);
  const timeSeries = mergeTimeSeries({
    granularity,
    currentRows: currentSeries.rows,
    previousRows: previousSeries.rows,
    currentConversions: currentConversions.series,
    previousConversions: previousConversions.series,
    usesFilteredSessions,
  });
  const channelRows = buildSegmentComparison({
    currentRows: currentChannels.rows,
    previousRows: previousChannels.rows,
    currentConversions: currentChannelConversions.rows,
    previousConversions: previousChannelConversions.rows,
    totalSessions: overview.sessions,
    normalizeKey: (key) => key || '(not set)',
    labelForKey: (key) => key || '(not set)',
    usesFilteredSessions,
  }).slice(0, channels);
  const landingPageRows = buildSegmentComparison({
    currentRows: currentLandingPages.rows,
    previousRows: previousLandingPages.rows,
    currentConversions: currentLandingConversions.rows,
    previousConversions: previousLandingConversions.rows,
    totalSessions: overview.sessions,
    normalizeKey: normalizeLandingPage,
    labelForKey: normalizeLandingPage,
    usesFilteredSessions,
  }).slice(0, landingPages);
  const deviceRows = buildSegmentComparison({
    currentRows: currentDevices.rows,
    previousRows: previousDevices.rows,
    currentConversions: currentDeviceConversions.rows,
    previousConversions: previousDeviceConversions.rows,
    totalSessions: overview.sessions,
    normalizeKey: (key) => key || '(not set)',
    labelForKey: (key) => key || '(not set)',
    usesFilteredSessions,
  }).slice(0, devices);

  return {
    granularity,
    window,
    overview,
    previous,
    timeSeries,
    channels: channelRows,
    landingPages: landingPageRows,
    devices: deviceRows,
    metadata: {
      conversionMode: usesFilteredSessions ? 'event-filtered-sessions' : 'property-key-events',
      conversionEvents: config.conversionEvents,
    },
  };
}

export async function runReport({
  accessToken,
  propertyId,
  dateRange,
  dimensions = [],
  metrics = [],
  dimensionFilter,
  limit = 1,
  orderByMetric,
  orderByDimension,
}) {
  const body = {
    dateRanges: [
      {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      },
    ],
    dimensions: dimensions.map((name) => ({ name })),
    metrics: metrics.map((name) => ({ name })),
    keepEmptyRows: false,
    limit,
  };

  if (dimensionFilter) {
    body.dimensionFilter = dimensionFilter;
  }

  if (orderByMetric) {
    body.orderBys = [
      {
        metric: {
          metricName: orderByMetric,
        },
        desc: true,
      },
    ];
  }

  if (orderByDimension) {
    body.orderBys = [
      {
        dimension: {
          dimensionName: orderByDimension,
        },
      },
    ];
  }

  const response = await fetch(`${DATA_API_BASE_URL}/properties/${propertyId}:runReport`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`GA4 report failed (${response.status}): ${errorText}`);
  }

  const payload = await response.json();
  const metricHeaders = payload.metricHeaders?.map((header) => header.name) ?? metrics;
  const dimensionHeaders = payload.dimensionHeaders?.map((header) => header.name) ?? dimensions;
  const rows = (payload.rows ?? []).map((row) => toRow(row, dimensionHeaders, metricHeaders));
  const totals = rows.length > 0 ? aggregateRows(rows) : {};

  if (dimensions.length === 0 && rows.length === 1) {
    Object.assign(totals, rows[0].metrics);
  }

  return {
    rows,
    totals,
  };
}

async function fetchConversionSummary({
  accessToken,
  propertyId,
  dateRange,
  bucketDimension,
  config,
}) {
  if (config.conversionEvents.length > 0) {
    const [summary, series] = await Promise.all([
      runReport({
        accessToken,
        propertyId,
        dateRange,
        metrics: ['sessions', 'eventCount'],
        dimensionFilter: eventNameFilter(config.conversionEvents),
      }),
      runReport({
        accessToken,
        propertyId,
        dateRange,
        dimensions: [bucketDimension],
        metrics: ['sessions', 'eventCount'],
        dimensionFilter: eventNameFilter(config.conversionEvents),
        orderByDimension: bucketDimension,
        limit: 200,
      }),
    ]);

    return {
      convertingSessions: summary.totals.sessions ?? 0,
      conversionEvents: summary.totals.eventCount ?? 0,
      series: series.rows.map((row) => ({
        key: Object.values(row.dimensionValues)[0],
        convertingSessions: row.metrics.sessions ?? 0,
        conversionEvents: row.metrics.eventCount ?? 0,
      })),
    };
  }

  const [summary, series] = await Promise.all([
    runReport({
      accessToken,
      propertyId,
      dateRange,
      metrics: ['keyEvents'],
    }),
    runReport({
      accessToken,
      propertyId,
      dateRange,
      dimensions: [bucketDimension],
      metrics: ['keyEvents'],
      orderByDimension: bucketDimension,
      limit: 200,
    }),
  ]);

  return {
    convertingSessions: Number.NaN,
    conversionEvents: summary.totals.keyEvents ?? 0,
    series: series.rows.map((row) => ({
      key: Object.values(row.dimensionValues)[0],
      convertingSessions: Number.NaN,
      conversionEvents: row.metrics.keyEvents ?? 0,
    })),
  };
}

async function fetchConversionBreakdown({
  accessToken,
  propertyId,
  dateRange,
  config,
  dimension,
  limit,
}) {
  if (config.conversionEvents.length > 0) {
    return runReport({
      accessToken,
      propertyId,
      dateRange,
      dimensions: [dimension],
      metrics: ['sessions', 'eventCount'],
      dimensionFilter: eventNameFilter(config.conversionEvents),
      orderByMetric: 'sessions',
      limit,
    });
  }

  return runReport({
    accessToken,
    propertyId,
    dateRange,
    dimensions: [dimension],
    metrics: ['keyEvents'],
    orderByMetric: 'keyEvents',
    limit,
  });
}

function mergeOverview(report, conversionSummary, usesFilteredSessions) {
  const sessions = report.totals.sessions ?? 0;
  const engagedSessions = report.totals.engagedSessions ?? 0;
  const totalUsers = report.totals.totalUsers ?? 0;
  const screenPageViews = report.totals.screenPageViews ?? 0;
  const averageSessionDuration = report.totals.averageSessionDuration ?? 0;
  const conversionRateBase = usesFilteredSessions
    ? conversionSummary.convertingSessions
    : conversionSummary.conversionEvents;

  return {
    totalUsers,
    sessions,
    engagedSessions,
    screenPageViews,
    averageSessionDuration,
    engagementRate: safeDivide(engagedSessions, sessions),
    viewsPerSession: safeDivide(screenPageViews, sessions),
    convertingSessions: conversionSummary.convertingSessions,
    conversionEvents: conversionSummary.conversionEvents,
    conversionRate: safeDivide(conversionRateBase, sessions),
  };
}

function mergeTimeSeries({
  granularity,
  currentRows,
  previousRows,
  currentConversions,
  previousConversions,
  usesFilteredSessions,
}) {
  const currentConversionMap = new Map(currentConversions.map((row) => [row.key, row]));
  const previousConversionMap = new Map(previousConversions.map((row) => [row.key, row]));

  return {
    current: currentRows.map((row) =>
      enrichSeriesRow(
        granularity,
        row,
        currentConversionMap.get(Object.values(row.dimensionValues)[0]),
        usesFilteredSessions,
      ),
    ),
    previous: previousRows.map((row) =>
      enrichSeriesRow(
        granularity,
        row,
        previousConversionMap.get(Object.values(row.dimensionValues)[0]),
        usesFilteredSessions,
      ),
    ),
  };
}

function enrichSeriesRow(granularity, row, conversionRow = {}, usesFilteredSessions) {
  const key = Object.values(row.dimensionValues)[0];
  const sessions = row.metrics.sessions ?? 0;
  const engagedSessions = row.metrics.engagedSessions ?? 0;
  const conversionRateBase = usesFilteredSessions
    ? conversionRow?.convertingSessions
    : conversionRow?.conversionEvents;

  return {
    key,
    label: formatReadableBucket(granularity, key),
    bucket: formatBucketLabel(granularity, key),
    sessions,
    engagedSessions,
    screenPageViews: row.metrics.screenPageViews ?? 0,
    averageSessionDuration: row.metrics.averageSessionDuration ?? 0,
    engagementRate: safeDivide(engagedSessions, sessions),
    conversionEvents: conversionRow?.conversionEvents ?? 0,
    convertingSessions: conversionRow?.convertingSessions,
    conversionRate: safeDivide(conversionRateBase, sessions),
  };
}

function buildSegmentComparison({
  currentRows,
  previousRows,
  currentConversions,
  previousConversions,
  totalSessions,
  normalizeKey,
  labelForKey,
  usesFilteredSessions,
}) {
  const currentMap = aggregateSegmentRows(currentRows, normalizeKey);
  const previousMap = aggregateSegmentRows(previousRows, normalizeKey);
  const currentConversionMap = aggregateSegmentRows(currentConversions, normalizeKey);
  const previousConversionMap = aggregateSegmentRows(previousConversions, normalizeKey);
  const keys = new Set([
    ...currentMap.keys(),
    ...previousMap.keys(),
    ...currentConversionMap.keys(),
    ...previousConversionMap.keys(),
  ]);

  return [...keys]
    .map((key) => {
      const current = currentMap.get(key) ?? emptySegment();
      const previous = previousMap.get(key) ?? emptySegment();
      const currentConversionsRow = currentConversionMap.get(key) ?? emptySegment();
      const previousConversionsRow = previousConversionMap.get(key) ?? emptySegment();
      const currentRateBase = usesFilteredSessions
        ? currentConversionsRow.sessions
        : currentConversionsRow.keyEvents;
      const previousRateBase = usesFilteredSessions
        ? previousConversionsRow.sessions
        : previousConversionsRow.keyEvents;

      return {
        key,
        label: labelForKey(key),
        sessions: current.sessions,
        previousSessions: previous.sessions,
        sessionShare: safeDivide(current.sessions, totalSessions),
        engagementRate: safeDivide(current.engagedSessions, current.sessions),
        previousEngagementRate: safeDivide(previous.engagedSessions, previous.sessions),
        conversionEvents: usesFilteredSessions
          ? currentConversionsRow.eventCount
          : currentConversionsRow.keyEvents,
        previousConversionEvents: usesFilteredSessions
          ? previousConversionsRow.eventCount
          : previousConversionsRow.keyEvents,
        convertingSessions: usesFilteredSessions ? currentConversionsRow.sessions : Number.NaN,
        previousConvertingSessions: usesFilteredSessions
          ? previousConversionsRow.sessions
          : Number.NaN,
        conversionRate: safeDivide(currentRateBase, current.sessions),
        previousConversionRate: safeDivide(previousRateBase, previous.sessions),
      };
    })
    .filter((row) => row.sessions > 0 || row.previousSessions > 0)
    .sort((left, right) => right.sessions - left.sessions);
}

function aggregateSegmentRows(rows = [], normalizeKey) {
  const map = new Map();
  for (const row of rows) {
    const key = normalizeKey(Object.values(row.dimensionValues ?? {})[0]);
    const current = map.get(key) ?? emptySegment();
    map.set(key, {
      sessions: current.sessions + (row.metrics.sessions ?? 0),
      engagedSessions: current.engagedSessions + (row.metrics.engagedSessions ?? 0),
      screenPageViews: current.screenPageViews + (row.metrics.screenPageViews ?? 0),
      eventCount: current.eventCount + (row.metrics.eventCount ?? 0),
      keyEvents: current.keyEvents + (row.metrics.keyEvents ?? 0),
    });
  }
  return map;
}

function aggregateRows(rows) {
  return rows.reduce((totals, row) => {
    for (const [metricName, value] of Object.entries(row.metrics)) {
      totals[metricName] = (totals[metricName] ?? 0) + value;
    }
    return totals;
  }, {});
}

function toRow(row, dimensionHeaders, metricHeaders) {
  const dimensionValues = Object.fromEntries(
    dimensionHeaders.map((header, index) => [header, row.dimensionValues?.[index]?.value ?? '']),
  );
  const metrics = Object.fromEntries(
    metricHeaders.map((header, index) => [header, Number(row.metricValues?.[index]?.value ?? 0)]),
  );
  return { dimensionValues, metrics };
}

function eventNameFilter(eventNames) {
  return {
    filter: {
      fieldName: 'eventName',
      inListFilter: {
        values: eventNames,
      },
    },
  };
}

function normalizeLandingPage(value) {
  if (!value || value === '(not set)') {
    return '(not set)';
  }
  return value.split('?')[0] || value;
}

function emptySegment() {
  return {
    sessions: 0,
    engagedSessions: 0,
    screenPageViews: 0,
    eventCount: 0,
    keyEvents: 0,
  };
}

function safeDivide(numerator, denominator) {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) {
    return Number.NaN;
  }
  return numerator / denominator;
}
