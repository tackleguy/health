-- Community difficulty ratings on reviews; surface averages after 5 ratings.
ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS difficulty TEXT
  CHECK (difficulty IS NULL OR difficulty IN ('easy', 'moderate', 'hard', 'expert'));

ALTER TABLE public.trails
  ADD COLUMN IF NOT EXISTS community_difficulty TEXT
  CHECK (community_difficulty IS NULL OR community_difficulty IN ('easy', 'moderate', 'hard', 'expert'));

ALTER TABLE public.trails
  ADD COLUMN IF NOT EXISTS difficulty_rating_count INTEGER NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.refresh_trail_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_trail_id UUID;
  rated_count INTEGER;
  avg_score NUMERIC;
  community TEXT;
BEGIN
  target_trail_id := COALESCE(NEW.trail_id, OLD.trail_id);

  SELECT COUNT(*)::integer,
         AVG(
           CASE r.difficulty
             WHEN 'easy' THEN 1
             WHEN 'moderate' THEN 2
             WHEN 'hard' THEN 3
             WHEN 'expert' THEN 4
             ELSE NULL
           END
         )
    INTO rated_count, avg_score
    FROM public.reviews r
   WHERE r.trail_id = target_trail_id
     AND r.difficulty IS NOT NULL;

  IF rated_count >= 5 AND avg_score IS NOT NULL THEN
    community := CASE
      WHEN avg_score < 1.5 THEN 'easy'
      WHEN avg_score < 2.5 THEN 'moderate'
      WHEN avg_score < 3.5 THEN 'hard'
      ELSE 'expert'
    END;
  ELSE
    community := NULL;
  END IF;

  UPDATE public.trails t
  SET
    avg_rating = COALESCE((
      SELECT ROUND(AVG(r.rating)::numeric, 2)
      FROM public.reviews r
      WHERE r.trail_id = target_trail_id
    ), 0),
    review_count = (
      SELECT COUNT(*)::integer
      FROM public.reviews r
      WHERE r.trail_id = target_trail_id
    ),
    difficulty_rating_count = rated_count,
    community_difficulty = community,
    updated_at = now()
  WHERE t.id = target_trail_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Backfill counts for existing rows (community stays null until 5 ratings).
UPDATE public.trails t
SET difficulty_rating_count = COALESCE((
  SELECT COUNT(*)::integer
  FROM public.reviews r
  WHERE r.trail_id = t.id AND r.difficulty IS NOT NULL
), 0);
