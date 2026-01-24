'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/contexts/auth-context';
import { toast } from 'sonner';
import { TrendingUp, Plus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

type Customer = {
  id: string;
  full_name: string | null;
  phone: string | null;
};

type GoldRate = {
  id: string;
  karat: string;
  rate_per_gram: number;
  valid_from: string;
};

type Txn = {
  id: string;
  amount_paid: number | null;
  paid_at: string | null;
  payment_status: string | null;
  mode: string | null;
  grams_allocated_snapshot: number | null;
};

type Store = {
  id: string;
  name: string;
  code: string | null;
};

const QUICK_AMOUNTS = [3000, 5000, 10000, 25000];

export default function CollectionsPage() {
  const { profile } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedStore, setSelectedStore] = useState('');
  const [goldRate, setGoldRate] = useState<GoldRate | null>(null);
  const [newGoldRate, setNewGoldRate] = useState('');
  const [updatingRate, setUpdatingRate] = useState(false);
  const [amount, setAmount] = useState('');
  const [mode, setMode] = useState('CASH');
  const [submitting, setSubmitting] = useState(false);
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [transactions, setTransactions] = useState<Txn[]>([]);
  const [updateRateDialog, setUpdateRateDialog] = useState(false);

  useEffect(() => {
    void loadStores();
  }, [profile?.retailer_id]);

  async function loadStores() {
    if (!profile?.retailer_id) return;
    try {
      const { data, error } = await supabase
        .from('stores')
        .select('id, name, code')
        .eq('retailer_id', profile.retailer_id)
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (error) throw error;
      const storeList = (data || []) as Store[];
      setStores(storeList);
      if (storeList.length === 1) {
        setSelectedStore(storeList[0].id);
      }
    } catch (error) {
      console.error('Error loading stores:', error);
    }
  }

  useEffect(() => {
    void loadCustomersAndRate();
  }, [profile?.retailer_id]);

  useEffect(() => {
    if (selectedCustomerId && goldRate) {
      void loadTransactions(selectedCustomerId);
    }
  }, [selectedCustomerId, goldRate?.id]);

  const calculatedGrams = useMemo(() => {
    const amountNum = parseFloat(amount);
    if (!goldRate || !Number.isFinite(amountNum) || amountNum <= 0) return 0;
    return amountNum / goldRate.rate_per_gram;
  }, [amount, goldRate]);

  async function loadCustomersAndRate() {
    if (!profile?.retailer_id) return;
    setLoadingCustomers(true);
    try {
      const [customersRes, rateRes] = await Promise.all([
        supabase
          .from('customers')
          .select('id, full_name, phone')
          .eq('retailer_id', profile.retailer_id)
          .order('full_name', { ascending: true }),
        supabase
          .from('gold_rates')
          .select('id, karat, rate_per_gram, valid_from')
          .eq('retailer_id', profile.retailer_id)
          .order('valid_from', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      if (customersRes.error) throw customersRes.error;
      if (rateRes.error) throw rateRes.error;

      setCustomers((customersRes.data || []) as Customer[]);
      setGoldRate((rateRes.data || null) as GoldRate | null);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load customers or gold rate');
    } finally {
      setLoadingCustomers(false);
    }
  }

  async function loadTransactions(customerId: string) {
    if (!profile?.retailer_id) return;
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select(
          'id, amount_paid, paid_at, payment_status, mode, grams_allocated_snapshot'
        )
        .eq('retailer_id', profile.retailer_id)
        .eq('customer_id', customerId)
        .order('paid_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setTransactions((data || []) as Txn[]);
    } catch (error) {
      console.error('Error loading transactions:', error);
    }
  }

  async function updateGoldRate() {
    if (!profile?.retailer_id) {
      toast.error('Missing retailer context');
      return;
    }

    const rateNum = parseFloat(newGoldRate);
    if (!Number.isFinite(rateNum) || rateNum <= 0) {
      toast.error('Enter a valid gold rate');
      return;
    }

    setUpdatingRate(true);
    try {
      const { data, error } = await supabase
        .from('gold_rates')
        .insert({
          retailer_id: profile.retailer_id,
          karat: goldRate?.karat || '22K',
          rate_per_gram: rateNum,
          valid_from: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      setGoldRate(data as GoldRate);
      setNewGoldRate('');
      setUpdateRateDialog(false);
      toast.success(`✅ Gold rate updated to ₹${rateNum}/gram`);
    } catch (error: any) {
      console.error('Error updating rate:', error);
      toast.error(error?.message || 'Failed to update gold rate');
    } finally {
      setUpdatingRate(false);
    }
  }

  async function recordPayment() {
    if (!profile?.retailer_id) {
      toast.error('Missing retailer context');
      return;
    }
    if (!selectedCustomerId) {
      toast.error('Select a customer');
      return;
    }
    if (!goldRate) {
      toast.error('Gold rate not available');
      return;
    }

    const amountNum = parseFloat(amount);
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      toast.error('Enter a valid amount');
      return;
    }

    setSubmitting(true);
    try {
      const gramsAllocated = amountNum / goldRate.rate_per_gram;

      const { error: txnError } = await supabase.from('transactions').insert({
        retailer_id: profile.retailer_id,
        customer_id: selectedCustomerId,
        amount_paid: amountNum,
        rate_per_gram_snapshot: goldRate.rate_per_gram,
        gold_rate_id: goldRate.id,
        grams_allocated_snapshot: gramsAllocated,
        txn_type: 'PRIMARY_INSTALLMENT',
        mode,
        payment_status: 'SUCCESS',
        paid_at: new Date().toISOString(),
        source: 'STAFF_OFFLINE',
        store_id: selectedStore || null,
      });

      if (txnError) throw txnError;

      toast.success(
        `✅ Payment recorded: ₹${amountNum.toLocaleString()} = ${gramsAllocated.toFixed(4)}g gold`
      );
      setAmount('');
      setMode('CASH');
      await loadTransactions(selectedCustomerId);
    } catch (error: any) {
      console.error('Error recording payment:', error);
      toast.error(error?.message || 'Failed to record payment');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6 pb-32">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-gold-600 via-gold-500 to-rose-500 bg-clip-text text-transparent">
          Collections
        </h1>
        <p className="text-muted-foreground">Record customer gold savings with live rate tracking</p>
      </div>

      {/* Gold Rate Card */}
      <Card className="glass-card border-2 border-gold-400/30 bg-gradient-to-r from-gold-50/50 to-amber-50/50 dark:from-gold-900/20 dark:to-amber-900/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-gold-600" />
              <CardTitle>Current Gold Rate</CardTitle>
            </div>
            <Dialog open={updateRateDialog} onOpenChange={setUpdateRateDialog}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="border-gold-300">
                  <Plus className="w-4 h-4 mr-1" />
                  Update Rate
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Update Gold Rate</DialogTitle>
                  <DialogDescription>
                    Set new gold rate per gram ({goldRate?.karat || '22K'})
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Rate per gram (₹)</Label>
                    <Input
                      type="number"
                      min="0"
                      value={newGoldRate}
                      onChange={(e) => setNewGoldRate(e.target.value)}
                      placeholder={goldRate?.rate_per_gram.toString()}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      onClick={() => setUpdateRateDialog(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      className="gold-gradient text-white"
                      onClick={updateGoldRate}
                      disabled={updatingRate}
                    >
                      {updatingRate ? 'Updating...' : 'Update Rate'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {goldRate ? (
            <div className="space-y-2">
              <div className="flex items-baseline gap-3">
                <span className="text-4xl font-bold text-gold-600">
                  ₹{goldRate.rate_per_gram.toLocaleString()}
                </span>
                <span className="text-lg text-muted-foreground">/gram</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Last updated: {new Date(goldRate.valid_from).toLocaleString()}
              </p>
            </div>
          ) : (
            <p className="text-muted-foreground">No gold rate set. Click "Update Rate" to set one.</p>
          )}
        </CardContent>
      </Card>

      {/* Payment Recording Card */}
      {goldRate && (
        <Card className="glass-card border-2 border-primary/15">
          <CardHeader>
            <CardTitle>Record Payment</CardTitle>
            <CardDescription>Add a customer payment collection</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Customer Selection */}
            <div className="space-y-2">
              <Label>Customer *</Label>
              <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                <SelectTrigger>
                  <SelectValue placeholder={loadingCustomers ? 'Loading...' : 'Choose customer'} />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((cust) => (
                    <SelectItem key={cust.id} value={cust.id}>
                      {cust.full_name}{cust.phone ? ` • ${cust.phone}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Store Selection */}
            {stores.length > 1 && (
              <div className="space-y-2">
                <Label>Store Location</Label>
                <Select value={selectedStore} onValueChange={setSelectedStore}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select store (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {stores.map((store) => (
                      <SelectItem key={store.id} value={store.id}>
                        {store.name} {store.code && `(${store.code})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {selectedCustomerId && (
              <>
                {/* Quick Amount Buttons */}
                <div className="space-y-2">
                  <Label>Quick Amounts (₹)</Label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {QUICK_AMOUNTS.map((quickAmount) => (
                      <Button
                        key={quickAmount}
                        variant={amount === quickAmount.toString() ? 'default' : 'outline'}
                        className={
                          amount === quickAmount.toString()
                            ? 'gold-gradient text-white'
                            : 'border-gold-300 hover:border-gold-400'
                        }
                        onClick={() => setAmount(quickAmount.toString())}
                        type="button"
                      >
                        ₹{(quickAmount / 1000).toFixed(0)}k
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Amount Input */}
                <div className="space-y-2">
                  <Label>Amount (₹)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Enter custom amount"
                  />
                </div>

                {/* Gold Calculation Display */}
                {amount && Number.isFinite(calculatedGrams) && calculatedGrams > 0 && (
                  <Card className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-amber-200">
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Gold Accumulated</p>
                          <p className="text-2xl font-bold text-orange-600">
                            {calculatedGrams.toFixed(4)} grams
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Rate</p>
                          <p className="text-lg font-semibold">₹{goldRate.rate_per_gram}/g</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Payment Mode */}
                <div className="space-y-2">
                  <Label>Payment Mode</Label>
                  <Select value={mode} onValueChange={setMode}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {['CASH', 'CHEQUE', 'DIGITAL', 'CREDIT_CARD', 'UPI'].map((m) => (
                        <SelectItem key={m} value={m}>
                          {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Record Payment Button */}
                <Button
                  className="w-full gold-gradient text-white font-semibold h-12 text-lg"
                  onClick={recordPayment}
                  disabled={submitting || !amount}
                  type="button"
                >
                  {submitting ? 'Recording...' : 'Record Payment'}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Recent Payments */}
      {selectedCustomerId && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Recent Payments</CardTitle>
            <CardDescription>Last 10 payments for this customer</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {transactions.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No payments recorded yet</p>
              ) : (
                transactions.map((txn) => (
                  <div
                    key={txn.id}
                    className="flex items-center justify-between p-4 rounded-lg border border-border hover:border-gold-300/50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-baseline gap-2">
                        <p className="font-semibold">₹{(txn.amount_paid || 0).toLocaleString()}</p>
                        <span className="text-sm text-muted-foreground">
                          = {(txn.grams_allocated_snapshot || 0).toFixed(4)}g
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {txn.paid_at ? new Date(txn.paid_at).toLocaleString() : 'Pending'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{txn.mode || 'MODE'}</Badge>
                      <Badge className="status-active">{txn.payment_status || 'SUCCESS'}</Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
