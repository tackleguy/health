import type { ParsedRoute, RawTrailRecord } from "../types";
import { geoJsonLineString } from "./geojson";
import { haversineMeters } from "@/lib/gps";

export function parseGpxTrails(xml: string): RawTrailRecord[] {
  const routes = parseGpxRoute(xml);
  return routes.map((route) => ({
    name: route.name ?? "Imported GPX route",
    coordinates: route.coordinates,
    confidenceScore: "source_reported" as const,
    lengthMiles: route.distanceM / 1609.344,
    elevationGainFt: route.elevationGainFt,
    elevationLossFt: route.elevationLossFt,
  }));
}

export function parseGpxRoute(xml: string): ParsedRoute[] {
  const tracks: ParsedRoute[] = [];
  const trkBlocks = [...xml.matchAll(/<trk\b[^>]*>([\s\S]*?)<\/trk>/gi)];

  for (const [, block] of trkBlocks) {
    const nameMatch = block.match(/<name[^>]*>([\s\S]*?)<\/name>/i);
    const name = nameMatch?.[1]?.trim();
    const segBlocks = [...block.matchAll(/<trkseg\b[^>]*>([\s\S]*?)<\/trkseg>/gi)];

    for (const [, seg] of segBlocks) {
      const coordinates = parseTrkpts(seg);
      if (coordinates.length >= 2) {
        tracks.push(buildRoute(name, coordinates));
      }
    }
  }

  if (tracks.length === 0) {
    const rteBlocks = [...xml.matchAll(/<rte\b[^>]*>([\s\S]*?)<\/rte>/gi)];
    for (const [, block] of rteBlocks) {
      const nameMatch = block.match(/<name[^>]*>([\s\S]*?)<\/name>/i);
      const coordinates = parseTrkpts(block);
      if (coordinates.length >= 2) {
        tracks.push(buildRoute(nameMatch?.[1]?.trim(), coordinates));
      }
    }
  }

  return tracks;
}

function parseTrkpts(block: string): [number, number, number?][] {
  const points: [number, number, number?][] = [];
  const ptMatches = [...block.matchAll(/<trkpt\b[^>]*lat="([^"]+)"[^>]*lon="([^"]+)"[^>]*>([\s\S]*?)<\/trkpt>/gi)];

  for (const [, latStr, lonStr, inner] of ptMatches) {
    const lat = Number(latStr);
    const lon = Number(lonStr);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    const eleMatch = inner.match(/<ele[^>]*>([\s\S]*?)<\/ele>/i);
    const ele = eleMatch ? Number(eleMatch[1]) : undefined;
    points.push(ele != null && Number.isFinite(ele) ? [lon, lat, ele] : [lon, lat]);
  }

  return points;
}

function buildRoute(name: string | undefined, coordinates: [number, number, number?][]): ParsedRoute {
  let distanceM = 0;
  let elevationGainFt = 0;
  let elevationLossFt = 0;
  let highestPointM: number | undefined;
  let lowestPointM: number | undefined;

  for (let i = 1; i < coordinates.length; i++) {
    const prev = coordinates[i - 1];
    const curr = coordinates[i];
    distanceM += haversineMeters(prev[1], prev[0], curr[1], curr[0]);

    const prevEle = prev[2];
    const currEle = curr[2];
    if (prevEle != null && currEle != null) {
      const deltaFt = (currEle - prevEle) * 3.28084;
      if (deltaFt > 0) elevationGainFt += deltaFt;
      else elevationLossFt += Math.abs(deltaFt);
      highestPointM =
        highestPointM == null ? Math.max(prevEle, currEle) : Math.max(highestPointM, prevEle, currEle);
      lowestPointM =
        lowestPointM == null ? Math.min(prevEle, currEle) : Math.min(lowestPointM, prevEle, currEle);
    }
  }

  return {
    name,
    coordinates,
    geojson: geoJsonLineString(coordinates),
    distanceM,
    elevationGainFt: Math.round(elevationGainFt),
    elevationLossFt: Math.round(elevationLossFt),
    highestPointM,
    lowestPointM,
  };
}

export function parseKmlRoute(kml: string): ParsedRoute | null {
  const coordMatch = kml.match(/<coordinates[^>]*>([\s\S]*?)<\/coordinates>/i);
  if (!coordMatch) return null;

  const rawCoords = coordMatch[1]
    .trim()
    .split(/\s+/)
    .map((tuple) => {
      const [lng, lat, ele] = tuple.split(",").map(Number);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
      return ele != null && Number.isFinite(ele)
        ? ([lng, lat, ele] as [number, number, number?])
        : ([lng, lat] as [number, number, number?]);
    });

  const coordinates = rawCoords.filter((c) => c !== null) as [number, number, number?][];

  if (coordinates.length < 2) return null;
  const nameMatch = kml.match(/<name[^>]*>([\s\S]*?)<\/name>/i);
  return buildRoute(nameMatch?.[1]?.trim(), coordinates);
}

export function parseRouteFile(
  content: string,
  format: "gpx" | "kml" | "geojson",
): ParsedRoute | ParsedRoute[] | null {
  if (format === "gpx") {
    const routes = parseGpxRoute(content);
    if (routes.length === 0) return null;
    return routes.length === 1 ? routes[0] : routes;
  }
  if (format === "kml") {
    return parseKmlRoute(content);
  }
  if (format === "geojson") {
    const parsed = JSON.parse(content) as GeoJSON.Feature | GeoJSON.FeatureCollection;
    const feature =
      parsed.type === "FeatureCollection" ? parsed.features[0] : parsed;
    if (!feature?.geometry) return null;
    const coords =
      feature.geometry.type === "LineString"
        ? (feature.geometry.coordinates as [number, number, number?][])
        : feature.geometry.type === "MultiLineString"
          ? (feature.geometry.coordinates.flat() as [number, number, number?][])
          : [];
    if (coords.length < 2) return null;
    const name =
      typeof feature.properties?.name === "string" ? feature.properties.name : undefined;
    return buildRoute(name, coords);
  }
  return null;
}
