import SettingsClient from './SettingsClient';
import { supabase } from '@/lib/supabase/client';
import { cookies } from 'next/headers';

export default async function SettingsPage() {
  // TODO: Replace with actual retailer auth/session extraction
  const cookieStore = cookies();
  const retailerId = cookieStore.get('retailer_id')?.value;
  let retailerSettings = null;
  let staffMembers = [];
  let stores = [];
  let rateHistory = [];
  let loading = false;

  if (retailerId) {
    const [retailerResult, staffResult, storesResult, rateResult] = await Promise.all([
      supabase
        .from('retailers')
        .select('id, name, business_name, legal_name, email, phone, address')
        .eq('id', retailerId)
        .maybeSingle(),
      supabase
        .from('user_profiles')
        .select('id, full_name, phone, employee_id, role, store_id, created_at, stores(name)')
        .eq('retailer_id', retailerId)
        .order('created_at', { ascending: false })
        .limit(50),
      supabase
        .from('stores')
        .select('id, name, store_name, code, address, phone, is_active, created_at')
        .eq('retailer_id', retailerId)
        .order('created_at', { ascending: false })
        .limit(50),
      supabase
        .from('gold_rates')
        .select('id, karat, rate_per_gram, effective_from, created_at, updated_by_name, previous_rate, change_percentage')
        .eq('retailer_id', retailerId)
        .order('effective_from', { ascending: false })
        .limit(100),
    ]);
    retailerSettings = retailerResult.data || null;
    staffMembers = staffResult.data || [];
    stores = storesResult.data || [];
    rateHistory = rateResult.data || [];
  }

  return (
    <SettingsClient
      retailerSettings={retailerSettings}
      staffMembers={staffMembers}
      stores={stores}
      rateHistory={rateHistory}
      loading={loading}
    />
  );
}
                    value={retailerSettings?.legal_name || ''}
                    onChange={(e) =>
                      setRetailerSettings({ ...retailerSettings!, legal_name: e.target.value })
                    }
                    placeholder="Legal entity name (optional)"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    value={retailerSettings?.email || ''}
                    onChange={(e) =>
                      setRetailerSettings({ ...retailerSettings!, email: e.target.value })
                    }
                    type="email"
                    placeholder="business@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input
                    value={retailerSettings?.phone || ''}
                    onChange={(e) =>
                      setRetailerSettings({ ...retailerSettings!, phone: e.target.value })
                    }
                    placeholder="+91 98765 43210"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Address</Label>
                <Input
                  value={retailerSettings?.address || ''}
                  onChange={(e) =>
                    setRetailerSettings({ ...retailerSettings!, address: e.target.value })
                  }
                  placeholder="Complete business address"
                />
              </div>

              <div className="text-sm text-muted-foreground">
                💡 City and state details are managed per store in the Stores tab
              </div>

              <Button
                className="gold-gradient text-white"
                onClick={updateRetailerSettings}
                disabled={savingRetailer}
              >
                {savingRetailer ? 'Saving...' : 'Save Changes'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Stores Management Tab */}
        <TabsContent value="stores" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Store Locations</CardTitle>
                <CardDescription>Manage your physical store locations</CardDescription>
              </div>
              <Dialog open={addStoreDialog} onOpenChange={setAddStoreDialog}>
                <DialogTrigger asChild>
                  <Button className="gold-gradient text-white">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Store
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Add Store Location</DialogTitle>
                    <DialogDescription>Create a new physical store location</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label>Store Name *</Label>
                      <Input value={newStoreName} onChange={(e) => setNewStoreName(e.target.value)} placeholder="Main Branch" />
                    </div>
                    <div className="space-y-2">
                      <Label>Store Code</Label>
                      <Input value={newStoreCode} onChange={(e) => setNewStoreCode(e.target.value)} placeholder="MAIN" />
                    </div>
                    <div className="space-y-2">
                      <Label>Address</Label>
                      <Input value={newStoreAddress} onChange={(e) => setNewStoreAddress(e.target.value)} placeholder="Street address" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-2">
                        <Label>City</Label>
                        <Input value={newStoreCity} onChange={(e) => setNewStoreCity(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label>State</Label>
                        <Input value={newStoreState} onChange={(e) => setNewStoreState(e.target.value)} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Phone</Label>
                      <Input value={newStorePhone} onChange={(e) => setNewStorePhone(e.target.value)} />
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                      <Button variant="ghost" onClick={() => setAddStoreDialog(false)}>
                        Cancel
                      </Button>
                      <Button className="gold-gradient text-white" onClick={addStore} disabled={addingStore}>
                        {addingStore ? 'Adding...' : 'Add Store'}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              
              {/* Edit Store Dialog */}
              <Dialog open={editStoreDialog} onOpenChange={setEditStoreDialog}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Edit Store Location</DialogTitle>
                    <DialogDescription>Update store information</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label>Store Name *</Label>
                      <Input value={newStoreName} onChange={(e) => setNewStoreName(e.target.value)} placeholder="Main Branch" />
                    </div>
                    <div className="space-y-2">
                      <Label>Store Code</Label>
                      <Input value={newStoreCode} onChange={(e) => setNewStoreCode(e.target.value)} placeholder="MAIN" />
                    </div>
                    <div className="space-y-2">
                      <Label>Address</Label>
                      <Input value={newStoreAddress} onChange={(e) => setNewStoreAddress(e.target.value)} placeholder="Street address" />
                    </div>
                    <div className="space-y-2">
                      <Label>Phone</Label>
                      <Input value={newStorePhone} onChange={(e) => setNewStorePhone(e.target.value)} />
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                      <Button variant="ghost" onClick={() => setEditStoreDialog(false)}>
                        Cancel
                      </Button>
                      <Button className="gold-gradient text-white" onClick={updateStore} disabled={addingStore}>
                        {addingStore ? 'Updating...' : 'Update Store'}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stores.length > 0 ? (
                  stores.map((store) => (
                    <div
                      key={store.id}
                      className="flex items-start justify-between p-4 rounded-lg glass-card border border-border"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">{store.store_name || store.name}</h3>
                          {store.code && (
                            <Badge variant="outline" className="text-xs">{store.code}</Badge>
                          )}
                          <Badge variant={store.is_active ? 'default' : 'secondary'}>
                            {store.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                        {store.address && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {store.address}
                          </p>
                        )}
                        {store.phone && (
                          <p className="text-xs text-muted-foreground">📞 {store.phone}</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditStore(store)}
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleStoreStatus(store.id, store.is_active)}
                        >
                          {store.is_active ? 'Deactivate' : 'Activate'}
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    No stores added yet. Add your first store location.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Staff Management Tab */}
        <TabsContent value="staff" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Staff Management</CardTitle>
                <CardDescription>Manage team members and assign to stores</CardDescription>
              </div>
              <Dialog open={addStaffDialog} onOpenChange={setAddStaffDialog}>
                <DialogTrigger asChild>
                  <Button className="gold-gradient text-white">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Staff
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Staff Member</DialogTitle>
                    <DialogDescription>Capture basic staff details</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label>Full Name *</Label>
                      <Input value={newStaffName} onChange={(e) => setNewStaffName(e.target.value)} placeholder="Staff member's full name" />
                    </div>
                    <div className="space-y-2">
                      <Label>Phone</Label>
                      <Input value={newStaffPhone} onChange={(e) => setNewStaffPhone(e.target.value)} placeholder="+91 98765 43210" />
                    </div>
                    <div className="space-y-2">
                      <Label>Employee ID</Label>
                      <Input value={newStaffEmployeeId} onChange={(e) => setNewStaffEmployeeId(e.target.value)} placeholder="Optional employee ID" />
                    </div>
                    <div className="space-y-2">
                      <Label>Assign to Store</Label>
                      <Select value={newStaffStoreId || undefined} onValueChange={(val) => setNewStaffStoreId(val || '')}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select store (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          {stores.filter(s => s.is_active).map(store => (
                            <SelectItem key={store.id} value={store.id}>
                              {store.store_name || store.name} {store.code ? `(${store.code})` : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {newStaffStoreId && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setNewStaffStoreId('')}
                          className="text-xs"
                        >
                          Clear store selection
                        </Button>
                      )}
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                      <Button variant="ghost" onClick={() => setAddStaffDialog(false)}>
                        Cancel
                      </Button>
                      <Button className="gold-gradient text-white" onClick={addStaffMember} disabled={addingStaff}>
                        {addingStaff ? 'Saving...' : 'Add Staff'}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              
              {/* Edit Staff Dialog */}
              <Dialog open={editStaffDialog} onOpenChange={setEditStaffDialog}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Edit Staff Member</DialogTitle>
                    <DialogDescription>Update staff member details</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label>Full Name *</Label>
                      <Input value={newStaffName} onChange={(e) => setNewStaffName(e.target.value)} placeholder="Staff member's full name" />
                    </div>
                    <div className="space-y-2">
                      <Label>Phone</Label>
                      <Input value={newStaffPhone} onChange={(e) => setNewStaffPhone(e.target.value)} placeholder="+91 98765 43210" />
                    </div>
                    <div className="space-y-2">
                      <Label>Employee ID</Label>
                      <Input value={newStaffEmployeeId} onChange={(e) => setNewStaffEmployeeId(e.target.value)} placeholder="Optional employee ID" />
                    </div>
                    <div className="space-y-2">
                      <Label>Assign to Store</Label>
                      <Select value={newStaffStoreId || undefined} onValueChange={(val) => setNewStaffStoreId(val || '')}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select store (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          {stores.filter(s => s.is_active).map(store => (
                            <SelectItem key={store.id} value={store.id}>
                              {store.store_name || store.name} {store.code ? `(${store.code})` : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {newStaffStoreId && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setNewStaffStoreId('')}
                          className="text-xs"
                        >
                          Clear store selection
                        </Button>
                      )}
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                      <Button variant="ghost" onClick={() => setEditStaffDialog(false)}>
                        Cancel
                      </Button>
                      <Button className="gold-gradient text-white" onClick={updateStaff} disabled={addingStaff}>
                        {addingStaff ? 'Updating...' : 'Update Staff'}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {staffMembers.length > 0 ? (
                  staffMembers.map((staff) => (
                    <div
                      key={staff.id}
                      className="flex items-center justify-between p-4 rounded-lg glass-card border border-border"
                    >
                      <div className="flex-1">
                        <h3 className="font-medium">{staff.full_name}</h3>
                        <p className="text-sm text-muted-foreground">{staff.email}</p>
                        {(staff.phone || staff.employee_id || staff.stores) && (
                          <p className="text-xs text-muted-foreground">
                            {staff.phone ? `${staff.phone}` : ''}
                            {staff.phone && staff.employee_id ? ' • ' : ''}
                            {staff.employee_id ? `ID: ${staff.employee_id}` : ''}
                            {(staff.phone || staff.employee_id) && staff.stores ? ' • ' : ''}
                            {staff.stores ? `🏪 ${staff.stores.name}` : ''}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{staff.role}</Badge>
                        {staff.id !== profile?.id && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditStaff(staff)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeStaffMember(staff.id)}
                            >
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-muted-foreground py-8">No staff members yet</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Gold Rate Audit Trail Tab */}
        <TabsContent value="audit" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Precious Metal Rate Change History</CardTitle>
              <CardDescription>Track all rate updates with audit trail</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Filters */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 rounded-lg bg-muted/30">
                <div className="space-y-2">
                  <Label htmlFor="karat-filter">Metal Type</Label>
                  <Select value={selectedKarat} onValueChange={setSelectedKarat}>
                    <SelectTrigger id="karat-filter">
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Types</SelectItem>
                      <SelectItem value="18K">18K Gold</SelectItem>
                      <SelectItem value="22K">22K Gold</SelectItem>
                      <SelectItem value="24K">24K Gold</SelectItem>
                      <SelectItem value="SILVER">Silver</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="start-date">Start Date</Label>
                  <Input
                    id="start-date"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="end-date">End Date</Label>
                  <Input
                    id="end-date"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>&nbsp;</Label>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      setSelectedKarat('ALL');
                      setStartDate('');
                      setEndDate('');
                    }}
                  >
                    Clear Filters
                  </Button>
                </div>
              </div>

              {/* Rate History Table */}
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {loadingRates ? (
                  <div className="text-center py-8">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gold-600"></div>
                    <p className="text-sm text-muted-foreground mt-2">Loading rate history...</p>
                  </div>
                ) : rateHistory.length > 0 ? (
                  <div className="space-y-3">
                    {rateHistory.map((rate) => (
                      <div
                        key={rate.id}
                        className="flex items-start justify-between p-4 rounded-lg glass-card border border-border hover:border-gold-300 transition-colors"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <Badge
                              variant="outline"
                              className={
                                rate.karat === '18K'
                                  ? 'bg-amber-100 dark:bg-amber-900/30 border-amber-300'
                                  : rate.karat === '22K'
                                  ? 'bg-gold-100 dark:bg-gold-900/30 border-gold-300'
                                  : rate.karat === '24K'
                                  ? 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-300'
                                  : 'bg-slate-100 dark:bg-slate-900/30 border-slate-300'
                              }
                            >
                              {rate.karat}
                            </Badge>
                            <p className="text-2xl font-bold gold-text">
                              ₹{rate.rate_per_gram.toLocaleString()}/gram
                            </p>
                            {rate.change_percentage !== null && rate.change_percentage !== 0 && (
                              <Badge
                                variant={(rate.change_percentage ?? 0) > 0 ? 'default' : 'secondary'}
                                className={
                                  (rate.change_percentage ?? 0) > 0
                                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                    : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                                }
                              >
                                {(rate.change_percentage ?? 0) > 0 ? '+' : ''}
                                {rate.change_percentage?.toFixed(2)}%
                              </Badge>
                            )}
                          </div>
                          {rate.previous_rate && (
                            <p className="text-sm text-muted-foreground">
                              Previous: ₹{rate.previous_rate.toLocaleString()} → Change: ₹
                              {(rate.rate_per_gram - rate.previous_rate).toFixed(2)}
                            </p>
                          )}
                          <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              {rate.updated_by_name || 'System'}
                            </span>
                            <span className="flex items-center gap-1">
                              <TrendingUp className="w-3 h-3" />
                              Effective from:{' '}
                              {new Date(rate.effective_from).toLocaleString('en-IN', {
                                dateStyle: 'medium',
                                timeStyle: 'short',
                              })}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <TrendingUp className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
                    <p className="text-muted-foreground">
                      {selectedKarat !== 'ALL' || startDate || endDate
                        ? 'No rate history found for selected filters'
                        : 'No rate history available yet. Update gold rates from the Pulse dashboard.'}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Logout</CardTitle>
              <CardDescription>Sign out from your account</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="destructive" onClick={logout}>
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
