import { Role } from "@prisma/client";
import { FormNotice } from "@/components/ui/form-notice";
import { requireRoles } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { getFeedback, type SearchParamInput } from "@/lib/feedback";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: SearchParamInput;
};

export default async function AdminSearchLogsPage({ searchParams }: Props) {
  await requireRoles([Role.ADMIN, Role.EDITOR]);
  const feedback = await getFeedback(searchParams);

  const [recentLogs, noResultLogs] = await Promise.all([
    db.searchLog.findMany({
      orderBy: [{ createdAt: "desc" }],
      take: 25,
    }),
    db.searchLog.groupBy({
      by: ["query"],
      where: {
        resultCount: 0,
      },
      _count: {
        query: true,
      },
      orderBy: {
        _count: {
          query: "desc",
        },
      },
      take: 10,
    }),
  ]);

  return (
    <section className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
      <div className="glass-panel rounded-[1.8rem] p-6">
        <FormNotice feedback={feedback} />
        <p className="font-mono text-sm uppercase tracking-[0.22em] text-accent-strong">
          Top no-result
        </p>
        <div className="mt-5 grid gap-3">
          {noResultLogs.length === 0 ? (
            <p className="text-sm text-muted">Chua co truy van no-result.</p>
          ) : (
            noResultLogs.map((item) => (
              <div
                key={item.query}
                className="rounded-2xl border border-line bg-white px-4 py-4"
              >
                <p className="text-base font-medium">{item.query}</p>
                <p className="mt-1 text-sm text-muted">
                  {item._count.query} lan khong co ket qua
                </p>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="glass-panel rounded-[1.8rem] p-6">
        <p className="font-mono text-sm uppercase tracking-[0.22em] text-accent-strong">
          Recent search logs
        </p>
        <div className="mt-5 grid gap-3">
          {recentLogs.map((log) => (
            <div
              key={log.id}
              className="rounded-2xl border border-line bg-white px-4 py-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-base font-medium">{log.query || "(empty)"}</p>
                <span className="rounded-full border border-line px-3 py-1 text-xs text-muted">
                  {log.resultCount} ket qua
                </span>
              </div>
              <p className="mt-2 text-sm text-muted">
                {log.createdAt.toLocaleString("vi-VN")}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
