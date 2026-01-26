-- **EMERGENCY DATA CHECK**
-- First check what tables and columns actually exist, then query them

-- ===== STEP 1: CHECK WHAT TABLES EXIST =====
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
  AND table_name IN ('customers', 'enrollments', 'schemes', 'transactions')
ORDER BY table_name;

-- ===== STEP 2: CHECK CUSTOMERS TABLE COLUMNS =====
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'customers'
ORDER BY ordinal_position;

-- ===== STEP 3: CHECK ENROLLMENTS TABLE COLUMNS (if exists) =====
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'enrollments'
ORDER BY ordinal_position;

-- ===== STEP 4: CHECK SCHEMES TABLE COLUMNS (if exists) =====
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'schemes'
ORDER BY ordinal_position;

-- ===== STEP 5: COUNT RECORDS =====
-- Count customers
SELECT 'customers' as table_name, COUNT(*) as total_records FROM customers
UNION ALL
-- Count enrollments (if table exists)
SELECT 'enrollments' as table_name, COUNT(*) as total_records FROM enrollments
UNION ALL
-- Count transactions
SELECT 'transactions' as table_name, COUNT(*) as total_records FROM transactions;

-- ===== STEP 6: CHECK YOUR USER'S RETAILER =====
SELECT 
  auth.uid() as current_user_id,
  up.retailer_id,
  up.role
FROM user_profiles up
WHERE up.id = auth.uid();
