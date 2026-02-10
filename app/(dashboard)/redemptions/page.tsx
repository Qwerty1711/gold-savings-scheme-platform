import { createServerClient } from '@/lib/supabase/server';
import { RedemptionsClient } from './RedemptionsClient';
    if (!profile?.retailer_id) return;

    const [rate18K, rate22K, rate24K, rateSilver] = await Promise.all([
import { createServerClient } from '@/lib/supabase/server';
import { RedemptionsClient } from './RedemptionsClient';

export default async function RedemptionsPage() {
  // Get retailer_id from cookies/session
  const supabase = createServerClient();
  const cookieStore = cookies();
  const retailerId = cookieStore.get('retailer_id')?.value;
  if (!retailerId) {
    // Optionally render error or fallback UI
    return <div>No retailer session found.</div>;
  }

  // Fetch current gold/silver rates
  const [rate18K, rate22K, rate24K, rateSilver] = await Promise.all([
    supabase
      .from('gold_rates')
      .select('rate_per_gram')
      .eq('retailer_id', retailerId)
      .eq('karat', '18K')
      .order('effective_from', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('gold_rates')
      .select('rate_per_gram')
      .eq('retailer_id', retailerId)
      .eq('karat', '22K')
      .order('effective_from', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('gold_rates')
      .select('rate_per_gram')
      .eq('retailer_id', retailerId)
      .eq('karat', '24K')
      .order('effective_from', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('gold_rates')
      .select('rate_per_gram')
      .eq('retailer_id', retailerId)
      .eq('karat', 'SILVER')
      .order('effective_from', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const currentRates = {
    '18K': rate18K.data?.rate_per_gram || 0,
    '22K': rate22K.data?.rate_per_gram || 0,
    '24K': rate24K.data?.rate_per_gram || 0,
    SILVER: rateSilver.data?.rate_per_gram || 0,
  };

  // Fetch redemptions
  const { data: redemptionsData } = await supabase
    .from('redemptions')
    .select(`
      id,
      customer_id,
      enrollment_id,
      redemption_status,
      redemption_date,
      processed_by,
      processed_at,
      total_redemption_value,
      gold_18k_grams,
      gold_22k_grams,
      gold_24k_grams,
      silver_grams,
      customers(full_name, phone),
      enrollments(
        karat,
        scheme_templates(name)
      )
    `)
    .eq('retailer_id', retailerId)
    .order('redemption_date', { ascending: false });

  // Fetch processed_by names
  const processedByIds = Array.from(
    new Set((redemptionsData || []).map((row: any) => row.processed_by).filter(Boolean))
  ) as string[];
  let processedByMap: Record<string, string> = {};
  if (processedByIds.length > 0) {
    const { data: processedByProfiles } = await supabase
      .from('user_profiles')
      .select('id, full_name')
      .in('id', processedByIds);
    (processedByProfiles || []).forEach((p: any) => {
      processedByMap[p.id] = p.full_name;
    });
  }

  function safeNumber(v: unknown): number {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }

  const redemptions = (redemptionsData || []).map((row: any) => ({
    id: row.id,
    customer_name: row.customers?.full_name || 'Unknown',
    customer_phone: row.customers?.phone || '',
    enrollment_karat: row.enrollments?.karat || '22K',
    scheme_name: row.enrollments?.scheme_templates?.name || 'Unknown Plan',
    gold_18k_grams: safeNumber(row.gold_18k_grams),
    gold_22k_grams: safeNumber(row.gold_22k_grams),
    gold_24k_grams: safeNumber(row.gold_24k_grams),
    silver_grams: safeNumber(row.silver_grams),
    total_redemption_value: safeNumber(row.total_redemption_value),
    redemption_status: row.redemption_status || 'PENDING',
    redemption_date: row.redemption_date,
    processed_by_name: processedByMap[row.processed_by] || null,
    processed_at: row.processed_at || null,
  }));

  // Fetch eligible enrollments
  const { data: enrollmentsData } = await supabase
    .from('enrollments')
    .select(`
      id,
      customer_id,
      plan_id,
      karat,
      created_at,
      maturity_date,
      commitment_amount,
      customers(full_name, phone),
      scheme_templates(name, duration_months)
    `)
    .eq('retailer_id', retailerId)
    .eq('status', 'ACTIVE');

  const enrollmentIds = (enrollmentsData || []).map((e: any) => e.id);
  const { data: transactionsData } = await supabase
    .from('transactions')
    .select('enrollment_id, grams_allocated_snapshot, amount_paid, txn_type')
    .eq('retailer_id', retailerId)
    .in('enrollment_id', enrollmentIds)
    .eq('payment_status', 'SUCCESS');

  const gramsMap = new Map<string, { grams: number; paid: number; primaryPaid: number }>();
  (transactionsData || []).forEach((t: any) => {
    const current = gramsMap.get(t.enrollment_id) || { grams: 0, paid: 0, primaryPaid: 0 };
    const paid = t.amount_paid || 0;
    const isPrimary = t.txn_type === 'PRIMARY_INSTALLMENT';
    gramsMap.set(t.enrollment_id, {
      grams: current.grams + (t.grams_allocated_snapshot || 0),
      paid: current.paid + paid,
      primaryPaid: current.primaryPaid + (isPrimary ? paid : 0),
    });
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const eligibleEnrollments = (enrollmentsData || [])
    .filter((e: any) => {
      const durationMonths = e.scheme_templates?.duration_months || 0;
      const commitmentAmount = e.commitment_amount || 0;
      const requiredDue = commitmentAmount * durationMonths;
      if (!durationMonths || !commitmentAmount || !requiredDue) return false;
      const maturityBase = e.maturity_date
        ? new Date(e.maturity_date)
        : e.created_at
          ? new Date(e.created_at)
          : null;
      if (!maturityBase) return false;
      if (!e.maturity_date && durationMonths) {
        maturityBase.setMonth(maturityBase.getMonth() + durationMonths);
      }
      maturityBase.setHours(0, 0, 0, 0);
      if (maturityBase > today) return false;
      const totals = gramsMap.get(e.id) || { grams: 0, paid: 0, primaryPaid: 0 };
      if (totals.grams <= 0) return false;
      if (totals.primaryPaid < requiredDue) return false;
      return true;
    })
    .map((e: any) => {
      const totals = gramsMap.get(e.id) || { grams: 0, paid: 0, primaryPaid: 0 };
      const durationMonths = e.scheme_templates?.duration_months || 0;
      let eligibleDate = e.maturity_date as string | null;
      if (!eligibleDate && e.created_at && durationMonths) {
        const computed = new Date(e.created_at);
        computed.setMonth(computed.getMonth() + durationMonths);
        eligibleDate = computed.toISOString();
      }
      return {
        id: e.id,
        customer_id: e.customer_id,
        customer_name: e.customers?.full_name || 'Unknown',
        customer_phone: e.customers?.phone || '',
        plan_name: e.scheme_templates?.name || 'Unknown Plan',
        karat: e.karat || '22K',
        created_at: e.created_at,
        eligible_date: eligibleDate || e.created_at,
        total_grams: totals.grams,
        total_paid: totals.paid,
      };
    });

  return (
    <RedemptionsClient
      redemptions={redemptions}
      eligibleEnrollments={eligibleEnrollments}
      currentRates={currentRates}
    />
  );
}
            : e.created_at
