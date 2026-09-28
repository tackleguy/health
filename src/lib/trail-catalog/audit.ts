import type { CatalogTrail } from "./types";
import { mergeKey } from "./merge";
import { normalizeTrailName } from "./through-hikes";
import {
  QUALITY_RULES,
  assessTrail,
  findFragmentParents,
  measureLines,
  type Lines,
  type QualityFlag,
  type QualityRules,
  type QualityStatus,
} from "./quality";

export interface AuditInput {
  row: CatalogTrail;
  lines: Lines;
  /** Whole-trail length the source reports (Ontario), in miles. */
  reportedMiles?: number | null;
  /** Source-reported length of a single-section trail (USGS), in miles. */
  sectionReportedMiles?: number | null;
}

/** One flagged trail in the audit report: [id, name, region, source, miles, mappedMiles, status, flags, parentId]. */
export type AuditEntry = [string, string, string | null, string, number | null, number, QualityStatus, QualityFlag[], string | null];

export interface AuditReport {
  generatedAt: string;
  rules: QualityRules;
  total: number;
  byStatus: Record<QualityStatus, number>;
  byFlag: Partial<Record<QualityFlag, number>>;
  /** Trails whose stored distance disagreed with the recalculated mapped length before this audit. */
  storedDistanceChanged: number;
  missingElevation: number;
  missingRegion: number;
  lengthBuckets: { label: string; count: number }[];
  /** Fragments that were excluded before the catalog was published (below minimumTrailMiles). */
  excludedTooShort?: number;
  /** Duplicate source records (same id, or same name and geometry) removed at import. */
  duplicatesRemoved?: number;
  entries: AuditEntry[];
}

const BUCKETS: [string, number][] = [["< 100 m", 0.0621], ["100–500 m", 0.31], ["0.3–1 mi", 1], ["1–5 mi", 5], ["5–20 mi", 20], ["≥ 20 mi", Infinity]];

export const RECOMMENDED_ACTIONS: Record<QualityStatus, string> = {
  ok: "None",
  short: "Keep published as a short trail",
  review: "Check the geometry against the source record; keep the warning until confirmed",
  fragment: "Keep out of recommended hikes; link to the full trail, or confirm it is a standalone trail",
};

export function recommendedAction(status: QualityStatus, flags: QualityFlag[]) {
  if (flags.includes("fragment-of-longer-trail")) return "Link to the longer trail; join only if the source confirms the gap is continuous";
  if (flags.includes("incomplete-geometry")) return "Find the missing sections in the source or another authoritative dataset";
  return RECOMMENDED_ACTIONS[status];
}

/**
 * Runs the quality rules over a whole catalog. Writes `quality`, `flags`, `routeType`, `parentId` and
 * (when useful for debugging) `reportedMiles` onto each row, and returns the aggregate report.
 */
export function auditCatalog(items: AuditInput[], rules: QualityRules = QUALITY_RULES, now = new Date()): AuditReport {
  const nameCounts = new Map<string, number>();
  const regionKey = (row: CatalogTrail) => `${row.country}:${row.region ?? ""}:${normalizeTrailName(row.name)}`;
  for (const { row } of items) nameCounts.set(regionKey(row), (nameCounts.get(regionKey(row)) ?? 0) + 1);

  const parents = findFragmentParents(
    items.map(({ row, lines }) => {
      const key = row.kind === "route" ? null : mergeKey(row);
      return { id: row.id, key: key && !key.includes(":route-") ? key : null, miles: row.miles ?? 0, lines, bounds: key ? measureLines(lines).bounds : null };
    }),
    rules,
  );

  const byStatus: Record<QualityStatus, number> = { ok: 0, short: 0, review: 0, fragment: 0 };
  const byFlag: Partial<Record<QualityFlag, number>> = {};
  const counts = BUCKETS.map(() => 0);
  const entries: AuditEntry[] = [];
  let storedDistanceChanged = 0, missingRegion = 0;

  for (const item of items) {
    const { row, lines } = item;
    const result = assessTrail(row, lines, {
      parentId: parents.get(row.id) ?? null,
      sameNameInRegion: nameCounts.get(regionKey(row)),
      reportedMiles: item.reportedMiles,
      sectionReportedMiles: item.sectionReportedMiles,
      allowGaps: row.kind === "route",
    }, rules);
    row.quality = result.status;
    row.routeType = result.routeType ?? undefined;
    if (result.flags.length) row.flags = result.flags; else delete row.flags;
    const parentId = parents.get(row.id);
    if (parentId) row.parentId = parentId; else delete row.parentId;
    const reported = item.reportedMiles ?? item.sectionReportedMiles;
    if (reported != null && result.flags.some((f) => f === "incomplete-geometry" || f === "distance-mismatch")) row.reportedMiles = Math.round(reported * 1000) / 1000;
    else delete row.reportedMiles;

    if (row.miles !== null && row.distanceBasis === "geometry" && Math.abs(row.miles - result.mappedMiles) > Math.max(0.01, result.mappedMiles * 0.01)) storedDistanceChanged++;
    if (!row.region) missingRegion++;
    byStatus[result.status]++;
    for (const flag of result.flags) byFlag[flag] = (byFlag[flag] ?? 0) + 1;
    counts[BUCKETS.findIndex(([, max]) => (row.miles ?? 0) < max)]++;
    if (result.status !== "ok") {
      entries.push([row.id, row.name, row.region, row.source, row.miles, Math.round(result.mappedMiles * 1000) / 1000, result.status, result.flags, parentId ?? null]);
    }
  }

  return {
    generatedAt: now.toISOString(),
    rules,
    total: items.length,
    byStatus,
    byFlag,
    storedDistanceChanged,
    // No catalog source provides elevation; it is reported as missing rather than estimated.
    missingElevation: items.length,
    missingRegion,
    lengthBuckets: BUCKETS.map(([label], i) => ({ label, count: counts[i] })),
    entries,
  };
}
