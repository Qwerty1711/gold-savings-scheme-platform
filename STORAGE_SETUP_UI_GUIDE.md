# Storage Setup via Supabase Dashboard (No SQL Needed!)

## ⚠️ Why SQL Doesn't Work
The storage system requires dashboard access. You'll get "must be owner of table objects" if you try via SQL.

---

## ✅ Step-by-Step: Create Storage Bucket

### 1. Open Supabase Dashboard
- Go to your Supabase project
- Click **Storage** in the left sidebar

### 2. Create New Bucket
Click **"New bucket"** button

### 3. Bucket Configuration
Fill in these details:

| Field | Value |
|-------|-------|
| **Name** | `retailer-logos` |
| **Public bucket** | ✅ **Yes** (check this!) |
| **File size limit** | 5 MB |
| **Allowed MIME types** | Leave empty (or add: image/jpeg, image/png, image/webp, image/gif) |

Click **"Create bucket"**

### 4. Set Up Policies
After creating the bucket, click on it, then click **"Policies"** tab

#### Policy 1: Upload (INSERT)
- Click **"New policy"**
- Template: Custom
- Policy name: `Authenticated users can upload logos`
- Allowed operation: **INSERT**
- Target roles: `authenticated`
- WITH CHECK expression:
```sql
bucket_id = 'retailer-logos' AND
(storage.foldername(name))[1] IN (
  SELECT retailer_id::text FROM user_profiles WHERE id = auth.uid()
)
```
- Click **"Review"** → **"Save policy"**

#### Policy 2: Update
- Click **"New policy"**
- Policy name: `Authenticated users can update logos`
- Allowed operation: **UPDATE**
- Target roles: `authenticated`
- USING expression:
```sql
bucket_id = 'retailer-logos' AND
(storage.foldername(name))[1] IN (
  SELECT retailer_id::text FROM user_profiles WHERE id = auth.uid()
)
```
- Click **"Review"** → **"Save policy"**

#### Policy 3: Delete
- Click **"New policy"**
- Policy name: `Authenticated users can delete logos`
- Allowed operation: **DELETE**
- Target roles: `authenticated`
- USING expression:
```sql
bucket_id = 'retailer-logos' AND
(storage.foldername(name))[1] IN (
  SELECT retailer_id::text FROM user_profiles WHERE id = auth.uid()
)
```
- Click **"Review"** → **"Save policy"**

#### Policy 4: Public View (SELECT)
- Click **"New policy"**
- Policy name: `Public can view logos`
- Allowed operation: **SELECT**
- Target roles: `public`
- USING expression:
```sql
bucket_id = 'retailer-logos'
```
- Click **"Review"** → **"Save policy"**

---

## 🎯 Verification

### Test Upload:
1. Go to Settings page on your app
2. Click "Upload Logo" under Brand Logo section
3. Select an image file (JPEG/PNG, under 5MB)
4. Should upload successfully!

### Check in Supabase:
1. Go to Storage → retailer-logos
2. You should see your uploaded file in a folder named with your retailer ID

---

## 🚀 After Setup

Your logo will automatically appear on:
- ✅ Login page header
- ✅ Dashboard sidebar (next to company name)
- ✅ Top navigation bar

And your business name updates will reflect immediately across all pages!

---

## 💡 Quick Alternative (If You're in a Hurry)

Just create the bucket with these minimal settings:
1. **Storage** → **New bucket**
2. Name: `retailer-logos`
3. **Public**: ✅ Yes
4. Click **Create**

The app will work! You can add policies later for better security.
