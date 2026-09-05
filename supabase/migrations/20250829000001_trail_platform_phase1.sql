-- Trail Platform Phase 1: provenance, geometry, POIs, deduplication, spatial RPCs

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.confidence_level AS ENUM (
    'verified', 'source_reported', 'inferred', 'unknown'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.merge_candidate_status AS ENUM (
    'pending', 'approved', 'rejected', 'merged'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.import_status AS ENUM (
    'pending', 'running', 'completed', 'failed'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- Data sources (provenance)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.data_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_name TEXT NOT NULL,
  source_url TEXT,
  license TEXT NOT NULL,
  license_url TEXT,
  attribution TEXT NOT NULL,
  import_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  version TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS data_sources_name_idx ON public.data_sources (source_name);

-- ---------------------------------------------------------------------------
-- Canonical trails (deduplication target)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.canonical_trails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trail_name TEXT NOT NULL,
  description TEXT,
  difficulty TEXT CHECK (difficulty IN ('easy', 'moderate', 'hard')),
  length_miles DOUBLE PRECISION,
  elevation_gain_ft INTEGER,
  elevation_loss_ft INTEGER,
  highest_point_ft INTEGER,
  lowest_point_ft INTEGER,
  trail_type TEXT,
  surface TEXT,
  allows_hiking BOOLEAN NOT NULL DEFAULT true,
  allows_backpacking BOOLEAN NOT NULL DEFAULT true,
  allows_biking BOOLEAN NOT NULL DEFAULT false,
  allows_horseback BOOLEAN NOT NULL DEFAULT false,
  allows_dogs BOOLEAN,
  seasonal_information TEXT,
  official_source TEXT,
  confidence_score public.confidence_level NOT NULL DEFAULT 'unknown',
  geometry GEOGRAPHY(LINESTRING, 4326),
  start_latitude DOUBLE PRECISION,
  start_longitude DOUBLE PRECISION,
  end_latitude DOUBLE PRECISION,
  end_longitude DOUBLE PRECISION,
  merged_trail_id UUID REFERENCES public.trails(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS canonical_trails_geometry_idx
  ON public.canonical_trails USING GIST (geometry);
CREATE INDEX IF NOT EXISTS canonical_trails_name_idx
  ON public.canonical_trails USING gin (to_tsvector('english', trail_name));

-- ---------------------------------------------------------------------------
-- Extend existing trails table
-- ---------------------------------------------------------------------------
ALTER TABLE public.trails
  ADD COLUMN IF NOT EXISTS canonical_trail_id UUID REFERENCES public.canonical_trails(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS data_source_id UUID REFERENCES public.data_sources(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS geometry GEOGRAPHY(LINESTRING, 4326),
  ADD COLUMN IF NOT EXISTS start_latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS start_longitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS end_latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS end_longitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS elevation_loss_ft INTEGER,
  ADD COLUMN IF NOT EXISTS highest_point_ft INTEGER,
  ADD COLUMN IF NOT EXISTS lowest_point_ft INTEGER,
  ADD COLUMN IF NOT EXISTS trail_type TEXT,
  ADD COLUMN IF NOT EXISTS surface TEXT,
  ADD COLUMN IF NOT EXISTS allows_hiking BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS allows_backpacking BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS allows_biking BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS allows_horseback BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS allows_dogs BOOLEAN,
  ADD COLUMN IF NOT EXISTS seasonal_information TEXT,
  ADD COLUMN IF NOT EXISTS official_source TEXT,
  ADD COLUMN IF NOT EXISTS confidence_score public.confidence_level NOT NULL DEFAULT 'source_reported',
  ADD COLUMN IF NOT EXISTS source_external_id TEXT,
  ADD COLUMN IF NOT EXISTS elevation_profile JSONB;

CREATE INDEX IF NOT EXISTS trails_geometry_idx ON public.trails USING GIST (geometry);
CREATE INDEX IF NOT EXISTS trails_canonical_trail_id_idx ON public.trails (canonical_trail_id);
CREATE INDEX IF NOT EXISTS trails_data_source_id_idx ON public.trails (data_source_id);
CREATE INDEX IF NOT EXISTS trails_allows_dogs_idx ON public.trails (allows_dogs) WHERE allows_dogs IS NOT NULL;
CREATE INDEX IF NOT EXISTS trails_length_miles_idx ON public.trails (length_miles);
CREATE INDEX IF NOT EXISTS trails_elevation_ft_idx ON public.trails (elevation_ft);

-- ---------------------------------------------------------------------------
-- Source trail records (raw imports linked to canonical)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.trail_source_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_trail_id UUID REFERENCES public.canonical_trails(id) ON DELETE SET NULL,
  trail_id UUID REFERENCES public.trails(id) ON DELETE SET NULL,
  data_source_id UUID NOT NULL REFERENCES public.data_sources(id) ON DELETE CASCADE,
  external_id TEXT,
  raw_name TEXT NOT NULL,
  raw_properties JSONB NOT NULL DEFAULT '{}'::jsonb,
  raw_geometry GEOGRAPHY(GEOMETRY, 4326),
  confidence_score public.confidence_level NOT NULL DEFAULT 'source_reported',
  imported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS trail_source_records_canonical_idx
  ON public.trail_source_records (canonical_trail_id);
CREATE INDEX IF NOT EXISTS trail_source_records_source_idx
  ON public.trail_source_records (data_source_id);
CREATE INDEX IF NOT EXISTS trail_source_records_geometry_idx
  ON public.trail_source_records USING GIST (raw_geometry);

-- ---------------------------------------------------------------------------
-- Merge candidates (manual review — never auto-merge)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.merge_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trail_a_id UUID NOT NULL REFERENCES public.trails(id) ON DELETE CASCADE,
  trail_b_id UUID NOT NULL REFERENCES public.trails(id) ON DELETE CASCADE,
  canonical_trail_id UUID REFERENCES public.canonical_trails(id) ON DELETE SET NULL,
  overlap_score DOUBLE PRECISION NOT NULL,
  name_similarity DOUBLE PRECISION NOT NULL,
  distance_delta_miles DOUBLE PRECISION,
  status public.merge_candidate_status NOT NULL DEFAULT 'pending',
  notes TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (trail_a_id <> trail_b_id)
);

CREATE INDEX IF NOT EXISTS merge_candidates_status_idx ON public.merge_candidates (status);

-- ---------------------------------------------------------------------------
-- Trail segments
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.trail_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trail_id UUID NOT NULL REFERENCES public.trails(id) ON DELETE CASCADE,
  segment_index INTEGER NOT NULL,
  name TEXT,
  description TEXT,
  length_miles DOUBLE PRECISION,
  elevation_gain_ft INTEGER,
  geometry GEOGRAPHY(LINESTRING, 4326),
  confidence_score public.confidence_level NOT NULL DEFAULT 'source_reported',
  data_source_id UUID REFERENCES public.data_sources(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (trail_id, segment_index)
);

CREATE INDEX IF NOT EXISTS trail_segments_trail_id_idx ON public.trail_segments (trail_id);
CREATE INDEX IF NOT EXISTS trail_segments_geometry_idx ON public.trail_segments USING GIST (geometry);

-- ---------------------------------------------------------------------------
-- Trailheads
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.trailheads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trail_id UUID REFERENCES public.trails(id) ON DELETE SET NULL,
  park_id UUID REFERENCES public.parks(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  location GEOGRAPHY(POINT, 4326) GENERATED ALWAYS AS (
    ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography
  ) STORED,
  parking_info TEXT,
  fees TEXT,
  access_notes TEXT,
  restrooms BOOLEAN,
  accessibility_notes TEXT,
  data_source_id UUID REFERENCES public.data_sources(id) ON DELETE SET NULL,
  confidence_score public.confidence_level NOT NULL DEFAULT 'source_reported',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS trailheads_location_idx ON public.trailheads USING GIST (location);
CREATE INDEX IF NOT EXISTS trailheads_trail_id_idx ON public.trailheads (trail_id);

-- ---------------------------------------------------------------------------
-- Campsites, water sources, viewpoints
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.campsites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trail_id UUID REFERENCES public.trails(id) ON DELETE SET NULL,
  name TEXT,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  location GEOGRAPHY(POINT, 4326) GENERATED ALWAYS AS (
    ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography
  ) STORED,
  campsite_type TEXT,
  capacity INTEGER,
  amenities JSONB NOT NULL DEFAULT '{}'::jsonb,
  seasonal_information TEXT,
  data_source_id UUID REFERENCES public.data_sources(id) ON DELETE SET NULL,
  confidence_score public.confidence_level NOT NULL DEFAULT 'source_reported',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS campsites_location_idx ON public.campsites USING GIST (location);
CREATE INDEX IF NOT EXISTS campsites_trail_id_idx ON public.campsites (trail_id);

CREATE TABLE IF NOT EXISTS public.water_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trail_id UUID REFERENCES public.trails(id) ON DELETE SET NULL,
  name TEXT,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  location GEOGRAPHY(POINT, 4326) GENERATED ALWAYS AS (
    ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography
  ) STORED,
  water_type TEXT,
  seasonal_information TEXT,
  treatment_required BOOLEAN,
  data_source_id UUID REFERENCES public.data_sources(id) ON DELETE SET NULL,
  confidence_score public.confidence_level NOT NULL DEFAULT 'source_reported',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS water_sources_location_idx ON public.water_sources USING GIST (location);
CREATE INDEX IF NOT EXISTS water_sources_trail_id_idx ON public.water_sources (trail_id);

CREATE TABLE IF NOT EXISTS public.viewpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trail_id UUID REFERENCES public.trails(id) ON DELETE SET NULL,
  name TEXT,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  location GEOGRAPHY(POINT, 4326) GENERATED ALWAYS AS (
    ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography
  ) STORED,
  description TEXT,
  elevation_ft INTEGER,
  data_source_id UUID REFERENCES public.data_sources(id) ON DELETE SET NULL,
  confidence_score public.confidence_level NOT NULL DEFAULT 'source_reported',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS viewpoints_location_idx ON public.viewpoints USING GIST (location);
CREATE INDEX IF NOT EXISTS viewpoints_trail_id_idx ON public.viewpoints (trail_id);

-- ---------------------------------------------------------------------------
-- Protected areas
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.protected_areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  area_type TEXT NOT NULL,
  boundary GEOGRAPHY(MULTIPOLYGON, 4326),
  description TEXT,
  managing_agency TEXT,
  data_source_id UUID REFERENCES public.data_sources(id) ON DELETE SET NULL,
  confidence_score public.confidence_level NOT NULL DEFAULT 'source_reported',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS protected_areas_boundary_idx
  ON public.protected_areas USING GIST (boundary);
CREATE INDEX IF NOT EXISTS protected_areas_name_idx
  ON public.protected_areas USING gin (to_tsvector('english', name));

-- ---------------------------------------------------------------------------
-- Restrictions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.restrictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trail_id UUID REFERENCES public.trails(id) ON DELETE CASCADE,
  protected_area_id UUID REFERENCES public.protected_areas(id) ON DELETE CASCADE,
  restriction_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  effective_start DATE,
  effective_end DATE,
  permit_required BOOLEAN NOT NULL DEFAULT false,
  permit_url TEXT,
  data_source_id UUID REFERENCES public.data_sources(id) ON DELETE SET NULL,
  confidence_score public.confidence_level NOT NULL DEFAULT 'source_reported',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS restrictions_trail_id_idx ON public.restrictions (trail_id);
CREATE INDEX IF NOT EXISTS restrictions_area_id_idx ON public.restrictions (protected_area_id);

-- ---------------------------------------------------------------------------
-- Trail photos
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.trail_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trail_id UUID NOT NULL REFERENCES public.trails(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  caption TEXT,
  photographer TEXT,
  license TEXT NOT NULL,
  license_url TEXT,
  attribution TEXT NOT NULL,
  source_name TEXT NOT NULL,
  source_url TEXT,
  external_id TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  location GEOGRAPHY(POINT, 4326) GENERATED ALWAYS AS (
    CASE
      WHEN latitude IS NOT NULL AND longitude IS NOT NULL THEN
        ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography
      ELSE NULL
    END
  ) STORED,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_hero BOOLEAN NOT NULL DEFAULT false,
  is_disabled BOOLEAN NOT NULL DEFAULT false,
  disabled_reason TEXT,
  data_source_id UUID REFERENCES public.data_sources(id) ON DELETE SET NULL,
  confidence_score public.confidence_level NOT NULL DEFAULT 'source_reported',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS trail_photos_trail_id_idx ON public.trail_photos (trail_id);
CREATE INDEX IF NOT EXISTS trail_photos_location_idx ON public.trail_photos USING GIST (location);

-- ---------------------------------------------------------------------------
-- Import logs (admin)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.import_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data_source_id UUID REFERENCES public.data_sources(id) ON DELETE SET NULL,
  adapter_name TEXT NOT NULL,
  status public.import_status NOT NULL DEFAULT 'pending',
  records_processed INTEGER NOT NULL DEFAULT 0,
  records_stored INTEGER NOT NULL DEFAULT 0,
  records_failed INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS import_logs_status_idx ON public.import_logs (status);
CREATE INDEX IF NOT EXISTS import_logs_started_at_idx ON public.import_logs (started_at DESC);

-- ---------------------------------------------------------------------------
-- Helpers: GeoJSON <-> geography
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.geojson_to_geography_line(geojson JSONB)
RETURNS GEOGRAPHY
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT ST_GeogFromText(ST_AsText(ST_GeomFromGeoJSON(geojson::text)))::geography;
$$;

CREATE OR REPLACE FUNCTION public.geography_to_geojson(geom GEOGRAPHY)
RETURNS JSONB
LANGUAGE sql
STABLE
AS $$
  SELECT ST_AsGeoJSON(geom::geometry)::jsonb;
$$;

-- ---------------------------------------------------------------------------
-- Spatial RPCs
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.nearby_trails(
  p_lat DOUBLE PRECISION,
  p_lng DOUBLE PRECISION,
  p_radius_m DOUBLE PRECISION DEFAULT 50000,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  park_id UUID,
  trail_name TEXT,
  description TEXT,
  difficulty TEXT,
  length_miles DOUBLE PRECISION,
  elevation_ft INTEGER,
  duration TEXT,
  route_type TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  image_url TEXT,
  avg_rating NUMERIC,
  review_count INTEGER,
  geometry JSONB,
  allows_dogs BOOLEAN,
  confidence_score public.confidence_level,
  distance_m DOUBLE PRECISION
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    t.id,
    t.park_id,
    t.trail_name,
    t.description,
    t.difficulty,
    t.length_miles,
    t.elevation_ft,
    t.duration,
    t.route_type,
    t.latitude,
    t.longitude,
    t.image_url,
    t.avg_rating,
    t.review_count,
    public.geography_to_geojson(t.geometry) AS geometry,
    t.allows_dogs,
    t.confidence_score,
    ST_Distance(
      t.location,
      ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography
    ) AS distance_m
  FROM public.trails t
  WHERE ST_DWithin(
    t.location,
    ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
    p_radius_m
  )
  ORDER BY distance_m
  LIMIT GREATEST(p_limit, 1);
$$;

CREATE OR REPLACE FUNCTION public.trails_in_bbox(
  p_min_lng DOUBLE PRECISION,
  p_min_lat DOUBLE PRECISION,
  p_max_lng DOUBLE PRECISION,
  p_max_lat DOUBLE PRECISION,
  p_limit INTEGER DEFAULT 200
)
RETURNS TABLE (
  id UUID,
  trail_name TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  geometry JSONB,
  difficulty TEXT,
  length_miles DOUBLE PRECISION
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    t.id,
    t.trail_name,
    t.latitude,
    t.longitude,
    public.geography_to_geojson(t.geometry) AS geometry,
    t.difficulty,
    t.length_miles
  FROM public.trails t
  WHERE t.location && ST_MakeEnvelope(p_min_lng, p_min_lat, p_max_lng, p_max_lat, 4326)::geography
  LIMIT GREATEST(p_limit, 1);
$$;

CREATE OR REPLACE FUNCTION public.search_trails_filtered(
  p_query TEXT DEFAULT NULL,
  p_lat DOUBLE PRECISION DEFAULT NULL,
  p_lng DOUBLE PRECISION DEFAULT NULL,
  p_radius_m DOUBLE PRECISION DEFAULT NULL,
  p_difficulty TEXT DEFAULT NULL,
  p_min_length_miles DOUBLE PRECISION DEFAULT NULL,
  p_max_length_miles DOUBLE PRECISION DEFAULT NULL,
  p_min_elevation_ft INTEGER DEFAULT NULL,
  p_max_elevation_ft INTEGER DEFAULT NULL,
  p_dog_friendly BOOLEAN DEFAULT NULL,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  park_id UUID,
  trail_name TEXT,
  description TEXT,
  difficulty TEXT,
  length_miles DOUBLE PRECISION,
  elevation_ft INTEGER,
  duration TEXT,
  route_type TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  image_url TEXT,
  avg_rating NUMERIC,
  review_count INTEGER,
  geometry JSONB,
  allows_dogs BOOLEAN,
  confidence_score public.confidence_level,
  park_name TEXT,
  park_state TEXT,
  distance_m DOUBLE PRECISION
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    t.id,
    t.park_id,
    t.trail_name,
    t.description,
    t.difficulty,
    t.length_miles,
    t.elevation_ft,
    t.duration,
    t.route_type,
    t.latitude,
    t.longitude,
    t.image_url,
    t.avg_rating,
    t.review_count,
    public.geography_to_geojson(t.geometry) AS geometry,
    t.allows_dogs,
    t.confidence_score,
    p.park_name,
    p.state AS park_state,
    CASE
      WHEN p_lat IS NOT NULL AND p_lng IS NOT NULL THEN
        ST_Distance(t.location, ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography)
      ELSE NULL
    END AS distance_m
  FROM public.trails t
  JOIN public.parks p ON p.id = t.park_id
  WHERE
    (p_query IS NULL OR p_query = '' OR t.trail_name ILIKE '%' || p_query || '%'
      OR t.description ILIKE '%' || p_query || '%'
      OR p.park_name ILIKE '%' || p_query || '%')
    AND (p_difficulty IS NULL OR t.difficulty = p_difficulty)
    AND (p_min_length_miles IS NULL OR t.length_miles >= p_min_length_miles)
    AND (p_max_length_miles IS NULL OR t.length_miles <= p_max_length_miles)
    AND (p_min_elevation_ft IS NULL OR t.elevation_ft >= p_min_elevation_ft)
    AND (p_max_elevation_ft IS NULL OR t.elevation_ft <= p_max_elevation_ft)
    AND (p_dog_friendly IS NULL OR t.allows_dogs IS NOT DISTINCT FROM p_dog_friendly)
    AND (
      p_lat IS NULL OR p_lng IS NULL OR p_radius_m IS NULL OR
      ST_DWithin(
        t.location,
        ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
        p_radius_m
      )
    )
  ORDER BY
    CASE WHEN p_lat IS NOT NULL AND p_lng IS NOT NULL THEN distance_m END NULLS LAST,
    t.trail_name
  LIMIT GREATEST(p_limit, 1);
$$;

CREATE OR REPLACE FUNCTION public.trail_elevation_profile(p_trail_id UUID)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    t.elevation_profile,
    CASE
      WHEN t.geometry IS NOT NULL THEN
        (
          SELECT jsonb_agg(
            jsonb_build_object(
              'distance_m', dist,
              'elevation_m', ST_Z(pt::geometry)
            )
            ORDER BY dist
          )
          FROM (
            SELECT
              ST_LineLocatePoint(t.geometry::geometry, dp.geom) *
                ST_Length(t.geometry::geography) AS dist,
              dp.geom AS pt
            FROM ST_DumpPoints(t.geometry::geometry) dp
          ) pts
          WHERE ST_Z(pt::geometry) IS NOT NULL
        )
      ELSE NULL
    END
  )
  FROM public.trails t
  WHERE t.id = p_trail_id;
$$;

-- ---------------------------------------------------------------------------
-- RLS + grants
-- ---------------------------------------------------------------------------
ALTER TABLE public.data_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.canonical_trails ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trail_source_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merge_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trail_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trailheads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campsites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.water_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.viewpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.protected_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restrictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trail_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_logs ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.data_sources TO anon, authenticated;
GRANT SELECT ON public.canonical_trails TO anon, authenticated;
GRANT SELECT ON public.trail_source_records TO anon, authenticated;
GRANT SELECT ON public.merge_candidates TO anon, authenticated;
GRANT SELECT ON public.trail_segments TO anon, authenticated;
GRANT SELECT ON public.trailheads TO anon, authenticated;
GRANT SELECT ON public.campsites TO anon, authenticated;
GRANT SELECT ON public.water_sources TO anon, authenticated;
GRANT SELECT ON public.viewpoints TO anon, authenticated;
GRANT SELECT ON public.protected_areas TO anon, authenticated;
GRANT SELECT ON public.restrictions TO anon, authenticated;
GRANT SELECT ON public.trail_photos TO anon, authenticated;
GRANT SELECT ON public.import_logs TO anon, authenticated;

GRANT EXECUTE ON FUNCTION public.nearby_trails TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.trails_in_bbox TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.search_trails_filtered TO anon, authenticated;
CREATE OR REPLACE FUNCTION public.get_trail_detail(p_trail_id UUID)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'geometry', public.geography_to_geojson(t.geometry),
    'elevation_profile', t.elevation_profile,
    'start_latitude', t.start_latitude,
    'start_longitude', t.start_longitude,
    'end_latitude', t.end_latitude,
    'end_longitude', t.end_longitude,
    'elevation_loss_ft', t.elevation_loss_ft,
    'highest_point_ft', t.highest_point_ft,
    'lowest_point_ft', t.lowest_point_ft,
    'trail_type', t.trail_type,
    'surface', t.surface,
    'allows_hiking', t.allows_hiking,
    'allows_backpacking', t.allows_backpacking,
    'allows_biking', t.allows_biking,
    'allows_horseback', t.allows_horseback,
    'allows_dogs', t.allows_dogs,
    'seasonal_information', t.seasonal_information,
    'official_source', t.official_source,
    'confidence_score', t.confidence_score
  )
  FROM public.trails t
  WHERE t.id = p_trail_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_trail_detail TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.geography_to_geojson TO anon, authenticated;

DO $$ BEGIN
  CREATE POLICY "Data sources viewable" ON public.data_sources FOR SELECT TO anon, authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Canonical trails viewable" ON public.canonical_trails FOR SELECT TO anon, authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Trail source records viewable" ON public.trail_source_records FOR SELECT TO anon, authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Merge candidates viewable" ON public.merge_candidates FOR SELECT TO anon, authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Trail segments viewable" ON public.trail_segments FOR SELECT TO anon, authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Trailheads viewable" ON public.trailheads FOR SELECT TO anon, authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Campsites viewable" ON public.campsites FOR SELECT TO anon, authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Water sources viewable" ON public.water_sources FOR SELECT TO anon, authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Viewpoints viewable" ON public.viewpoints FOR SELECT TO anon, authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Protected areas viewable" ON public.protected_areas FOR SELECT TO anon, authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Restrictions viewable" ON public.restrictions FOR SELECT TO anon, authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Trail photos viewable" ON public.trail_photos FOR SELECT TO anon, authenticated USING (is_disabled = false);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Import logs viewable" ON public.import_logs FOR SELECT TO anon, authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
