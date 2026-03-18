import { Role } from "generated/prisma/client";
import { NextResponse, type NextRequest } from "next/server";
import { toCsv } from "@/lib/csv";
import { db } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth/session";

function getParam(
  value: string | string[] | undefined,
) {
  return Array.isArray(value) ? value[0] : value;
}

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);

  if (
    !session ||
    (session.user.role !== Role.ADMIN && session.user.role !== Role.EDITOR)
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const query = getParam(searchParams.get("q") ?? undefined)?.trim() ?? "";
  const resultFilter = getParam(searchParams.get("resultFilter") ?? undefined) ?? "all";
  const sort = getParam(searchParams.get("sort") ?? undefined) ?? "latest";

  const logs = await db.searchLog.findMany({
    where: {
      query: query
        ? {
            contains: query,
            mode: "insensitive",
          }
        : undefined,
      resultCount: resultFilter === "no-result" ? 0 : undefined,
    },
    orderBy:
      sort === "results_desc"
        ? [{ resultCount: "desc" }, { createdAt: "desc" }]
        : [{ createdAt: "desc" }],
    take: 1000,
  });

  const csv = toCsv(
    ["query", "result_count", "result_type", "created_at"],
    logs.map((log) => [
      log.query,
      log.resultCount,
      log.resultType ?? "",
      log.createdAt.toISOString(),
    ]),
  );

  return new NextResponse(csv, {
    headers: {
      "Content-Disposition": 'attachment; filename="search-logs.csv"',
      "Content-Type": "text/csv; charset=utf-8",
    },
  });
}
