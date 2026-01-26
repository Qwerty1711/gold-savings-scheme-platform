/*
  # Data Cleanup: Ensure All Enrollments Have Proper Status
  
  Run this in Supabase SQL Editor to ensure data consistency
*/

-- 1. Check current enrollment status distribution
SELECT 
    COALESCE(status::text, 'NULL/MISSING') as status,
    COUNT(*) as count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM enrollments
GROUP BY status
ORDER BY count DESC;

-- 2. Set default ACTIVE status for any enrollments without status
UPDATE enrollments 
SET status = 'ACTIVE' 
WHERE status IS NULL;

-- 3. Verify all customers have status
SELECT 
    COALESCE(status::text, 'NULL/MISSING') as status,
    COUNT(*) as count
FROM customers
GROUP BY status;

-- 4. Set default ACTIVE status for customers without status
UPDATE customers 
SET status = 'ACTIVE' 
WHERE status IS NULL;

-- 5. Final verification - show all customers with their enrollment counts
SELECT 
    c.full_name,
    c.phone,
    c.status as customer_status,
    COUNT(e.id) as total_enrollments,
    COUNT(CASE WHEN e.status = 'ACTIVE' THEN 1 END) as active_enrollments,
    SUM(COALESCE(t.amount_paid, 0)) as total_paid
FROM customers c
LEFT JOIN enrollments e ON e.customer_id = c.id
LEFT JOIN transactions t ON t.enrollment_id = e.id AND t.payment_status = 'SUCCESS'
GROUP BY c.id, c.full_name, c.phone, c.status
ORDER BY c.full_name;

-- 6. Show enrollments without billing months (potential issue)
SELECT 
    e.id as enrollment_id,
    c.full_name as customer_name,
    st.name as plan_name,
    e.status,
    COUNT(ebm.id) as billing_month_records,
    COUNT(t.id) as transaction_count
FROM enrollments e
JOIN customers c ON c.id = e.customer_id
LEFT JOIN scheme_templates st ON st.id = e.plan_id
LEFT JOIN enrollment_billing_months ebm ON ebm.enrollment_id = e.id
LEFT JOIN transactions t ON t.enrollment_id = e.id
GROUP BY e.id, c.full_name, st.name, e.status
HAVING COUNT(ebm.id) = 0 OR COUNT(t.id) = 0
ORDER BY c.full_name;

-- 7. Summary report
SELECT 
    'Total Customers' as metric,
    COUNT(*)::text as value
FROM customers
UNION ALL
SELECT 
    'Customers with Status ACTIVE' as metric,
    COUNT(*)::text as value
FROM customers
WHERE status = 'ACTIVE'
UNION ALL
SELECT 
    'Total Enrollments' as metric,
    COUNT(*)::text as value
FROM enrollments
UNION ALL
SELECT 
    'Active Enrollments' as metric,
    COUNT(*)::text as value
FROM enrollments
WHERE status = 'ACTIVE'
UNION ALL
SELECT 
    'Customers with Active Enrollments' as metric,
    COUNT(DISTINCT customer_id)::text as value
FROM enrollments
WHERE status = 'ACTIVE';
