/*
  # Fix assigned_staff_id foreign key constraint
  
  The enrollments.assigned_staff_id should reference user_profiles(id), not auth.users(id).
  This migration drops the old constraint and adds the correct one.
*/

-- Drop the existing assigned_staff_id foreign key constraint
ALTER TABLE enrollments 
  DROP CONSTRAINT IF EXISTS enrollments_assigned_staff_id_fkey;

-- Add the correct foreign key constraint pointing to user_profiles
ALTER TABLE enrollments 
  ADD CONSTRAINT enrollments_assigned_staff_id_fkey 
  FOREIGN KEY (assigned_staff_id) 
  REFERENCES user_profiles(id) 
  ON DELETE SET NULL;

-- Do the same for created_by if needed
ALTER TABLE enrollments 
  DROP CONSTRAINT IF EXISTS enrollments_created_by_fkey;

ALTER TABLE enrollments 
  ADD CONSTRAINT enrollments_created_by_fkey 
  FOREIGN KEY (created_by) 
  REFERENCES user_profiles(id) 
  ON DELETE SET NULL;
