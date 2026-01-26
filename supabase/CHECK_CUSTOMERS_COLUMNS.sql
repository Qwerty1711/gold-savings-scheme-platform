-- Quick check: Run this in Supabase SQL Editor to see current customers table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns
WHERE table_name = 'customers'
ORDER BY ordinal_position;
