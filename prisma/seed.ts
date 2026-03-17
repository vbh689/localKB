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
        "Ngay dau tien: nhan laptop, kich hoat email cong ty, dang nhap Slack, Jira va LocalKB.\n\nTuan dau tien: hoan thanh training bat buoc, gap mentor, doc handbook phong ban.\n\n30 ngay dau: lam quen quy trinh review code, hop team va muc tieu thu viec.",
      categorySlug: "hr",
      summary:
        "Checklist tai khoan, email, tool va 30 ngay dau tien cho nhan su moi.",
      tagSlugs: ["onboarding", "policy"],
      title: "Quy trinh onboarding nhan su moi",
    },
    {
      body:
        "Repository service dung tien to svc-, frontend dung web-, package noi bo dung pkg-.\n\nNhanh gon, de tim kiem va phu hop convention DevOps noi bo.",
      categorySlug: "engineering",
      summary:
        "Convention dat ten cho service, frontend app va package noi bo.",
      tagSlugs: ["repository", "policy"],
      title: "Quy chuan dat ten du an va repository",
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
        "Gui ticket cho IT Support trong vong 24h truoc khi can truy cap. Sau khi duoc phe duyet, dang nhap bang email cong ty va bat buoc bat 2FA.",
      categorySlug: "it-support",
      question: "Xin quyen truy cap VPN nhu the nao?",
      tagSlugs: ["vpn", "access"],
    },
    {
      answer:
        "Nop request tren portal HR truoc toi thieu 3 ngay lam viec. Quan ly truc tiep se duyet tren he thong va dong bo ve payroll.",
      categorySlug: "hr",
      question: "Quy trinh xin nghi phep dien ra nhu the nao?",
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
