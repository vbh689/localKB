import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { resolveUploadFilePath } from "@/lib/uploads";

const MIME_TYPES: Record<string, string> = {
  ".avif": "image/avif",
  ".gif": "image/gif",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
};

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{
    segments: string[];
  }>;
};

export async function GET(_: Request, { params }: Props) {
  const resolvedParams = await params;
  const segments = resolvedParams.segments ?? [];
  const absolutePath = resolveUploadFilePath(segments);

  if (!absolutePath) {
    return new NextResponse("Not found", { status: 404 });
  }

  try {
    const fileBuffer = await readFile(absolutePath);
    const contentType = MIME_TYPES[path.extname(absolutePath).toLowerCase()] ?? "application/octet-stream";

    return new NextResponse(fileBuffer, {
      headers: {
        "Cache-Control": "public, max-age=31536000, immutable",
        "Content-Type": contentType,
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
