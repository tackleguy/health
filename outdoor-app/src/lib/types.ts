export type ActivityType = "run" | "hike" | "bike" | "ski";
export type ActivityStatus = "recording" | "completed";
export type Difficulty = "easy" | "moderate" | "hard";
export type MapMode = "trail" | "ski";

export interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  brief_bio: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Park {
  id: string;
  park_name: string;
  description: string;
  acreage: number;
  contact: string | null;
  country: string;
  state: string;
  latitude: number;
  longitude: number;
  image_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Trail {
  id: string;
  park_id: string;
  trail_name: string;
  description: string;
  difficulty: Difficulty;
  length_miles: number;
  elevation_ft: number;
  duration: string | null;
  route_type: string;
  latitude: number;
  longitude: number;
  image_url: string | null;
  avg_rating: number;
  review_count: number;
  created_at: string;
  updated_at: string;
  park?: Park;
}

export interface Review {
  id: string;
  trail_id: string;
  user_id: string;
  rating: number;
  body: string | null;
  review_date: string;
  created_at: string;
  updated_at: string;
  profile?: Profile;
}

export interface GeoLineString {
  type: "LineString";
  coordinates: [number, number, number?][];
}

export interface Activity {
  id: string;
  user_id: string;
  activity_type: ActivityType;
  status: ActivityStatus;
  title: string;
  distance_m: number;
  duration_sec: number;
  elevation_gain_ft: number;
  route_geojson: GeoLineString | null;
  trail_id: string | null;
  ski_area_id: string | null;
  ski_area_name: string | null;
  started_at: string;
  ended_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  trail?: Trail;
}

export interface GpsPoint {
  lat: number;
  lng: number;
  altitude: number | null;
  accuracy: number;
  speed: number | null;
  heading: number | null;
  timestamp: number;
}

export interface MapMarker {
  id: string;
  type: "park" | "trail" | "resort";
  name: string;
  latitude: number;
  longitude: number;
  subtitle?: string;
  href: string;
}

export interface SearchResult {
  id: string;
  type: "park" | "trail" | "resort";
  name: string;
  subtitle: string;
  href: string;
}

export const ACTIVITY_ICONS: Record<ActivityType, string> = {
  run: "🏃",
  hike: "🥾",
  bike: "🚴",
  ski: "⛷",
};

export const ACTIVITY_LABELS: Record<ActivityType, string> = {
  run: "Run",
  hike: "Hike",
  bike: "Bike",
  ski: "Ski",
};
