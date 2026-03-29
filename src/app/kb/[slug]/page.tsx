import Link from "next/link";
import { notFound } from "next/navigation";
import { MarkdownContent } from "@/components/content/markdown-content";
import { getPublishedArticleBySlug } from "@/lib/content";
import { areTagsEnabled } from "@/lib/features";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function KnowledgeBaseDetailPage({ params }: Props) {
  const { slug } = await params;
  const article = await getPublishedArticleBySlug(slug);

  if (!article) {
    notFound();
  }

  return (
    <main className="section-grid min-h-screen px-6 py-8 md:px-10 xl:px-14">
      <div className="mx-auto flex max-w-4xl flex-col gap-8">
        <Link href="/kb" className="text-sm font-medium text-accent-strong">
          🔙 Về danh sách bài viết
        </Link>
        <article className="glass-panel rounded-[2rem] p-6 md:p-8">
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted">
            <span className="rounded-full border border-accent/20 bg-accent/8 px-3 py-1 font-mono uppercase tracking-[0.18em] text-accent-strong">
              Wiki
            </span>
            {article.category ? <span>{article.category.name}</span> : null}
            <span>Cập nhật: {article.updatedAt.toLocaleDateString("vi-VN")}</span>
          </div>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight md:text-5xl">
            {article.title}
          </h1>
          <MarkdownContent
            content={article.body}
            className="mt-8 text-base text-foreground"
          />
          {areTagsEnabled && article.tags.length > 0 ? (
            <div className="mt-8 flex flex-wrap gap-2">
              {article.tags.map((tag) => (
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
