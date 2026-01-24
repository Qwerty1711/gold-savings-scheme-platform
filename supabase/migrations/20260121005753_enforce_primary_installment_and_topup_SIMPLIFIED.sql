/*
  # Enforce Primary Monthly Installment vs Top-Up (SIMPLIFIED VERSION)

  ## Overview
  This migration adds transaction type tracking and billing month calculation.
  
  ## IMPORTANT NOTE:
  The original migration assumed transactions have a scheme_id/enrollment_id column.
  Your schema has transactions linked ONLY to customers, not enrollments.
  
  This simplified version:
  - Adds txn_type and billing_month columns
  - Sets defaults for existing data
  - Skips enrollment-specific validation (since no enrollment link exists)

  ## Changes

  ### 1. New Transaction Type
  - **txn_type** enum: PRIMARY_INSTALLMENT, TOP_UP
  - PRIMARY_INSTALLMENT: The committed monthly EMI (one per month)
  - TOP_UP: Additional payments beyond the monthly commitment (unlimited)

  ### 2. Billing Month Tracking
  - **billing_month** (date): First day of the billing month (e.g., 2026-01-01)
  - Auto-calculated from paid_at (online) or recorded_at (offline)
*/

-- Create txn_type enum
DO $$ BEGIN
  CREATE TYPE txn_type AS ENUM ('PRIMARY_INSTALLMENT', 'TOP_UP');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add new columns to transactions table
DO $$ 
BEGIN
  -- Add txn_type column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transactions' AND column_name='txn_type') THEN
    ALTER TABLE transactions ADD COLUMN txn_type txn_type;
  END IF;
  
  -- Add billing_month column (first day of month)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transactions' AND column_name='billing_month') THEN
    ALTER TABLE transactions ADD COLUMN billing_month date;
  END IF;
END $$;

-- Migrate existing transactions to PRIMARY_INSTALLMENT if they don't have txn_type
UPDATE transactions
SET txn_type = 'PRIMARY_INSTALLMENT'::txn_type
WHERE txn_type IS NULL;

-- Calculate billing_month for existing transactions
UPDATE transactions
SET billing_month = DATE_TRUNC('month', COALESCE(paid_at, recorded_at, payment_received_at))::date
WHERE billing_month IS NULL AND txn_type IS NOT NULL;

-- Make columns have defaults going forward (after data migration)
ALTER TABLE transactions ALTER COLUMN txn_type SET DEFAULT 'PRIMARY_INSTALLMENT'::txn_type;

-- Create function to auto-calculate billing_month
CREATE OR REPLACE FUNCTION set_billing_month()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate billing_month from paid_at (online) or recorded_at (offline)
  IF NEW.billing_month IS NULL THEN
    IF NEW.source = 'CUSTOMER_ONLINE' THEN
      NEW.billing_month := DATE_TRUNC('month', NEW.paid_at)::date;
    ELSIF NEW.recorded_at IS NOT NULL THEN
      NEW.billing_month := DATE_TRUNC('month', NEW.recorded_at)::date;
    ELSIF NEW.payment_received_at IS NOT NULL THEN
      NEW.billing_month := DATE_TRUNC('month', NEW.payment_received_at)::date;
    ELSE
      NEW.billing_month := DATE_TRUNC('month', CURRENT_DATE)::date;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to set billing_month before insert
DROP TRIGGER IF EXISTS set_billing_month_trigger ON transactions;
CREATE TRIGGER set_billing_month_trigger
  BEFORE INSERT ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION set_billing_month();

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_transactions_txn_type ON transactions(txn_type);
CREATE INDEX IF NOT EXISTS idx_transactions_billing_month ON transactions(billing_month);
CREATE INDEX IF NOT EXISTS idx_transactions_customer_billing ON transactions(customer_id, billing_month);

-- Update RLS policies to account for txn_type
-- Customers can insert PRIMARY_INSTALLMENT or TOP_UP via online payments
DROP POLICY IF EXISTS "Customers can create online payments" ON transactions;
CREATE POLICY "Customers can create online payments"
  ON transactions FOR INSERT
  TO authenticated
  WITH CHECK (
    source = 'CUSTOMER_ONLINE'
    AND customer_id IN (SELECT id FROM customers WHERE id = auth.uid())
    AND rate_override_per_gram IS NULL
    AND txn_type IN ('PRIMARY_INSTALLMENT', 'TOP_UP')
  );

-- Add helpful comments
COMMENT ON COLUMN transactions.txn_type IS 'PRIMARY_INSTALLMENT: Monthly commitment (one per month). TOP_UP: Additional payment (unlimited).';
COMMENT ON COLUMN transactions.billing_month IS 'First day of the billing month. Auto-calculated from paid_at/recorded_at.';

-- Note: Enrollment-specific validation and reminders are skipped in this version
-- because transactions table does not have a direct enrollment_id foreign key.
-- If you need enrollment tracking, run this migration first:
-- ALTER TABLE transactions ADD COLUMN enrollment_id uuid REFERENCES enrollments(id);
