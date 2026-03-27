import { ContentStatus, Prisma } from "generated/prisma/client";
import { db } from "@/lib/db";

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

export async function getPublishedArticlesPage(page: number, pageSize: number) {
  return db.article.findMany({
    where: {
      status: ContentStatus.PUBLISHED,
    },
    orderBy: [{ updatedAt: "desc" }],
    skip: (page - 1) * pageSize,
    take: pageSize,
    include: publishedArticleInclude,
  });
}

export async function getPublishedArticlesCount() {
  return db.article.count({
    where: {
      status: ContentStatus.PUBLISHED,
    },
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

export async function getPublishedFaqsPage(page: number, pageSize: number) {
  return db.faq.findMany({
    where: {
      status: ContentStatus.PUBLISHED,
    },
    orderBy: [{ updatedAt: "desc" }],
    skip: (page - 1) * pageSize,
    take: pageSize,
    include: publishedFaqInclude,
  });
}

export async function getPublishedFaqsCount() {
  return db.faq.count({
    where: {
      status: ContentStatus.PUBLISHED,
    },
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
