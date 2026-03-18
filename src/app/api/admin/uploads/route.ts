import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { Role } from "generated/prisma/client";
import { NextResponse, type NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/auth/session";
import { logError } from "@/lib/logger";
import { buildUploadTarget } from "@/lib/uploads";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request);

    if (
      !session ||
      (session.user.role !== Role.ADMIN && session.user.role !== Role.EDITOR)
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const uploaded = formData.get("file");

    if (!(uploaded instanceof File) || uploaded.size === 0) {
      return NextResponse.json({ error: "File upload is required." }, { status: 400 });
    }

    if (!uploaded.type.startsWith("image/")) {
      return NextResponse.json({ error: "Only image uploads are supported." }, { status: 400 });
    }

    const target = await buildUploadTarget(uploaded);
    const targetDirectory = path.join(process.cwd(), "public", target.directory);
    const targetPath = path.join(targetDirectory, target.fileName);

    await mkdir(targetDirectory, { recursive: true });
    await writeFile(targetPath, target.bytes);

    const urlPath = `/${target.directory}/${target.fileName}`;

    return NextResponse.json({
      markdown: `![${target.markdownAlt}](${urlPath})`,
      url: urlPath,
    });
  } catch (error) {
    logError("api.admin.uploads", "Image upload failed.", error);

    return NextResponse.json(
      {
        error: "Image upload failed.",
      },
      {
        status: 500,
      },
    );
  }
}
