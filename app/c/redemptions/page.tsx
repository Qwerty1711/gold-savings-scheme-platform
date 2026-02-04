'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Award, CheckCircle, Clock, Wallet } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useCustomerAuth } from '@/lib/contexts/customer-auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type Redemption = {
  id: string;
  redemption_status: string | null;
  redemption_date: string | null;
  total_redemption_value: number | null;
  gold_18k_grams: number | null;
  gold_22k_grams: number | null;
  gold_24k_grams: number | null;
  silver_grams: number | null;
  payment_method: string | null;
};

type EligibleEnrollment = {
  id: string;
  plan_name: string;
  karat: string;
  eligible_date: string | null;
  total_grams: number;
  total_paid: number;
};

export default function CustomerRedemptionsPage() {
  const { customer } = useCustomerAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [eligible, setEligible] = useState<EligibleEnrollment[]>([]);

  useEffect(() => {
    if (!customer) {
      router.push('/c/login');
      return;
    }

    void loadRedemptions();
    void loadEligible();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customer?.id]);

  const completedRedemptions = useMemo(
    () => redemptions.filter((r) => r.redemption_status === 'COMPLETED'),
    [redemptions]
  );

  const totalValue = useMemo(
    () => redemptions.reduce((sum, r) => sum + (r.total_redemption_value || 0), 0),
    [redemptions]
  );

  async function loadRedemptions() {
    if (!customer) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('redemptions')
        .select(
          'id, redemption_status, redemption_date, total_redemption_value, gold_18k_grams, gold_22k_grams, gold_24k_grams, silver_grams, payment_method'
        )
        .eq('customer_id', customer.id)
        .order('redemption_date', { ascending: false });

      if (error) throw error;
      setRedemptions((data || []) as Redemption[]);
    } catch (error) {
      console.error('Error loading redemptions:', error);
      setRedemptions([]);
    } finally {
      setLoading(false);
    }
  }

  async function loadEligible() {
    if (!customer) return;

    try {
      const { data: enrollmentsData, error: enrollError } = await supabase
        .from('enrollments')
        .select('id, karat, maturity_date, scheme_templates(name)')
        .eq('customer_id', customer.id);

      if (enrollError) throw enrollError;

      if (!enrollmentsData || enrollmentsData.length === 0) {
        setEligible([]);
        return;
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const matureEnrollments = (enrollmentsData || []).filter((e: any) => {
        if (!e.maturity_date) return false;
        const maturityDate = new Date(e.maturity_date);
        maturityDate.setHours(0, 0, 0, 0);
        return maturityDate <= today;
      });

      if (matureEnrollments.length === 0) {
        setEligible([]);
        return;
      }

      const enrollmentIds = matureEnrollments.map((e: any) => e.id);

      const { data: transactionsData } = await supabase
        .from('transactions')
        .select('enrollment_id, grams_allocated_snapshot, amount_paid')
        .in('enrollment_id', enrollmentIds)
        .eq('payment_status', 'SUCCESS');

      const totalsMap = new Map<string, { grams: number; paid: number }>();
      (transactionsData || []).forEach((t: any) => {
        const current = totalsMap.get(t.enrollment_id) || { grams: 0, paid: 0 };
        totalsMap.set(t.enrollment_id, {
          grams: current.grams + (t.grams_allocated_snapshot || 0),
          paid: current.paid + (t.amount_paid || 0),
        });
      });

      const list = matureEnrollments.map((e: any) => {
        const totals = totalsMap.get(e.id) || { grams: 0, paid: 0 };
        return {
          id: e.id,
          plan_name: e.scheme_templates?.name || 'Gold Plan',
          karat: e.karat || '22K',
          eligible_date: e.maturity_date || null,
          total_grams: totals.grams,
          total_paid: totals.paid,
        } as EligibleEnrollment;
      });

      setEligible(list);
    } catch (error) {
      console.error('Error loading eligible enrollments:', error);
      setEligible([]);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-xl gold-text">Loading redemptions...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-gold-50/10 to-background">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl jewel-gradient flex items-center justify-center shadow-gold">
            <Award className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-gold-600 via-gold-500 to-rose-500 bg-clip-text text-transparent">Redemptions</h1>
            <p className="text-muted-foreground">Track redemption eligibility and history</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="jewel-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Ready to Redeem</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gold-600">{eligible.length}</div>
              <p className="text-xs text-muted-foreground">Eligible enrollments</p>
            </CardContent>
          </Card>
          <Card className="jewel-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{completedRedemptions.length}</div>
              <p className="text-xs text-muted-foreground">Redemptions done</p>
            </CardContent>
          </Card>
          <Card className="jewel-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{totalValue.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">All time</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="eligible" className="space-y-4">
          <TabsList className="bg-gold-50/80 border border-gold-200/60 rounded-xl p-1 shadow-sm">
            <TabsTrigger value="eligible">
              <Clock className="w-4 h-4 mr-2" />
              Eligible ({eligible.length})
            </TabsTrigger>
            <TabsTrigger value="history">
              <CheckCircle className="w-4 h-4 mr-2" />
              History ({redemptions.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="eligible">
            <Card className="jewel-card">
              <CardHeader>
                <CardTitle>Eligible for Redemption</CardTitle>
                <CardDescription>Enrollments that have completed their duration</CardDescription>
              </CardHeader>
              <CardContent>
                {eligible.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground">
                    <Award className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No enrollments are eligible yet.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {eligible.map((item) => (
                      <div key={item.id} className="flex items-center justify-between gap-4 border-b border-gold-100 pb-4 last:border-0 last:pb-0">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold">{item.plan_name}</p>
                            <Badge variant="outline" className="text-xs">{item.karat}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Eligible since {item.eligible_date ? new Date(item.eligible_date).toLocaleDateString('en-IN') : '—'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Total Paid</p>
                          <p className="font-semibold">₹{item.total_paid.toLocaleString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history">
            <Card className="jewel-card">
              <CardHeader>
                <CardTitle>Redemption History</CardTitle>
                <CardDescription>Processed redemptions and status</CardDescription>
              </CardHeader>
              <CardContent>
                {redemptions.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground">
                    <Wallet className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No redemptions yet.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {redemptions.map((item) => {
                      const totalGrams =
                        (item.gold_18k_grams || 0) +
                        (item.gold_22k_grams || 0) +
                        (item.gold_24k_grams || 0) +
                        (item.silver_grams || 0);

                      return (
                        <div key={item.id} className="flex items-center justify-between gap-4 border-b border-gold-100 pb-4 last:border-0 last:pb-0">
                          <div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {(item.redemption_status || 'PENDING').replace(/_/g, ' ')}
                              </Badge>
                              <span className="text-sm text-muted-foreground">
                                {item.redemption_date ? new Date(item.redemption_date).toLocaleDateString('en-IN') : '—'}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground">{totalGrams.toFixed(3)}g redeemed</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-muted-foreground">Value</p>
                            <p className="font-semibold">₹{(item.total_redemption_value || 0).toLocaleString()}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
