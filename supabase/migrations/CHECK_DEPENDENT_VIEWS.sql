-- Check for all views and what tables they depend on
SELECT DISTINCT
    v.table_name as view_name,
    v.view_definition
FROM information_schema.views v
WHERE v.table_schema = 'public'
ORDER BY v.table_name;

-- Also check specifically for views that might reference enrollments or notification_queue
SELECT 
    viewname as view_name
FROM pg_views 
WHERE schemaname = 'public'
  AND (definition LIKE '%enrollments%' OR definition LIKE '%notification_queue%')
ORDER BY viewname;
