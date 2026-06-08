'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { formatDate, formatTimeRange } from '@/lib/utils';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

interface BookingData {
  ref_code: string;
  name: string;
  service: string;
  date: string;
  start_time: string;
  end_time: string;
  status: string;
  created_at: string;
}

const statusLabels: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pending Confirmation', color: 'var(--warning)' },
  confirmed: { label: 'Confirmed', color: 'var(--success)' },
  completed: { label: 'Completed', color: 'var(--grey)' },
  cancelled: { label: 'Cancelled', color: 'var(--danger)' },
};

export default function BookingDetailPage({ params }: { params: Promise<{ ref: string }> }) {
  const { ref } = use(params);
  const [booking, setBooking] = useState<BookingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelEmail, setCancelEmail] = useState('');
  const [cancelEmailError, setCancelEmailError] = useState('');

  useEffect(() => {
    async function fetchBooking() {
      try {
        const res = await fetch(`/api/booking/${ref}`);
        const data = await res.json();
        if (res.ok && data.booking) {
          setBooking(data.booking);
        } else {
          setError(data.error || 'Booking not found.');
        }
      } catch {
        setError('Failed to load booking. Please try again.');
      }
      setLoading(false);
    }
    fetchBooking();
  }, [ref]);

  const handleCancel = async () => {
    // Validate email
    if (!cancelEmail.trim()) {
      setCancelEmailError('Please enter your email address.');
      return;
    }
    if (!/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(cancelEmail.trim())) {
      setCancelEmailError('Please enter a valid email address.');
      return;
    }
    setCancelEmailError('');
    setCancelling(true);
    try {
      const res = await fetch(`/api/booking/${ref}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel', email: cancelEmail.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setBooking((prev) => prev ? { ...prev, status: 'cancelled' } : null);
        setShowCancelConfirm(false);
        setCancelEmail('');
      } else {
        setCancelEmailError(data.error || 'Failed to cancel.');
      }
    } catch {
      setCancelEmailError('Failed to cancel. Please try again.');
    }
    setCancelling(false);
  };

  const status = booking ? statusLabels[booking.status] || statusLabels.pending : null;

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

      <div style={{ maxWidth: 520, margin: '2rem auto', padding: '0 1.5rem 3rem' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '5rem 0' }}>
            <LoadingSpinner size="lg" label="Loading booking..." />
          </div>
        ) : error && !booking ? (
          <div className="card">
            <div className="card-body" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.3 }}>🔍</div>
              <h3 style={{ fontFamily: 'var(--font-barlow-condensed)', fontSize: '1.2rem', letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--navy-dark)', marginBottom: '0.5rem' }}>
                Booking Not Found
              </h3>
              <p style={{ color: 'var(--grey)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                {error}
              </p>
              <Link href="/booking" className="btn-add-slot" style={{ textDecoration: 'none', display: 'inline-block' }}>
                Try Another Code
              </Link>
            </div>
          </div>
        ) : booking ? (
          <div className="card">
            <div className="card-header" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '0.3rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', width: '100%' }}>
                <div className="card-icon">
                  <svg viewBox="0 0 24 24">
                    <rect x="3" y="4" width="18" height="18" rx="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                </div>
                <h3>Booking Details</h3>
                <span
                  className="badge-pill"
                  style={{
                    marginLeft: 'auto',
                    background: `${status?.color}22`,
                    color: status?.color,
                  }}
                >
                  {status?.label}
                </span>
              </div>
            </div>
            <div className="card-body">
              <div className="confirmation-ref" style={{ marginBottom: '1.5rem' }}>
                <div className="confirmation-ref-label">Reference Code</div>
                <div className="confirmation-ref-code">{booking.ref_code}</div>
              </div>

              <div className="booking-summary" style={{ display: 'block' }}>
                <div className="summary-row">
                  <span className="summary-label">Name</span>
                  <span className="summary-value">{booking.name}</span>
                </div>
                <div className="summary-row">
                  <span className="summary-label">Service</span>
                  <span className="summary-value">{booking.service}</span>
                </div>
                <div className="summary-row">
                  <span className="summary-label">Date</span>
                  <span className="summary-value">{formatDate(booking.date)}</span>
                </div>
                <div className="summary-row">
                  <span className="summary-label">Time</span>
                  <span className="summary-value">{formatTimeRange(booking.start_time, booking.end_time)}</span>
                </div>
                <div className="summary-row">
                  <span className="summary-label">Status</span>
                  <span className="summary-value" style={{ color: status?.color }}>{status?.label}</span>
                </div>
                <div className="summary-row">
                  <span className="summary-label">Booked</span>
                  <span className="summary-value" style={{ fontSize: '0.82rem' }}>
                    {new Date(booking.created_at).toLocaleDateString('en-AU', {
                      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>

              {error && <div className="login-error" style={{ marginTop: '1rem' }}>{error}</div>}

              {(booking.status === 'pending' || booking.status === 'confirmed') && !showCancelConfirm && (
                <button
                  className="btn-sm-del"
                  style={{ width: '100%', padding: '0.7rem', marginTop: '1.5rem', fontSize: '0.88rem' }}
                  onClick={() => setShowCancelConfirm(true)}
                >
                  Cancel Booking
                </button>
              )}

              {showCancelConfirm && (
                <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(224,85,85,0.05)', border: '1px solid rgba(224,85,85,0.2)', borderRadius: '4px' }}>
                  <p style={{ color: 'var(--danger)', fontSize: '0.88rem', marginBottom: '0.5rem', fontWeight: 600 }}>
                    Cancel this booking?
                  </p>
                  <p style={{ color: 'var(--grey)', fontSize: '0.82rem', marginBottom: '0.8rem' }}>
                    To verify your identity, please enter the email address you used when booking.
                  </p>
                  <input
                    type="email"
                    placeholder="Enter your email address"
                    value={cancelEmail}
                    onChange={(e) => { setCancelEmail(e.target.value); setCancelEmailError(''); }}
                    style={{
                      width: '100%',
                      padding: '0.6rem 0.8rem',
                      border: cancelEmailError ? '1px solid var(--danger)' : '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '0.88rem',
                      marginBottom: '0.4rem',
                      boxSizing: 'border-box',
                    }}
                  />
                  {cancelEmailError && (
                    <p style={{ color: 'var(--danger)', fontSize: '0.78rem', margin: '0 0 0.6rem' }}>{cancelEmailError}</p>
                  )}
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                    <button
                      className="btn-cancel"
                      onClick={() => { setShowCancelConfirm(false); setCancelEmail(''); setCancelEmailError(''); }}
                      style={{ flex: 1 }}
                    >
                      Keep Booking
                    </button>
                    <button
                      className="btn-sm-del"
                      style={{ flex: 1, padding: '0.6rem' }}
                      onClick={handleCancel}
                      disabled={cancelling}
                    >
                      {cancelling ? 'Cancelling...' : 'Confirm Cancel'}
                    </button>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.7rem', marginTop: '1.5rem', justifyContent: 'center' }}>
                <Link href="/booking" style={{ color: 'var(--navy)', fontSize: '0.85rem' }}>
                  ← Look up another booking
                </Link>
                <span style={{ color: 'var(--grey-light)' }}>·</span>
                <Link href="/book" style={{ color: 'var(--navy)', fontSize: '0.85rem' }}>
                  Book a new clean →
                </Link>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
