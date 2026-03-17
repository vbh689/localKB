import { ContentStatus, Prisma, Role } from "@prisma/client";
import Link from "next/link";
import { TrendChart } from "@/components/admin/trend-chart";
import { FormNotice } from "@/components/ui/form-notice";
import { db } from "@/lib/db";
import { requireRoles } from "@/lib/auth/session";
import { getFeedback, type SearchParamInput } from "@/lib/feedback";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: SearchParamInput;
};

type SearchTrendRow = {
  day: Date;
  no_result: number;
  total: number;
};

type PublishTrendRow = {
  day: Date;
  published: number;
};

function formatShortDate(date: Date) {
  return date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
  });
}

function getTrendDelta(current: number, previous: number) {
  if (previous === 0) {
    return current === 0 ? "0%" : "+100%";
  }

  const delta = Math.round(((current - previous) / previous) * 100);
  return `${delta > 0 ? "+" : ""}${delta}%`;
}

async function getSearchTrend(days: number) {
  return db.$queryRaw<SearchTrendRow[]>(Prisma.sql`
    SELECT
      day::date AS day,
      COALESCE(COUNT(sl.id), 0)::int AS total,
      COALESCE(COUNT(*) FILTER (WHERE sl."resultCount" = 0), 0)::int AS no_result
    FROM generate_series(
      date_trunc('day', NOW()) - (${days - 1} * interval '1 day'),
      date_trunc('day', NOW()),
      interval '1 day'
    ) AS day
    LEFT JOIN "SearchLog" sl
      ON date_trunc('day', sl."createdAt") = day
    GROUP BY day
    ORDER BY day ASC
  `);
}

async function getPublishTrend(days: number) {
  return db.$queryRaw<PublishTrendRow[]>(Prisma.sql`
    SELECT
      day::date AS day,
      COALESCE(COUNT(published_items.day), 0)::int AS published
    FROM generate_series(
      date_trunc('day', NOW()) - (${days - 1} * interval '1 day'),
      date_trunc('day', NOW()),
      interval '1 day'
    ) AS day
    LEFT JOIN (
      SELECT "publishedAt"::date AS day
      FROM "Article"
      WHERE "publishedAt" IS NOT NULL
      UNION ALL
      SELECT "publishedAt"::date AS day
      FROM "Faq"
      WHERE "publishedAt" IS NOT NULL
    ) AS published_items
      ON published_items.day = day::date
    GROUP BY day
    ORDER BY day ASC
  `);
}

export default async function AdminDashboardPage({ searchParams }: Props) {
  await requireRoles([Role.ADMIN, Role.EDITOR]);
  const feedback = await getFeedback(searchParams);
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 1000 * 60 * 60 * 24 * 7);

  const [
    articles,
    faqs,
    categories,
    tags,
    drafts,
    publishedArticles,
    publishedFaqs,
    searchCountLast7d,
    noResultLast7d,
    activeSessions,
    topQueries,
    recentArticles,
    recentFaqs,
    searchTrend30d,
    publishTrend30d,
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
    db.searchLog.count({
      where: {
        createdAt: {
          gte: sevenDaysAgo,
        },
      },
    }),
    db.searchLog.count({
      where: {
        createdAt: {
          gte: sevenDaysAgo,
        },
        resultCount: 0,
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
    getSearchTrend(30),
    getPublishTrend(30),
  ]);

  const currentSearch7d = searchTrend30d
    .slice(-7)
    .reduce((sum, item) => sum + item.total, 0);
  const previousSearch7d = searchTrend30d
    .slice(-14, -7)
    .reduce((sum, item) => sum + item.total, 0);
  const currentNoResult7d = searchTrend30d
    .slice(-7)
    .reduce((sum, item) => sum + item.no_result, 0);
  const previousNoResult7d = searchTrend30d
    .slice(-14, -7)
    .reduce((sum, item) => sum + item.no_result, 0);
  const currentPublished30d = publishTrend30d.reduce(
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
              <p className="text-sm text-muted">Searches / 7 ngay</p>
              <p className="mt-2 text-3xl font-semibold">{searchCountLast7d}</p>
            </div>
            <div className="rounded-2xl border border-line bg-white p-4">
              <p className="text-sm text-muted">No-result / 7 ngay</p>
              <p className="mt-2 text-3xl font-semibold">{noResultLast7d}</p>
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
        <TrendChart
          title="Search trend 30 ngay"
          description="Luong tim kiem va so truy van no-result theo tung ngay."
          series={[
            {
              color: "#c46a2f",
              name: "Searches",
              points: searchTrend30d.map((item) => ({
                label: formatShortDate(new Date(item.day)),
                value: item.total,
              })),
            },
            {
              color: "#d97706",
              name: "No-result",
              points: searchTrend30d.map((item) => ({
                label: formatShortDate(new Date(item.day)),
                value: item.no_result,
              })),
            },
          ]}
        />

        <div className="grid gap-6">
          <div className="glass-panel rounded-[1.8rem] p-6">
            <p className="font-mono text-sm uppercase tracking-[0.22em] text-accent-strong">
              7-day trend
            </p>
            <div className="mt-5 grid gap-4">
              <div className="rounded-2xl border border-line bg-white p-4">
                <p className="text-sm text-muted">Searches vs 7 ngay truoc</p>
                <p className="mt-2 text-3xl font-semibold">{currentSearch7d}</p>
                <p className="mt-1 text-sm text-muted">
                  {getTrendDelta(currentSearch7d, previousSearch7d)}
                </p>
              </div>
              <div className="rounded-2xl border border-line bg-white p-4">
                <p className="text-sm text-muted">No-result vs 7 ngay truoc</p>
                <p className="mt-2 text-3xl font-semibold">{currentNoResult7d}</p>
                <p className="mt-1 text-sm text-muted">
                  {getTrendDelta(currentNoResult7d, previousNoResult7d)}
                </p>
              </div>
              <div className="rounded-2xl border border-line bg-white p-4">
                <p className="text-sm text-muted">Published content / 30 ngay</p>
                <p className="mt-2 text-3xl font-semibold">{currentPublished30d}</p>
                <p className="mt-1 text-sm text-muted">
                  Tong article va FAQ duoc publish trong 30 ngay gan day
                </p>
              </div>
            </div>
          </div>

          <TrendChart
            title="Publishing trend 30 ngay"
            description="So article va FAQ duoc publish theo tung ngay."
            series={[
              {
                color: "#0f766e",
                name: "Published",
                points: publishTrend30d.map((item) => ({
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
