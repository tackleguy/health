"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { SkiArea } from "@/lib/ski";

const STYLE = "https://tiles.openfreemap.org/styles/positron";

export function SkiMapClient() {
  const searchParams = useSearchParams();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SkiArea[]>([]);
  const [selected, setSelected] = useState<SkiArea | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: STYLE,
      center: [-106.374, 39.64],
      zoom: 4,
      attributionControl: false,
    });

    map.addControl(new maplibregl.NavigationControl(), "top-right");
    map.addControl(
      new maplibregl.GeolocateControl({ trackUserLocation: true }),
      "top-right",
    );

    mapRef.current = map;

    return () => {
      markersRef.current.forEach((m) => m.remove());
      map.remove();
      mapRef.current = null;
    };
  }, []);

  const showResorts = useCallback((areas: SkiArea[]) => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    areas.forEach((area) => {
      if (!area.lat || !area.lng) return;

      const el = document.createElement("button");
      el.className =
        "flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-sky-600 text-sm shadow-lg hover:scale-110";
      el.innerHTML = "⛷";
      el.title = area.name;

      el.addEventListener("click", () => {
        setSelected(area);
        map.flyTo({ center: [area.lng, area.lat], zoom: 11 });
      });

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([area.lng, area.lat])
        .addTo(map);

      markersRef.current.push(marker);
    });

    if (areas.length > 0) {
      const bounds = new maplibregl.LngLatBounds();
      areas.forEach((a) => {
        if (a.lat && a.lng) bounds.extend([a.lng, a.lat]);
      });
      if (!bounds.isEmpty()) map.fitBounds(bounds, { padding: 60, maxZoom: 10 });
    }
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`);
        const data = await res.json();
        const resorts = (data.results ?? []).filter(
          (r: { type: string }) => r.type === "resort",
        );
        const areas: SkiArea[] = resorts.map(
          (r: { id: string; name: string; subtitle: string; lat?: number; lng?: number }) => ({
            id: r.id,
            name: r.name,
            region: r.subtitle,
            lat: r.lat ?? 0,
            lng: r.lng ?? 0,
          }),
        );
        setResults(areas);
        showResorts(areas);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, showResorts]);

  useEffect(() => {
    const areaId = searchParams.get("area");
    if (!areaId) return;

    fetch(`/api/search?q=${encodeURIComponent(areaId)}`)
      .then((r) => r.json())
      .then((data) => {
        const match = (data.results ?? []).find(
          (r: { id: string; type: string }) => r.type === "resort" && r.id === areaId,
        );
        if (match) {
          const area: SkiArea = {
            id: match.id,
            name: match.name,
            region: match.subtitle,
            lat: match.lat ?? 0,
            lng: match.lng ?? 0,
          };
          setSelected(area);
          mapRef.current?.flyTo({ center: [area.lng, area.lat], zoom: 11 });
        }
      })
      .catch(() => {});
  }, [searchParams]);

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col md:h-[calc(100vh-5rem)]">
      <div className="border-b border-stone-200 bg-white px-4 py-3">
        <p className="text-sm font-medium text-sky-700">Explore · Ski</p>
        <h1 className="text-xl font-bold text-stone-900">Ski resort map</h1>
        <div className="mt-3 flex gap-2">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search resorts (e.g. Vail, Aspen)..."
            className="flex-1 rounded-xl border border-stone-200 px-4 py-2.5 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
          />
          {loading && <span className="self-center text-xs text-stone-400">Searching…</span>}
        </div>
        {results.length > 0 && (
          <ul className="mt-2 max-h-32 overflow-y-auto rounded-xl border border-stone-200 bg-stone-50">
            {results.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => {
                    setSelected(r);
                    mapRef.current?.flyTo({ center: [r.lng, r.lat], zoom: 11 });
                  }}
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
        <div ref={containerRef} className="absolute inset-0" />

        {selected && (
          <div className="absolute bottom-4 left-4 right-4 rounded-2xl border border-stone-200 bg-white p-4 shadow-xl md:left-auto md:w-80">
            <h2 className="font-semibold text-stone-900">{selected.name}</h2>
            {selected.region && (
              <p className="text-sm text-stone-500">{selected.region}</p>
            )}
            {(selected.runs_count || selected.lifts_count) && (
              <p className="mt-1 text-xs text-stone-400">
                {selected.runs_count ? `${selected.runs_count} runs` : ""}
                {selected.runs_count && selected.lifts_count ? " · " : ""}
                {selected.lifts_count ? `${selected.lifts_count} lifts` : ""}
              </p>
            )}
            <Link
              href={`/record/live?type=ski&resort_id=${encodeURIComponent(selected.id)}&resort_name=${encodeURIComponent(selected.name)}`}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-sky-600 py-3 text-sm font-semibold text-white hover:bg-sky-700"
            >
              ⛷ Start Ski Day
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
