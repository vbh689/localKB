import { NextResponse } from "next/server";
import { checkSystemHealth } from "@/lib/health";

export const dynamic = "force-dynamic";

export async function GET() {
  const health = await checkSystemHealth();

  return NextResponse.json(health, {
    status: health.status === "ok" ? 200 : 503,
  });
}
