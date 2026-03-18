import { ContentStatus, Role } from "@prisma/client";
import Link from "next/link";
import { TrendChart } from "@/components/admin/trend-chart";
import { FormNotice } from "@/components/ui/form-notice";
import {
  formatShortDate,
  getPublishTrend,
  getSearchTrend,
  getTrendDelta,
  normalizeRangeDays,
} from "@/lib/admin-analytics";
import { db } from "@/lib/db";
import { requireRoles } from "@/lib/auth/session";
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

export default async function AdminDashboardPage({ searchParams }: Props) {
  await requireRoles([Role.ADMIN, Role.EDITOR]);
  const resolvedSearchParams = await searchParams;
  const feedback = await getFeedback(resolvedSearchParams);
  const selectedDays = normalizeRangeDays(getParam(resolvedSearchParams.days));
  const now = new Date();

  const [
    articles,
    faqs,
    categories,
    tags,
    drafts,
    publishedArticles,
    publishedFaqs,
    activeSessions,
    topQueries,
    recentArticles,
    recentFaqs,
    searchTrendSelected,
    searchTrendComparison,
    publishTrendSelected,
  ] = await Promise.all([
    db.article.count(),
    db.faq.count(),
    db.category.count(),
    db.tag.count(),
    db.article.count({
      where: {
        status: ContentStatus.DRAFT,
      },
    }),
    db.article.count({
      where: {
        status: ContentStatus.PUBLISHED,
      },
    }),
    db.faq.count({
      where: {
        status: ContentStatus.PUBLISHED,
      },
    }),
    db.session.count({
      where: {
        expiresAt: {
          gt: now,
        },
      },
    }),
    db.searchLog.groupBy({
      by: ["query"],
      _count: {
        query: true,
      },
      orderBy: {
        _count: {
          query: "desc",
        },
      },
      take: 5,
    }),
    db.article.findMany({
      orderBy: [{ updatedAt: "desc" }],
      take: 5,
      select: {
        id: true,
        title: true,
        updatedAt: true,
        status: true,
      },
    }),
    db.faq.findMany({
      orderBy: [{ updatedAt: "desc" }],
      take: 5,
      select: {
        id: true,
        question: true,
        updatedAt: true,
        status: true,
      },
    }),
    getSearchTrend(selectedDays),
    getSearchTrend(selectedDays * 2),
    getPublishTrend(selectedDays),
  ]);

  const currentSearchRange = searchTrendComparison
    .slice(-selectedDays)
    .reduce((sum, item) => sum + item.total, 0);
  const previousSearchRange = searchTrendComparison
    .slice(-selectedDays * 2, -selectedDays)
    .reduce((sum, item) => sum + item.total, 0);
  const currentNoResultRange = searchTrendComparison
    .slice(-selectedDays)
    .reduce((sum, item) => sum + item.no_result, 0);
  const previousNoResultRange = searchTrendComparison
    .slice(-selectedDays * 2, -selectedDays)
    .reduce((sum, item) => sum + item.no_result, 0);
  const currentPublishedRange = publishTrendSelected.reduce(
    (sum, item) => sum + item.published,
    0,
  );

  const cards = [
    { label: "Articles", value: articles, href: "/admin/articles" },
    { label: "FAQs", value: faqs, href: "/admin/faqs" },
    { label: "Categories", value: categories, href: "/admin/categories" },
    { label: "Tags", value: tags, href: "/admin/tags" },
    { label: "Draft articles", value: drafts, href: "/admin/articles" },
  ];

  return (
    <div className="space-y-6">
      <FormNotice feedback={feedback} />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {cards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="glass-panel rounded-[1.75rem] p-5 transition hover:-translate-y-0.5"
          >
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted">
              {card.label}
            </p>
            <p className="mt-3 text-4xl font-semibold tracking-tight">
              {card.value}
            </p>
          </Link>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <div className="glass-panel rounded-[1.8rem] p-6">
          <p className="font-mono text-sm uppercase tracking-[0.22em] text-accent-strong">
            Usage overview
          </p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-line bg-white p-4">
              <p className="text-sm text-muted">Published content</p>
              <p className="mt-2 text-3xl font-semibold">
                {publishedArticles + publishedFaqs}
              </p>
            </div>
            <div className="rounded-2xl border border-line bg-white p-4">
              <p className="text-sm text-muted">Active sessions</p>
              <p className="mt-2 text-3xl font-semibold">{activeSessions}</p>
            </div>
            <div className="rounded-2xl border border-line bg-white p-4">
              <p className="text-sm text-muted">Searches / {selectedDays} ngay</p>
              <p className="mt-2 text-3xl font-semibold">{currentSearchRange}</p>
            </div>
            <div className="rounded-2xl border border-line bg-white p-4">
              <p className="text-sm text-muted">No-result / {selectedDays} ngay</p>
              <p className="mt-2 text-3xl font-semibold">{currentNoResultRange}</p>
            </div>
          </div>

          <div className="mt-6 rounded-[1.6rem] border border-line bg-white p-4">
            <p className="text-sm font-medium">Top queries</p>
            <div className="mt-3 grid gap-2">
              {topQueries.length === 0 ? (
                <p className="text-sm text-muted">Chua co du lieu tim kiem.</p>
              ) : (
                topQueries.map((query) => (
                  <div
                    key={query.query}
                    className="flex items-center justify-between gap-3 text-sm"
                  >
                    <span>{query.query || "(empty)"}</span>
                    <span className="text-muted">{query._count.query} lan</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="glass-panel rounded-[1.8rem] p-6">
            <p className="font-mono text-sm uppercase tracking-[0.22em] text-accent-strong">
              Recent articles
            </p>
            <div className="mt-5 grid gap-3">
              {recentArticles.map((article) => (
                <div
                  key={article.id}
                  className="rounded-2xl border border-line bg-white p-4"
                >
                  <p className="font-medium">{article.title}</p>
                  <p className="mt-1 text-sm text-muted">
                    {article.status} - {article.updatedAt.toLocaleString("vi-VN")}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-panel rounded-[1.8rem] p-6">
            <p className="font-mono text-sm uppercase tracking-[0.22em] text-accent-strong">
              Recent faqs
            </p>
            <div className="mt-5 grid gap-3">
              {recentFaqs.map((faq) => (
                <div key={faq.id} className="rounded-2xl border border-line bg-white p-4">
                  <p className="font-medium">{faq.question}</p>
                  <p className="mt-1 text-sm text-muted">
                    {faq.status} - {faq.updatedAt.toLocaleString("vi-VN")}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <div className="xl:col-span-2">
          <form className="glass-panel rounded-[1.8rem] p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-mono text-sm uppercase tracking-[0.22em] text-accent-strong">
                  Trend range
                </p>
                <p className="mt-2 text-sm text-muted">
                  Chon khoang ngay de cap nhat charts, summary va file export.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  name="days"
                  defaultValue={String(selectedDays)}
                  className="rounded-2xl border border-line bg-white px-4 py-3 text-sm outline-none focus:border-accent"
                >
                  <option value="7">7 ngay</option>
                  <option value="14">14 ngay</option>
                  <option value="30">30 ngay</option>
                  <option value="90">90 ngay</option>
                </select>
                <button
                  type="submit"
                  className="rounded-full bg-accent px-5 py-3 text-sm font-medium text-white"
                >
                  Cap nhat
                </button>
              </div>
            </div>
          </form>
        </div>

        <TrendChart
          title={`Search trend ${selectedDays} ngay`}
          description="Luong tim kiem va so truy van no-result theo tung ngay."
          series={[
            {
              color: "#c46a2f",
              name: "Searches",
              points: searchTrendSelected.map((item) => ({
                label: formatShortDate(new Date(item.day)),
                value: item.total,
              })),
            },
            {
              color: "#d97706",
              name: "No-result",
              points: searchTrendSelected.map((item) => ({
                label: formatShortDate(new Date(item.day)),
                value: item.no_result,
              })),
            },
          ]}
        />

        <div className="grid gap-6">
          <div className="glass-panel rounded-[1.8rem] p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <p className="font-mono text-sm uppercase tracking-[0.22em] text-accent-strong">
                Range summary
              </p>
              <a
                href={`/api/admin/stats/export?days=${selectedDays}`}
                className="rounded-full border border-line px-4 py-2 text-sm font-medium text-accent-strong"
              >
                Export CSV
              </a>
            </div>
            <div className="mt-5 grid gap-4">
              <div className="rounded-2xl border border-line bg-white p-4">
                <p className="text-sm text-muted">
                  Searches vs {selectedDays} ngay truoc
                </p>
                <p className="mt-2 text-3xl font-semibold">{currentSearchRange}</p>
                <p className="mt-1 text-sm text-muted">
                  {getTrendDelta(currentSearchRange, previousSearchRange)}
                </p>
              </div>
              <div className="rounded-2xl border border-line bg-white p-4">
                <p className="text-sm text-muted">
                  No-result vs {selectedDays} ngay truoc
                </p>
                <p className="mt-2 text-3xl font-semibold">{currentNoResultRange}</p>
                <p className="mt-1 text-sm text-muted">
                  {getTrendDelta(currentNoResultRange, previousNoResultRange)}
                </p>
              </div>
              <div className="rounded-2xl border border-line bg-white p-4">
                <p className="text-sm text-muted">
                  Published content / {selectedDays} ngay
                </p>
                <p className="mt-2 text-3xl font-semibold">{currentPublishedRange}</p>
                <p className="mt-1 text-sm text-muted">
                  Tong article va FAQ duoc publish trong khoang da chon
                </p>
              </div>
            </div>
          </div>

          <TrendChart
            title={`Publishing trend ${selectedDays} ngay`}
            description="So article va FAQ duoc publish theo tung ngay."
            series={[
              {
                color: "#0f766e",
                name: "Published",
                points: publishTrendSelected.map((item) => ({
                  label: formatShortDate(new Date(item.day)),
                  value: item.published,
                })),
              },
            ]}
          />
        </div>
      </section>
    </div>
  );
}
