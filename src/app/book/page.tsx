'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import Script from 'next/script';
import { createClient } from '@/lib/supabase/client';
import { ToastProvider, useToast } from '@/components/ui/Toast';
import ConfirmModal from '@/components/ui/ConfirmModal';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import BookingConfirmation from '@/components/booking/BookingConfirmation';
import type { AvailabilitySlot } from '@/lib/types';
import { formatDate, formatTime, formatTimeRange, isSlotInFuture, getMonthRange, toDateStr } from '@/lib/utils';

// ── Validation ──
const EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
const PHONE_REGEX = /^[0-9+\-() ]{5,30}$/;

interface FormErrors {
  name?: string;
  phone?: string;
  email?: string;
  service?: string;
  address?: string;
}

interface ExtendedWindow {
  onloadTurnstileCallback?: () => void;
  turnstile?: {
    render: (
      element: HTMLElement | string,
      options: {
        sitekey: string;
        callback: (token: string) => void;
        'expired-callback'?: () => void;
        'error-callback'?: () => void;
      }
    ) => string;
    remove: (widgetId: string) => void;
  };
}

function BookingPageInner() {
  const supabase = useMemo(() => createClient(), []);
  const { showToast } = useToast();

  // Calendar state
  const now = new Date();
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlots, setSelectedSlots] = useState<AvailabilitySlot[]>([]);
  const [anchorSlot, setAnchorSlot] = useState<AvailabilitySlot | null>(null);

  // Data
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [blocked, setBlocked] = useState<string[]>([]);
  const [bookedSlots, setBookedSlots] = useState<{ date: string; start_time: string; end_time: string }[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  // Form state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [service, setService] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);

  // Confirmation state
  const [confirmation, setConfirmation] = useState<{
    refCode: string;
    date: string;
    startTime: string;
    endTime: string;
    service: string;
    name: string;
  } | null>(null);

  // Turnstile CAPTCHA State
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileContainerRef = useRef<HTMLDivElement>(null);
  const turnstileWidgetId = useRef<string | null>(null);

  // Render Turnstile widget
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const extWindow = window as unknown as ExtendedWindow;

    const renderWidget = () => {
      if (!turnstileContainerRef.current || !extWindow.turnstile) return;

      // Remove previous widget if it exists
      if (turnstileWidgetId.current) {
        try {
          extWindow.turnstile.remove(turnstileWidgetId.current);
        } catch { /* widget already removed */ }
        turnstileWidgetId.current = null;
      }

      turnstileWidgetId.current = extWindow.turnstile.render(turnstileContainerRef.current, {
        sitekey: process.env.NEXT_PUBLIC_CF_TURNSTILE_SITE_KEY || '1x00000000000000000000AA',
        callback: (token: string) => {
          setTurnstileToken(token);
        },
        'expired-callback': () => {
          setTurnstileToken(null);
        },
        'error-callback': () => {
          setTurnstileToken(null);
        },
      });
    };

    // If turnstile script is already loaded, render immediately
    if (extWindow.turnstile) {
      renderWidget();
    }

    // Set the onload callback for when the script finishes loading
    extWindow.onloadTurnstileCallback = renderWidget;

    return () => {
      delete extWindow.onloadTurnstileCallback;
      if (turnstileWidgetId.current && extWindow.turnstile) {
        try {
          extWindow.turnstile.remove(turnstileWidgetId.current);
        } catch { /* widget already removed */ }
        turnstileWidgetId.current = null;
      }
    };
  }, []); // Only run once on mount

  const fetchData = useCallback(async () => {
    setDataLoading(true);
    const { start, end } = getMonthRange(calYear, calMonth);

    const [slotsRes, blockedRes, bookedRes] = await Promise.all([
      supabase.from('availability_slots').select('*').gte('date', start).lte('date', end).order('date').order('start_time'),
      supabase.from('blocked_dates').select('date'),
      supabase.from('appointments').select('date, start_time, end_time').gte('date', start).lte('date', end).neq('status', 'cancelled'),
    ]);

    if (slotsRes.data) setSlots(slotsRes.data);
    if (blockedRes.data) setBlocked(blockedRes.data.map((b: { date: string }) => b.date));
    if (bookedRes.data) setBookedSlots(bookedRes.data);
    setDataLoading(false);
  }, [calYear, calMonth, supabase]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (active) {
        await fetchData();
      }
    };
    load();
    return () => {
      active = false;
    };
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
    setSelectedSlots([]);
    setAnchorSlot(null);
  };

  const getSlotsForDate = (dateStr: string) => slots.filter((s) => s.date === dateStr);

  const isSlotBooked = (dateStr: string, startTime: string, endTime: string) => {
    return bookedSlots.some(
      (b) => b.date === dateStr && !(b.end_time <= startTime || b.start_time >= endTime)
    );
  };

  const getFreeSlotsForDate = (dateStr: string) => {
    return getSlotsForDate(dateStr).filter(
      (s) => !isSlotBooked(dateStr, s.start_time, s.end_time) && isSlotInFuture(dateStr, s.start_time)
    );
  };

  const handleDateSelect = (dateStr: string) => {
    setSelectedDate(dateStr);
    setSelectedSlots([]);
    setAnchorSlot(null);
  };

  const handleSlotSelect = (slot: AvailabilitySlot) => {
    if (selectedSlots.length === 0 || !anchorSlot) {
      setAnchorSlot(slot);
      setSelectedSlots([slot]);
    } else {
      if (anchorSlot.id === slot.id) {
        setAnchorSlot(null);
        setSelectedSlots([]);
        return;
      }

      const dateSlots = slots
        .filter((s) => s.date === selectedDate)
        .sort((a, b) => a.start_time.localeCompare(b.start_time));

      const idx1 = dateSlots.findIndex((s) => s.id === anchorSlot.id);
      const idx2 = dateSlots.findIndex((s) => s.id === slot.id);

      if (idx1 !== -1 && idx2 !== -1) {
        const isAlreadySelected = selectedSlots.some((s) => s.id === slot.id);
        if (isAlreadySelected) {
          if (idx2 > idx1) {
            setSelectedSlots(dateSlots.slice(idx1, idx2));
          } else {
            setSelectedSlots(dateSlots.slice(idx2 + 1, idx1 + 1));
          }
          return;
        }

        const minIdx = Math.min(idx1, idx2);
        const maxIdx = Math.max(idx1, idx2);
        const candidateSlots = dateSlots.slice(minIdx, maxIdx + 1);

        const allAvailable = candidateSlots.every(
          (s) => s.id === anchorSlot.id || s.id === slot.id || (!isSlotBooked(s.date, s.start_time, s.end_time) && isSlotInFuture(s.date, s.start_time))
        );

        if (allAvailable) {
          setSelectedSlots(candidateSlots);
        } else {
          setAnchorSlot(slot);
          setSelectedSlots([slot]);
        }
      } else {
        setAnchorSlot(slot);
        setSelectedSlots([slot]);
      }
    }
  };

  // ── Form validation ──
  const validateForm = (): boolean => {
    const errors: FormErrors = {};
    if (!name.trim()) errors.name = 'Name is required.';
    else if (name.length > 200) errors.name = 'Name is too long (max 200 characters).';

    if (!phone.trim()) errors.phone = 'Phone number is required.';
    else if (!PHONE_REGEX.test(phone)) errors.phone = 'Enter a valid phone number.';

    if (!email.trim()) errors.email = 'Email is required.';
    else if (!EMAIL_REGEX.test(email)) errors.email = 'Enter a valid email address.';

    if (!service) errors.service = 'Please select a service.';

    if (!address.trim()) errors.address = 'Address is required.';
    else if (address.length < 5) errors.address = 'Address is too short.';
    else if (address.length > 500) errors.address = 'Address is too long (max 500 characters).';

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const isFormValid = selectedDate && selectedSlots.length > 0 && name && phone && email && service && address && turnstileToken;

  // ── Submit booking via API route ──
  const handleSubmit = async () => {
    if (!selectedDate || selectedSlots.length === 0) return;

    if (!validateForm()) {
      showToast('Please fix the errors above.', 'error');
      return;
    }

    setSubmitting(true);

    const sortedSelected = [...selectedSlots].sort((a, b) => a.start_time.localeCompare(b.start_time));
    const startTime = sortedSelected[0].start_time;
    const endTime = sortedSelected[sortedSelected.length - 1].end_time;

    try {
      const response = await fetch('/api/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim(),
          service,
          address: address.trim(),
          notes: notes.trim(),
          date: selectedDate,
          start_time: startTime,
          end_time: endTime,
          turnstile_token: turnstileToken,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setConfirmation({
          refCode: result.ref_code,
          date: selectedDate,
          startTime,
          endTime,
          service,
          name: name.trim(),
        });
        fetchData();
      } else {
        showToast(result.error_message || 'Slot no longer available.', 'error');
        fetchData();
      }
    } catch {
      showToast('Something went wrong. Please try again.', 'error');
    }

    setSubmitting(false);
  };

  const resetBooking = () => {
    setName(''); setPhone(''); setEmail(''); setService('');
    setAddress(''); setNotes(''); setFormErrors({});
    setSelectedDate(null); setSelectedSlots([]); setAnchorSlot(null);
    setConfirmation(null);
  };

  // ── Calendar rendering ──
  const renderCalendarDays = () => {
    const cells = [];
    for (let i = 0; i < firstDay; i++) {
      cells.push(<div key={`empty-${i}`} className="cal-day empty" />);
    }
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
          role="button"
          tabIndex={hasSlots && !isPast && !isBlocked ? 0 : -1}
          aria-label={`${d} ${monthNames[calMonth]} ${calYear}${hasSlots ? `, ${freeSlots.length} slots available` : ', no slots'}${isSelected ? ', selected' : ''}`}
          aria-pressed={isSelected}
          aria-disabled={isPast || isBlocked || !hasSlots}
          onClick={hasSlots && !isPast && !isBlocked ? () => handleDateSelect(dateStr) : undefined}
          onKeyDown={hasSlots && !isPast && !isBlocked ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleDateSelect(dateStr); } } : undefined}
        >
          {d}
          {hasSlots && !isPast && !isBlocked && <span className="slot-dot" />}
        </div>
      );
    }
    return cells;
  };

  const dateSlots = selectedDate ? getSlotsForDate(selectedDate) : [];

  // ── If confirmed, show confirmation screen ──
  if (confirmation) {
    return (
      <>
        <div className="topbar">
          <Link href="/" className="topbar-brand" style={{ textDecoration: 'none' }}>
            AERO<span>HAWK</span>
            <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-barlow-condensed)', letterSpacing: '3px', marginLeft: '4px' }}>
              BOOKING
            </span>
          </Link>
        </div>
        <BookingConfirmation
          refCode={confirmation.refCode}
          date={confirmation.date}
          startTime={confirmation.startTime}
          endTime={confirmation.endTime}
          service={confirmation.service}
          name={confirmation.name}
          onBookAnother={resetBooking}
        />
      </>
    );
  }

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
          <Link href="/book" className="tab-btn active" style={{ textDecoration: 'none' }}>
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
              {dataLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem 0' }}>
                  <LoadingSpinner label="Loading availability..." />
                </div>
              ) : (
                <>
                  {/* Calendar nav */}
                  <div className="calendar-nav">
                    <button className="cal-nav-btn" onClick={() => changeMonth(-1)} aria-label="Previous month">‹</button>
                    <span className="cal-month-label">{monthNames[calMonth]} {calYear}</span>
                    <button className="cal-nav-btn" onClick={() => changeMonth(1)} aria-label="Next month">›</button>
                  </div>

                  {/* Calendar grid */}
                  <div className="cal-grid" role="grid" aria-label="Booking calendar">
                    {dayHeaders.map((dh) => (
                      <div key={dh} className="cal-day-header" role="columnheader">{dh}</div>
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
                          const isSelected = selectedSlots.some((s) => s.id === slot.id);

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
                              aria-label={`${formatTime(slot.start_time)} to ${formatTime(slot.end_time)}${booked ? ', taken' : pastSlot ? ', past' : ''}${isSelected ? ', selected' : ''}`}
                              aria-pressed={isSelected}
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
                </>
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
                <label htmlFor="book-name">Full Name *</label>
                <input
                  id="book-name"
                  className={`form-control${formErrors.name ? ' form-error' : ''}`}
                  type="text"
                  placeholder="e.g. Jane Smith"
                  value={name}
                  onChange={(e) => { setName(e.target.value); setFormErrors((p) => ({ ...p, name: undefined })); }}
                  maxLength={200}
                  aria-invalid={!!formErrors.name}
                  aria-describedby={formErrors.name ? 'name-error' : undefined}
                />
                {formErrors.name && <div id="name-error" className="field-error">{formErrors.name}</div>}
              </div>
              <div className="form-group">
                <label htmlFor="book-phone">Phone Number *</label>
                <input
                  id="book-phone"
                  className={`form-control${formErrors.phone ? ' form-error' : ''}`}
                  type="tel"
                  placeholder="e.g. 0400 000 000"
                  value={phone}
                  onChange={(e) => { setPhone(e.target.value); setFormErrors((p) => ({ ...p, phone: undefined })); }}
                  maxLength={30}
                  aria-invalid={!!formErrors.phone}
                  aria-describedby={formErrors.phone ? 'phone-error' : undefined}
                />
                {formErrors.phone && <div id="phone-error" className="field-error">{formErrors.phone}</div>}
              </div>
              <div className="form-group">
                <label htmlFor="book-email">Email Address *</label>
                <input
                  id="book-email"
                  className={`form-control${formErrors.email ? ' form-error' : ''}`}
                  type="email"
                  placeholder="jane@email.com"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setFormErrors((p) => ({ ...p, email: undefined })); }}
                  aria-invalid={!!formErrors.email}
                  aria-describedby={formErrors.email ? 'email-error' : undefined}
                />
                {formErrors.email && <div id="email-error" className="field-error">{formErrors.email}</div>}
              </div>
              <div className="form-group">
                <label htmlFor="book-service">Service Type *</label>
                <select
                  id="book-service"
                  className={`form-control${formErrors.service ? ' form-error' : ''}`}
                  value={service}
                  onChange={(e) => { setService(e.target.value); setFormErrors((p) => ({ ...p, service: undefined })); }}
                  aria-invalid={!!formErrors.service}
                  aria-describedby={formErrors.service ? 'service-error' : undefined}
                >
                  <option value="">— Select a service —</option>
                  <option>Residential Cleaning</option>
                  <option>Office / Commercial Cleaning</option>
                  <option>Deep Cleaning</option>
                  <option>End of Lease Clean</option>
                  <option>Carpet &amp; Upholstery</option>
                  <option>Window Cleaning</option>
                </select>
                {formErrors.service && <div id="service-error" className="field-error">{formErrors.service}</div>}
              </div>
              <div className="form-group">
                <label htmlFor="book-address">Address *</label>
                <input
                  id="book-address"
                  className={`form-control${formErrors.address ? ' form-error' : ''}`}
                  type="text"
                  placeholder="Street, Suburb, State"
                  value={address}
                  onChange={(e) => { setAddress(e.target.value); setFormErrors((p) => ({ ...p, address: undefined })); }}
                  maxLength={500}
                  aria-invalid={!!formErrors.address}
                  aria-describedby={formErrors.address ? 'address-error' : undefined}
                />
                {formErrors.address && <div id="address-error" className="field-error">{formErrors.address}</div>}
              </div>
              <div className="form-group">
                <label htmlFor="book-notes">Notes (optional)</label>
                <textarea
                  id="book-notes"
                  className="form-control"
                  rows={2}
                  placeholder="Anything we should know..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  maxLength={1000}
                />
                {notes.length > 0 && (
                  <div style={{ fontSize: '0.7rem', color: 'var(--grey)', textAlign: 'right', marginTop: '0.2rem' }}>
                    {notes.length}/1000
                  </div>
                )}
              </div>

              {/* Cloudflare Turnstile */}
              <div ref={turnstileContainerRef} style={{ marginTop: '1rem', marginBottom: '1rem' }} />

              {/* Booking Summary */}
              {selectedDate && selectedSlots.length > 0 && (
                <div className="booking-summary" style={{ display: 'block' }}>
                  <div className="summary-row">
                    <span className="summary-label">Date</span>
                    <span className="summary-value">{formatDate(selectedDate)}</span>
                  </div>
                  <div className="summary-row">
                    <span className="summary-label">Time</span>
                    <span className="summary-value">
                      {(() => {
                        const sorted = [...selectedSlots].sort((a, b) => a.start_time.localeCompare(b.start_time));
                        return formatTimeRange(sorted[0].start_time, sorted[sorted.length - 1].end_time);
                      })()}
                    </span>
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
                  if (!validateForm()) {
                    showToast('Please fix the errors above.', 'error');
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
        subtitle={
          selectedDate && selectedSlots.length > 0
            ? (() => {
                const sorted = [...selectedSlots].sort((a, b) => a.start_time.localeCompare(b.start_time));
                return `${formatDate(selectedDate)} at ${formatTimeRange(sorted[0].start_time, sorted[sorted.length - 1].end_time)}`;
              })()
            : ''
        }
        body={`Service: ${service}\nClient: ${name}\nAddress: ${address}\n\nPlease confirm your booking.`}
        confirmLabel="Confirm Booking"
        onConfirm={handleSubmit}
        onCancel={() => setModalOpen(false)}
      />

      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onloadTurnstileCallback"
        strategy="afterInteractive"
      />
    </>
  );
}

export default function BookingPage() {
  return (
    <ToastProvider>
      <ErrorBoundary>
        <div style={{ background: 'var(--off-white)', minHeight: '100vh' }}>
          <BookingPageInner />
        </div>
      </ErrorBoundary>
    </ToastProvider>
  );
}
