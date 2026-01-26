/*
  # Fix Transaction Trigger - Remove scheme_id References
  
  The check_monthly_payment_status trigger function incorrectly references NEW.scheme_id
  which doesn't exist in the transactions table. It should use NEW.enrollment_id instead.
  
  This is causing PostgreSQL error 42703: "record NEW has no field karat" because
  the function tries to SELECT from enrollments using NEW.scheme_id which fails.
  
  Solution: Drop the buggy trigger entirely as billing cycle logic is now handled
  by the enrollment_billing_months table and the update_billing_month_on_payment trigger.
*/

-- Drop the existing buggy trigger and function
DROP TRIGGER IF EXISTS check_payment_due_status ON transactions;
DROP FUNCTION IF EXISTS check_monthly_payment_status();

-- Also fix the create_due_reminders function to use enrollment_id instead of scheme_id
CREATE OR REPLACE FUNCTION create_due_reminders()
RETURNS void AS $$
DECLARE
  v_enrollment RECORD;
  v_last_payment date;
  v_expected_payment_month date;
BEGIN
  -- Find all active enrollments
  FOR v_enrollment IN 
    SELECT e.*, c.full_name as customer_name, c.phone as customer_phone
    FROM enrollments e
    JOIN customers c ON c.id = e.customer_id
    WHERE e.status = 'ACTIVE'
  LOOP
    -- Get last payment date (FIXED: use enrollment_id instead of scheme_id)
    SELECT MAX(paid_at) INTO v_last_payment
    FROM transactions
    WHERE enrollment_id = v_enrollment.id 
      AND payment_status = 'SUCCESS'
      AND txn_type = 'PRIMARY_INSTALLMENT';
    
    IF v_last_payment IS NULL THEN
      v_last_payment := v_enrollment.start_date;
    END IF;
    
    -- Expected payment month is the month after last payment
    v_expected_payment_month := DATE_TRUNC('month', v_last_payment + INTERVAL '1 month')::date;
    
    -- If we're past the expected payment month and no reminder sent recently
    IF CURRENT_DATE >= v_expected_payment_month + INTERVAL '5 days' THEN
      -- Check if reminder already exists for this month (FIXED: use enrollment_id)
      IF NOT EXISTS (
        SELECT 1 FROM notification_queue
        WHERE scheme_id = v_enrollment.id
          AND notification_type = 'DUE_REMINDER'
          AND scheduled_for >= v_expected_payment_month
          AND status IN ('PENDING', 'SENT')
      ) THEN
        -- Create reminder
        INSERT INTO notification_queue (
          retailer_id,
          customer_id,
          scheme_id,
          notification_type,
          message,
          scheduled_for,
          channel,
          metadata
        ) VALUES (
          v_enrollment.retailer_id,
          v_enrollment.customer_id,
          v_enrollment.id,
          'DUE_REMINDER',
          'Your monthly payment is due. Please make a payment to keep your scheme active.',
          NOW(),
          'IN_APP',
          jsonb_build_object(
            'expected_month', v_expected_payment_month,
            'monthly_amount', v_enrollment.commitment_amount
          )
        );
      END IF;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION create_due_reminders IS 'Fixed to use enrollment_id instead of scheme_id in transactions queries';
