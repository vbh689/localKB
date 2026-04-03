import { ContentStatus, Prisma } from "generated/prisma/client";
import { db } from "@/lib/db";

export const PUBLISHED_CONTENT_SORT_OPTIONS = [
  "updated_desc",
  "updated_asc",
  "published_desc",
  "published_asc",
] as const;

export type PublishedContentSort = (typeof PUBLISHED_CONTENT_SORT_OPTIONS)[number];

export type PublishedContentFilters = {
  categorySlug?: string | null;
  query?: string | null;
  sort?: PublishedContentSort;
  updatedFrom?: Date | null;
  updatedTo?: Date | null;
};

const publishedArticleInclude = {
  category: true,
  tags: true,
  author: {
    select: {
      email: true,
      id: true,
      role: true,
    },
  },
} satisfies Prisma.ArticleInclude;

const publishedFaqInclude = {
  category: true,
  tags: true,
} satisfies Prisma.FaqInclude;

function buildUpdatedAtFilter(filters: PublishedContentFilters) {
  if (!filters.updatedFrom && !filters.updatedTo) {
    return undefined;
  }

  return {
    gte: filters.updatedFrom ?? undefined,
    lte: filters.updatedTo ?? undefined,
  } satisfies Prisma.DateTimeFilter;
}

function buildPublishedArticleWhere(filters: PublishedContentFilters = {}) {
  return {
    category: filters.categorySlug
      ? {
          slug: filters.categorySlug,
        }
      : undefined,
    OR: filters.query
      ? [
          {
            title: {
              contains: filters.query,
              mode: "insensitive",
            },
          },
          {
            body: {
              contains: filters.query,
              mode: "insensitive",
            },
          },
        ]
      : undefined,
    status: ContentStatus.PUBLISHED,
    updatedAt: buildUpdatedAtFilter(filters),
  } satisfies Prisma.ArticleWhereInput;
}

function buildPublishedFaqWhere(filters: PublishedContentFilters = {}) {
  return {
    category: filters.categorySlug
      ? {
          slug: filters.categorySlug,
        }
      : undefined,
    OR: filters.query
      ? [
          {
            question: {
              contains: filters.query,
              mode: "insensitive",
            },
          },
          {
            answer: {
              contains: filters.query,
              mode: "insensitive",
            },
          },
        ]
      : undefined,
    status: ContentStatus.PUBLISHED,
    updatedAt: buildUpdatedAtFilter(filters),
  } satisfies Prisma.FaqWhereInput;
}

export function getPublishedContentSort(
  value: string | null | undefined,
): PublishedContentSort {
  if (
    value &&
    PUBLISHED_CONTENT_SORT_OPTIONS.includes(value as PublishedContentSort)
  ) {
    return value as PublishedContentSort;
  }

  return "updated_desc";
}

function getArticleOrderBy(
  sort: PublishedContentSort,
): Prisma.ArticleOrderByWithRelationInput[] {
  switch (sort) {
    case "updated_asc":
      return [{ updatedAt: "asc" }];
    case "published_desc":
      return [{ publishedAt: "desc" }, { updatedAt: "desc" }];
    case "published_asc":
      return [{ publishedAt: "asc" }, { updatedAt: "asc" }];
    case "updated_desc":
    default:
      return [{ updatedAt: "desc" }];
  }
}

function getFaqOrderBy(sort: PublishedContentSort): Prisma.FaqOrderByWithRelationInput[] {
  switch (sort) {
    case "updated_asc":
      return [{ updatedAt: "asc" }];
    case "published_desc":
      return [{ publishedAt: "desc" }, { updatedAt: "desc" }];
    case "published_asc":
      return [{ publishedAt: "asc" }, { updatedAt: "asc" }];
    case "updated_desc":
    default:
      return [{ updatedAt: "desc" }];
  }
}

export async function getHomepageCounts() {
  const [articleCount, faqCount, todayCount] = await Promise.all([
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
    db.article.count({
      where: {
        status: ContentStatus.PUBLISHED,
        updatedAt: {
          gte: new Date(Date.now() - 1000 * 60 * 60 * 24),
        },
      },
    }),
  ]);

  return {
    articleCount,
    faqCount,
    todayCount,
  };
}

export async function getFeaturedArticles(limit = 5) {
  return db.article.findMany({
    where: {
      status: ContentStatus.PUBLISHED,
    },
    orderBy: [{ updatedAt: "desc" }],
    take: limit,
    include: publishedArticleInclude,
  });
}

export async function getPublishedArticlesPage(
  page: number,
  pageSize: number,
  filters: PublishedContentFilters = {},
) {
  return db.article.findMany({
    where: buildPublishedArticleWhere(filters),
    orderBy: getArticleOrderBy(filters.sort ?? "updated_desc"),
    skip: (page - 1) * pageSize,
    take: pageSize,
    include: publishedArticleInclude,
  });
}

export async function getPublishedArticlesCount(filters: PublishedContentFilters = {}) {
  return db.article.count({
    where: buildPublishedArticleWhere(filters),
  });
}

export async function getNewestFaqs(limit = 5) {
  return db.faq.findMany({
    where: {
      status: ContentStatus.PUBLISHED,
    },
    orderBy: [{ updatedAt: "desc" }],
    take: limit,
    include: publishedFaqInclude,
  });
}

export async function getPublishedFaqsPage(
  page: number,
  pageSize: number,
  filters: PublishedContentFilters = {},
) {
  return db.faq.findMany({
    where: buildPublishedFaqWhere(filters),
    orderBy: getFaqOrderBy(filters.sort ?? "updated_desc"),
    skip: (page - 1) * pageSize,
    take: pageSize,
    include: publishedFaqInclude,
  });
}

export async function getPublishedFaqsCount(filters: PublishedContentFilters = {}) {
  return db.faq.count({
    where: buildPublishedFaqWhere(filters),
  });
}

export async function getPublishedArticleBySlug(slug: string) {
  return db.article.findFirst({
    where: {
      slug,
      status: ContentStatus.PUBLISHED,
    },
    include: publishedArticleInclude,
  });
}

export async function getPublishedFaqBySlug(slug: string) {
  return db.faq.findFirst({
    where: {
      slug,
      status: ContentStatus.PUBLISHED,
    },
    include: publishedFaqInclude,
  });
}
