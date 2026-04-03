import Link from "next/link";
import { LogoutButton } from "@/components/auth/logout-button";
import { getCurrentSession } from "@/lib/auth/session";
import { canAccessAdmin } from "@/lib/auth/user";
import { createContentExcerpt, createTitlePreview } from "@/lib/content-preview";
import { getFeaturedArticles, getHomepageCounts, getNewestFaqs } from "@/lib/content";
import { InstantSearch } from "@/components/search/instant-search";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [counts, newestArticles, newestFaqs, session] = await Promise.all([
    getHomepageCounts(),
    getFeaturedArticles(5),
    getNewestFaqs(),
    getCurrentSession(),
  ]);

  const quickStats = [
    { label: "Bài viết", value: String(counts.articleCount) },
    { label: "FAQ", value: String(counts.faqCount) },
    { label: "Cập nhật hôm nay", value: String(counts.todayCount) },
  ];

  const featuredItems = newestFaqs.map((item) => ({
    category: item.category?.name ?? null,
    highlight: createContentExcerpt(item.answer),
    id: item.id,
    slug: item.slug,
    summary: createContentExcerpt(item.answer),
    tags: item.tags.map((tag) => tag.name),
    title: createTitlePreview(item.question),
    type: "faq" as const,
  }));

  return (
    <main className="section-grid min-h-screen px-6 py-8 text-foreground md:px-10 xl:px-14">
      <div className="mx-auto flex max-w-7xl flex-col gap-10">
        <header className="flex flex-col gap-6 rounded-[2rem] border border-line/80 bg-white/60 px-6 py-6 shadow-[0_12px_40px_rgba(80,56,26,0.08)] backdrop-blur md:flex-row md:flex-nowrap md:items-center md:px-7 md:py-7">
          <div className="space-y-2 md:min-w-[280px] md:flex-1">
            <div className="inline-flex items-center gap-2 rounded-full border border-accent/15 bg-accent/8 px-4 py-1.5 font-mono text-sm uppercase tracking-[0.18em] text-accent-strong">
              LocalKB
            </div>
            <h1 className="text-[2.15rem] font-semibold tracking-tight md:text-[2.65rem] md:whitespace-nowrap">
              Knowledge Hub
            </h1>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 md:min-w-[420px] md:flex-[1.15]">
            {quickStats.map((item) => (
              <div
                key={item.label}
                className="rounded-2xl border border-line bg-background/90 px-5 py-4"
              >
                <p className="font-mono text-sm uppercase tracking-[0.16em] text-muted">
                  {item.label}
                </p>
                <p className="mt-2 text-3xl font-semibold">{item.value}</p>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3 md:shrink-0">
            {session ? (
              <>
                {canAccessAdmin(session.user.role) ? (
                  <Link
                    href="/admin"
                    className="inline-flex items-center justify-center rounded-full border border-line bg-white px-5 py-3.5 text-base font-medium transition hover:border-accent hover:text-accent-strong"
                  >
                    ➡️ Admin
                  </Link>
                ) : (
                  <span className="inline-flex items-center justify-center rounded-full border border-line bg-white px-5 py-3.5 text-base font-medium text-muted">
                    {session.user.role}
                  </span>
                )}
                <Link
                  href="/account/password"
                  className="inline-flex items-center justify-center rounded-full border border-line bg-white px-5 py-3.5 text-base font-medium transition hover:border-accent hover:text-accent-strong"
                >
                  Đổi mật khẩu
                </Link>
                <LogoutButton />
              </>
            ) : (
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-full border border-line bg-white px-5 py-3.5 text-base font-medium transition hover:border-accent hover:text-accent-strong"
              >
                Đăng nhập
              </Link>
            )}
          </div>
        </header>

        <section className="space-y-6">
          <div className="space-y-6">
            <div className="space-y-4">
              {/* <p className="font-mono text-base uppercase tracking-[0.22em] text-accent-strong">
                Knowledge Base tổng hợp
              </p> */}
              {/* <h2 className="max-w-4xl text-4xl font-semibold leading-[1.04] tracking-tight md:text-6xl xl:text-[4.5rem]">
                Knowledge Base tổng hợp
              </h2> */}
              <p className="max-w-3xl text-xl leading-9 text-muted">
                Tham khảo các Câu hỏi thường gặp (FAQ) và các bài viết hướng dẫn tại đây
              </p>
            </div>

            <InstantSearch initialItems={featuredItems} />
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <div className="glass-panel rounded-[2rem] p-6 md:p-7">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-mono text-base uppercase tracking-[0.18em] text-accent-strong">
                  Latest articles
                </p>
                <h2 className="mt-2 text-[1.9rem] font-semibold tracking-tight">
                  Bài viết mới nhất
                </h2>
              </div>
              <Link href="/kb" className="text-base font-medium text-accent-strong">
                Xem tất cả
              </Link>
            </div>
            <div className="mt-5 grid gap-4">
              {newestArticles.map((article) => (
                <Link
                  key={article.id}
                  href={`/kb/${article.slug}`}
                  className="rounded-[1.6rem] border border-line bg-white/90 p-5 transition hover:-translate-y-0.5 hover:border-accent/30"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="flex-1 text-[1.45rem] font-semibold tracking-tight">
                      {createTitlePreview(article.title)}
                    </h3>
                    <span className="shrink-0 text-right text-sm text-muted">
                      {article.category?.name ?? "Wiki"}
                    </span>
                  </div>
                  <p className="mt-3 text-base leading-8 text-muted">
                    {createContentExcerpt(article.body)}
                  </p>
                </Link>
              ))}
            </div>
          </div>

          <div className="glass-panel rounded-[2rem] p-6 md:p-7">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-mono text-base uppercase tracking-[0.18em] text-accent-strong">
                  Latest FAQs
                </p>
                <h2 className="mt-2 text-[1.9rem] font-semibold tracking-tight">
                  FAQ mới nhất
                </h2>
              </div>
              <Link href="/faq" className="text-base font-medium text-accent-strong">
                Xem tất cả
              </Link>
            </div>
            <div className="mt-5 grid gap-4">
              {newestFaqs.map((faq) => (
                <Link
                  key={faq.id}
                  href={`/faq/${faq.slug}`}
                  className="rounded-[1.6rem] border border-line bg-white/90 p-5 transition hover:-translate-y-0.5 hover:border-accent/30"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="flex-1 text-[1.45rem] font-semibold tracking-tight">
                      {createTitlePreview(faq.question)}
                    </h3>
                    <span className="shrink-0 text-right text-sm text-muted">
                      {faq.category?.name ?? "FAQ"}
                    </span>
                  </div>
                  <p className="mt-3 text-base leading-8 text-muted">
                    {createContentExcerpt(faq.answer)}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
