-- Ensure FK exists for PostgREST relationship discovery
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints tc
    WHERE tc.table_schema = 'public'
      AND tc.table_name = 'redemptions'
      AND tc.constraint_type = 'FOREIGN KEY'
      AND tc.constraint_name = 'redemptions_customer_id_fkey'
  ) THEN
    ALTER TABLE redemptions
      ADD CONSTRAINT redemptions_customer_id_fkey
      FOREIGN KEY (customer_id)
      REFERENCES customers(id)
      ON DELETE CASCADE;
  END IF;
END $$;
