import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CustomerDetailModal } from '@/components/customer-detail-modal';

import type { CustomerEnrollment } from './types';

interface CustomersClientProps {
  customers: CustomerEnrollment[];
  loading: boolean;
}

export default function CustomersClient({ customers, loading }: CustomersClientProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <span>Loading...</span>
      </div>
    );
  }

  if (!customers || customers.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <span>No customers found.</span>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white border border-gray-200">
        <thead>
          <tr>
            <th className="px-4 py-2 border-b">Name</th>
            <th className="px-4 py-2 border-b">Phone</th>
            {/* Add more columns as needed */}
          </tr>
        </thead>
        <tbody>
          {customers.map((customer: any) => (
            <tr key={customer.id}>
              <td className="px-4 py-2 border-b">{customer.name || customer.full_name || customer.customer_name}</td>
              <td className="px-4 py-2 border-b">{customer.phone}</td>
              {/* Add more cells as needed */}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
