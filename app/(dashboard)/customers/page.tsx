
import CustomersClient from './CustomersClient';
import { supabase } from '@/lib/supabase/client';

export default async function CustomersPage() {
  let customers = [];
  let loading = true;
  try {
    // Get user and retailer_id from user_profiles
    const { data: { user } } = await supabase.auth.getUser();
    let retailerId = '';
    if (user?.id) {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('retailer_id')
        .eq('id', user.id)
        .single();
      retailerId = profile?.retailer_id || '';
    }

    // Prevent query if retailerId is empty
    if (!retailerId) {
      console.error('No retailerId found for user', user?.id);
      loading = false;
      return <CustomersClient customers={[]} loading={loading} />;
    }

    // Fetch customers for this retailer
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('retailer_id', retailerId);
    console.log('DEBUG: retailerId', retailerId);
    console.log('DEBUG: customers query result', data);
    console.log('DEBUG: customers query error', error);
    if (!error && data) {
      customers = data;
    }
    loading = false;
  } catch (error) {
    console.error('Error in CustomersPage:', error);
    loading = false;
  }
  return <CustomersClient customers={customers} loading={loading} />;
}
