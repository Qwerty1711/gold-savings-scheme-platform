-- ============================================================
-- COMPLETE FIX: Data Loss & Missing Billing Months
-- ============================================================
-- Run this entire script in Supabase SQL Editor

-- Step 1: Check what data currently exists
DO $$
DECLARE
  v_customer_count int;
  v_enrollment_count int;
  v_billing_count int;
  v_transaction_count int;
BEGIN
  SELECT COUNT(*) INTO v_customer_count FROM customers;
  SELECT COUNT(*) INTO v_enrollment_count FROM enrollments;
  SELECT COUNT(*) INTO v_billing_count FROM enrollment_billing_months;
  SELECT COUNT(*) INTO v_transaction_count FROM transactions WHERE payment_status = 'SUCCESS';
  
  RAISE NOTICE 'Current data: % customers, % enrollments, % billing_months, % transactions', 
    v_customer_count, v_enrollment_count, v_billing_count, v_transaction_count;
END $$;

-- Step 2: Create the billing months generation function
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
  
  -- Get plan details to know duration
  SELECT st.duration_months
  INTO v_plan
  FROM scheme_templates st
  WHERE st.id = v_enrollment.plan_id;
  
  IF NOT FOUND THEN
    RAISE WARNING 'Plan not found for enrollment: %, generating default 12 months', p_enrollment_id;
    v_months_to_generate := 12;
  ELSE
    v_months_to_generate := v_plan.duration_months + p_months_ahead;
  END IF;
  
  -- Generate billing months from start_date to duration_months + p_months_ahead
  FOR v_month_offset IN 0..v_months_to_generate-1 LOOP
    -- Calculate billing month (first day of month)
    v_billing_month := DATE_TRUNC('month', v_enrollment.start_date + (v_month_offset || ' months')::interval)::date;
    
    -- Calculate due date: next month on billing_day_of_month
    IF v_enrollment.billing_day_of_month IS NOT NULL THEN
      -- Due date is in the NEXT month after billing_month
      v_due_date := v_billing_month + interval '1 month';
      -- Set the day (clamping to last day of month if needed)
      v_due_date := (
        DATE_TRUNC('month', v_due_date) + 
        (LEAST(v_enrollment.billing_day_of_month, 
               EXTRACT(DAY FROM (DATE_TRUNC('month', v_due_date) + interval '1 month' - interval '1 day'))::int) - 1
        ) || ' days'
      )::interval::date;
    ELSE
      -- Default: due date is last day of billing_month
      v_due_date := (DATE_TRUNC('month', v_billing_month) + interval '1 month' - interval '1 day')::date;
    END IF;
    
    -- Insert if not exists
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
      CASE 
        WHEN v_due_date < CURRENT_DATE THEN 'MISSED'
        ELSE 'DUE'
      END
    )
    ON CONFLICT (enrollment_id, billing_month) DO NOTHING;
  END LOOP;
  
  RAISE NOTICE 'Generated % billing months for enrollment %', v_months_to_generate, p_enrollment_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Create trigger function to auto-generate on enrollment insert
CREATE OR REPLACE FUNCTION auto_generate_billing_months()
RETURNS TRIGGER AS $$
BEGIN
  -- Generate billing months for new enrollment (plan duration + 3 months ahead)
  PERFORM generate_billing_months_for_enrollment(NEW.id, 3);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Create the trigger (drop first if exists)
DROP TRIGGER IF EXISTS trigger_auto_generate_billing_months ON enrollments;
CREATE TRIGGER trigger_auto_generate_billing_months
  AFTER INSERT ON enrollments
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_billing_months();

-- Step 5: Create function to update primary_paid on payment
CREATE OR REPLACE FUNCTION update_billing_month_on_payment()
RETURNS TRIGGER AS $$
DECLARE
  v_billing_month date;
BEGIN
  -- Only process PRIMARY_INSTALLMENT transactions with SUCCESS status
  IF NEW.txn_type = 'PRIMARY_INSTALLMENT' AND NEW.payment_status = 'SUCCESS' THEN
    -- billing_month should be set on the transaction
    v_billing_month := NEW.billing_month;
    
    IF v_billing_month IS NULL THEN
      -- Fallback: use first day of current month
      v_billing_month := DATE_TRUNC('month', CURRENT_DATE)::date;
    END IF;
    
    -- Update the billing_month record
    UPDATE enrollment_billing_months
    SET 
      primary_paid = true,
      status = 'PAID'
    WHERE enrollment_id = NEW.enrollment_id
      AND billing_month = v_billing_month;
      
    -- If no record exists, create one
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

-- Step 6: Create trigger for transactions
DROP TRIGGER IF EXISTS trigger_update_billing_month_on_payment ON transactions;
CREATE TRIGGER trigger_update_billing_month_on_payment
  AFTER INSERT ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_billing_month_on_payment();

-- Step 7: Generate billing months for ALL existing enrollments
DO $$
DECLARE
  v_enrollment_id uuid;
  v_count int := 0;
BEGIN
  FOR v_enrollment_id IN 
    SELECT id FROM enrollments
  LOOP
    BEGIN
      PERFORM generate_billing_months_for_enrollment(v_enrollment_id, 3);
      v_count := v_count + 1;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Failed to generate billing months for enrollment %: %', v_enrollment_id, SQLERRM;
    END;
  END LOOP;
  
  RAISE NOTICE 'Generated billing months for % enrollments', v_count;
END $$;

-- Step 8: Update primary_paid for existing transactions
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

-- Step 9: Verify the fix worked
SELECT 
  'VERIFICATION' as step,
  (SELECT COUNT(*) FROM customers) as customers,
  (SELECT COUNT(*) FROM enrollments) as enrollments,
  (SELECT COUNT(*) FROM enrollment_billing_months) as billing_months,
  (SELECT COUNT(*) FROM enrollment_billing_months WHERE primary_paid = true) as months_paid,
  (SELECT COUNT(*) FROM transactions WHERE payment_status = 'SUCCESS') as transactions;

-- Step 10: Show sample data
SELECT 
  c.full_name as customer_name,
  e.id as enrollment_id,
  st.name as plan_name,
  COUNT(ebm.id) as total_billing_months,
  SUM(CASE WHEN ebm.primary_paid THEN 1 ELSE 0 END) as months_paid,
  COUNT(t.id) as transaction_count,
  SUM(t.amount_paid) as total_paid
FROM customers c
JOIN enrollments e ON e.customer_id = c.id
LEFT JOIN scheme_templates st ON st.id = e.plan_id
LEFT JOIN enrollment_billing_months ebm ON ebm.enrollment_id = e.id
LEFT JOIN transactions t ON t.enrollment_id = e.id AND t.payment_status = 'SUCCESS'
GROUP BY c.full_name, e.id, st.name
ORDER BY c.full_name;
