import { cookies } from 'next/headers';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import CustomersClient from './customers-client';
import { redirect } from 'next/navigation';


export default async function CustomersPage() {
  const supabase = createServerComponentClient({ cookies });
  try {
    // 1. Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('Auth error:', authError);
      return (
        <div className="flex items-center justify-center h-64 text-red-600">
          Please log in to view customers.
        </div>
      );
    }

    // 2. Get user's retailer_id from user_profiles
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('retailer_id, role, full_name')
      .eq('id', user.id)
      .maybeSingle();
    const retailerId = profile?.retailer_id || '';
    if (profileError || !retailerId) {
      console.error('No retailer_id in profile:', profileError, profile);
      return (
        <div className="flex items-center justify-center h-64 text-red-600">
          No retailer associated with your account. Please contact support.
        </div>
      );
    }

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
      .eq('retailer_id', retailerId)
      .order('created_at', { ascending: false });

    if (customersError) {
      console.error('Customers query error:', customersError);
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

    // 4. Pass data to client component
    return (
      <CustomersClient 
        customers={customers || []} 
        loading={false}
      />
    );
  } catch (error) {
    console.error('Unexpected error in CustomersPage:', error);
    return (
      <div className="flex items-center justify-center h-64 text-red-600">
        An unexpected error occurred. Please try again.
      </div>
    );
  }
}
