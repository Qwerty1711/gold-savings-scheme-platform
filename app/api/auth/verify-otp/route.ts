import { supabase } from '@/lib/supabase/client';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { phone, otp } = await request.json();

    if (!phone || !otp) {
      return NextResponse.json(
        { error: 'Phone number and OTP are required' },
        { status: 400 }
      );
    }

    // Call the database function to verify OTP
    const { data, error } = await supabase.rpc('verify_registration_otp', {
      p_phone: phone,
      p_otp: otp,
    });

    if (error) {
      console.error('Error verifying OTP:', error);
      return NextResponse.json(
        { error: 'Failed to verify OTP. Please try again.' },
        { status: 500 }
      );
    }

    if (!data.success) {
      return NextResponse.json(
        { error: data.message || 'Invalid or expired OTP' },
        { status: 400 }
      );
    }

    // OTP verified successfully
    return NextResponse.json({
      success: true,
      message: data.message,
      registration_id: data.registration_id,
    });
  } catch (error) {
    console.error('Error in verify-otp API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
