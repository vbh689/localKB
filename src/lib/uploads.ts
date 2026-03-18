import { createHash } from "node:crypto";
import path, { extname } from "node:path";

const PUBLIC_UPLOADS_ROOT = path.join(process.cwd(), "public", "uploads");

function sanitizeSegment(value: string) {
  return value.replace(/[^A-Za-z0-9_.-]/g, "");
}

export function getSanitizedUploadName(fileName: string) {
  const extension = sanitizeSegment(extname(fileName).toLowerCase()) || ".bin";
  const basename = fileName.slice(0, fileName.length - extname(fileName).length);
  const sanitizedBase = sanitizeSegment(basename).replace(/\.+$/g, "");

  return {
    extension,
    sanitizedBase,
  };
}

export async function buildUploadTarget(file: File) {
  const bytes = Buffer.from(await file.arrayBuffer());
  const now = new Date();
  const year = String(now.getFullYear());
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const { extension, sanitizedBase } = getSanitizedUploadName(file.name);
  const md5 = createHash("md5").update(bytes).digest("hex");
  const fileName = sanitizedBase
    ? `${sanitizedBase}_${md5}${extension}`
    : `${md5}${extension}`;

  return {
    bytes,
    directory: `uploads/${year}/${month}`,
    fileName,
    markdownAlt: sanitizedBase || "image",
  };
}

export function resolveUploadFilePath(segments: string[]) {
  const sanitizedSegments = segments
    .map((segment) => sanitizeSegment(segment))
    .filter(Boolean);

  const candidatePath = path.join(PUBLIC_UPLOADS_ROOT, ...sanitizedSegments);
  const relativePath = path.relative(PUBLIC_UPLOADS_ROOT, candidatePath);

  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    return null;
  }

  return candidatePath;
}
