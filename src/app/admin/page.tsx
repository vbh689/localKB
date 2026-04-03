import { ContentStatus, Role } from "generated/prisma/client";
import Link from "next/link";
import { TrendChart } from "@/components/admin/trend-chart";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { FormNotice } from "@/components/ui/form-notice";
import {
  formatShortDate,
  getPublishTrend,
  getSearchTrend,
  getTrendDelta,
  normalizeRangeDays,
} from "@/lib/admin-analytics";
import { checkSystemHealth } from "@/lib/health";
import { createTitlePreview } from "@/lib/content-preview";
import { db } from "@/lib/db";
import { requireRoles } from "@/lib/auth/session";
import { getFeedback, type SearchParamInput } from "@/lib/feedback";
import { areTagsEnabled } from "@/lib/features";
import { rebuildSearchIndex } from "@/app/admin/actions";

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
    tagCount,
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
    areTagsEnabled ? db.tag.count() : Promise.resolve(0),
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
  const health = await checkSystemHealth();

  const cards = [
    { label: "Articles", value: articles, href: "/admin/articles" },
    { label: "FAQs", value: faqs, href: "/admin/faqs" },
    { label: "Categories", value: categories, href: "/admin/categories" },
    ...(areTagsEnabled
      ? [{ label: "Tags", value: tagCount, href: "/admin/tags" }]
      : []),
    {
      label: "Draft articles",
      value: drafts,
      href: `/admin/articles?status=${ContentStatus.DRAFT}`,
    },
  ];

  return (
    <div className="space-y-6">
      <FormNotice feedback={feedback} />

      <section
        className={`grid gap-4 md:grid-cols-2 ${
          cards.length === 5 ? "xl:grid-cols-5" : "xl:grid-cols-4"
        }`}
      >
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
            <Link
              href={`/admin/articles?status=${ContentStatus.PUBLISHED}`}
              className="rounded-2xl border border-line bg-white p-4 transition hover:-translate-y-0.5 hover:border-accent/30"
            >
              <p className="text-sm text-muted">Published content</p>
              <p className="mt-2 text-3xl font-semibold">
                {publishedArticles + publishedFaqs}
              </p>
            </Link>
            <Link
              href="/admin/users"
              className="rounded-2xl border border-line bg-white p-4 transition hover:-translate-y-0.5 hover:border-accent/30"
            >
              <p className="text-sm text-muted">Active sessions</p>
              <p className="mt-2 text-3xl font-semibold">{activeSessions}</p>
            </Link>
            <Link
              href="/admin/search-logs"
              className="rounded-2xl border border-line bg-white p-4 transition hover:-translate-y-0.5 hover:border-accent/30"
            >
              <p className="text-sm text-muted">Searches / {selectedDays} ngày</p>
              <p className="mt-2 text-3xl font-semibold">{currentSearchRange}</p>
            </Link>
            <Link
              href="/admin/search-logs?resultFilter=no_result"
              className="rounded-2xl border border-line bg-white p-4 transition hover:-translate-y-0.5 hover:border-accent/30"
            >
              <p className="text-sm text-muted">No-result / {selectedDays} ngày</p>
              <p className="mt-2 text-3xl font-semibold">{currentNoResultRange}</p>
            </Link>
          </div>

          <div className="mt-6 rounded-[1.6rem] border border-line bg-white p-4">
            <p className="text-sm font-medium">Top queries</p>
            <div className="mt-3 grid gap-2">
              {topQueries.length === 0 ? (
                <p className="text-sm text-muted">Chưa có dữ liệu tìm kiếm.</p>
              ) : (
                topQueries.map((query) => (
                  <Link
                    key={query.query}
                    href={`/admin/search-logs?query=${encodeURIComponent(query.query || "")}`}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-transparent px-3 py-2 text-sm transition hover:border-line hover:bg-background"
                  >
                    <span>{query.query || "(empty)"}</span>
                    <span className="text-muted">{query._count.query} lần</span>
                  </Link>
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
                  <Link
                    key={article.id}
                    href={`/admin/articles?q=${encodeURIComponent(article.title)}`}
                    className="rounded-2xl border border-line bg-white p-4 transition hover:-translate-y-0.5 hover:border-accent/30"
                  >
                    <p
                      title={article.title}
                      className="overflow-hidden text-sm font-medium"
                      style={{
                        WebkitBoxOrient: "vertical",
                        WebkitLineClamp: 2,
                        display: "-webkit-box",
                      }}
                    >
                      {createTitlePreview(article.title)}
                    </p>
                    <p className="mt-1 text-sm text-muted">
                      {article.status} - {article.updatedAt.toLocaleString("vi-VN")}
                    </p>
                  </Link>
                ))}
              </div>
            </div>

          <div className="glass-panel rounded-[1.8rem] p-6">
              <p className="font-mono text-sm uppercase tracking-[0.22em] text-accent-strong">
                Recent FAQs
              </p>
              <div className="mt-5 grid gap-3">
                {recentFaqs.map((faq) => (
                  <Link
                    key={faq.id}
                    href={`/admin/faqs?q=${encodeURIComponent(faq.question)}`}
                    className="rounded-2xl border border-line bg-white p-4 transition hover:-translate-y-0.5 hover:border-accent/30"
                  >
                    <p
                      title={faq.question}
                      className="overflow-hidden text-sm font-medium"
                      style={{
                        WebkitBoxOrient: "vertical",
                        WebkitLineClamp: 2,
                        display: "-webkit-box",
                      }}
                    >
                      {createTitlePreview(faq.question)}
                    </p>
                    <p className="mt-1 text-sm text-muted">
                      {faq.status} - {faq.updatedAt.toLocaleString("vi-VN")}
                    </p>
                  </Link>
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
                  Chọn khoảng ngày để cập nhật biểu đồ
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  name="days"
                  defaultValue={String(selectedDays)}
                  className="rounded-2xl border border-line bg-white px-4 py-3 text-sm outline-none focus:border-accent"
                >
                  <option value="7">7 ngày</option>
                  <option value="14">14 ngày</option>
                  <option value="30">30 ngày</option>
                  <option value="90">90 ngày</option>
                </select>
                <button
                  type="submit"
                  className="rounded-full bg-accent px-5 py-3 text-sm font-medium text-white"
                >
                  Cập nhật
                </button>
              </div>
            </div>
          </form>
        </div>

        <TrendChart
          title={`Search trend ${selectedDays} ngày`}
          description="Lượng tìm kiếm và số truy vấn không có kết quả theo từng ngày."
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
            <p className="font-mono text-sm uppercase tracking-[0.22em] text-accent-strong">
              Range summary
            </p>
            <div className="mt-5 grid gap-4">
              <Link
                href="/admin/search-logs"
                className="rounded-2xl border border-line bg-white p-4 transition hover:-translate-y-0.5 hover:border-accent/30"
              >
                <p className="text-sm text-muted">
                  Searches vs {selectedDays} ngày trước
                </p>
                <p className="mt-2 text-3xl font-semibold">{currentSearchRange}</p>
                <p className="mt-1 text-sm text-muted">
                  {getTrendDelta(currentSearchRange, previousSearchRange)}
                </p>
              </Link>
              <Link
                href="/admin/search-logs?resultFilter=no_result"
                className="rounded-2xl border border-line bg-white p-4 transition hover:-translate-y-0.5 hover:border-accent/30"
              >
                <p className="text-sm text-muted">
                  No-result vs {selectedDays} ngày trước
                </p>
                <p className="mt-2 text-3xl font-semibold">{currentNoResultRange}</p>
                <p className="mt-1 text-sm text-muted">
                  {getTrendDelta(currentNoResultRange, previousNoResultRange)}
                </p>
              </Link>
              <Link
                href={`/admin/articles?status=${ContentStatus.PUBLISHED}`}
                className="rounded-2xl border border-line bg-white p-4 transition hover:-translate-y-0.5 hover:border-accent/30"
              >
                <p className="text-sm text-muted">
                  Published content / {selectedDays} ngày
                </p>
                <p className="mt-2 text-3xl font-semibold">{currentPublishedRange}</p>
                <p className="mt-1 text-sm text-muted">
                  Tổng article và FAQ được xuất bản trong khoảng đã chọn.
                </p>
              </Link>
            </div>
          </div>

          <TrendChart
            title={`Publishing trend ${selectedDays} ngày`}
            description="Số article và FAQ được xuất bản theo từng ngày."
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

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-[1.8rem] border border-line bg-white p-5 shadow-[0_12px_40px_rgba(23,27,32,0.06)]">
          <p className="font-mono text-sm uppercase tracking-[0.22em] text-accent-strong">
            Search index
          </p>
          <p className="mt-3 text-sm leading-7 text-muted">
            Dùng mục này khi ô tìm kiếm chưa hiện đúng bài viết hoặc FAQ mới nhất. Hệ thống sẽ cập nhật lại dữ liệu tìm kiếm để mọi người tra cứu ra kết quả đầy đủ và chính xác hơn.
          </p>
          <form action={rebuildSearchIndex} className="mt-5">
            <input type="hidden" name="redirectTo" value="/admin" />
            <ConfirmSubmitButton
              confirmMessage="Rebuild toàn bộ search index ngay bây giờ?"
              className="inline-flex w-full items-center justify-center rounded-full bg-accent px-5 py-3 text-sm font-medium text-white transition hover:bg-accent-strong"
            >
              Rebuild search index
            </ConfirmSubmitButton>
          </form>
        </div>

        <div className="glass-panel rounded-[1.8rem] p-6">
          <p className="font-mono text-sm uppercase tracking-[0.22em] text-accent-strong">
            System health
          </p>
          <div className="mt-5 grid gap-3">
            <div className="rounded-2xl border border-line bg-white p-4">
              <p className="text-sm text-muted">App</p>
              <p className="mt-2 text-2xl font-semibold capitalize">
                {health.app.status}
              </p>
            </div>
            <div className="rounded-2xl border border-line bg-white p-4">
              <p className="text-sm text-muted">Database</p>
              <p className="mt-2 text-2xl font-semibold capitalize">
                {health.db.status}
              </p>
              <p className="mt-1 text-sm text-muted">{health.db.latencyMs} ms</p>
            </div>
            <div className="rounded-2xl border border-line bg-white p-4">
              <p className="text-sm text-muted">Search</p>
              <p className="mt-2 text-2xl font-semibold capitalize">
                {health.search.status}
              </p>
              <p className="mt-1 text-sm text-muted">{health.search.latencyMs} ms</p>
            </div>
            <div className="rounded-2xl border border-line bg-white p-4">
              <p className="text-sm text-muted">Overall</p>
              <p className="mt-2 text-2xl font-semibold capitalize">
                {health.status}
              </p>
              <p className="mt-1 text-sm text-muted">
                {new Date(health.timestamp).toLocaleString("vi-VN")}
              </p>
            </div>
          </div>
          <p className="mt-4 text-sm text-muted">
            Xem trực tiếp tại <Link href="/api/health" className="text-accent-strong">/api/health</Link>.
          </p>
        </div>
      </section>
    </div>
  );
}
