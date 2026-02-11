'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
import { supabase } from '@/lib/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

type PulseClientProps = {
  initialMetrics: any;
};

function safeNumber(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function PulseClient({ initialMetrics }: PulseClientProps) {
  const router = useRouter();
  
  // State for update rate dialog
  const [updateRateDialog, setUpdateRateDialog] = useState(false);
  const [newRate, setNewRate] = useState('');
  const [selectedKarat, setSelectedKarat] = useState<'18K' | '22K' | '24K' | 'SILVER'>('22K');

  // Parse metrics from server
  const metrics = {
    periodCollections: safeNumber(initialMetrics?.period_collections),
    collections18K: safeNumber(initialMetrics?.collections_18k),
    collections22K: safeNumber(initialMetrics?.collections_22k),
    collections24K: safeNumber(initialMetrics?.collections_24k),
    collectionsSilver: safeNumber(initialMetrics?.collections_silver),
    
    goldAllocatedPeriod: 
      safeNumber(initialMetrics?.gold_18k_allocated) + 
      safeNumber(initialMetrics?.gold_22k_allocated) + 
      safeNumber(initialMetrics?.gold_24k_allocated),
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
    
    readyToRedeemPeriod: 0,
    completedRedemptionsPeriod: 0,
    
    currentRates: {
      k18: initialMetrics?.current_rates?.['18K'] || null,
      k22: initialMetrics?.current_rates?.['22K'] || null,
      k24: initialMetrics?.current_rates?.['24K'] || null,
      silver: initialMetrics?.current_rates?.SILVER || null,
    },
  };

  async function handleUpdateRate() {
    const rate = parseFloat(newRate);
    if (Number.isNaN(rate) || rate <= 0) {
      toast.error('Please enter a valid rate');
      return;
    }

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        toast.error('Please log in to update rates');
        return;
      }

      const { error } = await supabase
        .from('gold_rates')
        .insert({
          retailer_id: userData.user.id,
          karat: selectedKarat,
          rate_per_gram: rate,
          effective_from: new Date().toISOString(),
        });

      if (error) throw error;

      toast.success(`✅ ${selectedKarat} rate updated successfully`);
      setUpdateRateDialog(false);
      setNewRate('');
      
      // Refresh the page to show new rates
      router.refresh();
    } catch (error: any) {
      console.error('Error updating rate:', error);
      toast.error(error?.message || 'Failed to update rate');
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-gold-600 via-gold-500 to-rose-500 bg-clip-text text-transparent">
            Pulse
          </h1>
          <p className="text-muted-foreground">Business snapshot</p>
        </div>
        <Badge className="text-sm px-4 py-2">
          {new Date().toLocaleDateString('en-IN', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
        </Badge>
      </div>

      {/* Current Rates Card */}
      <Card className="jewel-card">
        <CardContent className="pt-6">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-2">Precious Metals Vault - Current Rates</p>
                <p className="text-xs text-muted-foreground">Per gram pricing across all metal types</p>
              </div>
              <Button onClick={() => setUpdateRateDialog(true)} className="jewel-gradient text-white hover:opacity-90 rounded-xl">
                <Edit className="w-4 h-4 mr-2" />
                Update Rates
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* 18K Gold */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-900/20 dark:to-amber-800/10 border-2 border-amber-200/50 dark:border-amber-700/30">
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="outline" className="bg-amber-100 dark:bg-amber-900/30 border-amber-300 dark:border-amber-700">18K</Badge>
                </div>
                {metrics.currentRates.k18 ? (
                  <>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-amber-600 dark:text-amber-400">₹{metrics.currentRates.k18.rate.toLocaleString()}</span>
                      <span className="text-sm text-muted-foreground">/gram</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Updated: {new Date(metrics.currentRates.k18.valid_from).toLocaleTimeString('en-IN')}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">Not set</p>
                )}
              </div>

              {/* 22K Gold */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-gold-50 to-gold-100/50 dark:from-gold-900/20 dark:to-gold-800/10 border-2 border-gold-200/50 dark:border-gold-700/30">
                <div className="flex items-center justify-between mb-2">
                  <Badge className="bg-gold-200 dark:bg-gold-900/50 border-gold-400 dark:border-gold-600 text-gold-800 dark:text-gold-200">22K • Standard</Badge>
                </div>
                {metrics.currentRates.k22 ? (
                  <>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold gold-text">₹{metrics.currentRates.k22.rate.toLocaleString()}</span>
                      <span className="text-sm text-muted-foreground">/gram</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Updated: {new Date(metrics.currentRates.k22.valid_from).toLocaleTimeString('en-IN')}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">Not set</p>
                )}
              </div>

              {/* 24K Gold */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-yellow-50 to-yellow-100/50 dark:from-yellow-900/20 dark:to-yellow-800/10 border-2 border-yellow-200/50 dark:border-yellow-700/30">
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="outline" className="bg-yellow-100 dark:bg-yellow-900/30 border-yellow-300 dark:border-yellow-700">24K • Pure</Badge>
                </div>
                {metrics.currentRates.k24 ? (
                  <>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">₹{metrics.currentRates.k24.rate.toLocaleString()}</span>
                      <span className="text-sm text-muted-foreground">/gram</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Updated: {new Date(metrics.currentRates.k24.valid_from).toLocaleTimeString('en-IN')}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">Not set</p>
                )}
              </div>

              {/* Silver */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100/50 dark:from-slate-900/20 dark:to-slate-800/10 border-2 border-slate-200/50 dark:border-slate-700/30">
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="outline" className="bg-slate-100 dark:bg-slate-900/30 border-slate-300 dark:border-slate-700">SILVER</Badge>
                </div>
                {metrics.currentRates.silver ? (
                  <>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-slate-600 dark:text-slate-400">₹{metrics.currentRates.silver.rate.toLocaleString()}</span>
                      <span className="text-sm text-muted-foreground">/gram</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Updated: {new Date(metrics.currentRates.silver.valid_from).toLocaleTimeString('en-IN')}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">Not set</p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Metrics Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Payments Card */}
        <Card className="jewel-card hover:scale-105 transition-transform cursor-pointer" onClick={() => router.push('/payments')}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Payments</CardTitle>
              <Coins className="w-5 h-5 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">₹{metrics.periodCollections.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">This Month</p>
            <div className="flex items-center gap-1 mt-2 mb-3">
              <TrendingUp className="w-3 h-3 text-green-600" />
              <span className="text-xs text-green-600">Live</span>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-3 border-t border-gray-200 dark:border-gray-700">
              <div className="text-xs">
                <Badge variant="outline" className="bg-amber-50 dark:bg-amber-900/20 border-amber-300 mb-1 text-[10px]">18K</Badge>
                <div className="font-semibold">₹{metrics.collections18K.toLocaleString()}</div>
              </div>
              <div className="text-xs">
                <Badge className="bg-gold-100 dark:bg-gold-900/30 text-gold-800 dark:text-gold-200 border-gold-400 mb-1 text-[10px]">22K</Badge>
                <div className="font-semibold">₹{metrics.collections22K.toLocaleString()}</div>
              </div>
              <div className="text-xs">
                <Badge variant="outline" className="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 mb-1 text-[10px]">24K</Badge>
                <div className="font-semibold">₹{metrics.collections24K.toLocaleString()}</div>
              </div>
              <div className="text-xs">
                <Badge variant="outline" className="bg-slate-50 dark:bg-slate-900/20 border-slate-300 mb-1 text-[10px]">Silver</Badge>
                <div className="font-semibold">₹{metrics.collectionsSilver.toLocaleString()}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Gold Allocated Card */}
        <Card className="jewel-card hover:scale-105 transition-transform">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Gold Allocated</CardTitle>
              <TrendingUp className="w-5 h-5 text-gold-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold gold-text">{metrics.goldAllocatedPeriod.toFixed(4)} g</div>
            <p className="text-xs text-muted-foreground mt-1">This Month</p>
            <div className="grid grid-cols-3 gap-2 pt-3 mt-3 border-t border-gray-200 dark:border-gray-700">
              <div className="text-xs">
                <Badge variant="outline" className="bg-amber-50 dark:bg-amber-900/20 border-amber-300 mb-1 text-[10px]">18K</Badge>
                <div className="font-semibold">{metrics.gold18KAllocated.toFixed(3)} g</div>
              </div>
              <div className="text-xs">
                <Badge className="bg-gold-100 dark:bg-gold-900/30 text-gold-800 dark:text-gold-200 border-gold-400 mb-1 text-[10px]">22K</Badge>
                <div className="font-semibold">{metrics.gold22KAllocated.toFixed(3)} g</div>
              </div>
              <div className="text-xs">
                <Badge variant="outline" className="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 mb-1 text-[10px]">24K</Badge>
                <div className="font-semibold">{metrics.gold24KAllocated.toFixed(3)} g</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Silver Allocated Card */}
        <Card className="jewel-card hover:scale-105 transition-transform">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Silver Allocated</CardTitle>
              <TrendingUp className="w-5 h-5 text-slate-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-600 dark:text-slate-400">{metrics.silverAllocated.toFixed(4)} g</div>
            <p className="text-xs text-muted-foreground mt-1">This Month</p>
            <div className="flex items-center gap-1 mt-2">
              <Badge variant="outline" className="bg-slate-50 dark:bg-slate-900/20 border-slate-300 text-[10px]">SILVER</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Dues Outstanding Card */}
        <Card className="jewel-card hover:scale-105 transition-transform cursor-pointer" onClick={() => router.push('/dashboard/due')}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Dues Outstanding</CardTitle>
              <Clock className="w-5 h-5 text-orange-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">₹{metrics.duesOutstanding.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">This Month</p>
            <div className="grid grid-cols-2 gap-2 pt-3 mt-2 border-t border-gray-200 dark:border-gray-700">
              <div className="text-xs">
                <span className="text-muted-foreground">Overdue Count</span>
                <div className="font-semibold text-red-600">{metrics.overdueCount}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row: Enrollments, Customers, Redemptions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Enrollments Card */}
        <Card className="jewel-card">
          <CardHeader>
            <CardTitle>Enrollments</CardTitle>
            <CardDescription>This Month enrollment activity</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-100 to-blue-50 dark:from-blue-900/30 dark:to-blue-800/20 flex items-center justify-center">
                <Users className="w-10 h-10 text-blue-600" />
              </div>
              <div>
                <div className="text-4xl font-bold">{metrics.totalEnrollmentsPeriod}</div>
                <p className="text-sm text-muted-foreground">Total enrollments</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="p-3 rounded-xl bg-muted/40">
                <p className="text-xs text-muted-foreground">Total Enrollments</p>
                <p className="text-lg font-semibold">{metrics.totalEnrollmentsPeriod}</p>
              </div>
              <div className="p-3 rounded-xl bg-muted/40">
                <p className="text-xs text-muted-foreground">Active Enrollments</p>
                <p className="text-lg font-semibold">{metrics.activeEnrollmentsPeriod}</p>
              </div>
            </div>
            <Button onClick={() => router.push('/enroll')} className="w-full mt-4 jewel-gradient text-white hover:opacity-90">
              Enroll New Customer
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </CardContent>
        </Card>

        {/* Customers Card */}
        <Card className="jewel-card">
          <CardHeader>
            <CardTitle>Customers</CardTitle>
            <CardDescription>This Month customer activity</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-100 to-emerald-50 dark:from-emerald-900/30 dark:to-emerald-800/20 flex items-center justify-center">
                <UserCheck className="w-10 h-10 text-emerald-600" />
              </div>
              <div>
                <div className="text-4xl font-bold">{metrics.totalCustomersPeriod}</div>
                <p className="text-sm text-muted-foreground">Total customers</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="p-3 rounded-xl bg-muted/40">
                <p className="text-xs text-muted-foreground">Total Customers</p>
                <p className="text-lg font-semibold">{metrics.totalCustomersPeriod}</p>
              </div>
              <div className="p-3 rounded-xl bg-muted/40">
                <p className="text-xs text-muted-foreground">Active Customers</p>
                <p className="text-lg font-semibold">{metrics.activeCustomersPeriod}</p>
              </div>
            </div>
            <Button variant="outline" className="w-full mt-4" onClick={() => router.push('/dashboard/customers')}>
              View Customers
            </Button>
          </CardContent>
        </Card>

        {/* Redemptions Card */}
        <Card className="jewel-card">
          <CardHeader>
            <CardTitle>Redemptions</CardTitle>
            <CardDescription>This Month redemption activity</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-rose-100 to-rose-50 dark:from-rose-900/30 dark:to-rose-800/20 flex items-center justify-center">
                <Coins className="w-10 h-10 text-rose-600" />
              </div>
              <div>
                <div className="text-4xl font-bold">{metrics.readyToRedeemPeriod}</div>
                <p className="text-sm text-muted-foreground">Ready to redeem</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="p-3 rounded-xl bg-muted/40">
                <p className="text-xs text-muted-foreground">Ready to Redeem</p>
                <p className="text-lg font-semibold">{metrics.readyToRedeemPeriod}</p>
              </div>
              <div className="p-3 rounded-xl bg-muted/40">
                <p className="text-xs text-muted-foreground">Completed</p>
                <p className="text-lg font-semibold">{metrics.completedRedemptionsPeriod}</p>
              </div>
            </div>
            <Button variant="outline" className="w-full mt-4" onClick={() => router.push('/dashboard/redemptions')}>
              View Redemptions
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Update Rate Dialog */}
      <Dialog open={updateRateDialog} onOpenChange={setUpdateRateDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Update Precious Metal Rate</DialogTitle>
            <DialogDescription>Set the current rate per gram for selected metal type</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="karat">Select Metal Type</Label>
              <Select value={selectedKarat} onValueChange={(v) => setSelectedKarat(v as '18K' | '22K' | '24K' | 'SILVER')}>
                <SelectTrigger id="karat">
                  <SelectValue placeholder="Select metal type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="18K">18K Gold (75% purity)</SelectItem>
                  <SelectItem value="22K">22K Gold (91.6% purity) - Standard</SelectItem>
                  <SelectItem value="24K">24K Gold (99.9% purity) - Pure</SelectItem>
                  <SelectItem value="SILVER">Silver (Pure)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="rate">Rate per Gram (₹)</Label>
              <Input
                id="rate"
                type="number"
                placeholder="Enter rate"
                value={newRate}
                onChange={(e) => setNewRate(e.target.value)}
                className="text-lg"
                step="0.01"
              />
            </div>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setUpdateRateDialog(false)}>
                Cancel
              </Button>
              <Button className="flex-1 jewel-gradient text-white" onClick={handleUpdateRate}>
                Update {selectedKarat} Rate
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
