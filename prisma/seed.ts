import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { ContentStatus, PrismaClient, Role } from "@prisma/client";
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

async function main() {
  const email = (process.env.SEED_ADMIN_EMAIL ?? "admin@localkb.internal")
    .trim()
    .toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe123!";

  const passwordHash = await hashPassword(password);

  const admin = await prisma.user.upsert({
    where: {
      email,
    },
    update: {
      passwordHash,
      role: Role.ADMIN,
    },
    create: {
      email,
      passwordHash,
      role: Role.ADMIN,
    },
  });

  const categories = await Promise.all(
    ["HR", "IT Support", "Engineering"].map((name) =>
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
      summary:
        "Checklist tài khoản, email, tool và 30 ngày đầu tiên cho nhân sự mới.",
      tagSlugs: ["onboarding", "policy"],
      title: "Quy trình onboarding nhân sự mới",
    },
    {
      body:
        "Repository service dùng tiền tố svc-, frontend dùng web-, package nội bộ dùng pkg-.\n\nNhanh gọn, dễ tìm kiếm và phù hợp convention DevOps nội bộ.",
      categorySlug: "engineering",
      summary:
        "Convention đặt tên cho service, frontend app và package nội bộ.",
      tagSlugs: ["repository", "policy"],
      title: "Quy chuẩn đặt tên dự án và repository",
    },
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
        summary: article.summary,
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
        summary: article.summary,
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

  await syncAllPublishedContent();
  console.log("Synced published content to Meilisearch.");
}

main()
  .catch((error) => {
    console.error("Failed to seed admin user.", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
