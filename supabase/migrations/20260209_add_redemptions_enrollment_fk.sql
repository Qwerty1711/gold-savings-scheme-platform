-- Ensure FK exists for PostgREST relationship discovery
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints tc
    WHERE tc.table_schema = 'public'
      AND tc.table_name = 'redemptions'
      AND tc.constraint_type = 'FOREIGN KEY'
      AND tc.constraint_name = 'redemptions_enrollment_id_fkey'
  ) THEN
    ALTER TABLE redemptions
      ADD CONSTRAINT redemptions_enrollment_id_fkey
      FOREIGN KEY (enrollment_id)
      REFERENCES enrollments(id)
      ON DELETE CASCADE;
  END IF;
END $$;
