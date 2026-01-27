-- ============================================================
-- URGENT: Add missing pan_number column to customers table
-- Run this in Supabase SQL Editor immediately
-- ============================================================

-- Add pan_number column if it doesn't exist
ALTER TABLE customers ADD COLUMN IF NOT EXISTS pan_number text;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_customers_pan ON customers(pan_number);

-- Verify the column was added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'customers' AND column_name = 'pan_number';
