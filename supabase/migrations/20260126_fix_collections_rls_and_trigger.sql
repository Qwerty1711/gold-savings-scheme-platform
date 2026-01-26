/*
  # Fix Collections Page - Add Staff RLS Policy and Fix Trigger
  
  ## Issues Fixed:
  1. Missing RLS policy - Staff cannot insert transactions (causing 400 errors)
  2. Buggy trigger referencing NEW.scheme_id instead of NEW.enrollment_id
  3. Missing recorded_at field in transactions insert
  
  ## Changes:
  - Drop buggy check_payment_due_status trigger
  - Add RLS policy for staff to insert transactions
  - Fix create_due_reminders function
*/

-- =====================================================
-- 1. DROP BUGGY TRIGGER
-- =====================================================

DROP TRIGGER IF EXISTS check_payment_due_status ON transactions;
DROP FUNCTION IF EXISTS check_monthly_payment_status();

-- =====================================================
-- 2. ADD MISSING RLS POLICY FOR STAFF
-- =====================================================

-- Drop existing customer-only policy
DROP POLICY IF EXISTS "Customers can create online payments" ON transactions;

-- Recreate customer policy (customers.id matches auth.uid() directly)
CREATE POLICY "Customers can create online payments"
  ON transactions FOR INSERT
  TO authenticated
  WITH CHECK (
    customer_id = auth.uid()
    AND source = 'CUSTOMER_ONLINE'::transaction_source
  );

-- Add new policy for staff to insert offline payments
DROP POLICY IF EXISTS "Staff can record offline payments" ON transactions;
CREATE POLICY "Staff can record offline payments"
  ON transactions FOR INSERT
  TO authenticated
  WITH CHECK (
    retailer_id IN (
      SELECT retailer_id FROM user_profiles 
      WHERE id = auth.uid() AND role IN ('ADMIN', 'STAFF')
    )
    AND source = 'STAFF_OFFLINE'::transaction_source
  );

-- Allow staff to view transactions in their retailer
DROP POLICY IF EXISTS "Staff can view transactions in their retailer" ON transactions;
CREATE POLICY "Staff can view transactions in their retailer"
  ON transactions FOR SELECT
  TO authenticated
  USING (
    retailer_id IN (
      SELECT retailer_id FROM user_profiles 
      WHERE id = auth.uid() AND role IN ('ADMIN', 'STAFF', 'CUSTOMER')
    )
  );

-- =====================================================
-- 3. FIX DUE REMINDERS FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION create_due_reminders()
RETURNS void AS $$
DECLARE
  v_enrollment RECORD;
  v_last_payment date;
  v_expected_payment_month date;
BEGIN
  -- Find all active enrollments
  FOR v_enrollment IN 
    SELECT e.*, c.full_name as customer_name, c.phone as customer_phone
    FROM enrollments e
    JOIN customers c ON c.id = e.customer_id
    WHERE e.status = 'ACTIVE'
  LOOP
    -- Get last payment date (FIXED: use enrollment_id instead of scheme_id)
    SELECT MAX(paid_at) INTO v_last_payment
    FROM transactions
    WHERE enrollment_id = v_enrollment.id 
      AND payment_status = 'SUCCESS'
      AND txn_type = 'PRIMARY_INSTALLMENT';
    
    IF v_last_payment IS NULL THEN
      v_last_payment := v_enrollment.start_date;
    END IF;
    
    -- Expected payment month is the month after last payment
    v_expected_payment_month := DATE_TRUNC('month', v_last_payment + INTERVAL '1 month')::date;
    
    -- If we're past the expected payment month and no reminder sent recently
    IF CURRENT_DATE >= v_expected_payment_month + INTERVAL '5 days' THEN
      -- Check if reminder already exists for this month
      IF NOT EXISTS (
        SELECT 1 FROM notification_queue
        WHERE enrollment_id = v_enrollment.id
          AND notification_type = 'DUE_REMINDER'
          AND scheduled_for >= v_expected_payment_month
          AND status IN ('PENDING', 'SENT')
      ) THEN
        -- Create reminder
        INSERT INTO notification_queue (
          retailer_id,
          customer_id,
          enrollment_id,
          notification_type,
          message,
          scheduled_for,
          channel,
          metadata
        ) VALUES (
          v_enrollment.retailer_id,
          v_enrollment.customer_id,
          v_enrollment.id,
          'DUE_REMINDER',
          'Your monthly payment is due. Please make a payment to keep your scheme active.',
          NOW(),
          'IN_APP',
          jsonb_build_object(
            'expected_month', v_expected_payment_month,
            'monthly_amount', v_enrollment.commitment_amount
          )
        );
      END IF;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 4. ADD RECORDED_AT FIELD IF MISSING
-- =====================================================

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='transactions' AND column_name='recorded_at'
  ) THEN
    ALTER TABLE transactions ADD COLUMN recorded_at timestamptz;
  END IF;
END $$;

-- Update set_billing_month function to handle recorded_at
CREATE OR REPLACE FUNCTION set_billing_month()
RETURNS TRIGGER AS $$
BEGIN
  -- Set recorded_at for offline payments if not provided
  IF NEW.source = 'STAFF_OFFLINE' AND NEW.recorded_at IS NULL THEN
    NEW.recorded_at := NOW();
  END IF;
  
  -- Calculate billing_month from paid_at (online) or recorded_at (offline)
  IF NEW.billing_month IS NULL THEN
    IF NEW.source = 'CUSTOMER_ONLINE' THEN
      NEW.billing_month := DATE_TRUNC('month', COALESCE(NEW.paid_at, NOW()))::date;
    ELSE
      NEW.billing_month := DATE_TRUNC('month', COALESCE(NEW.recorded_at, NOW()))::date;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION create_due_reminders IS 'Fixed to use enrollment_id instead of scheme_id';
COMMENT ON POLICY "Staff can record offline payments" ON transactions IS 'Allows staff to record cash/offline payments for customers';
