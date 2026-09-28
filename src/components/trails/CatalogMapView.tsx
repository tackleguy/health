"use client";

import dynamic from "next/dynamic";

// Leaflet reads `window` when imported, so the map only renders in the browser.
export const CatalogMapView = dynamic(
  () => import("./CatalogMapViewLeaflet").then((m) => m.CatalogMapView),
  { ssr: false, loading: () => <div className="catalog-map-canvas" aria-hidden /> },
);
