import { ContentStatus, type Prisma } from "generated/prisma/client";
import { db } from "@/lib/db";
import { searchClient } from "@/lib/search";
import { createExcerpt } from "@/lib/utils";

const KB_INDEX = "knowledge_base";

type SearchDocument = {
  id: string;
  recordId: string;
  type: "article" | "faq";
  title: string;
  slug: string;
  summary: string;
  highlight: string;
  category: string | null;
  tags: string[];
  body: string;
  updatedAt: string;
};

const articleInclude = {
  category: true,
  tags: true,
} satisfies Prisma.ArticleInclude;

const faqInclude = {
  category: true,
  tags: true,
} satisfies Prisma.FaqInclude;

let ensureIndexPromise: Promise<void> | null = null;

function kbIndex() {
  return searchClient.index<SearchDocument>(KB_INDEX);
}

async function waitForTask(taskUid: number) {
  await searchClient.tasks.waitForTask(taskUid);
}

function createDocumentId(type: "article" | "faq", recordId: string) {
  return `${type}_${recordId}`;
}

function mapArticleDocument(
  article: Prisma.ArticleGetPayload<{ include: typeof articleInclude }>,
): SearchDocument {
  return {
    body: article.body,
    category: article.category?.name ?? null,
    highlight: article.summary || createExcerpt(article.body, 140),
    id: createDocumentId("article", article.id),
    recordId: article.id,
    slug: article.slug,
    summary: article.summary,
    tags: article.tags.map((tag) => tag.name),
    title: article.title,
    type: "article",
    updatedAt: article.updatedAt.toISOString(),
  };
}

function mapFaqDocument(
  faq: Prisma.FaqGetPayload<{ include: typeof faqInclude }>,
): SearchDocument {
  return {
    body: faq.answer,
    category: faq.category?.name ?? null,
    highlight: createExcerpt(faq.answer, 140),
    id: createDocumentId("faq", faq.id),
    recordId: faq.id,
    slug: faq.slug,
    summary: createExcerpt(faq.answer, 160),
    tags: faq.tags.map((tag) => tag.name),
    title: faq.question,
    type: "faq",
    updatedAt: faq.updatedAt.toISOString(),
  };
}

export async function ensureSearchIndex() {
  if (!ensureIndexPromise) {
    ensureIndexPromise = (async () => {
      const createTask = await searchClient
        .createIndex(KB_INDEX, {
          primaryKey: "id",
        })
        .catch((error: { code?: string }) => {
          if (error.code !== "index_already_exists") {
            throw error;
          }

          return null;
        });

      if (createTask) {
        await waitForTask(createTask.taskUid);
      }

      const searchableTask = await kbIndex().updateSearchableAttributes([
        "title",
        "summary",
        "body",
        "category",
        "tags",
      ]);
      await waitForTask(searchableTask.taskUid);

      const filterableTask = await kbIndex().updateFilterableAttributes([
        "type",
        "category",
        "tags",
      ]);
      await waitForTask(filterableTask.taskUid);

      const sortableTask = await kbIndex().updateSortableAttributes([
        "updatedAt",
      ]);
      await waitForTask(sortableTask.taskUid);

      const typoTask = await kbIndex().updateTypoTolerance({
        enabled: true,
      });
      await waitForTask(typoTask.taskUid);
    })().catch((error) => {
      ensureIndexPromise = null;
      throw error;
    });
  }

  return ensureIndexPromise;
}

export async function removeDocument(documentId: string) {
  await ensureSearchIndex();
  const task = await kbIndex().deleteDocument(documentId);
  await waitForTask(task.taskUid);
}

export async function syncArticleDocument(articleId: string) {
  await ensureSearchIndex();

  const article = await db.article.findUnique({
    where: {
      id: articleId,
    },
    include: articleInclude,
  });

  if (!article || article.status !== ContentStatus.PUBLISHED) {
    await removeDocument(createDocumentId("article", articleId));
    return;
  }

  const task = await kbIndex().addDocuments([mapArticleDocument(article)]);
  await waitForTask(task.taskUid);
}

export async function syncFaqDocument(faqId: string) {
  await ensureSearchIndex();

  const faq = await db.faq.findUnique({
    where: {
      id: faqId,
    },
    include: faqInclude,
  });

  if (!faq || faq.status !== ContentStatus.PUBLISHED) {
    await removeDocument(createDocumentId("faq", faqId));
    return;
  }

  const task = await kbIndex().addDocuments([mapFaqDocument(faq)]);
  await waitForTask(task.taskUid);
}

export async function syncAllPublishedContent() {
  await ensureSearchIndex();

  const [articles, faqs] = await Promise.all([
    db.article.findMany({
      where: {
        status: ContentStatus.PUBLISHED,
      },
      include: articleInclude,
    }),
    db.faq.findMany({
      where: {
        status: ContentStatus.PUBLISHED,
      },
      include: faqInclude,
    }),
  ]);

  const documents = [
    ...articles.map(mapArticleDocument),
    ...faqs.map(mapFaqDocument),
  ];

  const clearTask = await kbIndex().deleteAllDocuments();
  await waitForTask(clearTask.taskUid);

  if (documents.length > 0) {
    const addTask = await kbIndex().addDocuments(documents);
    await waitForTask(addTask.taskUid);
  }
}
