// app/api/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Sign in using Supabase
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error || !data.session) {
      return NextResponse.json({ error: error?.message || 'Login failed' }, { status: 401 });
    }

    const res = NextResponse.json({ user: data.user });

    // Set SSR-friendly cookies
    res.cookies.set('sb-access-token', data.session.access_token, { path: '/', httpOnly: true });
    res.cookies.set('sb-refresh-token', data.session.refresh_token, { path: '/', httpOnly: true });
    res.cookies.set('sb-type', data.session.type, { path: '/' });

    return res;
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
