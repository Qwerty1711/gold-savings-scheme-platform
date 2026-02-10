-- Migration: Enforce 4-decimal precision for gold rate and grams allocation
-- Ensures gold_rates.rate_per_gram and transactions.grams_allocated_snapshot use numeric(12,4)



-- Drop dependent views/materialized views if exist
DROP VIEW IF EXISTS gold_rate_audit CASCADE;
DROP MATERIALIZED VIEW IF EXISTS dashboard_metrics_daily CASCADE;


DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'gold_rates' AND column_name = 'rate_per_gram') THEN
    EXECUTE 'ALTER TABLE gold_rates ALTER COLUMN rate_per_gram TYPE numeric(12,4)';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'grams_allocated_snapshot') THEN
    EXECUTE 'ALTER TABLE transactions ALTER COLUMN grams_allocated_snapshot TYPE numeric(12,4)';
  END IF;
END $$;


-- Recreate gold_rate_audit view (structure copied from previous migrations)
CREATE OR REPLACE VIEW gold_rate_audit AS
SELECT
  gr.id,
  gr.retailer_id,
  gr.karat,
  gr.rate_per_gram,
  gr.effective_from,
  gr.created_by,
  gr.created_at,
  up.full_name AS created_by_name,
  LAG(gr.rate_per_gram) OVER (PARTITION BY gr.retailer_id, gr.karat ORDER BY gr.effective_from) AS previous_rate,
  CASE
    WHEN LAG(gr.rate_per_gram) OVER (PARTITION BY gr.retailer_id, gr.karat ORDER BY gr.effective_from) IS NULL THEN NULL
    ELSE ROUND(
      ((gr.rate_per_gram - LAG(gr.rate_per_gram) OVER (PARTITION BY gr.retailer_id, gr.karat ORDER BY gr.effective_from))
      / LAG(gr.rate_per_gram) OVER (PARTITION BY gr.retailer_id, gr.karat ORDER BY gr.effective_from)) * 100, 2)
  END AS percent_change
FROM gold_rates gr
LEFT JOIN user_profiles up ON gr.created_by = up.id;



CREATE MATERIALIZED VIEW dashboard_metrics_daily AS
WITH txn_day AS (
  SELECT
    t.retailer_id,
    date_trunc('day', t.paid_at) AS day,
    SUM(t.amount_paid) AS total_collections,
    SUM(CASE WHEN e.karat = '18K' THEN t.amount_paid ELSE 0 END) AS collections_18k,
    SUM(CASE WHEN e.karat = '22K' THEN t.amount_paid ELSE 0 END) AS collections_22k,
    SUM(CASE WHEN e.karat = '24K' THEN t.amount_paid ELSE 0 END) AS collections_24k,
    SUM(CASE WHEN e.karat = 'SILVER' THEN t.amount_paid ELSE 0 END) AS collections_silver,
    SUM(t.grams_allocated_snapshot) AS gold_allocated,
    SUM(CASE WHEN e.karat = '18K' THEN t.grams_allocated_snapshot ELSE 0 END) AS gold_18k_allocated,
    SUM(CASE WHEN e.karat = '22K' THEN t.grams_allocated_snapshot ELSE 0 END) AS gold_22k_allocated,
    SUM(CASE WHEN e.karat = '24K' THEN t.grams_allocated_snapshot ELSE 0 END) AS gold_24k_allocated,
    SUM(CASE WHEN e.karat = 'SILVER' THEN t.grams_allocated_snapshot ELSE 0 END) AS silver_allocated
  FROM transactions t
  LEFT JOIN enrollments e ON t.enrollment_id = e.id
  WHERE t.payment_status = 'SUCCESS'
  GROUP BY t.retailer_id, date_trunc('day', t.paid_at)
)
SELECT
  d.retailer_id,
  d.day AS date,
  d.total_collections,
  d.collections_18k,
  d.collections_22k,
  d.collections_24k,
  d.collections_silver,
  d.gold_allocated,
  d.gold_18k_allocated,
  d.gold_22k_allocated,
  d.gold_24k_allocated,
  d.silver_allocated,
  NULL::numeric AS dues_outstanding,
  NULL::integer AS overdue_count,
  e.total_enrollments,
  e.active_enrollments,
  c.total_customers,
  c.active_customers,
  NULL::integer AS redemptions_completed,
  r.redemptions_ready,
  gr18.rate_18k,
  gr22.rate_22k,
  gr24.rate_24k,
  grs.rate_silver
FROM txn_day d
LEFT JOIN LATERAL (
  SELECT COUNT(*) AS total_enrollments,
         COUNT(*) FILTER (WHERE status = 'ACTIVE') AS active_enrollments
  FROM enrollments e2
  WHERE e2.retailer_id = d.retailer_id AND date_trunc('day', e2.created_at) = d.day
) e ON TRUE
LEFT JOIN LATERAL (
  SELECT COUNT(*) AS total_customers,
         COUNT(*) FILTER (WHERE status = 'ACTIVE') AS active_customers
  FROM customers c
  WHERE c.retailer_id = d.retailer_id AND date_trunc('day', c.created_at) = d.day
) c ON TRUE
LEFT JOIN LATERAL (
  SELECT COUNT(*) AS redemptions_ready
  FROM enrollments e2
  WHERE e2.retailer_id = d.retailer_id AND e2.status = 'READY_TO_REDEEM' AND date_trunc('day', e2.maturity_date) = d.day
) r ON TRUE
LEFT JOIN LATERAL (
  SELECT rate_per_gram AS rate_18k
  FROM gold_rates gr
  WHERE gr.retailer_id = d.retailer_id AND gr.karat = '18K' AND gr.effective_from <= d.day
  ORDER BY gr.effective_from DESC LIMIT 1
) gr18 ON TRUE
LEFT JOIN LATERAL (
  SELECT rate_per_gram AS rate_22k
  FROM gold_rates gr
  WHERE gr.retailer_id = d.retailer_id AND gr.karat = '22K' AND gr.effective_from <= d.day
  ORDER BY gr.effective_from DESC LIMIT 1
) gr22 ON TRUE
LEFT JOIN LATERAL (
  SELECT rate_per_gram AS rate_24k
  FROM gold_rates gr
  WHERE gr.retailer_id = d.retailer_id AND gr.karat = '24K' AND gr.effective_from <= d.day
  ORDER BY gr.effective_from DESC LIMIT 1
) gr24 ON TRUE
LEFT JOIN LATERAL (
  SELECT rate_per_gram AS rate_silver
  FROM gold_rates gr
  WHERE gr.retailer_id = d.retailer_id AND gr.karat = 'SILVER' AND gr.effective_from <= d.day
  ORDER BY gr.effective_from DESC LIMIT 1
) grs ON TRUE;

COMMENT ON COLUMN gold_rates.rate_per_gram IS 'Gold rate in rupees per gram (4 decimal precision)';
COMMENT ON COLUMN transactions.grams_allocated_snapshot IS 'Allocated grams (4 decimal precision, locked at transaction time)';
