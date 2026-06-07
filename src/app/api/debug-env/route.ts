import { NextResponse } from 'next/server';

export async function GET() {
  const siteKey = process.env.NEXT_PUBLIC_CF_TURNSTILE_SITE_KEY;
  const secretKey = process.env.CF_TURNSTILE_SECRET_KEY;

  return NextResponse.json({
    siteKey: {
      exists: !!siteKey,
      length: siteKey ? siteKey.length : 0,
      prefix: siteKey ? siteKey.substring(0, 6) : null,
    },
    secretKey: {
      exists: !!secretKey,
      length: secretKey ? secretKey.length : 0,
      prefix: secretKey ? secretKey.substring(0, 6) : null,
    },
    env: process.env.NODE_ENV,
  });
}
