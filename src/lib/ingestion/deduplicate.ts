import type { MergeCandidate, NormalizedTrail } from "./types";
import { haversineMeters } from "@/lib/gps";

export interface ExistingTrailRef {
  id: string;
  name: string;
  lengthMiles: number;
  latitude: number;
  longitude: number;
  coordinates?: [number, number, number?][];
}

export interface DeduplicationOptions {
  nameSimilarityThreshold?: number;
  overlapThresholdMeters?: number;
  distanceDeltaMiles?: number;
}

const DEFAULTS: Required<DeduplicationOptions> = {
  nameSimilarityThreshold: 0.75,
  overlapThresholdMeters: 150,
  distanceDeltaMiles: 0.5,
};

export function nameSimilarity(a: string, b: string): number {
  const na = normalizeName(a);
  const nb = normalizeName(b);
  if (na === nb) return 1;
  if (na.includes(nb) || nb.includes(na)) return 0.9;

  const tokensA = new Set(na.split(" "));
  const tokensB = new Set(nb.split(" "));
  const intersection = [...tokensA].filter((t) => tokensB.has(t)).length;
  const union = new Set([...tokensA, ...tokensB]).size;
  return union === 0 ? 0 : intersection / union;
}

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function geographicOverlapScore(
  a: [number, number, number?][],
  b: [number, number, number?][],
  thresholdMeters: number,
): number {
  if (a.length === 0 || b.length === 0) return 0;

  let closePoints = 0;
  for (const [lngA, latA] of a) {
    let minDist = Infinity;
    for (const [lngB, latB] of b) {
      minDist = Math.min(minDist, haversineMeters(latA, lngA, latB, lngB));
    }
    if (minDist <= thresholdMeters) closePoints++;
  }

  return closePoints / a.length;
}

export function findMergeCandidates(
  incoming: NormalizedTrail,
  existing: ExistingTrailRef[],
  options?: DeduplicationOptions,
): MergeCandidate[] {
  const opts = { ...DEFAULTS, ...options };
  const candidates: MergeCandidate[] = [];

  for (const trail of existing) {
    const sim = nameSimilarity(incoming.name, trail.name);
    const distM = haversineMeters(
      incoming.startLatitude,
      incoming.startLongitude,
      trail.latitude,
      trail.longitude,
    );
    const distMi = distM / 1609.344;
    const overlap = incoming.coordinates
      ? geographicOverlapScore(
          incoming.coordinates,
          trail.coordinates ?? [[trail.longitude, trail.latitude]],
          opts.overlapThresholdMeters,
        )
      : distM <= opts.overlapThresholdMeters
        ? 1
        : 0;

    const lengthDelta =
      incoming.lengthMiles != null
        ? Math.abs(incoming.lengthMiles - trail.lengthMiles)
        : undefined;

    const isCandidate =
      (sim >= opts.nameSimilarityThreshold && distMi <= opts.distanceDeltaMiles) ||
      overlap >= 0.5;

    if (isCandidate) {
      candidates.push({
        trailAId: trail.id,
        trailBId: "incoming",
        overlapScore: overlap,
        nameSimilarity: sim,
        distanceDeltaMiles: lengthDelta,
      });
    }
  }

  return candidates;
}
