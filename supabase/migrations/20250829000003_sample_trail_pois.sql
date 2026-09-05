-- Sample campsites and water sources for demo trails (development only)

INSERT INTO public.campsites (trail_id, name, latitude, longitude, campsite_type, capacity, seasonal_information, data_source_id, confidence_score)
SELECT
  'b0000000-0000-4000-8000-000000000010',
  'Little Yosemite Valley Camp',
  37.7328,
  -119.5589,
  'backcountry',
  60,
  'Permit required. Seasonal bear canister rules apply — check official NPS sources.',
  'c0000000-0000-4000-8000-000000000001',
  'source_reported'
WHERE EXISTS (SELECT 1 FROM public.trails WHERE id = 'b0000000-0000-4000-8000-000000000010');

INSERT INTO public.campsites (trail_id, name, latitude, longitude, campsite_type, capacity, seasonal_information, data_source_id, confidence_score)
SELECT
  'b0000000-0000-4000-8000-000000000010',
  'Clouds Rest Junction Bivy',
  37.7452,
  -119.5180,
  'dispersed',
  NULL,
  'No established facilities. Verify current regulations with NPS before camping.',
  'c0000000-0000-4000-8000-000000000001',
  'unknown'
WHERE EXISTS (SELECT 1 FROM public.trails WHERE id = 'b0000000-0000-4000-8000-000000000010');

INSERT INTO public.water_sources (trail_id, name, latitude, longitude, water_type, seasonal_information, treatment_required, data_source_id, confidence_score)
SELECT
  'b0000000-0000-4000-8000-000000000010',
  'Merced River (Happy Isles)',
  37.7315,
  -119.5585,
  'river',
  'Flow varies seasonally. Always treat before drinking.',
  true,
  'c0000000-0000-4000-8000-000000000001',
  'source_reported'
WHERE EXISTS (SELECT 1 FROM public.trails WHERE id = 'b0000000-0000-4000-8000-000000000010');

INSERT INTO public.water_sources (trail_id, name, latitude, longitude, water_type, seasonal_information, treatment_required, data_source_id, confidence_score)
SELECT
  'b0000000-0000-4000-8000-000000000010',
  'Vernal Fall (seasonal)',
  37.7275,
  -119.5438,
  'stream',
  'May be dry late season. Verify on trail.',
  true,
  'c0000000-0000-4000-8000-000000000001',
  'inferred'
WHERE EXISTS (SELECT 1 FROM public.trails WHERE id = 'b0000000-0000-4000-8000-000000000010');

INSERT INTO public.trailheads (trail_id, name, latitude, longitude, parking_info, fees, access_notes, restrooms, data_source_id, confidence_score)
SELECT
  'b0000000-0000-4000-8000-000000000001',
  'The Grotto Trailhead',
  37.2599,
  -112.9500,
  'Zion Canyon shuttle stop nearby.',
  'Park entrance fee required.',
  'Angels Landing permit may be required — check NPS for current rules.',
  true,
  'c0000000-0000-4000-8000-000000000001',
  'source_reported'
WHERE EXISTS (SELECT 1 FROM public.trails WHERE id = 'b0000000-0000-4000-8000-000000000001');
