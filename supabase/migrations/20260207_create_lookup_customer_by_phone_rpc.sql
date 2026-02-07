-- Lookup customer by retailer + phone (bypasses RLS for login flow)
-- Safe to run multiple times

CREATE OR REPLACE FUNCTION public.lookup_customer_by_phone(
  p_retailer_id uuid,
  p_phone text
)
RETURNS TABLE (
  id uuid,
  retailer_id uuid,
  full_name text,
  phone text,
  email text
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  WITH normalized AS (
    SELECT
      regexp_replace(coalesce(p_phone, ''), '\\D', '', 'g') AS digits
  )
  SELECT
    c.id,
    c.retailer_id,
    c.full_name,
    c.phone,
    c.email
  FROM public.customers c
  CROSS JOIN normalized n
  WHERE c.retailer_id = p_retailer_id
    AND (
      c.phone = p_phone
      OR c.phone = n.digits
      OR c.phone = '91' || n.digits
      OR c.phone = '+91' || n.digits
    )
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.lookup_customer_by_phone(uuid, text) TO anon, authenticated, service_role;
