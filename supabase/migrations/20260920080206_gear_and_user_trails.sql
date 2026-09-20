-- Gear locker + custom pack trails (ported from TrailPack / exact-screenshot)

CREATE TABLE public.gear_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text NOT NULL,
  type text NOT NULL DEFAULT 'Base',
  qty integer NOT NULL DEFAULT 1,
  weight numeric NOT NULL DEFAULT 0,
  price numeric NOT NULL DEFAULT 0,
  link text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX gear_items_user_id_idx ON public.gear_items (user_id);

ALTER TABLE public.gear_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gear_items_own" ON public.gear_items
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.gear_items TO authenticated;

CREATE TABLE public.user_trails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  location text NOT NULL DEFAULT '',
  distance numeric NOT NULL DEFAULT 0,
  elevation numeric NOT NULL DEFAULT 0,
  days text NOT NULL DEFAULT '1',
  difficulty text NOT NULL DEFAULT 'moderate',
  tags text[] NOT NULL DEFAULT '{}',
  season text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX user_trails_user_id_idx ON public.user_trails (user_id);

ALTER TABLE public.user_trails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_trails_own" ON public.user_trails
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_trails TO authenticated;
