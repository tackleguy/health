"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import type { SearchResult } from "@/lib/types";

interface SearchBarProps {
  variant?: "light" | "dark" | "hero";
}

export function SearchBar({ variant = "light" }: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const trimmedQuery = query.trim();
  const isHero = variant === "hero";
  const isDark = variant === "dark" || isHero;

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
    <div ref={containerRef} className="relative w-full">
      <div
        className={clsx(
          "flex items-center gap-3 rounded-[var(--radius-xl)] px-4 py-3.5 transition",
          isHero
            ? "glass-panel-light focus-within:border-accent/30 focus-within:ring-2 focus-within:ring-accent/15"
            : isDark
              ? "border border-[var(--border)] bg-surface-elevated focus-within:border-accent/30 focus-within:ring-2 focus-within:ring-accent/10"
              : "surface-card focus-within:border-accent/30",
        )}
      >
        <svg
          className="h-4 w-4 shrink-0 text-mist"
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
          className="w-full bg-transparent text-sm text-cream outline-none placeholder:text-mist"
        />
        {loading && <span className="text-xs text-mist">…</span>}
      </div>

      {open && trimmedQuery && (
        <div className="absolute top-full z-50 mt-2 w-full overflow-hidden rounded-[var(--radius-xl)] border border-[var(--border)] bg-surface-elevated shadow-2xl">
          {trimmedQuery && results.length === 0 && !loading ? (
            <p className="px-4 py-3 text-sm text-mist">No results found</p>
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
                    className="flex items-start gap-3 px-4 py-3 transition hover:bg-surface-muted"
                  >
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-muted text-base">
                      {result.type === "park"
                        ? "🏞"
                        : result.type === "resort"
                          ? "⛷"
                          : "🥾"}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-cream">{result.name}</p>
                      <p className="text-xs text-mist">{result.subtitle}</p>
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
