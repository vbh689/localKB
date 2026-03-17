import Link from "next/link";
import { getPublishedFaqs } from "@/lib/content";

export const dynamic = "force-dynamic";

export default async function FaqIndexPage() {
  const faqs = await getPublishedFaqs();

  return (
    <main className="section-grid min-h-screen px-6 py-8 md:px-10 xl:px-14">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-mono text-sm uppercase tracking-[0.22em] text-accent-strong">
              FAQ
            </p>
            <h1 className="mt-2 text-4xl font-semibold tracking-tight">
              Cau hoi thuong gap
            </h1>
          </div>
          <Link href="/" className="text-sm font-medium text-accent-strong">
            Ve homepage
          </Link>
        </div>
        <div className="grid gap-4">
          {faqs.map((faq) => (
            <Link
              key={faq.id}
              href={`/faq/${faq.slug}`}
              className="glass-panel rounded-[1.6rem] p-5 transition hover:-translate-y-0.5"
            >
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-xl font-semibold tracking-tight">
                  {faq.question}
                </h2>
                {faq.category ? (
                  <span className="text-sm text-muted">{faq.category.name}</span>
                ) : null}
              </div>
              <p className="mt-3 text-sm leading-7 text-muted">{faq.answer}</p>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}

