import useSWR from 'swr';
import { supabase } from '@/lib/supabase/client';

export function useDashboardMetrics(
  retailerId: string | null,
  timeFilter: 'DAY' | 'WEEK' | 'MONTH' | 'YEAR'
) {
  const { data, error, isLoading, mutate } = useSWR(
    retailerId ? ['dashboard-metrics', retailerId, timeFilter] : null,
    () => fetchDashboardMetrics(retailerId!, timeFilter),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      refreshInterval: 5 * 60 * 1000, // 5 minutes
      dedupingInterval: 2000,
    }
  );
  
  return {
    metrics: data,
    error,
    isLoading,
    refresh: mutate,
  };
}

async function fetchDashboardMetrics(retailerId: string, timeFilter: string) {
  const { startDate, endDate } = calculateDateRange(timeFilter);
  
  const startTime = performance.now();
  
  const { data, error } = await supabase.rpc('get_dashboard_metrics', {
    p_retailer_id: retailerId,
    p_start_date: startDate.toISOString(),
    p_end_date: endDate.toISOString(),
  });
  
  const duration = performance.now() - startTime;
  
  console.log(`[Dashboard Metrics] Loaded in ${duration.toFixed(0)}ms`);
  
  if (error) throw error;
  
  return data;
}

function calculateDateRange(timeFilter: string) {
  const now = new Date();
  let startDate: Date;
  const endDate: Date = new Date();
  
  switch (timeFilter) {
    case 'DAY':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case 'WEEK':
      const day = now.getDay();
      const diff = (day + 6) % 7;
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diff);
      break;
    case 'MONTH':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'YEAR':
      startDate = new Date(now.getFullYear(), 0, 1);
      break;
    default:
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  }
  
  return { startDate, endDate };
}