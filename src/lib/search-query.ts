import { ContentStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { createExcerpt } from "@/lib/utils";
import { ensureSearchIndex } from "@/lib/search-index";
import { searchClient } from "@/lib/search";

export type SearchItem = {
  id: string;
  type: "article" | "faq";
  title: string;
  slug: string;
  summary: string;
  category: string | null;
  tags: string[];
  highlight: string;
};

export type SearchPayload = {
  query: string;
  results: SearchItem[];
  totalByType: {
    article: number;
    faq: number;
  };
};

function createEmptyPayload(query: string): SearchPayload {
  return {
    query,
    results: [],
    totalByType: {
      article: 0,
      faq: 0,
    },
  };
}

async function searchPublishedContentFallback(
  query: string,
  limitPerType: number,
): Promise<SearchPayload> {
  const [articles, faqs] = await Promise.all([
    db.article.findMany({
      where: {
        status: ContentStatus.PUBLISHED,
        OR: [
          { title: { contains: query, mode: "insensitive" } },
          { summary: { contains: query, mode: "insensitive" } },
          { body: { contains: query, mode: "insensitive" } },
          { category: { is: { name: { contains: query, mode: "insensitive" } } } },
          { tags: { some: { name: { contains: query, mode: "insensitive" } } } },
        ],
      },
      include: {
        category: true,
        tags: true,
      },
      orderBy: [{ updatedAt: "desc" }],
      take: limitPerType,
    }),
    db.faq.findMany({
      where: {
        status: ContentStatus.PUBLISHED,
        OR: [
          { question: { contains: query, mode: "insensitive" } },
          { answer: { contains: query, mode: "insensitive" } },
          { category: { is: { name: { contains: query, mode: "insensitive" } } } },
          { tags: { some: { name: { contains: query, mode: "insensitive" } } } },
        ],
      },
      include: {
        category: true,
        tags: true,
      },
      orderBy: [{ updatedAt: "desc" }],
      take: limitPerType,
    }),
  ]);

  const articleResults: SearchItem[] = articles.map((article) => ({
    category: article.category?.name ?? null,
    highlight: article.summary || createExcerpt(article.body, 140),
    id: article.id,
    slug: article.slug,
    summary: article.summary,
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
    query,
    results: [...articleResults, ...faqResults],
    totalByType: {
      article: articleResults.length,
      faq: faqResults.length,
    },
  };
}

export async function searchPublishedContent(
  rawQuery: string,
  limitPerType = 5,
): Promise<SearchPayload> {
  const query = rawQuery.trim();

  if (query.length < 2) {
    return createEmptyPayload(query);
  }

  let payload: SearchPayload;

  try {
    await ensureSearchIndex();

    const result = await searchClient
      .index<{
        id: string;
        recordId: string;
        type: "article" | "faq";
        title: string;
        slug: string;
        summary: string;
        highlight: string;
        category: string | null;
        tags: string[];
      }>("knowledge_base")
      .search(query, {
        attributesToHighlight: ["title", "summary", "highlight"],
        hitsPerPage: limitPerType * 2,
        limit: limitPerType * 2,
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

    payload = {
      query,
      results,
      totalByType: {
        article: results.filter((item) => item.type === "article").length,
        faq: results.filter((item) => item.type === "faq").length,
      },
    };
  } catch {
    payload = await searchPublishedContentFallback(query, limitPerType);
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
