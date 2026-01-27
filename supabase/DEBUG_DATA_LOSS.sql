-- DEBUG: Check Data Integrity
-- Run this in Supabase SQL Editor to see what data exists

-- 1. Check customers
SELECT 
  'CUSTOMERS' as table_name,
  COUNT(*) as count,
  jsonb_agg(jsonb_build_object('id', id, 'name', full_name, 'phone', phone)) as sample_data
FROM customers
WHERE retailer_id = (SELECT retailer_id FROM user_profiles WHERE id = auth.uid())
GROUP BY 1;

-- 2. Check enrollments
SELECT 
  'ENROLLMENTS' as table_name,
  COUNT(*) as count,
  jsonb_agg(jsonb_build_object(
    'id', id, 
    'customer_id', customer_id, 
    'plan_id', plan_id,
    'status', status,
    'created_at', created_at
  )) as sample_data
FROM enrollments
WHERE retailer_id = (SELECT retailer_id FROM user_profiles WHERE id = auth.uid())
GROUP BY 1;

-- 3. Check if enrollment has billing months
SELECT 
  'BILLING_MONTHS' as table_name,
  e.id as enrollment_id,
  COUNT(ebm.id) as billing_months_count,
  SUM(CASE WHEN ebm.primary_paid THEN 1 ELSE 0 END) as months_paid
FROM enrollments e
LEFT JOIN enrollment_billing_months ebm ON ebm.enrollment_id = e.id
WHERE e.retailer_id = (SELECT retailer_id FROM user_profiles WHERE id = auth.uid())
GROUP BY 1, 2;

-- 4. Check transactions
SELECT 
  'TRANSACTIONS' as table_name,
  COUNT(*) as count,
  SUM(amount_paid) as total_paid
FROM transactions
WHERE retailer_id = (SELECT retailer_id FROM user_profiles WHERE id = auth.uid())
AND payment_status = 'SUCCESS'
GROUP BY 1;

-- 5. Check if triggers exist
SELECT 
  'TRIGGERS' as table_name,
  trigger_name,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name IN (
  'trigger_auto_generate_billing_months',
  'trigger_update_billing_month_on_payment'
)
ORDER BY trigger_name;

-- 6. Check foreign key constraints that might cause deletions
SELECT
  tc.table_name, 
  kcu.column_name, 
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  rc.delete_rule
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints AS rc
  ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_name IN ('customers', 'enrollments', 'enrollment_billing_months', 'transactions')
ORDER BY tc.table_name, kcu.column_name;
