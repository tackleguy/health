"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import clsx from "clsx";
import type { SearchResult } from "@/lib/types";
import { NavIcon } from "@/components/nav/NavIcon";

interface SearchBarProps {
  variant?: "light" | "dark" | "hero";
}

type SearchState = { query: string; results: SearchResult[]; status: "loading" | "ready" | "error" };

export function SearchBar({ variant = "light" }: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [state, setState] = useState<SearchState>({ query: "", results: [], status: "ready" });
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputId = useId();
  const trimmedQuery = query.trim();
  const isHero = variant === "hero";
  const isDark = variant === "dark" || isHero;
  const current = state.query === trimmedQuery;
  const loading = Boolean(trimmedQuery) && (!current || state.status === "loading");
  const error = current && state.status === "error";
  const results = current && state.status === "ready" ? state.results : [];

  useEffect(() => {
    if (!trimmedQuery) return;
    const controller = new AbortController();
    let active = true;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const timer = setTimeout(async () => {
      setState({ query: trimmedQuery, results: [], status: "loading" });
      timeout = setTimeout(() => controller.abort(), 10000);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(trimmedQuery)}`, { signal: controller.signal });
        if (!res.ok) throw new Error("Search unavailable");
        const data = await res.json();
        if (active) setState({ query: trimmedQuery, results: Array.isArray(data.results) ? data.results : [], status: "ready" });
      } catch {
        if (active) setState({ query: trimmedQuery, results: [], status: "error" });
      } finally {
        clearTimeout(timeout);
      }
    }, 250);
    return () => { active = false; clearTimeout(timer); clearTimeout(timeout); controller.abort(); };
  }, [trimmedQuery]);

  useEffect(() => {
    function handleClickOutside(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", handleClickOutside);
    return () => document.removeEventListener("pointerdown", handleClickOutside);
  }, []);

  const status = !trimmedQuery || !open ? "" : loading ? "Searching places…" : error ? "Search is unavailable. Check your connection and change the search to try again." : results.length ? `${results.length} ${results.length === 1 ? "result" : "results"}. Tab to explore the matches.` : "No results found. Try a different place name.";

  return (
    <div ref={containerRef} className="site-search relative w-full" role="search" aria-label="Find trails, parks, and ski resorts"
      onBlur={event => { if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget as Node)) setOpen(false); }}
      onKeyDown={event => { if (event.key === "Escape" && open) { event.preventDefault(); event.stopPropagation(); setOpen(false); containerRef.current?.querySelector("input")?.focus(); } }}>
      <label htmlFor={inputId} className="sr-only">Search trails, parks, and ski resorts</label>
      <div className={clsx("site-search-field flex items-center gap-3 rounded-[var(--radius-xl)] px-4 py-3.5 transition", isHero ? "glass-panel-light" : isDark ? "border border-[var(--border)] bg-surface-elevated" : "surface-card")}>
        <NavIcon name="explore" style={{ width: 18, height: 18, flexShrink: 0 }} />
        <input id={inputId} type="search" value={query} maxLength={180} autoComplete="off"
          onChange={event => { setQuery(event.target.value); setOpen(true); }} onFocus={() => setOpen(true)}
          placeholder="Search places…" aria-describedby={`${inputId}-status`}
          className="w-full min-w-0 bg-transparent text-base text-cream placeholder:text-mist" />
      </div>
      <p id={`${inputId}-status`} className="sr-only" role="status" aria-atomic="true">{status}</p>
      {open && trimmedQuery && (
        <div className="site-search-results absolute top-full z-50 mt-2 w-full rounded-[var(--radius-xl)] border border-[var(--border)] bg-surface-elevated">
          {loading || error || results.length === 0 ? <p className="px-4 py-3 text-sm text-mist">{status}</p> : <ul aria-label="Search results">
            {results.map(result => <li key={`${result.type}-${result.id}`}>
              <Link href={result.href} onClick={() => { setOpen(false); setQuery(""); }} className="flex min-h-11 items-start gap-3 px-4 py-3 transition hover:bg-surface-muted">
                <NavIcon name={result.type === "park" || result.type === "resort" ? "mountain" : "trips"} style={{ width: 20, height: 20, flexShrink: 0, marginTop: 2 }} />
                <div className="min-w-0"><p className="break-words text-sm font-medium text-cream">{result.name}</p><p className="break-words text-xs text-mist">{result.subtitle}</p></div>
              </Link>
            </li>)}
          </ul>}
        </div>
      )}
    </div>
  );
}
