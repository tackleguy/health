"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { SkiArea, SkiFeatureSummary } from "@/lib/ski";
import { MapView } from "@/components/map/MapView";
import { SkiFeaturePanel } from "@/components/map/SkiFeaturePanel";

export function SkiMapClient() {
  const searchParams = useSearchParams();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SkiArea[]>([]);
  const [selectedFeature, setSelectedFeature] =
    useState<SkiFeatureSummary | null>(null);
  const [mapFocus, setMapFocus] = useState<{
    lat: number;
    lng: number;
    zoom?: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const trimmedQuery = query.trim();

  const flyToArea = useCallback((area: SkiArea) => {
    setMapFocus({ lat: area.lat, lng: area.lng, zoom: 12 });
    setSelectedFeature({
      id: area.id,
      name: area.name,
      type: "skiArea",
      lat: area.lat,
      lng: area.lng,
      runs_count: area.runs_count,
      lifts_count: area.lifts_count,
      activities: area.activities,
    });
  }, []);

  useEffect(() => {
    if (!trimmedQuery) return;

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/ski/nearby?q=${encodeURIComponent(trimmedQuery)}&limit=20`,
        );
        const data = await res.json();
        const areas: SkiArea[] = data.areas ?? [];
        setResults(areas);
        if (areas.length === 1) flyToArea(areas[0]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [trimmedQuery, flyToArea]);

  useEffect(() => {
    const areaId = searchParams.get("area");
    if (!areaId) return;

    fetch(`/api/ski/nearby?id=${encodeURIComponent(areaId)}`)
      .then((r) => r.json())
      .then((data) => {
        const match = (data.areas ?? []).find(
          (a: SkiArea) => a.id === areaId,
        );
        if (match) flyToArea(match);
      })
      .catch(() => {});
  }, [searchParams, flyToArea]);

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col md:h-[calc(100vh-5rem)]">
      <div className="border-b border-stone-200 bg-white px-4 py-3">
        <p className="text-sm font-medium text-sky-700">Explore · Ski</p>
        <h1 className="text-xl font-bold text-stone-900">Ski resort map</h1>
        <p className="mt-1 text-xs text-stone-500">
          Downhill, cross-country, ski touring — tap any run or lift on the map
        </p>
        <div className="mt-3 flex gap-2">
          <input
            type="search"
            value={query}
            onChange={(e) => {
              const value = e.target.value;
              setQuery(value);
              if (!value.trim()) setResults([]);
            }}
            placeholder="Search resorts (e.g. Vail, Aspen)..."
            className="flex-1 rounded-xl border border-stone-200 px-4 py-2.5 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
          />
          {loading && (
            <span className="self-center text-xs text-stone-400">
              Searching…
            </span>
          )}
        </div>
        {trimmedQuery && results.length > 0 && (
          <ul className="mt-2 max-h-32 overflow-y-auto rounded-xl border border-stone-200 bg-stone-50">
            {results.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => flyToArea(r)}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-white"
                >
                  <span className="font-medium">{r.name}</span>
                  {r.region && (
                    <span className="ml-2 text-stone-500">{r.region}</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="relative flex-1">
        <MapView
          mode="ski"
          className="absolute inset-0 rounded-none"
          geolocate
          fitToMarkers={false}
          focus={mapFocus}
          onSkiFeatureClick={(feature) => {
            setSelectedFeature(feature);
            setMapFocus(null);
          }}
        />

        {selectedFeature && (
          <div className="absolute bottom-4 left-4 right-4 md:left-auto md:w-96">
            <SkiFeaturePanel
              feature={selectedFeature}
              onClose={() => setSelectedFeature(null)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
