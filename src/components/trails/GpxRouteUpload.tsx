"use client";

import { useRef, useState } from "react";

interface GpxRouteUploadProps {
  trailId?: string;
  className?: string;
}

interface RouteStats {
  distance_miles: number;
  elevation_gain_ft: number;
  elevation_loss_ft?: number;
}

interface ImportResponse {
  routes?: Array<{ name?: string; stats: RouteStats }>;
  primary?: { stats: RouteStats };
  saved?: { kind: "activity" | "route_import"; id: string };
  error?: string;
}

export function GpxRouteUpload({ trailId, className = "" }: GpxRouteUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResponse | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const file = inputRef.current?.files?.[0];
    if (!file) {
      setError("Choose a GPX, KML, or GeoJSON file first.");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const form = new FormData();
      form.append("file", file);
      form.append("persist", "true");
      if (trailId) form.append("trail_id", trailId);

      const response = await fetch("/api/gpx/import?persist=true", {
        method: "POST",
        body: form,
      });

      const data = (await response.json()) as ImportResponse;
      if (!response.ok) {
        throw new Error(data.error ?? "Import failed");
      }

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setLoading(false);
    }
  }

  const stats = result?.primary?.stats ?? result?.routes?.[0]?.stats;

  return (
    <section
      className={`rounded-2xl border border-stone-200 bg-white p-6 shadow-sm ${className}`}
    >
      <h2 className="mb-1 font-semibold text-stone-900">Import route</h2>
      <p className="mb-4 text-sm text-stone-500">
        Upload a GPX, KML, or GeoJSON file to parse and save your route.
        {trailId ? " This route will be linked to the current trail." : ""}
      </p>

      <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
        <label className="flex min-w-[200px] flex-1 flex-col gap-1 text-sm">
          <span className="font-medium text-stone-700">Route file</span>
          <input
            ref={inputRef}
            type="file"
            accept=".gpx,.kml,.geojson,.json,application/gpx+xml,application/vnd.google-earth.kml+xml,application/geo+json"
            onChange={(e) => {
              setFileName(e.target.files?.[0]?.name ?? null);
              setError(null);
              setResult(null);
            }}
            className="rounded-lg border border-stone-300 px-3 py-2 text-stone-700 file:mr-3 file:rounded-md file:border-0 file:bg-emerald-50 file:px-3 file:py-1 file:text-sm file:font-medium file:text-emerald-800"
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          {loading ? "Importing…" : "Upload & save"}
        </button>
      </form>

      {fileName && !result && !error && (
        <p className="mt-2 text-xs text-stone-500">Selected: {fileName}</p>
      )}

      {error && (
        <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>
      )}

      {result && stats && (
        <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-4 text-sm text-emerald-950">
          <p className="font-medium">Route imported successfully</p>
          <dl className="mt-2 grid gap-1 sm:grid-cols-3">
            <div>
              <dt className="text-emerald-800/80">Distance</dt>
              <dd className="font-medium">{stats.distance_miles.toFixed(2)} mi</dd>
            </div>
            <div>
              <dt className="text-emerald-800/80">Elevation gain</dt>
              <dd className="font-medium">{Math.round(stats.elevation_gain_ft)} ft</dd>
            </div>
            {stats.elevation_loss_ft != null && (
              <div>
                <dt className="text-emerald-800/80">Elevation loss</dt>
                <dd className="font-medium">{Math.round(stats.elevation_loss_ft)} ft</dd>
              </div>
            )}
          </dl>
          {result.saved && (
            <p className="mt-3 text-xs text-emerald-900/80">
              Saved as {result.saved.kind.replace("_", " ")} · ID{" "}
              <code className="rounded bg-white/60 px-1">{result.saved.id}</code>
            </p>
          )}
        </div>
      )}
    </section>
  );
}
