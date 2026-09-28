"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { GeoLineString } from "@/lib/types";

interface RouteMiniMapProps {
  route: GeoLineString | null;
  className?: string;
}

export function RouteMiniMap({ route, className = "" }: RouteMiniMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const lineRef = useRef<L.Polyline | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [39.8283, -98.5795],
      zoom: 10,
      zoomControl: false,
      attributionControl: false,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      boxZoom: false,
      keyboard: false,
    });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
    }).addTo(map);
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      lineRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !route || route.coordinates.length < 2) return;

    const latlngs = route.coordinates.map(
      ([lng, lat]) => [lat, lng] as L.LatLngExpression,
    );
    if (lineRef.current) {
      lineRef.current.setLatLngs(latlngs);
    } else {
      lineRef.current = L.polyline(latlngs, {
        color: "#059669",
        weight: 3,
      }).addTo(map);
    }
    map.fitBounds(L.latLngBounds(latlngs).pad(0.15), { maxZoom: 14 });
    map.invalidateSize();
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
    <div
      ref={containerRef}
      className={`overflow-hidden ${className}`}
      aria-hidden
    />
  );
}
