const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function buildDateWindow({ granularity, periods, timezone }) {
  const bucketCount = Math.max(Number(periods) || 0, 1);
  const today = parseDateString(getTodayInTimezone(timezone));
  const yesterday = addDays(today, -1);

  switch (granularity) {
    case 'day':
      return buildDailyWindow({ periods: bucketCount, end: yesterday });
    case 'week':
      return buildWeeklyWindow({ periods: bucketCount, lastObservedDay: yesterday });
    case 'month':
      return buildMonthlyWindow({ periods: bucketCount, lastObservedDay: yesterday });
    default:
      throw new Error(`Unsupported granularity: ${granularity}`);
  }
}

export function summarizeWindow(window) {
  return {
    granularity: window.granularity,
    current: window.current,
    previous: window.previous,
    bucketDimension: window.bucketDimension,
  };
}

export function formatBucketLabel(granularity, key) {
  if (!key) {
    return '(not set)';
  }

  if (granularity === 'day') {
    return `${key.slice(0, 4)}-${key.slice(4, 6)}-${key.slice(6, 8)}`;
  }

  if (granularity === 'week') {
    return `${key.slice(0, 4)}-W${key.slice(4, 6)}`;
  }

  if (granularity === 'month') {
    return `${key.slice(0, 4)}-${key.slice(4, 6)}`;
  }

  return key;
}

export function formatReadableBucket(granularity, key) {
  if (granularity === 'day' && key?.length === 8) {
    const date = parseDateString(`${key.slice(0, 4)}-${key.slice(4, 6)}-${key.slice(6, 8)}`);
    const isoDay = getIsoDayOfWeek(date);
    return `${formatBucketLabel(granularity, key)} (${DAY_NAMES[isoDay - 1]})`;
  }

  if (granularity === 'month' && key?.length === 6) {
    return `${MONTH_NAMES[Number(key.slice(4, 6)) - 1]} ${key.slice(0, 4)}`;
  }

  return formatBucketLabel(granularity, key);
}

export function formatPercent(value, digits = 1) {
  if (!Number.isFinite(value)) {
    return 'n/a';
  }
  return `${(value * 100).toFixed(digits)}%`;
}

export function formatNumber(value, digits = 0) {
  if (!Number.isFinite(value)) {
    return 'n/a';
  }
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

export function formatDuration(seconds) {
  if (!Number.isFinite(seconds)) {
    return 'n/a';
  }
  const rounded = Math.round(seconds);
  const minutes = Math.floor(rounded / 60);
  const remainder = rounded % 60;
  if (minutes === 0) {
    return `${remainder}s`;
  }
  return `${minutes}m ${String(remainder).padStart(2, '0')}s`;
}

function buildDailyWindow({ periods, end }) {
  const bucketCount = Math.max(periods, 1);
  const currentEnd = end;
  const currentStart = addDays(currentEnd, -(bucketCount - 1));
  const previousEnd = addDays(currentStart, -1);
  const previousStart = addDays(previousEnd, -(bucketCount - 1));

  return {
    granularity: 'day',
    bucketDimension: 'date',
    current: createDateRange(currentStart, currentEnd),
    previous: createDateRange(previousStart, previousEnd),
  };
}

function buildWeeklyWindow({ periods, lastObservedDay }) {
  const isoDay = getIsoDayOfWeek(lastObservedDay);
  const currentEnd = isoDay === 7 ? lastObservedDay : addDays(lastObservedDay, -isoDay);
  const currentStart = addDays(currentEnd, -(periods * 7 - 1));
  const previousEnd = addDays(currentStart, -1);
  const previousStart = addDays(previousEnd, -(periods * 7 - 1));

  return {
    granularity: 'week',
    bucketDimension: 'yearWeek',
    current: createDateRange(currentStart, currentEnd),
    previous: createDateRange(previousStart, previousEnd),
  };
}

function buildMonthlyWindow({ periods, lastObservedDay }) {
  const lastDayOfCurrentMonth = endOfMonth(lastObservedDay);
  const currentEnd = isSameDate(lastObservedDay, lastDayOfCurrentMonth)
    ? lastObservedDay
    : endOfMonth(addMonths(startOfMonth(lastObservedDay), -1));
  const currentStart = startOfMonth(addMonths(currentEnd, -(periods - 1)));
  const previousEnd = addDays(currentStart, -1);
  const previousStart = startOfMonth(addMonths(previousEnd, -(periods - 1)));

  return {
    granularity: 'month',
    bucketDimension: 'yearMonth',
    current: createDateRange(currentStart, currentEnd),
    previous: createDateRange(previousStart, previousEnd),
  };
}

function createDateRange(start, end) {
  return {
    startDate: formatDate(start),
    endDate: formatDate(end),
    label: `${formatDate(start)} to ${formatDate(end)}`,
  };
}

function getTodayInTimezone(timezone) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(new Date());
}

function parseDateString(dateString) {
  const [year, month, day] = dateString.split('-').map(Number);
  return { year, month, day };
}

function toUtcDate(plainDate) {
  return new Date(Date.UTC(plainDate.year, plainDate.month - 1, plainDate.day));
}

function fromUtcDate(date) {
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
}

function addDays(plainDate, amount) {
  const date = toUtcDate(plainDate);
  date.setUTCDate(date.getUTCDate() + amount);
  return fromUtcDate(date);
}

function addMonths(plainDate, amount) {
  const date = toUtcDate({
    year: plainDate.year,
    month: plainDate.month,
    day: 1,
  });
  date.setUTCMonth(date.getUTCMonth() + amount);
  const shifted = fromUtcDate(date);
  return {
    year: shifted.year,
    month: shifted.month,
    day: Math.min(plainDate.day, daysInMonth(shifted.year, shifted.month)),
  };
}

function startOfMonth(plainDate) {
  return {
    year: plainDate.year,
    month: plainDate.month,
    day: 1,
  };
}

function endOfMonth(plainDate) {
  return {
    year: plainDate.year,
    month: plainDate.month,
    day: daysInMonth(plainDate.year, plainDate.month),
  };
}

function daysInMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function getIsoDayOfWeek(plainDate) {
  const day = toUtcDate(plainDate).getUTCDay();
  return day === 0 ? 7 : day;
}

function formatDate(plainDate) {
  return `${plainDate.year}-${String(plainDate.month).padStart(2, '0')}-${String(plainDate.day).padStart(2, '0')}`;
}

function isSameDate(left, right) {
  return left.year === right.year && left.month === right.month && left.day === right.day;
}
