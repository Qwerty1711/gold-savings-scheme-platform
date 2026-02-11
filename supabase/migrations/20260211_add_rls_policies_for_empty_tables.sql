-- Migration: Add RLS policies for empty tables
-- Date: 2026-02-11

-- 1. notification_queue
ALTER TABLE notification_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Customers can view their own notifications" ON notification_queue;
CREATE POLICY "Customers can view their own notifications"
  ON notification_queue FOR SELECT
  TO authenticated
  USING (
    customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
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

-- 2. audit_log
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff/Admin can view audit logs for their retailer" ON audit_log;
CREATE POLICY "Staff/Admin can view audit logs for their retailer"
  ON audit_log FOR SELECT
  TO authenticated
  USING (
    retailer_id IN (
      SELECT retailer_id FROM user_profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'STAFF')
    )
  );

-- 3. customer_kyc
ALTER TABLE customer_kyc ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Customers can view their own KYC" ON customer_kyc;
CREATE POLICY "Customers can view their own KYC"
  ON customer_kyc FOR SELECT
  TO authenticated
  USING (
    customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Staff/Admin can manage KYC for their retailer" ON customer_kyc;
CREATE POLICY "Staff/Admin can manage KYC for their retailer"
  ON customer_kyc FOR ALL
  TO authenticated
  USING (
    customer_id IN (
      SELECT id FROM customers WHERE retailer_id IN (
        SELECT retailer_id FROM user_profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'STAFF')
      )
    )
  )
  WITH CHECK (
    customer_id IN (
      SELECT id FROM customers WHERE retailer_id IN (
        SELECT retailer_id FROM user_profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'STAFF')
      )
    )
  );

-- 4. documents
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff/Admin can view documents for their retailer" ON documents;
CREATE POLICY "Staff/Admin can view documents for their retailer"
  ON documents FOR SELECT
  TO authenticated
  USING (
    retailer_id IN (
      SELECT retailer_id FROM user_profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'STAFF')
    )
  );

DROP POLICY IF EXISTS "Customers can view their own documents" ON documents;
CREATE POLICY "Customers can view their own documents"
  ON documents FOR SELECT
  TO authenticated
  USING (
    customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
  );

-- 5. incentive_events
ALTER TABLE incentive_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff/Admin can view incentive events for their retailer" ON incentive_events;
CREATE POLICY "Staff/Admin can view incentive events for their retailer"
  ON incentive_events FOR SELECT
  TO authenticated
  USING (
    retailer_id IN (
      SELECT retailer_id FROM user_profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'STAFF')
    )
  );

-- 6. incentive_payouts
ALTER TABLE incentive_payouts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff/Admin can view incentive payouts for their retailer" ON incentive_payouts;
CREATE POLICY "Staff/Admin can view incentive payouts for their retailer"
  ON incentive_payouts FOR SELECT
  TO authenticated
  USING (
    retailer_id IN (
      SELECT retailer_id FROM user_profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'STAFF')
    )
  );

-- 7. staff_incentives
ALTER TABLE staff_incentives ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff/Admin can view staff incentives for their retailer" ON staff_incentives;
CREATE POLICY "Staff/Admin can view staff incentives for their retailer"
  ON staff_incentives FOR SELECT
  TO authenticated
  USING (
    retailer_id IN (
      SELECT retailer_id FROM user_profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'STAFF')
    )
  );

-- 8. transaction_adjustments
ALTER TABLE transaction_adjustments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff/Admin can view transaction adjustments for their retailer" ON transaction_adjustments;
CREATE POLICY "Staff/Admin can view transaction adjustments for their retailer"
  ON transaction_adjustments FOR SELECT
  TO authenticated
  USING (
    retailer_id IN (
      SELECT retailer_id FROM user_profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'STAFF')
    )
  );

-- 9. qr_scans
ALTER TABLE qr_scans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff/Admin can view QR scans for their retailer" ON qr_scans;
CREATE POLICY "Staff/Admin can view QR scans for their retailer"
  ON qr_scans FOR SELECT
  TO authenticated
  USING (
    retailer_id IN (
      SELECT retailer_id FROM user_profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'STAFF')
    )
  );

-- 10. plans
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff/Admin can view plans for their retailer" ON plans;
CREATE POLICY "Staff/Admin can view plans for their retailer"
  ON plans FOR SELECT
  TO authenticated
  USING (
    retailer_id IN (
      SELECT retailer_id FROM user_profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'STAFF')
    )
  );

-- End of migration
