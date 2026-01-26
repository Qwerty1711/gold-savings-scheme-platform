'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DashboardRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/pulse');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl jewel-gradient mx-auto flex items-center justify-center animate-pulse">
          <span className="text-2xl font-bold text-white">G</span>
        </div>
        <p className="text-muted-foreground">Redirecting to Pulse...</p>
      </div>
    </div>
  );
}

