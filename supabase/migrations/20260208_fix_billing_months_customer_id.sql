-- Fix missing customer_id on billing months and keep generators consistent
-- Safe to run multiple times

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'enrollment_billing_months'
      AND column_name = 'customer_id'
  ) THEN
    ALTER TABLE enrollment_billing_months
      ADD COLUMN customer_id uuid REFERENCES customers(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_billing_months_customer ON enrollment_billing_months(customer_id);
  END IF;
END $$;

UPDATE enrollment_billing_months ebm
SET customer_id = e.customer_id
FROM enrollments e
WHERE ebm.enrollment_id = e.id
  AND (ebm.customer_id IS NULL OR ebm.customer_id <> e.customer_id);

CREATE OR REPLACE FUNCTION generate_billing_months_for_enrollment(
  p_enrollment_id uuid,
  p_months_ahead int DEFAULT 3
)
RETURNS void AS $$
DECLARE
  v_enrollment RECORD;
  v_plan RECORD;
  v_billing_month date;
  v_due_date date;
  v_months_to_generate int;
  v_month_offset int;
BEGIN
  SELECT e.*
  INTO v_enrollment
  FROM enrollments e
  WHERE e.id = p_enrollment_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Enrollment not found: %', p_enrollment_id;
  END IF;

  SELECT st.duration_months
  INTO v_plan
  FROM scheme_templates st
  WHERE st.id = v_enrollment.plan_id;

  IF NOT FOUND THEN
    RAISE WARNING 'Plan not found for enrollment: %, generating default 12 months', p_enrollment_id;
    v_months_to_generate := 12;
  ELSE
    v_months_to_generate := v_plan.duration_months + p_months_ahead;
  END IF;

  FOR v_month_offset IN 0..v_months_to_generate-1 LOOP
    v_billing_month := DATE_TRUNC('month', v_enrollment.start_date + (v_month_offset || ' months')::interval)::date;

    IF v_enrollment.billing_day_of_month IS NOT NULL THEN
      v_due_date := v_billing_month + interval '1 month';
      v_due_date := (
        DATE_TRUNC('month', v_due_date) +
        (LEAST(v_enrollment.billing_day_of_month,
               EXTRACT(DAY FROM (DATE_TRUNC('month', v_due_date) + interval '1 month' - interval '1 day'))::int) - 1
        ) || ' days'
      )::interval::date;
    ELSE
      v_due_date := (DATE_TRUNC('month', v_billing_month) + interval '1 month' - interval '1 day')::date;
    END IF;

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
      v_enrollment.retailer_id,
      v_enrollment.id,
      v_enrollment.customer_id,
      v_billing_month,
      v_due_date,
      false,
      CASE
        WHEN v_due_date < CURRENT_DATE THEN 'MISSED'
        ELSE 'DUE'
      END
    )
    ON CONFLICT (retailer_id, enrollment_id, billing_month) DO NOTHING;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION update_billing_month_on_payment()
RETURNS TRIGGER AS $$
DECLARE
  v_billing_month date;
  v_customer_id uuid;
BEGIN
  IF NEW.txn_type = 'PRIMARY_INSTALLMENT' AND NEW.payment_status = 'SUCCESS' THEN
    v_billing_month := NEW.billing_month;

    IF v_billing_month IS NULL THEN
      v_billing_month := DATE_TRUNC('month', CURRENT_DATE)::date;
    END IF;

    v_customer_id := NEW.customer_id;
    IF v_customer_id IS NULL THEN
      SELECT e.customer_id
      INTO v_customer_id
      FROM enrollments e
      WHERE e.id = NEW.enrollment_id;
    END IF;

    UPDATE enrollment_billing_months
    SET
      primary_paid = true,
      status = 'PAID',
      updated_at = now()
    WHERE enrollment_id = NEW.enrollment_id
      AND billing_month = v_billing_month;

    IF NOT FOUND THEN
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
        NEW.retailer_id,
        NEW.enrollment_id,
        v_customer_id,
        v_billing_month,
        (v_billing_month + interval '1 month' - interval '1 day')::date,
        true,
        'PAID'
      )
      ON CONFLICT (retailer_id, enrollment_id, billing_month) DO UPDATE
      SET primary_paid = true, status = 'PAID', updated_at = now();
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
