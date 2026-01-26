/*
  # Add status column to customers table

  ## Changes
  - Add status column to customers table (ACTIVE/INACTIVE)
  - Set default to ACTIVE
  - Update existing customers to ACTIVE status
*/

-- Create customer_status enum if it doesn't exist
DO $$ BEGIN
  CREATE TYPE customer_status AS ENUM ('ACTIVE', 'INACTIVE');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add status column to customers table
ALTER TABLE customers ADD COLUMN IF NOT EXISTS status customer_status DEFAULT 'ACTIVE';

-- Update any existing customers to have ACTIVE status
UPDATE customers SET status = 'ACTIVE' WHERE status IS NULL;
