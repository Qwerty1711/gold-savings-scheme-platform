-- Migration: Audit triggers for major tables
-- Date: 2026-02-11

-- 1. gold_rates audit trigger
CREATE OR REPLACE FUNCTION log_gold_rate_change()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_log (
    retailer_id,
    actor_id,
    action,
    entity,
    entity_id,
    detail,
    created_at
  ) VALUES (
    NEW.retailer_id,
    auth.uid(),
    TG_OP,
    'gold_rates',
    NEW.id,
    row_to_json(NEW),
    now()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_audit_gold_rates ON gold_rates;
CREATE TRIGGER trg_audit_gold_rates
AFTER INSERT OR UPDATE OR DELETE ON gold_rates
FOR EACH ROW EXECUTE FUNCTION log_gold_rate_change();

-- 2. silver_rates audit trigger
CREATE OR REPLACE FUNCTION log_silver_rate_change()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_log (
    retailer_id,
    actor_id,
    action,
    entity,
    entity_id,
    detail,
    created_at
  ) VALUES (
    NEW.retailer_id,
    auth.uid(),
    TG_OP,
    'silver_rates',
    NEW.id,
    row_to_json(NEW),
    now()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_audit_silver_rates ON silver_rates;
CREATE TRIGGER trg_audit_silver_rates
AFTER INSERT OR UPDATE OR DELETE ON silver_rates
FOR EACH ROW EXECUTE FUNCTION log_silver_rate_change();

-- 3. transactions audit trigger
CREATE OR REPLACE FUNCTION log_transaction_change()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_log (
    retailer_id,
    actor_id,
    action,
    entity,
    entity_id,
    detail,
    created_at
  ) VALUES (
    NEW.retailer_id,
    auth.uid(),
    TG_OP,
    'transactions',
    NEW.id,
    row_to_json(NEW),
    now()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_audit_transactions ON transactions;
CREATE TRIGGER trg_audit_transactions
AFTER INSERT OR UPDATE OR DELETE ON transactions
FOR EACH ROW EXECUTE FUNCTION log_transaction_change();

-- 4. enrollments audit trigger
CREATE OR REPLACE FUNCTION log_enrollment_change()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_log (
    retailer_id,
    actor_id,
    action,
    entity,
    entity_id,
    detail,
    created_at
  ) VALUES (
    NEW.retailer_id,
    auth.uid(),
    TG_OP,
    'enrollments',
    NEW.id,
    row_to_json(NEW),
    now()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_audit_enrollments ON enrollments;
CREATE TRIGGER trg_audit_enrollments
AFTER INSERT OR UPDATE OR DELETE ON enrollments
FOR EACH ROW EXECUTE FUNCTION log_enrollment_change();

-- 5. customers audit trigger
CREATE OR REPLACE FUNCTION log_customer_change()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_log (
    retailer_id,
    actor_id,
    action,
    entity,
    entity_id,
    detail,
    created_at
  ) VALUES (
    NEW.retailer_id,
    auth.uid(),
    TG_OP,
    'customers',
    NEW.id,
    row_to_json(NEW),
    now()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_audit_customers ON customers;
CREATE TRIGGER trg_audit_customers
AFTER INSERT OR UPDATE OR DELETE ON customers
FOR EACH ROW EXECUTE FUNCTION log_customer_change();

-- 6. schemes audit trigger
CREATE OR REPLACE FUNCTION log_scheme_change()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_log (
    retailer_id,
    actor_id,
    action,
    entity,
    entity_id,
    detail,
    created_at
  ) VALUES (
    NEW.retailer_id,
    auth.uid(),
    TG_OP,
    'schemes',
    NEW.id,
    row_to_json(NEW),
    now()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_audit_schemes ON schemes;
CREATE TRIGGER trg_audit_schemes
AFTER INSERT OR UPDATE OR DELETE ON schemes
FOR EACH ROW EXECUTE FUNCTION log_scheme_change();

-- End of migration
