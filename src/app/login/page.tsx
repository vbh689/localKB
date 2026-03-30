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
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <section className="space-y-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-accent/15 bg-accent/8 px-4 py-1.5 font-mono text-sm uppercase tracking-[0.18em] text-accent-strong">
            LocalKB Access
          </div>
          <div className="max-w-2xl space-y-4">
            <h1 className="text-4xl font-semibold leading-[1.05] tracking-tight md:text-[4.1rem]">
              Đăng nhập vào LocalKB
            </h1>
            <p className="text-xl leading-9 text-muted">
              Truy cập kho tài liệu nội bộ, câu hỏi thường gặp và quy trình vận hành
              từ một điểm vào duy nhất dành cho nhân sự trong công ty.
            </p>
          </div>

          <div className="space-y-3 text-base leading-8 text-muted">
            <p>Chỉ tài khoản nội bộ được cấp bởi admin mới có thể truy cập hệ thống.</p>
            <p>
              Sau khi đăng nhập, bạn có thể tìm kiếm wiki, FAQ và các tài liệu đang
              được xuất bản ngay trên homepage.
            </p>
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
