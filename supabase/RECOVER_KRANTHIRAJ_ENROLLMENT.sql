-- ============================================================
-- RECOVER KRANTHIRAJ ENROLLMENT FROM ORPHANED TRANSACTIONS
-- ============================================================
-- Run this in Supabase SQL Editor to restore the deleted enrollment

-- STEP 1: Extract enrollment details from orphaned transactions
DO $$
DECLARE
  v_enrollment_id uuid;
  v_customer_id uuid;
  v_retailer_id uuid;
  v_plan_id uuid;
  v_start_date date;
  v_earliest_transaction timestamptz;
  v_commitment_amount decimal;
  v_transaction_count int;
BEGIN
  RAISE NOTICE '=== STEP 1: Analyzing orphaned transactions ===';
  
  -- Get enrollment details from orphaned transactions
  SELECT 
    t.enrollment_id,
    t.customer_id,
    t.retailer_id,
    MIN(t.created_at) as earliest_txn,
    MIN(t.billing_month) as start_date,
    COUNT(*) as txn_count
  INTO 
    v_enrollment_id,
    v_customer_id,
    v_retailer_id,
    v_earliest_transaction,
    v_start_date,
    v_transaction_count
  FROM transactions t
  LEFT JOIN enrollments e ON e.id = t.enrollment_id
  WHERE e.id IS NULL  -- orphaned
  GROUP BY t.enrollment_id, t.customer_id, t.retailer_id;
  
  IF v_enrollment_id IS NULL THEN
    RAISE EXCEPTION 'No orphaned transactions found!';
  END IF;
  
  RAISE NOTICE 'Found enrollment_id: %', v_enrollment_id;
  RAISE NOTICE 'Customer ID: %', v_customer_id;
  RAISE NOTICE 'Retailer ID: %', v_retailer_id;
  RAISE NOTICE 'Transaction count: %', v_transaction_count;
  RAISE NOTICE 'Start date: %', v_start_date;
  
  -- Show transaction details
  RAISE NOTICE '';
  RAISE NOTICE '=== Transaction Details ===';
  FOR v_plan_id IN
    SELECT DISTINCT
      t.txn_type,
      t.amount_paid,
      t.billing_month,
      t.payment_status,
      t.created_at
    FROM transactions t
    WHERE t.enrollment_id = v_enrollment_id
    ORDER BY t.created_at
  LOOP
    RAISE NOTICE 'Transaction: % | Amount: % | Month: % | Status: % | Date: %',
      v_plan_id;
  END LOOP;
END $$;

-- STEP 2: Show all plan options for manual selection
SELECT 
  '=== AVAILABLE PLANS ===' as info,
  st.id as plan_id,
  st.name as plan_name,
  st.duration_months,
  st.min_monthly_amount,
  st.max_monthly_amount,
  st.description
FROM scheme_templates st
ORDER BY st.duration_months, st.min_monthly_amount;

-- STEP 3: Interactive recovery (MANUAL - FILL IN THE BLANKS)
-- Replace these values based on what you remember:
DO $$
DECLARE
  v_enrollment_id uuid;
  v_customer_id uuid;
  v_retailer_id uuid;
  v_plan_id uuid;  -- ⚠️ YOU MUST FILL THIS IN from the plan list above
  v_commitment_amount decimal;  -- ⚠️ YOU MUST FILL THIS IN (monthly commitment)
  v_start_date date;
  v_maturity_date date;
  v_plan_duration int;
BEGIN
  RAISE NOTICE '=== STEP 3: Reconstructing enrollment ===';
  
  -- Get enrollment details from transactions
  SELECT 
    t.enrollment_id,
    t.customer_id,
    t.retailer_id,
    MIN(t.billing_month) as start_date
  INTO 
    v_enrollment_id,
    v_customer_id,
    v_retailer_id,
    v_start_date
  FROM transactions t
  LEFT JOIN enrollments e ON e.id = t.enrollment_id
  WHERE e.id IS NULL
  GROUP BY t.enrollment_id, t.customer_id, t.retailer_id;
  
  -- ⚠️⚠️⚠️ FILL IN THESE VALUES MANUALLY ⚠️⚠️⚠️
  -- Look at the plan list above and enter the correct plan_id here:
  v_plan_id := NULL;  -- ⚠️ REPLACE NULL WITH: '<plan_id_from_above>'::uuid
  v_commitment_amount := NULL;  -- ⚠️ REPLACE NULL WITH: actual monthly amount (e.g., 1000.00)
  
  IF v_plan_id IS NULL OR v_commitment_amount IS NULL THEN
    RAISE EXCEPTION 'You must manually fill in v_plan_id and v_commitment_amount!';
  END IF;
  
  -- Get plan duration
  SELECT duration_months INTO v_plan_duration
  FROM scheme_templates
  WHERE id = v_plan_id;
  
  -- Calculate maturity date
  v_maturity_date := (v_start_date + (v_plan_duration || ' months')::interval)::date;
  
  RAISE NOTICE 'Recreating enrollment:';
  RAISE NOTICE '  ID: %', v_enrollment_id;
  RAISE NOTICE '  Plan: %', v_plan_id;
  RAISE NOTICE '  Start: %', v_start_date;
  RAISE NOTICE '  Maturity: %', v_maturity_date;
  RAISE NOTICE '  Commitment: %', v_commitment_amount;
  
  -- Recreate the enrollment
  INSERT INTO enrollments (
    id,
    retailer_id,
    customer_id,
    plan_id,
    start_date,
    maturity_date,
    commitment_amount,
    status,
    billing_day_of_month,
    created_at,
    updated_at
  )
  VALUES (
    v_enrollment_id,
    v_retailer_id,
    v_customer_id,
    v_plan_id,
    v_start_date,
    v_maturity_date,
    v_commitment_amount,
    'ACTIVE',
    NULL,  -- end of month billing
    (SELECT MIN(created_at) FROM transactions WHERE enrollment_id = v_enrollment_id),
    CURRENT_TIMESTAMP
  );
  
  RAISE NOTICE '✅ Enrollment recreated successfully!';
  RAISE NOTICE '';
  RAISE NOTICE 'Next: Run SAFE_ADD_TRIGGERS_ONLY.sql to generate billing months';
END $$;
