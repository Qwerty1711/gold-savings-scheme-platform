-- Add missing user_id column for customer auth linking
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_customers_user_id ON public.customers(user_id);

-- Backfill user_id from user_profiles.customer_id mapping
UPDATE public.customers c
SET user_id = up.id
FROM public.user_profiles up
WHERE up.customer_id = c.id
  AND c.user_id IS NULL;
