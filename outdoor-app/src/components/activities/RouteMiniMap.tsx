"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { GeoLineString } from "@/lib/types";

const STYLE = "https://tiles.openfreemap.org/styles/positron";

interface RouteMiniMapProps {
  route: GeoLineString | null;
  className?: string;
}

export function RouteMiniMap({ route, className = "" }: RouteMiniMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    mapRef.current = new maplibregl.Map({
      container: containerRef.current,
      style: STYLE,
      center: [-98.5795, 39.8283],
      zoom: 10,
      interactive: false,
      attributionControl: false,
    });

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !route || route.coordinates.length < 2) return;

    const coords = route.coordinates.map((c) => [c[0], c[1]] as [number, number]);
    const feature = {
      type: "Feature" as const,
      properties: {},
      geometry: { type: "LineString" as const, coordinates: coords },
    };

    const addRoute = () => {
      if (map.getSource("route")) {
        (map.getSource("route") as maplibregl.GeoJSONSource).setData(feature);
      } else {
        map.addSource("route", { type: "geojson", data: feature });
        map.addLayer({
          id: "route-line",
          type: "line",
          source: "route",
          paint: { "line-color": "#059669", "line-width": 3 },
        });
      }

      const bounds = coords.reduce(
        (b, c) => b.extend(c),
        new maplibregl.LngLatBounds(coords[0], coords[0]),
      );
      map.fitBounds(bounds, { padding: 20, maxZoom: 14 });
    };

    if (map.isStyleLoaded()) addRoute();
    else map.once("load", addRoute);
  }, [route]);

  if (!route || route.coordinates.length < 2) {
    return (
      <div
        className={`flex items-center justify-center bg-stone-100 text-xs text-stone-400 ${className}`}
      >
        No route
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`overflow-hidden ${className}`} aria-hidden />
  );
}
