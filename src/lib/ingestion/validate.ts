import type { NormalizedTrail, RawTrailRecord, ValidationResult } from "./types";
import { haversineMeters } from "@/lib/gps";
import { geoJsonLineString } from "./parsers/geojson";

const MAX_SEGMENT_JUMP_M = 5000;
const MAX_REASONABLE_SPEED_MPS = 15;

export function validateTrailRecord(record: RawTrailRecord): ValidationResult {
  const issues: ValidationResult["issues"] = [];

  if (!record.name?.trim()) {
    issues.push({ field: "name", message: "Trail name is required", severity: "error" });
  }

  if (!record.coordinates || record.coordinates.length < 2) {
    issues.push({
      field: "coordinates",
      message: "At least two coordinate pairs required",
      severity: "error",
    });
    return { valid: false, issues };
  }

  for (const [lng, lat] of record.coordinates) {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      issues.push({
        field: "coordinates",
        message: "Invalid coordinate values",
        severity: "error",
      });
      break;
    }
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      issues.push({
        field: "coordinates",
        message: "Coordinates out of WGS84 bounds",
        severity: "error",
      });
      break;
    }
  }

  let totalM = 0;
  for (let i = 1; i < record.coordinates.length; i++) {
    const prev = record.coordinates[i - 1];
    const curr = record.coordinates[i];
    const segM = haversineMeters(prev[1], prev[0], curr[1], curr[0]);
    totalM += segM;
    if (segM > MAX_SEGMENT_JUMP_M) {
      issues.push({
        field: "coordinates",
        message: `Segment jump of ${Math.round(segM)}m exceeds ${MAX_SEGMENT_JUMP_M}m`,
        severity: "warning",
      });
    }
  }

  if (record.lengthMiles != null && totalM > 0) {
    const reportedM = record.lengthMiles * 1609.344;
    const ratio = Math.abs(reportedM - totalM) / totalM;
    if (ratio > 0.5) {
      issues.push({
        field: "lengthMiles",
        message: "Reported length differs significantly from geometry",
        severity: "warning",
      });
    }
  }

  if (totalM < 10) {
    issues.push({
      field: "coordinates",
      message: "Route shorter than 10 meters",
      severity: "warning",
    });
  }

  void MAX_REASONABLE_SPEED_MPS;

  return { valid: !issues.some((i) => i.severity === "error"), issues };
}

export function validateGeometry(geojson: GeoJSON.LineString): ValidationResult {
  return validateTrailRecord({
    name: "geometry",
    coordinates: geojson.coordinates as [number, number, number?][],
  });
}

export function normalizeTrail(record: RawTrailRecord): NormalizedTrail {
  const start = record.coordinates[0];
  const end = record.coordinates[record.coordinates.length - 1];

  let highestM: number | undefined;
  let lowestM: number | undefined;
  for (const [, , ele] of record.coordinates) {
    if (ele == null) continue;
    highestM = highestM == null ? ele : Math.max(highestM, ele);
    lowestM = lowestM == null ? ele : Math.min(lowestM, ele);
  }

  let lengthMiles = record.lengthMiles;
  if (lengthMiles == null) {
    let totalM = 0;
    for (let i = 1; i < record.coordinates.length; i++) {
      const prev = record.coordinates[i - 1];
      const curr = record.coordinates[i];
      totalM += haversineMeters(prev[1], prev[0], curr[1], curr[0]);
    }
    lengthMiles = totalM / 1609.344;
  }

  return {
    ...record,
    startLatitude: start[1],
    startLongitude: start[0],
    endLatitude: end[1],
    endLongitude: end[0],
    lengthMiles,
    highestPointFt:
      highestM != null ? Math.round(highestM * 3.28084) : undefined,
    lowestPointFt: lowestM != null ? Math.round(lowestM * 3.28084) : undefined,
    geojson: geoJsonLineString(record.coordinates),
    allowsHiking: record.allowsHiking ?? true,
    allowsBackpacking: record.allowsBackpacking ?? true,
    allowsBiking: record.allowsBiking ?? false,
    allowsHorseback: record.allowsHorseback ?? false,
    confidenceScore: record.confidenceScore ?? "source_reported",
  };
}
