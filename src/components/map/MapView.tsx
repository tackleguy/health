"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { MapMarker, MapMode } from "@/lib/types";
import clsx from "clsx";

const TRAIL_STYLE = "https://tiles.openfreemap.org/styles/liberty";
const SKI_STYLE = "https://tiles.openfreemap.org/styles/positron";

interface MapViewProps {
  mode: MapMode;
  markers?: MapMarker[];
  center?: [number, number];
  zoom?: number;
  className?: string;
  geolocate?: boolean;
  fitToMarkers?: boolean;
  onMarkerClick?: (marker: MapMarker) => void;
  onGeolocate?: (lat: number, lng: number) => void;
}

export function MapView({
  mode,
  markers = [],
  center = [-98.5795, 39.8283],
  zoom = 3.5,
  className,
  geolocate = false,
  fitToMarkers = true,
  onMarkerClick,
  onGeolocate,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const onGeolocateRef = useRef(onGeolocate);

  useEffect(() => {
    onGeolocateRef.current = onGeolocate;
  }, [onGeolocate]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: mode === "trail" ? TRAIL_STYLE : SKI_STYLE,
      center,
      zoom,
      attributionControl: false,
    });

    map.addControl(new maplibregl.NavigationControl(), "top-right");
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
      map.on("load", () => geo.trigger());
      geo.on("geolocate", (e) => {
        onGeolocateRef.current?.(e.coords.latitude, e.coords.longitude);
      });
    }

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

    map.setStyle(mode === "trail" ? TRAIL_STYLE : SKI_STYLE);
  }, [mode]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    markers.forEach((marker) => {
      const el = document.createElement("button");
      el.type = "button";
      el.className = clsx(
        "flex min-w-[2rem] flex-col items-center gap-0.5 rounded-xl border-2 border-white px-2 py-1.5 text-center shadow-lg transition hover:scale-105",
        marker.type === "park" ? "bg-emerald-600 text-white" : "bg-white",
      );

      if (marker.type === "park") {
        el.innerHTML = `<span class="text-sm">🏞</span>`;
      } else {
        el.innerHTML = `
          <span class="text-sm">🥾</span>
          <span class="max-w-[72px] truncate text-[9px] font-semibold text-stone-800">${marker.name}</span>
          ${marker.subtitle ? `<span class="text-[9px] text-emerald-700">${marker.subtitle}</span>` : ""}
        `;
      }

      el.title = marker.name;
      el.setAttribute("aria-label", marker.name);

      el.addEventListener("click", (e) => {
        e.stopPropagation();
        onMarkerClick?.(marker);
      });

      const mapMarker = new maplibregl.Marker({ element: el, anchor: "bottom" })
        .setLngLat([marker.longitude, marker.latitude])
        .addTo(map);

      markersRef.current.push(mapMarker);
    });
  }, [markers, onMarkerClick]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !fitToMarkers || markers.length === 0) return;

    const bounds = new maplibregl.LngLatBounds();
    markers.forEach((m) => bounds.extend([m.longitude, m.latitude]));
    map.fitBounds(bounds, { padding: 60, maxZoom: 11 });
  }, [markers, fitToMarkers]);

  return (
    <div className={clsx("relative overflow-hidden rounded-2xl", className)}>
      <div ref={containerRef} className="h-full w-full" />
      {mode === "ski" && (
        <div className="pointer-events-none absolute inset-x-0 top-4 flex justify-center">
          <div className="rounded-full bg-sky-600/90 px-4 py-1.5 text-xs font-medium text-white shadow-lg backdrop-blur">
            Ski mode — search resorts at /explore/ski
          </div>
        </div>
      )}
    </div>
  );
}
