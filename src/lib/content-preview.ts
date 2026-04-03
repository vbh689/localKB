import "server-only";

import { getConfig } from "@/lib/config";
import { removeEncodedSpaces } from "@/lib/content-cleaning";

type PreviewOptions = {
  maxLength: number;
  maxWords: number;
};

const MARKDOWN_IMAGE_PATTERN = /!\[[^\]]*]\([^)]*\)/g;
const MARKDOWN_REFERENCE_IMAGE_PATTERN = /!\[[^\]]*]\[[^\]]*]/g;
const HTML_IMAGE_PATTERN = /<img\b[^>]*>/gi;

function normalizePreviewSource(value: string | null | undefined) {
  return removeEncodedSpaces(value ?? "")
    .replace(MARKDOWN_IMAGE_PATTERN, " ")
    .replace(MARKDOWN_REFERENCE_IMAGE_PATTERN, " ")
    .replace(HTML_IMAGE_PATTERN, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function truncateToLength(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  const sliced = value.slice(0, Math.max(0, maxLength - 3)).trimEnd();
  const lastSpaceIndex = sliced.lastIndexOf(" ");
  const shortened =
    lastSpaceIndex >= Math.floor(sliced.length * 0.6)
      ? sliced.slice(0, lastSpaceIndex)
      : sliced;

  return `${shortened.trimEnd()}...`;
}

function createPreviewText(
  value: string | null | undefined,
  { maxLength, maxWords }: PreviewOptions,
) {
  const normalized = normalizePreviewSource(value);

  if (!normalized) {
    return "";
  }

  const words = normalized.split(" ");
  const limitedByWords =
    words.length > maxWords ? words.slice(0, maxWords).join(" ") : normalized;
  const limitedByLength = truncateToLength(limitedByWords, maxLength);
  const wasTrimmed = limitedByWords !== normalized || limitedByLength !== limitedByWords;

  return wasTrimmed ? `${limitedByLength.replace(/\.\.\.$/, "").trimEnd()}...` : limitedByLength;
}

export function createExcerpt(value: string | null | undefined, maxLength = 160) {
  return normalizePreviewSource(value).length <= maxLength
    ? normalizePreviewSource(value)
    : truncateToLength(normalizePreviewSource(value), maxLength);
}

export function createTitlePreview(value: string | null | undefined) {
  const config = getConfig();

  return createPreviewText(value, {
    maxLength: config.HOMEPAGE_TITLE_PREVIEW_LENGTH,
    maxWords: config.HOMEPAGE_TITLE_PREVIEW_WORDS,
  });
}

export function createContentExcerpt(value: string | null | undefined) {
  const config = getConfig();

  return createPreviewText(value, {
    maxLength: config.HOMEPAGE_EXCERPT_PREVIEW_LENGTH,
    maxWords: config.HOMEPAGE_EXCERPT_PREVIEW_WORDS,
  });
}
