/*
  # Enhanced Transactions + Notification System (FIXED VERSION)

  ## Changes to transactions table
  
  ### New Fields:
  1. **Timing Fields**:
     - paid_at (timestamptz) - When customer actually paid
     - recorded_at (timestamptz) - When staff recorded it
     - payment_status (enum) - PENDING, SUCCESS, FAILED, REVERSED
  
  2. **Source Tracking**:
     - source (enum) - CUSTOMER_ONLINE, STAFF_OFFLINE
  
  3. **Payment Gateway** (for phase-2):
     - gateway_provider (text) - RAZORPAY, PAYTM, etc.
     - gateway_order_id (text)
     - gateway_payment_id (text)
  
  4. **Rate Override** (admin only, offline only):
     - rate_override_per_gram (numeric) - Overridden rate if any
     - override_reason (text) - Why rate was overridden
     - rate_overridden_by (uuid) - Admin who overrode
  
  ## New notification_queue table
  - For storing due reminders and notifications
  - Fields: customer_id, scheme_id, type, message, status, scheduled_for, sent_at
  
  ## FIXES:
  - Changed customer_id references from user_id to id
  - Changed transaction_date references to payment_received_at
  - Fixed source column type conversion from TEXT to ENUM
*/

-- Create enums for new fields
DO $$ BEGIN
  CREATE TYPE payment_status AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'REVERSED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE transaction_source AS ENUM ('CUSTOMER_ONLINE', 'STAFF_OFFLINE');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;



DO $$ BEGIN
  CREATE TYPE notification_status AS ENUM ('PENDING', 'SENT', 'FAILED', 'CANCELLED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add new columns to transactions table if they don't exist
DO $$ 
BEGIN
  -- Timing fields
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transactions' AND column_name='paid_at') THEN
    ALTER TABLE transactions ADD COLUMN paid_at timestamptz;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transactions' AND column_name='recorded_at') THEN
    ALTER TABLE transactions ADD COLUMN recorded_at timestamptz DEFAULT now();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transactions' AND column_name='payment_status') THEN
    ALTER TABLE transactions ADD COLUMN payment_status payment_status DEFAULT 'SUCCESS';
  END IF;
  
  -- Gateway fields
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transactions' AND column_name='gateway_provider') THEN
    ALTER TABLE transactions ADD COLUMN gateway_provider text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transactions' AND column_name='gateway_order_id') THEN
    ALTER TABLE transactions ADD COLUMN gateway_order_id text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transactions' AND column_name='gateway_payment_id') THEN
    ALTER TABLE transactions ADD COLUMN gateway_payment_id text;
  END IF;
  
  -- Rate override fields
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transactions' AND column_name='rate_override_per_gram') THEN
    ALTER TABLE transactions ADD COLUMN rate_override_per_gram numeric(10,2);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transactions' AND column_name='override_reason') THEN
    ALTER TABLE transactions ADD COLUMN override_reason text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transactions' AND column_name='rate_overridden_by') THEN
    ALTER TABLE transactions ADD COLUMN rate_overridden_by uuid REFERENCES user_profiles(id);
  END IF;
  
  -- Receipt number for customers
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transactions' AND column_name='receipt_number') THEN
    ALTER TABLE transactions ADD COLUMN receipt_number text;
  END IF;
END $$;

-- FIX: Handle the source column properly
-- If source column exists as TEXT, convert it to ENUM
DO $$
DECLARE
  v_column_type text;
  v_policy_name text;
BEGIN
  -- Check if source column exists and get its type
  SELECT data_type INTO v_column_type
  FROM information_schema.columns
  WHERE table_name = 'transactions' AND column_name = 'source';
  
  IF v_column_type IS NULL THEN
    -- Column doesn't exist, add it as ENUM
    ALTER TABLE transactions ADD COLUMN source transaction_source DEFAULT 'STAFF_OFFLINE';
  ELSIF v_column_type = 'text' OR v_column_type = 'character varying' THEN
    -- Column exists as TEXT, convert to ENUM
    -- First, drop any policies that depend on the source column
    FOR v_policy_name IN 
      SELECT policyname 
      FROM pg_policies 
      WHERE tablename = 'transactions' 
      AND (qual LIKE '%source%' OR with_check LIKE '%source%')
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON transactions', v_policy_name);
      RAISE NOTICE 'Dropped policy % to allow source column type change', v_policy_name;
    END LOOP;
    
    -- Set default values for any NULL or invalid values
    UPDATE transactions SET source = 'STAFF_OFFLINE' WHERE source IS NULL OR source NOT IN ('CUSTOMER_ONLINE', 'STAFF_OFFLINE');
    
    -- Then convert the column type using USING clause
    ALTER TABLE transactions 
      ALTER COLUMN source TYPE transaction_source 
      USING source::transaction_source;
      
    -- Set default for future inserts
    ALTER TABLE transactions 
      ALTER COLUMN source SET DEFAULT 'STAFF_OFFLINE'::transaction_source;
    
    -- Recreate the policies with correct type
    DROP POLICY IF EXISTS "Customers can create online payments" ON transactions;
    CREATE POLICY "Customers can create online payments"
      ON transactions FOR INSERT
      TO authenticated
      WITH CHECK (
        customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
        AND source = 'CUSTOMER_ONLINE'::transaction_source
      );
  END IF;
END $$;

-- Create notification_queue table
CREATE TABLE IF NOT EXISTS notification_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  retailer_id uuid NOT NULL REFERENCES retailers(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  enrollment_id uuid REFERENCES enrollments(id) ON DELETE CASCADE,
  template_key text NOT NULL,
  message text NOT NULL,
  status notification_status DEFAULT 'PENDING',
  scheduled_for timestamptz NOT NULL,
  sent_at timestamptz,
  failed_reason text,
  channel text DEFAULT 'IN_APP', -- IN_APP, SMS, WHATSAPP, EMAIL
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_transactions_paid_at ON transactions(paid_at);
CREATE INDEX IF NOT EXISTS idx_transactions_recorded_at ON transactions(recorded_at);
CREATE INDEX IF NOT EXISTS idx_transactions_source ON transactions(source);
CREATE INDEX IF NOT EXISTS idx_transactions_payment_status ON transactions(payment_status);
CREATE INDEX IF NOT EXISTS idx_transactions_receipt ON transactions(receipt_number);
CREATE INDEX IF NOT EXISTS idx_notification_queue_customer ON notification_queue(customer_id, status);
CREATE INDEX IF NOT EXISTS idx_notification_queue_scheduled ON notification_queue(scheduled_for, status);
CREATE INDEX IF NOT EXISTS idx_notification_queue_retailer ON notification_queue(retailer_id);

-- Enable RLS on notification_queue
ALTER TABLE notification_queue ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notification_queue
DROP POLICY IF EXISTS "Customers can view their own notifications" ON notification_queue;
CREATE POLICY "Customers can view their own notifications"
  ON notification_queue FOR SELECT
  TO authenticated
  USING (
    customer_id IN (SELECT id FROM customers WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Staff can manage notifications in their retailer" ON notification_queue;
CREATE POLICY "Staff can manage notifications in their retailer"
  ON notification_queue FOR ALL
  TO authenticated
  USING (
    retailer_id IN (
      SELECT retailer_id FROM user_profiles 
      WHERE id = auth.uid() AND role IN ('ADMIN', 'STAFF')
    )
  )
  WITH CHECK (
    retailer_id IN (
      SELECT retailer_id FROM user_profiles 
      WHERE id = auth.uid() AND role IN ('ADMIN', 'STAFF')
    )
  );

-- Function to generate receipt number
CREATE OR REPLACE FUNCTION generate_receipt_number()
RETURNS TEXT AS $$
DECLARE
  v_receipt_number TEXT;
BEGIN
  v_receipt_number := 'RCP' || TO_CHAR(NOW(), 'YYYYMMDD') || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
  RETURN v_receipt_number;
END;
$$ LANGUAGE plpgsql;

-- Function to lock gold rate based on source
CREATE OR REPLACE FUNCTION lock_gold_rate_for_transaction(
  p_retailer_id uuid,
  p_karat text,
  p_lock_timestamp timestamptz,
  p_source transaction_source
)
RETURNS TABLE (
  gold_rate_id uuid,
  rate_per_gram numeric,
  valid_from timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT id, rate_per_gram, valid_from
  FROM gold_rates
  WHERE retailer_id = p_retailer_id
    AND karat = p_karat
    AND valid_from <= p_lock_timestamp
  ORDER BY valid_from DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if scheme has monthly payment
CREATE OR REPLACE FUNCTION check_monthly_payment_status()
RETURNS TRIGGER AS $$
DECLARE
  v_last_payment_month date;
  v_current_month date;
  v_enrollment_record RECORD;
BEGIN
  -- Get enrollment details (changed from schemes to enrollments)
  SELECT * INTO v_enrollment_record FROM enrollments WHERE id = NEW.scheme_id;
  
  -- Get last payment month for this enrollment
  SELECT DATE_TRUNC('month', payment_received_at)::date INTO v_last_payment_month
  FROM transactions
  WHERE scheme_id = NEW.scheme_id 
    AND payment_status = 'SUCCESS'
    AND txn_type = 'PRIMARY_INSTALLMENT'
  ORDER BY payment_received_at DESC
  LIMIT 1;
  
  v_current_month := DATE_TRUNC('month', CURRENT_DATE)::date;
  
  -- If last payment was in a previous month and enrollment is active, it might be due
  -- This will be handled by a scheduled job
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to check payment status after transaction insert
DROP TRIGGER IF EXISTS check_payment_due_status ON transactions;
CREATE TRIGGER check_payment_due_status
  AFTER INSERT ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION check_monthly_payment_status();

-- Function to create due reminders (to be called by scheduled job)
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
    -- Get last payment date
    SELECT MAX(payment_received_at) INTO v_last_payment
    FROM transactions
    WHERE scheme_id = v_enrollment.id 
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
        WHERE scheme_id = v_enrollment.id
          AND template_key = 'DUE_REMINDER'
          AND scheduled_for >= v_expected_payment_month
          AND status IN ('PENDING', 'SENT')
      ) THEN
        -- Create reminder
        INSERT INTO notification_queue (
          retailer_id,
          customer_id,
          scheme_id,
          template_key,
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

-- Update existing transactions to have default values
-- FIX: Use proper column names and handle source as ENUM now
UPDATE transactions 
SET 
  paid_at = COALESCE(paid_at, payment_received_at),
  recorded_at = COALESCE(recorded_at, created_at),
  payment_status = COALESCE(payment_status, 'SUCCESS'::payment_status)
WHERE paid_at IS NULL OR recorded_at IS NULL OR payment_status IS NULL;
