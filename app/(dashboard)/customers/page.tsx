import { createServerClient } from '@/lib/supabase/server';
import CustomersClient from './customers-client';
import { redirect } from 'next/navigation';

export default async function CustomersPage() {
  const supabase = createServerClient();
  
  try {
    // 1. Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('Auth error:', authError);
      redirect('/login');
      return;
    }
    
    console.log('✅ User authenticated:', user.id);
    
    // 2. Get user's retailer_id from user_profiles
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('retailer_id, role, full_name')
      .eq('id', user.id)
      .single();
    
    if (profileError || !profile) {
      console.error('❌ Profile error:', profileError);
      return (
        <div className="flex items-center justify-center h-64 text-red-600">
          User profile not found. Please contact support.
        </div>
      );
    }
    
    if (!profile.retailer_id) {
      console.error('❌ No retailer_id in profile:', profile);
      return (
        <div className="flex items-center justify-center h-64 text-red-600">
          No retailer associated with your account. Please contact support.
        </div>
      );
    }
    
    console.log('✅ Profile loaded:', {
      retailerId: profile.retailer_id,
      role: profile.role,
      name: profile.full_name,
    });
    
    // 3. Fetch customers for this retailer
    const { data: customers, error: customersError } = await supabase
      .from('customers')
      .select(`
        id,
        customer_code,
        full_name,
        phone,
        email,
        date_of_birth,
        address,
        city,
        state,
        pincode,
        pan_number,
        aadhar_number,
        status,
        created_at,
        updated_at,
        retailer_id,
        store_id,
        user_id
      `)
      .eq('retailer_id', profile.retailer_id)
      .order('created_at', { ascending: false });
    
    if (customersError) {
      console.error('❌ Customers query error:', customersError);
      console.error('❌ Error details:', {
        message: customersError.message,
        code: customersError.code,
        details: customersError.details,
        hint: customersError.hint,
      });
      
      // If RLS is blocking, provide helpful error
      if (customersError.code === 'PGRST301' || customersError.message.includes('RLS')) {
        return (
          <div className="flex items-center justify-center h-64 text-red-600">
            Database access denied. Please check RLS policies for customers table.
          </div>
        );
      }
      
      return (
        <div className="flex items-center justify-center h-64 text-red-600">
          Failed to load customers: {customersError.message}
        </div>
      );
    }
    
    console.log('✅ Customers loaded:', {
      count: customers?.length || 0,
      retailerId: profile.retailer_id,
    });
    
    // 4. Pass data to client component
    return (
      <CustomersClient 
        customers={customers || []} 
        loading={false}
      />
    );
    
  } catch (error) {
    console.error('❌ Unexpected error in CustomersPage:', error);
    return (
      <div className="flex items-center justify-center h-64 text-red-600">
        An unexpected error occurred. Please try again.
      </div>
    );
  }
}
