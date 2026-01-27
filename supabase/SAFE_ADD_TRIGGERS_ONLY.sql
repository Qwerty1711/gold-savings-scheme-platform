-- ============================================================
-- SAFE MIGRATION: Add Triggers WITHOUT Dropping Tables
-- ============================================================
-- This adds billing month triggers WITHOUT destroying data
-- Run this in Supabase SQL Editor

-- DO NOT RUN 20260125_complete_enrollments_setup.sql EVER AGAIN!
-- That migration has DROP TABLE commands that delete all data!

-- ============================================================
-- STEP 1: Verify Current Data (before making changes)
-- ============================================================
DO $$
DECLARE
  v_customers int;
  v_enrollments int;
  v_billing_months int;
  v_transactions int;
BEGIN
  SELECT COUNT(*) INTO v_customers FROM customers;
  SELECT COUNT(*) INTO v_enrollments FROM enrollments;
  SELECT COUNT(*) INTO v_billing_months FROM enrollment_billing_months;
  SELECT COUNT(*) INTO v_transactions FROM transactions;
  
  RAISE NOTICE '=== BEFORE MIGRATION ===';
  RAISE NOTICE 'Customers: %', v_customers;
  RAISE NOTICE 'Enrollments: %', v_enrollments;
  RAISE NOTICE 'Billing Months: %', v_billing_months;
  RAISE NOTICE 'Transactions: %', v_transactions;
  
  IF v_enrollments = 0 THEN
    RAISE WARNING 'WARNING: Enrollments table is EMPTY! Data may have been deleted by previous migration.';
  END IF;
END $$;

-- ============================================================
-- STEP 2: Create Billing Months Generation Function
-- ============================================================
CREATE OR REPLACE FUNCTION generate_billing_months_for_enrollment(
  p_enrollment_id uuid,
  p_months_ahead int DEFAULT 3
)
RETURNS void AS $$
DECLARE
  v_enrollment RECORD;
  v_plan RECORD;
  v_billing_month date;
  v_due_date date;
  v_months_to_generate int;
  v_month_offset int;
BEGIN
  -- Get enrollment details
  SELECT e.*
  INTO v_enrollment
  FROM enrollments e
  WHERE e.id = p_enrollment_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Enrollment not found: %', p_enrollment_id;
  END IF;
  
  -- Get plan details
  SELECT st.duration_months
  INTO v_plan
  FROM scheme_templates st
  WHERE st.id = v_enrollment.plan_id;
  
  IF NOT FOUND THEN
    RAISE WARNING 'Plan not found for enrollment %, using default 12 months', p_enrollment_id;
    v_months_to_generate := 12;
  ELSE
    v_months_to_generate := v_plan.duration_months + p_months_ahead;
  END IF;
  
  -- Generate billing months
  FOR v_month_offset IN 0..v_months_to_generate-1 LOOP
    v_billing_month := DATE_TRUNC('month', v_enrollment.start_date + (v_month_offset || ' months')::interval)::date;
    
    IF v_enrollment.billing_day_of_month IS NOT NULL THEN
      v_due_date := v_billing_month + interval '1 month';
      v_due_date := (
        DATE_TRUNC('month', v_due_date) + 
        (LEAST(v_enrollment.billing_day_of_month, 
               EXTRACT(DAY FROM (DATE_TRUNC('month', v_due_date) + interval '1 month' - interval '1 day'))::int) - 1
        ) || ' days'
      )::interval::date;
    ELSE
      v_due_date := (DATE_TRUNC('month', v_billing_month) + interval '1 month' - interval '1 day')::date;
    END IF;
    
    INSERT INTO enrollment_billing_months (
      retailer_id,
      enrollment_id,
      billing_month,
      due_date,
      primary_paid,
      status
    )
    VALUES (
      v_enrollment.retailer_id,
      v_enrollment.id,
      v_billing_month,
      v_due_date,
      false,
      CASE WHEN v_due_date < CURRENT_DATE THEN 'MISSED' ELSE 'DUE' END
    )
    ON CONFLICT (enrollment_id, billing_month) DO NOTHING;
  END LOOP;
  
  RAISE NOTICE 'Generated billing months for enrollment %', p_enrollment_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- STEP 3: Create Trigger to Auto-Generate on Enrollment Insert
-- ============================================================
CREATE OR REPLACE FUNCTION auto_generate_billing_months()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM generate_billing_months_for_enrollment(NEW.id, 3);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_generate_billing_months ON enrollments;
CREATE TRIGGER trigger_auto_generate_billing_months
  AFTER INSERT ON enrollments
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_billing_months();

-- ============================================================
-- STEP 4: Create Trigger to Update primary_paid on Payment
-- ============================================================
CREATE OR REPLACE FUNCTION update_billing_month_on_payment()
RETURNS TRIGGER AS $$
DECLARE
  v_billing_month date;
BEGIN
  IF NEW.txn_type = 'PRIMARY_INSTALLMENT' AND NEW.payment_status = 'SUCCESS' THEN
    v_billing_month := COALESCE(NEW.billing_month, DATE_TRUNC('month', CURRENT_DATE)::date);
    
    UPDATE enrollment_billing_months
    SET 
      primary_paid = true,
      status = 'PAID'
    WHERE enrollment_id = NEW.enrollment_id
      AND billing_month = v_billing_month;
      
    IF NOT FOUND THEN
      INSERT INTO enrollment_billing_months (
        retailer_id,
        enrollment_id,
        billing_month,
        due_date,
        primary_paid,
        status
      )
      VALUES (
        NEW.retailer_id,
        NEW.enrollment_id,
        v_billing_month,
        (v_billing_month + interval '1 month' - interval '1 day')::date,
        true,
        'PAID'
      )
      ON CONFLICT (enrollment_id, billing_month) DO UPDATE
      SET primary_paid = true, status = 'PAID';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_billing_month_on_payment ON transactions;
CREATE TRIGGER trigger_update_billing_month_on_payment
  AFTER INSERT ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_billing_month_on_payment();

-- ============================================================
-- STEP 5: Generate Billing Months for Existing Enrollments
-- ============================================================
DO $$
DECLARE
  v_enrollment_id uuid;
  v_count int := 0;
  v_success int := 0;
BEGIN
  FOR v_enrollment_id IN 
    SELECT id FROM enrollments
  LOOP
    BEGIN
      PERFORM generate_billing_months_for_enrollment(v_enrollment_id, 3);
      v_success := v_success + 1;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Failed for enrollment %: %', v_enrollment_id, SQLERRM;
    END;
    v_count := v_count + 1;
  END LOOP;
  
  RAISE NOTICE 'Processed % enrollments, % successful', v_count, v_success;
END $$;

-- ============================================================
-- STEP 6: Update primary_paid for Existing Transactions
-- ============================================================
DO $$
DECLARE
  v_updated int;
BEGIN
  UPDATE enrollment_billing_months ebm
  SET 
    primary_paid = true,
    status = 'PAID'
  FROM transactions t
  WHERE t.enrollment_id = ebm.enrollment_id
    AND t.billing_month = ebm.billing_month
    AND t.txn_type = 'PRIMARY_INSTALLMENT'
    AND t.payment_status = 'SUCCESS'
    AND NOT ebm.primary_paid;
  
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RAISE NOTICE 'Updated % billing months as paid', v_updated;
END $$;

-- ============================================================
-- STEP 7: Verify Results
-- ============================================================
DO $$
DECLARE
  v_customers int;
  v_enrollments int;
  v_billing_months int;
  v_months_paid int;
  v_transactions int;
BEGIN
  SELECT COUNT(*) INTO v_customers FROM customers;
  SELECT COUNT(*) INTO v_enrollments FROM enrollments;
  SELECT COUNT(*) INTO v_billing_months FROM enrollment_billing_months;
  SELECT COUNT(*) INTO v_months_paid FROM enrollment_billing_months WHERE primary_paid = true;
  SELECT COUNT(*) INTO v_transactions FROM transactions WHERE payment_status = 'SUCCESS';
  
  RAISE NOTICE '=== AFTER MIGRATION ===';
  RAISE NOTICE 'Customers: %', v_customers;
  RAISE NOTICE 'Enrollments: %', v_enrollments;
  RAISE NOTICE 'Billing Months: %', v_billing_months;
  RAISE NOTICE 'Months Paid: %', v_months_paid;
  RAISE NOTICE 'Transactions: %', v_transactions;
END $$;

-- ============================================================
-- STEP 8: Show Sample Data
-- ============================================================
SELECT 
  'SAMPLE DATA' as info,
  c.full_name as customer,
  e.id as enrollment_id,
  st.name as plan,
  e.status,
  e.created_at,
  COUNT(ebm.id) as billing_months_created,
  SUM(CASE WHEN ebm.primary_paid THEN 1 ELSE 0 END) as months_paid,
  COUNT(t.id) FILTER (WHERE t.payment_status = 'SUCCESS') as successful_transactions,
  COALESCE(SUM(t.amount_paid), 0) as total_paid
FROM customers c
LEFT JOIN enrollments e ON e.customer_id = c.id
LEFT JOIN scheme_templates st ON st.id = e.plan_id
LEFT JOIN enrollment_billing_months ebm ON ebm.enrollment_id = e.id
LEFT JOIN transactions t ON t.enrollment_id = e.id
GROUP BY c.full_name, e.id, st.name, e.status, e.created_at
ORDER BY e.created_at DESC NULLS LAST;
