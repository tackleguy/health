"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { GeoLineString, MapMarker, MapMode } from "@/lib/types";
import type { SkiArea, SkiFeatureSummary } from "@/lib/ski";
import type { CatalogMapPoint, CatalogMapResult, CatalogTrail } from "@/lib/trail-catalog/types";
import { displayMiles, sourceName } from "@/lib/trail-catalog/types";
import { MapView } from "@/components/map/MapView";
import { ModeSwitcher } from "@/components/map/ModeSwitcher";
import { SkiFeaturePanel } from "@/components/map/SkiFeaturePanel";
import { LocationPermissionPrompt } from "@/components/gps/LocationPermissionPrompt";
import { useLocationPermission } from "@/components/gps/useLocationPermission";
import {
  activityForTrail,
  formatDistanceAway,
  haversineKm,
  recordUrl,
} from "@/lib/map";

type NearbySkiArea = SkiArea & { distance_km?: number };

interface MapPageClientProps {
  markers: MapMarker[];
  catalogMap: CatalogMapResult | null;
}

function catalogMarkers(points: CatalogMapPoint[]): MapMarker[] {
  return points.map((point) => {
    if (point.trail) {
      return {
        id: point.trail.id,
        type: "trail" as const,
        name: point.trail.name,
        latitude: point.latitude,
        longitude: point.longitude,
        subtitle: [
          point.trail.region,
          displayMiles(point.trail.miles),
          sourceName(point.trail.source),
        ]
          .filter(Boolean)
          .join(" · "),
        href: `/explore/trails?q=${encodeURIComponent(point.trail.name)}`,
      };
    }
    return {
      id: point.id,
      type: "trail" as const,
      name: `${point.count.toLocaleString()} trails`,
      latitude: point.latitude,
      longitude: point.longitude,
      subtitle: "Zoom in to see individual sections",
      href: "/explore/trails",
    };
  });
}

export function MapPageClient({
  markers: initialMarkers,
  catalogMap: initialCatalog,
}: MapPageClientProps) {
  const [mode, setMode] = useState<MapMode>("trail");
  const [explicitLocation, setUserLoc] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [catalog, setCatalog] = useState<CatalogMapResult | null>(initialCatalog);
  const [nearbySkiAreas, setNearbySkiAreas] = useState<NearbySkiArea[]>([]);
  const [selected, setSelected] = useState<MapMarker | null>(null);
  const [selectedTrail, setSelectedTrail] = useState<CatalogTrail | null>(null);
  const [selectedRoute, setSelectedRoute] = useState<GeoLineString | null>(null);
  const [selectedSkiFeature, setSelectedSkiFeature] =
    useState<SkiFeatureSummary | null>(null);
  const [mapFocus, setMapFocus] = useState<{
    lat: number;
    lng: number;
    zoom?: number;
  } | null>(null);
  const [trailLabel, setTrailLabel] = useState<string | null>(
    initialCatalog
      ? `${initialCatalog.total.toLocaleString()} trail sections across Canada & the U.S.`
      : null,
  );
  const [nearbyLabel, setNearbyLabel] = useState<string | null>(null);
  const location = useLocationPermission();
  const userLoc = explicitLocation ?? location.coords;
  const boundsAbort = useRef<AbortController | null>(null);
  const geometryAbort = useRef<AbortController | null>(null);

  const resolvedFocus = useMemo(
    () =>
      mapFocus ??
      (location.coords ? { ...location.coords, zoom: 11 } : null),
    [mapFocus, location.coords],
  );

  const onGeolocate = useCallback((lat: number, lng: number) => {
    setUserLoc({ lat, lng });
  }, []);

  const handleRequestLocation = useCallback(async () => {
    const coords = await location.requestLocation();
    if (coords) {
      setUserLoc(coords);
      setMapFocus({ lat: coords.lat, lng: coords.lng, zoom: 11 });
    }
  }, [location]);

  const loadCatalogForBounds = useCallback(
    (bounds: { west: number; south: number; east: number; north: number }) => {
      boundsAbort.current?.abort();
      const controller = new AbortController();
      boundsAbort.current = controller;
      const bbox = [
        bounds.west,
        bounds.south,
        bounds.east,
        bounds.north,
      ]
        .map((n) => n.toFixed(5))
        .join(",");

      void fetch(`/api/trail-catalog/map?bbox=${bbox}`, {
        signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]),
      })
        .then(async (response) => {
          if (!response.ok) throw new Error("catalog map failed");
          return response.json() as Promise<CatalogMapResult>;
        })
        .then((data) => {
          setCatalog(data);
          setTrailLabel(
            data.total > 0
              ? `${data.total.toLocaleString()} trail sections in this view`
              : "No trail sections in this view — pan or zoom out",
          );
        })
        .catch((error: unknown) => {
          if (error instanceof DOMException && error.name === "AbortError") return;
          setTrailLabel("Trail sections could not refresh — try moving the map");
        });
    },
    [],
  );

  useEffect(() => {
    if (mode !== "ski" || !userLoc) return;

    fetch(
      `/api/ski/nearby?lat=${userLoc.lat}&lng=${userLoc.lng}&radius=150&limit=30`,
    )
      .then((r) => r.json())
      .then((data) => {
        const areas: NearbySkiArea[] = data.areas ?? [];
        setNearbySkiAreas(areas);
        setNearbyLabel(
          areas.length > 0
            ? `${areas.length} ski areas near you`
            : "Enable location to find nearby ski areas",
        );
      })
      .catch(() => setNearbyLabel(null));
  }, [mode, userLoc]);

  const handleModeChange = (next: MapMode) => {
    setMode(next);
    setSelected(null);
    setSelectedTrail(null);
    setSelectedRoute(null);
    setSelectedSkiFeature(null);
    setMapFocus(null);
  };

  const markers = useMemo((): MapMarker[] => {
    if (mode !== "trail") {
      return nearbySkiAreas.map((area) => ({
        id: area.id,
        type: "resort" as const,
        name: area.name,
        latitude: area.lat,
        longitude: area.lng,
        subtitle:
          area.distance_km != null
            ? formatDistanceAway(area.distance_km)
            : undefined,
        href: `/explore/ski`,
      }));
    }

    const parks = initialMarkers.filter((m) => m.type === "park");
    const trails = catalogMarkers(catalog?.points ?? []);
    return [...parks, ...trails];
  }, [mode, nearbySkiAreas, initialMarkers, catalog]);

  const routes = useMemo(
    () => (mode === "trail" && selectedRoute ? [selectedRoute] : []),
    [mode, selectedRoute],
  );

  const skiFeatureDistance =
    selectedSkiFeature && userLoc
      ? haversineKm(
          userLoc.lat,
          userLoc.lng,
          selectedSkiFeature.lat,
          selectedSkiFeature.lng,
        )
      : undefined;

  const openCatalogTrail = useCallback((trail: CatalogTrail) => {
    geometryAbort.current?.abort();
    const controller = new AbortController();
    geometryAbort.current = controller;
    setSelected({
      id: trail.id,
      type: "trail",
      name: trail.name,
      latitude: trail.latitude,
      longitude: trail.longitude,
      href: `/explore/trails?q=${encodeURIComponent(trail.name)}`,
    });
    setSelectedTrail(trail);
    setSelectedRoute(null);
    setMapFocus({ lat: trail.latitude, lng: trail.longitude, zoom: 13 });

    void fetch(`/api/trail-catalog/${encodeURIComponent(trail.id)}`, {
      signal: AbortSignal.any([controller.signal, AbortSignal.timeout(12000)]),
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("geometry unavailable");
        return response.json() as Promise<{ lines: [number, number][][] }>;
      })
      .then((data) => {
        const line = data.lines?.[0];
        if (!line?.length) return;
        setSelectedRoute({
          type: "LineString",
          coordinates: line.map(([lng, lat]) => [lng, lat]),
        });
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
      });
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="section-label">
            {mode === "ski" ? "Winter layer" : "Trail layer"}
          </p>
          <h1 className="font-display text-3xl font-semibold text-cream">
            Adventure Map
          </h1>
          <p className="mt-1 text-sm text-mist">
            {mode === "ski"
              ? (nearbyLabel ?? "Ski areas — switch Map / Satellite / 3D")
              : (trailLabel ??
                "All catalog trail sections — Map, Satellite, Hybrid & 3D")}
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
              className="shrink-0 rounded-full border border-accent/20 bg-accent/10 px-3 py-1.5 text-xs font-semibold text-accent transition hover:bg-accent/15"
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

      {(location.needsPrompt || location.permission === "denied") && (
        <LocationPermissionPrompt
          permission={location.permission}
          loading={location.loading}
          error={location.error}
          onRequest={handleRequestLocation}
        />
      )}

      <MapView
        key={mode}
        mode={mode}
        markers={markers}
        routes={routes}
        className="h-[calc(100vh-280px)] min-h-[420px]"
        geolocate
        fitToMarkers={mode === "trail" && !userLoc && !catalog}
        fitToRoutes={Boolean(selectedRoute)}
        focus={resolvedFocus}
        onGeolocate={onGeolocate}
        onBoundsChange={mode === "trail" ? loadCatalogForBounds : undefined}
        onMarkerClick={(marker) => {
          if (marker.type === "park") {
            window.location.href = marker.href;
            return;
          }
          if (marker.type === "resort") {
            setMapFocus({
              lat: marker.latitude,
              lng: marker.longitude,
              zoom: 12,
            });
            setSelectedSkiFeature({
              id: marker.id,
              name: marker.name,
              type: "skiArea",
              lat: marker.latitude,
              lng: marker.longitude,
            });
            setSelected(null);
            setSelectedTrail(null);
            setSelectedRoute(null);
            return;
          }

          const point = catalog?.points.find((p) => p.id === marker.id);
          if (point?.bounds) {
            setMapFocus({
              lat: (point.bounds[1] + point.bounds[3]) / 2,
              lng: ((point.bounds[0] + point.bounds[2]) / 2 + 540) % 360 - 180,
              zoom: 9,
            });
            setSelected(null);
            setSelectedTrail(null);
            setSelectedRoute(null);
            return;
          }
          if (point?.trail) {
            openCatalogTrail(point.trail);
            return;
          }
          setSelected(marker);
          setSelectedTrail(null);
          setSelectedRoute(null);
          setMapFocus({
            lat: marker.latitude,
            lng: marker.longitude,
            zoom: 13,
          });
        }}
      />

      {selected && selectedTrail && (
        <div className="surface-card p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-display font-semibold text-cream">
                {selectedTrail.name}
              </p>
              <p className="mt-0.5 text-sm text-mist">
                {[
                  selectedTrail.region,
                  selectedTrail.country === "CA" ? "Canada" : "United States",
                  displayMiles(selectedTrail.miles),
                  selectedTrail.difficulty,
                  sourceName(selectedTrail.source),
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setSelected(null);
                setSelectedTrail(null);
                setSelectedRoute(null);
              }}
              className="text-mist hover:text-cream"
            >
              ✕
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() =>
                setMapFocus({
                  lat: selectedTrail.latitude,
                  lng: selectedTrail.longitude,
                  zoom: 14,
                })
              }
              className="btn-ghost !py-2 !text-sm"
            >
              Zoom to trail
            </button>
            <Link
              href={`/explore/trails?q=${encodeURIComponent(selectedTrail.name)}`}
              className="btn-ghost !py-2 !text-sm"
            >
              Find in Explore
            </Link>
            <Link
              href={recordUrl(activityForTrail(selectedTrail.difficulty ?? "moderate"), {
                trailId: selectedTrail.id,
              })}
              className="btn-primary !py-2 !text-sm"
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
