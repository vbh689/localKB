"use client";

import {
  BlockTypeSelect,
  BoldItalicUnderlineToggles,
  codeBlockPlugin,
  CodeToggle,
  codeMirrorPlugin,
  CreateLink,
  diffSourcePlugin,
  DiffSourceToggleWrapper,
  headingsPlugin,
  imagePlugin,
  InsertImage,
  InsertTable,
  InsertThematicBreak,
  linkPlugin,
  listsPlugin,
  ListsToggle,
  markdownShortcutPlugin,
  MDXEditor,
  type MDXEditorMethods,
  quotePlugin,
  Separator,
  tablePlugin,
  thematicBreakPlugin,
  toolbarPlugin,
  UndoRedo,
} from "@mdxeditor/editor";
import type { RefObject } from "react";

type Props = {
  editorRef: RefObject<MDXEditorMethods | null>;
  markdown: string;
  onChange: (value: string) => void;
  onError: (message: string | null) => void;
  onUploadStateChange: (
    value:
      | {
          message: string;
          status: "error" | "success";
        }
      | null,
  ) => void;
  placeholder?: string;
  rows?: number;
};

export function MdxEditorInner({
  editorRef,
  markdown,
  onChange,
  onError,
  onUploadStateChange,
  placeholder,
  rows = 8,
}: Props) {
  return (
    <MDXEditor
      ref={editorRef}
      markdown={markdown}
      placeholder={placeholder}
      onChange={onChange}
      onError={({ error }) => {
        onError(error);
      }}
      className="mdxeditor localkb-editor"
      contentEditableClassName="localkb-editor__content"
      spellCheck
      suppressHtmlProcessing
      plugins={[
        headingsPlugin(),
        listsPlugin(),
        quotePlugin(),
        linkPlugin(),
        tablePlugin(),
        thematicBreakPlugin(),
        markdownShortcutPlugin(),
        codeBlockPlugin({
          defaultCodeBlockLanguage: "txt",
        }),
        codeMirrorPlugin({
          codeBlockLanguages: {
            bash: "Bash",
            css: "CSS",
            html: "HTML",
            javascript: "JavaScript",
            json: "JSON",
            markdown: "Markdown",
            sql: "SQL",
            text: "Plain text",
            tsx: "TSX",
            typescript: "TypeScript",
          },
        }),
        imagePlugin({
          imageUploadHandler: async (image) => {
            const formData = new FormData();
            formData.set("file", image);

            const response = await fetch("/api/admin/uploads", {
              method: "POST",
              body: formData,
            });

            const payload = (await response.json()) as {
              error?: string;
              markdown?: string;
            };

            if (!response.ok || !payload.markdown) {
              const message = payload.error || "Tải ảnh thất bại.";
              onUploadStateChange({
                message,
                status: "error",
              });
              throw new Error(message);
            }

            const srcMatch = /!\[[^\]]*]\((.+?)\)/.exec(payload.markdown);
            const imageUrl = srcMatch?.[1];

            if (!imageUrl) {
              const message = "Không thể đọc URL ảnh sau khi tải lên.";
              onUploadStateChange({
                message,
                status: "error",
              });
              throw new Error(message);
            }

            onUploadStateChange({
              message: "Đã tải ảnh lên và chèn vào nội dung.",
              status: "success",
            });

            return imageUrl;
          },
        }),
        diffSourcePlugin({
          viewMode: "rich-text",
        }),
        toolbarPlugin({
          toolbarClassName: "localkb-editor__toolbar",
          toolbarContents: () => (
            <DiffSourceToggleWrapper
              options={["rich-text", "source"]}
              SourceToolbar={
                <span className="text-xs font-medium text-muted">
                  Chế độ Markdown
                </span>
              }
            >
              <UndoRedo />
              <Separator />
              <BlockTypeSelect />
              <Separator />
              <BoldItalicUnderlineToggles />
              <CodeToggle />
              <Separator />
              <ListsToggle />
              <CreateLink />
              <InsertImage />
              <InsertTable />
              <InsertThematicBreak />
            </DiffSourceToggleWrapper>
          ),
        }),
      ]}
      toMarkdownOptions={{
        bullet: "-",
      }}
      autoFocus={false}
      lexicalEditorNamespace={`LocalKBEditor-${rows}`}
    />
  );
}
