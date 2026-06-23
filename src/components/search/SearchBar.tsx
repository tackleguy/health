"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { SearchResult } from "@/lib/types";

export function SearchBar() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const trimmedQuery = query.trim();

  useEffect(() => {
    if (!trimmedQuery) return;

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(trimmedQuery)}`,
        );
        const data = await res.json();
        setResults(data.results ?? []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [trimmedQuery]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative mx-auto max-w-xl">
      <div className="flex items-center gap-2 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 shadow-sm focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-100">
        <svg
          className="h-4 w-4 shrink-0 text-stone-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-4.35-4.35M11 18a7 7 0 100-14 7 7 0 000 14z"
          />
        </svg>
        <input
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search trails, parks, ski resorts..."
          className="w-full bg-transparent text-sm text-stone-900 outline-none placeholder:text-stone-400"
        />
        {loading && (
          <span className="text-xs text-stone-400">Searching...</span>
        )}
      </div>

      {open && trimmedQuery && (
        <div className="absolute top-full z-50 mt-2 w-full overflow-hidden rounded-xl border border-stone-200 bg-white shadow-xl">
          {trimmedQuery && results.length === 0 && !loading ? (
            <p className="px-4 py-3 text-sm text-stone-500">No results found</p>
          ) : (
            <ul>
              {(trimmedQuery ? results : []).map((result) => (
                <li key={`${result.type}-${result.id}`}>
                  <Link
                    href={result.href}
                    onClick={() => {
                      setOpen(false);
                      setQuery("");
                    }}
                    className="flex items-start gap-3 px-4 py-3 transition hover:bg-stone-50"
                  >
                    <span className="mt-0.5 text-base">
                      {result.type === "park"
                        ? "🏞"
                        : result.type === "resort"
                          ? "⛷"
                          : "🥾"}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-stone-900">
                        {result.name}
                      </p>
                      <p className="text-xs text-stone-500">{result.subtitle}</p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
