#!/usr/bin/env node

/**
 * 週次行動レポート(日本語)。
 * GA4 の集計遅延(24〜48時間)を考慮して「2日前までの直近7日間」を
 * その前の7日間と比較し、アクセス概況と行動イベント
 * (予約ウィジェット接触・問い合わせクリック・CTA クリック等)をまとめる。
 *
 * Usage: npm run ga4:report  (= node scripts/ga4/weekly-report.mjs)
 * 認証は analyze.mjs と同じ (.env の GA4_PROPERTY_ID + サービスアカウント鍵)。
 */

import fs from 'node:fs/promises';
import path from 'node:path';

import { runReport } from './analytics.mjs';
import { getAccessToken } from './auth.mjs';
import { ROOT_DIR, getServiceAccountOptions, loadConfig, parseArgs } from './config.mjs';
import { formatNumber, formatPercent } from './date-ranges.mjs';

const HELP_TEXT = `Usage:
  node scripts/ga4/weekly-report.mjs [options]

直近7日間(2日前まで)を前の7日間と比較した日本語レポートを出力します。

Options:
  --config ./ga4.config.json     Config file path
  --property-id 123456789        Override GA4 property ID
  --timezone Asia/Tokyo          Override report timezone
  --output-dir .ga4-reports      Output directory for markdown
  --stdout                       Print to stdout only (no file)
  --help                         Show this help

Credentials:
  Set GA4_PROPERTY_ID and GA4_SERVICE_ACCOUNT_KEY_PATH (or _JSON) in .env.
`;

/** サイト側 (Analytics.astro / BookingWidget.astro / GionQuest.astro) が送る行動イベント */
const BEHAVIOR_EVENTS = [
  { name: 'booking_widget_view', label: '予約ウィジェット表示' },
  { name: 'booking_widget_engage', label: '予約ウィジェット接触' },
  { name: 'contact_click', label: '問い合わせ(メール)クリック' },
  { name: 'cta_click', label: 'CTAボタンクリック' },
  { name: 'outbound_click', label: '外部リンククリック' },
  { name: 'game_start', label: 'ゲーム開始' },
  { name: 'game_complete', label: 'ゲームクリア' },
];

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    process.stdout.write(HELP_TEXT);
    return;
  }

  const config = await loadConfig({ configPath: options.configPath, cliOptions: options });
  const accessToken = await getAccessToken(getServiceAccountOptions(options));

  const window = buildWeeklyWindow(config.timezone);
  const [current, previous] = await Promise.all([
    fetchRange({ accessToken, propertyId: config.propertyId, dateRange: window.current }),
    fetchRange({ accessToken, propertyId: config.propertyId, dateRange: window.previous }),
  ]);

  const markdown = renderReport({ window, current, previous });
  process.stdout.write(`${markdown}\n`);

  if (!options.stdout) {
    const outputDir = path.resolve(ROOT_DIR, options.outputDir);
    await fs.mkdir(outputDir, { recursive: true });
    const filePath = path.join(outputDir, `weekly-report-${window.current.endDate}.md`);
    await fs.writeFile(filePath, `${markdown}\n`, 'utf8');
    process.stderr.write(`\nSaved: ${filePath}\n`);
  }
}

async function fetchRange({ accessToken, propertyId, dateRange }) {
  const base = { accessToken, propertyId, dateRange };
  const [overview, events, engageByPage, ctaByLabel, topPages, channels, tourPages] =
    await Promise.all([
      runReport({
        ...base,
        metrics: ['totalUsers', 'sessions', 'engagedSessions', 'screenPageViews'],
      }),
      runReport({
        ...base,
        dimensions: ['eventName'],
        metrics: ['eventCount'],
        dimensionFilter: inListFilter('eventName', BEHAVIOR_EVENTS.map((event) => event.name)),
        limit: 50,
      }),
      runReport({
        ...base,
        dimensions: ['pagePath'],
        metrics: ['eventCount'],
        dimensionFilter: equalsFilter('eventName', 'booking_widget_engage'),
        orderByMetric: 'eventCount',
        limit: 10,
      }),
      runReport({
        ...base,
        dimensions: ['customEvent:link_label'],
        metrics: ['eventCount'],
        dimensionFilter: equalsFilter('eventName', 'cta_click'),
        orderByMetric: 'eventCount',
        limit: 15,
      }).catch(() => ({ rows: [] })), // カスタムディメンション未登録の間は静かにスキップ
      runReport({
        ...base,
        dimensions: ['pagePath'],
        metrics: ['screenPageViews', 'sessions'],
        orderByMetric: 'screenPageViews',
        limit: 10,
      }),
      runReport({
        ...base,
        dimensions: ['sessionDefaultChannelGroup'],
        metrics: ['sessions'],
        orderByMetric: 'sessions',
        limit: 8,
      }),
      runReport({
        ...base,
        dimensions: ['pagePath'],
        metrics: ['sessions'],
        dimensionFilter: beginsWithFilter('pagePath', '/tours/'),
        limit: 50,
      }),
    ]);

  const eventCounts = Object.fromEntries(
    events.rows.map((row) => [row.dimensionValues.eventName, row.metrics.eventCount]),
  );
  const tourSessions = tourPages.rows.reduce((sum, row) => sum + (row.metrics.sessions ?? 0), 0);

  return { overview: overview.totals, eventCounts, engageByPage, ctaByLabel, topPages, channels, tourSessions };
}

function renderReport({ window, current, previous }) {
  const lines = [];
  const cur = current.overview;
  const prev = previous.overview;

  lines.push(`# OTAtrip Guide 週次レポート`);
  lines.push('');
  lines.push(`- 今週: ${window.current.startDate} 〜 ${window.current.endDate}`);
  lines.push(`- 先週: ${window.previous.startDate} 〜 ${window.previous.endDate}`);
  lines.push(`- ※GA4の集計遅延(24〜48時間)を考慮し、2日前までを集計しています`);
  lines.push('');

  lines.push('## アクセス概況');
  lines.push('');
  lines.push('| 指標 | 今週 | 先週 | 変化 |');
  lines.push('| --- | ---: | ---: | ---: |');
  lines.push(compareRow('訪問者数', cur.totalUsers, prev.totalUsers));
  lines.push(compareRow('セッション数', cur.sessions, prev.sessions));
  lines.push(compareRow('ページビュー', cur.screenPageViews, prev.screenPageViews));
  lines.push('');

  lines.push('## 行動イベント(お客さんが何をしたか)');
  lines.push('');
  lines.push('| 行動 | 今週 | 先週 | 変化 |');
  lines.push('| --- | ---: | ---: | ---: |');
  for (const event of BEHAVIOR_EVENTS) {
    lines.push(
      compareRow(
        event.label,
        current.eventCounts[event.name] ?? 0,
        previous.eventCounts[event.name] ?? 0,
      ),
    );
  }
  lines.push('');

  const engageRate = safeDivide(current.eventCounts.booking_widget_engage ?? 0, current.tourSessions);
  const prevEngageRate = safeDivide(previous.eventCounts.booking_widget_engage ?? 0, previous.tourSessions);
  lines.push('## 予約ウィジェット接触率(実質のコンバージョン率)');
  lines.push('');
  lines.push(
    `- 今週: **${formatPercent(engageRate)}** (ツアーページ訪問 ${formatNumber(current.tourSessions)} 件中 ${formatNumber(current.eventCounts.booking_widget_engage ?? 0)} 件が予約ウィジェットに接触)`,
  );
  lines.push(`- 先週: ${formatPercent(prevEngageRate)}`);
  lines.push('');

  if (current.engageByPage.rows.length > 0) {
    lines.push('### 予約ウィジェット接触が起きたページ');
    lines.push('');
    for (const row of current.engageByPage.rows) {
      lines.push(`- ${row.dimensionValues.pagePath}: ${formatNumber(row.metrics.eventCount)} 件`);
    }
    lines.push('');
  }

  if (current.ctaByLabel.rows.length > 0) {
    lines.push('### クリックされたCTAボタン');
    lines.push('');
    for (const row of current.ctaByLabel.rows) {
      lines.push(
        `- ${row.dimensionValues['customEvent:link_label']}: ${formatNumber(row.metrics.eventCount)} 件`,
      );
    }
    lines.push('');
  }

  lines.push('## 人気ページ TOP10');
  lines.push('');
  lines.push('| ページ | PV | セッション |');
  lines.push('| --- | ---: | ---: |');
  for (const row of current.topPages.rows) {
    lines.push(
      `| ${row.dimensionValues.pagePath} | ${formatNumber(row.metrics.screenPageViews)} | ${formatNumber(row.metrics.sessions)} |`,
    );
  }
  lines.push('');

  lines.push('## 流入元');
  lines.push('');
  for (const row of current.channels.rows) {
    lines.push(
      `- ${row.dimensionValues.sessionDefaultChannelGroup}: ${formatNumber(row.metrics.sessions)} セッション`,
    );
  }
  lines.push('');

  lines.push('## 気づき');
  lines.push('');
  for (const insight of buildInsightNotes({ current, previous, engageRate, prevEngageRate })) {
    lines.push(`- ${insight}`);
  }

  return lines.join('\n');
}

function buildInsightNotes({ current, previous, engageRate, prevEngageRate }) {
  const notes = [];
  const sessions = current.overview.sessions ?? 0;
  const prevSessions = previous.overview.sessions ?? 0;

  const totalBehaviorEvents = Object.values(current.eventCounts).reduce((sum, n) => sum + n, 0);
  if (totalBehaviorEvents === 0) {
    notes.push(
      '行動イベントがまだ届いていません。計測を公開した直後はデータが貯まるまで数日かかります(広告ブロッカー利用者は計測に映らない点にも留意)。',
    );
  }

  if (prevSessions > 0) {
    const change = (sessions - prevSessions) / prevSessions;
    if (change <= -0.2) {
      notes.push(`セッション数が先週から ${formatPercent(Math.abs(change))} 減少しています。流入元の内訳を確認してください。`);
    } else if (change >= 0.2) {
      notes.push(`セッション数が先週から ${formatPercent(change)} 増加しています。人気ページを確認して伸びている導線を把握しましょう。`);
    }
  }

  if (Number.isFinite(engageRate) && Number.isFinite(prevEngageRate) && prevEngageRate > 0) {
    const change = (engageRate - prevEngageRate) / prevEngageRate;
    if (Math.abs(change) >= 0.15) {
      notes.push(
        `予約ウィジェット接触率が先週比で${change > 0 ? '上昇' : '低下'}しています(${formatPercent(prevEngageRate)} → ${formatPercent(engageRate)})。`,
      );
    }
  }

  const contacts = current.eventCounts.contact_click ?? 0;
  if (contacts > 0) {
    notes.push(`問い合わせ(メール)クリックが ${formatNumber(contacts)} 件ありました。`);
  }

  if (notes.length === 0) {
    notes.push('大きな変動はありません。');
  }
  return notes;
}

function buildWeeklyWindow(timezone) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const today = formatter.format(new Date());
  const endDate = shiftDays(today, -2);
  const startDate = shiftDays(endDate, -6);
  const previousEnd = shiftDays(startDate, -1);
  const previousStart = shiftDays(previousEnd, -6);
  return {
    current: { startDate, endDate },
    previous: { startDate: previousStart, endDate: previousEnd },
  };
}

function shiftDays(isoDate, amount) {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

function inListFilter(fieldName, values) {
  return { filter: { fieldName, inListFilter: { values } } };
}

function equalsFilter(fieldName, value) {
  return { filter: { fieldName, stringFilter: { matchType: 'EXACT', value } } };
}

function beginsWithFilter(fieldName, value) {
  return { filter: { fieldName, stringFilter: { matchType: 'BEGINS_WITH', value } } };
}

function safeDivide(numerator, denominator) {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) {
    return Number.NaN;
  }
  return numerator / denominator;
}

function compareRow(label, currentValue, previousValue) {
  return `| ${label} | ${formatNumber(currentValue)} | ${formatNumber(previousValue)} | ${formatChange(currentValue, previousValue)} |`;
}

function formatChange(currentValue, previousValue) {
  if (!previousValue) {
    return currentValue ? '(新規)' : '—';
  }
  const change = (currentValue - previousValue) / previousValue;
  const arrow = change > 0 ? '↑' : change < 0 ? '↓' : '→';
  return `${arrow} ${formatPercent(Math.abs(change))}`;
}

main().catch((error) => {
  if (/Missing GA4 property ID|service account|credential/iu.test(error.message)) {
    process.stderr.write(
      `認証設定が未完了です: ${error.message}\n\n` +
        'セットアップ手順:\n' +
        '  1. GCPでサービスアカウントを作成し、JSONキーをダウンロード\n' +
        '  2. GA4管理画面 > プロパティのアクセス管理 で、そのサービスアカウントに「閲覧者」権限を付与\n' +
        '  3. .env に GA4_PROPERTY_ID と GA4_SERVICE_ACCOUNT_KEY_PATH を設定 (.env.example 参照)\n',
    );
  } else {
    process.stderr.write(`${error.message}\n`);
  }
  process.exitCode = 1;
});
