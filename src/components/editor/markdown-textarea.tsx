"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { MDXEditorMethods } from "@mdxeditor/editor";
import { MdxEditorInner } from "@/components/editor/mdx-editor-inner";

type Props = {
  defaultValue?: string;
  name: string;
  placeholder?: string;
  required?: boolean;
  rows?: number;
};

export function MarkdownTextarea({
  defaultValue,
  name,
  placeholder,
  rows = 8,
}: Props) {
  const editorRef = useRef<MDXEditorMethods | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const initialValue = defaultValue ?? "";
  const [isMounted, setIsMounted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [uploadState, setUploadState] = useState<{
    message: string;
    status: "error" | "success";
  } | null>(null);

  useEffect(() => {
    // MDXEditor produces platform-specific markup during initialization,
    // so we mount it only after hydration to keep SSR stable.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMounted(true);
  }, []);

  return (
    <div className="space-y-3">
      <input ref={inputRef} type="hidden" name={name} defaultValue={initialValue} />
      <div className="rounded-2xl border border-line bg-white p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
            <span className="rounded-full border border-line px-3 py-1">
              Rich text + Markdown
            </span>
            <span>
              Hỗ trợ heading, list, quote, link, ảnh, bảng, code block và divider.
            </span>
          </div>
          <Link
            href="/admin/media"
            target="_blank"
            className="rounded-full border border-line px-3 py-1.5 text-xs font-medium text-accent-strong transition hover:border-accent"
          >
            Thư viện media
          </Link>
        </div>

        {isMounted ? (
          <MdxEditorInner
            editorRef={editorRef}
            markdown={initialValue}
            onChange={(nextValue) => {
              if (inputRef.current) {
                inputRef.current.value = nextValue;
              }
            }}
            onError={setErrorMessage}
            onUploadStateChange={setUploadState}
            placeholder={placeholder}
            rows={rows}
          />
        ) : (
          <div className="rounded-2xl border border-line bg-background p-4">
            <div className="space-y-3">
              <div className="h-10 rounded-2xl bg-white" />
              <div className="h-64 rounded-[1.5rem] bg-white" />
            </div>
          </div>
        )}
      </div>

      {uploadState ? (
        <p
          className={`text-sm ${
            uploadState.status === "success" ? "text-success" : "text-red-700"
          }`}
        >
          {uploadState.message}
        </p>
      ) : null}

      {errorMessage ? (
        <p className="text-sm text-red-700">
          Editor không thể parse một phần nội dung Markdown hiện tại: {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
