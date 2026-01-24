-- Check if RLS policies exist and are correct
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
WHERE tablename IN ('retailers', 'stores', 'user_profiles')
ORDER BY tablename, policyname;
