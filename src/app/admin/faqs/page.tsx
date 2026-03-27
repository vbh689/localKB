import { ContentStatus, Role } from "generated/prisma/client";
import { MarkdownContent } from "@/components/content/markdown-content";
import { MarkdownTextarea } from "@/components/editor/markdown-textarea";
import { BulkSelectionControls } from "@/components/ui/bulk-selection-controls";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { FormNotice } from "@/components/ui/form-notice";
import { PaginationControls } from "@/components/ui/pagination-controls";
import {
  bulkUpdateFaqs,
  createFaq,
  deleteFaq,
  restoreFaqRevision,
  updateFaq,
  updateFaqStatus,
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

export default async function AdminFaqsPage({ searchParams }: Props) {
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
    sort === "question_asc"
      ? [{ question: "asc" as const }]
      : sort === "published_desc"
        ? [{ publishedAt: "desc" as const }, { updatedAt: "desc" as const }]
        : [{ updatedAt: "desc" as const }];

  const faqWhere = {
    categoryId: categoryFilter === "all" ? undefined : categoryFilter,
    status:
      statusFilter === "all"
        ? undefined
        : (statusFilter as ContentStatus),
    OR: query
      ? [
          {
            question: {
              contains: query,
              mode: "insensitive" as const,
            },
          },
          {
            answer: {
              contains: query,
              mode: "insensitive" as const,
            },
          },
        ]
      : undefined,
  };

  const [faqs, faqCount, categories, tags] = await Promise.all([
    db.faq.findMany({
      where: faqWhere,
      orderBy,
      skip: (currentPage - 1) * pageSize,
      take: pageSize,
      include: {
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
    db.faq.count({
      where: faqWhere,
    }),
    db.category.findMany({ orderBy: [{ name: "asc" }] }),
    db.tag.findMany({ orderBy: [{ name: "asc" }] }),
  ]);

  return (
    <section className="grid gap-6 xl:grid-cols-4">
      <div className="grid gap-4 xl:col-span-1 xl:auto-rows-max">
        <form className="glass-panel rounded-[1.6rem] p-5">
          <p className="font-mono text-sm uppercase tracking-[0.22em] text-accent-strong">
            Filter
          </p>
          <div className="mt-4 grid gap-3">
            <input
              type="text"
              name="q"
              defaultValue={query}
              placeholder="Tìm theo question hoặc answer"
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
              <option value="question_asc">Câu hỏi A-Z</option>
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
                href="/admin/faqs"
                className="rounded-full border border-line px-4 py-3 text-sm font-medium text-accent-strong"
              >
                Reset
              </a>
            </div>
          </div>
          <p className="mt-3 text-sm text-muted">
            Đang hiển thị {faqs.length} / {faqCount} FAQ.
          </p>
        </form>

        <form
          id="faq-bulk-form"
          action={bulkUpdateFaqs}
          className="glass-panel rounded-[1.6rem] p-5"
        >
          <input type="hidden" name="redirectTo" value="/admin/faqs" />
          <div className="flex flex-col gap-3">
            <div>
              <p className="text-sm font-medium">Bulk actions</p>
              <p className="text-sm text-muted">
                Chọn nhiều FAQ bên dưới rồi xuất bản, ẩn hoặc xóa.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <BulkSelectionControls formId="faq-bulk-form" />
              <button
                type="submit"
                name="operation"
                value="publish"
                className="rounded-full border border-line px-4 py-2 text-sm font-medium text-accent-strong"
              >
                Xuất bản đã chọn
              </button>
              <ConfirmSubmitButton
                type="submit"
                name="operation"
                value="unpublish"
                confirmMessage="Bạn có chắc muốn ẩn các FAQ đã chọn không?"
                className="rounded-full border border-line px-4 py-2 text-sm font-medium text-accent-strong"
              >
                Ẩn đã chọn
              </ConfirmSubmitButton>
              <ConfirmSubmitButton
                type="submit"
                name="operation"
                value="delete"
                confirmMessage="Bạn có chắc muốn xóa các FAQ đã chọn không?"
                className="rounded-full border border-red-200 px-4 py-2 text-sm font-medium text-red-700"
              >
                Xóa đã chọn
              </ConfirmSubmitButton>
            </div>
          </div>
        </form>
      </div>

      <div className="grid gap-6 xl:col-span-3">
        <form action={createFaq} className="glass-panel rounded-[1.8rem] p-6">
          <input type="hidden" name="redirectTo" value="/admin/faqs" />
          <p className="font-mono text-sm uppercase tracking-[0.22em] text-accent-strong">
            Tạo FAQ
          </p>
          <div className="mt-5 space-y-4">
            <FormNotice feedback={feedback} />
            <input
              type="text"
              name="question"
              required
              placeholder="Câu hỏi"
              className="w-full rounded-2xl border border-line bg-white px-4 py-3 outline-none focus:border-accent"
            />
            <MarkdownTextarea
              name="answer"
              required
              rows={8}
              placeholder="Câu trả lời"
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
              Tạo FAQ
            </button>
          </div>
        </form>

        <div className="glass-panel rounded-[1.8rem] p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-mono text-sm uppercase tracking-[0.22em] text-accent-strong">
                Published FAQs
              </p>
              <p className="mt-2 text-sm text-muted">
                Danh sách FAQ hiện có để chỉnh sửa, xuất bản hoặc khôi phục revision.
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-4">
            {faqs.map((faq) => (
              <article key={faq.id} className="rounded-[1.6rem] border border-line bg-white/75 p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
                      <label className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-3 py-1 text-xs font-medium text-accent-strong">
                        <input
                          type="checkbox"
                          name="ids"
                          value={faq.id}
                          form="faq-bulk-form"
                        />
                        Chọn
                      </label>
                      <span className="rounded-full border border-accent/20 bg-accent/8 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.22em] text-accent-strong">
                        {faq.status}
                      </span>
                      {faq.category ? <span>{faq.category.name}</span> : null}
                    </div>
                    <h2 className="text-xl font-semibold tracking-tight">
                      {faq.question}
                    </h2>
                    <MarkdownContent
                      content={faq.answer}
                      className="text-sm text-muted"
                    />
                    <div className="flex flex-wrap gap-2">
                      {faq.tags.map((tag) => (
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
                        Revision history ({faq.revisions.length})
                      </summary>
                      <div className="mt-4 grid gap-3">
                        {faq.revisions.length === 0 ? (
                          <p className="text-sm text-muted">Chưa có revision nào.</p>
                        ) : (
                          faq.revisions.map((revision) => (
                            <div
                              key={revision.id}
                              className="rounded-[1.1rem] border border-line bg-background p-4"
                            >
                              {revision.snapshotTitle !== faq.question ||
                              revision.snapshotBody !== faq.answer ? (
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
                                  <p className="mt-3 text-sm font-medium">{faq.question}</p>
                                  <MarkdownContent
                                    content={faq.answer}
                                    className="mt-3 text-sm text-muted"
                                  />
                                </div>
                              </div>
                              <form action={restoreFaqRevision} className="mt-4">
                                <input type="hidden" name="redirectTo" value="/admin/faqs" />
                                <input type="hidden" name="faqId" value={faq.id} />
                                <input type="hidden" name="revisionId" value={revision.id} />
                                <input type="hidden" name="currentSlug" value={faq.slug} />
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
                        action={updateFaq}
                        className="mt-4 grid gap-3 rounded-[1.4rem] border border-line bg-white p-4"
                      >
                        <input type="hidden" name="redirectTo" value="/admin/faqs" />
                        <input type="hidden" name="id" value={faq.id} />
                        <input
                          type="text"
                          name="question"
                          required
                          defaultValue={faq.question}
                          className="rounded-2xl border border-line bg-white px-4 py-3 outline-none focus:border-accent"
                        />
                        <MarkdownTextarea
                          name="answer"
                          required
                          rows={8}
                          defaultValue={faq.answer}
                        />
                        <select
                          name="categoryId"
                          className="rounded-2xl border border-line bg-white px-4 py-3 outline-none focus:border-accent"
                          defaultValue={faq.categoryId ?? ""}
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
                          defaultValue={faq.status}
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
                                key={`${faq.id}-${tag.id}`}
                                className="flex items-center gap-2 text-sm text-muted"
                              >
                                <input
                                  type="checkbox"
                                  name="tagIds"
                                  value={tag.id}
                                  defaultChecked={faq.tags.some(
                                    (faqTag) => faqTag.id === tag.id,
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
                          Cập nhật FAQ
                        </button>
                      </form>
                    </details>
                    <form action={updateFaqStatus}>
                      <input type="hidden" name="redirectTo" value="/admin/faqs" />
                      <input type="hidden" name="id" value={faq.id} />
                      <input
                        type="hidden"
                        name="status"
                        value={
                          faq.status === ContentStatus.PUBLISHED
                            ? ContentStatus.UNPUBLISHED
                            : ContentStatus.PUBLISHED
                        }
                      />
                      <ConfirmSubmitButton
                        confirmMessage={
                          faq.status === ContentStatus.PUBLISHED
                            ? "Bạn có chắc muốn ẩn FAQ này không?"
                            : "Bạn có chắc muốn xuất bản FAQ này không?"
                        }
                        className="rounded-full border border-line px-4 py-2 text-sm font-medium text-accent-strong"
                      >
                        {faq.status === ContentStatus.PUBLISHED ? "Ẩn" : "Xuất bản"}
                      </ConfirmSubmitButton>
                    </form>
                    <form action={deleteFaq}>
                      <input type="hidden" name="redirectTo" value="/admin/faqs" />
                      <input type="hidden" name="id" value={faq.id} />
                      <ConfirmSubmitButton
                        confirmMessage="Bạn có chắc muốn xóa FAQ này không?"
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
              basePath="/admin/faqs"
              currentPage={currentPage}
              pageSize={pageSize}
              searchParams={resolvedSearchParams}
              totalItems={faqCount}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
