import { ContentStatus, Role } from "@prisma/client";
import { FormNotice } from "@/components/ui/form-notice";
import {
  createArticle,
  deleteArticle,
  restoreArticleRevision,
  updateArticle,
  updateArticleStatus,
} from "@/app/admin/actions";
import { requireRoles } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { getFeedback, type SearchParamInput } from "@/lib/feedback";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: SearchParamInput;
};

export default async function AdminArticlesPage({ searchParams }: Props) {
  await requireRoles([Role.ADMIN, Role.EDITOR]);
  const feedback = await getFeedback(searchParams);

  const [articles, categories, tags] = await Promise.all([
    db.article.findMany({
      orderBy: [{ updatedAt: "desc" }],
      include: {
        author: true,
        category: true,
        revisions: {
          orderBy: [{ createdAt: "desc" }],
          take: 5,
          include: {
            createdBy: true,
          },
        },
        tags: true,
      },
    }),
    db.category.findMany({ orderBy: [{ name: "asc" }] }),
    db.tag.findMany({ orderBy: [{ name: "asc" }] }),
  ]);

  return (
    <section className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
      <form action={createArticle} className="glass-panel rounded-[1.8rem] p-6">
        <input type="hidden" name="redirectTo" value="/admin/articles" />
        <p className="font-mono text-sm uppercase tracking-[0.22em] text-accent-strong">
          Tao article
        </p>
        <div className="mt-5 space-y-4">
          <FormNotice feedback={feedback} />
          <input
            type="text"
            name="title"
            required
            placeholder="Tieu de bai viet"
            className="w-full rounded-2xl border border-line bg-white px-4 py-3 outline-none focus:border-accent"
          />
          <textarea
            name="summary"
            required
            rows={3}
            placeholder="Tom tat ngan"
            className="w-full rounded-2xl border border-line bg-white px-4 py-3 outline-none focus:border-accent"
          />
          <textarea
            name="body"
            required
            rows={8}
            placeholder="Noi dung chi tiet"
            className="w-full rounded-2xl border border-line bg-white px-4 py-3 outline-none focus:border-accent"
          />
          <select
            name="categoryId"
            className="w-full rounded-2xl border border-line bg-white px-4 py-3 outline-none focus:border-accent"
            defaultValue=""
          >
            <option value="">Khong co category</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <select
            name="status"
            className="w-full rounded-2xl border border-line bg-white px-4 py-3 outline-none focus:border-accent"
            defaultValue={ContentStatus.DRAFT}
          >
            <option value={ContentStatus.DRAFT}>Draft</option>
            <option value={ContentStatus.PUBLISHED}>Published</option>
            <option value={ContentStatus.UNPUBLISHED}>Unpublished</option>
          </select>
          <div className="rounded-2xl border border-line bg-white p-4">
            <p className="text-sm font-medium">Gan tags</p>
            <div className="mt-3 flex flex-wrap gap-3">
              {tags.map((tag) => (
                <label key={tag.id} className="flex items-center gap-2 text-sm text-muted">
                  <input type="checkbox" name="tagIds" value={tag.id} />
                  {tag.name}
                </label>
              ))}
            </div>
          </div>
          <button
            type="submit"
            className="rounded-full bg-accent px-5 py-3 text-sm font-medium text-white"
          >
            Tao article
          </button>
        </div>
      </form>

      <div className="grid gap-4">
        {articles.map((article) => (
          <article key={article.id} className="glass-panel rounded-[1.6rem] p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
                  <span className="rounded-full border border-accent/20 bg-accent/8 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.22em] text-accent-strong">
                    {article.status}
                  </span>
                  {article.category ? <span>{article.category.name}</span> : null}
                  <span>{article.author.email}</span>
                </div>
                <h2 className="text-xl font-semibold tracking-tight">
                  {article.title}
                </h2>
                <p className="text-sm leading-7 text-muted">{article.summary}</p>
                <div className="flex flex-wrap gap-2">
                  {article.tags.map((tag) => (
                    <span
                      key={tag.id}
                      className="rounded-full border border-line bg-white px-3 py-1 text-xs text-muted"
                    >
                      #{tag.name}
                    </span>
                  ))}
                </div>
                <details className="rounded-[1.25rem] border border-line bg-white/70 p-4">
                  <summary className="cursor-pointer text-sm font-medium text-accent-strong">
                    Revision history ({article.revisions.length})
                  </summary>
                  <div className="mt-4 grid gap-3">
                    {article.revisions.length === 0 ? (
                      <p className="text-sm text-muted">Chua co revision nao.</p>
                    ) : (
                      article.revisions.map((revision) => (
                        <div
                          key={revision.id}
                          className="rounded-[1.1rem] border border-line bg-background p-4"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-sm font-medium">{revision.snapshotTitle}</p>
                            <p className="text-xs text-muted">
                              {revision.createdBy.email} -{" "}
                              {revision.createdAt.toLocaleString("vi-VN")}
                            </p>
                          </div>
                          <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-muted">
                            {revision.snapshotBody}
                          </p>
                          <form action={restoreArticleRevision} className="mt-4">
                            <input type="hidden" name="redirectTo" value="/admin/articles" />
                            <input type="hidden" name="articleId" value={article.id} />
                            <input type="hidden" name="revisionId" value={revision.id} />
                            <input type="hidden" name="currentSlug" value={article.slug} />
                            <button
                              type="submit"
                              className="rounded-full border border-line px-4 py-2 text-sm font-medium text-accent-strong"
                            >
                              Restore revision
                            </button>
                          </form>
                        </div>
                      ))
                    )}
                  </div>
                </details>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <details>
                  <summary className="cursor-pointer rounded-full border border-line px-4 py-2 text-sm font-medium text-accent-strong">
                    Sua
                  </summary>
                  <form
                    action={updateArticle}
                    className="mt-4 grid gap-3 rounded-[1.4rem] border border-line bg-white p-4"
                  >
                    <input type="hidden" name="redirectTo" value="/admin/articles" />
                    <input type="hidden" name="id" value={article.id} />
                    <input
                      type="text"
                      name="title"
                      required
                      defaultValue={article.title}
                      className="rounded-2xl border border-line bg-white px-4 py-3 outline-none focus:border-accent"
                    />
                    <textarea
                      name="summary"
                      required
                      rows={3}
                      defaultValue={article.summary}
                      className="rounded-2xl border border-line bg-white px-4 py-3 outline-none focus:border-accent"
                    />
                    <textarea
                      name="body"
                      required
                      rows={8}
                      defaultValue={article.body}
                      className="rounded-2xl border border-line bg-white px-4 py-3 outline-none focus:border-accent"
                    />
                    <select
                      name="categoryId"
                      className="rounded-2xl border border-line bg-white px-4 py-3 outline-none focus:border-accent"
                      defaultValue={article.categoryId ?? ""}
                    >
                      <option value="">Khong co category</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                    <select
                      name="status"
                      className="rounded-2xl border border-line bg-white px-4 py-3 outline-none focus:border-accent"
                      defaultValue={article.status}
                    >
                      <option value={ContentStatus.DRAFT}>Draft</option>
                      <option value={ContentStatus.PUBLISHED}>Published</option>
                      <option value={ContentStatus.UNPUBLISHED}>Unpublished</option>
                    </select>
                    <div className="rounded-2xl border border-line bg-background p-4">
                      <p className="text-sm font-medium">Gan tags</p>
                      <div className="mt-3 flex flex-wrap gap-3">
                        {tags.map((tag) => (
                          <label
                            key={`${article.id}-${tag.id}`}
                            className="flex items-center gap-2 text-sm text-muted"
                          >
                            <input
                              type="checkbox"
                              name="tagIds"
                              value={tag.id}
                              defaultChecked={article.tags.some(
                                (articleTag) => articleTag.id === tag.id,
                              )}
                            />
                            {tag.name}
                          </label>
                        ))}
                      </div>
                    </div>
                    <button
                      type="submit"
                      className="rounded-full bg-accent px-5 py-3 text-sm font-medium text-white"
                    >
                      Cap nhat article
                    </button>
                  </form>
                </details>
                <form action={updateArticleStatus}>
                  <input type="hidden" name="redirectTo" value="/admin/articles" />
                  <input type="hidden" name="id" value={article.id} />
                  <input
                    type="hidden"
                    name="status"
                    value={
                      article.status === ContentStatus.PUBLISHED
                        ? ContentStatus.UNPUBLISHED
                        : ContentStatus.PUBLISHED
                    }
                  />
                  <button
                    type="submit"
                    className="rounded-full border border-line px-4 py-2 text-sm font-medium text-accent-strong"
                  >
                    {article.status === ContentStatus.PUBLISHED
                      ? "Unpublish"
                      : "Publish"}
                  </button>
                </form>
                <form action={deleteArticle}>
                  <input type="hidden" name="redirectTo" value="/admin/articles" />
                  <input type="hidden" name="id" value={article.id} />
                  <button
                    type="submit"
                    className="rounded-full border border-red-200 px-4 py-2 text-sm font-medium text-red-700"
                  >
                    Xoa
                  </button>
                </form>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
