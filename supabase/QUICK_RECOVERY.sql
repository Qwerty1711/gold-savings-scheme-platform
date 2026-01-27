-- ============================================================
-- QUICK RECOVERY: Auto-detect enrollment details
-- ============================================================
-- This tries to automatically recover the enrollment
-- Run this ONLY if you remember which plan kranthiraj was enrolled in

-- First, let's see what transactions exist and guess the plan
WITH orphaned_txns AS (
  SELECT 
    t.enrollment_id,
    t.customer_id,
    t.retailer_id,
    MIN(t.billing_month) as start_date,
    MIN(t.created_at) as created_at,
    COUNT(*) FILTER (WHERE t.txn_type = 'PRIMARY_INSTALLMENT') as primary_count,
    COUNT(*) FILTER (WHERE t.txn_type = 'TOP_UP') as topup_count,
    SUM(t.amount_paid) FILTER (WHERE t.txn_type = 'PRIMARY_INSTALLMENT') as primary_total,
    SUM(t.amount_paid) FILTER (WHERE t.txn_type = 'TOP_UP') as topup_total,
    MAX(t.amount_paid) FILTER (WHERE t.txn_type = 'PRIMARY_INSTALLMENT') as likely_commitment
  FROM transactions t
  LEFT JOIN enrollments e ON e.id = t.enrollment_id
  WHERE e.id IS NULL
  GROUP BY t.enrollment_id, t.customer_id, t.retailer_id
),
customer_info AS (
  SELECT c.full_name, c.phone, ot.*
  FROM orphaned_txns ot
  JOIN customers c ON c.id = ot.customer_id
)
SELECT 
  '🔍 ORPHANED ENROLLMENT DETECTED' as status,
  ci.full_name as customer_name,
  ci.phone,
  ci.enrollment_id,
  ci.start_date,
  ci.primary_count as monthly_payments_made,
  ci.topup_count as topup_payments_made,
  ci.primary_total as total_monthly_paid,
  ci.topup_total as total_topup_paid,
  ci.likely_commitment as guessed_monthly_commitment
FROM customer_info ci;

-- Show available plans to choose from
SELECT 
  '📋 AVAILABLE PLANS' as info,
  st.id as plan_id,
  st.name as plan_name,
  st.duration_months || ' months' as duration,
  '₹' || st.installment_amount as installment_amount,
  st.bonus_percentage || '%' as bonus
FROM scheme_templates st
WHERE st.is_active = true
ORDER BY st.duration_months, st.installment_amount;

-- ============================================================
-- MANUAL RECOVERY SCRIPT
-- ============================================================
-- Copy this block, fill in the values, and run it:

/*
DO $$
DECLARE
  v_plan_id uuid := '<PASTE_PLAN_ID_HERE>'::uuid;  -- From plan list above
  v_commitment_amount decimal := 0000.00;  -- The actual monthly commitment amount
BEGIN
  -- Auto-recover enrollment from orphaned transactions
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
  SELECT 
    t.enrollment_id,
    t.retailer_id,
    t.customer_id,
    v_plan_id,
    MIN(t.billing_month),
    (MIN(t.billing_month) + (st.duration_months || ' months')::interval)::date,
    v_commitment_amount,
    'ACTIVE',
    NULL,
    MIN(t.created_at),
    CURRENT_TIMESTAMP
  FROM transactions t
  LEFT JOIN enrollments e ON e.id = t.enrollment_id
  CROSS JOIN scheme_templates st
  WHERE e.id IS NULL
    AND st.id = v_plan_id
  GROUP BY t.enrollment_id, t.retailer_id, t.customer_id, st.duration_months;
  
  RAISE NOTICE '✅ Enrollment recovered! ID: %', (
    SELECT enrollment_id FROM transactions 
    WHERE enrollment_id NOT IN (SELECT id FROM enrollments WHERE id IS NOT NULL)
    LIMIT 1
  );
  
  RAISE NOTICE '📝 Next step: Run SAFE_ADD_TRIGGERS_ONLY.sql to generate billing months';
END $$;
*/

-- ============================================================
-- After recovery, verify the enrollment was recreated:
-- ============================================================
/*
SELECT 
  '✅ RECOVERY VERIFICATION' as status,
  c.full_name,
  e.id as enrollment_id,
  st.name as plan,
  e.start_date,
  e.maturity_date,
  e.commitment_amount,
  e.status,
  COUNT(t.id) as transactions_linked
FROM enrollments e
JOIN customers c ON c.id = e.customer_id
JOIN scheme_templates st ON st.id = e.plan_id
LEFT JOIN transactions t ON t.enrollment_id = e.id
GROUP BY c.full_name, e.id, st.name, e.start_date, e.maturity_date, e.commitment_amount, e.status;
*/
