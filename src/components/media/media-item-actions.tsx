"use client";

import { useState } from "react";

type Props = {
  alt: string;
  url: string;
};

export function MediaItemActions({ alt, url }: Props) {
  const [notice, setNotice] = useState<string | null>(null);
  const markdown = `![${alt}](${url})`;

  async function copyValue(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      setNotice(`Đã copy ${label}.`);
      window.setTimeout(() => setNotice(null), 1800);
    } catch {
      setNotice(`Không thể copy ${label}.`);
      window.setTimeout(() => setNotice(null), 1800);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => copyValue(url, "URL")}
          className="rounded-full border border-line px-3 py-1.5 text-xs font-medium text-accent-strong transition hover:border-accent"
        >
          Copy URL
        </button>
        <button
          type="button"
          onClick={() => copyValue(markdown, "Markdown")}
          className="rounded-full border border-line px-3 py-1.5 text-xs font-medium text-accent-strong transition hover:border-accent"
        >
          Copy Markdown
        </button>
      </div>
      {notice ? <p className="text-xs text-muted">{notice}</p> : null}
    </div>
  );
}
