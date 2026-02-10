-- Migration: Enforce ON DELETE CASCADE for all retailer_id FKs referencing retailers(id)
-- Date: 2026-02-10
-- This migration ensures all foreign keys on retailer_id referencing retailers(id)
-- have ON DELETE CASCADE for strict multi-tenant data isolation.
-- Idempotent: Safe to run multiple times.

DO $$
DECLARE
    rec RECORD;
    fk_name TEXT;
    table_name TEXT;
    constraint_def TEXT;
BEGIN
    -- Loop through all FKs on retailer_id referencing retailers(id)
    FOR rec IN
        SELECT
            tc.table_schema,
            tc.table_name,
            kcu.column_name,
            ccu.table_name AS foreign_table_name,
            ccu.column_name AS foreign_column_name,
            tc.constraint_name
        FROM
            information_schema.table_constraints AS tc
            JOIN information_schema.key_column_usage AS kcu
                ON tc.constraint_name = kcu.constraint_name
                AND tc.table_schema = kcu.table_schema
            JOIN information_schema.constraint_column_usage AS ccu
                ON ccu.constraint_name = tc.constraint_name
                AND ccu.table_schema = tc.table_schema
        WHERE
            tc.constraint_type = 'FOREIGN KEY'
            AND kcu.column_name = 'retailer_id'
            AND ccu.table_name = 'retailers'
            AND ccu.column_name = 'id'
            AND tc.table_schema = 'public'
    LOOP
        table_name := quote_ident(rec.table_name);
        fk_name := quote_ident(rec.constraint_name);

        -- Check if ON DELETE CASCADE is already set
        SELECT pg_get_constraintdef(oid)
        INTO constraint_def
        FROM pg_constraint
        WHERE conname = rec.constraint_name
          AND conrelid = (quote_ident(rec.table_schema)||'.'||quote_ident(rec.table_name))::regclass;

        IF constraint_def IS NULL OR constraint_def NOT ILIKE '%ON DELETE CASCADE%' THEN
            RAISE NOTICE 'Altering %: dropping and recreating % with ON DELETE CASCADE', table_name, fk_name;

            -- Drop the old constraint if it exists
            EXECUTE format('ALTER TABLE %s DROP CONSTRAINT IF EXISTS %s;', table_name, fk_name);

            -- Add the new constraint with ON DELETE CASCADE
            EXECUTE format(
                'ALTER TABLE %s ADD CONSTRAINT %s FOREIGN KEY (retailer_id) REFERENCES retailers(id) ON DELETE CASCADE;',
                table_name, fk_name
            );
        ELSE
            RAISE NOTICE 'Constraint % already has ON DELETE CASCADE, skipping.', fk_name;
        END IF;
    END LOOP;
END $$;

-- End of migration
