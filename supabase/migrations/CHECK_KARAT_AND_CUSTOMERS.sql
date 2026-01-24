-- Check karat_type enum values and customers table schema
SELECT 
  enumlabel as karat_values
FROM pg_enum
JOIN pg_type ON pg_enum.enumtypid = pg_type.oid
WHERE pg_type.typname = 'karat_type'
ORDER BY enumsortorder;

-- Check customers table schema
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_name = 'customers'
ORDER BY ordinal_position;
