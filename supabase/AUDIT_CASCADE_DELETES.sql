-- **AUDIT: Find dangerous CASCADE DELETE constraints**
-- This shows which constraints could cause accidental data loss

SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS references_table,
  ccu.column_name AS references_column,
  rc.delete_rule,
  CASE 
    -- DANGEROUS: Core business data referencing retailer
    WHEN tc.table_name IN ('customers', 'enrollments', 'transactions') 
         AND ccu.table_name = 'retailers'
         AND rc.delete_rule = 'CASCADE'
    THEN '🚨 DANGEROUS - Would delete customer data if retailer deleted'
    
    -- DANGEROUS: Transactions referencing customers/enrollments
    WHEN tc.table_name = 'transactions'
         AND ccu.table_name IN ('customers', 'enrollments')
         AND rc.delete_rule = 'CASCADE'
    THEN '⚠️  RISKY - Would delete payment history'
    
    -- SAFE: Child records that are meaningless without parent
    WHEN tc.table_name = 'enrollment_billing_months'
         AND ccu.table_name = 'enrollments'
         AND rc.delete_rule = 'CASCADE'
    THEN '✅ SAFE - Orphaned child data cleanup'
    
    -- SAFE: Notifications/reminders
    WHEN tc.table_name IN ('notifications', 'reminders')
         AND rc.delete_rule = 'CASCADE'
    THEN '✅ SAFE - Disposable notification data'
    
    ELSE '⚪ Review needed'
  END as assessment,
  tc.constraint_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints AS rc
  ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name IN (
    'customers', 
    'enrollments', 
    'transactions', 
    'enrollment_billing_months',
    'notifications',
    'reminders',
    'staff_incentives'
  )
ORDER BY 
  CASE 
    WHEN tc.table_name IN ('customers', 'enrollments', 'transactions') 
         AND ccu.table_name = 'retailers'
         AND rc.delete_rule = 'CASCADE'
    THEN 1
    WHEN tc.table_name = 'transactions'
         AND ccu.table_name IN ('customers', 'enrollments')
         AND rc.delete_rule = 'CASCADE'
    THEN 2
    WHEN tc.table_name = 'enrollment_billing_months'
         AND ccu.table_name = 'enrollments'
         AND rc.delete_rule = 'CASCADE'
    THEN 4
    ELSE 3
  END,
  tc.table_name;
