'use client';

import { formatDate, formatTimeRange } from '@/lib/utils';

interface BookingConfirmationProps {
  refCode: string;
  date: string;
  startTime: string;
  endTime: string;
  service: string;
  name: string;
  onBookAnother: () => void;
}

export default function BookingConfirmation({ refCode, date, startTime, endTime, service, name, onBookAnother }: BookingConfirmationProps) {
  return (
    <div className="confirmation-screen">
      <div className="confirmation-icon">✓</div>
      <h2 className="confirmation-title">BOOKING <span>CONFIRMED</span></h2>
      <p className="confirmation-subtitle">Thank you, {name}! Your cleaning has been booked.</p>

      <div className="confirmation-ref">
        <div className="confirmation-ref-label">Your Reference Code</div>
        <div className="confirmation-ref-code">{refCode}</div>
        <div className="confirmation-ref-hint">Save this code to manage your booking</div>
      </div>

      <div className="booking-summary" style={{ display: 'block', maxWidth: 400, margin: '1.5rem auto' }}>
        <div className="summary-row">
          <span className="summary-label">Date</span>
          <span className="summary-value">{formatDate(date)}</span>
        </div>
        <div className="summary-row">
          <span className="summary-label">Time</span>
          <span className="summary-value">{formatTimeRange(startTime, endTime)}</span>
        </div>
        <div className="summary-row">
          <span className="summary-label">Service</span>
          <span className="summary-value">{service}</span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap', marginTop: '1.5rem' }}>
        <a
          href={`/booking?ref=${refCode}`}
          className="btn-add-slot"
          style={{ textDecoration: 'none' }}
        >
          View Booking
        </a>
        <button className="btn-add-slot" style={{ background: 'var(--grey)' }} onClick={onBookAnother}>
          Book Another Clean
        </button>
      </div>
    </div>
  );
}
