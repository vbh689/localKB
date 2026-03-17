import { ContentStatus, Role } from "@prisma/client";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { FormNotice } from "@/components/ui/form-notice";
import {
  createFaq,
  deleteFaq,
  restoreFaqRevision,
  updateFaq,
  updateFaqStatus,
} from "@/app/admin/actions";
import { requireRoles } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { getFeedback, type SearchParamInput } from "@/lib/feedback";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: SearchParamInput;
};

export default async function AdminFaqsPage({ searchParams }: Props) {
  await requireRoles([Role.ADMIN, Role.EDITOR]);
  const feedback = await getFeedback(searchParams);

  const [faqs, categories, tags] = await Promise.all([
    db.faq.findMany({
      orderBy: [{ updatedAt: "desc" }],
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
    db.category.findMany({ orderBy: [{ name: "asc" }] }),
    db.tag.findMany({ orderBy: [{ name: "asc" }] }),
  ]);

  return (
    <section className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
      <form action={createFaq} className="glass-panel rounded-[1.8rem] p-6">
        <input type="hidden" name="redirectTo" value="/admin/faqs" />
        <p className="font-mono text-sm uppercase tracking-[0.22em] text-accent-strong">
          Tao FAQ
        </p>
        <div className="mt-5 space-y-4">
          <FormNotice feedback={feedback} />
          <input
            type="text"
            name="question"
            required
            placeholder="Cau hoi"
            className="w-full rounded-2xl border border-line bg-white px-4 py-3 outline-none focus:border-accent"
          />
          <textarea
            name="answer"
            required
            rows={8}
            placeholder="Cau tra loi"
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
            Tao FAQ
          </button>
        </div>
      </form>

      <div className="grid gap-4">
        {faqs.map((faq) => (
          <article key={faq.id} className="glass-panel rounded-[1.6rem] p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
                  <span className="rounded-full border border-accent/20 bg-accent/8 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.22em] text-accent-strong">
                    {faq.status}
                  </span>
                  {faq.category ? <span>{faq.category.name}</span> : null}
                </div>
                <h2 className="text-xl font-semibold tracking-tight">
                  {faq.question}
                </h2>
                <p className="text-sm leading-7 text-muted">{faq.answer}</p>
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
                      <p className="text-sm text-muted">Chua co revision nao.</p>
                    ) : (
                      faq.revisions.map((revision) => (
                        <div
                          key={revision.id}
                          className="rounded-[1.1rem] border border-line bg-background p-4"
                        >
                          {revision.snapshotTitle !== faq.question ||
                          revision.snapshotBody !== faq.answer ? (
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
                              <p className="mt-3 text-sm font-medium">{faq.question}</p>
                              <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-muted">
                                {faq.answer}
                              </p>
                            </div>
                          </div>
                          <form action={restoreFaqRevision} className="mt-4">
                            <input type="hidden" name="redirectTo" value="/admin/faqs" />
                            <input type="hidden" name="faqId" value={faq.id} />
                            <input type="hidden" name="revisionId" value={revision.id} />
                            <input type="hidden" name="currentSlug" value={faq.slug} />
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
                    <textarea
                      name="answer"
                      required
                      rows={8}
                      defaultValue={faq.answer}
                      className="rounded-2xl border border-line bg-white px-4 py-3 outline-none focus:border-accent"
                    />
                    <select
                      name="categoryId"
                      className="rounded-2xl border border-line bg-white px-4 py-3 outline-none focus:border-accent"
                      defaultValue={faq.categoryId ?? ""}
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
                      defaultValue={faq.status}
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
                      Cap nhat FAQ
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
                        ? "Ban co chac muon unpublish FAQ nay khong?"
                        : "Ban co chac muon publish FAQ nay khong?"
                    }
                    className="rounded-full border border-line px-4 py-2 text-sm font-medium text-accent-strong"
                  >
                    {faq.status === ContentStatus.PUBLISHED ? "Unpublish" : "Publish"}
                  </ConfirmSubmitButton>
                </form>
                <form action={deleteFaq}>
                  <input type="hidden" name="redirectTo" value="/admin/faqs" />
                  <input type="hidden" name="id" value={faq.id} />
                  <ConfirmSubmitButton
                    confirmMessage="Ban co chac muon xoa FAQ nay khong?"
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
