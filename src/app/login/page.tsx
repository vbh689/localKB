import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import { getCurrentSession } from "@/lib/auth/session";
import { canAccessAdmin } from "@/lib/auth/user";

export default async function LoginPage() {
  const session = await getCurrentSession();

  if (session) {
    redirect(canAccessAdmin(session.user.role) ? "/admin" : "/");
  }

  return (
    <main className="section-grid min-h-screen px-6 py-8 text-foreground md:px-10 xl:px-14">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
        <section className="space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-accent/15 bg-accent/8 px-4 py-1.5 font-mono text-sm uppercase tracking-[0.18em] text-accent-strong">
            LocalKB Access
          </div>
          <div className="space-y-4">
            <h1 className="max-w-2xl text-4xl font-semibold leading-[1.05] tracking-tight md:text-[4.25rem]">
              Đăng nhập để tìm tài liệu nội bộ trong một điểm vào duy nhất.
            </h1>
            <p className="max-w-2xl text-xl leading-9 text-muted">
              Sau khi đăng nhập, người dùng có thể tra cứu wiki, FAQ và các quy
              trình vận hành bằng instant search ngay tại homepage.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {[
              "Tài khoản được cấp bởi admin",
              "Không có đăng ký bên ngoài",
              "Session HttpOnly cookie",
            ].map((item) => (
              <div
                key={item}
                className="rounded-[1.5rem] border border-line bg-white/70 px-5 py-5 text-base leading-8 text-muted"
              >
                {item}
              </div>
            ))}
          </div>

          <Link
            href="/"
            className="inline-flex items-center gap-2 text-base font-medium text-accent-strong"
          >
            🔙 Về homepage
          </Link>
        </section>

        <LoginForm />
      </div>
    </main>
  );
}
