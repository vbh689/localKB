import { NextResponse } from "next/server";
import { searchPublishedContent } from "@/lib/search-query";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") ?? "";
  const limit = Number(searchParams.get("limit") ?? "5");

  const payload = await searchPublishedContent(query, Math.min(limit, 10));

  return NextResponse.json(payload);
}

