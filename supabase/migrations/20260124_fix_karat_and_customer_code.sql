-- Fix karat enum values and add customer_code column

-- 1. Add customer_code column to customers table
ALTER TABLE customers ADD COLUMN IF NOT EXISTS customer_code text UNIQUE;

-- 2. Create index on customer_code for faster lookups
CREATE INDEX IF NOT EXISTS idx_customers_customer_code ON customers(customer_code);

-- 3. Check current karat_type enum - if it has '22K' format, we're good
-- If it has '22' format, we need to update the frontend code instead
-- Run this to see: SELECT unnest(enum_range(NULL::karat_type));
