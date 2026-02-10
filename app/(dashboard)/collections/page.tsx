import CollectionsClient from './CollectionsClient';
import { supabase } from '@/lib/supabase/client';
import { cookies } from 'next/headers';

export default async function CollectionsPage() {
  // TODO: Replace with actual retailer/session extraction
  const cookieStore = cookies();
  const retailerId = cookieStore.get('retailer_id')?.value;
  let initialData = null;

  if (retailerId) {
    // Example: Fetch initial collections data for the retailer
    const { data } = await supabase
      .from('transactions')
      .select('*')
      .eq('retailer_id', retailerId)
      .order('paid_at', { ascending: false })
      .limit(100);
    initialData = data || [];
  }

  return <CollectionsClient initialData={initialData} />;
}

