-- QUICK FIX: Disable the buggy trigger temporarily
DROP TRIGGER IF EXISTS trigger_auto_generate_billing_months ON enrollments;

-- Add karat column if missing
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='enrollments' AND column_name='karat') THEN
    ALTER TABLE enrollments ADD COLUMN karat text DEFAULT '22K';
  END IF;
END $$;

-- Fix the function with MAKE_INTERVAL
CREATE OR REPLACE FUNCTION generate_billing_months_for_scheme(
  p_scheme_id uuid,
  p_months_ahead integer DEFAULT 0
)
RETURNS void AS $$
DECLARE
  v_scheme RECORD;
  v_months_to_generate integer;
  v_month_offset integer;
  v_billing_month date;
  v_due_date date;
BEGIN
  -- Get enrollment details with plan duration from scheme_templates
  SELECT 
    e.id,
    e.billing_day_of_month,
    e.start_date,
    e.retailer_id,
    e.customer_id,
    st.duration_months
  INTO v_scheme
  FROM enrollments e
  JOIN scheme_templates st ON e.plan_id = st.id
  WHERE e.id = p_scheme_id;
  
  IF NOT FOUND THEN
    RETURN; -- Don't fail, just return
  END IF;
  
  v_months_to_generate := COALESCE(v_scheme.duration_months, 12) + p_months_ahead;
  
  FOR v_month_offset IN 0..v_months_to_generate-1 LOOP
    -- Use MAKE_INTERVAL instead of string concatenation
    v_billing_month := DATE_TRUNC('month', v_scheme.start_date + MAKE_INTERVAL(months => v_month_offset))::date;
    v_due_date := v_billing_month + INTERVAL '1 month' - INTERVAL '1 day';
    
    INSERT INTO enrollment_billing_months (
      retailer_id,
      enrollment_id,
      customer_id,
      billing_month,
      due_date,
      primary_paid,
      status
    )
    VALUES (
      v_scheme.retailer_id,
      v_scheme.id,
      v_scheme.customer_id,
      v_billing_month,
      v_due_date,
      false,
      'DUE'
    )
    ON CONFLICT (retailer_id, enrollment_id, billing_month) DO NOTHING;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-enable trigger with the fixed function
CREATE TRIGGER trigger_auto_generate_billing_months
  AFTER INSERT ON enrollments
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_billing_months();
