export type ConfidenceLevel =
  | "verified"
  | "source_reported"
  | "inferred"
  | "unknown";

export type MergeCandidateStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "merged";

export type ImportStatus = "pending" | "running" | "completed" | "failed";

export interface DataSourceConfig {
  id?: string;
  sourceName: string;
  sourceUrl?: string;
  license: string;
  licenseUrl?: string;
  attribution: string;
  version?: string;
}

export interface SourceAdapterConfig extends DataSourceConfig {
  adapter: string;
  enabled?: boolean;
  options?: Record<string, unknown>;
}

export interface IngestionConfig {
  sources: SourceAdapterConfig[];
  deduplication?: {
    nameSimilarityThreshold?: number;
    overlapThresholdMeters?: number;
    distanceDeltaMiles?: number;
  };
  photoMatching?: {
    maxDistanceMeters?: number;
  };
}

export interface RawTrailRecord {
  externalId?: string;
  name: string;
  description?: string;
  difficulty?: "easy" | "moderate" | "hard";
  lengthMiles?: number;
  elevationGainFt?: number;
  elevationLossFt?: number;
  routeType?: string;
  trailType?: string;
  surface?: string;
  allowsHiking?: boolean;
  allowsBackpacking?: boolean;
  allowsBiking?: boolean;
  allowsHorseback?: boolean;
  allowsDogs?: boolean;
  seasonalInformation?: string;
  officialSource?: string;
  confidenceScore?: ConfidenceLevel;
  coordinates: [number, number, number?][];
  properties?: Record<string, unknown>;
}

export interface NormalizedTrail extends RawTrailRecord {
  startLatitude: number;
  startLongitude: number;
  endLatitude: number;
  endLongitude: number;
  highestPointFt?: number;
  lowestPointFt?: number;
  geojson: GeoJSON.LineString;
}

export interface ValidationIssue {
  field: string;
  message: string;
  severity: "error" | "warning";
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
}

export interface MergeCandidate {
  trailAId: string;
  trailBId: string;
  overlapScore: number;
  nameSimilarity: number;
  distanceDeltaMiles?: number;
}

export interface ImportResult {
  processed: number;
  stored: number;
  failed: number;
  errors: string[];
  mergeCandidates: MergeCandidate[];
}

export interface ParsedRoute {
  name?: string;
  coordinates: [number, number, number?][];
  geojson: GeoJSON.LineString;
  distanceM: number;
  elevationGainFt: number;
  elevationLossFt: number;
  highestPointM?: number;
  lowestPointM?: number;
}

export interface TrailPhotoRecord {
  url: string;
  thumbnailUrl?: string;
  caption?: string;
  photographer?: string;
  license: string;
  licenseUrl?: string;
  attribution: string;
  sourceName: string;
  sourceUrl?: string;
  externalId?: string;
  latitude?: number;
  longitude?: number;
}
