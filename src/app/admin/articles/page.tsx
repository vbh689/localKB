import { ContentStatus, Role } from "@prisma/client";
import { BulkSelectionControls } from "@/components/ui/bulk-selection-controls";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { FormNotice } from "@/components/ui/form-notice";
import {
  bulkUpdateArticles,
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

function getParam(
  value: string | string[] | undefined,
) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdminArticlesPage({ searchParams }: Props) {
  await requireRoles([Role.ADMIN, Role.EDITOR]);
  const resolvedSearchParams = await searchParams;
  const feedback = await getFeedback(resolvedSearchParams);
  const query = getParam(resolvedSearchParams.q)?.trim() ?? "";
  const statusFilter = getParam(resolvedSearchParams.status) ?? "all";
  const categoryFilter = getParam(resolvedSearchParams.categoryId) ?? "all";
  const sort = getParam(resolvedSearchParams.sort) ?? "updated_desc";

  const orderBy =
    sort === "title_asc"
      ? [{ title: "asc" as const }]
      : sort === "published_desc"
        ? [{ publishedAt: "desc" as const }, { updatedAt: "desc" as const }]
        : [{ updatedAt: "desc" as const }];

  const [articles, categories, tags] = await Promise.all([
    db.article.findMany({
      where: {
        categoryId: categoryFilter === "all" ? undefined : categoryFilter,
        status:
          statusFilter === "all"
            ? undefined
            : (statusFilter as ContentStatus),
        OR: query
          ? [
              {
                title: {
                  contains: query,
                  mode: "insensitive",
                },
              },
              {
                summary: {
                  contains: query,
                  mode: "insensitive",
                },
              },
              {
                body: {
                  contains: query,
                  mode: "insensitive",
                },
              },
            ]
          : undefined,
      },
      orderBy,
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
        <form className="glass-panel rounded-[1.6rem] p-5">
          <div className="grid gap-3 lg:grid-cols-[1.2fr_0.7fr_0.8fr_0.8fr_auto]">
            <input
              type="text"
              name="q"
              defaultValue={query}
              placeholder="Tim theo title, summary, body"
              className="w-full rounded-2xl border border-line bg-white px-4 py-3 outline-none focus:border-accent"
            />
            <select
              name="status"
              defaultValue={statusFilter}
              className="w-full rounded-2xl border border-line bg-white px-4 py-3 outline-none focus:border-accent"
            >
              <option value="all">Tat ca status</option>
              <option value={ContentStatus.DRAFT}>Draft</option>
              <option value={ContentStatus.PUBLISHED}>Published</option>
              <option value={ContentStatus.UNPUBLISHED}>Unpublished</option>
            </select>
            <select
              name="categoryId"
              defaultValue={categoryFilter}
              className="w-full rounded-2xl border border-line bg-white px-4 py-3 outline-none focus:border-accent"
            >
              <option value="all">Tat ca category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <select
              name="sort"
              defaultValue={sort}
              className="w-full rounded-2xl border border-line bg-white px-4 py-3 outline-none focus:border-accent"
            >
              <option value="updated_desc">Moi cap nhat</option>
              <option value="title_asc">Tieu de A-Z</option>
              <option value="published_desc">Moi publish</option>
            </select>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="submit"
                className="rounded-full bg-accent px-5 py-3 text-sm font-medium text-white"
              >
                Loc
              </button>
              <a
                href="/admin/articles"
                className="rounded-full border border-line px-4 py-3 text-sm font-medium text-accent-strong"
              >
                Reset
              </a>
            </div>
          </div>
          <p className="mt-3 text-sm text-muted">
            Dang hien thi {articles.length} article.
          </p>
        </form>

        <form
          id="article-bulk-form"
          action={bulkUpdateArticles}
          className="glass-panel rounded-[1.6rem] p-5"
        >
          <input type="hidden" name="redirectTo" value="/admin/articles" />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">Bulk actions</p>
              <p className="text-sm text-muted">
                Chon nhieu article ben duoi roi publish, unpublish hoac xoa.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <BulkSelectionControls formId="article-bulk-form" />
              <button
                type="submit"
                name="operation"
                value="publish"
                className="rounded-full border border-line px-4 py-2 text-sm font-medium text-accent-strong"
              >
                Publish selected
              </button>
              <ConfirmSubmitButton
                type="submit"
                name="operation"
                value="unpublish"
                confirmMessage="Ban co chac muon unpublish cac article da chon khong?"
                className="rounded-full border border-line px-4 py-2 text-sm font-medium text-accent-strong"
              >
                Unpublish selected
              </ConfirmSubmitButton>
              <ConfirmSubmitButton
                type="submit"
                name="operation"
                value="delete"
                confirmMessage="Ban co chac muon xoa cac article da chon khong?"
                className="rounded-full border border-red-200 px-4 py-2 text-sm font-medium text-red-700"
              >
                Delete selected
              </ConfirmSubmitButton>
            </div>
          </div>
        </form>

        {articles.map((article) => (
          <article key={article.id} className="glass-panel rounded-[1.6rem] p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
                  <label className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-3 py-1 text-xs font-medium text-accent-strong">
                    <input
                      type="checkbox"
                      name="ids"
                      value={article.id}
                      form="article-bulk-form"
                    />
                    Chon
                  </label>
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
                          {revision.snapshotTitle !== article.title ||
                          revision.snapshotBody !== article.body ? (
                            <div className="mb-3 inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-amber-700">
                              Co thay doi so voi ban hien tai
                            </div>
                          ) : (
                            <div className="mb-3 inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-emerald-700">
                              Giong ban hien tai
                            </div>
                          )}
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-sm font-medium">{revision.snapshotTitle}</p>
                            <p className="text-xs text-muted">
                              {revision.createdBy.email} -{" "}
                              {revision.createdAt.toLocaleString("vi-VN")}
                            </p>
                          </div>
                          <div className="mt-4 grid gap-3 xl:grid-cols-2">
                            <div className="rounded-[1rem] border border-line bg-white p-4">
                              <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted">
                                Snapshot
                              </p>
                              <p className="mt-3 text-sm font-medium">
                                {revision.snapshotTitle}
                              </p>
                              <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-muted">
                                {revision.snapshotBody}
                              </p>
                            </div>
                            <div className="rounded-[1rem] border border-line bg-white p-4">
                              <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted">
                                Current
                              </p>
                              <p className="mt-3 text-sm font-medium">{article.title}</p>
                              <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-muted">
                                {article.body}
                              </p>
                            </div>
                          </div>
                          <form action={restoreArticleRevision} className="mt-4">
                            <input type="hidden" name="redirectTo" value="/admin/articles" />
                            <input type="hidden" name="articleId" value={article.id} />
                            <input type="hidden" name="revisionId" value={revision.id} />
                            <input type="hidden" name="currentSlug" value={article.slug} />
                            <ConfirmSubmitButton
                              confirmMessage="Ban co chac muon restore revision nay khong?"
                              className="rounded-full border border-line px-4 py-2 text-sm font-medium text-accent-strong"
                            >
                              Restore revision
                            </ConfirmSubmitButton>
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
                  <ConfirmSubmitButton
                    confirmMessage={
                      article.status === ContentStatus.PUBLISHED
                        ? "Ban co chac muon unpublish article nay khong?"
                        : "Ban co chac muon publish article nay khong?"
                    }
                    className="rounded-full border border-line px-4 py-2 text-sm font-medium text-accent-strong"
                  >
                    {article.status === ContentStatus.PUBLISHED
                      ? "Unpublish"
                      : "Publish"}
                  </ConfirmSubmitButton>
                </form>
                <form action={deleteArticle}>
                  <input type="hidden" name="redirectTo" value="/admin/articles" />
                  <input type="hidden" name="id" value={article.id} />
                  <ConfirmSubmitButton
                    confirmMessage="Ban co chac muon xoa article nay khong?"
                    className="rounded-full border border-red-200 px-4 py-2 text-sm font-medium text-red-700"
                  >
                    Xoa
                  </ConfirmSubmitButton>
                </form>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
