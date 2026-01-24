-- Run this query in Supabase SQL Editor to check which tables already exist

SELECT 
    table_name,
    CASE 
        WHEN table_name = 'retailers' THEN '✅ Base table'
        WHEN table_name = 'user_profiles' THEN '✅ Base table'
        WHEN table_name = 'customers' THEN '✅ Base table'
        WHEN table_name = 'enrollments' THEN '✅ Base table'
        WHEN table_name = 'transactions' THEN '✅ Base table'
        WHEN table_name = 'gold_rates' THEN '✅ Base table'
        WHEN table_name = 'scheme_templates' THEN '🎯 Migration 1 (20260120234016)'
        WHEN table_name = 'incentive_rules' THEN '🎯 Migration 1 (20260120234016)'
        WHEN table_name = 'staff_incentives' THEN '🎯 Migration 1 (20260120234016)'
        WHEN table_name = 'notifications' THEN '📧 Migration 3 (20260121004947)'
        WHEN table_name = 'reminders' THEN '🔔 Migration 5 (20260121010705)'
        WHEN table_name = 'stores' THEN '🏪 Migration 8 (20260123) - NEW!'
        WHEN table_name = 'scheme_store_assignments' THEN '🏪 Migration 8 (20260123) - NEW!'
        ELSE '❓ Unknown'
    END as migration_status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
AND table_name NOT LIKE 'pg_%'
AND table_name NOT LIKE 'sql_%'
ORDER BY table_name;

-- Check for the specific table that's causing the error
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'scheme_templates') 
        THEN '✅ scheme_templates EXISTS - You can run the stores migration!'
        ELSE '❌ scheme_templates MISSING - You need to run Migration 1 first!'
    END as status;
