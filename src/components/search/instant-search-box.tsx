"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type Props = {
  placeholder: string;
  initialValue?: string;
};

export function InstantSearchBox({ placeholder, initialValue = "" }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(initialValue);
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    setQuery(initialValue);
  }, [initialValue]);

  useEffect(() => {
    const trimmedQuery = query.trim();
    const currentQuery = searchParams.get("q")?.trim() ?? "";

    if (trimmedQuery === currentQuery) {
      setIsPending(false);
      return;
    }

    setIsPending(true);

    const timer = window.setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());

      if (trimmedQuery) {
        params.set("q", trimmedQuery);
      } else {
        params.delete("q");
      }

      params.delete("page");

      const nextQuery = params.toString();
      router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, {
        scroll: false,
      });
    }, 180);

    return () => {
      window.clearTimeout(timer);
    };
  }, [pathname, query, router, searchParams]);

  useEffect(() => {
    const currentQuery = searchParams.get("q")?.trim() ?? "";
    setIsPending(query.trim() !== currentQuery);
  }, [query, searchParams]);

  return (
    <div className="glass-panel rounded-[1.6rem] p-5 md:p-6">
      <div className="flex items-center gap-3 rounded-[1.25rem] border border-line bg-background px-5 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] md:py-5">
        <span className="font-mono text-base uppercase tracking-[0.16em] text-muted">
          Search
        </span>
        <input
          aria-label="Tìm kiếm nội dung"
          className="w-full bg-transparent text-lg outline-none placeholder:text-muted/80"
          placeholder={placeholder}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <span className="rounded-full bg-accent px-3.5 py-1.5 font-mono text-sm font-medium text-white">
          {isPending ? "..." : "live"}
        </span>
      </div>
    </div>
  );
}
