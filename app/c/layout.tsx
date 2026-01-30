'use client';

import { CustomerAuthProvider, useCustomerAuth } from '@/lib/contexts/customer-auth-context';
import { CustomerMobileNav } from '@/components/customer/mobile-nav';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

function CustomerGuard({ children }: { children: React.ReactNode }) {
  const { user, customer, loading } = useCustomerAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/c/login');
    }
    if (!loading && user && !customer) {
      // If user exists but customer profile is missing, force logout
      router.push('/c/login');
    }
  }, [user, customer, loading, router]);

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }
  if (!user || !customer) {
    return null;
  }
  return <>{children}</>;
}

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return (
    <CustomerAuthProvider>
      <CustomerGuard>
        <div className="min-h-screen pb-20 md:pb-0">
          {children}
          <CustomerMobileNav />
        </div>
      </CustomerGuard>
    </CustomerAuthProvider>
  );
}
