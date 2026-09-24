"use client";

import { useEffect, useRef, useState } from "react";
import * as maplibregl from "@/lib/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import type { MapMarker, MapMode, GeoLineString } from "@/lib/types";
import type { SkiFeatureSummary } from "@/lib/ski";
import type { OpenTrailFeatureSummary } from "@/lib/opentrailmap";
import clsx from "clsx";

export type MapBasemap = "map" | "satellite" | "hybrid";

const DEFAULT_CENTER: [number, number] = [-98.5795, 39.8283];
const DEFAULT_ZOOM = 4;

const ESRI_SAT =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
const ESRI_LABELS =
  "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}";
const ESRI_ROADS =
  "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}";
const OSM_RASTER =
  "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const TERRARIUM_DEM =
  "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png";

function buildStyle(basemap: MapBasemap): maplibregl.StyleSpecification {
  const sources: maplibregl.StyleSpecification["sources"] = {
    terrain: {
      type: "raster-dem",
      tiles: [TERRARIUM_DEM],
      encoding: "terrarium",
      tileSize: 256,
      maxzoom: 15,
      attribution: "© Mapzen / AWS Terrain Tiles",
    },
  };
  const layers: maplibregl.LayerSpecification[] = [];

  if (basemap === "map") {
    sources.osm = {
      type: "raster",
      tiles: [OSM_RASTER],
      tileSize: 256,
      maxzoom: 19,
      attribution: "© OpenStreetMap contributors",
    };
    layers.push({ id: "osm", type: "raster", source: "osm" });
  } else {
    sources.satellite = {
      type: "raster",
      tiles: [ESRI_SAT],
      tileSize: 256,
      maxzoom: 19,
      attribution: "Tiles © Esri — Source: Esri, Maxar, Earthstar Geographics",
    };
    layers.push({ id: "satellite", type: "raster", source: "satellite" });

    if (basemap === "hybrid") {
      sources.roads = {
        type: "raster",
        tiles: [ESRI_ROADS],
        tileSize: 256,
        maxzoom: 19,
        attribution: "© Esri",
      };
      sources.labels = {
        type: "raster",
        tiles: [ESRI_LABELS],
        tileSize: 256,
        maxzoom: 19,
        attribution: "© Esri",
      };
      layers.push({ id: "roads", type: "raster", source: "roads" });
      layers.push({ id: "labels", type: "raster", source: "labels" });
    }
  }

  layers.push({
    id: "hillshade",
    type: "hillshade",
    source: "terrain",
    layout: { visibility: "none" },
    paint: {
      "hillshade-exaggeration": 0.45,
      "hillshade-shadow-color": "#1a1a1a",
      "hillshade-highlight-color": "#ffffff",
    },
  });

  return { version: 8, sources, layers };
}

interface MapViewProps {
  mode: MapMode;
  markers?: MapMarker[];
  routes?: GeoLineString[];
  center?: [number, number];
  zoom?: number;
  className?: string;
  geolocate?: boolean;
  fitToMarkers?: boolean;
  fitToRoutes?: boolean;
  focus?: { lat: number; lng: number; zoom?: number } | null;
  showBasemapControls?: boolean;
  onMarkerClick?: (marker: MapMarker) => void;
  onGeolocate?: (lat: number, lng: number) => void;
  onBoundsChange?: (bounds: {
    west: number;
    south: number;
    east: number;
    north: number;
  }) => void;
  onSkiFeatureClick?: (feature: SkiFeatureSummary) => void;
  onOpenTrailFeatureClick?: (feature: OpenTrailFeatureSummary) => void;
}

export function MapView({
  mode,
  markers = [],
  routes = [],
  center,
  zoom,
  className,
  geolocate = false,
  fitToMarkers = true,
  fitToRoutes = true,
  focus,
  showBasemapControls = true,
  onMarkerClick,
  onGeolocate,
  onBoundsChange,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const onMarkerClickRef = useRef(onMarkerClick);
  const onGeolocateRef = useRef(onGeolocate);
  const onBoundsChangeRef = useRef(onBoundsChange);
  const [mapError, setMapError] = useState<string | null>(null);
  const [basemap, setBasemap] = useState<MapBasemap>("map");
  const [is3d, setIs3d] = useState(false);
  const [ready, setReady] = useState(false);

  const mapCenter = center ?? DEFAULT_CENTER;
  const mapZoom = zoom ?? DEFAULT_ZOOM;

  useEffect(() => {
    onMarkerClickRef.current = onMarkerClick;
  }, [onMarkerClick]);
  useEffect(() => {
    onGeolocateRef.current = onGeolocate;
  }, [onGeolocate]);
  useEffect(() => {
    onBoundsChangeRef.current = onBoundsChange;
  }, [onBoundsChange]);

  useEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;
    setMapError(null);
    setReady(false);

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: buildStyle(basemap),
      center: mapCenter,
      zoom: mapZoom,
      pitch: 0,
      bearing: 0,
      attributionControl: false,
      maxPitch: 70,
    });

    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-right");
    map.addControl(
      new maplibregl.AttributionControl({ compact: true }),
      "bottom-right",
    );

    if (geolocate) {
      const geo = new maplibregl.GeolocateControl({
        trackUserLocation: true,
        showUserLocation: true,
        showAccuracyCircle: true,
      });
      map.addControl(geo, "top-right");
      geo.on("geolocate", (e) => {
        onGeolocateRef.current?.(e.coords.latitude, e.coords.longitude);
      });
    }

    map.on("load", () => {
      if (cancelled) return;
      mapRef.current = map;
      setReady(true);
      const b = map.getBounds();
      onBoundsChangeRef.current?.({
        west: b.getWest(),
        south: b.getSouth(),
        east: b.getEast(),
        north: b.getNorth(),
      });
    });
    map.on("error", (e) => {
      const msg = e.error?.message ?? "";
      if (msg && !msg.includes("Failed to fetch")) {
        setMapError(msg);
      }
    });

    let boundsTimer: ReturnType<typeof setTimeout> | undefined;
    const emitBounds = () => {
      const b = map.getBounds();
      onBoundsChangeRef.current?.({
        west: b.getWest(),
        south: b.getSouth(),
        east: b.getEast(),
        north: b.getNorth(),
      });
    };
    map.on("moveend", () => {
      clearTimeout(boundsTimer);
      boundsTimer = setTimeout(emitBounds, 280);
    });

    const ro = new ResizeObserver(() => map.resize());
    ro.observe(containerRef.current);

    return () => {
      cancelled = true;
      clearTimeout(boundsTimer);
      ro.disconnect();
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
      setReady(false);
    };
    // Re-init when basemap changes so raster sources swap cleanly
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [basemap, geolocate]);

  // 3D terrain + pitch (AllTrails-style)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    const apply = () => {
      if (is3d) {
        if (map.getLayer("hillshade")) {
          map.setLayoutProperty("hillshade", "visibility", "visible");
        }
        try {
          map.setTerrain({ source: "terrain", exaggeration: 1.35 });
        } catch {
          /* terrain source may still be loading */
        }
        map.easeTo({ pitch: 58, bearing: map.getBearing() || -18, duration: 700 });
      } else {
        if (map.getLayer("hillshade")) {
          map.setLayoutProperty("hillshade", "visibility", "none");
        }
        map.setTerrain(null);
        map.easeTo({ pitch: 0, bearing: 0, duration: 500 });
      }
    };

    if (map.isStyleLoaded()) apply();
    else map.once("idle", apply);
  }, [is3d, ready, basemap]);

  // Focus
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !focus || !ready) return;
    map.easeTo({
      center: [focus.lng, focus.lat],
      zoom: focus.zoom ?? Math.max(map.getZoom(), 11),
      duration: 600,
    });
  }, [focus, ready]);

  // Routes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    const sourceId = "trail-routes";
    const casingId = "trail-routes-casing";
    const lineId = "trail-routes-line";

    const apply = () => {
      if (map.getLayer(lineId)) map.removeLayer(lineId);
      if (map.getLayer(casingId)) map.removeLayer(casingId);
      if (map.getSource(sourceId)) map.removeSource(sourceId);

      if (routes.length === 0) return;

      map.addSource(sourceId, {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: routes.map((geometry, index) => ({
            type: "Feature" as const,
            properties: { index },
            geometry: {
              type: "LineString" as const,
              coordinates: geometry.coordinates.map(([lng, lat, ele]) =>
                ele != null ? [lng, lat, ele] : [lng, lat],
              ),
            },
          })),
        },
      });

      const color = mode === "ski" ? "#38bdf8" : "#22c55e";
      map.addLayer({
        id: casingId,
        type: "line",
        source: sourceId,
        paint: {
          "line-color": "#ffffff",
          "line-width": 7,
          "line-opacity": 0.85,
        },
        layout: { "line-cap": "round", "line-join": "round" },
      });
      map.addLayer({
        id: lineId,
        type: "line",
        source: sourceId,
        paint: {
          "line-color": color,
          "line-width": 4,
          "line-opacity": 0.95,
        },
        layout: { "line-cap": "round", "line-join": "round" },
      });

      if (fitToRoutes) {
        const bounds = new maplibregl.LngLatBounds();
        for (const route of routes) {
          for (const coord of route.coordinates) {
            bounds.extend([coord[0], coord[1]]);
          }
        }
        if (!bounds.isEmpty()) {
          map.fitBounds(bounds, {
            padding: 48,
            maxZoom: 14,
            pitch: is3d ? 58 : 0,
            duration: 0,
          });
        }
      }
    };

    if (map.isStyleLoaded()) apply();
    else map.once("idle", apply);
  }, [routes, fitToRoutes, mode, ready, is3d, basemap]);

  // Markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    markers.forEach((marker) => {
      const el = document.createElement("button");
      el.type = "button";
      el.className = clsx(
        "flex min-w-[2rem] flex-col items-center gap-0.5 rounded-xl border-2 px-2 py-1.5 text-center shadow-lg transition hover:scale-105",
        marker.type === "park"
          ? "border-white/40 bg-pine text-cream"
          : marker.type === "resort"
            ? "border-white/40 bg-accent text-forest"
            : "border-white/50 bg-emerald-600 text-white",
      );
      const icon =
        marker.type === "park"
          ? "🏞"
          : marker.type === "resort"
            ? "⛷"
            : "🥾";
      el.innerHTML = `<span class="text-sm">${icon}</span><span class="max-w-[72px] truncate text-[9px] font-semibold">${marker.name}</span>`;
      el.title = marker.name;
      el.addEventListener("click", (ev) => {
        ev.stopPropagation();
        onMarkerClickRef.current?.(marker);
      });

      markersRef.current.push(
        new maplibregl.Marker({ element: el, anchor: "bottom" })
          .setLngLat([marker.longitude, marker.latitude])
          .addTo(map),
      );
    });

    if (fitToMarkers && markers.length > 0 && !focus && routes.length === 0) {
      const bounds = new maplibregl.LngLatBounds();
      for (const m of markers) bounds.extend([m.longitude, m.latitude]);
      if (!bounds.isEmpty()) {
        map.fitBounds(bounds, {
          padding: 48,
          maxZoom: 12,
          pitch: is3d ? 58 : 0,
          duration: 0,
        });
      }
    }
  }, [markers, fitToMarkers, focus, routes.length, ready, is3d, basemap]);

  return (
    <div
      className={clsx(
        "relative min-h-[320px] overflow-hidden rounded-2xl",
        className,
      )}
    >
      <div ref={containerRef} className="absolute inset-0 h-full w-full" />

      {showBasemapControls && (
        <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 flex-wrap items-center justify-center gap-1 rounded-full border border-white/20 bg-forest/85 p-1 shadow-xl backdrop-blur-md">
          {(
            [
              ["map", "Map"],
              ["satellite", "Satellite"],
              ["hybrid", "Hybrid"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setBasemap(id)}
              className={clsx(
                "rounded-full px-3 py-1.5 text-xs font-semibold transition",
                basemap === id
                  ? "bg-accent text-forest shadow"
                  : "text-cream/90 hover:bg-white/10",
              )}
            >
              {label}
            </button>
          ))}
          <span className="mx-0.5 h-4 w-px bg-white/20" aria-hidden />
          <button
            type="button"
            onClick={() => setIs3d((v) => !v)}
            className={clsx(
              "rounded-full px-3 py-1.5 text-xs font-semibold transition",
              is3d
                ? "bg-accent text-forest shadow"
                : "text-cream/90 hover:bg-white/10",
            )}
            aria-pressed={is3d}
          >
            3D
          </button>
        </div>
      )}

      {mapError && (
        <div className="absolute inset-x-4 top-4 z-10 rounded-xl border border-amber-500/30 bg-amber-950/80 px-4 py-2 text-sm text-amber-100">
          {mapError}
        </div>
      )}
    </div>
  );
}
