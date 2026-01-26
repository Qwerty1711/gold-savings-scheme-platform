# Storage Setup Instructions

## ⚠️ Run This Migration First Before Uploading Logos

### Step 1: Open Supabase SQL Editor
1. Go to your Supabase project dashboard
2. Click on **SQL Editor** in the left sidebar
3. Click **New query**

### Step 2: Run the Storage Migration
Copy and paste the entire contents of this file:

**File:** `supabase/migrations/20260126_setup_storage_for_logos.sql`

Click **Run** to execute the migration.

### What This Creates:
- ✅ Storage bucket: `retailer-logos` (public)
- ✅ RLS policies for upload/update/delete
- ✅ Public access for viewing logos
- ✅ 5MB file size limit
- ✅ Allowed formats: JPEG, PNG, WebP, GIF

### After Running:
You can now upload logos in Settings → Retailer → Brand Logo section.

The logo will automatically appear on:
- Login page header
- Dashboard sidebar
- Top navigation bar

---

## How Branding Works

### Default State (No Retailer Setup):
- Shows: **"Sync4AI"**
- Appears on: Login page, Dashboard, Top nav

### After Settings Update:
- Login page header: **Your Business Name**
- Dashboard sidebar: **Your Business Name** + Logo
- Top navigation: **Your Business Name** + Logo
- Footer: Always shows **"© 2026 Sync4AI. All rights reserved."**

### The branding automatically updates when you:
1. Change Business Name in Settings
2. Upload a new logo

No page refresh needed! 🎉
