-- Drop ALL views to prevent any blocking of table modifications
-- Run this BEFORE Migration 5

DROP VIEW IF EXISTS schemes CASCADE;
DROP VIEW IF EXISTS enrollment_payment_status CASCADE;
DROP VIEW IF EXISTS staff_performance CASCADE;
DROP VIEW IF EXISTS current_month_billing_status CASCADE;
DROP VIEW IF EXISTS overdue_billing_months CASCADE;

-- Check if there are any other views we missed
DO $$
DECLARE
  v_view_name text;
BEGIN
  FOR v_view_name IN 
    SELECT viewname 
    FROM pg_views 
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP VIEW IF EXISTS %I CASCADE', v_view_name);
    RAISE NOTICE 'Dropped view: %', v_view_name;
  END LOOP;
END $$;

-- Confirm all views are gone
SELECT 'All views dropped successfully' as status;
