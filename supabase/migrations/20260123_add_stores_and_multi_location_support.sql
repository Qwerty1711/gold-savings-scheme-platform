/*
  # Add Multi-Store Support for Retailers

  ## New Tables

  ### 1. stores
  - Multiple physical store locations per retailer
  - Fields: id, retailer_id, name, address, city, state, phone, email, is_active

  ### 2. scheme_store_assignments (junction table)
  - Many-to-many relationship between schemes and stores
  - A scheme can be available in multiple stores
  - A store can offer multiple schemes

  ### 3. Add store_id to enrollments and customers
  - Track which store a customer belongs to
  - Track which store processed an enrollment

  ## Security
  - RLS enabled on all new tables
  - Multi-tenant isolation via retailer_id
*/

-- 1. Create stores table
CREATE TABLE IF NOT EXISTS stores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  retailer_id uuid NOT NULL REFERENCES retailers(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text, -- Optional short code for the store (e.g., "MAIN", "BR1", "WEST")
  address text,
  city text,
  state text,
  postal_code text,
  phone text,
  email text,
  manager_name text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(retailer_id, code) -- Enforce unique store codes per retailer
);

-- Ensure all columns exist (for backward compatibility if table was created differently)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='stores' AND column_name='name') THEN
    ALTER TABLE stores ADD COLUMN name text NOT NULL DEFAULT 'Store';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='stores' AND column_name='code') THEN
    ALTER TABLE stores ADD COLUMN code text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='stores' AND column_name='is_active') THEN
    ALTER TABLE stores ADD COLUMN is_active boolean DEFAULT true;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='stores' AND column_name='created_at') THEN
    ALTER TABLE stores ADD COLUMN created_at timestamptz DEFAULT now();
  END IF;
END $$;

-- Enable RLS
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;

-- RLS Policies for stores
CREATE POLICY "Retailers can view their own stores"
  ON stores FOR SELECT
  USING (retailer_id = (SELECT retailer_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Retailers can insert their own stores"
  ON stores FOR INSERT
  WITH CHECK (retailer_id = (SELECT retailer_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Retailers can update their own stores"
  ON stores FOR UPDATE
  USING (retailer_id = (SELECT retailer_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Retailers can delete their own stores"
  ON stores FOR DELETE
  USING (retailer_id = (SELECT retailer_id FROM user_profiles WHERE id = auth.uid()));

-- 2. Create scheme_store_assignments junction table
CREATE TABLE IF NOT EXISTS scheme_store_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  retailer_id uuid NOT NULL REFERENCES retailers(id) ON DELETE CASCADE,
  scheme_id uuid NOT NULL REFERENCES scheme_templates(id) ON DELETE CASCADE,
  store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(scheme_id, store_id) -- A scheme can only be assigned to a store once
);

-- Enable RLS
ALTER TABLE scheme_store_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for scheme_store_assignments
CREATE POLICY "Retailers can view their own scheme-store assignments"
  ON scheme_store_assignments FOR SELECT
  USING (retailer_id = (SELECT retailer_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Retailers can create their own scheme-store assignments"
  ON scheme_store_assignments FOR INSERT
  WITH CHECK (retailer_id = (SELECT retailer_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Retailers can delete their own scheme-store assignments"
  ON scheme_store_assignments FOR DELETE
  USING (retailer_id = (SELECT retailer_id FROM user_profiles WHERE id = auth.uid()));

-- 3. Add store_id to existing tables

-- Add store_id to customers table (nullable for backward compatibility)
ALTER TABLE customers ADD COLUMN IF NOT EXISTS store_id uuid REFERENCES stores(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_customers_store_id ON customers(store_id);

-- Add store_id to enrollments table (nullable for backward compatibility)
ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS store_id uuid REFERENCES stores(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_enrollments_store_id ON enrollments(store_id);

-- Add store_id to transactions table for tracking payment location
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS store_id uuid REFERENCES stores(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_store_id ON transactions(store_id);

-- 4. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_stores_retailer_id ON stores(retailer_id);
CREATE INDEX IF NOT EXISTS idx_stores_is_active ON stores(is_active);
CREATE INDEX IF NOT EXISTS idx_scheme_store_assignments_retailer_id ON scheme_store_assignments(retailer_id);
CREATE INDEX IF NOT EXISTS idx_scheme_store_assignments_scheme_id ON scheme_store_assignments(scheme_id);
CREATE INDEX IF NOT EXISTS idx_scheme_store_assignments_store_id ON scheme_store_assignments(store_id);

-- 5. Add helpful comments
COMMENT ON TABLE stores IS 'Physical store locations for each retailer';
COMMENT ON TABLE scheme_store_assignments IS 'Many-to-many mapping of schemes to stores';
COMMENT ON COLUMN customers.store_id IS 'Primary store location for this customer';
COMMENT ON COLUMN enrollments.store_id IS 'Store where enrollment was created';
COMMENT ON COLUMN transactions.store_id IS 'Store where payment was recorded';

-- 6. Insert a default store for existing retailers
INSERT INTO stores (retailer_id, name, code, is_active, created_at)
SELECT DISTINCT id, 'Main Store', 'MAIN', true, now()
FROM retailers
WHERE NOT EXISTS (
  SELECT 1 FROM stores WHERE stores.retailer_id = retailers.id
)
ON CONFLICT DO NOTHING;
