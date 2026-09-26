-- User-uploaded trail photos (remove stock/catalog sourcing from the public feed)
ALTER TABLE public.trail_photos
  ADD COLUMN IF NOT EXISTS uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS trail_photos_uploaded_by_idx
  ON public.trail_photos (uploaded_by);

-- Hide previously ingested / licensed catalog photos from the product
UPDATE public.trail_photos
SET is_disabled = true,
    disabled_reason = COALESCE(disabled_reason, 'replaced_by_user_uploads')
WHERE uploaded_by IS NULL
  AND is_disabled = false;

DROP POLICY IF EXISTS "Users can insert own trail photos" ON public.trail_photos;
CREATE POLICY "Users can insert own trail photos"
  ON public.trail_photos
  FOR INSERT
  TO authenticated
  WITH CHECK (uploaded_by = auth.uid());

DROP POLICY IF EXISTS "Users can update own trail photos" ON public.trail_photos;
CREATE POLICY "Users can update own trail photos"
  ON public.trail_photos
  FOR UPDATE
  TO authenticated
  USING (uploaded_by = auth.uid())
  WITH CHECK (uploaded_by = auth.uid());

DROP POLICY IF EXISTS "Users can delete own trail photos" ON public.trail_photos;
CREATE POLICY "Users can delete own trail photos"
  ON public.trail_photos
  FOR DELETE
  TO authenticated
  USING (uploaded_by = auth.uid());

GRANT INSERT, UPDATE, DELETE ON public.trail_photos TO authenticated;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'trail-photos',
  'trail-photos',
  true,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Trail photos are publicly readable" ON storage.objects;
CREATE POLICY "Trail photos are publicly readable"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'trail-photos');

DROP POLICY IF EXISTS "Users upload trail photos to own folder" ON storage.objects;
CREATE POLICY "Users upload trail photos to own folder"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'trail-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users update own trail photo files" ON storage.objects;
CREATE POLICY "Users update own trail photo files"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'trail-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'trail-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users delete own trail photo files" ON storage.objects;
CREATE POLICY "Users delete own trail photo files"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'trail-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
