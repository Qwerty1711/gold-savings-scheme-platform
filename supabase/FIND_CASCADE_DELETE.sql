-- **FIND THE CASCADE DELETE CULPRIT**

-- 1. Check all foreign key constraints on enrollments table
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints AS rc
  ON tc.constraint_name = rc.constraint_name
WHERE tc.table_name = 'enrollments'
  AND tc.constraint_type = 'FOREIGN KEY';

-- 2. Check transactions table foreign keys
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints AS rc
  ON tc.constraint_name = rc.constraint_name
WHERE tc.table_name = 'transactions'
  AND tc.constraint_type = 'FOREIGN KEY';

-- 3. Show full transaction data to see if we can recover enrollments
SELECT 
  id as transaction_id,
  customer_id,
  retailer_id,
  enrollment_id,
  amount_paid,
  created_at
FROM transactions
ORDER BY created_at;

-- 4. Show unique enrollment_ids from transactions (these were deleted)
SELECT DISTINCT 
  enrollment_id,
  COUNT(*) as transaction_count
FROM transactions
WHERE enrollment_id IS NOT NULL
GROUP BY enrollment_id;
