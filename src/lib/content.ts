import { ContentStatus, Prisma } from "@prisma/client";
import { cache } from "react";
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

export const getHomepageCounts = cache(async () => {
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
});

export const getFeaturedArticles = cache(async () => {
  return db.article.findMany({
    where: {
      status: ContentStatus.PUBLISHED,
    },
    orderBy: [{ updatedAt: "desc" }],
    take: 3,
    include: publishedArticleInclude,
  });
});

export const getPublishedArticleBySlug = cache(async (slug: string) => {
  return db.article.findFirst({
    where: {
      slug,
      status: ContentStatus.PUBLISHED,
    },
    include: publishedArticleInclude,
  });
});

export const getPublishedFaqBySlug = cache(async (slug: string) => {
  return db.faq.findFirst({
    where: {
      slug,
      status: ContentStatus.PUBLISHED,
    },
    include: publishedFaqInclude,
  });
});

export const getPublishedFaqs = cache(async () => {
  return db.faq.findMany({
    where: {
      status: ContentStatus.PUBLISHED,
    },
    orderBy: [{ updatedAt: "desc" }],
    include: publishedFaqInclude,
  });
});

