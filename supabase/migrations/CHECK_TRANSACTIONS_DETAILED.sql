-- Check if transactions table has any column with default that references karat
SELECT 
  c.column_name,
  c.data_type,
  c.column_default,
  c.is_nullable
FROM information_schema.columns c
WHERE c.table_name = 'transactions'
ORDER BY c.ordinal_position;

-- Check all constraints on transactions
SELECT
  con.conname AS constraint_name,
  con.contype AS constraint_type,
  pg_get_constraintdef(con.oid) AS constraint_definition
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
WHERE rel.relname = 'transactions';

-- List all triggers on transactions
SELECT 
  tgname AS trigger_name,
  tgtype AS trigger_type,
  proname AS function_name,
  prosrc AS function_source
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE tgrelid = 'transactions'::regclass
AND NOT tgisinternal;
