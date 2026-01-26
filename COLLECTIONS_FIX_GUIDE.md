# COLLECTIONS PAGE FIX - Quick Guide

## ⚠️ Issue: Enrollments Not Showing

The collections page isn't showing enrolled plans because the `enrollments` table is missing from your database.

---

## 🔧 Solution: Run This Migration

### Step 1: Open Supabase SQL Editor
1. Go to your Supabase project dashboard
2. Click **SQL Editor** in the left sidebar
3. Click **New query**

### Step 2: Run the Enrollments Migration
Copy and paste the ENTIRE contents of this file:

**File:** `supabase/migrations/20260125_complete_enrollments_setup.sql`

Click **Run** to execute.

### What This Creates:
- ✅ `enrollments` table (customer plan enrollments)
- ✅ `enrollment_billing_months` table (monthly payment tracking)
- ✅ Proper RLS policies for data security
- ✅ Foreign key relationships
- ✅ Indexes for performance

---

## ✨ After Running the Migration

The collections page will now properly display:

### 1. **Customer Selection**
Select a customer from dropdown

### 2. **Enrolled Plans Section** (Will Now Appear!)
- Shows all active plans for the selected customer
- Displays: Plan name, monthly commitment, duration, bonus%, karat type
- Example: "Gold Saver - ₹5,000/month (12m • 5% bonus • 22K)"

### 3. **Monthly Commitment Status**
- Green card: ✓ Commitment Met
- Amber card: ⚠ Commitment Pending
- Shows: Total commitment, paid this month, remaining amount

### 4. **Payment Form**
- Quick amount buttons (₹3k, ₹5k, ₹10k, ₹25k)
- Custom amount input
- Live gold gram calculation
- Payment mode selection

### 5. **Recent Payments**
Last 10 transactions for the customer

---

## 🎯 Payment Logic Rules

### Primary Installment System:
1. **First payment of each month** = PRIMARY_INSTALLMENT
   - Must be ≥ monthly commitment amount
   - Only ONE per month allowed
   - Marks the monthly obligation as "met"

2. **Additional payments** = TOP_UP
   - Unlimited per month
   - Any amount accepted
   - Doesn't affect monthly commitment status

### Example:
- Monthly commitment: ₹5,000
- Payment 1 (Jan 1): ₹5,000 → PRIMARY_INSTALLMENT ✓
- Payment 2 (Jan 15): ₹2,000 → TOP_UP ✓
- Payment 3 (Feb 1): ₹5,500 → PRIMARY_INSTALLMENT (Feb) ✓

---

## 🔍 Data Consistency Between Pages

After the migration, data will be consistent across:
- **Pulse Dashboard**: Shows collection totals and metrics
- **Collections Page**: Records new payments
- **Customer Portal**: Customers see their passbook

All pages query the same `transactions` and `enrollments` tables!

---

## 💡 Current Console Errors

Open your browser console (F12) and you'll see error messages telling you:
- Which table is missing
- What query failed
- Exact migration file to run

The page will now display clear toast messages guiding you!

---

## 📝 Next Steps After Migration

1. **Enroll customers in plans** (if not already done)
2. **Record payments** - the form will now appear!
3. **Verify data** - check Pulse dashboard shows same totals
4. **Test on mobile** - mobile nav now visible at bottom

---

Need help? Check the browser console for specific error messages!
