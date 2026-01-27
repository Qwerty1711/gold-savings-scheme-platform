import { supabase } from '@/lib/supabase/client';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { phone, full_name, address, pan_number, retailer_id } = await request.json();

    if (!phone || !full_name || !retailer_id) {
      return NextResponse.json(
        { error: 'Phone, full name, and retailer ID are required' },
        { status: 400 }
      );
    }

    // Call the database function to complete registration
    const { data, error } = await supabase.rpc('complete_customer_registration', {
      p_phone: phone,
      p_full_name: full_name,
      p_address: address,
      p_pan_number: pan_number,
      p_retailer_id: retailer_id,
    });

    if (error) {
      console.error('Error completing registration:', error);
      return NextResponse.json(
        { error: 'Failed to complete registration. Please try again.' },
        { status: 500 }
      );
    }

    if (!data.success) {
      return NextResponse.json(
        { error: data.message || 'Registration failed' },
        { status: 400 }
      );
    }

    // Create auth user for customer
    // Use phone as email (phone@customer.goldsaver.com)
    const customerEmail = `${phone.replace(/\+/g, '')}@customer.goldsaver.com`;
    
    // Create Supabase auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: customerEmail,
      password: `${phone}${full_name}`,  // Temporary password, customer can change later
      options: {
        data: {
          full_name,
          phone,
          role: 'CUSTOMER',
        },
      },
    });

    if (authError) {
      console.error('Error creating auth user:', authError);
      // Customer record created but auth failed - they can contact admin
      return NextResponse.json({
        success: true,
        message: 'Registration completed but login setup failed. Please contact admin.',
        customer_id: data.customer_id,
        partial: true,
      });
    }

    // Create user_profile for customer
    if (authData.user) {
      const { error: profileError } = await supabase.from('user_profiles').insert({
        id: authData.user.id,
        retailer_id,
        role: 'CUSTOMER',
        full_name,
        phone,
        customer_id: data.customer_id,
      });

      if (profileError) {
        console.error('Error creating user profile:', profileError);
      }
    }

    // Registration completed successfully
    return NextResponse.json({
      success: true,
      message: data.message,
      customer_id: data.customer_id,
      registration_id: data.registration_id,
      email: customerEmail,
    });
  } catch (error) {
    console.error('Error in complete-registration API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
