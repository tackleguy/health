"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import type { LiveTrackMap as LeafletLiveTrackMap } from "./LiveTrackMapLeaflet";

// Leaflet reads `window` when imported, so the map only renders in the browser.
const LeafletMap = dynamic(() => import("./LiveTrackMapLeaflet").then((m) => m.LiveTrackMap), { ssr: false });

export function LiveTrackMap(props: ComponentProps<typeof LeafletLiveTrackMap>) {
  return (
    <div className={`rounded-xl bg-stone-800 ${props.className ?? ""}`}>
      <LeafletMap {...props} className="h-full w-full" />
    </div>
  );
}
