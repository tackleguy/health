-- Seed data ported from NotAllTrails
-- Run after migrations: psql or supabase db reset

TRUNCATE public.reviews, public.trails, public.parks RESTART IDENTITY CASCADE;

INSERT INTO public.parks (id, park_name, description, acreage, contact, country, state, latitude, longitude, image_url) VALUES
(
  'a0000000-0000-4000-8000-000000000001',
  'Zion National Park',
  'Zion National Park is a unique landscape with high cliffs, narrow gorges and a beautiful view. The park has many famous walks. Angels Landing is an intense switchback trail with truly spectacular views from the top of the canyon. Another famous hike is the unique Narrows "Trail", a very long hike through a river that lies between a steep gorge.',
  146597,
  '435-772-3256',
  'United States of America',
  'Utah',
  37.2982,
  -113.0263,
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80'
),
(
  'a0000000-0000-4000-8000-000000000002',
  'Acadia National Park',
  'Acadia National Park attracts more than two million visitors each year. With many different facilities and attractions in the park, there is something to interest everyone. Hiking and mountain biking are among the most popular activities in Acadia National Park.',
  49076,
  '207-288-3338',
  'United States of America',
  'Maine',
  44.3386,
  -68.2733,
  'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1200&q=80'
),
(
  'a0000000-0000-4000-8000-000000000003',
  'Shenandoah National Park',
  'Located along the Blue Ridge Mountains, Shenandoah National Park runs with the broad Shenandoah River, valleys, and rolling hills. Covered in forest, Skyline Drive and the famous Appalachian Trail run the entire length of this narrow park.',
  197439,
  '540-999-3500',
  'United States of America',
  'Virginia',
  38.4755,
  -78.4535,
  'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1200&q=80'
);

INSERT INTO public.trails (id, park_id, trail_name, description, difficulty, length_miles, elevation_ft, duration, route_type, latitude, longitude, image_url) VALUES
(
  'b0000000-0000-4000-8000-000000000001',
  'a0000000-0000-4000-8000-000000000001',
  'Angels Landing Trail',
  'Angels Landing Trail is a 4.4 mile heavily trafficked out and back trail located near Springdale, Utah that features a river and is rated as difficult. The technical route and incredible views of Zion Canyon make this hike the most popular in Zion.',
  'hard',
  4.4,
  1604,
  'Est. 2h 51m',
  'Out & back',
  37.2690,
  -112.9469,
  'https://images.unsplash.com/photo-1474044159687-1ee9f3a51722?w=1200&q=80'
),
(
  'b0000000-0000-4000-8000-000000000002',
  'a0000000-0000-4000-8000-000000000001',
  'Zion Canyon Overlook Trail',
  'Zion Canyon Overlook Trail is a 1 mile heavily trafficked out and back trail located near Springdale, Utah that features a cave and is rated as moderate. The Canyon Overlook Trail offers some of the most breathtaking views of Zion Canyon.',
  'moderate',
  1.0,
  187,
  'Est. 32m',
  'Out & back',
  37.2133,
  -112.9407,
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80'
),
(
  'b0000000-0000-4000-8000-000000000003',
  'a0000000-0000-4000-8000-000000000001',
  'Zion Narrows Bottom Up to Big Springs',
  'The Narrows is one of the most iconic day hikes in Zion National Park named for being the most narrow spot in Zion Canyon. As you hike through the blue water in the gorge, you will look up at rocky canyon walls a thousand feet tall.',
  'hard',
  8.9,
  695,
  'Est. 4h 3m',
  'Out & back',
  37.2849,
  -112.9479,
  'https://images.unsplash.com/photo-1518173946687-a4c036bc253c?w=1200&q=80'
),
(
  'b0000000-0000-4000-8000-000000000004',
  'a0000000-0000-4000-8000-000000000002',
  'The Beehive Loop Trail',
  'The Beehive Trail Loop is a must-do hike for all visitors to Acadia National Park. This popular loop offers incredible views, with some challenging rung and ladder sections.',
  'hard',
  1.5,
  508,
  'Est. 57m',
  'Loop',
  44.3333,
  -68.1885,
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80'
),
(
  'b0000000-0000-4000-8000-000000000005',
  'a0000000-0000-4000-8000-000000000002',
  'Ocean Path Trail',
  'Ocean Path Trail is a 4.5 mile heavily trafficked out and back trail located near Bar Harbor, Maine that features beautiful wild flowers and is good for all skill levels.',
  'easy',
  4.5,
  374,
  'Est. 2h 4m',
  'Out & back',
  44.3157,
  -68.1908,
  'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1200&q=80'
),
(
  'b0000000-0000-4000-8000-000000000006',
  'a0000000-0000-4000-8000-000000000002',
  'Jordan Pond Path',
  'Jordan Pond Path is a 3.1 mile heavily trafficked loop trail located near Mount Desert, Maine that features a lake and is rated as moderate.',
  'moderate',
  3.1,
  42,
  'Est. 1h 17m',
  'Loop',
  44.3341,
  -68.2571,
  'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1200&q=80'
),
(
  'b0000000-0000-4000-8000-000000000007',
  'a0000000-0000-4000-8000-000000000003',
  'Old Rag Mountain Loop',
  'Old Rag Mountain Loop is a 9.5 mile heavily trafficked loop trail located near Etlan, Virginia that features a river and is rated as difficult. One of the most popular hikes in Shenandoah National Park.',
  'hard',
  9.5,
  2683,
  'Est. 5h 38m',
  'Loop',
  38.5517,
  -78.3158,
  'https://images.unsplash.com/photo-1448375248136-8827089dd12f?w=1200&q=80'
),
(
  'b0000000-0000-4000-8000-000000000008',
  'a0000000-0000-4000-8000-000000000003',
  'Rose River Trail',
  'Rose River Trail is a 3.8 mile heavily trafficked loop trail located near Syria, Virginia that features a waterfall and is rated as moderate.',
  'moderate',
  3.8,
  875,
  'Est. 2h 7m',
  'Loop',
  38.5112,
  -78.3794,
  'https://images.unsplash.com/photo-1518173946687-a4c036bc253c?w=1200&q=80'
),
(
  'b0000000-0000-4000-8000-000000000009',
  'a0000000-0000-4000-8000-000000000003',
  'Bearfence Mountain Trail',
  'Bearfence Mountain Trail is a 1 mile heavily trafficked loop trail located near Hood, Virginia that features beautiful wild flowers and is rated as moderate.',
  'moderate',
  1.0,
  242,
  'Est. 34m',
  'Loop',
  38.4471,
  -78.4647,
  'https://images.unsplash.com/photo-1474044159687-1ee9f3a51722?w=1200&q=80'
);
