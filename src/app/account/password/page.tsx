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
            Đổi mật khẩu
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-muted">
            Tài khoản hiện tại: {session.user.email}. Mật khẩu mới cần ít nhất 8
            ký tự.
          </p>
        </section>

        <form action={changeOwnPassword} className="glass-panel rounded-[2rem] p-6">
          <input type="hidden" name="redirectTo" value="/account/password" />
          <div className="space-y-4">
            <FormNotice feedback={feedback} />
            <label className="block space-y-2">
              <span className="text-sm font-medium">Mật khẩu hiện tại</span>
              <input
                type="password"
                name="currentPassword"
                required
                minLength={8}
                className="w-full rounded-2xl border border-line bg-white px-4 py-3 outline-none focus:border-accent"
              />
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-medium">Mật khẩu mới</span>
              <input
                type="password"
                name="nextPassword"
                required
                minLength={8}
                className="w-full rounded-2xl border border-line bg-white px-4 py-3 outline-none focus:border-accent"
              />
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-medium">Xác nhận mật khẩu mới</span>
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
            Cập nhật mật khẩu
          </button>
        </form>
      </div>
    </main>
  );
}
