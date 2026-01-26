-- **CRITICAL PERFORMANCE INDEXES**
-- These indexes speed up common queries by 10-100x
-- Safe to run multiple times (IF NOT EXISTS)

-- ============================================
-- TRANSACTIONS TABLE (Most queried)
-- ============================================

-- Index for retailer-scoped queries with date ordering
CREATE INDEX IF NOT EXISTS idx_transactions_retailer_date 
  ON transactions(retailer_id, created_at DESC);

-- Index for scheme lookups (collections page, passbook)
CREATE INDEX IF NOT EXISTS idx_transactions_scheme_id 
  ON transactions(scheme_id);

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
CREATE INDEX IF NOT EXISTS idx_transactions_billing_month 
  ON transactions(retailer_id, scheme_id, billing_month);

-- ============================================
-- CUSTOMERS TABLE
-- ============================================

-- Index for active customers lookup
CREATE INDEX IF NOT EXISTS idx_customers_retailer_active 
  ON customers(retailer_id, is_active);

-- Index for customer code lookups (search)
CREATE INDEX IF NOT EXISTS idx_customers_code 
  ON customers(retailer_id, customer_code);

-- Index for phone number lookup (login, search)
CREATE INDEX IF NOT EXISTS idx_customers_phone 
  ON customers(phone_number);

-- ============================================
-- SCHEMES TABLE
-- ============================================

-- Index for status filtering (active, completed, etc.)
CREATE INDEX IF NOT EXISTS idx_schemes_retailer_status 
  ON schemes(retailer_id, status);

-- Index for customer schemes lookup
CREATE INDEX IF NOT EXISTS idx_schemes_customer_id 
  ON schemes(customer_id, retailer_id);

-- Index for scheme template lookups
CREATE INDEX IF NOT EXISTS idx_schemes_template 
  ON schemes(retailer_id, scheme_template_id);

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

-- Index for store-based staff lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_store 
  ON user_profiles(retailer_id, store_id);

-- ============================================
-- STORES TABLE
-- ============================================

-- Index for active stores lookup
CREATE INDEX IF NOT EXISTS idx_stores_retailer_active 
  ON stores(retailer_id, is_active);

-- ============================================
-- ENROLLMENTS TABLE (if exists)
-- ============================================

-- Index for customer enrollments
CREATE INDEX IF NOT EXISTS idx_enrollments_customer 
  ON enrollments(customer_id, retailer_id);

-- Index for active enrollments
CREATE INDEX IF NOT EXISTS idx_enrollments_retailer_status 
  ON enrollments(retailer_id, status);

-- ============================================
-- NOTIFICATIONS TABLE
-- ============================================

-- Index for unread notifications
CREATE INDEX IF NOT EXISTS idx_notifications_customer_read 
  ON notifications(customer_id, is_read, created_at DESC);

-- ============================================
-- STAFF_INCENTIVES TABLE
-- ============================================

-- Index for staff incentive tracking
CREATE INDEX IF NOT EXISTS idx_staff_incentives_staff_status 
  ON staff_incentives(staff_id, status, earned_date DESC);

-- ============================================
-- REDEMPTIONS TABLE
-- ============================================

-- Index for redemption tracking
CREATE INDEX IF NOT EXISTS idx_redemptions_scheme 
  ON redemptions(scheme_id, redemption_date DESC);

-- Index for retailer redemption reports
CREATE INDEX IF NOT EXISTS idx_redemptions_retailer_date 
  ON redemptions(retailer_id, redemption_date DESC);

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
