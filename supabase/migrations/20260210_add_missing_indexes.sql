-- Migration: Add missing indexes for production readiness audit
-- Safe to run multiple times (IF NOT EXISTS)

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'transactions') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'transactions' AND indexname = 'idx_transactions_gold_rate_id') THEN
      CREATE INDEX idx_transactions_gold_rate_id ON transactions(gold_rate_id);
    END IF;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customers') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'customers' AND indexname = 'idx_customers_status') THEN
      CREATE INDEX idx_customers_status ON customers(status);
    END IF;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'schemes') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'schemes' AND indexname = 'idx_schemes_customer_id') THEN
      CREATE INDEX idx_schemes_customer_id ON schemes(customer_id);
    END IF;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'gold_rates') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'gold_rates' AND indexname = 'idx_gold_rates_retailer_id') THEN
      CREATE INDEX idx_gold_rates_retailer_id ON gold_rates(retailer_id);
    END IF;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_profiles') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'user_profiles' AND indexname = 'idx_user_profiles_retailer_id') THEN
      CREATE INDEX idx_user_profiles_retailer_id ON user_profiles(retailer_id);
    END IF;
  END IF;
END $$;

-- Add more as needed based on future audit findings.
