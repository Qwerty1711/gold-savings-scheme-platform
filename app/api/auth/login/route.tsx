import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
  const body = await req.json();
  const { email, password } = body;

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
  }

  const cookieStore = cookies();

  // Supabase SSR client
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // New SSR adapter for Next.js 13+
        getAll: () =>
          cookieStore.getAll().map(c => ({
            name: c.name,
            value: c.value,
          })),
        setAll: (cookiesToSet) =>
          cookiesToSet.forEach(c =>
            cookieStore.set(c.name, c.value, {
              httpOnly: true,
              path: '/',
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax',
              maxAge: c.maxAge,
            })
          ),
      },
    }
  );

  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;

    const session = data.session;
    if (!session) throw new Error('No session returned');

    // Manual cookie set for SSR
    cookieStore.set('sb-access-token', session.access_token, {
      httpOnly: true,
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: session.expires_in,
    });
    cookieStore.set('sb-refresh-token', session.refresh_token, {
      httpOnly: true,
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
    });

    return NextResponse.json({ user: data.user });
  } catch (err: any) {
    console.error('Login error:', err);
    return NextResponse.json({ error: err.message || 'Login failed' }, { status: 400 });
  }
}
