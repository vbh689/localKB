"use client";

import { useId, useRef } from "react";

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

  function applyAction(action: Action) {
    const textarea = textareaRef.current;

    if (!textarea) {
      return;
    }

    const selectionStart = textarea.selectionStart;
    const selectionEnd = textarea.selectionEnd;
    const selectedText = textarea.value.slice(selectionStart, selectionEnd);
    const prefix = textarea.value.slice(0, selectionStart);
    const suffix = textarea.value.slice(selectionEnd);
    const result = action.run(selectedText);

    textarea.value = `${prefix}${result.nextText}${suffix}`;

    const defaultEnd = prefix.length + result.nextText.length;
    const nextSelectionStart =
      prefix.length + (result.selectionStartOffset ?? result.nextText.length);
    const nextSelectionEnd =
      result.selectionEndOffset == null
        ? defaultEnd
        : prefix.length + result.nextText.length + result.selectionEndOffset;

    textarea.focus();
    textarea.setSelectionRange(nextSelectionStart, nextSelectionEnd);
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
  }

  return (
    <div className="rounded-2xl border border-line bg-white p-4">
      <div className="flex flex-wrap items-center gap-2">
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
        Hỗ trợ Markdown cơ bản: đậm, nghiêng, tiêu đề, bullet point và divider.
      </p>
      <textarea
        id={id}
        ref={textareaRef}
        name={name}
        required={required}
        rows={rows}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="mt-3 w-full rounded-2xl border border-line bg-background px-4 py-3 outline-none focus:border-accent"
      />
    </div>
  );
}
