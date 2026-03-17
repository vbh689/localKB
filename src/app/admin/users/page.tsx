import { Role } from "@prisma/client";
import { FormNotice } from "@/components/ui/form-notice";
import {
  createUser,
  deleteUser,
  updateUser,
} from "@/app/admin/actions";
import { requireRoles } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { getFeedback, type SearchParamInput } from "@/lib/feedback";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: SearchParamInput;
};

export default async function AdminUsersPage({ searchParams }: Props) {
  const session = await requireRoles([Role.ADMIN]);
  const feedback = await getFeedback(searchParams);

  const [users, sessionCounts] = await Promise.all([
    db.user.findMany({
      orderBy: [{ createdAt: "asc" }],
    }),
    db.session.groupBy({
      by: ["userId"],
      _count: {
        userId: true,
      },
    }),
  ]);

  const sessionCountMap = new Map(
    sessionCounts.map((item) => [item.userId, item._count.userId]),
  );

  return (
    <section className="grid gap-6 xl:grid-cols-[0.78fr_1.22fr]">
      <form action={createUser} className="glass-panel rounded-[1.8rem] p-6">
        <input type="hidden" name="redirectTo" value="/admin/users" />
        <p className="font-mono text-sm uppercase tracking-[0.22em] text-accent-strong">
          Tao user noi bo
        </p>
        <div className="mt-5 space-y-4">
          <FormNotice feedback={feedback} />
          <input
            type="email"
            name="email"
            required
            placeholder="user@company.internal"
            className="w-full rounded-2xl border border-line bg-white px-4 py-3 outline-none focus:border-accent"
          />
          <input
            type="password"
            name="password"
            required
            minLength={8}
            placeholder="Mat khau tam thoi"
            className="w-full rounded-2xl border border-line bg-white px-4 py-3 outline-none focus:border-accent"
          />
          <select
            name="role"
            defaultValue={Role.VIEWER}
            className="w-full rounded-2xl border border-line bg-white px-4 py-3 outline-none focus:border-accent"
          >
            <option value={Role.ADMIN}>ADMIN</option>
            <option value={Role.EDITOR}>EDITOR</option>
            <option value={Role.VIEWER}>VIEWER</option>
          </select>
          <button
            type="submit"
            className="rounded-full bg-accent px-5 py-3 text-sm font-medium text-white"
          >
            Tao user
          </button>
        </div>
      </form>

      <div className="grid gap-4">
        {users.map((user) => {
          const isCurrentUser = user.id === session.user.id;

          return (
            <article key={user.id} className="glass-panel rounded-[1.6rem] p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
                    <span className="rounded-full border border-accent/20 bg-accent/8 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.22em] text-accent-strong">
                      {user.role}
                    </span>
                    <span>{sessionCountMap.get(user.id) ?? 0} active sessions</span>
                    {isCurrentUser ? <span>Ban dang dung tai khoan nay</span> : null}
                  </div>
                  <h2 className="text-xl font-semibold tracking-tight">
                    {user.email}
                  </h2>
                  <p className="text-sm text-muted">
                    Tao luc {user.createdAt.toLocaleString("vi-VN")}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <details>
                    <summary className="cursor-pointer rounded-full border border-line px-4 py-2 text-sm font-medium text-accent-strong">
                      Sua
                    </summary>
                    <form
                      action={updateUser}
                      className="mt-4 grid gap-3 rounded-[1.4rem] border border-line bg-white p-4"
                    >
                      <input type="hidden" name="redirectTo" value="/admin/users" />
                      <input type="hidden" name="id" value={user.id} />
                      <input
                        type="email"
                        name="email"
                        required
                        defaultValue={user.email}
                        className="rounded-2xl border border-line bg-white px-4 py-3 outline-none focus:border-accent"
                      />
                      <input
                        type="password"
                        name="password"
                        minLength={8}
                        placeholder="De trong neu khong doi mat khau"
                        className="rounded-2xl border border-line bg-white px-4 py-3 outline-none focus:border-accent"
                      />
                      <select
                        name="role"
                        defaultValue={user.role}
                        className="rounded-2xl border border-line bg-white px-4 py-3 outline-none focus:border-accent"
                      >
                        <option value={Role.ADMIN}>ADMIN</option>
                        <option value={Role.EDITOR}>EDITOR</option>
                        <option value={Role.VIEWER}>VIEWER</option>
                      </select>
                      <button
                        type="submit"
                        className="rounded-full bg-accent px-5 py-3 text-sm font-medium text-white"
                      >
                        Cap nhat user
                      </button>
                    </form>
                  </details>

                  <form action={deleteUser}>
                    <input type="hidden" name="redirectTo" value="/admin/users" />
                    <input type="hidden" name="id" value={user.id} />
                    <button
                      type="submit"
                      disabled={isCurrentUser}
                      className="rounded-full border border-red-200 px-4 py-2 text-sm font-medium text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Xoa
                    </button>
                  </form>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
