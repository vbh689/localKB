import Link from "next/link";
import { Role } from "@prisma/client";
import { LogoutButton } from "@/components/auth/logout-button";
import { requireRoles } from "@/lib/auth/session";

const adminLinks = [
  { href: "/admin", label: "Tổng quan" },
  { href: "/admin/articles", label: "Articles" },
  { href: "/admin/faqs", label: "FAQs" },
  { href: "/admin/categories", label: "Categories" },
  { href: "/admin/tags", label: "Tags" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/search-logs", label: "Search logs" },
];

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await requireRoles([Role.ADMIN, Role.EDITOR]);

  return (
    <main className="section-grid min-h-screen px-6 py-8 md:px-10 xl:px-14">
      <div className="mx-auto flex max-w-7xl flex-col gap-8">
        <header className="glass-panel rounded-[2rem] px-6 py-5">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2">
              <p className="font-mono text-sm uppercase tracking-[0.24em] text-accent-strong">
                Admin CMS
              </p>
              <h1 className="text-3xl font-semibold tracking-tight">
                Quản trị nội dung LocalKB
              </h1>
              <p className="text-sm leading-7 text-muted">
                Đăng nhập với {session.user.email} - role {session.user.role}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/"
                className="inline-flex items-center justify-center rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-accent-strong transition hover:border-accent"
              >
                🔙 Về homepage
              </Link>
              <Link
                href="/account/password"
                className="inline-flex items-center justify-center rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-accent-strong transition hover:border-accent"
              >
                Đổi mật khẩu
              </Link>
              <LogoutButton />
            </div>
          </div>

          <nav className="mt-5 flex flex-wrap gap-3">
            {adminLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-full border border-line bg-white/80 px-4 py-2 text-sm font-medium text-muted transition hover:border-accent hover:text-accent-strong"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </header>

        {children}
      </div>
    </main>
  );
}
