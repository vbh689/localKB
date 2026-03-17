import Link from "next/link";
import { LogoutButton } from "@/components/auth/logout-button";
import { getCurrentSession } from "@/lib/auth/session";
import { canAccessAdmin } from "@/lib/auth/user";
import { getFeaturedArticles, getHomepageCounts } from "@/lib/content";
import { createExcerpt } from "@/lib/utils";
import { InstantSearch } from "@/components/search/instant-search";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [counts, featuredArticles, session] = await Promise.all([
    getHomepageCounts(),
    getFeaturedArticles(),
    getCurrentSession(),
  ]);

  const quickStats = [
    { label: "Bai viet", value: String(counts.articleCount) },
    { label: "FAQ", value: String(counts.faqCount) },
    { label: "Cap nhat hom nay", value: String(counts.todayCount) },
  ];

  const featuredItems = featuredArticles.map((item) => ({
    category: item.category?.name ?? null,
    highlight: item.summary,
    id: item.id,
    slug: item.slug,
    summary: item.summary || createExcerpt(item.body, 140),
    tags: item.tags.map((tag) => tag.name),
    title: item.title,
    type: "article" as const,
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
              Knowledge hub noi bo cho wiki, SOP va FAQ
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
                    Admin
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
                  Doi mat khau
                </Link>
                <LogoutButton />
              </>
            ) : (
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-full border border-line bg-white px-5 py-3 text-sm font-medium transition hover:border-accent hover:text-accent-strong"
              >
                Dang nhap
              </Link>
            )}
          </div>
        </header>

        <section className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
          <div className="space-y-6">
            <div className="space-y-4">
              <p className="font-mono text-sm uppercase tracking-[0.32em] text-accent-strong">
                Tim thong tin ngay tai homepage
              </p>
              <h2 className="max-w-3xl text-5xl font-semibold leading-tight tracking-tight md:text-6xl">
                Tim nhanh tai lieu, cau tra loi va quy trinh ngay khi bat dau go.
              </h2>
              <p className="max-w-2xl text-lg leading-8 text-muted">
                Giao dien ban dau uu tien mot o tim kiem trung tam, ket qua hien
                ra tuc thi, phan loai ro giua Wiki va FAQ de nhan vien tra cuu
                noi dung noi bo ma khong phai dao qua nhieu menu.
              </p>
            </div>

            <InstantSearch initialItems={featuredItems} />
          </div>

          <aside className="space-y-5">
            <section className="glass-panel rounded-[2rem] p-6">
              <p className="font-mono text-sm uppercase tracking-[0.22em] text-accent-strong">
                Kha nang cho v1
              </p>
              <div className="mt-5 space-y-4">
                <div className="rounded-[1.5rem] border border-line bg-white/75 p-4">
                  <h3 className="text-lg font-semibold">Wiki + FAQ trong mot he thong</h3>
                  <p className="mt-2 text-sm leading-7 text-muted">
                    Phan trang doc noi dung don gian, quan tri bang admin CMS va
                    role admin/editor/viewer.
                  </p>
                </div>
                <div className="rounded-[1.5rem] border border-line bg-white/75 p-4">
                  <h3 className="text-lg font-semibold">Instant search uu tien title</h3>
                  <p className="mt-2 text-sm leading-7 text-muted">
                    Ket qua chia theo loai noi dung, co typo tolerance va prefix
                    matching de tim nhanh hon.
                  </p>
                </div>
                <div className="rounded-[1.5rem] border border-line bg-white/75 p-4">
                  <h3 className="text-lg font-semibold">Tracking truy van no-result</h3>
                  <p className="mt-2 text-sm leading-7 text-muted">
                    Ghi log de biet nhan vien dang can thong tin gi nhung he
                    thong chua co san.
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-[2rem] border border-dashed border-accent/30 bg-accent-strong px-6 py-6 text-white shadow-[0_20px_45px_rgba(95,58,23,0.24)]">
              <p className="font-mono text-sm uppercase tracking-[0.22em] text-white/70">
                Tiep theo
              </p>
              <h3 className="mt-3 text-2xl font-semibold tracking-tight">
                Buoc sau la noi giao dien nay vao auth, database va search index.
              </h3>
              <p className="mt-3 text-sm leading-7 text-white/82">
                Moc tiep theo hop ly la tao Prisma schema, Docker Compose cho
                PostgreSQL + Meilisearch, va route API dau tien cho auth/search.
              </p>
            </section>
          </aside>
        </section>
      </div>
    </main>
  );
}
