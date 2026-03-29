import Link from "next/link";
import { db } from "@/lib/db";
import { areTagsEnabled } from "@/lib/features";
import { searchPublishedContent } from "@/lib/search-query";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{
    category?: string;
    q?: string;
    tag?: string;
    type?: string;
  }>;
};

export default async function SearchPage({ searchParams }: Props) {
  const { category = "", q = "", tag = "", type = "" } = await searchParams;
  const [categories, tags] = await Promise.all([
    db.category.findMany({ orderBy: [{ name: "asc" }] }),
    areTagsEnabled
      ? db.tag.findMany({ orderBy: [{ name: "asc" }] })
      : Promise.resolve([]),
  ]);
  const payload = await searchPublishedContent(q, 10, {
    category: category || null,
    tag: areTagsEnabled ? tag || null : null,
    type: type === "article" || type === "faq" ? type : null,
  });

  return (
    <main className="section-grid min-h-screen px-6 py-8 md:px-10 xl:px-14">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-mono text-base uppercase tracking-[0.18em] text-accent-strong">
              Search
            </p>
            <h1 className="mt-2 text-4xl font-semibold tracking-tight md:text-5xl">
              Kết quả cho &quot;{payload.query || "tất cả"}&quot;
            </h1>
          </div>
          <Link href="/" className="text-base font-medium text-accent-strong">
            🔙 Về homepage
          </Link>
        </div>

        <form className="glass-panel rounded-[1.6rem] p-5 md:p-6">
          <div
            className={`grid gap-3 ${
              areTagsEnabled
                ? "lg:grid-cols-[0.7fr_0.8fr_0.8fr_1fr_auto]"
                : "lg:grid-cols-[0.7fr_0.8fr_1fr_auto]"
            }`}
          >
            <select
              name="type"
              defaultValue={type}
              className="w-full rounded-2xl border border-line bg-white px-5 py-4 text-base outline-none focus:border-accent"
            >
              <option value="">Tất cả type</option>
              <option value="article">Wiki</option>
              <option value="faq">FAQ</option>
            </select>
            <select
              name="category"
              defaultValue={category}
              className="w-full rounded-2xl border border-line bg-white px-5 py-4 text-base outline-none focus:border-accent"
            >
              <option value="">Tất cả category</option>
              {categories.map((item) => (
                <option key={item.id} value={item.name}>
                  {item.name}
                </option>
              ))}
            </select>
            {areTagsEnabled ? (
              <select
                name="tag"
                defaultValue={tag}
                className="w-full rounded-2xl border border-line bg-white px-5 py-4 text-base outline-none focus:border-accent"
              >
                <option value="">Tất cả tag</option>
                {tags.map((item) => (
                  <option key={item.id} value={item.name}>
                    {item.name}
                  </option>
                ))}
              </select>
            ) : null}
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder="Từ khóa tìm kiếm"
              className="w-full rounded-2xl border border-line bg-white px-5 py-4 text-base outline-none focus:border-accent"
            />
            <div className="flex items-center gap-2">
              <button
                type="submit"
                className="rounded-full bg-accent px-5 py-4 text-base font-medium text-white"
              >
                Lọc
              </button>
              <Link
                href="/search"
                className="rounded-full border border-line px-4 py-4 text-base font-medium text-accent-strong"
              >
                Reset
              </Link>
            </div>
          </div>
        </form>

        {payload.results.length === 0 ? (
          <div className="glass-panel rounded-[1.8rem] p-6 text-muted">
            Không tìm thấy nội dung phù hợp. Thử từ khóa khác hoặc bỏ bớt ký tự.
          </div>
        ) : (
          <div className="grid gap-4">
            {payload.results.map((item) => {
              const href = item.type === "article" ? `/kb/${item.slug}` : `/faq/${item.slug}`;

              return (
                <Link
                  key={`${item.type}-${item.id}`}
                  href={href}
                  className="glass-panel rounded-[1.6rem] p-5 transition hover:-translate-y-0.5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="rounded-full border border-accent/20 bg-accent/8 px-3 py-1.5 font-mono text-xs uppercase tracking-[0.16em] text-accent-strong">
                      {item.type === "article" ? "Wiki" : "FAQ"}
                    </span>
                    {item.category ? (
                      <span className="text-base text-muted">{item.category}</span>
                    ) : null}
                  </div>
                  <h2 className="mt-3 text-[1.45rem] font-semibold tracking-tight">
                    {item.title}
                  </h2>
                  {item.highlight ? (
                    <p className="mt-2 text-base leading-8 text-muted">
                      {item.highlight}
                    </p>
                  ) : null}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
