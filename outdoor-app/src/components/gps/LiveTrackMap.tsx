"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { GpsPoint } from "@/lib/types";

const STYLE = "https://tiles.openfreemap.org/styles/liberty";

interface LiveTrackMapProps {
  points: GpsPoint[];
  heading?: number | null;
  className?: string;
}

export function LiveTrackMap({ points, heading = null, className = "" }: LiveTrackMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const userMarkerRef = useRef<maplibregl.Marker | null>(null);
  const readyRef = useRef(false);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: STYLE,
      center: [-98.5795, 39.8283],
      zoom: 14,
      attributionControl: false,
    });

    map.addControl(new maplibregl.NavigationControl(), "top-right");
    map.addControl(
      new maplibregl.GeolocateControl({ trackUserLocation: false, showAccuracyCircle: true }),
      "top-right",
    );

    map.on("load", () => {
      readyRef.current = true;

      map.addSource("live-track", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });

      map.addLayer({
        id: "live-track-glow",
        type: "line",
        source: "live-track",
        paint: { "line-color": "#059669", "line-width": 8, "line-opacity": 0.25 },
      });

      map.addLayer({
        id: "live-track-line",
        type: "line",
        source: "live-track",
        paint: { "line-color": "#059669", "line-width": 4 },
      });

      map.addSource("start-point", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });

      map.addLayer({
        id: "start-point-circle",
        type: "circle",
        source: "start-point",
        paint: {
          "circle-radius": 6,
          "circle-color": "#ffffff",
          "circle-stroke-width": 2,
          "circle-stroke-color": "#059669",
        },
      });
    });

    mapRef.current = map;

    return () => {
      userMarkerRef.current?.remove();
      map.remove();
      mapRef.current = null;
      readyRef.current = false;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !readyRef.current || points.length === 0) return;

    const coords: [number, number][] = points.map((p) => [p.lng, p.lat]);
    const last = points[points.length - 1];
    const first = points[0];

    const trackSource = map.getSource("live-track") as maplibregl.GeoJSONSource | undefined;
    trackSource?.setData({
      type: "Feature",
      properties: {},
      geometry: { type: "LineString", coordinates: coords },
    });

    const startSource = map.getSource("start-point") as maplibregl.GeoJSONSource | undefined;
    startSource?.setData({
      type: "Feature",
      properties: {},
      geometry: { type: "Point", coordinates: [first.lng, first.lat] },
    });

    if (!userMarkerRef.current) {
      const el = document.createElement("div");
      el.className = "relative h-5 w-5";
      el.innerHTML = `
        <div class="absolute inset-0 rounded-full bg-emerald-500 opacity-30 animate-ping"></div>
        <div class="absolute inset-0.5 rounded-full border-2 border-white bg-emerald-600 shadow-lg"></div>
      `;
      userMarkerRef.current = new maplibregl.Marker({ element: el, rotationAlignment: "map" })
        .setLngLat([last.lng, last.lat])
        .addTo(map);
    } else {
      userMarkerRef.current.setLngLat([last.lng, last.lat]);
    }

    if (heading !== null) {
      userMarkerRef.current.setRotation(heading);
    }

    map.easeTo({
      center: [last.lng, last.lat],
      zoom: Math.max(map.getZoom(), 15),
      duration: 500,
    });
  }, [points, heading]);

  return (
    <div className={`relative overflow-hidden rounded-xl bg-stone-800 ${className}`}>
      <div ref={containerRef} className="h-full w-full" />
      {points.length === 0 && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-stone-900/40 text-sm text-white">
          Map loads when GPS starts
        </div>
      )}
      {points.length > 0 && (
        <div className="pointer-events-none absolute bottom-2 left-2 rounded-lg bg-black/50 px-2 py-1 text-[10px] font-medium text-white backdrop-blur">
          {points.length} pts · live track
        </div>
      )}
    </div>
  );
}
