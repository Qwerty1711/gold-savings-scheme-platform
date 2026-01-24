-- Run this BEFORE Migration 5 to fix notification_queue
-- Add missing columns to existing notification_queue table

-- Add missing columns if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notification_queue' AND column_name='billing_month') THEN
    ALTER TABLE notification_queue ADD COLUMN billing_month date;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notification_queue' AND column_name='template_key') THEN
    ALTER TABLE notification_queue ADD COLUMN template_key text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notification_queue' AND column_name='payload') THEN
    ALTER TABLE notification_queue ADD COLUMN payload jsonb DEFAULT '{}'::jsonb;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notification_queue' AND column_name='retry_count') THEN
    ALTER TABLE notification_queue ADD COLUMN retry_count int DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notification_queue' AND column_name='error_message') THEN
    ALTER TABLE notification_queue ADD COLUMN error_message text;
  END IF;
END $$;

-- Optionally recreate the table with all columns if needed:
/*
DROP TABLE IF EXISTS notification_queue CASCADE;

CREATE TABLE notification_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  retailer_id uuid NOT NULL REFERENCES retailers(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  enrollment_id uuid REFERENCES enrollments(id) ON DELETE CASCADE,
  notification_type notification_type NOT NULL,
  message text NOT NULL,
  status notification_status DEFAULT 'PENDING',
  scheduled_for timestamptz NOT NULL,
  sent_at timestamptz,
  failed_reason text,
  channel text DEFAULT 'IN_APP',
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  -- New columns for Migration 5
  billing_month date,
  template_key text,
  payload jsonb DEFAULT '{}'::jsonb,
  retry_count int DEFAULT 0,
  error_message text
);
*/

-- Indexes (if they don't exist)
CREATE INDEX IF NOT EXISTS idx_notification_queue_customer ON notification_queue(customer_id, status);
CREATE INDEX IF NOT EXISTS idx_notification_queue_scheduled ON notification_queue(scheduled_for, status);
CREATE INDEX IF NOT EXISTS idx_notification_queue_retailer ON notification_queue(retailer_id);

-- Enable RLS (if not already enabled)
DO $$
BEGIN
  ALTER TABLE notification_queue ENABLE ROW LEVEL SECURITY;
EXCEPTION
  WHEN others THEN
    RAISE NOTICE 'RLS already enabled or error: %', SQLERRM;
END $$;

-- RLS Policies (recreate to ensure they exist)
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
