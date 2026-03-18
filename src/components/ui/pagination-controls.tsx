type SearchValue = string | string[] | undefined;

type Props = {
  basePath: string;
  currentPage: number;
  pageSize: number;
  searchParams: Record<string, SearchValue>;
  totalItems: number;
};

const pageSizeOptions = [20, 50, 100];

function buildPageHref(
  basePath: string,
  searchParams: Record<string, SearchValue>,
  page: number,
) {
  const params = new URLSearchParams();

  Object.entries(searchParams).forEach(([key, value]) => {
    if (key === "page" || value == null) {
      return;
    }

    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (item) {
          params.append(key, item);
        }
      });
      return;
    }

    if (value) {
      params.set(key, value);
    }
  });

  if (page > 1) {
    params.set("page", String(page));
  }

  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
}

export function PaginationControls({
  basePath,
  currentPage,
  pageSize,
  searchParams,
  totalItems,
}: Props) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const hiddenEntries = Object.entries(searchParams).flatMap(([key, value]) => {
    if (key === "page" || key === "limit" || value == null) {
      return [];
    }

    if (Array.isArray(value)) {
      return value.filter(Boolean).map((item) => ({ key, value: item }));
    }

    return value ? [{ key, value }] : [];
  });

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1.6rem] border border-line bg-white px-4 py-4">
      <p className="text-sm text-muted">
        Trang {currentPage} / {totalPages} - {totalItems} mục
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <form action={basePath} className="flex flex-wrap items-center gap-2">
          {hiddenEntries.map((entry, index) => (
            <input
              key={`${entry.key}-${entry.value}-${index}`}
              type="hidden"
              name={entry.key}
              value={entry.value}
            />
          ))}
          <label className="text-sm text-muted" htmlFor={`${basePath}-limit`}>
            Mỗi trang
          </label>
          <select
            id={`${basePath}-limit`}
            name="limit"
            defaultValue={String(pageSize)}
            className="rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-accent-strong outline-none focus:border-accent"
          >
            {pageSizeOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="rounded-full border border-line px-4 py-2 text-sm font-medium text-accent-strong"
          >
            Áp dụng
          </button>
        </form>
        <a
          href={buildPageHref(basePath, searchParams, currentPage - 1)}
          aria-disabled={currentPage <= 1}
          className="rounded-full border border-line px-4 py-2 text-sm font-medium text-accent-strong aria-disabled:pointer-events-none aria-disabled:opacity-50"
        >
          Trang trước
        </a>
        <a
          href={buildPageHref(basePath, searchParams, currentPage + 1)}
          aria-disabled={currentPage >= totalPages}
          className="rounded-full border border-line px-4 py-2 text-sm font-medium text-accent-strong aria-disabled:pointer-events-none aria-disabled:opacity-50"
        >
          Trang sau
        </a>
      </div>
    </div>
  );
}
