/*
  # Add Store Assignment to User Profiles and Gold Rate Audit Trail

  ## Changes
  1. Add store_id to user_profiles (staff can belong to specific store)
  2. Create gold_rate_audit view for tracking rate changes
  3. Add helpful functions for audit trail

  ## Security
  - Multi-tenant isolation maintained via retailer_id
*/

-- 1. Add store_id to user_profiles table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='user_profiles' AND column_name='store_id'
  ) THEN
    ALTER TABLE user_profiles 
    ADD COLUMN store_id uuid REFERENCES stores(id) ON DELETE SET NULL;
    
    CREATE INDEX IF NOT EXISTS idx_user_profiles_store_id ON user_profiles(store_id);
    
    COMMENT ON COLUMN user_profiles.store_id IS 'Store location this staff member is assigned to';
  END IF;
END $$;

-- 2. Create gold_rate_audit view for quick rate change history
CREATE OR REPLACE VIEW gold_rate_audit AS
SELECT 
  gr.id,
  gr.retailer_id,
  gr.karat,
  gr.rate_per_gram,
  gr.effective_from,
  gr.created_at,
  gr.created_by,
  up.full_name as updated_by_name,
  -- Calculate rate change from previous rate
  LAG(gr.rate_per_gram) OVER (
    PARTITION BY gr.retailer_id, gr.karat 
    ORDER BY gr.effective_from
  ) as previous_rate,
  -- Calculate percentage change
  CASE 
    WHEN LAG(gr.rate_per_gram) OVER (
      PARTITION BY gr.retailer_id, gr.karat 
      ORDER BY gr.effective_from
    ) IS NOT NULL THEN
      ROUND(
        ((gr.rate_per_gram - LAG(gr.rate_per_gram) OVER (
          PARTITION BY gr.retailer_id, gr.karat 
          ORDER BY gr.effective_from
        )) / LAG(gr.rate_per_gram) OVER (
          PARTITION BY gr.retailer_id, gr.karat 
          ORDER BY gr.effective_from
        )) * 100, 
        2
      )
    ELSE NULL
  END as change_percentage
FROM gold_rates gr
LEFT JOIN user_profiles up ON gr.created_by = up.id
ORDER BY gr.retailer_id, gr.karat, gr.effective_from DESC;

COMMENT ON VIEW gold_rate_audit IS 'Audit trail of gold rate changes with user info and percentage changes';

-- 3. Create helpful RPC function to get rate history for a retailer
CREATE OR REPLACE FUNCTION get_rate_history(
  p_retailer_id uuid,
  p_karat text DEFAULT '22K',
  p_limit int DEFAULT 50
)
RETURNS TABLE (
  id uuid,
  karat text,
  rate_per_gram numeric,
  effective_from timestamptz,
  created_at timestamptz,
  updated_by_name text,
  previous_rate numeric,
  change_percentage numeric,
  change_amount numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    gra.id,
    gra.karat,
    gra.rate_per_gram,
    gra.effective_from,
    gra.created_at,
    gra.updated_by_name,
    gra.previous_rate,
    gra.change_percentage,
    (gra.rate_per_gram - gra.previous_rate) as change_amount
  FROM gold_rate_audit gra
  WHERE gra.retailer_id = p_retailer_id
    AND (p_karat IS NULL OR gra.karat = p_karat)
  ORDER BY gra.effective_from DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_rate_history IS 'Get gold rate change history with audit details';

-- 4. Update RLS policies to allow viewing audit trail
-- (gold_rates already has SELECT policy, so gold_rate_audit view will inherit it)
