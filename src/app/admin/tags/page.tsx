import { Role } from "generated/prisma/client";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { FormNotice } from "@/components/ui/form-notice";
import { createTag, deleteTag, updateTag } from "@/app/admin/actions";
import { requireRoles } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { getFeedback, type SearchParamInput } from "@/lib/feedback";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: SearchParamInput;
};

export default async function AdminTagsPage({ searchParams }: Props) {
  await requireRoles([Role.ADMIN, Role.EDITOR]);
  const feedback = await getFeedback(searchParams);
  const tags = await db.tag.findMany({
    orderBy: [{ name: "asc" }],
    include: {
      _count: {
        select: {
          articles: true,
          faqs: true,
        },
      },
    },
  });

  return (
    <section className="grid gap-6 xl:grid-cols-[0.7fr_1.3fr]">
      <form action={createTag} className="glass-panel rounded-[1.8rem] p-6">
        <input type="hidden" name="redirectTo" value="/admin/tags" />
        <p className="font-mono text-sm uppercase tracking-[0.22em] text-accent-strong">
          Tạo tag
        </p>
        <div className="mt-5 space-y-3">
          <FormNotice feedback={feedback} />
          <input
            type="text"
            name="name"
            required
            placeholder="Ví dụ: handbook"
            className="w-full rounded-2xl border border-line bg-white px-4 py-3 outline-none focus:border-accent"
          />
          <button
            type="submit"
            className="rounded-full bg-accent px-5 py-3 text-sm font-medium text-white"
          >
            Tạo tag
          </button>
        </div>
      </form>

      <div className="grid gap-4">
        {tags.map((tag) => (
          <article key={tag.id} className="glass-panel rounded-[1.6rem] p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold tracking-tight">{tag.name}</h2>
                <p className="mt-1 text-sm text-muted">slug: {tag.slug}</p>
                <p className="mt-2 text-sm text-muted">
                  {tag._count.articles} articles - {tag._count.faqs} FAQs
                </p>
              </div>
                <div className="flex flex-wrap items-center gap-2">
                  <details>
                    <summary className="cursor-pointer rounded-full border border-line px-4 py-2 text-sm font-medium text-accent-strong">
                      Sửa
                    </summary>
                    <form
                      action={updateTag}
                      className="mt-3 flex flex-wrap items-center gap-2"
                    >
                      <input type="hidden" name="redirectTo" value="/admin/tags" />
                      <input type="hidden" name="id" value={tag.id} />
                      <input
                        type="text"
                        name="name"
                        required
                        defaultValue={tag.name}
                        className="rounded-2xl border border-line bg-white px-4 py-2 text-sm outline-none focus:border-accent"
                      />
                      <button
                        type="submit"
                        className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-white"
                      >
                        Lưu
                      </button>
                    </form>
                  </details>
                  <form action={deleteTag}>
                    <input type="hidden" name="redirectTo" value="/admin/tags" />
                    <input type="hidden" name="id" value={tag.id} />
                    <ConfirmSubmitButton
                      confirmMessage="Bạn có chắc muốn xóa tag này không?"
                      className="rounded-full border border-red-200 px-4 py-2 text-sm font-medium text-red-700"
                    >
                      Xóa
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
