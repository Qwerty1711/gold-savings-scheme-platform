# Customer Page Data Mismatch - Debugging & Fix Guide

## Issues Identified

### 1. **Default Filter Was Hiding Customers**
- **Problem**: Page defaulted to "ACTIVE" filter, which only shows customers with `active_enrollments > 0`
- **Impact**: Customers without active enrollments were hidden from view
- **Fix**: Changed default filter to "ALL" to show all customers

### 2. **Enrollment Status Logic Was Too Strict**
- **Problem**: Code only counted enrollments with explicit `status='ACTIVE'`
- **Impact**: Enrollments without a status field (null/undefined) were not counted as active
- **Fix**: Updated logic to treat null/undefined status as ACTIVE (default behavior)

### 3. **Data Integrity Issues**
Based on your screenshots:
- **7 customers** in database ✅
- **4 enrollments** visible ✅ (but may have more without proper status)
- **Only 3 customers showing** ❌ (was due to filter)

## Fixes Applied

### Code Changes Made:
1. ✅ Changed default filter from `'ACTIVE'` to `'ALL'` (line 44)
2. ✅ Fixed enrollment active count logic (line 217-220)
3. ✅ Customers without enrollments now display properly

## How to Verify the Fix

### Step 1: Run Diagnostic Query
Run this in **Supabase SQL Editor**:

\`\`\`sql
-- Check all customers and their enrollment counts
SELECT 
    c.id,
    c.full_name,
    c.phone,
    c.status as customer_status,
    COUNT(e.id) as enrollment_count,
    COUNT(CASE WHEN e.status = 'ACTIVE' OR e.status IS NULL THEN 1 END) as active_enrollment_count,
    STRING_AGG(DISTINCT COALESCE(e.status::text, 'NULL'), ', ') as enrollment_statuses
FROM customers c
LEFT JOIN enrollments e ON e.customer_id = c.id
GROUP BY c.id, c.full_name, c.phone, c.status
ORDER BY c.full_name;
\`\`\`

### Step 2: Check Enrollment Status Distribution
\`\`\`sql
SELECT 
    COALESCE(status::text, 'NULL') as status,
    COUNT(*) as count
FROM enrollments
GROUP BY status;
\`\`\`

### Step 3: Refresh Your Browser
- Navigate to `localhost:3000/customers`
- You should now see **ALL 7 customers**
- The filter dropdown should default to "All"

## Expected Results After Fix

| Metric | Expected Value | Notes |
|--------|---------------|-------|
| Total Customers | 7 | All customers in database |
| Active Customers | 4 (or more) | Customers with at least 1 active enrollment |
| Total Enrollments | 4+ | Total across all customers |
| Customer List | All 7 visible | When filter is set to "All" |

## Additional Data Cleanup (Optional)

If you want to ensure all enrollments have proper status:

\`\`\`sql
-- Set default status for enrollments without one
UPDATE enrollments 
SET status = 'ACTIVE' 
WHERE status IS NULL;

-- Verify
SELECT status, COUNT(*) 
FROM enrollments 
GROUP BY status;
\`\`\`

## Still Seeing Issues?

If numbers still don't match after refreshing:

1. **Check for deleted enrollments**: 
   \`\`\`sql
   SELECT COUNT(*) FROM enrollments WHERE retailer_id = 'YOUR_RETAILER_ID';
   \`\`\`

2. **Check enrollment_billing_months table**:
   \`\`\`sql
   SELECT enrollment_id, COUNT(*) as month_count 
   FROM enrollment_billing_months 
   GROUP BY enrollment_id;
   \`\`\`

3. **Check transactions**:
   \`\`\`sql
   SELECT e.id as enrollment_id, COUNT(t.id) as transaction_count
   FROM enrollments e
   LEFT JOIN transactions t ON t.enrollment_id = e.id
   GROUP BY e.id;
   \`\`\`

## Files Modified
- ✅ [app/(dashboard)/customers/page.tsx](../app/(dashboard)/customers/page.tsx) - Fixed filter and logic
- ✅ [supabase/DEBUG_CUSTOMER_ENROLLMENT_MISMATCH.sql](DEBUG_CUSTOMER_ENROLLMENT_MISMATCH.sql) - Diagnostic queries
