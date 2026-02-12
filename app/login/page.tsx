'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';


import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { AnimatedLogo } from '@/components/ui/animated-logo';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    if (!email || !password) {
      toast.error('Email and password are required');
      return;
    }
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) {
        throw error;
      }
      if (!data.session) {
        throw new Error('Login failed. No session returned.');
      }
      toast.success('Login successful');
      router.replace('/pulse');
    } catch (err: any) {
      console.error('Login error:', err);
      toast.error(err?.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  }

  // --- DESIGN RESTORE: Premium Branding Header ---
  // (Matches customer login: animated logo, brand name, tagline, spacing)
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-gold-50/20 to-background">
      <div className="w-full max-w-md space-y-6">
        {/* Branding header */}
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            {/* AnimatedLogo: use null for logoUrl, size lg, showAnimation true */}
            <AnimatedLogo logoUrl={null} size="lg" showAnimation />
          </div>
          <div className="rounded-2xl bg-gradient-to-r from-gold-400 via-gold-500 to-gold-600 py-3 px-6">
            <h1 className="text-2xl font-bold text-white">Jai Rajendra Jewel Palace</h1>
          </div>
          <div className="flex justify-center gap-2 text-sm text-muted-foreground mt-2">
            <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 2v2m6.364 1.636l-1.414 1.414M22 12h-2M19.364 19.364l-1.414-1.414M12 22v-2M4.636 19.364l1.414-1.414M2 12h2M4.636 4.636l1.414 1.414" /></svg>
            <span>Trusted by Jewellers Across India</span>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Retailer Login</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={loading}
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground">
          © 2026 Jai Rajendra Jewel Palace
        </p>
      </div>
    </div>
  );
}
