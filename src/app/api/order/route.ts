import { supabase } from '@/lib/supabase';
import Twilio from 'twilio';
import { NextResponse } from 'next/server';

const twilio = Twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

export async function POST(req: Request) {
  try {
    const { userId, catererId, eventDetails, phoneNumber } = await req.json();

    // Save order to Supabase
    const { data, error } = await supabase
      .from('orders')
      .insert({ user_id: userId, caterer_id: catererId, event_details: eventDetails })
      .select()
      .single();
    if (error) throw new Error(error.message);

    // Send SMS confirmation
    await twilio.messages.create({
      body: `Sharp sharp! Your catering order for ${eventDetails.event_name} is confirmed with Kai. We’ll keep you posted! 🍖`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phoneNumber,
    });

    return NextResponse.json({ order: data });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to place order' }, { status: 500 });
  }
}