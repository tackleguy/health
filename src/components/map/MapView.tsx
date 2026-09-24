"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { MapMarker, MapMode, GeoLineString } from "@/lib/types";
import type { SkiFeatureSummary } from "@/lib/ski";
import type { OpenTrailFeatureSummary } from "@/lib/opentrailmap";
import clsx from "clsx";

const DEFAULT_CENTER: [number, number] = [39.8283, -98.5795]; // lat, lng for Leaflet
const DEFAULT_ZOOM = 4;

const OSM_TILES = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const OSM_ATTRIB =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

interface MapViewProps {
  mode: MapMode;
  markers?: MapMarker[];
  routes?: GeoLineString[];
  center?: [number, number]; // [lng, lat] — same as previous MapLibre API
  zoom?: number;
  className?: string;
  geolocate?: boolean;
  fitToMarkers?: boolean;
  fitToRoutes?: boolean;
  focus?: { lat: number; lng: number; zoom?: number } | null;
  onMarkerClick?: (marker: MapMarker) => void;
  onGeolocate?: (lat: number, lng: number) => void;
  onSkiFeatureClick?: (feature: SkiFeatureSummary) => void;
  onOpenTrailFeatureClick?: (feature: OpenTrailFeatureSummary) => void;
}

function markerIcon(type: MapMarker["type"]) {
  const color =
    type === "park"
      ? "#3d5a45"
      : type === "resort"
        ? "#c8f04a"
        : type === "trailhead"
          ? "#1d4ed8"
          : "#059669";
  return L.divIcon({
    className: "hikesync-leaflet-marker",
    html: `<span style="display:block;width:14px;height:14px;border-radius:9999px;background:${color};border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.35)"></span>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
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
  onMarkerClick,
  onGeolocate,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);
  const onMarkerClickRef = useRef(onMarkerClick);
  const onGeolocateRef = useRef(onGeolocate);
  const [mapError, setMapError] = useState<string | null>(null);

  useEffect(() => {
    onMarkerClickRef.current = onMarkerClick;
  }, [onMarkerClick]);

  useEffect(() => {
    onGeolocateRef.current = onGeolocate;
  }, [onGeolocate]);

  // Init map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    try {
      const startLatLng: L.LatLngExpression = center
        ? [center[1], center[0]]
        : DEFAULT_CENTER;

      const map = L.map(containerRef.current, {
        center: startLatLng,
        zoom: zoom ?? DEFAULT_ZOOM,
        zoomControl: true,
      });

      L.tileLayer(OSM_TILES, {
        attribution: OSM_ATTRIB,
        maxZoom: 19,
      }).addTo(map);

      layerGroupRef.current = L.layerGroup().addTo(map);
      mapRef.current = map;

      const onResize = () => map.invalidateSize();
      window.addEventListener("resize", onResize);
      const ro = new ResizeObserver(onResize);
      ro.observe(containerRef.current);

      return () => {
        window.removeEventListener("resize", onResize);
        ro.disconnect();
        map.remove();
        mapRef.current = null;
        layerGroupRef.current = null;
      };
    } catch (err) {
      setMapError(
        err instanceof Error ? err.message : "Failed to create map",
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Geolocate control
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !geolocate) return;

    const LocateControl = L.Control.extend({
      onAdd() {
        const btn = L.DomUtil.create(
          "button",
          "leaflet-bar leaflet-control hikesync-geo-btn",
        ) as HTMLButtonElement;
        btn.type = "button";
        btn.title = "Show my location";
        btn.setAttribute("aria-label", "Show my location");
        btn.innerHTML = "📍";
        btn.style.cssText =
          "width:34px;height:34px;cursor:pointer;background:#fff;border:none;font-size:16px;line-height:34px";
        L.DomEvent.disableClickPropagation(btn);
        btn.onclick = () => {
          if (!navigator.geolocation) return;
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              const { latitude, longitude } = pos.coords;
              map.setView([latitude, longitude], Math.max(map.getZoom(), 11));
              L.circleMarker([latitude, longitude], {
                radius: 7,
                color: "#fff",
                weight: 2,
                fillColor: "#2563eb",
                fillOpacity: 1,
              }).addTo(map);
              onGeolocateRef.current?.(latitude, longitude);
            },
            () => setMapError("Location permission denied"),
            { enableHighAccuracy: true, timeout: 12000 },
          );
        };
        return btn;
      },
    });

    const control = new LocateControl({ position: "topright" });
    control.addTo(map);
    return () => {
      control.remove();
    };
  }, [geolocate]);

  // Focus camera
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !focus) return;
    map.setView([focus.lat, focus.lng], focus.zoom ?? Math.max(map.getZoom(), 11));
  }, [focus]);

  // Markers + trail polylines
  useEffect(() => {
    const map = mapRef.current;
    const group = layerGroupRef.current;
    if (!map || !group) return;

    group.clearLayers();
    const bounds = L.latLngBounds([]);

    for (const route of routes) {
      const latlngs = route.coordinates.map(
        ([lng, lat]) => [lat, lng] as L.LatLngExpression,
      );
      if (latlngs.length < 2) continue;
      const line = L.polyline(latlngs, {
        color: mode === "ski" ? "#38bdf8" : "#059669",
        weight: 4,
        opacity: 0.9,
        lineJoin: "round",
        lineCap: "round",
      });
      group.addLayer(line);
      bounds.extend(line.getBounds());
    }

    for (const marker of markers) {
      const m = L.marker([marker.latitude, marker.longitude], {
        icon: markerIcon(marker.type),
        title: marker.name,
      });
      m.bindTooltip(
        `<strong>${marker.name}</strong>${
          marker.subtitle ? `<br/><span>${marker.subtitle}</span>` : ""
        }`,
        { direction: "top", opacity: 0.95 },
      );
      m.on("click", () => onMarkerClickRef.current?.(marker));
      group.addLayer(m);
      bounds.extend([marker.latitude, marker.longitude]);
    }

    if (bounds.isValid() && (fitToRoutes || fitToMarkers)) {
      const shouldFit =
        (fitToRoutes && routes.length > 0) ||
        (fitToMarkers && markers.length > 0 && !focus);
      if (shouldFit) {
        map.fitBounds(bounds.pad(0.12), { maxZoom: 14 });
      }
    }

    map.invalidateSize();
  }, [markers, routes, mode, fitToMarkers, fitToRoutes, focus]);

  return (
    <div
      className={clsx(
        "relative min-h-[320px] overflow-hidden rounded-2xl",
        className,
      )}
    >
      <div ref={containerRef} className="absolute inset-0 h-full w-full z-0" />
      <div className="pointer-events-none absolute inset-x-0 top-4 z-[500] flex justify-center px-4">
        <div className="max-w-md rounded-full border border-[var(--border)] bg-surface-elevated/90 px-4 py-1.5 text-center text-xs font-medium text-cream shadow-lg backdrop-blur">
          {mode === "ski"
            ? "Leaflet · ski areas & trails"
            : "Leaflet · hiking trails"}
        </div>
      </div>
      {mapError && (
        <div className="absolute inset-x-4 bottom-4 z-[500] rounded-xl border border-red-500/30 bg-red-950/80 px-4 py-2 text-sm text-red-100">
          {mapError}
        </div>
      )}
    </div>
  );
}
