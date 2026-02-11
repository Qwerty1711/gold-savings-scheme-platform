-- Migration: Drop notification_type and add template_key to notification_queue

DO $$
BEGIN
  -- Drop notification_type column if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='notification_queue' AND column_name='notification_type'
  ) THEN
    ALTER TABLE notification_queue DROP COLUMN notification_type;
  END IF;

  -- Add template_key column if it does not exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='notification_queue' AND column_name='template_key'
  ) THEN
    ALTER TABLE notification_queue ADD COLUMN template_key text;
  END IF;
END $$;

-- Optionally, drop the notification_type enum if not used elsewhere
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE udt_name = 'notification_type'
  ) THEN
    DROP TYPE IF EXISTS notification_type;
  END IF;
END $$;
