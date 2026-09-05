-- Sample trail geometries for Phase 1 demo (simplified polylines near trailhead points)
-- License: synthetic demo data for development only

INSERT INTO public.data_sources (id, source_name, source_url, license, license_url, attribution, version)
VALUES (
  'c0000000-0000-4000-8000-000000000001',
  'Outdoor OS Demo Geometries',
  NULL,
  'Public Domain',
  NULL,
  'Synthetic demo polylines for local development',
  '2025-08-29'
)
ON CONFLICT (id) DO NOTHING;

-- Angels Landing (Zion) — simplified out-and-back
UPDATE public.trails SET
  data_source_id = 'c0000000-0000-4000-8000-000000000001',
  start_latitude = 37.2695,
  start_longitude = -112.9478,
  end_latitude = 37.2697,
  end_longitude = -112.9407,
  allows_dogs = false,
  confidence_score = 'inferred',
  geometry = ST_GeogFromText(
    'LINESTRING(-112.9478 37.2695, -112.9450 37.2680, -112.9425 37.2670, -112.9407 37.2697, -112.9425 37.2670, -112.9450 37.2680, -112.9478 37.2695)'
  ),
  elevation_profile = '[
    {"distance_m": 0, "elevation_m": 1480},
    {"distance_m": 800, "elevation_m": 1550},
    {"distance_m": 1600, "elevation_m": 1680},
    {"distance_m": 3200, "elevation_m": 1760},
    {"distance_m": 4800, "elevation_m": 1760},
    {"distance_m": 6400, "elevation_m": 1680},
    {"distance_m": 7000, "elevation_m": 1480}
  ]'::jsonb
WHERE id = 'b0000000-0000-4000-8000-000000000001';

-- Half Dome (Yosemite)
UPDATE public.trails SET
  data_source_id = 'c0000000-0000-4000-8000-000000000001',
  start_latitude = 37.7460,
  start_longitude = -119.5930,
  end_latitude = 37.7459,
  end_longitude = -119.5332,
  allows_dogs = false,
  confidence_score = 'inferred',
  geometry = ST_GeogFromText(
    'LINESTRING(-119.5930 37.7460, -119.5750 37.7450, -119.5550 37.7445, -119.5400 37.7455, -119.5332 37.7459, -119.5400 37.7455, -119.5550 37.7445, -119.5750 37.7450, -119.5930 37.7460)'
  ),
  elevation_profile = '[
    {"distance_m": 0, "elevation_m": 1200},
    {"distance_m": 3000, "elevation_m": 1800},
    {"distance_m": 6000, "elevation_m": 2400},
    {"distance_m": 9000, "elevation_m": 2600},
    {"distance_m": 12000, "elevation_m": 2700},
    {"distance_m": 15000, "elevation_m": 2600},
    {"distance_m": 18000, "elevation_m": 2400},
    {"distance_m": 22000, "elevation_m": 1200}
  ]'::jsonb
WHERE id = 'b0000000-0000-4000-8000-000000000010';

-- Lands End (Golden Gate)
UPDATE public.trails SET
  data_source_id = 'c0000000-0000-4000-8000-000000000001',
  start_latitude = 37.7849,
  start_longitude = -122.5058,
  end_latitude = 37.7875,
  end_longitude = -122.5105,
  allows_dogs = true,
  confidence_score = 'inferred',
  geometry = ST_GeogFromText(
    'LINESTRING(-122.5058 37.7849, -122.5075 37.7858, -122.5090 37.7868, -122.5105 37.7875, -122.5090 37.7868, -122.5075 37.7858, -122.5058 37.7849)'
  ),
  elevation_profile = '[
    {"distance_m": 0, "elevation_m": 30},
    {"distance_m": 800, "elevation_m": 45},
    {"distance_m": 1600, "elevation_m": 60},
    {"distance_m": 2400, "elevation_m": 55},
    {"distance_m": 3200, "elevation_m": 35},
    {"distance_m": 4000, "elevation_m": 30}
  ]'::jsonb
WHERE id = 'b0000000-0000-4000-8000-000000000015';

-- Emerald Lake (Rocky Mountain)
UPDATE public.trails SET
  data_source_id = 'c0000000-0000-4000-8000-000000000001',
  start_latitude = 40.3111,
  start_longitude = -105.6647,
  end_latitude = 40.3125,
  end_longitude = -105.6550,
  allows_dogs = false,
  confidence_score = 'inferred',
  geometry = ST_GeogFromText(
    'LINESTRING(-105.6647 40.3111, -105.6620 40.3118, -105.6585 40.3122, -105.6550 40.3125, -105.6585 40.3122, -105.6620 40.3118, -105.6647 40.3111)'
  ),
  elevation_profile = '[
    {"distance_m": 0, "elevation_m": 2880},
    {"distance_m": 1000, "elevation_m": 2920},
    {"distance_m": 2000, "elevation_m": 2960},
    {"distance_m": 3000, "elevation_m": 2980},
    {"distance_m": 4000, "elevation_m": 2960},
    {"distance_m": 5000, "elevation_m": 2880}
  ]'::jsonb
WHERE id = 'b0000000-0000-4000-8000-000000000018';

-- Sample trailhead
INSERT INTO public.trailheads (trail_id, name, latitude, longitude, parking_info, fees, access_notes, restrooms, data_source_id, confidence_score)
SELECT
  'b0000000-0000-4000-8000-000000000010',
  'Happy Isles Trailhead',
  37.7317,
  -119.5583,
  'Limited parking; arrive early or use shuttle.',
  'Park entrance fee required.',
  'Shuttle service typically required during peak season.',
  true,
  'c0000000-0000-4000-8000-000000000001',
  'source_reported'
WHERE EXISTS (SELECT 1 FROM public.trails WHERE id = 'b0000000-0000-4000-8000-000000000010');
