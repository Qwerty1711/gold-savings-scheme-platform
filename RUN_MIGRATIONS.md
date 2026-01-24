# Database Migration Instructions

## ⚠️ Important: Run Migrations in Order

You need to run ALL migration files in chronological order. The error you're seeing (`scheme_templates does not exist`) is because you tried to run the store migration BEFORE running the base migrations.

## Step-by-Step Instructions

### 1. Go to Supabase Dashboard
- Open your Supabase project
- Click on **SQL Editor** in the left sidebar
- Click **New query**

### 2. Run Migrations in This Order:

#### Migration 1: Base Tables (REQUIRED FIRST)
**File:** `supabase/migrations/20260120234016_add_missing_tables_for_gold_scheme.sql`

Copy the ENTIRE contents and run in SQL Editor.

This creates:
- `scheme_templates` table
- `incentive_rules` table  
- `staff_incentives` table
- All RLS policies

---

#### Migration 2: Demo Data (OPTIONAL - Only for testing)
**File:** `supabase/migrations/20260120234436_seed_demo_data.sql`

⚠️ **Skip this if you have real data!** This is only for demo/testing.

---

#### Migration 3: Enhanced Transactions
**File:** `supabase/migrations/20260121004947_enhance_transactions_and_add_notifications.sql`

Copy and run in SQL Editor.

---

#### Migration 4: Primary Installment Enforcement
**File:** `supabase/migrations/20260121005753_enforce_primary_installment_and_topup.sql`

Copy and run in SQL Editor.

---

#### Migration 5: Billing Cycle
**File:** `supabase/migrations/20260121010705_implement_billing_cycle_and_reminders_v3.sql`

Copy and run in SQL Editor.

---

#### Migration 6: Customer Self-Enrollment
**File:** `supabase/migrations/20260121013746_add_customer_self_enrollment_support.sql`

Copy and run in SQL Editor.

---

#### Migration 7: Staff Leaderboard
**File:** `supabase/migrations/20260121014404_add_staff_leaderboard_rpc.sql`

Copy and run in SQL Editor.

---

#### Migration 8: Multi-Store Support (NEW - THE ONE YOU JUST TRIED)
**File:** `supabase/migrations/20260123_add_stores_and_multi_location_support.sql`

Copy and run in SQL Editor.

This creates:
- `stores` table
- `scheme_store_assignments` junction table
- Adds `store_id` to customers, enrollments, transactions
- Creates "Main Store" for existing retailers

---

## Verification Commands

After running all migrations, verify with these queries:

```sql
-- Check if all tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Check stores table
SELECT * FROM stores;

-- Check scheme_templates table
SELECT * FROM scheme_templates;
```

## ✅ Success Indicators

After running all migrations, you should see:
- ✅ `scheme_templates` table exists
- ✅ `stores` table exists with "Main Store" entry
- ✅ `scheme_store_assignments` table exists
- ✅ No SQL errors

## 🚨 If You Still Get Errors

1. **Check if migration already ran:**
   ```sql
   SELECT * FROM scheme_templates LIMIT 1;
   ```
   If this works, the table exists and you can proceed to the stores migration.

2. **Check your Supabase project:**
   - Ensure you're on the correct project
   - Ensure PostgreSQL version is 14+

3. **Manual table creation:**
   If migrations fail, I can help you create tables manually one by one.
