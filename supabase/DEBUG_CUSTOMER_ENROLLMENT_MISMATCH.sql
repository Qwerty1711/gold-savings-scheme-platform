-- Run this in Supabase SQL Editor to debug customer/enrollment data

-- Check all customers and their enrollment counts
SELECT 
    c.id,
    c.full_name,
    c.phone,
    c.status as customer_status,
    COUNT(e.id) as enrollment_count,
    COUNT(CASE WHEN e.status = 'ACTIVE' THEN 1 END) as active_enrollment_count,
    STRING_AGG(DISTINCT e.status::text, ', ') as enrollment_statuses
FROM customers c
LEFT JOIN enrollments e ON e.customer_id = c.id
GROUP BY c.id, c.full_name, c.phone, c.status
ORDER BY c.full_name;

-- Check enrollment status distribution
SELECT 
    status,
    COUNT(*) as count
FROM enrollments
GROUP BY status;

-- Check if enrollment_billing_months table exists and has data
SELECT 
    COUNT(*) as billing_month_records
FROM enrollment_billing_months;

-- Check customers without enrollments
SELECT 
    c.id,
    c.full_name,
    c.phone,
    c.status
FROM customers c
LEFT JOIN enrollments e ON e.customer_id = c.id
WHERE e.id IS NULL;
