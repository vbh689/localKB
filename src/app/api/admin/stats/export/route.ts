import { Role } from "generated/prisma/client";
import { NextResponse, type NextRequest } from "next/server";
import {
  getPublishTrend,
  getSearchTrend,
  normalizeRangeDays,
} from "@/lib/admin-analytics";
import { getSessionFromRequest } from "@/lib/auth/session";
import { toCsv } from "@/lib/csv";

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);

  if (
    !session ||
    (session.user.role !== Role.ADMIN && session.user.role !== Role.EDITOR)
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const days = normalizeRangeDays(searchParams.get("days"));
  const [searchTrend, publishTrend] = await Promise.all([
    getSearchTrend(days),
    getPublishTrend(days),
  ]);

  const publishByDay = new Map(
    publishTrend.map((item) => [new Date(item.day).toISOString().slice(0, 10), item.published]),
  );

  const csv = toCsv(
    ["day", "searches", "no_result", "published_content"],
    searchTrend.map((item) => {
      const day = new Date(item.day).toISOString().slice(0, 10);

      return [
        day,
        item.total,
        item.no_result,
        publishByDay.get(day) ?? 0,
      ];
    }),
  );

  return new NextResponse(csv, {
    headers: {
      "Content-Disposition": `attachment; filename="content-stats-${days}d.csv"`,
      "Content-Type": "text/csv; charset=utf-8",
    },
  });
}
