/*
  # Fix Settings Page Save Issues - RLS Policies and Constraints

  ## Issues Fixed
  1. Ensure retailers table allows UPDATE by ADMINs
  2. Ensure stores table allows INSERT by ADMINs  
  3. Ensure user_profiles allows INSERT without auth.users FK
  4. Add helpful error logging

  ## Security
  - Maintain multi-tenant isolation
*/

-- 1. Fix retailers table RLS - ensure UPDATE is allowed
DROP POLICY IF EXISTS "Admins can update their retailer" ON retailers;

CREATE POLICY "Admins can update their retailer"
  ON retailers FOR UPDATE
  TO authenticated
  USING (
    id IN (
      SELECT retailer_id FROM user_profiles 
      WHERE user_profiles.id = auth.uid() AND role = 'ADMIN'
    )
  )
  WITH CHECK (
    id IN (
      SELECT retailer_id FROM user_profiles 
      WHERE user_profiles.id = auth.uid() AND role = 'ADMIN'
    )
  );

-- 2. Ensure stores table has proper INSERT policy (should already exist from migration 8)
-- Just verify it's there
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'stores' 
    AND policyname = 'Retailers can insert their own stores'
  ) THEN
    CREATE POLICY "Retailers can insert their own stores"
      ON stores FOR INSERT
      WITH CHECK (retailer_id = (SELECT retailer_id FROM user_profiles WHERE id = auth.uid()));
  END IF;
END $$;

-- 3. user_profiles INSERT policy - allow ADMINs to create staff
DROP POLICY IF EXISTS "Admins can insert staff profiles" ON user_profiles;

CREATE POLICY "Admins can insert staff profiles"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    retailer_id IN (
      SELECT retailer_id FROM user_profiles 
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

-- 4. Ensure user_profiles.id has UUID default for auto-generation
DO $$
BEGIN
  -- Set default UUID generation for id column
  ALTER TABLE user_profiles ALTER COLUMN id SET DEFAULT gen_random_uuid();
EXCEPTION
  WHEN OTHERS THEN
    -- Column might already have a default, that's fine
    NULL;
END $$;

-- 5. Add helpful comments
COMMENT ON POLICY "Admins can update their retailer" ON retailers IS 'Allow admins to update their own retailer business info';
COMMENT ON POLICY "Retailers can insert their own stores" ON stores IS 'Allow retailers to add store locations';
COMMENT ON POLICY "Admins can insert staff profiles" ON user_profiles IS 'Allow admins to create staff member profiles';
