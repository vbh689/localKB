import Link from "next/link";
import { notFound } from "next/navigation";
import { MarkdownContent } from "@/components/content/markdown-content";
import { getPublishedFaqBySlug } from "@/lib/content";
import { areTagsEnabled } from "@/lib/features";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function FaqDetailPage({ params }: Props) {
  const { slug } = await params;
  const faq = await getPublishedFaqBySlug(slug);

  if (!faq) {
    notFound();
  }

  return (
    <main className="section-grid min-h-screen px-6 py-8 md:px-10 xl:px-14">
      <div className="mx-auto flex max-w-4xl flex-col gap-8">
        <Link href="/faq" className="text-sm font-medium text-accent-strong">
          🔙 Về danh sách FAQ
        </Link>
        <article className="glass-panel rounded-[2rem] p-6 md:p-8">
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted">
            <span className="rounded-full border border-accent/20 bg-accent/8 px-3 py-1 font-mono uppercase tracking-[0.18em] text-accent-strong">
              FAQ
            </span>
            {faq.category ? <span>{faq.category.name}</span> : null}
            <span>Cập nhật: {faq.updatedAt.toLocaleDateString("vi-VN")}</span>
          </div>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight md:text-5xl">
            {faq.question}
          </h1>
          <MarkdownContent
            content={faq.answer}
            className="mt-8 text-base text-foreground"
          />
          {areTagsEnabled && faq.tags.length > 0 ? (
            <div className="mt-8 flex flex-wrap gap-2">
              {faq.tags.map((tag) => (
                <span
                  key={tag.id}
                  className="rounded-full border border-line bg-white px-3 py-1 text-sm text-muted"
                >
                  #{tag.name}
                </span>
              ))}
            </div>
          ) : null}
        </article>
      </div>
    </main>
  );
}
