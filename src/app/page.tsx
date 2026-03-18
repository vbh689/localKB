import Link from "next/link";
import { LogoutButton } from "@/components/auth/logout-button";
import { getCurrentSession } from "@/lib/auth/session";
import { canAccessAdmin } from "@/lib/auth/user";
import { getHomepageCounts, getNewestFaqs } from "@/lib/content";
import { createExcerpt } from "@/lib/utils";
import { InstantSearch } from "@/components/search/instant-search";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [counts, newestFaqs, session] = await Promise.all([
    getHomepageCounts(),
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
    highlight: item.answer,
    id: item.id,
    slug: item.slug,
    summary: createExcerpt(item.answer, 140),
    tags: item.tags.map((tag) => tag.name),
    title: item.question,
    type: "faq" as const,
  }));

  return (
    <main className="section-grid min-h-screen px-6 py-8 text-foreground md:px-10 xl:px-14">
      <div className="mx-auto flex max-w-7xl flex-col gap-10">
        <header className="flex flex-col gap-6 rounded-[2rem] border border-line/80 bg-white/60 px-6 py-6 shadow-[0_12px_40px_rgba(80,56,26,0.08)] backdrop-blur md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-accent/15 bg-accent/8 px-3 py-1 font-mono text-xs uppercase tracking-[0.28em] text-accent-strong">
              LocalKB
            </div>
            <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
              Knowledge Hub
            </h1>
          </div>
          <div className="grid grid-cols-3 gap-3 md:min-w-[360px]">
            {quickStats.map((item) => (
              <div
                key={item.label}
                className="rounded-2xl border border-line bg-background/90 px-4 py-3"
              >
                <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted">
                  {item.label}
                </p>
                <p className="mt-2 text-2xl font-semibold">{item.value}</p>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-3">
            {session ? (
              <>
                {canAccessAdmin(session.user.role) ? (
                  <Link
                    href="/admin"
                    className="inline-flex items-center justify-center rounded-full border border-line bg-white px-5 py-3 text-sm font-medium transition hover:border-accent hover:text-accent-strong"
                  >
                    ➡️ Admin
                  </Link>
                ) : (
                  <span className="inline-flex items-center justify-center rounded-full border border-line bg-white px-5 py-3 text-sm font-medium text-muted">
                    {session.user.role}
                  </span>
                )}
                <Link
                  href="/account/password"
                  className="inline-flex items-center justify-center rounded-full border border-line bg-white px-5 py-3 text-sm font-medium transition hover:border-accent hover:text-accent-strong"
                >
                  Đổi mật khẩu
                </Link>
                <LogoutButton />
              </>
            ) : (
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-full border border-line bg-white px-5 py-3 text-sm font-medium transition hover:border-accent hover:text-accent-strong"
              >
                Đăng nhập
              </Link>
            )}
          </div>
        </header>

        <section className="space-y-6">
          <div className="space-y-6">
            <div className="space-y-4">
              <p className="font-mono text-sm uppercase tracking-[0.32em] text-accent-strong">
                Knowledge Base tổng hợp
              </p>
              <h2 className="max-w-3xl text-5xl font-semibold leading-tight tracking-tight md:text-6xl">
                Knowledge Base tổng hợp
              </h2>
              <p className="max-w-2xl text-lg leading-8 text-muted">
                Tham khảo các Câu hỏi thường gặp (FAQ) và các bài viết hướng dẫn tại đây
              </p>
            </div>

            <InstantSearch initialItems={featuredItems} />
          </div>
        </section>
      </div>
    </main>
  );
}
