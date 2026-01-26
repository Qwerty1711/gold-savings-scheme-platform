-- **CRITICAL: Check if enrollments table exists and has the right structure**

-- 1. Does enrollments table exist?
SELECT EXISTS (
  SELECT 1 FROM information_schema.tables 
  WHERE table_name = 'enrollments' AND table_schema = 'public'
) as enrollments_table_exists;

-- 2. What columns does enrollments have?
SELECT column_name, data_type 
FROM information_schema.columns
WHERE table_name = 'enrollments' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. Check actual enrollment data
SELECT COUNT(*) as enrollment_count FROM enrollments;

-- 4. Show what columns transactions has (to see what it references)
SELECT column_name, data_type 
FROM information_schema.columns
WHERE table_name = 'transactions' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 5. Check what transactions reference
SELECT 
  id,
  customer_id,
  retailer_id,
  amount_paid,
  created_at
FROM transactions
ORDER BY created_at DESC
LIMIT 5;
