"use client";

import { useEffect, useRef, useState } from "react";
import * as maplibregl from "@/lib/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import type { MapMarker, MapMode, GeoLineString } from "@/lib/types";
import type { SkiFeatureSummary } from "@/lib/ski";
import {
  isOpenTrailMapClickableLayer,
  loadOpenTrailMapStyle,
  openTrailFeatureFromProperties,
  type OpenTrailFeatureSummary,
} from "@/lib/opentrailmap";
import clsx from "clsx";

const DEFAULT_CENTER: [number, number] = [-98.5795, 39.8283];
const DEFAULT_ZOOM = 4;

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
  routes?: GeoLineString[];
  center?: [number, number];
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
  onSkiFeatureClick,
  onOpenTrailFeatureClick,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const onGeolocateRef = useRef(onGeolocate);
  const onOpenTrailFeatureClickRef = useRef(onOpenTrailFeatureClick);
  const layerHandlersRef = useRef<
    Array<{
      layerId: string;
      onClick: (e: maplibregl.MapLayerMouseEvent) => void;
      onEnter: () => void;
      onLeave: () => void;
    }>
  >([]);
  const [mapError, setMapError] = useState<string | null>(null);

  const mapCenter = center ?? DEFAULT_CENTER;
  const mapZoom = zoom ?? DEFAULT_ZOOM;
  const isSki = mode === "ski";

  useEffect(() => {
    onGeolocateRef.current = onGeolocate;
  }, [onGeolocate]);

  useEffect(() => {
    onOpenTrailFeatureClickRef.current = onOpenTrailFeatureClick;
  }, [onOpenTrailFeatureClick]);

  useEffect(() => {
    if (!containerRef.current) return;

    let cancelled = false;
    setMapError(null);

    const clearLayerHandlers = (map: maplibregl.Map) => {
      for (const { layerId, onClick, onEnter, onLeave } of layerHandlersRef.current) {
        map.off("click", layerId, onClick);
        map.off("mouseenter", layerId, onEnter);
        map.off("mouseleave", layerId, onLeave);
      }
      layerHandlersRef.current = [];
    };

    const attachTrailHandlers = (map: maplibregl.Map) => {
      clearLayerHandlers(map);

      const layers = map.getStyle()?.layers ?? [];
      const clickableLayers = layers
        .filter((l) => isOpenTrailMapClickableLayer(l.id))
        .map((l) => l.id)
        .reverse();

      for (const layerId of clickableLayers) {
        const onClick = (e: maplibregl.MapLayerMouseEvent) => {
          const props = e.features?.[0]?.properties as
            | Record<string, unknown>
            | undefined;
          const lngLat = e.lngLat;
          if (!props || !lngLat) return;

          const feature = openTrailFeatureFromProperties(
            props,
            lngLat.lat,
            lngLat.lng,
          );
          if (feature) {
            onOpenTrailFeatureClickRef.current?.(feature);
            return;
          }

          // Legacy ski vector tiles (if ever re-enabled)
          const skiFeature = featureFromProperties(props, lngLat.lat, lngLat.lng);
          if (skiFeature) onSkiFeatureClick?.(skiFeature);
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

        layerHandlersRef.current.push({ layerId, onClick, onEnter, onLeave });
      }
    };

    async function initMap() {
      try {
        const style = await loadOpenTrailMapStyle(mode);
        if (cancelled || !containerRef.current) return;

        const map = new maplibregl.Map({
          container: containerRef.current,
          style,
          center: mapCenter,
          zoom: mapZoom,
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
          geo.on("geolocate", (e) => {
            onGeolocateRef.current?.(e.coords.latitude, e.coords.longitude);
          });
        }

        map.on("style.load", () => attachTrailHandlers(map));

        mapRef.current = map;

        const resizeObserver = new ResizeObserver(() => {
          map.resize();
        });
        resizeObserver.observe(containerRef.current);

        return () => {
          resizeObserver.disconnect();
          clearLayerHandlers(map);
          map.remove();
        };
      } catch (err) {
        if (!cancelled) {
          setMapError(
            err instanceof Error ? err.message : "Failed to load OpenTrailMap",
          );
        }
      }
    }

    let cleanup: (() => void) | undefined;
    initMap().then((fn) => {
      cleanup = fn;
    });

    return () => {
      cancelled = true;
      cleanup?.();
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || isSki) return;

    const sourceId = "trail-routes";
    const layerId = "trail-routes-line";

    const applyRoutes = () => {
      if (map.getLayer(layerId)) map.removeLayer(layerId);
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

      map.addLayer({
        id: layerId,
        type: "line",
        source: sourceId,
        paint: {
          "line-color": "#059669",
          "line-width": 4,
          "line-opacity": 0.85,
        },
        layout: {
          "line-cap": "round",
          "line-join": "round",
        },
      });

      if (fitToRoutes) {
        const bounds = new maplibregl.LngLatBounds();
        for (const route of routes) {
          for (const coord of route.coordinates) {
            bounds.extend([coord[0], coord[1]]);
          }
        }
        for (const marker of markers) {
          bounds.extend([marker.longitude, marker.latitude]);
        }
        if (!bounds.isEmpty()) {
          map.fitBounds(bounds, { padding: 48, maxZoom: 14 });
        }
      }
    };

    if (map.isStyleLoaded()) {
      applyRoutes();
    } else {
      map.once("load", applyRoutes);
    }
  }, [routes, fitToRoutes, markers, isSki]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || isSki) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    markers.forEach((marker) => {
      const el = document.createElement("button");
      el.type = "button";
      el.className = clsx(
        "flex min-w-[2rem] flex-col items-center gap-0.5 rounded-xl border-2 border-accent/30 px-2 py-1.5 text-center shadow-lg transition hover:scale-105",
        marker.type === "park"
          ? "bg-pine text-cream"
          : marker.type === "resort"
            ? "bg-accent text-forest"
            : marker.type === "trailhead"
              ? "bg-blue-700 text-cream"
              : "bg-surface-elevated text-cream",
      );

      const icon =
        marker.type === "park"
          ? "🏞"
          : marker.type === "resort"
            ? "⛷"
            : marker.type === "trailhead"
              ? "🅿️"
              : "🥾";

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
      {mapError && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-forest/90 p-6 text-center">
          <p className="text-sm text-mist">{mapError}</p>
        </div>
      )}
      <div className="pointer-events-none absolute inset-x-0 top-4 z-10 flex justify-center px-4">
        <div
          className={clsx(
            "max-w-md rounded-full px-4 py-1.5 text-center text-xs font-medium shadow-lg backdrop-blur",
            isSki
              ? "bg-accent/90 text-forest"
              : "bg-surface-elevated/90 text-cream border border-[var(--border)]",
          )}
        >
          {isSki
            ? "OpenTrailMap · cross-country ski trails from OpenStreetMap"
            : "OpenTrailMap · hiking trails from OpenStreetMap"}
        </div>
      </div>
    </div>
  );
}
