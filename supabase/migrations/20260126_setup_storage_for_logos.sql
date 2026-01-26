/*
  # Setup Storage for Retailer Logos
  
  This migration creates the storage bucket for retailer logos and sets up proper RLS policies.
*/

-- Create storage bucket for retailer logos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'retailer-logos',
  'retailer-logos',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to upload logos to their retailer folder
DROP POLICY IF EXISTS "Authenticated users can upload retailer logos" ON storage.objects;
CREATE POLICY "Authenticated users can upload retailer logos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'retailer-logos' AND
    (storage.foldername(name))[1] IN (
      SELECT retailer_id::text FROM user_profiles WHERE id = auth.uid()
    )
  );

-- Policy: Allow authenticated users to update their retailer logos
DROP POLICY IF EXISTS "Authenticated users can update retailer logos" ON storage.objects;
CREATE POLICY "Authenticated users can update retailer logos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'retailer-logos' AND
    (storage.foldername(name))[1] IN (
      SELECT retailer_id::text FROM user_profiles WHERE id = auth.uid()
    )
  );

-- Policy: Allow authenticated users to delete their retailer logos
DROP POLICY IF EXISTS "Authenticated users can delete retailer logos" ON storage.objects;
CREATE POLICY "Authenticated users can delete retailer logos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'retailer-logos' AND
    (storage.foldername(name))[1] IN (
      SELECT retailer_id::text FROM user_profiles WHERE id = auth.uid()
    )
  );

-- Policy: Allow public to view retailer logos
DROP POLICY IF EXISTS "Public can view retailer logos" ON storage.objects;
CREATE POLICY "Public can view retailer logos"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'retailer-logos');
