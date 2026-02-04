'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertCircle, Calendar, ArrowRight } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useCustomerAuth } from '@/lib/contexts/customer-auth-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

type DueRow = {
  id: string;
  enrollment_id: string;
  billing_month: string | null;
  due_date: string | null;
  primary_paid: boolean | null;
  status: string | null;
  enrollments: any;
};

type DueItem = {
  id: string;
  enrollmentId: string;
  planName: string;
  karat: string;
  dueDate: string | null;
  billingMonth: string | null;
  amount: number;
  daysOverdue: number;
};

export default function CustomerDuesPage() {
  const { customer } = useCustomerAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [dues, setDues] = useState<DueItem[]>([]);

  useEffect(() => {
    if (!customer) {
      router.push('/c/login');
      return;
    }

    void loadDues();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customer?.id]);

  const summary = useMemo(() => {
    const totalDue = dues.reduce((sum, d) => sum + d.amount, 0);
    const overdueCount = dues.filter((d) => d.daysOverdue > 0).length;
    return { totalDue, overdueCount };
  }, [dues]);

  async function loadDues() {
    if (!customer) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('enrollment_billing_months')
        .select(
          `id,
           enrollment_id,
           billing_month,
           due_date,
           primary_paid,
           status,
           enrollments!inner(
             id,
             customer_id,
             status,
             karat,
             scheme_templates(name, installment_amount)
           )`
        )
        .eq('enrollments.customer_id', customer.id)
        .eq('primary_paid', false)
        .order('due_date', { ascending: true });

      if (error) throw error;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const items = (data || [])
        .map((row: DueRow) => {
          const enrollment = Array.isArray(row.enrollments) ? row.enrollments[0] : row.enrollments;
          const dueDate = row.due_date ? new Date(row.due_date) : null;
          if (dueDate) dueDate.setHours(0, 0, 0, 0);

          const daysOverdue = dueDate
            ? Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
            : 0;

          const planName = enrollment?.scheme_templates?.name || 'Gold Plan';
          const amount = Number(enrollment?.scheme_templates?.installment_amount || 0);
          const karat = enrollment?.karat || '22K';

          return {
            id: row.id,
            enrollmentId: row.enrollment_id,
            planName,
            karat,
            dueDate: row.due_date,
            billingMonth: row.billing_month,
            amount,
            daysOverdue,
          } as DueItem;
        })
        .filter((item) => {
          if (!item.dueDate) return false;
          const dueDate = new Date(item.dueDate);
          dueDate.setHours(0, 0, 0, 0);
          return dueDate <= today;
        });

      setDues(items);
    } catch (error) {
      console.error('Error loading dues:', error);
      setDues([]);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-xl gold-text">Loading dues...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-gold-50/10 to-background">
      <div className="max-w-3xl mx-auto p-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl jewel-gradient flex items-center justify-center shadow-gold">
            <AlertCircle className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-gold-600 via-gold-500 to-rose-500 bg-clip-text text-transparent">Dues</h1>
            <p className="text-muted-foreground">Your pending monthly installments</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="jewel-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Due</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{summary.totalDue.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Across all active schemes</p>
            </CardContent>
          </Card>
          <Card className="jewel-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{summary.overdueCount}</div>
              <p className="text-xs text-muted-foreground">Installments past due date</p>
            </CardContent>
          </Card>
        </div>

        {dues.length === 0 ? (
          <Card className="jewel-card p-10">
            <div className="text-center text-muted-foreground">
              <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg mb-1">No dues right now</p>
              <p className="text-sm">You’re all caught up with payments.</p>
            </div>
          </Card>
        ) : (
          <div className="space-y-4">
            {dues.map((due) => (
              <Card key={due.id} className="jewel-card">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{due.planName}</h3>
                        <Badge variant="outline" className="text-xs">{due.karat}</Badge>
                      </div>
                      <div className="text-sm text-muted-foreground flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>
                          Due: {due.dueDate ? new Date(due.dueDate).toLocaleDateString('en-IN') : '—'}
                        </span>
                        {due.daysOverdue > 0 && (
                          <Badge variant="destructive" className="text-xs">
                            {due.daysOverdue} days overdue
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Amount due: <span className="font-semibold text-foreground">₹{due.amount.toLocaleString()}</span>
                      </div>
                    </div>
                    <Link href={`/c/pay/${due.enrollmentId}`}>
                      <Button className="gold-gradient text-white">
                        Pay Now <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
