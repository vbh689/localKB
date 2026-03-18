import { Role } from "@prisma/client";
import { FormNotice } from "@/components/ui/form-notice";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { requireRoles } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { getFeedback, type SearchParamInput } from "@/lib/feedback";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: SearchParamInput;
};

function getParam(
  value: string | string[] | undefined,
) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdminSearchLogsPage({ searchParams }: Props) {
  await requireRoles([Role.ADMIN, Role.EDITOR]);
  const resolvedSearchParams = await searchParams;
  const feedback = await getFeedback(resolvedSearchParams);
  const query = getParam(resolvedSearchParams.q)?.trim() ?? "";
  const resultFilter = getParam(resolvedSearchParams.resultFilter) ?? "all";
  const sort = getParam(resolvedSearchParams.sort) ?? "latest";
  const currentPage = Math.max(
    1,
    Number.parseInt(getParam(resolvedSearchParams.page) ?? "1", 10) || 1,
  );
  const pageSize = 20;

  const recentLogsWhere = {
    query: query
      ? {
          contains: query,
          mode: "insensitive" as const,
        }
      : undefined,
    resultCount: resultFilter === "no-result" ? 0 : undefined,
  };

  const [recentLogs, recentLogCount, noResultLogs] = await Promise.all([
    db.searchLog.findMany({
      where: recentLogsWhere,
      orderBy:
        sort === "results_desc"
          ? [{ resultCount: "desc" }, { createdAt: "desc" }]
          : [{ createdAt: "desc" }],
      skip: (currentPage - 1) * pageSize,
      take: pageSize,
    }),
    db.searchLog.count({
      where: recentLogsWhere,
    }),
    db.searchLog.groupBy({
      by: ["query"],
      where: {
        resultCount: 0,
        query: query
          ? {
              contains: query,
              mode: "insensitive",
            }
          : undefined,
      },
      _count: {
        query: true,
      },
      orderBy: {
        _count: {
          query: "desc",
        },
      },
      take: 10,
    }),
  ]);

  return (
    <section className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
      <div className="glass-panel rounded-[1.8rem] p-6">
        <FormNotice feedback={feedback} />
        <form className="mb-6 grid gap-3 lg:grid-cols-[1.2fr_0.8fr_0.8fr_auto]">
          <input
            type="text"
            name="q"
            defaultValue={query}
            placeholder="Tim theo query"
            className="w-full rounded-2xl border border-line bg-white px-4 py-3 outline-none focus:border-accent"
          />
          <select
            name="resultFilter"
            defaultValue={resultFilter}
            className="w-full rounded-2xl border border-line bg-white px-4 py-3 outline-none focus:border-accent"
          >
            <option value="all">Tat ca ket qua</option>
            <option value="no-result">Chi no-result</option>
          </select>
          <select
            name="sort"
            defaultValue={sort}
            className="w-full rounded-2xl border border-line bg-white px-4 py-3 outline-none focus:border-accent"
          >
            <option value="latest">Moi nhat</option>
            <option value="results_desc">Nhieu ket qua nhat</option>
          </select>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="submit"
              className="rounded-full bg-accent px-5 py-3 text-sm font-medium text-white"
            >
              Loc
            </button>
            <a
              href={`/api/admin/search-logs/export?q=${encodeURIComponent(query)}&resultFilter=${encodeURIComponent(resultFilter)}&sort=${encodeURIComponent(sort)}`}
              className="rounded-full border border-line px-4 py-3 text-sm font-medium text-accent-strong"
            >
              Export CSV
            </a>
            <a
              href="/admin/search-logs"
              className="rounded-full border border-line px-4 py-3 text-sm font-medium text-accent-strong"
            >
              Reset
            </a>
          </div>
        </form>
        <p className="font-mono text-sm uppercase tracking-[0.22em] text-accent-strong">
          Top no-result
        </p>
        <div className="mt-5 grid gap-3">
          {noResultLogs.length === 0 ? (
            <p className="text-sm text-muted">Chua co truy van no-result.</p>
          ) : (
            noResultLogs.map((item) => (
              <div
                key={item.query}
                className="rounded-2xl border border-line bg-white px-4 py-4"
              >
                <p className="text-base font-medium">{item.query}</p>
                <p className="mt-1 text-sm text-muted">
                  {item._count.query} lan khong co ket qua
                </p>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="glass-panel rounded-[1.8rem] p-6">
        <p className="font-mono text-sm uppercase tracking-[0.22em] text-accent-strong">
          Recent search logs
        </p>
        <p className="mt-2 text-sm text-muted">
          Dang hien thi {recentLogs.length} / {recentLogCount} logs.
        </p>
        <div className="mt-5 grid gap-3">
          {recentLogs.map((log) => (
            <div
              key={log.id}
              className="rounded-2xl border border-line bg-white px-4 py-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-base font-medium">{log.query || "(empty)"}</p>
                <span className="rounded-full border border-line px-3 py-1 text-xs text-muted">
                  {log.resultCount} ket qua
                </span>
              </div>
              <p className="mt-2 text-sm text-muted">
                {log.createdAt.toLocaleString("vi-VN")}
              </p>
            </div>
          ))}
        </div>
        <div className="mt-5">
          <PaginationControls
            basePath="/admin/search-logs"
            currentPage={currentPage}
            pageSize={pageSize}
            searchParams={resolvedSearchParams}
            totalItems={recentLogCount}
          />
        </div>
      </div>
    </section>
  );
}
