import { FormNotice } from "@/components/ui/form-notice";
import { changeOwnPassword } from "@/app/admin/actions";
import { requireUserSession } from "@/lib/auth/session";
import { getFeedback, type SearchParamInput } from "@/lib/feedback";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: SearchParamInput;
};

export default async function AccountPasswordPage({ searchParams }: Props) {
  const session = await requireUserSession();
  const feedback = await getFeedback(searchParams);

  return (
    <main className="section-grid min-h-screen px-6 py-8 md:px-10 xl:px-14">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <section className="glass-panel rounded-[2rem] p-6 md:p-8">
          <p className="font-mono text-sm uppercase tracking-[0.24em] text-accent-strong">
            Account security
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight">
            Doi mat khau
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-muted">
            Tai khoan hien tai: {session.user.email}. Mat khau moi can it nhat 8
            ky tu.
          </p>
        </section>

        <form action={changeOwnPassword} className="glass-panel rounded-[2rem] p-6">
          <input type="hidden" name="redirectTo" value="/account/password" />
          <div className="space-y-4">
            <FormNotice feedback={feedback} />
            <label className="block space-y-2">
              <span className="text-sm font-medium">Mat khau hien tai</span>
              <input
                type="password"
                name="currentPassword"
                required
                minLength={8}
                className="w-full rounded-2xl border border-line bg-white px-4 py-3 outline-none focus:border-accent"
              />
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-medium">Mat khau moi</span>
              <input
                type="password"
                name="nextPassword"
                required
                minLength={8}
                className="w-full rounded-2xl border border-line bg-white px-4 py-3 outline-none focus:border-accent"
              />
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-medium">Xac nhan mat khau moi</span>
              <input
                type="password"
                name="confirmPassword"
                required
                minLength={8}
                className="w-full rounded-2xl border border-line bg-white px-4 py-3 outline-none focus:border-accent"
              />
            </label>
          </div>
          <button
            type="submit"
            className="mt-6 rounded-full bg-accent px-5 py-3 text-sm font-medium text-white"
          >
            Cap nhat mat khau
          </button>
        </form>
      </div>
    </main>
  );
}
