import { Role } from "@prisma/client";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { FormNotice } from "@/components/ui/form-notice";
import {
  createCategory,
  deleteCategory,
  updateCategory,
} from "@/app/admin/actions";
import { requireRoles } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { getFeedback, type SearchParamInput } from "@/lib/feedback";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: SearchParamInput;
};

export default async function AdminCategoriesPage({ searchParams }: Props) {
  await requireRoles([Role.ADMIN, Role.EDITOR]);
  const feedback = await getFeedback(searchParams);
  const categories = await db.category.findMany({
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
      <form action={createCategory} className="glass-panel rounded-[1.8rem] p-6">
        <input type="hidden" name="redirectTo" value="/admin/categories" />
        <p className="font-mono text-sm uppercase tracking-[0.22em] text-accent-strong">
          Tạo category
        </p>
        <div className="mt-5 space-y-3">
          <FormNotice feedback={feedback} />
          <input
            type="text"
            name="name"
            required
            placeholder="Ví dụ: Finance"
            className="w-full rounded-2xl border border-line bg-white px-4 py-3 outline-none focus:border-accent"
          />
          <button
            type="submit"
            className="rounded-full bg-accent px-5 py-3 text-sm font-medium text-white"
          >
            Tạo category
          </button>
        </div>
      </form>

      <div className="grid gap-4">
        {categories.map((category) => (
          <article key={category.id} className="glass-panel rounded-[1.6rem] p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold tracking-tight">
                  {category.name}
                </h2>
                <p className="mt-1 text-sm text-muted">slug: {category.slug}</p>
                <p className="mt-2 text-sm text-muted">
                  {category._count.articles} articles - {category._count.faqs} FAQs
                </p>
              </div>
                <div className="flex flex-wrap items-center gap-2">
                  <details>
                    <summary className="cursor-pointer rounded-full border border-line px-4 py-2 text-sm font-medium text-accent-strong">
                      Sửa
                    </summary>
                    <form
                      action={updateCategory}
                      className="mt-3 flex flex-wrap items-center gap-2"
                    >
                      <input type="hidden" name="redirectTo" value="/admin/categories" />
                      <input type="hidden" name="id" value={category.id} />
                      <input
                        type="text"
                        name="name"
                        required
                        defaultValue={category.name}
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
                  <form action={deleteCategory}>
                    <input type="hidden" name="redirectTo" value="/admin/categories" />
                    <input type="hidden" name="id" value={category.id} />
                    <ConfirmSubmitButton
                      confirmMessage="Bạn có chắc muốn xóa category này không?"
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
