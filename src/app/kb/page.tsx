import Link from "next/link";
import { PaginationControls } from "@/components/ui/pagination-controls";
import {
  getPublishedArticlesCount,
  getPublishedArticlesPage,
} from "@/lib/content";
import { getCurrentPage, getPageSize } from "@/lib/pagination";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{
    limit?: string | string[];
    page?: string | string[];
  }>;
};

export default async function KnowledgeBaseIndexPage({ searchParams }: Props) {
  const resolvedSearchParams = await searchParams;
  const currentPage = getCurrentPage(resolvedSearchParams.page);
  const pageSize = getPageSize(resolvedSearchParams.limit);
  const [articles, articleCount] = await Promise.all([
    getPublishedArticlesPage(currentPage, pageSize),
    getPublishedArticlesCount(),
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
            <p className="mt-3 text-base text-muted">
              Đang hiển thị {articles.length} / {articleCount} bài viết.
            </p>
          </div>
          <Link href="/" className="text-base font-medium text-accent-strong">
            🔙 Về homepage
          </Link>
        </div>

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

        <PaginationControls
          basePath="/kb"
          currentPage={currentPage}
          pageSize={pageSize}
          searchParams={resolvedSearchParams}
          totalItems={articleCount}
        />
      </div>
    </main>
  );
}
