import { NextResponse } from "next/server";
import { searchPublishedContent } from "@/lib/search-query";
import { areTagsEnabled } from "@/lib/features";
import { logError } from "@/lib/logger";
import { getCurrentPage, getPageSize, SEARCH_PAGE_SIZE_OPTIONS } from "@/lib/pagination";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") ?? "";
    const limit = getPageSize(searchParams.get("limit") ?? undefined, SEARCH_PAGE_SIZE_OPTIONS);
    const page = getCurrentPage(searchParams.get("page") ?? undefined);
    const type = searchParams.get("type") as "article" | "faq" | null;
    const category = searchParams.get("category");
    const tag = searchParams.get("tag");

    const payload = await searchPublishedContent(
      query,
      limit,
      {
        category,
        tag: areTagsEnabled ? tag : null,
        type: type === "article" || type === "faq" ? type : null,
      },
      page,
    );

    return NextResponse.json(payload);
  } catch (error) {
    logError("api.search", "Search API failed.", error, {
      url: request.url,
    });

    return NextResponse.json(
      {
        error: "Search service temporarily unavailable.",
      },
      {
        status: 500,
      },
    );
  }
}
