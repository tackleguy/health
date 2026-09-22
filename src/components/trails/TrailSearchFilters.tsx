"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";
import type { Difficulty } from "@/lib/types";

export function TrailSearchFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const [difficulty, setDifficulty] = useState(searchParams.get("difficulty") ?? "");
  const [dogFriendly, setDogFriendly] = useState(
    searchParams.get("dog_friendly") === "true",
  );

  const applyFilters = useCallback(() => {
    const params = new URLSearchParams();
    if (searchParams.get("collection") === "community") params.set("collection", "community");
    if (q.trim()) params.set("q", q.trim());
    if (difficulty) params.set("difficulty", difficulty);
    if (dogFriendly) params.set("dog_friendly", "true");
    const minLength = searchParams.get("min_length");
    const maxLength = searchParams.get("max_length");
    const minElevation = searchParams.get("min_elevation");
    const maxElevation = searchParams.get("max_elevation");
    const radius = searchParams.get("radius");
    const lat = searchParams.get("lat");
    const lng = searchParams.get("lng");
    if (minLength) params.set("min_length", minLength);
    if (maxLength) params.set("max_length", maxLength);
    if (minElevation) params.set("min_elevation", minElevation);
    if (maxElevation) params.set("max_elevation", maxElevation);
    if (radius) params.set("radius", radius);
    if (lat) params.set("lat", lat);
    if (lng) params.set("lng", lng);
    router.push(`/explore/trails?${params.toString()}`);
  }, [q, difficulty, dogFriendly, router, searchParams]);

  return (
    <div className="mb-8 flex flex-wrap items-end gap-3 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
      <label className="flex min-w-[180px] flex-1 flex-col gap-1 text-sm">
        <span className="font-medium text-stone-700">Search</span>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Trail or park name"
          className="rounded-lg border border-stone-300 px-3 py-2"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-stone-700">Difficulty</span>
        <select
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value)}
          className="rounded-lg border border-stone-300 px-3 py-2"
        >
          <option value="">Any</option>
          <option value="easy">Easy</option>
          <option value="moderate">Moderate</option>
          <option value="hard">Hard</option>
        </select>
      </label>
      <label className="flex items-center gap-2 self-end pb-2 text-sm">
        <input
          type="checkbox"
          checked={dogFriendly}
          onChange={(e) => setDogFriendly(e.target.checked)}
        />
        Dog-friendly
      </label>
      <button
        type="button"
        onClick={applyFilters}
        className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
      >
        Apply filters
      </button>
    </div>
  );
}

export type { Difficulty };
