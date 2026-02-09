-- 20260209_create_get_dashboard_metrics_rpc.sql
-- Dashboard Metrics RPC for Admin/Staff Pulse Page (GoldSaver)
-- Includes dues/outstanding/overdue logic

CREATE OR REPLACE FUNCTION public.get_dashboard_metrics(
  p_retailer_id uuid,
  p_start_date timestamptz,
  p_end_date timestamptz
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_result jsonb;
BEGIN
  -- Collections (payments)
  WITH txns AS (
    SELECT t.*, e.karat
    FROM transactions t
    LEFT JOIN enrollments e ON t.enrollment_id = e.id
    WHERE t.retailer_id = p_retailer_id
      AND t.payment_status = 'SUCCESS'
      AND t.paid_at >= p_start_date
      AND t.paid_at < p_end_date
  ),
  enrolls AS (
    SELECT * FROM enrollments WHERE retailer_id = p_retailer_id
  ),
  customers AS (
    SELECT * FROM customers WHERE retailer_id = p_retailer_id
  ),
  rates AS (
    SELECT metal_type, rate_per_gram, valid_from
    FROM gold_rates
    WHERE retailer_id = p_retailer_id
      AND is_active = true
  ),
  -- Dues/Overdue logic
  billing AS (
    SELECT eb.*, e.karat
    FROM enrollment_billing_months eb
    JOIN enrollments e ON eb.enrollment_id = e.id
    WHERE e.retailer_id = p_retailer_id
      AND eb.due_date >= p_start_date::date
      AND eb.due_date < p_end_date::date
  )
  SELECT jsonb_build_object(
    -- Collections
    'period_collections', COALESCE((SELECT SUM(amount_paid) FROM txns), 0),
    'collections_18k', COALESCE((SELECT SUM(amount_paid) FROM txns WHERE karat = '18K'), 0),
    'collections_22k', COALESCE((SELECT SUM(amount_paid) FROM txns WHERE karat = '22K'), 0),
    'collections_24k', COALESCE((SELECT SUM(amount_paid) FROM txns WHERE karat = '24K'), 0),
    'collections_silver', COALESCE((SELECT SUM(amount_paid) FROM txns WHERE karat = 'SILVER'), 0),

    -- Gold allocated
    'gold_18k_allocated', COALESCE((SELECT SUM(grams_allocated_snapshot) FROM txns WHERE karat = '18K'), 0),
    'gold_22k_allocated', COALESCE((SELECT SUM(grams_allocated_snapshot) FROM txns WHERE karat = '22K'), 0),
    'gold_24k_allocated', COALESCE((SELECT SUM(grams_allocated_snapshot) FROM txns WHERE karat = '24K'), 0),
    'silver_allocated', COALESCE((SELECT SUM(grams_allocated_snapshot) FROM txns WHERE karat = 'SILVER'), 0),

    -- Dues & overdue
    'dues_outstanding', COALESCE((SELECT SUM(CASE WHEN NOT primary_paid THEN eb.monthly_amount ELSE 0 END) FROM enrollment_billing_months eb JOIN enrollments e ON eb.enrollment_id = e.id WHERE e.retailer_id = p_retailer_id AND eb.due_date >= p_start_date::date AND eb.due_date < p_end_date::date), 0),
    'overdue_count', COALESCE((SELECT COUNT(*) FROM enrollment_billing_months eb JOIN enrollments e ON eb.enrollment_id = e.id WHERE e.retailer_id = p_retailer_id AND eb.due_date < CURRENT_DATE AND NOT primary_paid), 0),

    -- Enrollments
    'total_enrollments_period', (SELECT COUNT(*) FROM enrollments WHERE retailer_id = p_retailer_id AND created_at >= p_start_date AND created_at < p_end_date),
    'active_enrollments_period', (SELECT COUNT(*) FROM enrollments WHERE retailer_id = p_retailer_id AND status = 'ACTIVE'),

    -- Customers
    'total_customers_period', (SELECT COUNT(*) FROM customers WHERE retailer_id = p_retailer_id AND created_at >= p_start_date AND created_at < p_end_date),
    'active_customers_period', (SELECT COUNT(*) FROM customers WHERE retailer_id = p_retailer_id AND status = 'ACTIVE'),

    -- Current rates
    'current_rates', (
      SELECT jsonb_object_agg(metal_type, jsonb_build_object('rate', rate_per_gram, 'valid_from', valid_from))
      FROM rates
    )
  )
  INTO v_result;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_dashboard_metrics(uuid, timestamptz, timestamptz) TO authenticated;
