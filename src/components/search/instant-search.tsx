"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import type { SearchItem, SearchPayload } from "@/lib/search-query";

type Props = {
  initialItems: SearchItem[];
};

export function InstantSearch({ initialItems }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<SearchItem[]>(initialItems);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [searched, setSearched] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const groupedResults = useMemo(
    () => ({
      articles: results.filter((item) => item.type === "article"),
      faqs: results.filter((item) => item.type === "faq"),
    }),
    [results],
  );

  useEffect(() => {
    if (query.trim().length < 2) {
      abortRef.current?.abort();
      setIsLoading(false);
      setSearched(false);
      setResults(initialItems);
      setActiveIndex(-1);
      return;
    }

    const controller = new AbortController();
    abortRef.current?.abort();
    abortRef.current = controller;

    const timer = window.setTimeout(async () => {
      try {
        setIsLoading(true);

        const response = await fetch(
          `/api/search?q=${encodeURIComponent(query)}&limit=5`,
          {
            signal: controller.signal,
          },
        );

        if (!response.ok) {
          throw new Error("Search request failed.");
        }

        const payload = (await response.json()) as SearchPayload;
        setResults(payload.results);
        setSearched(true);
        setActiveIndex(-1);
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          setResults([]);
          setSearched(true);
          setActiveIndex(-1);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }, 180);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [initialItems, query]);

  function openResult(item: SearchItem) {
    router.push(item.type === "article" ? `/kb/${item.slug}` : `/faq/${item.slug}`);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (results.length === 0) {
      if (event.key === "Enter" && query.trim().length >= 2) {
        router.push(`/search?q=${encodeURIComponent(query.trim())}`);
      }
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) => (current + 1) % results.length);
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) =>
        current <= 0 ? results.length - 1 : current - 1,
      );
    }

    if (event.key === "Enter") {
      event.preventDefault();

      if (activeIndex >= 0) {
        openResult(results[activeIndex]);
        return;
      }

      if (query.trim().length >= 2) {
        router.push(`/search?q=${encodeURIComponent(query.trim())}`);
      }
    }
  }

  return (
    <div className="glass-panel rounded-[2rem] p-4 md:p-5">
      <div className="flex flex-col gap-3 rounded-[1.5rem] bg-surface-strong p-4 md:p-5">
        <div className="flex items-center gap-3 rounded-[1.25rem] border border-line bg-background px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
          <span className="font-mono text-sm uppercase tracking-[0.2em] text-muted">
            Search
          </span>
          <input
            aria-label="Tìm kiếm nội dung"
            className="w-full bg-transparent text-base outline-none placeholder:text-muted/70"
            placeholder="Ví dụ: onboarding, VPN, quy trình nghỉ phép..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleKeyDown}
          />
          <span className="rounded-full bg-accent px-3 py-1 font-mono text-xs text-white">
            {isLoading ? "..." : "live"}
          </span>
        </div>

        <div className="grid gap-3">
          {query.trim().length < 2 ? (
            initialItems.map((item) => (
              <button
                key={`${item.type}-${item.id}`}
                type="button"
                onClick={() => openResult(item)}
                className="rounded-[1.4rem] border border-line bg-background px-4 py-4 text-left transition-transform duration-200 hover:-translate-y-0.5"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="rounded-full border border-accent/20 bg-accent/8 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.22em] text-accent-strong">
                    {item.type === "article" ? "Wiki" : "FAQ"}
                  </span>
                  <span className="text-sm text-muted">
                    {item.category ?? item.tags[0] ?? "Nội bộ"}
                  </span>
                </div>
                <h3 className="mt-3 text-xl font-semibold tracking-tight">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-7 text-muted">{item.summary}</p>
              </button>
            ))
          ) : null}

          {query.trim().length >= 2 && results.length > 0 ? (
            <>
              {groupedResults.articles.length > 0 ? (
                <div className="space-y-3">
                  <p className="px-1 font-mono text-[11px] uppercase tracking-[0.24em] text-muted">
                    Articles
                  </p>
                  {groupedResults.articles.map((item) => {
                    const absoluteIndex = results.findIndex(
                      (candidate) =>
                        candidate.id === item.id && candidate.type === item.type,
                    );

                    return (
                      <button
                        key={`${item.type}-${item.id}`}
                        type="button"
                        onMouseEnter={() => setActiveIndex(absoluteIndex)}
                        onClick={() => openResult(item)}
                        className={`rounded-[1.4rem] border px-4 py-4 text-left transition-transform duration-200 hover:-translate-y-0.5 ${
                          activeIndex === absoluteIndex
                            ? "border-accent bg-accent/6"
                            : "border-line bg-background"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="rounded-full border border-accent/20 bg-accent/8 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.22em] text-accent-strong">
                            Wiki
                          </span>
                          <span className="text-sm text-muted">
                            {item.category ?? "Nội bộ"}
                          </span>
                        </div>
                        <h3 className="mt-3 text-xl font-semibold tracking-tight">
                          {item.title}
                        </h3>
                        <p className="mt-2 text-sm leading-7 text-muted">
                          {item.highlight}
                        </p>
                      </button>
                    );
                  })}
                </div>
              ) : null}

              {groupedResults.faqs.length > 0 ? (
                <div className="space-y-3">
                  <p className="px-1 font-mono text-[11px] uppercase tracking-[0.24em] text-muted">
                    FAQs
                  </p>
                  {groupedResults.faqs.map((item) => {
                    const absoluteIndex = results.findIndex(
                      (candidate) =>
                        candidate.id === item.id && candidate.type === item.type,
                    );

                    return (
                      <button
                        key={`${item.type}-${item.id}`}
                        type="button"
                        onMouseEnter={() => setActiveIndex(absoluteIndex)}
                        onClick={() => openResult(item)}
                        className={`rounded-[1.4rem] border px-4 py-4 text-left transition-transform duration-200 hover:-translate-y-0.5 ${
                          activeIndex === absoluteIndex
                            ? "border-accent bg-accent/6"
                            : "border-line bg-background"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="rounded-full border border-accent/20 bg-accent/8 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.22em] text-accent-strong">
                            FAQ
                          </span>
                          <span className="text-sm text-muted">
                            {item.category ?? "Nội bộ"}
                          </span>
                        </div>
                        <h3 className="mt-3 text-xl font-semibold tracking-tight">
                          {item.title}
                        </h3>
                        <p className="mt-2 text-sm leading-7 text-muted">
                          {item.highlight}
                        </p>
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </>
          ) : null}

          {searched && !isLoading && results.length === 0 ? (
            <div className="rounded-[1.4rem] border border-dashed border-line bg-background px-4 py-5">
              <p className="text-base font-medium">
                Không tìm thấy kết quả phù hợp.
              </p>
              <p className="mt-2 text-sm leading-7 text-muted">
                Thử từ khóa khác, viết ngắn hơn, hoặc mở trang search đầy đủ.
              </p>
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
          <p className="text-sm text-muted">
            {query.trim().length < 2
              ? "Nhập tối thiểu 2 ký tự để bắt đầu instant search."
              : searched
                ? `Tìm thấy ${results.length} kết quả gần đúng.`
                : "Đang gõ để hiện kết quả tức thì."}
          </p>
          <Link
            href={query.trim().length >= 2 ? `/search?q=${encodeURIComponent(query.trim())}` : "/search"}
            className="text-sm font-medium text-accent-strong"
          >
            Mở trang search đầy đủ
          </Link>
        </div>
      </div>
    </div>
  );
}
