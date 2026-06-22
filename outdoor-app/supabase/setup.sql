-- Outdoor OS: full setup (run once in Supabase SQL Editor)
-- Dashboard → SQL → New query → paste all → Run

-- ============ SCHEMA ============

CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  brief_bio TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.parks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  park_name TEXT NOT NULL,
  description TEXT NOT NULL,
  acreage INTEGER NOT NULL,
  contact TEXT,
  country TEXT NOT NULL,
  state TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  location GEOGRAPHY(POINT, 4326) GENERATED ALWAYS AS (
    ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography
  ) STORED,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX parks_location_idx ON public.parks USING GIST (location);
CREATE INDEX parks_name_idx ON public.parks USING gin (to_tsvector('english', park_name));

CREATE TABLE public.trails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  park_id UUID NOT NULL REFERENCES public.parks(id) ON DELETE CASCADE,
  trail_name TEXT NOT NULL,
  description TEXT NOT NULL,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'moderate', 'hard')),
  length_miles DOUBLE PRECISION NOT NULL,
  elevation_ft INTEGER NOT NULL,
  duration TEXT,
  route_type TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  location GEOGRAPHY(POINT, 4326) GENERATED ALWAYS AS (
    ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography
  ) STORED,
  image_url TEXT,
  avg_rating NUMERIC(3, 2) NOT NULL DEFAULT 0,
  review_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX trails_park_id_idx ON public.trails(park_id);
CREATE INDEX trails_location_idx ON public.trails USING GIST (location);
CREATE INDEX trails_name_idx ON public.trails USING gin (to_tsvector('english', trail_name));
CREATE INDEX trails_difficulty_idx ON public.trails(difficulty);

CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trail_id UUID NOT NULL REFERENCES public.trails(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  body TEXT,
  review_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (trail_id, user_id)
);

CREATE INDEX reviews_trail_id_idx ON public.reviews(trail_id);
CREATE INDEX reviews_user_id_idx ON public.reviews(user_id);

CREATE OR REPLACE FUNCTION public.refresh_trail_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_trail_id UUID;
BEGIN
  target_trail_id := COALESCE(NEW.trail_id, OLD.trail_id);
  UPDATE public.trails t
  SET
    avg_rating = COALESCE((SELECT ROUND(AVG(r.rating)::numeric, 2) FROM public.reviews r WHERE r.trail_id = target_trail_id), 0),
    review_count = (SELECT COUNT(*)::integer FROM public.reviews r WHERE r.trail_id = target_trail_id),
    updated_at = now()
  WHERE t.id = target_trail_id;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER reviews_rating_refresh
AFTER INSERT OR UPDATE OR DELETE ON public.reviews
FOR EACH ROW EXECUTE FUNCTION public.refresh_trail_rating();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', 'Adventurer'),
    COALESCE(NEW.raw_user_meta_data->>'last_name', '')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trails ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON public.parks TO anon, authenticated;
GRANT SELECT ON public.trails TO anon, authenticated;
GRANT SELECT ON public.reviews TO anon, authenticated;
GRANT SELECT ON public.profiles TO anon, authenticated;
GRANT INSERT, UPDATE ON public.profiles TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.reviews TO authenticated;

CREATE POLICY "Parks are viewable by everyone" ON public.parks FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Trails are viewable by everyone" ON public.trails FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Reviews are viewable by everyone" ON public.reviews FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Authenticated users can create reviews" ON public.reviews FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own reviews" ON public.reviews FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own reviews" ON public.reviews FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============ SEED DATA ============

INSERT INTO public.parks (id, park_name, description, acreage, contact, country, state, latitude, longitude, image_url) VALUES
('a0000000-0000-4000-8000-000000000001', 'Zion National Park', 'Zion National Park is a unique landscape with high cliffs, narrow gorges and a beautiful view.', 146597, '435-772-3256', 'United States of America', 'Utah', 37.2982, -113.0263, 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80'),
('a0000000-0000-4000-8000-000000000002', 'Acadia National Park', 'Acadia National Park attracts more than two million visitors each year.', 49076, '207-288-3338', 'United States of America', 'Maine', 44.3386, -68.2733, 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1200&q=80'),
('a0000000-0000-4000-8000-000000000003', 'Shenandoah National Park', 'Located along the Blue Ridge Mountains with Skyline Drive and the Appalachian Trail.', 197439, '540-999-3500', 'United States of America', 'Virginia', 38.4755, -78.4535, 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1200&q=80');

INSERT INTO public.trails (id, park_id, trail_name, description, difficulty, length_miles, elevation_ft, duration, route_type, latitude, longitude, image_url) VALUES
('b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Angels Landing Trail', 'A 4.4 mile out and back trail rated as difficult with incredible views of Zion Canyon.', 'hard', 4.4, 1604, 'Est. 2h 51m', 'Out & back', 37.2690, -112.9469, 'https://images.unsplash.com/photo-1474044159687-1ee9f3a51722?w=1200&q=80'),
('b0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 'Zion Canyon Overlook Trail', 'A 1 mile moderate trail with breathtaking views of Zion Canyon.', 'moderate', 1.0, 187, 'Est. 32m', 'Out & back', 37.2133, -112.9407, 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80'),
('b0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001', 'Zion Narrows Bottom Up to Big Springs', 'Iconic hike through the narrowest part of Zion Canyon along the Virgin River.', 'hard', 8.9, 695, 'Est. 4h 3m', 'Out & back', 37.2849, -112.9479, 'https://images.unsplash.com/photo-1518173946687-a4c036bc253c?w=1200&q=80'),
('b0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000002', 'The Beehive Loop Trail', 'A must-do Acadia loop with rung and ladder sections and incredible views.', 'hard', 1.5, 508, 'Est. 57m', 'Loop', 44.3333, -68.1885, 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80'),
('b0000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000002', 'Ocean Path Trail', 'Easy 4.5 mile coastal walk with wildflowers and ocean views.', 'easy', 4.5, 374, 'Est. 2h 4m', 'Out & back', 44.3157, -68.1908, 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1200&q=80'),
('b0000000-0000-4000-8000-000000000006', 'a0000000-0000-4000-8000-000000000002', 'Jordan Pond Path', 'Moderate 3.1 mile loop around Jordan Pond.', 'moderate', 3.1, 42, 'Est. 1h 17m', 'Loop', 44.3341, -68.2571, 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1200&q=80'),
('b0000000-0000-4000-8000-000000000007', 'a0000000-0000-4000-8000-000000000003', 'Old Rag Mountain Loop', 'Challenging 9.5 mile loop, one of Shenandoah''s most popular hikes.', 'hard', 9.5, 2683, 'Est. 5h 38m', 'Loop', 38.5517, -78.3158, 'https://images.unsplash.com/photo-1448375248136-8827089dd12f?w=1200&q=80'),
('b0000000-0000-4000-8000-000000000008', 'a0000000-0000-4000-8000-000000000003', 'Rose River Trail', 'Moderate 3.8 mile loop featuring Rose River Falls.', 'moderate', 3.8, 875, 'Est. 2h 7m', 'Loop', 38.5112, -78.3794, 'https://images.unsplash.com/photo-1518173946687-a4c036bc253c?w=1200&q=80'),
('b0000000-0000-4000-8000-000000000009', 'a0000000-0000-4000-8000-000000000003', 'Bearfence Mountain Trail', 'Moderate 1 mile loop with a 360-degree summit view.', 'moderate', 1.0, 242, 'Est. 34m', 'Loop', 38.4471, -78.4647, 'https://images.unsplash.com/photo-1474044159687-1ee9f3a51722?w=1200&q=80');
