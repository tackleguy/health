-- Anonymous and authenticated GPX/route uploads (complements activities table)

CREATE TABLE IF NOT EXISTS public.route_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  trail_id UUID REFERENCES public.trails(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  route_geojson JSONB NOT NULL,
  distance_m NUMERIC NOT NULL DEFAULT 0,
  elevation_gain_ft INTEGER NOT NULL DEFAULT 0,
  elevation_loss_ft INTEGER NOT NULL DEFAULT 0,
  source_format TEXT NOT NULL DEFAULT 'gpx',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS route_imports_user_id_idx ON public.route_imports (user_id);
CREATE INDEX IF NOT EXISTS route_imports_trail_id_idx ON public.route_imports (trail_id);
CREATE INDEX IF NOT EXISTS route_imports_created_at_idx ON public.route_imports (created_at DESC);

ALTER TABLE public.route_imports ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.route_imports TO authenticated;

DO $$ BEGIN
  CREATE POLICY "Users can view own route imports"
    ON public.route_imports FOR SELECT TO authenticated
    USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
