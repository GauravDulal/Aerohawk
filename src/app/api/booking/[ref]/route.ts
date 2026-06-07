import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Rate limiting for lookup to prevent ref_code enumeration
const lookupMap = new Map<string, { count: number; resetAt: number }>();
const LOOKUP_LIMIT = 30; // 30 lookups per IP per hour
const LOOKUP_WINDOW_MS = 60 * 60 * 1000;

function isLookupRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = lookupMap.get(ip);
  if (!entry || now > entry.resetAt) {
    lookupMap.set(ip, { count: 1, resetAt: now + LOOKUP_WINDOW_MS });
    return false;
  }
  entry.count++;
  return entry.count > LOOKUP_LIMIT;
}

// GET — look up a booking by ref code
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ref: string }> }
) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown';

  if (process.env.NODE_ENV !== 'development' && isLookupRateLimited(ip)) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429 }
    );
  }

  const { ref } = await params;
  if (!ref || !/^AH-[A-Z0-9]{6,8}$/i.test(ref)) {
    return NextResponse.json({ error: 'Invalid reference code format.' }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('appointments')
    .select('ref_code, name, service, date, start_time, end_time, status, created_at')
    .eq('ref_code', ref.toUpperCase())
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Booking not found.' }, { status: 404 });
  }

  return NextResponse.json({ booking: data });
}

// PATCH — cancel a booking by ref code
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ ref: string }> }
) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown';

  if (process.env.NODE_ENV !== 'development' && isLookupRateLimited(ip)) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429 }
    );
  }

  const { ref } = await params;
  if (!ref || !/^AH-[A-Z0-9]{6,8}$/i.test(ref)) {
    return NextResponse.json({ error: 'Invalid reference code.' }, { status: 400 });
  }

  let body: { action?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  if (body.action !== 'cancel') {
    return NextResponse.json({ error: 'Invalid action.' }, { status: 400 });
  }

  const supabase = await createClient();

  // Fetch the appointment first
  const { data: appt } = await supabase
    .from('appointments')
    .select('id, status')
    .eq('ref_code', ref.toUpperCase())
    .single();

  if (!appt) {
    return NextResponse.json({ error: 'Booking not found.' }, { status: 404 });
  }

  if (appt.status === 'cancelled') {
    return NextResponse.json({ error: 'Booking is already cancelled.' }, { status: 400 });
  }

  if (appt.status === 'completed') {
    return NextResponse.json({ error: 'Cannot cancel a completed booking.' }, { status: 400 });
  }

  const { error } = await supabase
    .from('appointments')
    .update({ status: 'cancelled' })
    .eq('id', appt.id);

  if (error) {
    return NextResponse.json({ error: 'Failed to cancel booking.' }, { status: 500 });
  }

  return NextResponse.json({ success: true, message: 'Booking cancelled successfully.' });
}
