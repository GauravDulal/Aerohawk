import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

import { checkRateLimit } from '@/lib/redis';

const RATE_LIMIT_WINDOW_SECONDS = 60 * 60; // 1 hour
const RATE_LIMIT_MAX = 10; // 10 bookings per IP per hour

// ── Cloudflare Turnstile verification ──
async function verifyTurnstileToken(token: string): Promise<boolean> {
  const secretKey = process.env.CF_TURNSTILE_SECRET_KEY;

  // Skip verification in development (test keys handle this)
  if (!secretKey) {
    console.warn('CF_TURNSTILE_SECRET_KEY not set — skipping Turnstile verification');
    return true;
  }
  
  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        secret: secretKey,
        response: token,
      }),
    });

    const data = await response.json();
    
    if (!data.success) {
      console.error('Turnstile verification failed:', JSON.stringify(data));
    }
    
    return !!data.success;
  } catch (err) {
    console.error('Turnstile verification network error:', err);
    return false;
  }
}

// ── Validation ──
const VALID_SERVICES = [
  'Residential Cleaning',
  'Office / Commercial Cleaning',
  'Deep Cleaning',
  'End of Lease Clean',
  'Carpet & Upholstery',
  'Window Cleaning',
];

const EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
const PHONE_REGEX = /^[0-9+\-() ]{5,30}$/;

interface BookingRequest {
  name: string;
  phone: string;
  email: string;
  service: string;
  address: string;
  notes: string;
  date: string;
  start_time: string;
  end_time: string;
  turnstile_token?: string;
}

function validateBooking(body: BookingRequest): string | null {
  if (!body.name || body.name.trim().length < 1 || body.name.length > 200) {
    return 'Name is required (max 200 characters).';
  }
  if (!body.phone || !PHONE_REGEX.test(body.phone)) {
    return 'Valid phone number is required (digits, spaces, +, -, parentheses).';
  }
  if (!body.email || !EMAIL_REGEX.test(body.email)) {
    return 'Valid email address is required.';
  }
  if (!body.service || !VALID_SERVICES.includes(body.service)) {
    return 'Please select a valid service.';
  }
  if (!body.address || body.address.trim().length < 5 || body.address.length > 500) {
    return 'Valid address is required (5-500 characters).';
  }
  if (body.notes && body.notes.length > 1000) {
    return 'Notes must be under 1000 characters.';
  }
  if (!body.date || !/^\d{4}-\d{2}-\d{2}$/.test(body.date)) {
    return 'Valid date is required.';
  }
  if (!body.start_time || !/^\d{2}:\d{2}(:\d{2})?$/.test(body.start_time)) {
    return 'Valid start time is required.';
  }
  if (!body.end_time || !/^\d{2}:\d{2}(:\d{2})?$/.test(body.end_time)) {
    return 'Valid end time is required.';
  }
  if (!body.turnstile_token) {
    return 'Human verification is required.';
  }
  return null;
}

export async function POST(request: NextRequest) {
  // Rate limiting
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown';

  if (process.env.NODE_ENV !== 'development') {
    const rateLimitKey = `ratelimit:book:${ip}`;
    const { allowed } = await checkRateLimit(rateLimitKey, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_SECONDS);
    if (!allowed) {
      return NextResponse.json(
        { success: false, error_message: 'Too many booking attempts. Please try again later.' },
        { status: 429 }
      );
    }
  }

  // Parse body
  let body: BookingRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error_message: 'Invalid request body.' },
      { status: 400 }
    );
  }

  // Validate
  const validationError = validateBooking(body);
  if (validationError) {
    return NextResponse.json(
      { success: false, error_message: validationError },
      { status: 400 }
    );
  }

  // Verify Turnstile Token
  const isHuman = await verifyTurnstileToken(body.turnstile_token || '');
  if (!isHuman) {
    return NextResponse.json(
      { success: false, error_message: 'Human verification failed. Please try again.' },
      { status: 400 }
    );
  }

  // Call Supabase RPC
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('book_appointment', {
    p_name: body.name.trim(),
    p_phone: body.phone.trim(),
    p_email: body.email.trim().toLowerCase(),
    p_service: body.service,
    p_address: body.address.trim(),
    p_notes: (body.notes || '').trim(),
    p_date: body.date,
    p_start_time: body.start_time,
    p_end_time: body.end_time,
  });

  if (error) {
    console.error('Booking RPC error:', error);
    return NextResponse.json(
      { success: false, error_message: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }

  const result = data?.[0];
  if (result?.success) {
    return NextResponse.json({
      success: true,
      ref_code: result.ref_code,
    });
  } else {
    return NextResponse.json({
      success: false,
      error_message: result?.error_message || 'Slot no longer available.',
    });
  }
}
