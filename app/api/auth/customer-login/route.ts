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
    const { phone, otp } = await request.json();

    if (!phone || !otp) {
      return NextResponse.json(
        { error: 'Phone and OTP are required' },
        { status: 400 }
      );
    }

    // Demo mode: Accept OTP 123456 for any phone number in development
    const isDemoOTP = otp === '123456';
    const isDevelopment = process.env.NODE_ENV === 'development';

    let otpValid = false;

    if (isDevelopment && isDemoOTP) {
      // Demo mode: Always accept 123456
      otpValid = true;
    } else {
      // Verify OTP using registration_otps table
      const { data: otpRecord, error: otpError } = await supabaseAdmin
        .from('registration_otps')
        .select('*')
        .eq('phone', phone)
        .eq('otp_code', otp)
        .gte('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!otpError && otpRecord) {
        otpValid = true;
        
        // Mark OTP as verified if not already
        if (!otpRecord.verified) {
          await supabaseAdmin
            .from('registration_otps')
            .update({ verified: true })
            .eq('id', otpRecord.id);
        }
      }
    }

    if (!otpValid) {
      return NextResponse.json(
        { error: 'Invalid or expired OTP' },
        { status: 400 }
      );
    }

    // OTP already verified above. Now create a session for the phone number.
    // Find the auth user by phone
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      console.error('Error listing users:', listError);
      return NextResponse.json(
        { error: 'Failed to find user account' },
        { status: 500 }
      );
    }

    const authUser = users.find(u => u.phone === phone);

    if (!authUser) {
      return NextResponse.json(
        { error: 'No account found for this phone number. Please register first.' },
        { status: 404 }
      );
    }

    // Generate auth tokens using signInWithOtp - create a verified session
    // Since we already verified the OTP, we'll use a workaround: update the user to create tokens
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      phone: phone,
    });

    if (linkError || !linkData?.properties) {
      console.error('Link generation error:', linkError);
      return NextResponse.json(
        { error: 'Failed to create session' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      session: {
        access_token: linkData.properties.access_token,
        refresh_token: linkData.properties.refresh_token,
      },
    });
  } catch (error: any) {
    console.error('Error in customer-login API:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
