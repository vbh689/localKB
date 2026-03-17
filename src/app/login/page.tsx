import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import { getCurrentSession } from "@/lib/auth/session";

export default async function LoginPage() {
  const session = await getCurrentSession();

  if (session) {
    redirect("/admin");
  }

  return (
    <main className="section-grid min-h-screen px-6 py-8 md:px-10 xl:px-14">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
        <section className="space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-accent/15 bg-accent/8 px-3 py-1 font-mono text-xs uppercase tracking-[0.28em] text-accent-strong">
            LocalKB Access
          </div>
          <div className="space-y-4">
            <h1 className="max-w-xl text-5xl font-semibold leading-tight tracking-tight md:text-6xl">
              Dang nhap de tim tai lieu noi bo trong mot diem vao duy nhat.
            </h1>
            <p className="max-w-xl text-lg leading-8 text-muted">
              Sau khi dang nhap, nguoi dung co the tra cuu wiki, FAQ va cac quy
              trinh van hanh bang instant search ngay tai homepage.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {[
              "Tai khoan duoc cap boi admin",
              "Session HttpOnly cookie",
              "San sang noi auth vao admin CMS",
            ].map((item) => (
              <div
                key={item}
                className="rounded-[1.5rem] border border-line bg-white/70 px-4 py-4 text-sm leading-7 text-muted"
              >
                {item}
              </div>
            ))}
          </div>

          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-accent-strong"
          >
            Ve homepage
          </Link>
        </section>

        <LoginForm />
      </div>
    </main>
  );
}
