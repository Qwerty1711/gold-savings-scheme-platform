-- **CLEAN SLATE: Delete all test data safely**
-- Run this to start fresh with no residual data

-- Disable triggers temporarily to avoid cascade issues
SET session_replication_role = replica;

-- 1. Delete transactions first (no dependencies)
DELETE FROM transactions;

-- 2. Delete enrollment billing months
DELETE FROM enrollment_billing_months;

-- 3. Delete enrollments
DELETE FROM enrollments;

-- 4. Delete customers
DELETE FROM customers;

-- 5. Delete notifications (if table exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') THEN
    DELETE FROM notifications;
  END IF;
END $$;

-- 6. Delete staff incentives (if table exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'staff_incentives') THEN
    DELETE FROM staff_incentives;
  END IF;
END $$;

-- 7. Delete reminders (if table exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'reminders') THEN
    DELETE FROM reminders;
  END IF;
END $$;

-- Re-enable triggers
SET session_replication_role = DEFAULT;

-- Verify cleanup
SELECT 
  'transactions' as table_name, 
  COUNT(*) as remaining_records 
FROM transactions
UNION ALL
SELECT 'enrollment_billing_months', COUNT(*) FROM enrollment_billing_months
UNION ALL
SELECT 'enrollments', COUNT(*) FROM enrollments
UNION ALL
SELECT 'customers', COUNT(*) FROM customers;

-- Success message
SELECT '✅ All test data cleaned!' as status;
