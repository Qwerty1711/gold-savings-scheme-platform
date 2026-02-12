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
  // ...existing code...
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
