-- Check current RLS policies on transactions table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'transactions'
ORDER BY policyname;

-- Check if RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'transactions';
