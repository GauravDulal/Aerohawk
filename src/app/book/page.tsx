'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { ToastProvider, useToast } from '@/components/ui/Toast';
import ConfirmModal from '@/components/ui/ConfirmModal';
import type { AvailabilitySlot } from '@/lib/types';
import { formatDate, formatTime, formatTimeRange, isSlotInFuture, getMonthRange, toDateStr } from '@/lib/utils';

function BookingPageInner() {
  const supabase = createClient();
  const { showToast } = useToast();

  // Calendar state
  const now = new Date();
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(null);

  // Data
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [blocked, setBlocked] = useState<string[]>([]);
  const [bookedSlots, setBookedSlots] = useState<{ date: string; start_time: string; end_time: string }[]>([]);

  // Form state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [service, setService] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);

  const fetchData = useCallback(async () => {
    const { start, end } = getMonthRange(calYear, calMonth);

    const [slotsRes, blockedRes, bookedRes] = await Promise.all([
      supabase.from('availability_slots').select('*').gte('date', start).lte('date', end).order('date').order('start_time'),
      supabase.from('blocked_dates').select('date'),
      supabase.from('appointments').select('date, start_time, end_time').gte('date', start).lte('date', end).neq('status', 'cancelled'),
    ]);

    if (slotsRes.data) setSlots(slotsRes.data);
    if (blockedRes.data) setBlocked(blockedRes.data.map((b: { date: string }) => b.date));
    if (bookedRes.data) setBookedSlots(bookedRes.data);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calYear, calMonth]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
  }, [fetchData]);

  // Calendar helpers
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const dayHeaders = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  const firstDay = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const changeMonth = (dir: number) => {
    let newMonth = calMonth + dir;
    let newYear = calYear;
    if (newMonth > 11) { newMonth = 0; newYear++; }
    if (newMonth < 0) { newMonth = 11; newYear--; }
    setCalMonth(newMonth);
    setCalYear(newYear);
    setSelectedDate(null);
    setSelectedSlot(null);
  };

  // Get slots for a specific date
  const getSlotsForDate = (dateStr: string) => {
    return slots.filter((s) => s.date === dateStr);
  };

  // Check if a specific slot is booked
  const isSlotBooked = (dateStr: string, startTime: string, endTime: string) => {
    return bookedSlots.some(
      (b) => b.date === dateStr && b.start_time === startTime && b.end_time === endTime
    );
  };

  // Get free slots for a date (not booked, not in the past)
  const getFreeSlotsForDate = (dateStr: string) => {
    const dateSlots = getSlotsForDate(dateStr);
    return dateSlots.filter(
      (s) => !isSlotBooked(dateStr, s.start_time, s.end_time) && isSlotInFuture(dateStr, s.start_time)
    );
  };

  // Handle date selection
  const handleDateSelect = (dateStr: string) => {
    setSelectedDate(dateStr);
    setSelectedSlot(null);
  };

  // Handle slot selection
  const handleSlotSelect = (slot: AvailabilitySlot) => {
    setSelectedSlot(slot);
  };

  // Form validation
  const isFormValid = selectedDate && selectedSlot && name && phone && email && service && address;

  // Submit booking
  const handleSubmit = async () => {
    if (!selectedDate || !selectedSlot) return;
    setSubmitting(true);

    const { data, error } = await supabase.rpc('book_appointment', {
      p_name: name,
      p_phone: phone,
      p_email: email,
      p_service: service,
      p_address: address,
      p_notes: notes,
      p_date: selectedDate,
      p_start_time: selectedSlot.start_time,
      p_end_time: selectedSlot.end_time,
    });

    setSubmitting(false);

    if (error) {
      showToast('Something went wrong. Please try again.', 'error');
      return;
    }

    const result = data?.[0];
    if (result?.success) {
      showToast(`✅ Booking confirmed! Your reference: ${result.ref_code}`, 'success');
      // Reset form
      setName(''); setPhone(''); setEmail(''); setService('');
      setAddress(''); setNotes('');
      setSelectedDate(null); setSelectedSlot(null);
      fetchData();
    } else {
      showToast(result?.error_message || 'Slot no longer available.', 'error');
      fetchData();
    }
  };

  // Render calendar days
  const renderCalendarDays = () => {
    const cells = [];

    // Empty cells
    for (let i = 0; i < firstDay; i++) {
      cells.push(<div key={`empty-${i}`} className="cal-day empty" />);
    }

    // Day cells
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = toDateStr(calYear, calMonth, d);
      const dateObj = new Date(dateStr + 'T00:00:00');
      const isToday = dateObj.toDateString() === today.toDateString();
      const isPast = dateObj < today;
      const isBlocked = blocked.includes(dateStr);
      const freeSlots = getFreeSlotsForDate(dateStr);
      const hasSlots = freeSlots.length > 0;
      const isSelected = dateStr === selectedDate;

      let className = 'cal-day';
      if (isToday) className += ' today';
      if (isSelected) className += ' selected';
      if (isPast || isBlocked || !hasSlots) {
        className += isPast ? ' past' : ' no-slots';
      } else {
        className += ' has-slots';
      }

      cells.push(
        <div
          key={dateStr}
          className={className}
          onClick={hasSlots && !isPast && !isBlocked ? () => handleDateSelect(dateStr) : undefined}
        >
          {d}
          {hasSlots && !isPast && !isBlocked && <span className="slot-dot" />}
        </div>
      );
    }

    return cells;
  };

  // Get time slots for selected date
  const dateSlots = selectedDate ? getSlotsForDate(selectedDate) : [];

  return (
    <>
      {/* Topbar */}
      <div className="topbar">
        <Link href="/" className="topbar-brand" style={{ textDecoration: 'none' }}>
          AERO<span>HAWK</span>
          <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-barlow-condensed)', letterSpacing: '3px', marginLeft: '4px' }}>
            BOOKING
          </span>
        </Link>
        <div style={{ display: 'flex', gap: '0.3rem' }}>
          <Link
            href="/book"
            className="tab-btn active"
            style={{ textDecoration: 'none' }}
          >
            📅 Book a Clean
          </Link>
        </div>
      </div>

      {/* Hero */}
      <div className="booking-hero">
        <h1>BOOK YOUR <span>CLEAN</span></h1>
        <p>Select your service, pick a date &amp; time, and we&apos;ll take care of the rest.</p>
      </div>

      {/* Booking Layout */}
      <div className="booking-layout">
        {/* LEFT: Calendar + Slots */}
        <div>
          <div className="card" style={{ marginBottom: '1.2rem' }}>
            <div className="card-header">
              <div className="card-icon">
                <svg viewBox="0 0 24 24">
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              </div>
              <h3>Select Date &amp; Time</h3>
            </div>
            <div className="card-body">
              {/* Calendar nav */}
              <div className="calendar-nav">
                <button className="cal-nav-btn" onClick={() => changeMonth(-1)}>‹</button>
                <span className="cal-month-label">{monthNames[calMonth]} {calYear}</span>
                <button className="cal-nav-btn" onClick={() => changeMonth(1)}>›</button>
              </div>

              {/* Calendar grid */}
              <div className="cal-grid">
                {dayHeaders.map((dh) => (
                  <div key={dh} className="cal-day-header">{dh}</div>
                ))}
                {renderCalendarDays()}
              </div>

              {/* Time slots */}
              {selectedDate && dateSlots.length > 0 && (
                <div className="slots-container">
                  <div className="slots-title">Available Times</div>
                  <div className="slots-grid">
                    {dateSlots.map((slot) => {
                      const booked = isSlotBooked(selectedDate, slot.start_time, slot.end_time);
                      const pastSlot = !isSlotInFuture(selectedDate, slot.start_time);
                      const isSelected = selectedSlot?.id === slot.id;

                      let btnClass = 'slot-btn';
                      if (isSelected) btnClass += ' selected';
                      else if (booked) btnClass += ' booked';
                      else if (pastSlot) btnClass += ' past-slot';

                      return (
                        <button
                          key={slot.id}
                          className={btnClass}
                          onClick={!booked && !pastSlot ? () => handleSlotSelect(slot) : undefined}
                          disabled={booked || pastSlot}
                        >
                          {formatTime(slot.start_time)}
                          <br />
                          {formatTime(slot.end_time)}
                          {booked && <span className="booked-label">Taken</span>}
                          {pastSlot && !booked && <span className="booked-label">Past</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {selectedDate && dateSlots.length === 0 && (
                <div style={{ textAlign: 'center', color: 'var(--grey)', fontSize: '0.85rem', padding: '1rem 0' }}>
                  No available slots on this date.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT: Details form */}
        <div>
          <div className="card">
            <div className="card-header">
              <div className="card-icon">
                <svg viewBox="0 0 24 24">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
              <h3>Your Details</h3>
            </div>
            <div className="card-body">
              <div className="form-group">
                <label>Full Name *</label>
                <input className="form-control" type="text" placeholder="e.g. Jane Smith" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Phone Number *</label>
                <input className="form-control" type="tel" placeholder="e.g. 0400 000 000" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Email Address *</label>
                <input className="form-control" type="email" placeholder="jane@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Service Type *</label>
                <select className="form-control" value={service} onChange={(e) => setService(e.target.value)}>
                  <option value="">— Select a service —</option>
                  <option>Residential Cleaning</option>
                  <option>Office / Commercial Cleaning</option>
                  <option>Deep Cleaning</option>
                  <option>End of Lease Clean</option>
                  <option>Carpet &amp; Upholstery</option>
                  <option>Window Cleaning</option>
                </select>
              </div>
              <div className="form-group">
                <label>Address *</label>
                <input className="form-control" type="text" placeholder="Street, Suburb, State" value={address} onChange={(e) => setAddress(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Notes (optional)</label>
                <textarea className="form-control" rows={2} placeholder="Anything we should know..." value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>

              {/* Booking Summary */}
              {selectedDate && selectedSlot && (
                <div className="booking-summary" style={{ display: 'block' }}>
                  <div className="summary-row">
                    <span className="summary-label">Date</span>
                    <span className="summary-value">{formatDate(selectedDate)}</span>
                  </div>
                  <div className="summary-row">
                    <span className="summary-label">Time</span>
                    <span className="summary-value">{formatTimeRange(selectedSlot.start_time, selectedSlot.end_time)}</span>
                  </div>
                  <div className="summary-row">
                    <span className="summary-label">Service</span>
                    <span className="summary-value">{service || '—'}</span>
                  </div>
                </div>
              )}

              <button
                className="btn-book"
                disabled={!isFormValid || submitting}
                onClick={() => {
                  if (!name || !phone || !email || !service || !address) {
                    showToast('Please fill in all required fields.', 'error');
                    return;
                  }
                  setModalOpen(true);
                }}
              >
                {submitting ? 'Booking...' : 'Confirm Booking'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      <ConfirmModal
        open={modalOpen}
        title="Confirm Your Booking"
        subtitle={selectedDate && selectedSlot ? `${formatDate(selectedDate)} at ${formatTimeRange(selectedSlot.start_time, selectedSlot.end_time)}` : ''}
        body={`Service: ${service}\nClient: ${name}\nAddress: ${address}\n\nPlease confirm your booking.`}
        confirmLabel="Confirm Booking"
        onConfirm={handleSubmit}
        onCancel={() => setModalOpen(false)}
      />
    </>
  );
}

export default function BookingPage() {
  return (
    <ToastProvider>
      <div style={{ background: 'var(--off-white)', minHeight: '100vh' }}>
        <BookingPageInner />
      </div>
    </ToastProvider>
  );
}
