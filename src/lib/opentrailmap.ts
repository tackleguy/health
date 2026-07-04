import type { StyleSpecification } from "maplibre-gl";
import type { MapMode } from "@/lib/types";

/** OpenTrailMap static styles (MIT) — https://github.com/osmus/OpenTrailMap */
export const OPENTRAILMAP_ORIGIN =
  process.env.NEXT_PUBLIC_OPENTRAILMAP_URL ?? "https://opentrailmap.us";

export const OPENTRAILMAP_SPRITE = `${OPENTRAILMAP_ORIGIN}/style/sprites/opentrailmap`;

/** Static style filenames from vendor/opentrailmap scripts/buildStaticStyles.js */
export const OPENTRAILMAP_STYLE_BY_MODE: Record<MapMode, string> = {
  trail: `${OPENTRAILMAP_ORIGIN}/dist/styles/otm-foot.json`,
  ski: `${OPENTRAILMAP_ORIGIN}/dist/styles/otm-ski_nordic.json`,
};

export interface OpenTrailFeatureSummary {
  osmId: string;
  osmType: string;
  name: string;
  lat: number;
  lng: number;
  highway?: string;
  operator?: string;
  network?: string;
}

/** Layers with invisible hit targets for trail / POI clicks */
export const OPENTRAILMAP_CLICKABLE_LAYERS = [
  "trails-pointer-targets",
  "trail-pois",
  "major-trail-pois",
  "trail-centerpoints",
  "peaks",
] as const;

const styleCache = new Map<string, StyleSpecification>();

export async function loadOpenTrailMapStyle(
  mode: MapMode,
): Promise<StyleSpecification> {
  const url = OPENTRAILMAP_STYLE_BY_MODE[mode];
  const cached = styleCache.get(url);
  if (cached) return cached;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`OpenTrailMap style failed (${res.status}): ${url}`);
  }

  const style = (await res.json()) as StyleSpecification;
  style.sprite = OPENTRAILMAP_SPRITE;

  styleCache.set(url, style);
  return style;
}

export function isOpenTrailMapClickableLayer(layerId: string): boolean {
  return OPENTRAILMAP_CLICKABLE_LAYERS.some((id) => layerId === id);
}

export function openTrailFeatureFromProperties(
  props: Record<string, unknown> | null | undefined,
  lat: number,
  lng: number,
): OpenTrailFeatureSummary | null {
  if (!props) return null;

  const osmId = props.OSM_ID != null ? String(props.OSM_ID) : "";
  const osmType = props.OSM_TYPE != null ? String(props.OSM_TYPE) : "";

  if (!osmId || !osmType) return null;

  const name =
    (props.name != null && String(props.name)) ||
    (props.ref != null && String(props.ref)) ||
    (props.highway != null && `${String(props.highway)} trail`) ||
    "Unnamed trail";

  return {
    osmId,
    osmType,
    name,
    lat,
    lng,
    highway: props.highway != null ? String(props.highway) : undefined,
    operator: props.operator != null ? String(props.operator) : undefined,
    network: props.network != null ? String(props.network) : undefined,
  };
}

export function openTrailMapOsmUrl(feature: OpenTrailFeatureSummary): string {
  return `https://www.openstreetmap.org/${feature.osmType}/${feature.osmId}`;
}
