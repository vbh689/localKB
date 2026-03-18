import { NextResponse } from "next/server";
import { searchPublishedContent } from "@/lib/search-query";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") ?? "";
  const limit = Number(searchParams.get("limit") ?? "5");
  const type = searchParams.get("type") as "article" | "faq" | null;
  const category = searchParams.get("category");
  const tag = searchParams.get("tag");

  const payload = await searchPublishedContent(query, Math.min(limit, 10), {
    category,
    tag,
    type: type === "article" || type === "faq" ? type : null,
  });

  return NextResponse.json(payload);
}
