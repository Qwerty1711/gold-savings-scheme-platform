-- ============================================================
-- Check for Orphaned Data After Enrollments Table Deletion
-- ============================================================
-- Run this in Supabase SQL Editor to see what data survived

-- Check if transaction data exists for kranthiraj
SELECT 
  'ORPHANED TRANSACTIONS' as data_type,
  t.id as transaction_id,
  t.enrollment_id as deleted_enrollment_id,
  t.customer_id,
  t.amount_paid,
  t.txn_type,
  t.payment_status,
  t.billing_month,
  t.created_at,
  t.gold_rate_id,
  gr.rate_per_gram,
  gr.effective_from as rate_date
FROM transactions t
LEFT JOIN enrollments e ON e.id = t.enrollment_id
LEFT JOIN gold_rates gr ON gr.id = t.gold_rate_id
WHERE e.id IS NULL  -- enrollment was deleted
ORDER BY t.created_at DESC;

-- Check customer data
SELECT 
  'CUSTOMER DATA' as data_type,
  c.id,
  c.full_name,
  c.phone,
  c.created_at,
  COUNT(t.id) as transaction_count,
  SUM(CASE WHEN t.payment_status = 'SUCCESS' THEN t.amount_paid ELSE 0 END) as total_paid
FROM customers c
LEFT JOIN transactions t ON t.customer_id = c.id
WHERE LOWER(c.full_name) LIKE '%kranthiraj%'
GROUP BY c.id, c.full_name, c.phone, c.created_at;

-- Check all customers with orphaned transactions
SELECT 
  'CUSTOMERS WITH ORPHANED DATA' as data_type,
  c.full_name,
  c.phone,
  COUNT(DISTINCT t.id) as orphaned_transactions,
  SUM(CASE WHEN t.payment_status = 'SUCCESS' THEN t.amount_paid ELSE 0 END) as lost_amount
FROM customers c
INNER JOIN transactions t ON t.customer_id = c.id
LEFT JOIN enrollments e ON e.id = t.enrollment_id
WHERE e.id IS NULL
GROUP BY c.full_name, c.phone
ORDER BY lost_amount DESC;

-- Show database state summary
SELECT 
  'customers' as table_name,
  COUNT(*) as row_count
FROM customers
UNION ALL
SELECT 'enrollments', COUNT(*) FROM enrollments
UNION ALL
SELECT 'enrollment_billing_months', COUNT(*) FROM enrollment_billing_months
UNION ALL
SELECT 'transactions', COUNT(*) FROM transactions
UNION ALL
SELECT 'transactions_orphaned', COUNT(*) 
FROM transactions t
LEFT JOIN enrollments e ON e.id = t.enrollment_id
WHERE e.id IS NULL;
