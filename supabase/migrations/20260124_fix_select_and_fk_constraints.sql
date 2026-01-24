-- Fix retailers SELECT policy and user_profiles FK constraint

-- 1. Add SELECT policy for retailers table
DROP POLICY IF EXISTS "Admins can view their retailer" ON retailers;

CREATE POLICY "Admins can view their retailer"
  ON retailers FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT retailer_id FROM user_profiles 
      WHERE user_profiles.id = auth.uid()
    )
  );

-- 2. Drop the FK constraint on user_profiles.id that prevents staff creation
-- This allows creating staff profiles without auth.users entries
ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_id_fkey;

-- 3. Add helpful comment
COMMENT ON POLICY "Admins can view their retailer" ON retailers IS 'Allow users to view their retailer details';
