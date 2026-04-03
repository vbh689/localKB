import Link from "next/link";
import type { PublishedContentSort } from "@/lib/content";
import { DEFAULT_PAGE_SIZE } from "@/lib/pagination";

type CategoryOption = {
  id: string;
  name: string;
  slug: string;
};

type Props = {
  basePath: string;
  categories: CategoryOption[];
  category: string;
  pageSize: number;
  query?: string;
  resultsLabel: string;
  sort: PublishedContentSort;
  totalCount: number;
  visibleCount: number;
  updatedFrom: string;
  updatedTo: string;
};

function buildResetHref(basePath: string, pageSize: number, query = "") {
  const params = new URLSearchParams();

  if (pageSize !== DEFAULT_PAGE_SIZE) {
    params.set("limit", String(pageSize));
  }

  if (query.trim()) {
    params.set("q", query.trim());
  }

  const search = params.toString();
  return search ? `${basePath}?${search}` : basePath;
}

export function PublicContentFilters({
  basePath,
  categories,
  category,
  pageSize,
  query = "",
  resultsLabel,
  sort,
  totalCount,
  visibleCount,
  updatedFrom,
  updatedTo,
}: Props) {
  return (
    <form
      action={basePath}
      method="get"
      className="glass-panel rounded-[1.6rem] p-5 md:p-6"
    >
      <input type="hidden" name="limit" value={pageSize} />
      {query.trim() ? <input type="hidden" name="q" value={query} /> : null}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-sm uppercase tracking-[0.22em] text-accent-strong">
            Filter
          </p>
          <p className="mt-2 text-sm text-muted">
            Đang hiển thị {visibleCount} / {totalCount} {resultsLabel} phù hợp.
          </p>
        </div>
        <div className="rounded-full border border-accent/15 bg-accent/6 px-4 py-2 text-sm text-muted">
          Lọc theo category, ngày cập nhật và thứ tự hiển thị
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[1.1fr_0.95fr_0.95fr_1fr_auto]">
        <select
          name="category"
          defaultValue={category}
          aria-label="Lọc theo category"
          className="w-full rounded-2xl border border-line bg-white px-5 py-4 text-base outline-none focus:border-accent"
        >
          <option value="">Tất cả category</option>
          {categories.map((item) => (
            <option key={item.id} value={item.slug}>
              {item.name}
            </option>
          ))}
        </select>
        <input
          type="date"
          name="from"
          defaultValue={updatedFrom}
          aria-label="Lọc từ ngày cập nhật"
          className="w-full rounded-2xl border border-line bg-white px-5 py-4 text-base outline-none focus:border-accent"
        />
        <input
          type="date"
          name="to"
          defaultValue={updatedTo}
          aria-label="Lọc đến ngày cập nhật"
          className="w-full rounded-2xl border border-line bg-white px-5 py-4 text-base outline-none focus:border-accent"
        />
        <select
          name="sort"
          defaultValue={sort}
          aria-label="Sắp xếp nội dung"
          className="w-full rounded-2xl border border-line bg-white px-5 py-4 text-base outline-none focus:border-accent"
        >
          <option value="updated_desc">Mới cập nhật</option>
          <option value="updated_asc">Cập nhật cũ nhất</option>
          <option value="published_desc">Mới xuất bản</option>
          <option value="published_asc">Xuất bản lâu nhất</option>
        </select>
        <div className="flex items-center gap-2">
          <button
            type="submit"
            className="rounded-full bg-accent px-5 py-4 text-base font-medium text-white"
          >
            Lọc
          </button>
          <Link
            href={buildResetHref(basePath, pageSize, query)}
            className="rounded-full border border-line px-4 py-4 text-base font-medium text-accent-strong"
          >
            Reset
          </Link>
        </div>
      </div>
    </form>
  );
}
