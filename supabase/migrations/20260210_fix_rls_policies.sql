-- Migration: Enforce strict RLS policies for all core tables
-- Safe to run multiple times (IF NOT EXISTS)

-- Enable RLS for all tables if not already enabled
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'transactions') THEN
    EXECUTE 'ALTER TABLE transactions ENABLE ROW LEVEL SECURITY';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customers') THEN
    EXECUTE 'ALTER TABLE customers ENABLE ROW LEVEL SECURITY';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'schemes') THEN
    EXECUTE 'ALTER TABLE schemes ENABLE ROW LEVEL SECURITY';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'gold_rates') THEN
    EXECUTE 'ALTER TABLE gold_rates ENABLE ROW LEVEL SECURITY';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_profiles') THEN
    EXECUTE 'ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY';
  END IF;
END $$;

-- Drop and recreate SELECT/INSERT/UPDATE/DELETE policies for retailer_id isolation
-- TRANSACTIONS TABLE
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'transactions') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Retailer can SELECT transactions" ON transactions';
    EXECUTE 'CREATE POLICY "Retailer can SELECT transactions" ON transactions FOR SELECT USING (retailer_id = (SELECT retailer_id FROM user_profiles WHERE id = auth.uid()))';
    EXECUTE 'DROP POLICY IF EXISTS "Retailer can INSERT transactions" ON transactions';
    EXECUTE 'CREATE POLICY "Retailer can INSERT transactions" ON transactions FOR INSERT WITH CHECK (retailer_id = (SELECT retailer_id FROM user_profiles WHERE id = auth.uid()))';
    EXECUTE 'DROP POLICY IF EXISTS "Retailer can UPDATE transactions" ON transactions';
    EXECUTE 'CREATE POLICY "Retailer can UPDATE transactions" ON transactions FOR UPDATE USING (retailer_id = (SELECT retailer_id FROM user_profiles WHERE id = auth.uid()))';
    EXECUTE 'DROP POLICY IF EXISTS "Retailer can DELETE transactions" ON transactions';
    EXECUTE 'CREATE POLICY "Retailer can DELETE transactions" ON transactions FOR DELETE USING (retailer_id = (SELECT retailer_id FROM user_profiles WHERE id = auth.uid()))';
  END IF;
END $$;

-- Repeat for CUSTOMERS, SCHEMES, GOLD_RATES, USER_PROFILES
-- Add more as needed for new tables.
