-- Migration: Enforce immutability of transactions table
-- Prevent UPDATE and DELETE on transactions (audit compliance)

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'transactions') THEN
    -- Drop any existing triggers or rules that allow update/delete
    -- (No-op if none exist)
    -- Create rule to prevent UPDATE
    CREATE OR REPLACE RULE no_update_transactions AS ON UPDATE TO transactions DO INSTEAD NOTHING;
    -- Create rule to prevent DELETE
    CREATE OR REPLACE RULE no_delete_transactions AS ON DELETE TO transactions DO INSTEAD NOTHING;
  END IF;
END $$;

-- Optionally, add a comment for audit trail
COMMENT ON TABLE transactions IS 'Table is immutable: no UPDATE or DELETE allowed. All changes must be insert-only for audit compliance.';
