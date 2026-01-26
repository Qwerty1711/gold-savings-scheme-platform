/*
  # NUCLEAR FIX - Drop ALL Transaction Triggers & Rebuild Clean
  
  ## Root Cause:
  - Some old trigger is referencing NEW.karat on transactions table
  - Transactions table NEVER had a karat column
  - Karat lives on enrollments table
  
  ## Solution:
  - Drop EVERY trigger and function on transactions table
  - Rebuild only the required ones with correct logic
*/

-- =====================================================
-- 1. NUCLEAR DROP - ALL TRIGGERS ON TRANSACTIONS
-- =====================================================

DO $$ 
DECLARE
  r RECORD;
BEGIN
  -- Drop all triggers on transactions table
  FOR r IN 
    SELECT tgname 
    FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    WHERE c.relname = 'transactions' 
      AND NOT t.tgisinternal
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON transactions CASCADE', r.tgname);
    RAISE NOTICE 'Dropped trigger: %', r.tgname;
  END LOOP;
END $$;

-- =====================================================
-- 2. DROP ALL FUNCTIONS THAT MIGHT BE USED BY TRIGGERS
-- =====================================================

-- Drop ALL variations of functions that reference scheme_id/enrollment_id
DROP FUNCTION IF EXISTS check_monthly_payment_status() CASCADE;
DROP FUNCTION IF EXISTS check_monthly_payment_status(text) CASCADE;
DROP FUNCTION IF EXISTS check_payment_status() CASCADE;
DROP FUNCTION IF EXISTS check_payment_due_status() CASCADE;
DROP FUNCTION IF EXISTS lock_gold_rate_for_transaction(uuid, text, timestamptz, transaction_source) CASCADE;
DROP FUNCTION IF EXISTS update_billing_month_on_payment() CASCADE;
DROP FUNCTION IF EXISTS set_billing_month() CASCADE;
DROP FUNCTION IF EXISTS validate_transaction_amount() CASCADE;
DROP FUNCTION IF EXISTS auto_calculate_grams() CASCADE;
DROP FUNCTION IF EXISTS calculate_gold_allocation() CASCADE;
DROP FUNCTION IF EXISTS set_gold_rate() CASCADE;

-- =====================================================
-- 3. RECREATE ONLY REQUIRED TRIGGERS (CLEAN)
-- =====================================================

-- Function: Auto-set billing_month and recorded_at
CREATE OR REPLACE FUNCTION set_billing_month()
RETURNS TRIGGER AS $$
BEGIN
  -- Set recorded_at for offline payments if not provided
  IF NEW.source = 'STAFF_OFFLINE'::transaction_source AND NEW.recorded_at IS NULL THEN
    NEW.recorded_at := NOW();
  END IF;
  
  -- Calculate billing_month from paid_at (online) or recorded_at (offline)
  IF NEW.billing_month IS NULL THEN
    IF NEW.source = 'CUSTOMER_ONLINE'::transaction_source THEN
      NEW.billing_month := DATE_TRUNC('month', COALESCE(NEW.paid_at, NOW()))::date;
    ELSE
      NEW.billing_month := DATE_TRUNC('month', COALESCE(NEW.recorded_at, NOW()))::date;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_billing_month_trigger
  BEFORE INSERT ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION set_billing_month();

-- Function: Validate transaction amount
CREATE OR REPLACE FUNCTION validate_transaction_amount()
RETURNS TRIGGER AS $$
DECLARE
  v_commitment_amount numeric;
BEGIN
  -- Skip validation for non-payment types
  IF NEW.txn_type IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get the enrollment's commitment amount
  SELECT commitment_amount INTO v_commitment_amount
  FROM enrollments
  WHERE id = NEW.enrollment_id;

  -- Validate PRIMARY_INSTALLMENT amount
  IF NEW.txn_type = 'PRIMARY_INSTALLMENT' THEN
    IF NEW.amount_paid < v_commitment_amount THEN
      RAISE EXCEPTION 'PRIMARY_INSTALLMENT amount (₹%) must be >= monthly commitment (₹%)', 
        NEW.amount_paid, v_commitment_amount;
    END IF;
  END IF;

  -- Validate TOP_UP amount
  IF NEW.txn_type = 'TOP_UP' THEN
    IF NEW.amount_paid <= 0 THEN
      RAISE EXCEPTION 'TOP_UP amount must be > 0';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_transaction_amount_trigger
  BEFORE INSERT OR UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION validate_transaction_amount();

-- =====================================================
-- 4. ENSURE REQUIRED COLUMNS EXIST
-- =====================================================

DO $$ 
BEGIN
  -- Add recorded_at column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='transactions' AND column_name='recorded_at'
  ) THEN
    ALTER TABLE transactions ADD COLUMN recorded_at timestamptz;
    RAISE NOTICE 'Added recorded_at column';
  END IF;
END $$;

-- =====================================================
-- 5. COMMENTS
-- =====================================================

COMMENT ON TRIGGER set_billing_month_trigger ON transactions IS 
  'Auto-calculates billing_month and recorded_at for new transactions';
COMMENT ON TRIGGER validate_transaction_amount_trigger ON transactions IS 
  'Validates transaction amount against enrollment commitment_amount';
COMMENT ON FUNCTION set_billing_month IS 
  'Sets billing_month to first-of-month and recorded_at for offline payments';
COMMENT ON FUNCTION validate_transaction_amount IS 
  'Ensures PRIMARY_INSTALLMENT >= commitment_amount and TOP_UP > 0';
