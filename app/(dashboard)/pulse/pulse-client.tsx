'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  TrendingUp,
  Users,
  UserCheck,
  Coins,
  Clock,
  Edit,
  ArrowRight,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

/* -------------------------------------------------------------------------- */
/*                                   TYPES                                    */
/* -------------------------------------------------------------------------- */

type Karat = '18K' | '22K' | '24K' | 'SILVER';

const allowedKarats: readonly Karat[] = ['18K', '22K', '24K', 'SILVER'];

function isValidKarat(value: string): value is Karat {
  return allowedKarats.includes(value as Karat);
}

type CurrentRate = {
  rate_per_gram: number;
  effective_from: string;
};

type PulseMetrics = {
  period_collections?: number;
  collections_18k?: number;
  collections_22k?: number;
  collections_24k?: number;
  collections_silver?: number;

  gold_18k_allocated?: number;
  gold_22k_allocated?: number;
  gold_24k_allocated?: number;
  silver_allocated?: number;

  dues_outstanding?: number;
  overdue_count?: number;

  total_enrollments_period?: number;
  active_enrollments_period?: number;

  total_customers_period?: number;
  active_customers_period?: number;

  current_rates?: {
    '18K'?: CurrentRate;
    '22K'?: CurrentRate;
    '24K'?: CurrentRate;
    SILVER?: CurrentRate;
  };
};

type PulseClientProps = {
  initialMetrics: PulseMetrics;
};

/* -------------------------------------------------------------------------- */
/*                               UTIL FUNCTIONS                               */
/* -------------------------------------------------------------------------- */

function safeNumber(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/* -------------------------------------------------------------------------- */
/*                                COMPONENT                                   */
/* -------------------------------------------------------------------------- */

export function PulseClient({ initialMetrics }: PulseClientProps) {
  const router = useRouter();

  const today = useMemo(
    () =>
      new Date().toLocaleDateString('en-IN', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }),
    []
  );

  const [updateRateDialog, setUpdateRateDialog] = useState(false);
  const [newRate, setNewRate] = useState('');
  const [selectedKarat, setSelectedKarat] = useState<Karat>('22K');
  const [updating, setUpdating] = useState(false);

  const metrics = {
    periodCollections: safeNumber(initialMetrics?.period_collections),
    collections18K: safeNumber(initialMetrics?.collections_18k),
    collections22K: safeNumber(initialMetrics?.collections_22k),
    collections24K: safeNumber(initialMetrics?.collections_24k),
    collectionsSilver: safeNumber(initialMetrics?.collections_silver),

    gold18KAllocated: safeNumber(initialMetrics?.gold_18k_allocated),
    gold22KAllocated: safeNumber(initialMetrics?.gold_22k_allocated),
    gold24KAllocated: safeNumber(initialMetrics?.gold_24k_allocated),
    silverAllocated: safeNumber(initialMetrics?.silver_allocated),

    duesOutstanding: safeNumber(initialMetrics?.dues_outstanding),
    overdueCount: safeNumber(initialMetrics?.overdue_count),

    totalEnrollmentsPeriod: safeNumber(initialMetrics?.total_enrollments_period),
    activeEnrollmentsPeriod: safeNumber(initialMetrics?.active_enrollments_period),

    totalCustomersPeriod: safeNumber(initialMetrics?.total_customers_period),
    activeCustomersPeriod: safeNumber(initialMetrics?.active_customers_period),

    currentRates: initialMetrics?.current_rates ?? {},
  };

  const goldAllocatedPeriod =
    metrics.gold18KAllocated +
    metrics.gold22KAllocated +
    metrics.gold24KAllocated;

  /* -------------------------------------------------------------------------- */
  /*                             RATE UPDATE HANDLER                            */
  /* -------------------------------------------------------------------------- */

  async function handleUpdateRate() {
    if (updating) return;

    const rate = parseFloat(newRate);
    if (!rate || rate <= 0) {
      toast.error('Enter a valid rate');
      return;
    }

    try {
      setUpdating(true);

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        toast.error('Please log in');
        return;
      }

      const { error } = await supabase.from('gold_rates').insert({
        retailer_id: userData.user.id,
        karat: selectedKarat,
        rate_per_gram: rate,
        effective_from: new Date().toISOString(),
      });

      if (error) throw error;

      toast.success(`${selectedKarat} rate updated`);

      setUpdateRateDialog(false);
      setNewRate('');
      setSelectedKarat('22K');

      router.refresh();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || 'Failed to update rate');
    } finally {
      setUpdating(false);
    }
  }

  /* -------------------------------------------------------------------------- */
  /*                                   UI                                       */
  /* -------------------------------------------------------------------------- */

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Pulse</h1>
          <p className="text-muted-foreground">Business snapshot</p>
        </div>
        <Badge>{today}</Badge>
      </div>

      {/* Current Rates */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Current Rates</CardTitle>
            <CardDescription>Per gram pricing</CardDescription>
          </div>
          <Button onClick={() => setUpdateRateDialog(true)}>
            <Edit className="w-4 h-4 mr-2" />
            Update
          </Button>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {allowedKarats.map((karat) => {
            const rate = metrics.currentRates[karat];
            return (
              <div key={karat} className="border rounded-xl p-4 space-y-2">
                <Badge variant="outline">{karat}</Badge>
                {rate ? (
                  <>
                    <div className="text-2xl font-bold">
                      ₹{rate.rate_per_gram.toLocaleString()}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Updated:{' '}
                      {new Date(rate.effective_from).toLocaleTimeString(
                        'en-IN'
                      )}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">Not set</p>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Top Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card onClick={() => router.push('/payments')} className="cursor-pointer">
          <CardHeader>
            <CardTitle className="text-sm">Payments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              ₹{metrics.periodCollections.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Gold Allocated</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {goldAllocatedPeriod.toFixed(4)} g
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Silver Allocated</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {metrics.silverAllocated.toFixed(4)} g
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Dues Outstanding</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              ₹{metrics.duesOutstanding.toLocaleString()}
            </div>
            <p className="text-xs text-red-600">
              Overdue: {metrics.overdueCount}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Update Rate Dialog */}
      <Dialog
        open={updateRateDialog}
        onOpenChange={(open) => {
          setUpdateRateDialog(open);
          if (!open) {
            setNewRate('');
            setSelectedKarat('22K');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Metal Rate</DialogTitle>
            <DialogDescription>
              Set rate per gram
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Metal</Label>
              <Select
                value={selectedKarat}
                onValueChange={(v) => {
                  if (isValidKarat(v)) setSelectedKarat(v);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {allowedKarats.map((k) => (
                    <SelectItem key={k} value={k}>
                      {k}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Rate per gram (₹)</Label>
              <Input
                type="number"
                value={newRate}
                onChange={(e) => setNewRate(e.target.value)}
                step="0.01"
              />
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setUpdateRateDialog(false)}
                disabled={updating}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={handleUpdateRate}
                disabled={updating}
              >
                {updating ? 'Updating...' : 'Update'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
