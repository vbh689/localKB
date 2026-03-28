import Link from "next/link";
import { PublicContentFilters } from "@/components/content/public-content-filters";
import { PaginationControls } from "@/components/ui/pagination-controls";
import {
  getPublishedContentSort,
  getPublishedFaqsCount,
  getPublishedFaqsPage,
} from "@/lib/content";
import { db } from "@/lib/db";
import {
  getCurrentPage,
  getDateRangeSearchParams,
  getFirstSearchParam,
  getPageSize,
} from "@/lib/pagination";
import { createExcerpt } from "@/lib/utils";

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

export default async function FaqIndexPage({ searchParams }: Props) {
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

  const [faqs, faqCount, categories] = await Promise.all([
    getPublishedFaqsPage(currentPage, pageSize, filters),
    getPublishedFaqsCount(filters),
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
              FAQ
            </p>
            <h1 className="mt-2 text-4xl font-semibold tracking-tight md:text-5xl">
              Câu hỏi thường gặp
            </h1>
          </div>
          <Link href="/" className="text-base font-medium text-accent-strong">
            🔙 Về homepage
          </Link>
        </div>

        <PublicContentFilters
          basePath="/faq"
          categories={categories}
          category={category}
          pageSize={pageSize}
          resultsLabel="câu hỏi"
          sort={sort}
          totalCount={faqCount}
          updatedFrom={start}
          updatedTo={end}
          visibleCount={faqs.length}
        />

        <PaginationControls
          basePath="/faq"
          currentPage={currentPage}
          pageSize={pageSize}
          searchParams={resolvedSearchParams}
          totalItems={faqCount}
        />

        <div className="grid gap-4">
          {faqs.length === 0 ? (
            <div className="glass-panel rounded-[1.6rem] p-6 text-base text-muted">
              Chưa có FAQ nào được xuất bản.
            </div>
          ) : (
            faqs.map((faq) => (
              <Link
                key={faq.id}
                href={`/faq/${faq.slug}`}
                className="glass-panel rounded-[1.6rem] p-5 transition hover:-translate-y-0.5"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-[1.45rem] font-semibold tracking-tight">
                    {faq.question}
                  </h2>
                  <div className="flex flex-wrap items-center gap-3 text-base text-muted">
                    {faq.category ? <span>{faq.category.name}</span> : null}
                    <span>{faq.updatedAt.toLocaleDateString("vi-VN")}</span>
                  </div>
                </div>
                <p className="mt-3 text-base leading-8 text-muted">
                  {createExcerpt(faq.answer, 220)}
                </p>
              </Link>
            ))
          )}
        </div>
      </div>
    </main>
  );
}
