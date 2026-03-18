import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export type SearchTrendRow = {
  day: Date;
  no_result: number;
  total: number;
};

export type PublishTrendRow = {
  day: Date;
  published: number;
};

export function normalizeRangeDays(value: string | null | undefined) {
  const days = Number.parseInt(value ?? "30", 10);

  if (![7, 14, 30, 90].includes(days)) {
    return 30;
  }

  return days;
}

export function formatShortDate(date: Date) {
  return date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
  });
}

export function getTrendDelta(current: number, previous: number) {
  if (previous === 0) {
    return current === 0 ? "0%" : "+100%";
  }

  const delta = Math.round(((current - previous) / previous) * 100);
  return `${delta > 0 ? "+" : ""}${delta}%`;
}

export async function getSearchTrend(days: number) {
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

export async function getPublishTrend(days: number) {
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
