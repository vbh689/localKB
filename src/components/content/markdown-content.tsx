import { renderMarkdownToHtml } from "@/lib/markdown";

type Props = {
  className?: string;
  content: string;
};

export function MarkdownContent({ className, content }: Props) {
  return (
    <div
      className={[
        "space-y-4 [&_h1]:text-3xl [&_h1]:font-semibold [&_h1]:tracking-tight [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_h3]:text-xl [&_h3]:font-semibold [&_p]:leading-8 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5 [&_hr]:border-line",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      dangerouslySetInnerHTML={{ __html: renderMarkdownToHtml(content) }}
    />
  );
}
