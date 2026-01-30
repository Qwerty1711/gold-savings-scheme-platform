-- Check if retailers table exists and what columns it has
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns
WHERE table_name = 'retailers'
ORDER BY ordinal_position;

-- If contact_email doesn't exist, add it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'retailers' 
        AND column_name = 'contact_email'
    ) THEN
        ALTER TABLE retailers ADD COLUMN contact_email TEXT;
        RAISE NOTICE 'Added contact_email column to retailers table';
    ELSE
        RAISE NOTICE 'contact_email column already exists';
    END IF;
END $$;
