# Fix: Customer Status Column Missing

## Problem
The Customers page failed to load with the error:
```
column customers.status does not exist (code: 42703)
```

## Solution
A migration file has been created to add the missing `status` column to the `customers` table.

## How to Apply the Fix

### Option 1: Using Supabase Dashboard (Recommended)
1. Open your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the contents of this file:
   ```
   supabase/migrations/20260126_add_customer_status_column.sql
   ```
4. Click **Run** to execute the migration

### Option 2: Using Supabase CLI (if linked)
```powershell
supabase db push
```

## What the Migration Does
- Creates a `customer_status` enum type with values: `ACTIVE`, `INACTIVE`
- Adds a `status` column to the `customers` table with default value `ACTIVE`
- Updates any existing customers to have `ACTIVE` status

## Verification
After applying the migration, refresh your application at `localhost:3000/customers` - the page should now load successfully.

You can also verify the column exists by running this in Supabase SQL Editor:
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'customers' AND column_name = 'status';
```

## Files Changed
- ✅ Created: `supabase/migrations/20260126_add_customer_status_column.sql`
