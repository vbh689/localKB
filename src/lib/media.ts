import { readdir, stat } from "node:fs/promises";
import path from "node:path";

export type MediaItem = {
  alt: string;
  fileName: string;
  relativePath: string;
  size: number;
  updatedAt: Date;
  url: string;
};

const UPLOADS_ROOT = path.join(process.cwd(), "public", "uploads");

function isMediaFile(fileName: string) {
  return /\.(png|jpe?g|gif|webp|svg|avif)$/i.test(fileName);
}

function getAltText(fileName: string) {
  return fileName
    .replace(/\.[^.]+$/, "")
    .replace(/[_-]+/g, " ")
    .trim() || "image";
}

async function walkUploads(directory: string, relativeDirectory = ""): Promise<MediaItem[]> {
  const entries = await readdir(directory, {
    withFileTypes: true,
  }).catch((error: NodeJS.ErrnoException) => {
    if (error.code === "ENOENT") {
      return [];
    }

    throw error;
  });

  const results = await Promise.all(
    entries.map(async (entry) => {
      const entryRelativePath = relativeDirectory
        ? path.posix.join(relativeDirectory, entry.name)
        : entry.name;
      const entryAbsolutePath = path.join(directory, entry.name);

      if (entry.isDirectory()) {
        return walkUploads(entryAbsolutePath, entryRelativePath);
      }

      if (!entry.isFile() || !isMediaFile(entry.name)) {
        return [];
      }

      const fileStat = await stat(entryAbsolutePath);

      return [
        {
          alt: getAltText(entry.name),
          fileName: entry.name,
          relativePath: entryRelativePath,
          size: fileStat.size,
          updatedAt: fileStat.mtime,
          url: `/${path.posix.join("uploads", entryRelativePath)}`,
        },
      ];
    }),
  );

  return results.flat();
}

export async function getUploadedMedia(query = "") {
  const normalizedQuery = query.trim().toLowerCase();
  const items = await walkUploads(UPLOADS_ROOT);

  return items
    .filter((item) => {
      if (!normalizedQuery) {
        return true;
      }

      return (
        item.fileName.toLowerCase().includes(normalizedQuery) ||
        item.relativePath.toLowerCase().includes(normalizedQuery)
      );
    })
    .sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime());
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const kb = bytes / 1024;

  if (kb < 1024) {
    return `${kb.toFixed(1)} KB`;
  }

  return `${(kb / 1024).toFixed(1)} MB`;
}
