import type { GeoLineString } from "@/lib/types";
import clsx from "clsx";

interface RouteSparklineProps {
  route: GeoLineString | null;
  className?: string;
}

export function RouteSparkline({ route, className }: RouteSparklineProps) {
  if (!route || route.coordinates.length < 2) {
    return (
      <div
        className={clsx(
          "flex items-center justify-center rounded-full bg-surface-muted text-mist",
          className,
        )}
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5 opacity-40" fill="none" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l5.447 2.724A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
          />
        </svg>
      </div>
    );
  }

  const coords = route.coordinates;
  const lngs = coords.map((c) => c[0]);
  const lats = coords.map((c) => c[1]);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const rangeLng = maxLng - minLng || 0.001;
  const rangeLat = maxLat - minLat || 0.001;
  const pad = 8;

  const points = coords
    .map((c) => {
      const x = pad + ((c[0] - minLng) / rangeLng) * (100 - pad * 2);
      const y = pad + (1 - (c[1] - minLat) / rangeLat) * (100 - pad * 2);
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg
      viewBox="0 0 100 100"
      className={clsx("rounded-full bg-surface-muted text-accent", className)}
      aria-hidden
    >
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
