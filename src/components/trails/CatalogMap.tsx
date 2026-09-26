"use client";
import { useState, type ReactNode } from "react";
import type { CatalogMapResult, CatalogTrail } from "@/lib/trail-catalog/types";
import { CatalogExplorerMap } from "./CatalogExplorerMap";

export function CatalogMap({
  trails,
  mapData,
  query,
  summary,
  tools,
  children,
}: {
  trails: CatalogTrail[];
  mapData: CatalogMapResult | null;
  query: string;
  summary: string;
  tools: ReactNode;
  children: ReactNode;
}) {
  const [mapOpen, setMapOpen] = useState(true);

  return (
    <div className={`catalog-browse${mapOpen ? " map-open" : ""}`}>
      <div className="catalog-browse-panel">
        <div className="catalog-results-heading">
          <p role="status">{summary}</p>
          <div>
            {tools}
            {trails.length > 0 && (
              <button
                type="button"
                className="catalog-button secondary catalog-map-toggle-btn"
                aria-expanded={mapOpen}
                aria-controls="catalog-result-map"
                onClick={() => setMapOpen(!mapOpen)}
              >
                {mapOpen ? "Hide map" : "Show map"}
              </button>
            )}
          </div>
        </div>
        <div className="catalog-browse-scroll">{children}</div>
      </div>
      {mapOpen && trails.length > 0 && (
        <div id="catalog-result-map" className="catalog-browse-map">
          <CatalogExplorerMap key={query} initialData={mapData} query={query} />
        </div>
      )}
    </div>
  );
}
