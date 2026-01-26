-- Check if required tables exist for the Pulse dashboard

-- Check enrollments table
SELECT 'enrollments' as table_name, 
       COUNT(*) as column_count,
       string_agg(column_name, ', ' ORDER BY ordinal_position) as columns
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'enrollments'
GROUP BY table_name;

-- Check enrollment_billing_months table  
SELECT 'enrollment_billing_months' as table_name,
       COUNT(*) as column_count,
       string_agg(column_name, ', ' ORDER BY ordinal_position) as columns
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'enrollment_billing_months'
GROUP BY table_name;

-- Check if karat column exists in enrollments
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'enrollments'
  AND column_name = 'karat';

-- Check RLS policies on enrollments
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'enrollments';

-- Check RLS policies on enrollment_billing_months
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'enrollment_billing_months';
