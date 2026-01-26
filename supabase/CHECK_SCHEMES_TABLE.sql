-- Check what happened to enrollment data

-- 1. List all tables you have
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- 2. Check transactions columns (to see if they reference enrollments)
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'transactions'
ORDER BY ordinal_position;

-- 3. Show your 4 transactions with all columns
SELECT *
FROM transactions
ORDER BY created_at DESC;

-- 4. Check enrollment_billing_months table (if exists)
SELECT COUNT(*) as billing_months_count 
FROM enrollment_billing_months;

-- 5. Check if there are orphaned references
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'enrollment_billing_months'
ORDER BY ordinal_position;
