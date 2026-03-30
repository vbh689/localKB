import "dotenv/config";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  ContentStatus,
  PrismaClient,
  Role,
  UserStatus,
} from "../generated/prisma/client";
import { hashPassword } from "../src/lib/auth/password";
import { syncAllPublishedContent } from "../src/lib/search-index";
import { slugify } from "../src/lib/utils";

const adapter = new PrismaPg({
  connectionString:
    process.env.DATABASE_URL ??
    "postgresql://localkb:localkb@localhost:5432/localkb?schema=public",
});

const prisma = new PrismaClient({
  adapter,
});

const BASE_FAQ_PATH = path.join(process.cwd(), "prisma/data/base-faq-2.md");

type ParsedFaqSeed = {
  answer: string;
  categoryName: string;
  question: string;
};

function stripMarkdown(value: string) {
  return value
    .replace(/\\-/g, "-")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/^#+\s*/g, "")
    .replace(/^>\s*/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function parseQuestionLine(content: string) {
  const normalizedContent = content.trim();
  const boldWithArrowAnswerMatch = /^\*\*(.+?)\*\*\s*[.:]\s*(.+)$/.exec(
    normalizedContent,
  );
  const boldWithParenMatch = /^\*\*(.+?)\*\*\s*\((.+)\)\.?$/.exec(
    normalizedContent,
  );
  const boldOnlyMatch = /^\*\*(.+?)\*\*\.?$/.exec(normalizedContent);

  if (boldWithArrowAnswerMatch) {
    return {
      answerParts: [stripMarkdown(boldWithArrowAnswerMatch[2])],
      question: stripMarkdown(boldWithArrowAnswerMatch[1]).replace(/:$/, ""),
    };
  }

  if (boldWithParenMatch) {
    return {
      answerParts: [stripMarkdown(boldWithParenMatch[2])],
      question: stripMarkdown(boldWithParenMatch[1]).replace(/:$/, ""),
    };
  }

  if (boldOnlyMatch) {
    return {
      answerParts: [] as string[],
      question: stripMarkdown(boldOnlyMatch[1]).replace(/:$/, ""),
    };
  }

  return {
    answerParts: [] as string[],
    question: stripMarkdown(normalizedContent).replace(/:$/, ""),
  };
}

function finalizeFaqSeed(
  collection: ParsedFaqSeed[],
  currentCategory: string | null,
  currentQuestion: string | null,
  answerParts: string[],
) {
  if (!currentCategory || !currentQuestion) {
    return;
  }

  const normalizedAnswerParts = answerParts
    .map((part) => stripMarkdown(part))
    .filter(Boolean);

  collection.push({
    answer:
      normalizedAnswerParts.length > 0
        ? normalizedAnswerParts.length === 1
          ? normalizedAnswerParts[0]
          : normalizedAnswerParts.map((part) => `- ${part}`).join("\n")
        : `Hướng dẫn cho mục "${currentQuestion}" đang được cập nhật.`,
    categoryName: currentCategory,
    question: currentQuestion,
  });
}

async function parseBaseFaqSeeds() {
  const raw = await readFile(BASE_FAQ_PATH, "utf8");
  const lines = raw.split(/\r?\n/);
  const parsedFaqs: ParsedFaqSeed[] = [];
  let currentCategory: string | null = null;
  let currentQuestion: string | null = null;
  let currentAnswerParts: string[] = [];

  const flushCurrent = () => {
    finalizeFaqSeed(
      parsedFaqs,
      currentCategory,
      currentQuestion,
      currentAnswerParts,
    );
    currentQuestion = null;
    currentAnswerParts = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      continue;
    }

    if (line === "---") {
      continue;
    }

    const categoryMatch =
      /^(?:##\s+)?(?:\*\*)?Nhóm\s+\d+:\s*(.+?)(?:\*\*)?$/i.exec(line);

    if (categoryMatch) {
      flushCurrent();
      currentCategory = stripMarkdown(categoryMatch[1]);
      continue;
    }

    if (/^###\s+/.test(line) || /^>\s*/.test(line) || /^#\s+/.test(line)) {
      continue;
    }

    const numberedItemMatch = /^\d+\.\s*(.*)$/.exec(line);

    if (numberedItemMatch) {
      const content = numberedItemMatch[1]?.trim() ?? "";

      if (!content) {
        flushCurrent();
        continue;
      }

      flushCurrent();
      const parsedQuestion = parseQuestionLine(content);
      currentQuestion = parsedQuestion.question;
      currentAnswerParts = parsedQuestion.answerParts;
      continue;
    }

    const questionBulletMatch = /^[-*]\s+(\*\*.+)$/.exec(line);

    if (questionBulletMatch) {
      flushCurrent();
      const parsedQuestion = parseQuestionLine(questionBulletMatch[1]);
      currentQuestion = parsedQuestion.question;
      currentAnswerParts = parsedQuestion.answerParts;
      continue;
    }

    const arrowAnswerMatch = /^→\s*(.+)$/.exec(line);

    if (arrowAnswerMatch && currentQuestion) {
      currentAnswerParts.push(stripMarkdown(arrowAnswerMatch[1]));
      continue;
    }

    const bulletAnswerMatch = /^[-*]\s+(.*)$/.exec(line);

    if (bulletAnswerMatch && currentQuestion) {
      const bulletContent = stripMarkdown(bulletAnswerMatch[1]);

      if (bulletContent) {
        currentAnswerParts.push(bulletContent);
      }
    }
  }

  flushCurrent();
  return parsedFaqs;
}

async function main() {
  const email = (process.env.SEED_ADMIN_EMAIL ?? "admin@localkb.internal")
    .trim()
    .toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe123";

  const passwordHash = await hashPassword(password);

  const admin = await prisma.user.upsert({
    where: {
      email,
    },
    update: {
      passwordHash,
      role: Role.ADMIN,
      status: UserStatus.ACTIVE,
    },
    create: {
      email,
      passwordHash,
      role: Role.ADMIN,
      status: UserStatus.ACTIVE,
    },
  });

  const parsedFaqSeeds = await parseBaseFaqSeeds();
  const categoryNames = [
    "HR",
    "IT Support",
    "Engineering",
    ...parsedFaqSeeds.map((item) => item.categoryName),
  ];

  const categories = await Promise.all(
    [...new Set(categoryNames)].map((name) =>
      prisma.category.upsert({
        where: {
          slug: slugify(name),
        },
        update: { name },
        create: {
          name,
          slug: slugify(name),
        },
      }),
    ),
  );

  const tags = await Promise.all(
    ["onboarding", "vpn", "repository", "policy", "access"].map((name) =>
      prisma.tag.upsert({
        where: {
          slug: slugify(name),
        },
        update: { name },
        create: {
          name,
          slug: slugify(name),
        },
      }),
    ),
  );

  const articleSeeds = [
    {
      body:
        "Ngày đầu tiên: nhận laptop, kích hoạt email công ty, đăng nhập Slack, Jira và LocalKB.\n\nTuần đầu tiên: hoàn thành training bắt buộc, gặp mentor, đọc handbook phòng ban.\n\n30 ngày đầu: làm quen quy trình review code, họp team và mục tiêu thử việc.",
      categorySlug: "hr",
      tagSlugs: ["onboarding", "policy"],
      title: "Quy trình onboarding nhân sự mới",
    },
    {
      body:
        "Repository service dùng tiền tố svc-, frontend dùng web-, package nội bộ dùng pkg-.\n\nNhanh gọn, dễ tìm kiếm và phù hợp convention DevOps nội bộ.",
      categorySlug: "engineering",
      tagSlugs: ["repository", "policy"],
      title: "Quy chuẩn đặt tên dự án và repository",
    },
    ...Array.from({ length: 20 }, (_, index) => ({
      body: "Lorem ipsum",
      categorySlug:
        index % 3 === 0 ? "hr" : index % 3 === 1 ? "it-support" : "engineering",
      tagSlugs: [] as string[],
      title: `Lorem ipsum article ${index + 1}`,
    })),
  ];

  for (const article of articleSeeds) {
    const category = categories.find((item) => item.slug === article.categorySlug);
    const articleTags = tags.filter((item) => article.tagSlugs.includes(item.slug));

    await prisma.article.upsert({
      where: {
        slug: slugify(article.title),
      },
      update: {
        authorId: admin.id,
        body: article.body,
        categoryId: category?.id,
        publishedAt: new Date(),
        status: ContentStatus.PUBLISHED,
        tags: {
          set: articleTags.map((tag) => ({ id: tag.id })),
        },
        title: article.title,
      },
      create: {
        authorId: admin.id,
        body: article.body,
        categoryId: category?.id,
        publishedAt: new Date(),
        slug: slugify(article.title),
        status: ContentStatus.PUBLISHED,
        tags: {
          connect: articleTags.map((tag) => ({ id: tag.id })),
        },
        title: article.title,
      },
    });
  }

  const faqSeeds = [
    {
      answer:
        "Gửi ticket cho IT Support trong vòng 24h trước khi cần truy cập. Sau khi được phê duyệt, đăng nhập bằng email công ty và bắt buộc bật 2FA.",
      categorySlug: "it-support",
      question: "Xin quyền truy cập VPN như thế nào?",
      tagSlugs: ["vpn", "access"],
    },
    {
      answer:
        "Nộp request trên portal HR trước tối thiểu 3 ngày làm việc. Quản lý trực tiếp sẽ duyệt trên hệ thống và đồng bộ về payroll.",
      categorySlug: "hr",
      question: "Quy trình xin nghỉ phép diễn ra như thế nào?",
      tagSlugs: ["policy"],
    },
    ...parsedFaqSeeds.map((faq) => ({
      answer: faq.answer,
      categorySlug: slugify(faq.categoryName),
      question: faq.question,
      tagSlugs: [] as string[],
    })),
  ];

  for (const faq of faqSeeds) {
    const category = categories.find((item) => item.slug === faq.categorySlug);
    const faqTags = tags.filter((item) => faq.tagSlugs.includes(item.slug));

    await prisma.faq.upsert({
      where: {
        slug: slugify(faq.question),
      },
      update: {
        answer: faq.answer,
        categoryId: category?.id,
        publishedAt: new Date(),
        question: faq.question,
        status: ContentStatus.PUBLISHED,
        tags: {
          set: faqTags.map((tag) => ({ id: tag.id })),
        },
      },
      create: {
        answer: faq.answer,
        categoryId: category?.id,
        publishedAt: new Date(),
        question: faq.question,
        slug: slugify(faq.question),
        status: ContentStatus.PUBLISHED,
        tags: {
          connect: faqTags.map((tag) => ({ id: tag.id })),
        },
      },
    });
  }

  console.log(`Seeded admin user: ${admin.email}`);
  console.log(
    `Seeded ${articleSeeds.length} articles, ${faqSeeds.length} FAQs and ${categories.length} categories.`,
  );

  try {
    await syncAllPublishedContent();
    console.log("Synced published content to Meilisearch.");
  } catch (error) {
    console.warn(
      `Skipped Meilisearch sync. Make sure Meilisearch is running at ${
        process.env.MEILISEARCH_URL ?? "http://localhost:7702"
      } and rerun npm run search:reindex once it is ready.`,
    );
    console.warn(error);
  }
}

main()
  .catch((error) => {
    console.error("Failed to seed admin user.", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
