'use client'

import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Search, AlertCircle } from 'lucide-react'

interface Customer {
  id: string
  full_name: string
  phone: string
  email?: string | null
  status?: string | null
  created_at: string
}

interface CustomersClientProps {
  customers: Customer[]
  loading: boolean
  error?: string | null
  retailerName?: string
  rlsError?: boolean
}

export default function CustomersClient({
  customers,
  loading,
  error = null,
  retailerName = '',
  rlsError = false,
}: CustomersClientProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL')

  const filteredCustomers = useMemo(() => {
    return customers.filter((customer) => {
      const status = (customer.status || 'ACTIVE').toUpperCase()

      if (statusFilter !== 'ALL' && status !== statusFilter) {
        return false
      }

      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        return (
          customer.full_name?.toLowerCase().includes(q) ||
          customer.phone?.includes(q) ||
          customer.email?.toLowerCase().includes(q)
        )
      }

      return true
    })
  }, [customers, searchQuery, statusFilter])

  const activeCount = customers.filter(
    (c) => (c.status || 'ACTIVE').toUpperCase() === 'ACTIVE'
  ).length

  const inactiveCount = customers.filter(
    (c) => (c.status || 'ACTIVE').toUpperCase() === 'INACTIVE'
  ).length

  if (loading) {
    return <div className="p-6">Loading...</div>
  }

  if (error) {
    return (
      <Alert variant={rlsError ? 'destructive' : 'default'}>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Customers</h1>
        <p className="text-muted-foreground">
          {customers.length} total • {retailerName}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Total</CardTitle>
          </CardHeader>
          <CardContent>{customers.length}</CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Active</CardTitle>
          </CardHeader>
          <CardContent>{activeCount}</CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Inactive</CardTitle>
          </CardHeader>
          <CardContent>{inactiveCount}</CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="flex flex-col md:flex-row gap-4 p-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search customers..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
            <SelectTrigger className="w-full md:w-48">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="INACTIVE">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCustomers.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell>{customer.full_name}</TableCell>
                  <TableCell>{customer.phone}</TableCell>
                  <TableCell>{customer.email || '—'}</TableCell>
                  <TableCell>
                    <Badge>
                      {(customer.status || 'ACTIVE').toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(customer.created_at).toLocaleDateString('en-IN')}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
