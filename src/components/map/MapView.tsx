"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { MapMarker, MapMode } from "@/lib/types";
import type { SkiFeatureSummary } from "@/lib/ski";
import { isSkiTappableLayer, OPENSKIMAP_TERRAIN_STYLE } from "@/lib/ski";
import clsx from "clsx";

const TRAIL_STYLE = "https://tiles.openfreemap.org/styles/liberty";

function parseMapProp<T>(value: unknown): T | undefined {
  if (value == null) return undefined;
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch {
      return value as T;
    }
  }
  return value as T;
}

interface MapViewProps {
  mode: MapMode;
  markers?: MapMarker[];
  center?: [number, number];
  zoom?: number;
  className?: string;
  geolocate?: boolean;
  fitToMarkers?: boolean;
  focus?: { lat: number; lng: number; zoom?: number } | null;
  onMarkerClick?: (marker: MapMarker) => void;
  onGeolocate?: (lat: number, lng: number) => void;
  onSkiFeatureClick?: (feature: SkiFeatureSummary) => void;
}

export function MapView({
  mode,
  markers = [],
  center = [-98.5795, 39.8283],
  zoom = 3.5,
  className,
  geolocate = false,
  fitToMarkers = true,
  focus,
  onMarkerClick,
  onGeolocate,
  onSkiFeatureClick,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const modeRef = useRef(mode);
  const onGeolocateRef = useRef(onGeolocate);
  const onSkiFeatureClickRef = useRef(onSkiFeatureClick);
  const tappableLayersRef = useRef<string[]>([]);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    onGeolocateRef.current = onGeolocate;
  }, [onGeolocate]);

  useEffect(() => {
    onSkiFeatureClickRef.current = onSkiFeatureClick;
  }, [onSkiFeatureClick]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: mode === "ski" ? OPENSKIMAP_TERRAIN_STYLE : TRAIL_STYLE,
      center,
      zoom: mode === "ski" ? 9 : zoom,
      attributionControl: false,
    });

    map.addControl(new maplibregl.NavigationControl(), "top-right");
    map.addControl(
      new maplibregl.AttributionControl({ compact: true }),
      "bottom-right",
    );

    if (geolocate || mode === "ski") {
      const geo = new maplibregl.GeolocateControl({
        trackUserLocation: true,
        showUserLocation: true,
        showAccuracyCircle: true,
      });
      map.addControl(geo, "top-right");
      map.on("load", () => geo.trigger());
      geo.on("geolocate", (e) => {
        onGeolocateRef.current?.(e.coords.latitude, e.coords.longitude);
      });
    }

    const refreshTappableLayers = () => {
      const layers = map.getStyle()?.layers ?? [];
      tappableLayersRef.current = layers
        .filter((l) => isSkiTappableLayer(l.id))
        .map((l) => l.id)
        .reverse();
    };

    map.on("styledata", refreshTappableLayers);

    map.on("click", (e) => {
      if (modeRef.current !== "ski" || tappableLayersRef.current.length === 0) return;
      const features = map.queryRenderedFeatures(e.point, {
        layers: tappableLayersRef.current,
      });
      const props = features[0]?.properties;
      if (!props?.id) return;

      onSkiFeatureClickRef.current?.({
        id: String(props.id),
        name: String(props.name ?? "Ski feature"),
        type: props.type as SkiFeatureSummary["type"],
        uses: parseMapProp<string[]>(props.uses),
        activities: parseMapProp<string[]>(props.activities),
        difficulty: props.difficulty ? String(props.difficulty) : undefined,
        status: props.status ? String(props.status) : undefined,
        lat: e.lngLat.lat,
        lng: e.lngLat.lng,
        liftType: props.liftType ? String(props.liftType) : undefined,
      });
    });

    map.on("mousemove", (e) => {
      if (modeRef.current !== "ski" || tappableLayersRef.current.length === 0) return;
      const features = map.queryRenderedFeatures(e.point, {
        layers: tappableLayersRef.current,
      });
      map.getCanvas().style.cursor = features.length > 0 ? "pointer" : "";
    });

    mapRef.current = map;

    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    map.setStyle(mode === "ski" ? OPENSKIMAP_TERRAIN_STYLE : TRAIL_STYLE);
  }, [mode]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || mode === "ski") return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    markers.forEach((marker) => {
      const el = document.createElement("button");
      el.type = "button";
      el.className = clsx(
        "flex min-w-[2rem] flex-col items-center gap-0.5 rounded-xl border-2 border-white px-2 py-1.5 text-center shadow-lg transition hover:scale-105",
        marker.type === "park"
          ? "bg-emerald-600 text-white"
          : marker.type === "resort"
            ? "bg-sky-600 text-white"
            : "bg-white",
      );

      const icon =
        marker.type === "park" ? "🏞" : marker.type === "resort" ? "⛷" : "🥾";

      if (marker.type === "park") {
        el.innerHTML = `<span class="text-sm">${icon}</span>`;
      } else {
        el.innerHTML = `
          <span class="text-sm">${icon}</span>
          <span class="max-w-[72px] truncate text-[9px] font-semibold">${marker.name}</span>
          ${marker.subtitle ? `<span class="text-[9px] font-medium opacity-90">${marker.subtitle}</span>` : ""}
        `;
      }

      el.title = marker.name;
      el.setAttribute("aria-label", marker.name);

      el.addEventListener("click", (ev) => {
        ev.stopPropagation();
        onMarkerClick?.(marker);
      });

      const mapMarker = new maplibregl.Marker({ element: el, anchor: "bottom" })
        .setLngLat([marker.longitude, marker.latitude])
        .addTo(map);

      markersRef.current.push(mapMarker);
    });
  }, [markers, onMarkerClick, mode]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !fitToMarkers || markers.length === 0 || mode === "ski") return;

    const bounds = new maplibregl.LngLatBounds();
    markers.forEach((m) => bounds.extend([m.longitude, m.latitude]));
    map.fitBounds(bounds, { padding: 60, maxZoom: 11 });
  }, [markers, fitToMarkers, mode]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !focus) return;
    map.flyTo({
      center: [focus.lng, focus.lat],
      zoom: focus.zoom ?? 11,
      essential: true,
    });
  }, [focus]);

  return (
    <div className={clsx("relative overflow-hidden rounded-2xl", className)}>
      <div ref={containerRef} className="h-full w-full" />
      {mode === "ski" && (
        <div className="pointer-events-none absolute inset-x-0 top-4 flex justify-center px-4">
          <div className="max-w-md rounded-full bg-sky-600/90 px-4 py-1.5 text-center text-xs font-medium text-white shadow-lg backdrop-blur">
            Runs, lifts & resorts · downhill, cross-country, ski touring
          </div>
        </div>
      )}
    </div>
  );
}
