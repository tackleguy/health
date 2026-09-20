ALTER TABLE public.gear_items
  ADD COLUMN IF NOT EXISTS model_url text NOT NULL DEFAULT '';
