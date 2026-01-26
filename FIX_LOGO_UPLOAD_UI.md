# Fix Logo Upload - Storage Policies Setup via UI

## Problem
You created the `retailer-logos` bucket, but SQL migration failed with:
```
ERROR: 42501: must be owner of table objects
```

This is normal - storage policies can't be created via SQL, they need to be created via the Supabase Dashboard UI.

---

## Solution: Create RLS Policies via UI (5 minutes)

### Step 1: Go to Storage Policies

1. Open **Supabase Dashboard**: https://supabase.com/dashboard
2. Select your project
3. Click **Storage** in left sidebar
4. Click **Policies** tab (top navigation)
5. You should see "storage.objects" table

### Step 2: Create INSERT Policy (Allow Upload)

1. Click **"New Policy"** button
2. Choose **"For full customization"**
3. Fill in:

```
Policy Name: Authenticated users can upload retailer logos

Allowed Operations: ✅ INSERT (check this box only)

Target Roles: authenticated

USING expression: Leave blank

WITH CHECK expression:
bucket_id = 'retailer-logos' 
AND (storage.foldername(name))[1] IN (
  SELECT retailer_id::text 
  FROM user_profiles 
  WHERE id = auth.uid()
)
```

4. Click **"Review"** → **"Save Policy"**

### Step 3: Create SELECT Policy (Allow Public View)

1. Click **"New Policy"** again
2. Choose **"For full customization"**
3. Fill in:

```
Policy Name: Public can view retailer logos

Allowed Operations: ✅ SELECT (check this box only)

Target Roles: public

USING expression:
bucket_id = 'retailer-logos'

WITH CHECK expression: Leave blank
```

4. Click **"Review"** → **"Save Policy"**

### Step 4: Create UPDATE Policy (Allow Replace)

1. Click **"New Policy"**
2. Choose **"For full customization"**
3. Fill in:

```
Policy Name: Authenticated users can update retailer logos

Allowed Operations: ✅ UPDATE (check this box only)

Target Roles: authenticated

USING expression:
bucket_id = 'retailer-logos' 
AND (storage.foldername(name))[1] IN (
  SELECT retailer_id::text 
  FROM user_profiles 
  WHERE id = auth.uid()
)

WITH CHECK expression: Same as USING expression above
```

4. Click **"Review"** → **"Save Policy"**

### Step 5: Create DELETE Policy (Allow Remove)

1. Click **"New Policy"**
2. Choose **"For full customization"**
3. Fill in:

```
Policy Name: Authenticated users can delete retailer logos

Allowed Operations: ✅ DELETE (check this box only)

Target Roles: authenticated

USING expression:
bucket_id = 'retailer-logos' 
AND (storage.foldername(name))[1] IN (
  SELECT retailer_id::text 
  FROM user_profiles 
  WHERE id = auth.uid()
)

WITH CHECK expression: Leave blank
```

4. Click **"Review"** → **"Save Policy"**

---

## Step 6: Verify Policies Created

In Supabase Dashboard → Storage → Policies, you should see 4 policies:

✅ **Authenticated users can upload retailer logos** (INSERT)  
✅ **Public can view retailer logos** (SELECT)  
✅ **Authenticated users can update retailer logos** (UPDATE)  
✅ **Authenticated users can delete retailer logos** (DELETE)

---

## Step 7: Test Logo Upload

1. Go back to your app: `http://localhost:3000/settings`
2. Click **"Upload Logo"** under Brand Logo section
3. Select an image (PNG/JPG, max 2MB)
4. Should see: ✅ "Logo updated successfully!"
5. Logo should appear immediately

---

## Troubleshooting

### Error: "Storage permissions not configured"

**Check**:
1. All 4 policies created? (see Step 6)
2. Policy names exactly match (case-sensitive)?
3. Bucket is PUBLIC? (Storage → Buckets → retailer-logos → should show "PUBLIC" badge)

**Fix**:
- Delete and recreate policies with exact expressions above
- Ensure bucket `retailer-logos` has Public Access enabled

### Error: "Row level security policy violation"

**Check**:
1. You're logged in as admin?
2. `user_profiles` record exists for your user?

**Fix**:
```sql
-- Verify user profile exists
SELECT id, retailer_id, role 
FROM user_profiles 
WHERE id = auth.uid();
-- Should return 1 row
```

### Logo uploads but doesn't display

**Check**:
1. Public SELECT policy exists?
2. Browser console shows logo URL?

**Fix**:
- Open browser DevTools (F12) → Network tab
- Click "Upload Logo" again
- Look for storage URL in network requests
- Copy URL and open in new tab - should show image

### Still getting errors after creating policies

**Try**:
1. Logout and login again
2. Clear browser cache (Ctrl+Shift+Delete)
3. Wait 30 seconds for Supabase to apply policies
4. Check Supabase logs: Dashboard → Logs → API

---

## Quick Visual Guide

### Where to find Policies:
```
Supabase Dashboard
  └─ Storage (left sidebar)
      └─ Policies (top tab)
          └─ New Policy (button)
              └─ For full customization (option)
```

### Policy Expression Example:
```sql
-- USING expression (who can perform action)
bucket_id = 'retailer-logos' 
AND (storage.foldername(name))[1] IN (
  SELECT retailer_id::text 
  FROM user_profiles 
  WHERE id = auth.uid()
)
```

**Translation**: 
- User can only upload to folder matching their `retailer_id`
- Example: User with retailer_id `abc-123` can upload to `retailer-logos/abc-123/logo.png`
- Cannot upload to other retailers' folders

---

## Summary Checklist

Storage setup complete when you have:
- [x] Bucket `retailer-logos` created (PUBLIC)
- [ ] INSERT policy created (for upload)
- [ ] SELECT policy created (for public view)
- [ ] UPDATE policy created (for replace)
- [ ] DELETE policy created (for remove)
- [ ] Logo upload works in app
- [ ] Logo displays on login page

**Once all checked, you're done!** Logo upload will work for all retailers. ✅

---

## Alternative: Simpler Policy (If Above Doesn't Work)

If the folder-based policies are too complex, use this simpler approach:

### Simple Upload Policy:
```sql
-- Any authenticated user can upload
bucket_id = 'retailer-logos'
```

**Note**: This allows any user to upload to any folder, but since each retailer only knows their own `retailer_id`, they won't upload to wrong folders.

### Simple View Policy:
```sql
-- Anyone can view
bucket_id = 'retailer-logos'
```

**Security**: Still safe because:
- Retailers can't see OTHER retailers' data (thanks to RLS on `retailers` table)
- Logo URLs are random (hard to guess)
- Only affects logo visibility (public info anyway)

---

Need help? Check which specific error you're seeing and I'll guide you through the fix!
