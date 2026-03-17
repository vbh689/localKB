import { ContentStatus, Role } from "@prisma/client";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireRoles } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  await requireRoles([Role.ADMIN, Role.EDITOR]);

  const [articles, faqs, categories, tags, drafts] = await Promise.all([
    db.article.count(),
    db.faq.count(),
    db.category.count(),
    db.tag.count(),
    db.article.count({
      where: {
        status: ContentStatus.DRAFT,
      },
    }),
  ]);

  const cards = [
    { label: "Articles", value: articles, href: "/admin/articles" },
    { label: "FAQs", value: faqs, href: "/admin/faqs" },
    { label: "Categories", value: categories, href: "/admin/categories" },
    { label: "Tags", value: tags, href: "/admin/tags" },
    { label: "Draft articles", value: drafts, href: "/admin/articles" },
  ];

  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
      {cards.map((card) => (
        <Link
          key={card.label}
          href={card.href}
          className="glass-panel rounded-[1.75rem] p-5 transition hover:-translate-y-0.5"
        >
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted">
            {card.label}
          </p>
          <p className="mt-3 text-4xl font-semibold tracking-tight">
            {card.value}
          </p>
        </Link>
      ))}
    </section>
  );
}

