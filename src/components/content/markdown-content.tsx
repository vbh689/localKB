import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Props = {
  className?: string;
  content: string;
};

export function MarkdownContent({ className, content }: Props) {
  return (
    <div
      className={[
        "space-y-4 [&_h1]:mt-8 [&_h1]:text-3xl [&_h1]:font-semibold [&_h1]:tracking-tight [&_h2]:mt-7 [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_h3]:mt-6 [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:tracking-tight [&_img]:rounded-[1.25rem] [&_img]:border [&_img]:border-line [&_img]:shadow-sm [&_img]:max-w-full [&_p]:leading-8 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:space-y-2 [&_ol]:pl-5 [&_hr]:border-line [&_blockquote]:border-l-4 [&_blockquote]:border-accent/30 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-muted [&_pre]:overflow-x-auto [&_pre]:rounded-[1.25rem] [&_pre]:border [&_pre]:border-line [&_pre]:bg-[#201814] [&_pre]:p-4 [&_pre]:text-sm [&_pre]:text-white [&_table]:w-full [&_table]:border-collapse [&_table]:overflow-hidden [&_table]:rounded-[1rem] [&_th]:border [&_th]:border-line [&_th]:bg-background [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:text-sm [&_td]:border [&_td]:border-line [&_td]:px-3 [&_td]:py-2 [&_td]:text-sm [&_a]:text-accent-strong [&_a]:underline [&_a]:underline-offset-4 [&_code]:rounded [&_code]:bg-background [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.9em]",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ ...props }) => (
            <a
              {...props}
              target={props.href?.startsWith("/") ? undefined : "_blank"}
              rel={props.href?.startsWith("/") ? undefined : "noreferrer noopener"}
            />
          ),
          code: ({ className: codeClassName, children, ...props }) => {
            const text = String(children).replace(/\n$/, "");

            if (!codeClassName) {
              return (
                <code {...props}>
                  {text}
                </code>
              );
            }

            return (
              <code className={codeClassName} {...props}>
                {text}
              </code>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
