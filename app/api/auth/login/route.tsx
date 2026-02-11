import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

/**
 * Server-side login API for SSR-compatible sessions.
 * Sets sb-access-token and sb-refresh-token cookies automatically.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies }
    );

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error || !data.session) {
      return NextResponse.json({ error: error?.message || 'Login failed' }, { status: 400 });
    }

    console.log('✅ User logged in, session set via cookies:', data.session);

    return NextResponse.json({ user: data.user });
  } catch (err: any) {
    console.error('Error in /api/auth/login:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
