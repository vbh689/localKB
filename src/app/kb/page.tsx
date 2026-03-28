import Link from "next/link";
import { PublicContentFilters } from "@/components/content/public-content-filters";
import { PaginationControls } from "@/components/ui/pagination-controls";
import {
  getPublishedContentSort,
  getPublishedArticlesCount,
  getPublishedArticlesPage,
} from "@/lib/content";
import { db } from "@/lib/db";
import {
  getCurrentPage,
  getDateRangeSearchParams,
  getFirstSearchParam,
  getPageSize,
} from "@/lib/pagination";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{
    category?: string | string[];
    from?: string | string[];
    limit?: string | string[];
    page?: string | string[];
    sort?: string | string[];
    to?: string | string[];
  }>;
};

export default async function KnowledgeBaseIndexPage({ searchParams }: Props) {
  const resolvedSearchParams = await searchParams;
  const category = getFirstSearchParam(resolvedSearchParams.category)?.trim() ?? "";
  const currentPage = getCurrentPage(resolvedSearchParams.page);
  const pageSize = getPageSize(resolvedSearchParams.limit);
  const sort = getPublishedContentSort(
    getFirstSearchParam(resolvedSearchParams.sort),
  );
  const { end, endDate, start, startDate } = getDateRangeSearchParams(
    resolvedSearchParams.from,
    resolvedSearchParams.to,
  );
  const filters = {
    categorySlug: category || null,
    sort,
    updatedFrom: startDate,
    updatedTo: endDate,
  };

  const [articles, articleCount, categories] = await Promise.all([
    getPublishedArticlesPage(currentPage, pageSize, filters),
    getPublishedArticlesCount(filters),
    db.category.findMany({
      orderBy: [{ name: "asc" }],
      select: {
        id: true,
        name: true,
        slug: true,
      },
    }),
  ]);

  return (
    <main className="section-grid min-h-screen px-6 py-8 md:px-10 xl:px-14">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-mono text-base uppercase tracking-[0.18em] text-accent-strong">
              KB
            </p>
            <h1 className="mt-2 text-4xl font-semibold tracking-tight md:text-5xl">
              Knowledge Base Articles
            </h1>
          </div>
          <Link href="/" className="text-base font-medium text-accent-strong">
            🔙 Về homepage
          </Link>
        </div>

        <PublicContentFilters
          basePath="/kb"
          categories={categories}
          category={category}
          pageSize={pageSize}
          resultsLabel="bài viết"
          sort={sort}
          totalCount={articleCount}
          updatedFrom={start}
          updatedTo={end}
          visibleCount={articles.length}
        />

        <PaginationControls
          basePath="/kb"
          currentPage={currentPage}
          pageSize={pageSize}
          searchParams={resolvedSearchParams}
          totalItems={articleCount}
        />

        <div className="grid gap-4">
          {articles.length === 0 ? (
            <div className="glass-panel rounded-[1.6rem] p-6 text-base text-muted">
              Chưa có article nào được xuất bản.
            </div>
          ) : (
            articles.map((article) => (
              <Link
                key={article.id}
                href={`/kb/${article.slug}`}
                className="glass-panel rounded-[1.6rem] p-5 transition hover:-translate-y-0.5"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-[1.45rem] font-semibold tracking-tight">
                    {article.title}
                  </h2>
                  <div className="flex flex-wrap items-center gap-3 text-base text-muted">
                    {article.category ? <span>{article.category.name}</span> : null}
                    <span>{article.updatedAt.toLocaleDateString("vi-VN")}</span>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </main>
  );
}
