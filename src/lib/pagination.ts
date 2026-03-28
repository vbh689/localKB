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
