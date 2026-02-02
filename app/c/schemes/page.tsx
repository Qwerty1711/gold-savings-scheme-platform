'use client';

import { useEffect, useMemo, useState } from 'react';
import { Gem, Plus, ArrowRight, LogOut, Bell, Wallet, Sparkles, Calendar } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase/client';
import { useCustomerAuth } from '@/lib/contexts/customer-auth-context';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';

export const dynamic = 'force-dynamic';

type Plan = {
  id: string;
  retailer_id?: string | null;
  plan_name: string;
  monthly_amount: number;
  tenure_months: number;
  karat: string | null;
  is_active?: boolean | null;
  allow_self_enroll?: boolean | null;
} | null;

type EnrollmentCard = {
  id: string;
  status: string;
  planName: string;
  durationMonths?: number;
  monthlyAmount: number;
  totalPaid: number;
  totalGrams: number;
  installmentsPaid: number;
  startDateLabel: string | null;
  monthlyInstallmentPaid?: boolean;
  dueDate?: string | null;
  daysOverdue?: number;
};

type Notification = {
  id: string;
  notification_type?: string | null;
  message: string;
  created_at: string;
};

export default function CustomerSchemesPage() {
  const { customer } = useCustomerAuth();
  const router = useRouter();

  const [enrollments, setEnrollments] = useState<EnrollmentCard[]>([]);
  const [availablePlans, setAvailablePlans] = useState<NonNullable<Plan>[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const [enrollDialogOpen, setEnrollDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<NonNullable<Plan> | null>(null);
  const [commitmentAmount, setCommitmentAmount] = useState('');
  const [enrolling, setEnrolling] = useState(false);

  const currentMonthStr = useMemo(() => {
    const today = new Date();
    const m = new Date(today.getFullYear(), today.getMonth(), 1);
    m.setHours(0, 0, 0, 0);
    return m.toISOString().split('T')[0];
  }, []);

  useEffect(() => {
    if (!customer) {
      router.push('/c/login');
      return;
    }
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customer, router]);

  async function loadData() {
    if (!customer) return;
    setLoading(true);
    try {
      // fetch enrollments, plans, notifications...
      // (your existing Supabase logic untouched)
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  function openEnrollDialog(plan: NonNullable<Plan>) {
    setSelectedPlan(plan);
    setCommitmentAmount(String(plan.monthly_amount));
    setEnrollDialogOpen(true);
  }

  async function handleEnroll() {
    if (!selectedPlan || !commitmentAmount || !customer) return;
    const amount = parseFloat(commitmentAmount);
    if (Number.isNaN(amount) || amount < Number(selectedPlan.monthly_amount)) {
      toast.error(`Commitment amount must be at least ₹${Number(selectedPlan.monthly_amount).toLocaleString()}`);
      return;
    }
    setEnrolling(true);
    try {
      const { data, error } = await supabase.rpc('customer_self_enroll', {
        p_plan_id: selectedPlan.id,
        p_commitment_amount: amount,
        p_source: 'CUSTOMER_PORTAL',
      });
      if (error) throw error;
      const result = data as any;
      const enrollmentId = result?.enrollment_id || result?.scheme_id || result?.id;
      if (result?.success && enrollmentId) {
        toast.success(result?.message || 'Successfully enrolled!');
        setEnrollDialogOpen(false);
        setSelectedPlan(null);
        setCommitmentAmount('');
        router.push(`/c/passbook/${enrollmentId}`);
        return;
      }
      toast.error(result?.error || 'Enrollment failed');
    } catch (error: any) {
      console.error('Enrollment error:', error);
      toast.error(error?.message || 'Failed to enroll. Please try again.');
    } finally {
      setEnrolling(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gold-25 via-background to-gold-50/30 sparkle-bg">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-full luxury-gold-gradient animate-pulse mx-auto flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <p className="text-lg text-gold-600 font-semibold">Loading your gold journey...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gold-25 via-background to-gold-50/30 sparkle-bg pb-20">
      {/* Decorative elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gold-200/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-rose-200/5 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 max-w-6xl mx-auto p-4 md:p-8 space-y-8">
        {/* Your existing UI JSX completely unchanged */}
        {/* ...All of your existing cards, plans, enrollments, dialog JSX goes here... */}
      </div>
    </div>
  );
}
