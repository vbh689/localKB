import { ContentStatus, Role } from "generated/prisma/client";
import { MarkdownContent } from "@/components/content/markdown-content";
import { MarkdownTextarea } from "@/components/editor/markdown-textarea";
import {
  SharedAdminContentLayout,
  SharedAdminContentPanel,
} from "@/components/admin/shared-admin-content-layout";
import { BulkSelectionControls } from "@/components/ui/bulk-selection-controls";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { FormNotice } from "@/components/ui/form-notice";
import { PaginationControls } from "@/components/ui/pagination-controls";
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
import { getCurrentPage, getFirstSearchParam, getPageSize } from "@/lib/pagination";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: SearchParamInput;
};

function getStatusFilter(value: string | string[] | undefined) {
  const status = getFirstSearchParam(value);

  if (
    status === ContentStatus.DRAFT ||
    status === ContentStatus.PUBLISHED ||
    status === ContentStatus.UNPUBLISHED
  ) {
    return status;
  }

  return "all";
}

export default async function AdminArticlesPage({ searchParams }: Props) {
  await requireRoles([Role.ADMIN, Role.EDITOR]);
  const resolvedSearchParams = await searchParams;
  const feedback = await getFeedback(resolvedSearchParams);
  const query = getFirstSearchParam(resolvedSearchParams.q)?.trim() ?? "";
  const statusFilter = getStatusFilter(resolvedSearchParams.status);
  const categoryFilter = getFirstSearchParam(resolvedSearchParams.categoryId) ?? "all";
  const sort = getFirstSearchParam(resolvedSearchParams.sort) ?? "updated_desc";
  const currentPage = getCurrentPage(resolvedSearchParams.page);
  const pageSize = getPageSize(resolvedSearchParams.limit);

  const orderBy =
    sort === "title_asc"
      ? [{ title: "asc" as const }]
      : sort === "published_desc"
        ? [{ publishedAt: "desc" as const }, { updatedAt: "desc" as const }]
        : [{ updatedAt: "desc" as const }];

  const articleWhere = {
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
              mode: "insensitive" as const,
            },
          },
          {
            body: {
              contains: query,
              mode: "insensitive" as const,
            },
          },
        ]
      : undefined,
  };

  const [articles, articleCount, categories, tags] = await Promise.all([
    db.article.findMany({
      where: articleWhere,
      orderBy,
      skip: (currentPage - 1) * pageSize,
      take: pageSize,
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
    db.article.count({
      where: articleWhere,
    }),
    db.category.findMany({ orderBy: [{ name: "asc" }] }),
    db.tag.findMany({ orderBy: [{ name: "asc" }] }),
  ]);

  return (
    <SharedAdminContentLayout
      sidebar={
        <>
          <SharedAdminContentPanel as="form" variant="sidebar">
            <p className="font-mono text-sm uppercase tracking-[0.22em] text-accent-strong">
              Filter
            </p>
            <div className="mt-4 grid gap-3">
              <input
                type="text"
                name="q"
                defaultValue={query}
                placeholder="Tìm theo title, body"
                className="w-full rounded-2xl border border-line bg-white px-4 py-3 outline-none focus:border-accent"
              />
              <select
                name="status"
                defaultValue={statusFilter}
                className="w-full rounded-2xl border border-line bg-white px-4 py-3 outline-none focus:border-accent"
              >
                <option value="all">Tất cả status</option>
                <option value={ContentStatus.DRAFT}>Draft</option>
                <option value={ContentStatus.PUBLISHED}>Published</option>
                <option value={ContentStatus.UNPUBLISHED}>Đã ẩn</option>
              </select>
              <select
                name="categoryId"
                defaultValue={categoryFilter}
                className="w-full rounded-2xl border border-line bg-white px-4 py-3 outline-none focus:border-accent"
              >
                <option value="all">Tất cả category</option>
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
                <option value="updated_desc">Mới cập nhật</option>
                <option value="title_asc">Tiêu đề A-Z</option>
                <option value="published_desc">Mới xuất bản</option>
              </select>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="submit"
                  className="rounded-full bg-accent px-5 py-3 text-sm font-medium text-white"
                >
                  Lọc
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
              Đang hiển thị {articles.length} / {articleCount} article.
            </p>
          </SharedAdminContentPanel>

          <SharedAdminContentPanel
            as="form"
            action={bulkUpdateArticles}
            className="flex flex-col gap-3"
            id="article-bulk-form"
            variant="sidebar"
          >
            <input type="hidden" name="redirectTo" value="/admin/articles" />
            <div>
              <p className="text-sm font-medium">Bulk actions</p>
              <p className="text-sm text-muted">
                Chọn nhiều article bên dưới rồi xuất bản, ẩn hoặc xóa.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <BulkSelectionControls formId="article-bulk-form" />
              <ConfirmSubmitButton
                type="submit"
                name="operation"
                value="publish"
                confirmMessage="Bạn có chắc muốn xuất bản các article đã chọn không?"
                className="rounded-full border border-line px-4 py-2 text-sm font-medium text-accent-strong"
              >
                Xuất bản đã chọn
              </ConfirmSubmitButton>
              <ConfirmSubmitButton
                type="submit"
                name="operation"
                value="unpublish"
                confirmMessage="Bạn có chắc muốn ẩn các article đã chọn không?"
                className="rounded-full border border-line px-4 py-2 text-sm font-medium text-accent-strong"
              >
                Ẩn đã chọn
              </ConfirmSubmitButton>
              <ConfirmSubmitButton
                type="submit"
                name="operation"
                value="delete"
                confirmMessage="Bạn có chắc muốn xóa các article đã chọn không?"
                className="rounded-full border border-red-200 px-4 py-2 text-sm font-medium text-red-700"
              >
                Xóa đã chọn
              </ConfirmSubmitButton>
            </div>
          </SharedAdminContentPanel>
        </>
      }
      content={
        <>
          <SharedAdminContentPanel as="form" action={createArticle}>
            <input type="hidden" name="redirectTo" value="/admin/articles" />
            <p className="font-mono text-sm uppercase tracking-[0.22em] text-accent-strong">
              Tạo article
            </p>
            <div className="mt-5 space-y-4">
              <FormNotice feedback={feedback} />
              <input
                type="text"
                name="title"
                required
                placeholder="Tiêu đề bài viết"
                className="w-full rounded-2xl border border-line bg-white px-4 py-3 outline-none focus:border-accent"
              />
              <MarkdownTextarea
                name="body"
                required
                rows={8}
                placeholder="Nội dung chi tiết"
              />
              <select
                name="categoryId"
                className="w-full rounded-2xl border border-line bg-white px-4 py-3 outline-none focus:border-accent"
                defaultValue=""
              >
                <option value="">Không có category</option>
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
                <option value={ContentStatus.UNPUBLISHED}>Đã ẩn</option>
              </select>
              <div className="rounded-2xl border border-line bg-white p-4">
                <p className="text-sm font-medium">Gắn tags</p>
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
                Tạo article
              </button>
            </div>
          </SharedAdminContentPanel>

          <SharedAdminContentPanel>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-mono text-sm uppercase tracking-[0.22em] text-accent-strong">
                  Published articles
                </p>
                <p className="mt-2 text-sm text-muted">
                  Danh sách article hiện có để chỉnh sửa, xuất bản hoặc khôi phục revision.
                </p>
              </div>
            </div>

          <div className="mt-5 grid gap-4">
            {articles.map((article) => (
              <article key={article.id} className="rounded-[1.6rem] border border-line bg-white/75 p-5">
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
                        Chọn
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
                    <MarkdownContent
                      content={article.body}
                      className="text-sm text-muted"
                    />
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
                          <p className="text-sm text-muted">Chưa có revision nào.</p>
                        ) : (
                          article.revisions.map((revision) => (
                            <div
                              key={revision.id}
                              className="rounded-[1.1rem] border border-line bg-background p-4"
                            >
                              {revision.snapshotTitle !== article.title ||
                              revision.snapshotBody !== article.body ? (
                                <div className="mb-3 inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-amber-700">
                                  Có thay đổi so với bản hiện tại
                                </div>
                              ) : (
                                <div className="mb-3 inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-emerald-700">
                                  Giống bản hiện tại
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
                                  <MarkdownContent
                                    content={revision.snapshotBody}
                                    className="mt-3 text-sm text-muted"
                                  />
                                </div>
                                <div className="rounded-[1rem] border border-line bg-white p-4">
                                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted">
                                    Current
                                  </p>
                                  <p className="mt-3 text-sm font-medium">{article.title}</p>
                                  <MarkdownContent
                                    content={article.body}
                                    className="mt-3 text-sm text-muted"
                                  />
                                </div>
                              </div>
                              <form action={restoreArticleRevision} className="mt-4">
                                <input type="hidden" name="redirectTo" value="/admin/articles" />
                                <input type="hidden" name="articleId" value={article.id} />
                                <input type="hidden" name="revisionId" value={revision.id} />
                                <input type="hidden" name="currentSlug" value={article.slug} />
                                <ConfirmSubmitButton
                                  confirmMessage="Bạn có chắc muốn khôi phục revision này không?"
                                  className="rounded-full border border-line px-4 py-2 text-sm font-medium text-accent-strong"
                                >
                                  Khôi phục revision
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
                        Sửa
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
                        <MarkdownTextarea
                          name="body"
                          required
                          rows={8}
                          defaultValue={article.body}
                        />
                        <select
                          name="categoryId"
                          className="rounded-2xl border border-line bg-white px-4 py-3 outline-none focus:border-accent"
                          defaultValue={article.categoryId ?? ""}
                        >
                          <option value="">Không có category</option>
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
                          <option value={ContentStatus.UNPUBLISHED}>Đã ẩn</option>
                        </select>
                        <div className="rounded-2xl border border-line bg-background p-4">
                          <p className="text-sm font-medium">Gắn tags</p>
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
                          Cập nhật article
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
                            ? "Bạn có chắc muốn ẩn article này không?"
                            : "Bạn có chắc muốn xuất bản article này không?"
                        }
                        className="rounded-full border border-line px-4 py-2 text-sm font-medium text-accent-strong"
                      >
                        {article.status === ContentStatus.PUBLISHED
                          ? "Ẩn"
                          : "Xuất bản"}
                      </ConfirmSubmitButton>
                    </form>
                    <form action={deleteArticle}>
                      <input type="hidden" name="redirectTo" value="/admin/articles" />
                      <input type="hidden" name="id" value={article.id} />
                      <ConfirmSubmitButton
                        confirmMessage="Bạn có chắc muốn xóa article này không?"
                        className="rounded-full border border-red-200 px-4 py-2 text-sm font-medium text-red-700"
                      >
                        Xóa
                      </ConfirmSubmitButton>
                    </form>
                  </div>
                </div>
              </article>
            ))}

            <PaginationControls
              basePath="/admin/articles"
              currentPage={currentPage}
              pageSize={pageSize}
              searchParams={resolvedSearchParams}
              totalItems={articleCount}
            />
          </div>
          </SharedAdminContentPanel>
        </>
      }
    />
  );
}
