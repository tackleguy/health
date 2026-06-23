"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { MapMarker, MapMode, Trail } from "@/lib/types";
import type { SkiArea, SkiFeatureSummary } from "@/lib/ski";
import { MapView } from "@/components/map/MapView";
import { ModeSwitcher } from "@/components/map/ModeSwitcher";
import { SkiFeaturePanel } from "@/components/map/SkiFeaturePanel";
import {
  activityForTrail,
  directionsUrl,
  formatDistanceAway,
  haversineKm,
  recordUrl,
} from "@/lib/map";

type NearbyTrail = Trail & { distance_km?: number };
type NearbySkiArea = SkiArea & { distance_km?: number };

interface MapPageClientProps {
  markers: MapMarker[];
}

export function MapPageClient({ markers: initialMarkers }: MapPageClientProps) {
  const [mode, setMode] = useState<MapMode>("trail");
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(
    null,
  );
  const [nearbyTrails, setNearbyTrails] = useState<NearbyTrail[]>([]);
  const [nearbySkiAreas, setNearbySkiAreas] = useState<NearbySkiArea[]>([]);
  const [selected, setSelected] = useState<MapMarker | null>(null);
  const [selectedSkiFeature, setSelectedSkiFeature] =
    useState<SkiFeatureSummary | null>(null);
  const [mapFocus, setMapFocus] = useState<{
    lat: number;
    lng: number;
    zoom?: number;
  } | null>(null);
  const [nearbyLabel, setNearbyLabel] = useState<string | null>(null);

  const onGeolocate = useCallback((lat: number, lng: number) => {
    setUserLoc({ lat, lng });
  }, []);

  useEffect(() => {
    if (!userLoc) return;

    if (mode === "trail") {
      fetch(
        `/api/trails/nearby?lat=${userLoc.lat}&lng=${userLoc.lng}&radius=250&limit=40`,
      )
        .then((r) => r.json())
        .then((data) => {
          const trails: NearbyTrail[] = data.trails ?? [];
          setNearbyTrails(trails);
          setNearbyLabel(
            trails.length > 0
              ? `${trails.length} trails near you`
              : "No trails nearby — showing all parks",
          );
        })
        .catch(() => setNearbyLabel(null));
      return;
    }

    fetch(
      `/api/ski/nearby?lat=${userLoc.lat}&lng=${userLoc.lng}&radius=150&limit=30`,
    )
      .then((r) => r.json())
      .then((data) => {
        const areas: NearbySkiArea[] = data.areas ?? [];
        setNearbySkiAreas(areas);
        setNearbyLabel(
          areas.length > 0
            ? `${areas.length} ski areas near you — tap runs on the map`
            : "Zoom in to see runs, lifts & resorts",
        );
      })
      .catch(() =>
        setNearbyLabel("Zoom in to see runs, lifts & resorts"),
      );
  }, [mode, userLoc]);

  const handleModeChange = (next: MapMode) => {
    setMode(next);
    setSelected(null);
    setSelectedSkiFeature(null);
    setMapFocus(null);
  };

  const markers = useMemo((): MapMarker[] => {
    if (mode !== "trail") return [];

    if (nearbyTrails.length > 0) {
      return nearbyTrails.map((trail) => ({
        id: trail.id,
        type: "trail" as const,
        name: trail.trail_name,
        latitude: trail.latitude,
        longitude: trail.longitude,
        subtitle:
          trail.distance_km != null
            ? formatDistanceAway(trail.distance_km)
            : undefined,
        href: `/explore/trails/${trail.id}`,
      }));
    }

    return initialMarkers.filter(
      (m) => m.type === "trail" || m.type === "park",
    );
  }, [mode, nearbyTrails, initialMarkers]);

  const selectedTrail = nearbyTrails.find((t) => t.id === selected?.id);

  const skiFeatureDistance =
    selectedSkiFeature && userLoc
      ? haversineKm(
          userLoc.lat,
          userLoc.lng,
          selectedSkiFeature.lat,
          selectedSkiFeature.lng,
        )
      : undefined;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Adventure Map</h1>
          <p className="text-sm text-stone-500">
            {mode === "ski"
              ? (nearbyLabel ??
                "Runs, lifts & resorts — enable location for nearby areas")
              : (nearbyLabel ??
                "Trails and parks — enable location for nearby results")}
          </p>
        </div>
        <ModeSwitcher mode={mode} onChange={handleModeChange} />
      </div>

      {mode === "ski" && nearbySkiAreas.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {nearbySkiAreas.slice(0, 8).map((area) => (
            <button
              key={area.id}
              type="button"
              onClick={() => {
                setMapFocus({ lat: area.lat, lng: area.lng, zoom: 12 });
                setSelectedSkiFeature({
                  id: area.id,
                  name: area.name,
                  type: "skiArea",
                  lat: area.lat,
                  lng: area.lng,
                  runs_count: area.runs_count,
                  lifts_count: area.lifts_count,
                  activities: area.activities,
                });
              }}
              className="shrink-0 rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-medium text-sky-800 hover:bg-sky-100"
            >
              {area.name}
              {area.distance_km != null && (
                <span className="ml-1 text-sky-600">
                  · {formatDistanceAway(area.distance_km)}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      <MapView
        mode={mode}
        markers={markers}
        className="h-[calc(100vh-280px)] min-h-[420px]"
        geolocate
        fitToMarkers={nearbyTrails.length === 0}
        focus={mapFocus}
        onGeolocate={onGeolocate}
        onMarkerClick={(marker) => {
          if (marker.type === "park") {
            window.location.href = marker.href;
            return;
          }
          setSelected(marker);
        }}
        onSkiFeatureClick={(feature) => {
          setSelectedSkiFeature(feature);
          setSelected(null);
        }}
      />

      {selected && selectedTrail && (
        <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-stone-900">
                {selectedTrail.trail_name}
              </p>
              <p className="mt-0.5 text-sm text-stone-500">
                {selectedTrail.park?.park_name} · {selectedTrail.length_miles}{" "}
                mi · {selectedTrail.difficulty}
                {selectedTrail.distance_km != null &&
                  ` · ${formatDistanceAway(selectedTrail.distance_km)} away`}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="text-stone-400 hover:text-stone-600"
            >
              ✕
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <a
              href={directionsUrl(
                selectedTrail.latitude,
                selectedTrail.longitude,
                selectedTrail.trail_name,
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-stone-200 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
            >
              Get directions
            </a>
            <Link
              href={`/explore/trails/${selectedTrail.id}`}
              className="rounded-lg border border-stone-200 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
            >
              Trail details
            </Link>
            <Link
              href={recordUrl(activityForTrail(selectedTrail.difficulty), {
                trailId: selectedTrail.id,
              })}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            >
              Start GPS record
            </Link>
          </div>
        </div>
      )}

      {mode === "ski" && selectedSkiFeature && (
        <SkiFeaturePanel
          feature={selectedSkiFeature}
          distanceKm={skiFeatureDistance}
          onClose={() => setSelectedSkiFeature(null)}
        />
      )}
    </div>
  );
}
