import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Create admin client for auth operations
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

export async function POST(request: Request) {
  try {
    const { phone, otp, retailer_id } = await request.json();

    if (!phone || !otp) {
      return NextResponse.json(
        { error: 'Phone number and OTP are required' },
        { status: 400 }
      );
    }

    // Default retailer ID if not provided
    const effectiveRetailerId = retailer_id || '00000000-0000-0000-0000-000000000001';

    // Verify OTP
    const { data: otpData, error: otpError } = await supabaseAdmin.rpc('verify_registration_otp', {
      p_phone: phone,
      p_otp: otp,
    });

    if (otpError) {
      console.error('Error verifying OTP:', otpError);
      return NextResponse.json(
        { error: 'Failed to verify OTP. Please try again.' },
        { status: 500 }
      );
    }

    if (!otpData.success) {
      return NextResponse.json(
        { error: otpData.message || 'Invalid or expired OTP' },
        { status: 400 }
      );
    }

    // Check if customer already exists
    const { data: existingCustomer } = await supabaseAdmin
      .from('customers')
      .select('id')
      .eq('phone', phone)
      .eq('retailer_id', effectiveRetailerId)
      .maybeSingle();

    if (existingCustomer) {
      // Customer exists, just create/return auth session
      const customerEmail = `${phone.replace(/\+/g, '')}@customer.goldsaver.com`;
      
      return NextResponse.json({
        success: true,
        message: 'OTP verified. Existing customer found.',
        customer_id: existingCustomer.id,
        email: customerEmail,
      });
    }

    // Create minimal customer record
    const { data: newCustomer, error: customerError } = await supabaseAdmin
      .from('customers')
      .insert({
        retailer_id: effectiveRetailerId,
        phone: phone,
        full_name: phone, // Temporary - will be updated in enrollment
        customer_code: `CUST${Date.now()}`,
        source: 'SELF_REGISTRATION',
        kyc_status: 'PENDING',
      })
      .select('id')
      .single();

    if (customerError) {
      console.error('Error creating customer:', customerError);
      return NextResponse.json(
        { error: 'Failed to create customer record' },
        { status: 500 }
      );
    }

    // Create auth user
    const customerEmail = `${phone.replace(/\+/g, '')}@customer.goldsaver.com`;
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: customerEmail,
      password: `${phone}${Date.now()}`,
      email_confirm: true,
      user_metadata: {
        phone,
        role: 'CUSTOMER',
      },
    });

    if (authError) {
      console.error('Error creating auth user:', authError);
      return NextResponse.json(
        { error: 'Failed to create login credentials' },
        { status: 500 }
      );
    }

    // Create user_profile link
    if (authData.user) {
      await supabaseAdmin.from('user_profiles').insert({
        id: authData.user.id,
        retailer_id: effectiveRetailerId,
        role: 'CUSTOMER',
        full_name: phone,
        phone: phone,
        customer_id: newCustomer.id,
      });
    }

    // Generate a login link for auto-login
    const { data: magicLinkData, error: magicLinkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: customerEmail,
    });

    return NextResponse.json({
      success: true,
      message: 'OTP verified successfully',
      customer_id: newCustomer.id,
      registration_id: otpData.registration_id,
      email: customerEmail,
      magic_link: magicLinkData?.properties?.action_link, // Auto-login URL
    });
  } catch (error) {
    console.error('Error in verify-otp API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
