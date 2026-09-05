"use client";

import { useState } from "react";

const ADAPTERS = [
  { id: "overpass", label: "OSM (Overpass)" },
  { id: "nps", label: "NPS trails" },
  { id: "usfs", label: "USFS trails" },
  { id: "wikimedia", label: "Wikimedia photos" },
  { id: "osm", label: "OSM file URL" },
] as const;

export function AdminImportPanel({ adminSecret }: { adminSecret: string }) {
  const [adapter, setAdapter] = useState<(typeof ADAPTERS)[number]["id"]>("overpass");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function runImport() {
    setLoading(true);
    setStatus(null);
    try {
      const response = await fetch("/api/admin/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-secret": adminSecret,
        },
        body: JSON.stringify({ adapter }),
      });
      const data = await response.json();
      if (!response.ok) {
        setStatus(`Error: ${data.error ?? response.statusText}`);
        return;
      }
      const r = data.result;
      setStatus(
        `Done — processed ${r.processed}, stored ${r.stored}, failed ${r.failed}`,
      );
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Import failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-4 flex flex-wrap items-end gap-3">
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-stone-700">Adapter</span>
        <select
          value={adapter}
          onChange={(e) =>
            setAdapter(e.target.value as (typeof ADAPTERS)[number]["id"])
          }
          className="rounded-lg border border-stone-300 px-3 py-2"
        >
          {ADAPTERS.map((a) => (
            <option key={a.id} value={a.id}>
              {a.label}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        onClick={runImport}
        disabled={loading}
        className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
      >
        {loading ? "Importing…" : "Run import"}
      </button>
      {status && <p className="w-full text-sm text-stone-600">{status}</p>}
    </div>
  );
}
