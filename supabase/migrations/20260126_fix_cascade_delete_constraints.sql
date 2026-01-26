-- **FIX ONLY DANGEROUS CASCADE DELETE CONSTRAINTS**
-- Only changes constraints that could cause accidental data loss
-- Keeps safe CASCADE rules for orphaned child data cleanup

-- ============================================
-- STEP 1: Audit current constraints
-- ============================================
DO $$ 
DECLARE
  fk_record RECORD;
BEGIN
  RAISE NOTICE '🔍 Auditing CASCADE DELETE constraints...';
  
  FOR fk_record IN
    SELECT
      tc.table_name,
      tc.constraint_name,
      kcu.column_name,
      ccu.table_name AS foreign_table_name,
      rc.delete_rule
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
    JOIN information_schema.referential_constraints AS rc
      ON tc.constraint_name = rc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND rc.delete_rule = 'CASCADE'
      AND tc.table_name IN ('enrollments', 'customers', 'transactions')
      AND ccu.table_name IN ('retailers', 'customers', 'enrollments')
  LOOP
    RAISE NOTICE '  🚨 DANGEROUS: %.% → %.% (CASCADE)', 
      fk_record.table_name, 
      fk_record.column_name,
      fk_record.foreign_table_name,
      fk_record.constraint_name;
  END LOOP;
END $$;

-- ============================================
-- STEP 2: Fix CUSTOMERS → RETAILERS (CRITICAL)
-- ============================================
-- If retailer deleted, DON'T delete all customers
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.referential_constraints
    WHERE constraint_name = 'customers_retailer_id_fkey'
      AND delete_rule = 'CASCADE'
  ) THEN
    ALTER TABLE customers DROP CONSTRAINT customers_retailer_id_fkey;
    ALTER TABLE customers
      ADD CONSTRAINT customers_retailer_id_fkey 
      FOREIGN KEY (retailer_id) 
      REFERENCES retailers(id) 
      ON DELETE RESTRICT;
    RAISE NOTICE '✅ Fixed: customers → retailers (CASCADE → RESTRICT)';
  END IF;
END $$;

-- ============================================
-- STEP 3: Fix ENROLLMENTS → RETAILERS (CRITICAL)
-- ============================================
-- If retailer deleted, DON'T delete all enrollments
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.referential_constraints
    WHERE constraint_name = 'enrollments_retailer_id_fkey'
      AND delete_rule = 'CASCADE'
  ) THEN
    ALTER TABLE enrollments DROP CONSTRAINT enrollments_retailer_id_fkey;
    ALTER TABLE enrollments
      ADD CONSTRAINT enrollments_retailer_id_fkey 
      FOREIGN KEY (retailer_id) 
      REFERENCES retailers(id) 
      ON DELETE RESTRICT;
    RAISE NOTICE '✅ Fixed: enrollments → retailers (CASCADE → RESTRICT)';
  END IF;
END $$;

-- ============================================
-- STEP 4: Fix TRANSACTIONS → RETAILERS (CRITICAL)
-- ============================================
-- If retailer deleted, DON'T delete payment history
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.referential_constraints
    WHERE constraint_name = 'transactions_retailer_id_fkey'
      AND delete_rule = 'CASCADE'
  ) THEN
    ALTER TABLE transactions DROP CONSTRAINT transactions_retailer_id_fkey;
    ALTER TABLE transactions
      ADD CONSTRAINT transactions_retailer_id_fkey 
      FOREIGN KEY (retailer_id) 
      REFERENCES retailers(id) 
      ON DELETE RESTRICT;
    RAISE NOTICE '✅ Fixed: transactions → retailers (CASCADE → RESTRICT)';
  END IF;
END $$;

-- ============================================
-- STEP 5: Fix TRANSACTIONS → ENROLLMENTS (RISKY)
-- ============================================
-- If enrollment deleted, DON'T delete payment history
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.referential_constraints
    WHERE constraint_name = 'transactions_enrollment_id_fkey'
      AND delete_rule = 'CASCADE'
  ) THEN
    ALTER TABLE transactions DROP CONSTRAINT transactions_enrollment_id_fkey;
    ALTER TABLE transactions
      ADD CONSTRAINT transactions_enrollment_id_fkey 
      FOREIGN KEY (enrollment_id) 
      REFERENCES enrollments(id) 
      ON DELETE RESTRICT;
    RAISE NOTICE '✅ Fixed: transactions → enrollments (CASCADE → RESTRICT)';
  END IF;
END $$;

-- ============================================
-- STEP 6: Fix TRANSACTIONS → CUSTOMERS (RISKY)
-- ============================================
-- If customer deleted, DON'T delete payment history
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.referential_constraints
    WHERE constraint_name = 'transactions_customer_id_fkey'
      AND delete_rule = 'CASCADE'
  ) THEN
    ALTER TABLE transactions DROP CONSTRAINT transactions_customer_id_fkey;
    ALTER TABLE transactions
      ADD CONSTRAINT transactions_customer_id_fkey 
      FOREIGN KEY (customer_id) 
      REFERENCES customers(id) 
      ON DELETE RESTRICT;
    RAISE NOTICE '✅ Fixed: transactions → customers (CASCADE → RESTRICT)';
  END IF;
END $$;

-- ============================================
-- STEP 7: Fix ENROLLMENTS → CUSTOMERS (DEBATABLE)
-- ============================================
-- If customer deleted, should enrollments also delete?
-- Decision: NO - require explicit cleanup
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.referential_constraints
    WHERE constraint_name = 'enrollments_customer_id_fkey'
      AND delete_rule = 'CASCADE'
  ) THEN
    ALTER TABLE enrollments DROP CONSTRAINT enrollments_customer_id_fkey;
    ALTER TABLE enrollments
      ADD CONSTRAINT enrollments_customer_id_fkey 
      FOREIGN KEY (customer_id) 
      REFERENCES customers(id) 
      ON DELETE RESTRICT;
    RAISE NOTICE '✅ Fixed: enrollments → customers (CASCADE → RESTRICT)';
  END IF;
END $$;

-- ============================================
-- KEEP SAFE CASCADE RULES (DO NOT CHANGE)
-- ============================================
-- These are left as CASCADE intentionally:
-- ✅ enrollment_billing_months → enrollments (orphaned child data)
-- ✅ notifications → customers/enrollments (disposable data)
-- ✅ reminders → enrollments (disposable data)

-- ============================================
-- VERIFICATION
-- ============================================
SELECT
  '🛡️ Data Protection Summary' as report_type,
  COUNT(*) FILTER (
    WHERE tc.table_name IN ('customers', 'enrollments', 'transactions')
      AND ccu.table_name IN ('retailers', 'customers', 'enrollments')
      AND rc.delete_rule = 'CASCADE'
  ) as remaining_dangerous_cascades,
  COUNT(*) FILTER (
    WHERE tc.table_name IN ('customers', 'enrollments', 'transactions')
      AND ccu.table_name IN ('retailers', 'customers', 'enrollments')
      AND rc.delete_rule = 'RESTRICT'
  ) as safe_restrictions
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints AS rc
  ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY';

-- Show final state
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS references_table,
  rc.delete_rule,
  tc.constraint_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints AS rc
  ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name IN ('customers', 'enrollments', 'transactions', 'enrollment_billing_months')
ORDER BY tc.table_name, kcu.column_name;
