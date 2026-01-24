-- Check what objects are views vs tables
SELECT 
  table_name,
  CASE 
    WHEN table_type = 'VIEW' THEN 'VIEW'
    WHEN table_type = 'BASE TABLE' THEN 'TABLE'
    ELSE table_type
  END as object_type
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('enrollments', 'notification_queue', 'enrollment_billing_months', 'transactions', 'customers')
ORDER BY table_name;
