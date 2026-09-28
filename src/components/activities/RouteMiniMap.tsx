"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import type { RouteMiniMap as LeafletRouteMiniMap } from "./RouteMiniMapLeaflet";

// Leaflet reads `window` when imported, so the map only renders in the browser.
const LeafletMap = dynamic(() => import("./RouteMiniMapLeaflet").then((m) => m.RouteMiniMap), { ssr: false });

export function RouteMiniMap(props: ComponentProps<typeof LeafletRouteMiniMap>) {
  return (
    <div className={`bg-stone-100 ${props.className ?? ""}`}>
      <LeafletMap {...props} className="h-full w-full" />
    </div>
  );
}
