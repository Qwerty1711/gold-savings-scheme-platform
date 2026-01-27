import { supabase } from '@/lib/supabase/client';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { phone } = await request.json();

    if (!phone) {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      );
    }

    // Validate phone format (basic validation)
    const phoneRegex = /^\+?[1-9]\d{9,14}$/;
    if (!phoneRegex.test(phone)) {
      return NextResponse.json(
        { error: 'Invalid phone number format' },
        { status: 400 }
      );
    }

    // Call the database function to send OTP
    const { data, error } = await supabase.rpc('send_registration_otp', {
      p_phone: phone,
    });

    if (error) {
      console.error('Error sending OTP:', error);
      return NextResponse.json(
        { error: 'Failed to send OTP. Please try again.' },
        { status: 500 }
      );
    }

    // Return success (in production, don't return the OTP!)
    return NextResponse.json({
      success: true,
      message: data.message,
      expires_at: data.expires_at,
      registration_id: data.registration_id,
      // For development only - remove in production!
      otp: data.otp,
    });
  } catch (error) {
    console.error('Error in send-otp API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
