'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, UserPlus, Phone, Mail, MapPin, Calendar, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

type Customer = {
  id: string;
  customer_code: string | null;
  full_name: string;
  phone: string;
  email: string | null;
  date_of_birth: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  pan_number: string | null;
  aadhar_number: string | null;
  status: string | null;
  created_at: string;
  updated_at: string | null;
  retailer_id: string;
  store_id: string | null;
  user_id: string | null;
};

interface CustomersClientProps {
  customers: Customer[];
  loading: boolean;
  error?: string | null;
  retailerName?: string;
  rlsError?: boolean;
}

export default function CustomersClient({ 
  customers, 
  loading, 
  error = null,
  retailerName = '',
  rlsError = false,
}: CustomersClientProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Filter and search customers
  const filteredCustomers = useMemo(() => {
    return customers.filter((customer) => {
      // Status filter
      if (statusFilter !== 'ALL' && customer.status !== statusFilter) {
        return false;
      }
      
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          customer.full_name?.toLowerCase().includes(query) ||
          customer.phone?.includes(query) ||
          customer.email?.toLowerCase().includes(query) ||
          customer.customer_code?.toLowerCase().includes(query)
        );
      }
      
      return true;
    });
  }, [customers, searchQuery, statusFilter]);

  // Loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-32 w-full rounded-3xl" />
        <div className="skeleton h-96 w-full rounded-3xl" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Customers</h1>
          <p className="text-muted-foreground">Manage your customers</p>
        </div>
        
        <Alert variant={rlsError ? "destructive" : "default"}>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{rlsError ? "Database Access Error" : "Error"}</AlertTitle>
          <AlertDescription>
            {error}
            {rlsError && (
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <p className="text-sm font-semibold mb-2">Developer Instructions:</p>
                <p className="text-sm mb-2">Run this SQL in Supabase SQL Editor:</p>
                <pre className="text-xs bg-background p-2 rounded overflow-x-auto">
{`-- Drop broken policies
DROP POLICY IF EXISTS "Allow admin read" ON customers;

-- Create correct policy
CREATE POLICY "Admins can read their retailer's customers"
ON customers FOR SELECT
TO authenticated
USING (
  retailer_id = (
    SELECT retailer_id FROM user_profiles WHERE id = auth.uid()
  )
);`}
                </pre>
              </div>
            )}
          </AlertDescription>
        </Alert>
        
        <Button onClick={() => router.push('/enroll')} className="jewel-gradient text-white">
          <UserPlus className="w-4 h-4 mr-2" />
          Add New Customer
        </Button>
      </div>
    );
  }

  // Empty state
  if (!customers || customers.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Customers</h1>
            <p className="text-muted-foreground">No customers found</p>
          </div>
          <Button onClick={() => router.push('/enroll')} className="jewel-gradient text-white">
            <UserPlus className="w-4 h-4 mr-2" />
            Add First Customer
          </Button>
        </div>
        
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <UserPlus className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Customers Yet</h3>
              <p className="text-muted-foreground mb-6">
                Get started by enrolling your first customer
              </p>
              <Button onClick={() => router.push('/enroll')} className="jewel-gradient text-white">
                Enroll New Customer
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main content
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Customers</h1>
          <p className="text-muted-foreground">
            {filteredCustomers.length} customer{filteredCustomers.length !== 1 ? 's' : ''}
            {retailerName && ` • ${retailerName}`}
          </p>
        </div>
        <Button onClick={() => router.push('/enroll')} className="jewel-gradient text-white">
          <UserPlus className="w-4 h-4 mr-2" />
          Add New Customer
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{customers.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Active Customers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {customers.filter(c => c.status === 'ACTIVE').length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Inactive Customers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">
              {customers.filter(c => c.status === 'INACTIVE').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Search & Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, phone, email, or customer code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Statuses</SelectItem>
                <SelectItem value="ACTIVE">Active Only</SelectItem>
                <SelectItem value="INACTIVE">Inactive Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Customers Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            All Customers ({filteredCustomers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                      No customers found matching your search
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCustomers.map((customer) => (
                    <TableRow key={customer.id} className="hover:bg-muted/50 cursor-pointer">
                      <TableCell className="font-mono text-xs">
                        {customer.customer_code || 'N/A'}
                      </TableCell>
                      <TableCell className="font-medium">
                        {customer.full_name}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Phone className="w-3 h-3 text-muted-foreground" />
                          {customer.phone}
                        </div>
                      </TableCell>
                      <TableCell>
                        {customer.email ? (
                          <div className="flex items-center gap-2">
                            <Mail className="w-3 h-3 text-muted-foreground" />
                            {customer.email}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {customer.city ? (
                          <div className="flex items-center gap-2">
                            <MapPin className="w-3 h-3 text-muted-foreground" />
                            {customer.city}
                            {customer.state && `, ${customer.state}`}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={customer.status === 'ACTIVE' ? 'default' : 'secondary'}
                          className={customer.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : ''}
                        >
                          {customer.status || 'ACTIVE'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          {new Date(customer.created_at).toLocaleDateString('en-IN')}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/customers/${customer.id}`)}
                        >
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
