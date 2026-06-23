"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { MapMarker, MapMode } from "@/lib/types";
import { MapView } from "@/components/map/MapView";
import { ModeSwitcher } from "@/components/map/ModeSwitcher";

interface MapPageClientProps {
  markers: MapMarker[];
}

export function MapPageClient({ markers }: MapPageClientProps) {
  const router = useRouter();
  const [mode, setMode] = useState<MapMode>("trail");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Adventure Map</h1>
          <p className="text-sm text-stone-500">
            Explore trails and resorts in one unified map
          </p>
        </div>
        <ModeSwitcher mode={mode} onChange={setMode} />
      </div>

      <MapView
        mode={mode}
        markers={mode === "trail" ? markers : []}
        className="h-[calc(100vh-220px)] min-h-[480px]"
        onMarkerClick={(marker) => router.push(marker.href)}
      />
    </div>
  );
}
