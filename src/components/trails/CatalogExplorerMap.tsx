"use client";

import dynamic from "next/dynamic";

// Leaflet reads `window` when imported, so the map only renders in the browser.
export const CatalogExplorerMap = dynamic(
  () => import("./CatalogExplorerMapLeaflet").then((m) => m.CatalogExplorerMap),
  { ssr: false, loading: () => <div className="catalog-map-canvas catalog-discovery-canvas" aria-hidden /> },
);
