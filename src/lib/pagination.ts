export const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;
export const DEFAULT_PAGE_SIZE = PAGE_SIZE_OPTIONS[0];

export type SearchValue = string | string[] | undefined;

export function getFirstSearchParam(value: SearchValue) {
  return Array.isArray(value) ? value[0] : value;
}

export function getPageSize(value: SearchValue) {
  const limit = Number.parseInt(
    getFirstSearchParam(value) ?? String(DEFAULT_PAGE_SIZE),
    10,
  );

  if (!PAGE_SIZE_OPTIONS.includes(limit as (typeof PAGE_SIZE_OPTIONS)[number])) {
    return DEFAULT_PAGE_SIZE;
  }

  return limit;
}

export function getCurrentPage(value: SearchValue) {
  return Math.max(1, Number.parseInt(getFirstSearchParam(value) ?? "1", 10) || 1);
}

function parseDateInput(value: string, endOfDay = false) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const [year, month, day] = value.split("-").map((part) => Number.parseInt(part, 10));
  const date = endOfDay
    ? new Date(year, month - 1, day, 23, 59, 59, 999)
    : new Date(year, month - 1, day, 0, 0, 0, 0);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

export function getDateSearchParam(value: SearchValue) {
  const rawValue = getFirstSearchParam(value)?.trim();

  if (!rawValue) {
    return "";
  }

  return parseDateInput(rawValue) ? rawValue : "";
}

export function getDateRangeSearchParams(startValue: SearchValue, endValue: SearchValue) {
  let start = getDateSearchParam(startValue);
  let end = getDateSearchParam(endValue);

  if (start && end && start > end) {
    [start, end] = [end, start];
  }

  return {
    end,
    endDate: end ? parseDateInput(end, true) : null,
    start,
    startDate: start ? parseDateInput(start) : null,
  };
}
