import { formatDuration, formatNumber, formatPercent } from './date-ranges.mjs';

export function buildInsights(report, config) {
  const insights = [];
  const thresholds = config.thresholds;
  const sessionsDelta = relativeChange(report.overview.sessions, report.previous.sessions);
  const conversionRateDelta = relativeChange(
    report.overview.conversionRate,
    report.previous.conversionRate,
  );
  const engagementDelta = report.overview.engagementRate - report.previous.engagementRate;

  if (sessionsDelta <= -thresholds.sessionsDropRatio) {
    insights.push({
      severity: 'high',
      code: 'traffic_drop',
      title: 'Traffic dropped materially against the previous comparison window.',
      evidence: `${formatNumber(report.overview.sessions)} sessions vs ${formatNumber(report.previous.sessions)} (${formatPercent(sessionsDelta)}).`,
      recommendation:
        'Review acquisition mix first. Check Search Console, campaign pacing, and recent publishing or deployment changes affecting discovery.',
    });
  }

  if (conversionRateDelta <= -thresholds.conversionRateDropRatio) {
    insights.push({
      severity: 'high',
      code: 'conversion_rate_drop',
      title: 'Conversion efficiency is down versus the previous comparison window.',
      evidence: `${formatPercent(report.overview.conversionRate)} vs ${formatPercent(report.previous.conversionRate)} (${formatPercent(conversionRateDelta)}).`,
      recommendation:
        'Inspect the main conversion path first. Verify CTA visibility, booking or contact handoff, and event tracking before changing acquisition.',
    });
  }

  if (engagementDelta <= -thresholds.engagementRateDropPoints) {
    insights.push({
      severity: 'medium',
      code: 'engagement_drop',
      title: 'Engagement rate slipped enough to justify landing-page or content checks.',
      evidence: `${formatPercent(report.overview.engagementRate)} vs ${formatPercent(report.previous.engagementRate)}. Avg session duration is ${formatDuration(report.overview.averageSessionDuration)}.`,
      recommendation:
        'Inspect the top entry pages with falling engagement. Re-check above-the-fold clarity, internal links, and mobile readability.',
    });
  }

  const mobile = report.devices.find((row) => row.key === 'mobile');
  const desktop = report.devices.find((row) => row.key === 'desktop');
  if (
    mobile &&
    desktop &&
    mobile.sessions > 0 &&
    desktop.sessions > 0 &&
    mobile.sessionShare >= 0.3 &&
    Number.isFinite(mobile.conversionRate) &&
    Number.isFinite(desktop.conversionRate) &&
    mobile.conversionRate <= desktop.conversionRate * thresholds.mobileVsDesktopRateRatio
  ) {
    insights.push({
      severity: 'medium',
      code: 'mobile_underperform',
      title: 'Mobile converts materially worse than desktop.',
      evidence: `Mobile ${formatPercent(mobile.conversionRate)} vs desktop ${formatPercent(desktop.conversionRate)} with ${formatPercent(mobile.sessionShare)} of sessions on mobile.`,
      recommendation:
        'Prioritize mobile UX fixes on the main landing and booking or contact path. Check sticky CTAs, widget load speed, and fold depth on smaller screens.',
    });
  }

  for (const channel of report.channels) {
    if (
      channel.sessionShare >= thresholds.minChannelSessionShare &&
      relativeChange(channel.conversionRate, channel.previousConversionRate) <=
        -thresholds.conversionRateDropRatio
    ) {
      insights.push({
        severity: 'medium',
        code: 'channel_cvr_drop',
        title: `${channel.label} is bringing traffic, but conversion efficiency is down.`,
        evidence: `${formatPercent(channel.conversionRate)} vs ${formatPercent(channel.previousConversionRate)} on ${formatNumber(channel.sessions)} sessions.`,
        recommendation:
          'Review landing-page alignment for this channel, campaign intent, and query or ad-copy mismatch before increasing spend.',
      });
    }
  }

  const focusPages = new Set(config.focusPages);
  for (const page of report.landingPages) {
    const isFocusPage = focusPages.has(page.key);
    const lowRate =
      page.sessions >= thresholds.minLandingPageSessions &&
      Number.isFinite(page.conversionRate) &&
      Number.isFinite(report.overview.conversionRate) &&
      page.conversionRate <=
        report.overview.conversionRate * (1 - thresholds.landingPageRateGapRatio);
    const trafficDrop =
      relativeChange(page.sessions, page.previousSessions) <= -thresholds.sessionsDropRatio &&
      Math.max(page.sessions, page.previousSessions) >= thresholds.minLandingPageSessions;

    if (lowRate && (isFocusPage || page.sessionShare >= thresholds.minChannelSessionShare)) {
      insights.push({
        severity: 'medium',
        code: 'landing_page_low_rate',
        title: `${page.label} underperforms the site conversion baseline.`,
        evidence: `${formatPercent(page.conversionRate)} vs site ${formatPercent(report.overview.conversionRate)} on ${formatNumber(page.sessions)} sessions.`,
        recommendation:
          'Rewrite the first screen for intent match, tighten CTA copy, and reduce the number of next-step choices on this page.',
      });
    }

    if (trafficDrop && (isFocusPage || page.sessionShare >= thresholds.minChannelSessionShare)) {
      insights.push({
        severity: 'medium',
        code: 'landing_page_traffic_drop',
        title: `${page.label} lost meaningful entry traffic.`,
        evidence: `${formatNumber(page.sessions)} sessions vs ${formatNumber(page.previousSessions)} in the previous window.`,
        recommendation:
          'Check ranking, internal links, referrer changes, and whether this page lost placement in major navigation or campaigns.',
      });
    }
  }

  return dedupeInsights(insights).sort(compareSeverity);
}

export function renderMarkdown({ siteName, generatedAt, reports, config }) {
  const lines = [
    '# GA4 Growth Report',
    '',
    `- Site: ${siteName}`,
    `- Generated: ${generatedAt}`,
    `- Property ID: ${config.propertyId}`,
    `- Conversion mode: ${reports[0]?.metadata?.conversionMode ?? 'n/a'}`,
    config.conversionEvents.length > 0
      ? `- Conversion events: ${config.conversionEvents.join(', ')}`
      : '- Conversion events: property key events',
    '',
  ];

  for (const report of reports) {
    lines.push(`## ${capitalize(report.granularity)}`);
    lines.push('');
    lines.push(`Current: ${report.window.current.label}`);
    lines.push(`Previous: ${report.window.previous.label}`);
    lines.push('');
    lines.push(renderOverviewTable(report));
    lines.push('');
    lines.push('### Alerts');
    lines.push('');
    if (report.insights.length === 0) {
      lines.push('- No threshold breaches detected in this window.');
    } else {
      for (const insight of report.insights) {
        lines.push(
          `- [${insight.severity.toUpperCase()}] ${insight.title} ${insight.evidence} Action: ${insight.recommendation}`,
        );
      }
    }
    lines.push('');
    lines.push('### Channel Breakdown');
    lines.push('');
    lines.push(renderSegmentTable(report.channels));
    lines.push('');
    lines.push('### Landing Pages');
    lines.push('');
    lines.push(renderSegmentTable(report.landingPages));
    lines.push('');
    lines.push('### Devices');
    lines.push('');
    lines.push(renderSegmentTable(report.devices));
    lines.push('');
    lines.push('### Time Series');
    lines.push('');
    lines.push(renderSeriesTable(report.timeSeries.current));
    lines.push('');
  }

  return lines.join('\n');
}

function renderOverviewTable(report) {
  return renderTable([
    ['Metric', 'Current', 'Previous', 'Delta'],
    [
      'Sessions',
      formatNumber(report.overview.sessions),
      formatNumber(report.previous.sessions),
      formatPercent(relativeChange(report.overview.sessions, report.previous.sessions)),
    ],
    [
      'Users',
      formatNumber(report.overview.totalUsers),
      formatNumber(report.previous.totalUsers),
      formatPercent(relativeChange(report.overview.totalUsers, report.previous.totalUsers)),
    ],
    [
      'Engagement rate',
      formatPercent(report.overview.engagementRate),
      formatPercent(report.previous.engagementRate),
      formatPercent(report.overview.engagementRate - report.previous.engagementRate),
    ],
    [
      'Avg session duration',
      formatDuration(report.overview.averageSessionDuration),
      formatDuration(report.previous.averageSessionDuration),
      formatPercent(
        relativeChange(
          report.overview.averageSessionDuration,
          report.previous.averageSessionDuration,
        ),
      ),
    ],
    [
      'Views / session',
      formatNumber(report.overview.viewsPerSession, 2),
      formatNumber(report.previous.viewsPerSession, 2),
      formatPercent(relativeChange(report.overview.viewsPerSession, report.previous.viewsPerSession)),
    ],
    [
      'Conversion rate',
      formatPercent(report.overview.conversionRate),
      formatPercent(report.previous.conversionRate),
      formatPercent(relativeChange(report.overview.conversionRate, report.previous.conversionRate)),
    ],
    [
      'Conversion events',
      formatNumber(report.overview.conversionEvents),
      formatNumber(report.previous.conversionEvents),
      formatPercent(relativeChange(report.overview.conversionEvents, report.previous.conversionEvents)),
    ],
  ]);
}

function renderSegmentTable(rows) {
  return renderTable([
    ['Segment', 'Sessions', 'Share', 'Engagement', 'Conv rate', 'Prev conv rate'],
    ...rows.map((row) => [
      row.label,
      formatNumber(row.sessions),
      formatPercent(row.sessionShare),
      formatPercent(row.engagementRate),
      formatPercent(row.conversionRate),
      formatPercent(row.previousConversionRate),
    ]),
  ]);
}

function renderSeriesTable(rows) {
  return renderTable([
    ['Bucket', 'Sessions', 'Engagement', 'Conv rate'],
    ...rows.map((row) => [
      row.label,
      formatNumber(row.sessions),
      formatPercent(row.engagementRate),
      formatPercent(row.conversionRate),
    ]),
  ]);
}

function renderTable(rows) {
  const [header, ...body] = rows;
  return [
    `| ${header.join(' | ')} |`,
    `| ${header.map(() => '---').join(' | ')} |`,
    ...body.map((row) => `| ${row.join(' | ')} |`),
  ].join('\n');
}

function dedupeInsights(insights) {
  const seen = new Set();
  return insights.filter((insight) => {
    const key = `${insight.code}:${insight.title}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function compareSeverity(left, right) {
  const rank = { high: 0, medium: 1, low: 2 };
  return rank[left.severity] - rank[right.severity];
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function relativeChange(current, previous) {
  if (!Number.isFinite(current) || !Number.isFinite(previous) || previous === 0) {
    return Number.NaN;
  }
  return (current - previous) / previous;
}
