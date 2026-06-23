"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { MapMarker, MapMode } from "@/lib/types";
import type { SkiFeatureSummary } from "@/lib/ski";
import { isSkiTappableLayer, OPENSKIMAP_TERRAIN_STYLE } from "@/lib/ski";
import clsx from "clsx";

const TRAIL_STYLE = "https://tiles.openfreemap.org/styles/liberty";
const SKI_DEFAULT_CENTER: [number, number] = [-106.374, 39.64];
const SKI_DEFAULT_ZOOM = 6;

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

function featureFromProperties(
  props: Record<string, unknown> | null | undefined,
  lat: number,
  lng: number,
): SkiFeatureSummary | null {
  if (!props?.id) return null;

  return {
    id: String(props.id),
    name: String(props.name ?? "Ski feature"),
    type: props.type as SkiFeatureSummary["type"],
    uses: parseMapProp<string[]>(props.uses),
    activities: parseMapProp<string[]>(props.activities),
    difficulty: props.difficulty ? String(props.difficulty) : undefined,
    status: props.status ? String(props.status) : undefined,
    lat,
    lng,
    liftType: props.liftType ? String(props.liftType) : undefined,
  };
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
  center,
  zoom,
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
  const onGeolocateRef = useRef(onGeolocate);
  const onSkiFeatureClickRef = useRef(onSkiFeatureClick);
  const skiLayerHandlersRef = useRef<
    Array<{
      layerId: string;
      onClick: (e: maplibregl.MapLayerMouseEvent) => void;
      onEnter: () => void;
      onLeave: () => void;
    }>
  >([]);

  const isSki = mode === "ski";
  const mapCenter = center ?? (isSki ? SKI_DEFAULT_CENTER : [-98.5795, 39.8283]);
  const mapZoom = zoom ?? (isSki ? SKI_DEFAULT_ZOOM : 3.5);

  useEffect(() => {
    onGeolocateRef.current = onGeolocate;
  }, [onGeolocate]);

  useEffect(() => {
    onSkiFeatureClickRef.current = onSkiFeatureClick;
  }, [onSkiFeatureClick]);

  useEffect(() => {
    if (!containerRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: isSki ? OPENSKIMAP_TERRAIN_STYLE : TRAIL_STYLE,
      center: mapCenter,
      zoom: mapZoom,
      attributionControl: false,
    });

    map.addControl(new maplibregl.NavigationControl(), "top-right");
    map.addControl(
      new maplibregl.AttributionControl({ compact: true }),
      "bottom-right",
    );

    if (geolocate || isSki) {
      const geo = new maplibregl.GeolocateControl({
        trackUserLocation: true,
        showUserLocation: true,
        showAccuracyCircle: true,
      });
      map.addControl(geo, "top-right");
      map.once("load", () => {
        geo.trigger();
      });
      geo.on("geolocate", (e) => {
        onGeolocateRef.current?.(e.coords.latitude, e.coords.longitude);
      });
    }

    const clearSkiHandlers = () => {
      for (const { layerId, onClick, onEnter, onLeave } of skiLayerHandlersRef.current) {
        map.off("click", layerId, onClick);
        map.off("mouseenter", layerId, onEnter);
        map.off("mouseleave", layerId, onLeave);
      }
      skiLayerHandlersRef.current = [];
    };

    const attachSkiHandlers = () => {
      if (!isSki) return;
      clearSkiHandlers();

      const layers = map.getStyle()?.layers ?? [];
      const tappableLayers = layers
        .filter((l) => isSkiTappableLayer(l.id))
        .map((l) => l.id)
        .reverse();

      for (const layerId of tappableLayers) {
        const onClick = (e: maplibregl.MapLayerMouseEvent) => {
          const props = e.features?.[0]?.properties;
          const lngLat = e.lngLat;
          if (!props || !lngLat) return;

          const feature = featureFromProperties(props, lngLat.lat, lngLat.lng);
          if (feature) onSkiFeatureClickRef.current?.(feature);
        };

        const onEnter = () => {
          map.getCanvas().style.cursor = "pointer";
        };
        const onLeave = () => {
          map.getCanvas().style.cursor = "";
        };

        map.on("click", layerId, onClick);
        map.on("mouseenter", layerId, onEnter);
        map.on("mouseleave", layerId, onLeave);

        skiLayerHandlersRef.current.push({ layerId, onClick, onEnter, onLeave });
      }
    };

    map.on("style.load", attachSkiHandlers);

    mapRef.current = map;

    const resizeObserver = new ResizeObserver(() => {
      map.resize();
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      clearSkiHandlers();
      map.off("style.load", attachSkiHandlers);
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSki]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || isSki) return;

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
  }, [markers, onMarkerClick, isSki]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !fitToMarkers || markers.length === 0 || isSki) return;

    const bounds = new maplibregl.LngLatBounds();
    markers.forEach((m) => bounds.extend([m.longitude, m.latitude]));
    map.fitBounds(bounds, { padding: 60, maxZoom: 11 });
  }, [markers, fitToMarkers, isSki]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !focus) return;
    map.flyTo({
      center: [focus.lng, focus.lat],
      zoom: focus.zoom ?? 12,
      essential: true,
    });
  }, [focus]);

  return (
    <div
      className={clsx(
        "relative min-h-[320px] overflow-hidden rounded-2xl",
        className,
      )}
    >
      <div ref={containerRef} className="absolute inset-0 h-full w-full" />
      {isSki && (
        <div className="pointer-events-none absolute inset-x-0 top-4 z-10 flex justify-center px-4">
          <div className="max-w-md rounded-full bg-sky-600/90 px-4 py-1.5 text-center text-xs font-medium text-white shadow-lg backdrop-blur">
            Runs, lifts & resorts · downhill, cross-country, ski touring
          </div>
        </div>
      )}
    </div>
  );
}
