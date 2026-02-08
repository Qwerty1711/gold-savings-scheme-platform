import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

function normalizePhone(phone: string) {
  return phone.replace(/\D/g, '');
}

function buildDevPassword(phoneDigits: string) {
  const suffix = phoneDigits.slice(-4) || '0000';
  const stamp = String(Date.now()).slice(-6);
  return `DEV-${suffix}-${stamp}`;
}

export async function POST(request: Request) {
  try {
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const { phone, retailer_id } = await request.json();

    if (!phone || !retailer_id) {
      return NextResponse.json(
        { error: 'Phone and retailer ID are required' },
        { status: 400 }
      );
    }

    const normalizedPhone = normalizePhone(phone);
    if (!normalizedPhone) {
      return NextResponse.json(
        { error: 'Invalid phone number' },
        { status: 400 }
      );
    }

    const { data: lookupData, error: lookupError } = await supabaseAdmin.rpc(
      'lookup_customer_by_phone',
      {
        p_retailer_id: retailer_id,
        p_phone: normalizedPhone,
      }
    );

    if (lookupError) {
      return NextResponse.json(
        { error: 'Customer lookup failed' },
        { status: 500 }
      );
    }

    const lookupCustomer = Array.isArray(lookupData) ? lookupData[0] : lookupData;
    if (!lookupCustomer?.id) {
      return NextResponse.json(
        { error: 'No customer found for this retailer and phone number.' },
        { status: 404 }
      );
    }

    const { data: customerRow, error: customerError } = await supabaseAdmin
      .from('customers')
      .select('id, retailer_id, phone, full_name, user_id')
      .eq('id', lookupCustomer.id)
      .maybeSingle();

    if (customerError || !customerRow) {
      return NextResponse.json(
        { error: 'Failed to load customer details' },
        { status: 500 }
      );
    }

    let authUserId = customerRow.user_id as string | null;

    if (!authUserId) {
      const { data: profile } = await supabaseAdmin
        .from('user_profiles')
        .select('id')
        .eq('customer_id', customerRow.id)
        .eq('role', 'CUSTOMER')
        .maybeSingle();

      if (profile?.id) {
        authUserId = profile.id;
        await supabaseAdmin
          .from('customers')
          .update({ user_id: authUserId })
          .eq('id', customerRow.id)
          .eq('retailer_id', customerRow.retailer_id);
      }
    }

    const devPassword = buildDevPassword(normalizedPhone);
    let email = `${normalizedPhone}@customer.goldsaver.app`;

    if (authUserId) {
      const { data: authUserData } = await supabaseAdmin.auth.admin.getUserById(authUserId);
      if (authUserData?.user?.email) {
        email = authUserData.user.email;
      } else {
        await supabaseAdmin.auth.admin.updateUserById(authUserId, {
          email,
          phone: customerRow.phone,
          email_confirm: true,
          phone_confirm: true,
        });
      }

      const { error: passwordError } = await supabaseAdmin.auth.admin.updateUserById(authUserId, {
        password: devPassword,
      });

      if (passwordError) {
        return NextResponse.json(
          { error: 'Failed to set dev password' },
          { status: 500 }
        );
      }
    } else {
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        phone: customerRow.phone,
        password: devPassword,
        email_confirm: true,
        phone_confirm: true,
        user_metadata: {
          phone: customerRow.phone,
          role: 'CUSTOMER',
          full_name: customerRow.full_name || customerRow.phone,
        },
      });

      if (authError || !authData.user) {
        return NextResponse.json(
          { error: 'Failed to create login credentials' },
          { status: 500 }
        );
      }

      authUserId = authData.user.id;
    }

    if (authUserId) {
      const { data: existingProfile } = await supabaseAdmin
        .from('user_profiles')
        .select('id')
        .eq('id', authUserId)
        .maybeSingle();

      if (!existingProfile?.id) {
        await supabaseAdmin.from('user_profiles').insert({
          id: authUserId,
          retailer_id: customerRow.retailer_id,
          role: 'CUSTOMER',
          full_name: customerRow.full_name || customerRow.phone,
          phone: customerRow.phone,
          customer_id: customerRow.id,
        });
      }

      await supabaseAdmin
        .from('customers')
        .update({ user_id: authUserId })
        .eq('id', customerRow.id)
        .eq('retailer_id', customerRow.retailer_id);
    }

    return NextResponse.json({
      success: true,
      email,
      password: devPassword,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
