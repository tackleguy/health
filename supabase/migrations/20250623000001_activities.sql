-- Activities for Strava-style GPS tracking
CREATE TABLE IF NOT EXISTS public.activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('run', 'hike', 'bike', 'ski')),
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('recording', 'completed')),
  title TEXT NOT NULL,
  distance_m NUMERIC NOT NULL DEFAULT 0,
  duration_sec INTEGER NOT NULL DEFAULT 0,
  elevation_gain_ft INTEGER NOT NULL DEFAULT 0,
  route_geojson JSONB,
  trail_id UUID REFERENCES public.trails(id) ON DELETE SET NULL,
  ski_area_id TEXT,
  ski_area_name TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS activities_user_id_idx ON public.activities(user_id);
CREATE INDEX IF NOT EXISTS activities_started_at_idx ON public.activities(started_at DESC);

ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.activities TO authenticated;

CREATE POLICY "Users can view own activities"
  ON public.activities FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own activities"
  ON public.activities FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own activities"
  ON public.activities FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own activities"
  ON public.activities FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
