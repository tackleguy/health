
-- Expanded trail catalog (Yosemite, Bay Area, Rockies, Southwest, PNW, Smokies)
INSERT INTO public.parks (id, park_name, description, acreage, contact, country, state, latitude, longitude, image_url) VALUES
(
  'a0000000-0000-4000-8000-000000000004',
  'Yosemite National Park',
  'Iconic granite cliffs, waterfalls, and giant sequoias in California''s Sierra Nevada.',
  759620,
  '209-372-0200',
  'United States of America',
  'California',
  37.8651,
  -119.5383,
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80'
),
(
  'a0000000-0000-4000-8000-000000000005',
  'Golden Gate National Recreation Area',
  'Urban-adjacent coastal trails from the Marin Headlands to San Francisco.',
  82116,
  '415-561-4700',
  'United States of America',
  'California',
  37.8324,
  -122.4795,
  'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=1200&q=80'
),
(
  'a0000000-0000-4000-8000-000000000006',
  'Rocky Mountain National Park',
  'Alpine tundra, elk meadows, and 14,000 ft peaks in Colorado.',
  265461,
  '970-586-1206',
  'United States of America',
  'Colorado',
  40.3428,
  -105.6836,
  'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1200&q=80'
),
(
  'a0000000-0000-4000-8000-000000000007',
  'Grand Canyon National Park',
  'One of the world''s most spectacular canyon landscapes on the Colorado Plateau.',
  1201647,
  '928-638-7888',
  'United States of America',
  'Arizona',
  36.0544,
  -112.1401,
  'https://images.unsplash.com/photo-1474044159687-1ee9f3a51722?w=1200&q=80'
),
(
  'a0000000-0000-4000-8000-000000000008',
  'Great Smoky Mountains National Park',
  'Ancient mountains, diverse wildlife, and misty Appalachian forests.',
  522427,
  '865-436-1200',
  'United States of America',
  'Tennessee',
  35.6532,
  -83.5070,
  'https://images.unsplash.com/photo-1448375248136-8827089dd12f?w=1200&q=80'
),
(
  'a0000000-0000-4000-8000-000000000009',
  'Mount Rainier National Park',
  'Glaciated volcano, wildflower meadows, and old-growth forests in Washington.',
  236381,
  '360-569-2211',
  'United States of America',
  'Washington',
  46.8797,
  -121.7269,
  'https://images.unsplash.com/photo-1518173946687-a4c036bc253c?w=1200&q=80'
),
(
  'a0000000-0000-4000-8000-000000000010',
  'Joshua Tree National Park',
  'Mojave and Colorado desert ecosystems with iconic Joshua trees and boulder fields.',
  795156,
  '760-367-5500',
  'United States of America',
  'California',
  33.8734,
  -115.9010,
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.trails (id, park_id, trail_name, description, difficulty, length_miles, elevation_ft, duration, route_type, latitude, longitude, image_url) VALUES
-- Yosemite
('b0000000-0000-4000-8000-000000000010', 'a0000000-0000-4000-8000-000000000004', 'Half Dome Trail', 'Strenuous climb with cable section and panoramic valley views.', 'hard', 14.2, 4800, 'Est. 10h', 'Out & back', 37.7460, -119.5332, 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80'),
('b0000000-0000-4000-8000-000000000011', 'a0000000-0000-4000-8000-000000000004', 'Mist Trail to Vernal Fall', 'Classic waterfall hike on granite steps beside the Merced River.', 'moderate', 5.4, 2000, 'Est. 4h', 'Out & back', 37.7274, -119.5436, 'https://images.unsplash.com/photo-1518173946687-a4c036bc253c?w=1200&q=80'),
('b0000000-0000-4000-8000-000000000012', 'a0000000-0000-4000-8000-000000000004', 'Lower Yosemite Fall Trail', 'Easy paved walk to the base of North America''s tallest waterfall.', 'easy', 1.0, 50, 'Est. 30m', 'Loop', 37.7516, -119.5963, 'https://images.unsplash.com/photo-1474044159687-1ee9f3a51722?w=1200&q=80'),
('b0000000-0000-4000-8000-000000000013', 'a0000000-0000-4000-8000-000000000004', 'Four Mile Trail', 'Steep ascent from valley floor to Glacier Point.', 'hard', 4.8, 3200, 'Est. 4h', 'Out & back', 37.7317, -119.5738, 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1200&q=80'),
-- Golden Gate / Bay Area
('b0000000-0000-4000-8000-000000000014', 'a0000000-0000-4000-8000-000000000005', 'Matt Davis Trail', 'Coastal redwoods and ocean views on the way to Stinson Beach.', 'moderate', 7.2, 1600, 'Est. 3h 30m', 'Point to point', 37.8941, -122.5812, 'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=1200&q=80'),
('b0000000-0000-4000-8000-000000000015', 'a0000000-0000-4000-8000-000000000005', 'Lands End Trail', 'Clifftop walk above the Pacific with Golden Gate views.', 'easy', 3.4, 500, 'Est. 1h 30m', 'Out & back', 37.7849, -122.5058, 'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=1200&q=80'),
('b0000000-0000-4000-8000-000000000016', 'a0000000-0000-4000-8000-000000000005', 'Muir Woods Main Trail', 'Paved loop among old-growth coast redwoods.', 'easy', 2.0, 100, 'Est. 1h', 'Loop', 37.8914, -122.5811, 'https://images.unsplash.com/photo-1448375248136-8827089dd12f?w=1200&q=80'),
('b0000000-0000-4000-8000-000000000017', 'a0000000-0000-4000-8000-000000000005', 'Mount Tamalpais East Peak', 'Bay Area classic with 360° views from the summit.', 'moderate', 4.5, 1100, 'Est. 2h 30m', 'Out & back', 37.9235, -122.5805, 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1200&q=80'),
-- Rocky Mountain
('b0000000-0000-4000-8000-000000000018', 'a0000000-0000-4000-8000-000000000006', 'Emerald Lake Trail', 'Family-friendly alpine lakes beneath Tyndall Glacier.', 'easy', 3.6, 650, 'Est. 2h', 'Out & back', 40.3111, -105.6647, 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1200&q=80'),
('b0000000-0000-4000-8000-000000000019', 'a0000000-0000-4000-8000-000000000006', 'Sky Pond via Glacier Gorge', 'Iconic RMNP hike past Alberta Falls to an alpine tarn.', 'hard', 9.0, 1780, 'Est. 5h', 'Out & back', 40.2989, -105.6401, 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1200&q=80'),
('b0000000-0000-4000-8000-000000000020', 'a0000000-0000-4000-8000-000000000006', 'Bear Lake Loop', 'Short accessible loop at 9,450 ft elevation.', 'easy', 0.8, 45, 'Est. 30m', 'Loop', 40.3128, -105.6482, 'https://images.unsplash.com/photo-1518173946687-a4c036bc253c?w=1200&q=80'),
-- Grand Canyon
('b0000000-0000-4000-8000-000000000021', 'a0000000-0000-4000-8000-000000000007', 'Bright Angel Trail', 'Classic rim-to-river route on the South Rim.', 'hard', 12.0, 4380, 'Est. 8h', 'Out & back', 36.0573, -112.1430, 'https://images.unsplash.com/photo-1474044159687-1ee9f3a51722?w=1200&q=80'),
('b0000000-0000-4000-8000-000000000022', 'a0000000-0000-4000-8000-000000000007', 'South Kaibab to Ooh Aah Point', 'Dramatic canyon views with steep exposed ridgeline.', 'moderate', 1.8, 690, 'Est. 1h', 'Out & back', 36.0553, -112.0838, 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80'),
('b0000000-0000-4000-8000-000000000023', 'a0000000-0000-4000-8000-000000000007', 'Rim Trail – Mather Point', 'Paved rim walk with expansive canyon vistas.', 'easy', 2.5, 200, 'Est. 1h 15m', 'Out & back', 36.0617, -112.1099, 'https://images.unsplash.com/photo-1448375248136-8827089dd12f?w=1200&q=80'),
-- Smokies
('b0000000-0000-4000-8000-000000000024', 'a0000000-0000-4000-8000-000000000008', 'Alum Cave Trail to Mount LeConte', 'Popular Smokies summit route with cliff alcove and lodge.', 'hard', 11.0, 2763, 'Est. 6h', 'Out & back', 35.6234, -83.4512, 'https://images.unsplash.com/photo-1448375248136-8827089dd12f?w=1200&q=80'),
('b0000000-0000-4000-8000-000000000025', 'a0000000-0000-4000-8000-000000000008', 'Laurel Falls Trail', 'Paved waterfall hike suitable for families.', 'easy', 2.6, 314, 'Est. 1h 20m', 'Out & back', 35.6542, -83.6199, 'https://images.unsplash.com/photo-1518173946687-a4c036bc253c?w=1200&q=80'),
('b0000000-0000-4000-8000-000000000026', 'a0000000-0000-4000-8000-000000000008', 'Charlies Bunion via Appalachian Trail', 'Exposed rock outcrop with panoramic mountain views.', 'hard', 8.0, 1640, 'Est. 4h 30m', 'Out & back', 35.6289, -83.4055, 'https://images.unsplash.com/photo-1474044159687-1ee9f3a51722?w=1200&q=80'),
-- Mount Rainier
('b0000000-0000-4000-8000-000000000027', 'a0000000-0000-4000-8000-000000000009', 'Skyline Trail Loop', 'Wildflower meadows and glacier views from Paradise.', 'moderate', 5.5, 1450, 'Est. 3h', 'Loop', 46.7867, -121.7354, 'https://images.unsplash.com/photo-1518173946687-a4c036bc253c?w=1200&q=80'),
('b0000000-0000-4000-8000-000000000028', 'a0000000-0000-4000-8000-000000000009', 'Grove of the Patriarchs', 'Short walk to ancient hemlocks on an island in the Ohanapecosh.', 'easy', 1.5, 50, 'Est. 45m', 'Loop', 46.7551, -121.5555, 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1200&q=80'),
('b0000000-0000-4000-8000-000000000029', 'a0000000-0000-4000-8000-000000000009', 'Mount Fremont Lookout', 'Fire lookout with Rainier backdrop.', 'moderate', 5.6, 900, 'Est. 2h 30m', 'Out & back', 46.9153, -121.6432, 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1200&q=80'),
-- Joshua Tree
('b0000000-0000-4000-8000-000000000030', 'a0000000-0000-4000-8000-000000000010', 'Ryan Mountain Trail', '360° desert views from the park''s most popular summit.', 'moderate', 3.0, 1050, 'Est. 2h', 'Out & back', 33.9873, -116.1348, 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80'),
('b0000000-0000-4000-8000-000000000031', 'a0000000-0000-4000-8000-000000000010', 'Hidden Valley Nature Trail', 'Easy loop through iconic boulder formations.', 'easy', 1.0, 100, 'Est. 30m', 'Loop', 34.0122, -116.1686, 'https://images.unsplash.com/photo-1474044159687-1ee9f3a51722?w=1200&q=80')
ON CONFLICT (id) DO NOTHING;
