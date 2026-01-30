-- CREATE ADMIN USER
-- Run this in Supabase SQL Editor to create an admin user

-- Step 1: First, manually create the user in Supabase Auth Dashboard:
-- 1. Go to Supabase Dashboard > Authentication > Users
-- 2. Click "Add user" > "Create new user"
-- 3. Email: satyakishore@gmail.com
-- 4. Password: (your password)
-- 5. Auto Confirm User: YES (check this box)
-- 6. Copy the User ID that gets generated

-- Step 2: After creating the auth user, run this SQL (replace USER_ID with actual ID):
-- Also make sure you have a retailer created first

-- Create or get retailer
DO $$
DECLARE
  retailer_uuid UUID;
  user_uuid UUID := '80dcde40-f686-4302-b676-44d9780b6686'::UUID; -- Replace with actual user ID from Step 1
BEGIN
  -- Get or create a retailer (first check by business_name)
  SELECT id INTO retailer_uuid 
  FROM retailers 
  WHERE business_name = 'Sync4AI'
  LIMIT 1;
  
  IF retailer_uuid IS NULL THEN
    -- Create new retailer (matching actual schema)
    INSERT INTO retailers (
      business_name,
      name,
      phone,
      email,
      contact_email
    ) VALUES (
      'Sync4AI',
      'Sync4AI',
      '+919876543210',
      'satyakishore@gmail.com',
      'satyakishore@gmail.com'
    )
    RETURNING id INTO retailer_uuid;
    
    RAISE NOTICE 'Created retailer with ID: %', retailer_uuid;
  ELSE
    RAISE NOTICE 'Using existing retailer with ID: %', retailer_uuid;
  END IF;
  
  -- Create or update user profile (no email column)
  INSERT INTO user_profiles (
    id,
    retailer_id,
    role,
    full_name,
    status
  ) VALUES (
    user_uuid,
    retailer_uuid,
    'ADMIN',
    'Satyakishore Mavuri',
    'active'
  )
  ON CONFLICT (id) DO UPDATE SET
    retailer_id = EXCLUDED.retailer_id,
    role = 'ADMIN',
    full_name = EXCLUDED.full_name,
    status = 'active';
  
  RAISE NOTICE 'User profile created/updated successfully';
END $$;

-- Verify the setup
SELECT 
  up.id,
  up.role,
  up.full_name,
  up.status,
  r.business_name as retailer
FROM user_profiles up
JOIN retailers r ON r.id = up.retailer_id
WHERE up.id = '80dcde40-f686-4302-b676-44d9780b6686';
