-- **CRITICAL PERFORMANCE INDEXES**
-- These indexes speed up common queries by 10-100x
-- Safe to run multiple times (IF NOT EXISTS)

-- ============================================
-- TRANSACTIONS TABLE (Most queried)
-- ============================================

-- Index for retailer-scoped queries with date ordering
CREATE INDEX IF NOT EXISTS idx_transactions_retailer_date 
  ON transactions(retailer_id, created_at DESC);

-- Index for enrollment lookups (collections page, passbook)
-- Note: This uses enrollment_id if your schema has that column
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transactions' AND column_name='enrollment_id') THEN
    CREATE INDEX IF NOT EXISTS idx_transactions_enrollment_id ON transactions(enrollment_id);
  END IF;
END $$;

-- Index for customer transaction history
CREATE INDEX IF NOT EXISTS idx_transactions_customer_id 
  ON transactions(customer_id);

-- Index for transaction type filtering
CREATE INDEX IF NOT EXISTS idx_transactions_txn_type 
  ON transactions(retailer_id, txn_type);

-- Index for payment status tracking
CREATE INDEX IF NOT EXISTS idx_transactions_payment_status 
  ON transactions(retailer_id, payment_status);

-- Composite index for billing month queries (dues tracking)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transactions' AND column_name='billing_month') THEN
    CREATE INDEX IF NOT EXISTS idx_transactions_billing_month ON transactions(retailer_id, billing_month);
  END IF;
END $$;

-- ============================================
-- CUSTOMERS TABLE
-- ============================================

-- Index for active customers lookup (if is_active column exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customers' AND column_name='is_active') THEN
    CREATE INDEX IF NOT EXISTS idx_customers_retailer_active ON customers(retailer_id, is_active);
  END IF;
END $$;

-- Index for customer code lookups (search)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customers' AND column_name='customer_code') THEN
    CREATE INDEX IF NOT EXISTS idx_customers_code ON customers(retailer_id, customer_code);
  END IF;
END $$;

-- Index for phone number lookup (login, search)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customers' AND column_name='phone_number') THEN
    CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone_number);
  END IF;
END $$;

-- ============================================
-- ENROLLMENTS/SCHEMES TABLE
-- ============================================

-- Index for status filtering (active, completed, etc.)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='enrollments') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_enrollments_retailer_status ON enrollments(retailer_id, status)';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='schemes') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_schemes_retailer_status ON schemes(retailer_id, status)';
  END IF;
END $$;

-- Index for customer enrollments lookup
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='enrollments') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_enrollments_customer_id ON enrollments(customer_id, retailer_id)';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='schemes') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_schemes_customer_id ON schemes(customer_id, retailer_id)';
  END IF;
END $$;

-- Index for plan/template lookups
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='enrollments' AND column_name='plan_id') THEN
    CREATE INDEX IF NOT EXISTS idx_enrollments_plan ON enrollments(retailer_id, plan_id);
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='schemes' AND column_name='scheme_template_id') THEN
    CREATE INDEX IF NOT EXISTS idx_schemes_template ON schemes(retailer_id, scheme_template_id);
  END IF;
END $$;

-- ============================================
-- GOLD_RATES TABLE
-- ============================================

-- Index for latest rate lookup (heavily used)
CREATE INDEX IF NOT EXISTS idx_gold_rates_retailer_karat_date 
  ON gold_rates(retailer_id, karat, effective_from DESC);

-- Index for rate history queries
CREATE INDEX IF NOT EXISTS idx_gold_rates_retailer_date 
  ON gold_rates(retailer_id, effective_from DESC);

-- ============================================
-- USER_PROFILES TABLE
-- ============================================

-- Index for staff queries (leaderboard, assignments)
CREATE INDEX IF NOT EXISTS idx_user_profiles_retailer_role 
  ON user_profiles(retailer_id, role);

-- Index for store-based staff lookups (if store_id column exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_profiles' AND column_name='store_id') THEN
    CREATE INDEX IF NOT EXISTS idx_user_profiles_store ON user_profiles(retailer_id, store_id);
  END IF;
END $$;

-- ============================================
-- STORES TABLE (if exists)
-- ============================================

DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='stores') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_stores_retailer_active ON stores(retailer_id, is_active)';
  END IF;
END $$;

-- ============================================
-- NOTIFICATIONS TABLE (if exists)
-- ============================================

DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='notifications') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_notifications_customer_read ON notifications(customer_id, is_read, created_at DESC)';
  END IF;
END $$;

-- ============================================
-- STAFF_INCENTIVES TABLE (if exists)
-- ============================================

DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='staff_incentives') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_staff_incentives_staff_status ON staff_incentives(staff_id, status, earned_date DESC)';
  END IF;
END $$;

-- ============================================
-- REDEMPTIONS TABLE (if exists)
-- ============================================

DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='redemptions') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='redemptions' AND column_name='scheme_id') THEN
      EXECUTE 'CREATE INDEX IF NOT EXISTS idx_redemptions_scheme ON redemptions(scheme_id, redemption_date DESC)';
    ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='redemptions' AND column_name='enrollment_id') THEN
      EXECUTE 'CREATE INDEX IF NOT EXISTS idx_redemptions_enrollment ON redemptions(enrollment_id, redemption_date DESC)';
    END IF;
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_redemptions_retailer_date ON redemptions(retailer_id, redemption_date DESC)';
  END IF;
END $$;

-- ============================================
-- VERIFY INDEXES CREATED
-- ============================================

-- Check all indexes on transactions table
SELECT 
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename IN (
  'transactions',
  'customers', 
  'schemes',
  'gold_rates',
  'user_profiles',
  'stores'
)
ORDER BY tablename, indexname;

-- Estimate index sizes (helpful for monitoring)
SELECT
  schemaname,
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(indexname::regclass)) as index_size
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN (
    'transactions',
    'customers',
    'schemes',
    'gold_rates',
    'user_profiles',
    'stores'
  )
ORDER BY pg_relation_size(indexname::regclass) DESC;
