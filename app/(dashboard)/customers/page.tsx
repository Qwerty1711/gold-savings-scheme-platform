import { createServerClient } from '@/lib/supabase/server';
import CustomersClient from './customers-client';

export default async function CustomersPage() {
  const supabase = createServerClient();
  
  try {
    // 1. Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('❌ Customers - Auth error:', authError);
      return (
        <CustomersClient 
          customers={[]} 
          loading={false} 
          error="Authentication required. Please log in."
          rlsError={false}
        />
      );
    }
    
    console.log('✅ Customers - User authenticated:', user.id);
    
    // 2. Get user's retailer_id from user_profiles
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('retailer_id, role, full_name')
      .eq('id', user.id)
      .single();
    
    if (profileError || !profile) {
      console.error('❌ Customers - Profile error:', profileError);
      return (
        <CustomersClient 
          customers={[]} 
          loading={false} 
          error="User profile not found. Please contact support."
          rlsError={false}
        />
      );
    }
    
    if (!profile.retailer_id) {
      console.error('❌ Customers - No retailer_id in profile:', profile);
      return (
        <CustomersClient 
          customers={[]} 
          loading={false} 
          error="No retailer associated with your account. Please contact support."
          rlsError={false}
        />
      );
    }
    
    console.log('✅ Customers - Profile loaded:', {
      retailerId: profile.retailer_id,
      role: profile.role,
      name: profile.full_name,
    });
    
    // 3. Fetch customers for this retailer
    const { data: customers, error: customersError } = await supabase
      .from('customers')
      .select('*')
      .eq('retailer_id', profile.retailer_id)
      .order('created_at', { ascending: false });
    
    if (customersError) {
      console.error('❌ Customers - Query error:', customersError);
      console.error('❌ Customers - Error details:', {
        message: customersError.message,
        code: customersError.code,
        details: customersError.details,
        hint: customersError.hint,
      });
      
      // If RLS is blocking, provide helpful error
      const isRLSError = 
        customersError.code === 'PGRST301' || 
        customersError.message?.includes('RLS') ||
        customersError.message?.includes('policy');
      
      return (
        <CustomersClient 
          customers={[]} 
          loading={false} 
          error={isRLSError 
            ? "Database access denied. RLS policies may be blocking access." 
            : `Failed to load customers: ${customersError.message}`}
          rlsError={isRLSError}
        />
      );
    }
    
    console.log('✅ Customers - Data loaded:', {
      count: customers?.length || 0,
      retailerId: profile.retailer_id,
      firstCustomer: customers?.[0]?.full_name,
    });
    
    // 4. Pass data to client component
    return (
      <CustomersClient 
        customers={customers || []} 
        loading={false}
        retailerName={profile.full_name || 'Unknown'}
        error={null}
        rlsError={false}
      />
    );
    
  } catch (error) {
    console.error('❌ Customers - Unexpected error:', error);
    return (
      <CustomersClient 
        customers={[]} 
        loading={false} 
        error="An unexpected error occurred. Please try again."
        rlsError={false}
      />
    );
  }
}
