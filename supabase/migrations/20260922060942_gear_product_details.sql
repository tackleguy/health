-- Optional sourced specifications; existing owner-only RLS and grants still apply.
ALTER TABLE public.gear_items
  ADD COLUMN product_details jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD CONSTRAINT gear_product_details_object
    CHECK (jsonb_typeof(product_details) = 'object' AND octet_length(product_details::text) <= 12000);
