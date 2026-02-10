import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Calendar } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CustomerLoadingSkeleton } from '@/components/customer/loading-skeleton';

import {
  CustomerMetrics,
  Transaction,
  PortfolioPoint,
  AvgPricePoint,
  EfficiencyPoint,
} from './types';

interface CustomerPulseClientProps {
  metrics: CustomerMetrics | null;
  transactions: Transaction[];
  portfolioSeries: PortfolioPoint[];
  avgPriceSeries: AvgPricePoint[];
  efficiencySeries: EfficiencyPoint[];
  growthRate: number | null;
  portfolioValue: number;
  loading: boolean;
  periodLabel: string;
}

export default function CustomerPulseClient({
  metrics,
  transactions,
  portfolioSeries,
  avgPriceSeries,
  efficiencySeries,
  growthRate,
  portfolioValue,
  loading,
  periodLabel,
}: CustomerPulseClientProps) {
  if (loading) {
    return <CustomerLoadingSkeleton title="Loading dashboard..." />;
  }

  return (
    <div className="p-4 md:p-6 space-y-6 bg-gradient-to-br from-background via-gold-50/10 to-background min-h-screen">
      {/* Recent Transactions */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="w-5 h-5 text-gold-500" />
            Recent Transactions ({periodLabel})
          </CardTitle>
          <CardDescription>
            Your payment history for the selected period
          </CardDescription>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No transactions found for {periodLabel.toLowerCase()}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Scheme</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Gold/Silver</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((txn) => (
                    <TableRow key={txn.id}>
                      <TableCell>{new Date(txn.paid_at).toLocaleDateString()}</TableCell>
                      <TableCell>{txn.scheme_name}</TableCell>
                      <TableCell>
                        <Badge variant={txn.txn_type === 'PRIMARY_INSTALLMENT' ? 'default' : 'secondary'}>
                          {txn.txn_type === 'PRIMARY_INSTALLMENT' ? 'Installment' : 'Top-up'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        ₹{Number(txn.amount_paid).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {Number(txn.grams_allocated_snapshot).toFixed(3)}g
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
