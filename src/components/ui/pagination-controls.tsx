type SearchValue = string | string[] | undefined;

type Props = {
  basePath: string;
  currentPage: number;
  pageSize: number;
  searchParams: Record<string, SearchValue>;
  totalItems: number;
};

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

  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1.6rem] border border-line bg-white px-4 py-4">
      <p className="text-sm text-muted">
        Trang {currentPage} / {totalPages} - {totalItems} muc
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <a
          href={buildPageHref(basePath, searchParams, currentPage - 1)}
          aria-disabled={currentPage <= 1}
          className="rounded-full border border-line px-4 py-2 text-sm font-medium text-accent-strong aria-disabled:pointer-events-none aria-disabled:opacity-50"
        >
          Trang truoc
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
