# 🚨 DATA LOSS RECOVERY GUIDE

## What Happened
The migration file `20260125_complete_enrollments_setup.sql` contains **DESTRUCTIVE commands**:

```sql
DROP TABLE IF EXISTS enrollments CASCADE;       -- Line 8
DROP TABLE IF EXISTS enrollment_billing_months CASCADE;  -- Line 92
```

When you ran this migration after creating enrollments, it **DELETED ALL ENROLLMENT DATA**.

## Current Situation (VERIFIED)
- ✅ **customers** table: 1 customer exists (kranthiraj)
- ❌ **enrollments** table: 0 records (dropped and recreated empty)
- ❌ **enrollment_billing_months** table: 0 records (cascade deleted)
- ✅ **transactions** table: 3 ORPHANED records survived!
  - All 3 transactions have enrollment_id pointing to deleted enrollment
  - This means **WE CAN RECOVER YOUR DATA!**

## Immediate Actions

### 1. **STOP** - Do NOT Run Any More Migrations!
The destructive migration is still in your codebase. Running it again will delete data again!

### 2. Check for Orphaned Data
Run this in Supabase SQL Editor:
```sql
-- File: supabase/CHECK_ORPHANED_DATA.sql
```

This will show:
- Any transactions that survived (orphaned records for "kranthiraj")
- Customer data that still exists
- Amount of money lost in deleted enrollments

### 3. Add Triggers Safely (Without Dropping Tables)
Run this in Supabase SQL Editor:
```sql
-- File: supabase/SAFE_ADD_TRIGGERS_ONLY.sql
```

This:
- Adds billing month triggers WITHOUT dropping tables
- Shows data counts before/after
- Generates billing months for any existing enrollments

## Recovery Options

### ✅ Option A: Quick Recovery (RECOMMENDED - Data Exists!)
Your transaction data survived! Follow these steps:

**Step 1: Run QUICK_RECOVERY.sql**
```sql
-- File: supabase/QUICK_RECOVERY.sql
```

This will:
1. Show you kranthiraj's orphaned transactions
2. List available plans
3. Provide a recovery script template

**Step 2: Fill in the recovery script**
You'll need to provide:
- **Plan ID**: Which scheme was kranthiraj enrolled in?
- **Commitment Amount**: What was the monthly commitment?

**Step 3: Run the recovery script**
It will recreate the enrollment with the EXACT same enrollment_id from the transactions.

**Step 4: Run SAFE_ADD_TRIGGERS_ONLY.sql**
```sql
-- File: supabase/SAFE_ADD_TRIGGERS_ONLY.sql
```

This will:
- Generate billing months for the recovered enrollment
- Mark months as paid based on existing transactions
- Link all 3 transactions back to the enrollment

### Option B: Reconstruct Manually (If You Don't Remember Details)
Run `RECOVER_KRANTHIRAJ_ENROLLMENT.sql` for a more guided recovery process.

## Prevention Measures

### 1. Quarantine Dangerous Migrations
Rename these files to prevent accidental execution:

```powershell
# In PowerShell terminal:
cd supabase\migrations
Rename-Item "20260125_complete_enrollments_setup.sql" "20260125_complete_enrollments_setup.DANGER_DO_NOT_RUN.sql"
```

### 2. Create Safe Migration Files
I've created safe versions:
- `SAFE_ADD_TRIGGERS_ONLY.sql` - Adds triggers WITHOUT dropping tables
- `CHECK_ORPHANED_DATA.sql` - Checks for surviving data

### 3. Migration Safety Checklist
Before running ANY migration:
1. **Backup database** (Supabase Dashboard → Database → Backups)
2. **Check for DROP TABLE** commands (`grep -i "DROP TABLE"`)
3. **Check for CASCADE** constraints that could trigger deletions
4. **Test on demo data** first
5. **Verify data counts** before and after

## Dangerous Patterns to Avoid

### 🚫 NEVER Use These in Production:
```sql
DROP TABLE IF EXISTS <table> CASCADE;     -- Deletes ALL data
ON DELETE CASCADE                         -- Can trigger mass deletions
TRUNCATE TABLE                            -- Empties table
DELETE FROM <table> WHERE 1=1             -- Deletes everything
```

### ✅ Use These Instead:
```sql
CREATE TABLE IF NOT EXISTS <table> ...    -- Safe creation
ON DELETE RESTRICT                        -- Prevents accidental deletion
ON DELETE SET NULL                        -- Safer than CASCADE
```

## Next Steps

1. **Run CHECK_ORPHANED_DATA.sql** to see what survived
2. **Run SAFE_ADD_TRIGGERS_ONLY.sql** to restore functionality
3. **Quarantine dangerous migration** (rename it)
4. **Report findings** so we can plan recovery
5. **Create backup** before any more changes

## Files Created
- `supabase/CHECK_ORPHANED_DATA.sql` - Check for surviving data
- `supabase/SAFE_ADD_TRIGGERS_ONLY.sql` - Add triggers WITHOUT dropping tables
- `supabase/DATA_LOSS_RECOVERY_GUIDE.md` - This file

## Questions?
Let me know what CHECK_ORPHANED_DATA.sql shows and we'll proceed with recovery!
