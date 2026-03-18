"use client";

import { useDeferredValue, useId, useRef, useState } from "react";
import { MarkdownContent } from "@/components/content/markdown-content";

type Props = {
  defaultValue?: string;
  name: string;
  placeholder?: string;
  required?: boolean;
  rows?: number;
};

type Action = {
  label: string;
  run: (selectedText: string) => {
    nextText: string;
    selectionEndOffset?: number;
    selectionStartOffset?: number;
  };
};

const actions: Action[] = [
  {
    label: "Đậm",
    run: (selectedText) => {
      const content = selectedText || "nội dung đậm";

      return {
        nextText: `**${content}**`,
        selectionEndOffset: -2,
        selectionStartOffset: 2,
      };
    },
  },
  {
    label: "Nghiêng",
    run: (selectedText) => {
      const content = selectedText || "nội dung nghiêng";

      return {
        nextText: `*${content}*`,
        selectionEndOffset: -1,
        selectionStartOffset: 1,
      };
    },
  },
  {
    label: "Tiêu đề",
    run: (selectedText) => ({
      nextText: `## ${selectedText || "Tiêu đề mới"}`,
      selectionStartOffset: 3,
    }),
  },
  {
    label: "Bullet",
    run: (selectedText) => ({
      nextText: selectedText
        ? selectedText
            .split("\n")
            .map((line) => `- ${line}`)
            .join("\n")
        : "- Mục mới",
      selectionStartOffset: 2,
    }),
  },
  {
    label: "Divider",
    run: () => ({
      nextText: "\n---\n",
    }),
  },
];

export function MarkdownTextarea({
  defaultValue,
  name,
  placeholder,
  required,
  rows = 8,
}: Props) {
  const id = useId();
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [tab, setTab] = useState<"text" | "preview">("text");
  const [value, setValue] = useState(defaultValue ?? "");
  const deferredValue = useDeferredValue(value);
  const [uploadState, setUploadState] = useState<{
    message: string;
    status: "error" | "success";
  } | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  function applyAction(action: Action) {
    const textarea = textareaRef.current;

    if (!textarea) {
      return;
    }

    const selectionStart = textarea.selectionStart;
    const selectionEnd = textarea.selectionEnd;
    const selectedText = textarea.value.slice(selectionStart, selectionEnd);
    const prefix = value.slice(0, selectionStart);
    const suffix = value.slice(selectionEnd);
    const result = action.run(selectedText);
    const nextValue = `${prefix}${result.nextText}${suffix}`;
    setValue(nextValue);

    const defaultEnd = prefix.length + result.nextText.length;
    const nextSelectionStart =
      prefix.length + (result.selectionStartOffset ?? result.nextText.length);
    const nextSelectionEnd =
      result.selectionEndOffset == null
        ? defaultEnd
        : prefix.length + result.nextText.length + result.selectionEndOffset;

    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(nextSelectionStart, nextSelectionEnd);
    });
  }

  function insertAtSelection(snippet: string) {
    const textarea = textareaRef.current;

    if (!textarea) {
      return;
    }

    const selectionStart = textarea.selectionStart;
    const selectionEnd = textarea.selectionEnd;
    const prefix = value.slice(0, selectionStart);
    const suffix = value.slice(selectionEnd);
    const nextValue = `${prefix}${snippet}${suffix}`;
    const nextCaret = prefix.length + snippet.length;

    setValue(nextValue);
    setTab("text");

    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(nextCaret, nextCaret);
    });
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const formData = new FormData();
    formData.set("file", file);

    try {
      setIsUploading(true);
      setUploadState(null);

      const response = await fetch("/api/admin/uploads", {
        body: formData,
        method: "POST",
      });

      const payload = (await response.json()) as {
        error?: string;
        markdown?: string;
      };

      if (!response.ok || !payload.markdown) {
        throw new Error(payload.error || "Tải ảnh thất bại.");
      }

      insertAtSelection(payload.markdown);
      setUploadState({
        message: "Đã tải ảnh lên và chèn Markdown vào nội dung.",
        status: "success",
      });
    } catch (error) {
      setUploadState({
        message:
          error instanceof Error ? error.message : "Tải ảnh thất bại.",
        status: "error",
      });
    } finally {
      event.target.value = "";
      setIsUploading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-line bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setTab("text")}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
              tab === "text"
                ? "bg-accent text-white"
                : "border border-line text-accent-strong hover:border-accent"
            }`}
          >
            Text
          </button>
          <button
            type="button"
            onClick={() => setTab("preview")}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
              tab === "preview"
                ? "bg-accent text-white"
                : "border border-line text-accent-strong hover:border-accent"
            }`}
          >
            Preview
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="rounded-full border border-line px-3 py-1.5 text-xs font-medium text-accent-strong transition hover:border-accent"
          >
            {isUploading ? "Đang tải ảnh..." : "Tải ảnh"}
          </button>
        </div>
      </div>
      {tab === "text" ? (
        <>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {actions.map((action) => (
              <button
                key={action.label}
                type="button"
                onClick={() => applyAction(action)}
                className="rounded-full border border-line px-3 py-1.5 text-xs font-medium text-accent-strong transition hover:border-accent"
              >
                {action.label}
              </button>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted">
            Hỗ trợ Markdown cơ bản: đậm, nghiêng, tiêu đề, bullet point, divider và ảnh.
          </p>
          {uploadState ? (
            <p
              className={`mt-3 text-xs ${
                uploadState.status === "success" ? "text-emerald-700" : "text-red-700"
              }`}
            >
              {uploadState.message}
            </p>
          ) : null}
          <textarea
            id={id}
            ref={textareaRef}
            name={name}
            required={required}
            rows={rows}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder={placeholder}
            className="mt-3 w-full rounded-2xl border border-line bg-background px-4 py-3 outline-none focus:border-accent"
          />
        </>
      ) : (
        <div className="mt-4 rounded-2xl border border-line bg-background px-4 py-4">
          {deferredValue.trim().length > 0 ? (
            <MarkdownContent content={deferredValue} className="text-sm text-foreground" />
          ) : (
            <p className="text-sm text-muted">
              Chưa có nội dung để preview.
            </p>
          )}
          <input type="hidden" name={name} value={value} />
        </div>
      )}
    </div>
  );
}
