'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';

function BookingLookupInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialRef = searchParams.get('ref') || '';
  const [refCode, setRefCode] = useState(initialRef);

  const handleLookup = () => {
    if (!refCode.trim()) return;
    router.push(`/booking/${refCode.trim().toUpperCase()}`);
  };

  return (
    <div style={{ background: 'var(--off-white)', minHeight: '100vh' }}>
      {/* Topbar */}
      <div className="topbar">
        <Link href="/" className="topbar-brand" style={{ textDecoration: 'none' }}>
          AERO<span>HAWK</span>
          <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-barlow-condensed)', letterSpacing: '3px', marginLeft: '4px' }}>
            BOOKING
          </span>
        </Link>
      </div>

      {/* Hero */}
      <div className="booking-hero">
        <h1>TRACK YOUR <span>BOOKING</span></h1>
        <p>Enter your reference code to view or manage your booking.</p>
      </div>

      {/* Lookup Card */}
      <div style={{ maxWidth: 480, margin: '2rem auto', padding: '0 1.5rem' }}>
        <div className="card">
          <div className="card-header">
            <div className="card-icon">
              <svg viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </div>
            <h3>Find Your Booking</h3>
          </div>
          <div className="card-body">
            <div className="form-group">
              <label htmlFor="ref-input">Reference Code</label>
              <input
                id="ref-input"
                className="form-control"
                type="text"
                placeholder="e.g. AH-A1B2C3D4"
                value={refCode}
                onChange={(e) => setRefCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
                style={{ textTransform: 'uppercase', letterSpacing: '2px', fontFamily: 'var(--font-barlow-condensed)' }}
              />
            </div>
            <button
              className="btn-book"
              onClick={handleLookup}
              disabled={!refCode.trim()}
            >
              Look Up Booking
            </button>
            <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
              <Link href="/book" style={{ color: 'var(--navy)', fontSize: '0.88rem', textDecoration: 'underline' }}>
                Need to book a clean? →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BookingLookupPage() {
  return (
    <Suspense>
      <BookingLookupInner />
    </Suspense>
  );
}
