import { ContentStatus, Prisma } from "generated/prisma/client";
import { db } from "@/lib/db";
import { createExcerpt } from "@/lib/utils";
import { ensureSearchIndex } from "@/lib/search-index";
import { searchClient } from "@/lib/search";
import { logError } from "@/lib/logger";

export type SearchItem = {
  id: string;
  type: "article" | "faq";
  title: string;
  slug: string;
  summary?: string;
  category: string | null;
  tags: string[];
  highlight?: string;
};

export type SearchPayload = {
  page: number;
  pageSize: number;
  query: string;
  results: SearchItem[];
  totalCount: number;
  totalPages: number;
  totalByType: {
    article: number;
    faq: number;
  };
};

export type SearchFilters = {
  category?: string | null;
  tag?: string | null;
  type?: "article" | "faq" | null;
};

function escapeMeiliFilterValue(value: string) {
  return value.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
}

function buildFallbackWhere(filters: SearchFilters) {
  const categoryFilter = filters.category?.trim() || null;
  const tagFilter = filters.tag?.trim() || null;

  return {
    category: categoryFilter
      ? {
          is: {
            name: {
              equals: categoryFilter,
              mode: "insensitive" as const,
            },
          },
        }
      : undefined,
    tags: tagFilter
      ? {
          some: {
            name: {
              equals: tagFilter,
              mode: "insensitive" as const,
            },
          },
        }
      : undefined,
  };
}

function createEmptyPayload(
  query: string,
  page: number,
  pageSize: number,
): SearchPayload {
  return {
    page,
    pageSize,
    query,
    results: [],
    totalCount: 0,
    totalPages: 0,
    totalByType: {
      article: 0,
      faq: 0,
    },
  };
}

async function searchPublishedContentFallback(
  query: string,
  pageSize: number,
  page: number,
  filters: SearchFilters,
): Promise<SearchPayload> {
  const typeFilter = filters.type ?? null;
  const baseWhere = buildFallbackWhere(filters);
  const safePage = Math.max(1, page);
  const offset = (safePage - 1) * pageSize;

  const articleWhere: Prisma.ArticleWhereInput | null =
    typeFilter === "faq"
      ? null
      : {
          status: ContentStatus.PUBLISHED,
          ...baseWhere,
          ...(query
            ? {
                OR: [
                  { title: { contains: query, mode: "insensitive" as const } },
                  { body: { contains: query, mode: "insensitive" as const } },
                  {
                    category: {
                      is: {
                        name: { contains: query, mode: "insensitive" as const },
                      },
                    },
                  },
                  {
                    tags: {
                      some: { name: { contains: query, mode: "insensitive" as const } },
                    },
                  },
                ],
              }
            : {}),
        };

  const faqWhere: Prisma.FaqWhereInput | null =
    typeFilter === "article"
      ? null
      : {
          status: ContentStatus.PUBLISHED,
          ...baseWhere,
          ...(query
            ? {
                OR: [
                  { question: { contains: query, mode: "insensitive" as const } },
                  { answer: { contains: query, mode: "insensitive" as const } },
                  {
                    category: {
                      is: {
                        name: { contains: query, mode: "insensitive" as const },
                      },
                    },
                  },
                  {
                    tags: {
                      some: { name: { contains: query, mode: "insensitive" as const } },
                    },
                  },
                ],
              }
            : {}),
        };

  const [articleCount, faqCount] = await Promise.all([
    articleWhere ? db.article.count({ where: articleWhere }) : Promise.resolve(0),
    faqWhere ? db.faq.count({ where: faqWhere }) : Promise.resolve(0),
  ]);

  const totalCount = articleCount + faqCount;

  if (totalCount === 0) {
    return {
      page: safePage,
      pageSize,
      query,
      results: [],
      totalCount,
      totalPages: 0,
      totalByType: {
        article: articleCount,
        faq: faqCount,
      },
    };
  }

  const articleSkip = offset < articleCount ? offset : articleCount;
  const articlesToTake = Math.max(0, Math.min(pageSize, articleCount - articleSkip));
  const faqSkip = offset < articleCount ? 0 : offset - articleCount;
  const faqsToTake = Math.max(0, pageSize - articlesToTake);

  const [articles, faqs] = await Promise.all([
    articleWhere && articlesToTake > 0
      ? db.article.findMany({
          where: articleWhere,
          include: {
            category: true,
            tags: true,
          },
          orderBy: [{ updatedAt: "desc" }],
          skip: articleSkip,
          take: articlesToTake,
        })
      : Promise.resolve([]),
    faqWhere && faqsToTake > 0
      ? db.faq.findMany({
          where: faqWhere,
          include: {
            category: true,
            tags: true,
          },
          orderBy: [{ updatedAt: "desc" }],
          skip: faqSkip,
          take: faqsToTake,
        })
      : Promise.resolve([]),
  ]);

  const articleResults: SearchItem[] = articles.map((article) => ({
    category: article.category?.name ?? null,
    id: article.id,
    slug: article.slug,
    tags: article.tags.map((tag) => tag.name),
    title: article.title,
    type: "article",
  }));

  const faqResults: SearchItem[] = faqs.map((faq) => ({
    category: faq.category?.name ?? null,
    highlight: createExcerpt(faq.answer, 140),
    id: faq.id,
    slug: faq.slug,
    summary: createExcerpt(faq.answer, 160),
    tags: faq.tags.map((tag) => tag.name),
    title: faq.question,
    type: "faq",
  }));

  return {
    page: safePage,
    pageSize,
    query,
    results: [...articleResults, ...faqResults],
    totalCount,
    totalPages: Math.ceil(totalCount / pageSize),
    totalByType: {
      article: articleCount,
      faq: faqCount,
    },
  };
}

export async function searchPublishedContent(
  rawQuery: string,
  pageSize = 10,
  filters: SearchFilters = {},
  page = 1,
): Promise<SearchPayload> {
  const query = rawQuery.trim();
  const safePageSize = Math.max(1, pageSize);
  const safePage = Math.max(1, page);
  const hasFilters =
    Boolean(filters.type) || Boolean(filters.category?.trim()) || Boolean(filters.tag?.trim());

  if (query.length < 2 && !hasFilters) {
    return createEmptyPayload(query, safePage, safePageSize);
  }

  if (query.length < 2 && hasFilters) {
    return searchPublishedContentFallback(query, safePageSize, safePage, filters);
  }

  let payload: SearchPayload;

  try {
    await ensureSearchIndex();

    const filterExpressions: string[] = [];

    if (filters.type) {
      filterExpressions.push(`type = "${filters.type}"`);
    }

    if (filters.category?.trim()) {
      filterExpressions.push(
        `category = "${escapeMeiliFilterValue(filters.category.trim())}"`,
      );
    }

    if (filters.tag?.trim()) {
      filterExpressions.push(`tags = "${escapeMeiliFilterValue(filters.tag.trim())}"`);
    }

    const index = searchClient.index<{
      id: string;
      recordId: string;
      type: "article" | "faq";
      title: string;
      slug: string;
      summary?: string;
      highlight?: string;
      category: string | null;
      tags: string[];
    }>("knowledge_base");

    const result = await index.search(query, {
      attributesToHighlight: ["title", "summary", "highlight"],
      filter: filterExpressions.length > 0 ? filterExpressions.join(" AND ") : undefined,
      page: safePage,
      hitsPerPage: safePageSize,
      showMatchesPosition: false,
    });

    const results: SearchItem[] = result.hits.map((item) => ({
      category: item.category,
      highlight: item.highlight,
      id: item.recordId,
      slug: item.slug,
      summary: item.summary,
      tags: item.tags,
      title: item.title,
      type: item.type,
    }));

    const totalCount =
      ("estimatedTotalHits" in result && typeof result.estimatedTotalHits === "number"
        ? result.estimatedTotalHits
        : "totalHits" in result && typeof result.totalHits === "number"
          ? result.totalHits
          : results.length);

    payload = {
      page: safePage,
      pageSize: safePageSize,
      query,
      results,
      totalCount,
      totalPages: Math.ceil(totalCount / safePageSize),
      totalByType: {
        article: results.filter((item) => item.type === "article").length,
        faq: results.filter((item) => item.type === "faq").length,
      },
    };
  } catch (error) {
    logError("search.query", "Meilisearch search failed; falling back to Prisma.", error, {
      filters,
      query,
    });
    payload = await searchPublishedContentFallback(query, safePageSize, safePage, filters);
  }

  await db.searchLog.create({
    data: {
      query,
      resultCount: payload.results.length,
      resultType:
        payload.totalByType.article > 0 && payload.totalByType.faq === 0
          ? "ARTICLE"
          : payload.totalByType.faq > 0 && payload.totalByType.article === 0
            ? "FAQ"
            : null,
    },
  });

  return payload;
}
