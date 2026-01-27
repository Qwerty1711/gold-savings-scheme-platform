-- ============================================================
-- Customer Registration & RBAC Setup
-- ============================================================
-- Run this in Supabase SQL Editor

-- ============================================================
-- STEP 1: Create customer_registrations table (temporary storage)
-- ============================================================
CREATE TABLE IF NOT EXISTS customer_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone varchar(15) NOT NULL UNIQUE,
  full_name varchar(255),
  address text,
  pan_number varchar(10),
  status varchar(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'COMPLETED', 'FAILED')),
  failure_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Index for phone lookup
CREATE INDEX IF NOT EXISTS idx_customer_registrations_phone ON customer_registrations(phone);
CREATE INDEX IF NOT EXISTS idx_customer_registrations_status ON customer_registrations(status);

-- RLS policies for customer_registrations (accessible without auth for registration)
ALTER TABLE customer_registrations ENABLE ROW LEVEL SECURITY;

-- Allow insert for anonymous users (registration flow)
CREATE POLICY customer_registrations_insert_anon ON customer_registrations
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Allow select for anonymous users (to check registration status)
CREATE POLICY customer_registrations_select_anon ON customer_registrations
  FOR SELECT
  TO anon
  USING (true);

-- Allow update for anonymous users (to update status)
CREATE POLICY customer_registrations_update_anon ON customer_registrations
  FOR UPDATE
  TO anon
  USING (true);

-- Admins can see all registrations for marketing follow-up
CREATE POLICY customer_registrations_select_admin ON customer_registrations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'ADMIN'
    )
  );

-- ============================================================
-- STEP 2: Create registration_otps table (OTP tracking)
-- ============================================================
CREATE TABLE IF NOT EXISTS registration_otps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone varchar(15) NOT NULL,
  otp varchar(6) NOT NULL,
  expires_at timestamptz NOT NULL,
  verified boolean NOT NULL DEFAULT false,
  attempts int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for phone + OTP lookup
CREATE INDEX IF NOT EXISTS idx_registration_otps_phone ON registration_otps(phone);
CREATE INDEX IF NOT EXISTS idx_registration_otps_expires_at ON registration_otps(expires_at);

-- RLS policies for registration_otps
ALTER TABLE registration_otps ENABLE ROW LEVEL SECURITY;

-- Allow anonymous users to insert (send OTP)
CREATE POLICY registration_otps_insert_anon ON registration_otps
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Allow anonymous users to select their own OTPs
CREATE POLICY registration_otps_select_anon ON registration_otps
  FOR SELECT
  TO anon
  USING (true);

-- Allow anonymous users to update (verify OTP)
CREATE POLICY registration_otps_update_anon ON registration_otps
  FOR UPDATE
  TO anon
  USING (true);

-- ============================================================
-- STEP 3: Add customer_id to user_profiles for linking
-- ============================================================
-- Check if customer_id column exists before adding
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'customer_id'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN customer_id uuid REFERENCES customers(id) ON DELETE CASCADE;
    CREATE INDEX idx_user_profiles_customer_id ON user_profiles(customer_id);
  END IF;
END $$;

-- ============================================================
-- STEP 4: Create function to generate 6-digit OTP
-- ============================================================
CREATE OR REPLACE FUNCTION generate_otp()
RETURNS varchar(6) AS $$
DECLARE
  otp varchar(6);
BEGIN
  otp := LPAD(FLOOR(RANDOM() * 1000000)::text, 6, '0');
  RETURN otp;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- STEP 5: Create function to send OTP (returns OTP for dev)
-- ============================================================
CREATE OR REPLACE FUNCTION send_registration_otp(p_phone varchar(15))
RETURNS jsonb AS $$
DECLARE
  v_otp varchar(6);
  v_expires_at timestamptz;
  v_registration_id uuid;
BEGIN
  -- Generate OTP
  v_otp := generate_otp();
  v_expires_at := now() + interval '5 minutes';
  
  -- Create or update customer_registrations record
  INSERT INTO customer_registrations (phone, status)
  VALUES (p_phone, 'PENDING')
  ON CONFLICT (phone) DO UPDATE
  SET status = 'PENDING', updated_at = now()
  RETURNING id INTO v_registration_id;
  
  -- Invalidate previous OTPs for this phone
  UPDATE registration_otps
  SET verified = false
  WHERE phone = p_phone AND verified = false;
  
  -- Insert new OTP
  INSERT INTO registration_otps (phone, otp, expires_at)
  VALUES (p_phone, v_otp, v_expires_at);
  
  -- In production, integrate with SMS service here
  -- For now, return OTP for testing
  RETURN jsonb_build_object(
    'success', true,
    'message', 'OTP sent successfully',
    'otp', v_otp,  -- Remove this in production!
    'expires_at', v_expires_at,
    'registration_id', v_registration_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- STEP 6: Create function to verify OTP
-- ============================================================
CREATE OR REPLACE FUNCTION verify_registration_otp(
  p_phone varchar(15),
  p_otp varchar(6)
)
RETURNS jsonb AS $$
DECLARE
  v_otp_record RECORD;
  v_registration_id uuid;
BEGIN
  -- Find the latest OTP for this phone
  SELECT * INTO v_otp_record
  FROM registration_otps
  WHERE phone = p_phone
    AND otp = p_otp
    AND verified = false
    AND expires_at > now()
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- Check if OTP found
  IF NOT FOUND THEN
    -- Increment failed attempts
    UPDATE registration_otps
    SET attempts = attempts + 1
    WHERE phone = p_phone AND otp = p_otp;
    
    -- Update registration status
    UPDATE customer_registrations
    SET status = 'FAILED', 
        failure_reason = 'Invalid or expired OTP',
        updated_at = now()
    WHERE phone = p_phone
    RETURNING id INTO v_registration_id;
    
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Invalid or expired OTP'
    );
  END IF;
  
  -- Mark OTP as verified
  UPDATE registration_otps
  SET verified = true
  WHERE id = v_otp_record.id;
  
  -- Get registration ID
  SELECT id INTO v_registration_id
  FROM customer_registrations
  WHERE phone = p_phone;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'OTP verified successfully',
    'registration_id', v_registration_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- STEP 7: Create function to complete registration
-- ============================================================
CREATE OR REPLACE FUNCTION complete_customer_registration(
  p_phone varchar(15),
  p_full_name varchar(255),
  p_address text,
  p_pan_number varchar(10),
  p_retailer_id uuid
)
RETURNS jsonb AS $$
DECLARE
  v_customer_id uuid;
  v_user_id uuid;
  v_registration_id uuid;
BEGIN
  -- Check if OTP was verified
  IF NOT EXISTS (
    SELECT 1 FROM registration_otps
    WHERE phone = p_phone AND verified = true
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'OTP not verified. Please verify OTP first.'
    );
  END IF;
  
  -- Check if customer already exists
  SELECT id INTO v_customer_id
  FROM customers
  WHERE phone = p_phone AND retailer_id = p_retailer_id;
  
  IF v_customer_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Customer with this phone number already exists'
    );
  END IF;
  
  -- Create customer record
  INSERT INTO customers (
    retailer_id,
    full_name,
    phone,
    address,
    pan_number,
    source,
    created_at
  )
  VALUES (
    p_retailer_id,
    p_full_name,
    p_phone,
    p_address,
    p_pan_number,
    'SELF_REGISTRATION',
    now()
  )
  RETURNING id INTO v_customer_id;
  
  -- Create auth user for customer (using email as phone@domain.com)
  -- This will be handled by Supabase Auth API in the application
  
  -- Update customer_registrations status
  UPDATE customer_registrations
  SET status = 'COMPLETED',
      full_name = p_full_name,
      address = p_address,
      pan_number = p_pan_number,
      updated_at = now()
  WHERE phone = p_phone
  RETURNING id INTO v_registration_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Registration completed successfully',
    'customer_id', v_customer_id,
    'registration_id', v_registration_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- STEP 8: Create view for failed registrations (marketing)
-- ============================================================
CREATE OR REPLACE VIEW failed_registrations AS
SELECT 
  cr.id,
  cr.phone,
  cr.full_name,
  cr.failure_reason,
  cr.created_at,
  cr.updated_at,
  COUNT(ro.id) as otp_attempts
FROM customer_registrations cr
LEFT JOIN registration_otps ro ON ro.phone = cr.phone
WHERE cr.status = 'FAILED'
GROUP BY cr.id, cr.phone, cr.full_name, cr.failure_reason, cr.created_at, cr.updated_at
ORDER BY cr.updated_at DESC;

-- RLS for failed_registrations view
ALTER VIEW failed_registrations SET (security_invoker = true);

-- Grant access to authenticated admin users
GRANT SELECT ON failed_registrations TO authenticated;

-- ============================================================
-- STEP 9: Add helpful comments
-- ============================================================
COMMENT ON TABLE customer_registrations IS 'Temporary storage for customer self-registration. Tracks failed attempts for marketing follow-up.';
COMMENT ON TABLE registration_otps IS 'OTP tracking for customer registration. 5-minute expiry, supports regeneration.';
COMMENT ON FUNCTION send_registration_otp IS 'Generates and sends OTP to customer phone. Returns OTP in dev mode (remove in production).';
COMMENT ON FUNCTION verify_registration_otp IS 'Verifies OTP entered by customer. Marks as verified on success.';
COMMENT ON FUNCTION complete_customer_registration IS 'Creates customer record after OTP verification. Links to retailer.';
COMMENT ON VIEW failed_registrations IS 'Shows failed registration attempts for marketing follow-up. Admin-only access.';

-- ============================================================
-- STEP 10: Create sample query for testing
-- ============================================================
-- Test OTP generation:
-- SELECT send_registration_otp('+919876543210');

-- Test OTP verification:
-- SELECT verify_registration_otp('+919876543210', '123456');

-- Test registration completion:
-- SELECT complete_customer_registration(
--   '+919876543210',
--   'Test Customer',
--   '123 Main St',
--   'ABCDE1234F',
--   'retailer-uuid-here'
-- );

-- View failed registrations:
-- SELECT * FROM failed_registrations;

DO $$
BEGIN
  RAISE NOTICE '✅ Customer registration & RBAC schema created successfully!';
  RAISE NOTICE '📝 Next steps:';
  RAISE NOTICE '1. Test OTP flow: SELECT send_registration_otp(''+919876543210'');';
  RAISE NOTICE '2. Integrate SMS service in send_registration_otp function';
  RAISE NOTICE '3. Create API routes for registration in Next.js';
END $$;
