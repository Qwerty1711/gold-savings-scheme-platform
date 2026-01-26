-- Check actual columns in transactions table
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'transactions'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Also check enrollments table columns
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'enrollments'
  AND table_schema = 'public'
ORDER BY ordinal_position;
