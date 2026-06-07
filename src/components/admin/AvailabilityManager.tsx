'use client';

import { useState } from 'react';
import type { AvailabilitySlot, Appointment } from '@/lib/types';
import { formatDate, formatTimeRange } from '@/lib/utils';
import type { SupabaseClient } from '@supabase/supabase-js';

interface AvailabilityManagerProps {
  supabase: SupabaseClient;
  slots: AvailabilitySlot[];
  appointments: Appointment[];
  showToast: (message: string, type?: 'success' | 'error' | 'default') => void;
  fetchData: () => Promise<void>;
}

export default function AvailabilityManager({ supabase, slots, appointments, showToast, fetchData }: AvailabilityManagerProps) {
  const [availDate, setAvailDate] = useState('');
  const [availStart, setAvailStart] = useState('09:00');
  const [availEnd, setAvailEnd] = useState('10:00');
  const [genStart, setGenStart] = useState('08:00');
  const [genEnd, setGenEnd] = useState('17:00');

  const todayStr = new Date().toISOString().split('T')[0];

  const isSlotBooked = (slot: AvailabilitySlot) => {
    return appointments.some(
      (a) =>
        a.date === slot.date &&
        a.status !== 'cancelled' &&
        !(a.end_time <= slot.start_time || a.start_time >= slot.end_time)
    );
  };

  const addSlot = async () => {
    if (!availDate || !availStart || !availEnd) {
      showToast('Fill in date, start and end time.', 'error');
      return;
    }
    if (availStart >= availEnd) {
      showToast('End time must be after start time.', 'error');
      return;
    }

    const { error } = await supabase.from('availability_slots').insert({
      date: availDate,
      start_time: availStart,
      end_time: availEnd,
    });

    if (error) {
      if (error.code === '23505') {
        showToast('Slot already exists.', 'error');
      } else {
        showToast('Failed to add slot.', 'error');
      }
      return;
    }

    showToast(`Slot added: ${formatDate(availDate)} ${availStart}-${availEnd}`, 'success');
    fetchData();
  };

  const generateSlots = async () => {
    if (!availDate || !genStart || !genEnd) {
      showToast('Select a date and time range.', 'error');
      return;
    }

    const [sh, sm] = genStart.split(':').map(Number);
    const [eh, em] = genEnd.split(':').map(Number);
    const endMins = eh * 60 + em;
    const slotsToInsert: { date: string; start_time: string; end_time: string }[] = [];

    let curH = sh;
    let curM = sm;

    while (curH * 60 + curM + 60 <= endMins) {
      const nextH = curH + Math.floor((curM + 60) / 60);
      const nextM = (curM + 60) % 60;
      slotsToInsert.push({
        date: availDate,
        start_time: `${String(curH).padStart(2, '0')}:${String(curM).padStart(2, '0')}`,
        end_time: `${String(nextH).padStart(2, '0')}:${String(nextM).padStart(2, '0')}`,
      });
      curH = nextH;
      curM = nextM;
    }

    if (slotsToInsert.length === 0) {
      showToast('No slots could be generated from this range.', 'error');
      return;
    }

    const { error } = await supabase.from('availability_slots').upsert(slotsToInsert, {
      onConflict: 'date,start_time,end_time',
      ignoreDuplicates: true,
    });

    if (error) {
      showToast('Failed to generate slots.', 'error');
      return;
    }

    showToast(`Generated ${slotsToInsert.length} slots for ${formatDate(availDate)}`, 'success');
    fetchData();
  };

  const deleteSlot = async (slotId: string) => {
    const { error } = await supabase.from('availability_slots').delete().eq('id', slotId);
    if (error) {
      showToast('Failed to delete slot.', 'error');
      return;
    }
    showToast('Slot removed.', 'success');
    fetchData();
  };

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-icon">
          <svg viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        </div>
        <h3>Manage Availability</h3>
      </div>
      <div className="card-body">
        <div className="avail-form">
          <div className="form-group">
            <label>Date</label>
            <input className="form-control" type="date" min={todayStr} value={availDate} onChange={(e) => setAvailDate(e.target.value)} />
          </div>
          <div className="time-row">
            <div className="form-group" style={{ margin: 0 }}>
              <label>Start Time</label>
              <input className="form-control" type="time" value={availStart} onChange={(e) => setAvailStart(e.target.value)} />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label>End Time</label>
              <input className="form-control" type="time" value={availEnd} onChange={(e) => setAvailEnd(e.target.value)} />
            </div>
            <button className="btn-add-slot" onClick={addSlot} style={{ marginTop: '1.5rem' }}>+ Add Slot</button>
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--grey)' }}>💡 Or generate slots automatically:</div>
          <div className="time-row">
            <div className="form-group" style={{ margin: 0 }}>
              <label>From</label>
              <input className="form-control" type="time" value={genStart} onChange={(e) => setGenStart(e.target.value)} />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label>To</label>
              <input className="form-control" type="time" value={genEnd} onChange={(e) => setGenEnd(e.target.value)} />
            </div>
            <button className="btn-add-slot" onClick={generateSlots} style={{ marginTop: '1.5rem', background: 'var(--grey)' }}>⚡ Auto</button>
          </div>
        </div>

        {/* Current Slots */}
        <div style={{ marginTop: '1.2rem' }}>
          <div style={{ fontFamily: 'var(--font-barlow-condensed)', fontSize: '0.72rem', letterSpacing: '2px', textTransform: 'uppercase' as const, color: 'var(--grey)', marginBottom: '0.5rem' }}>
            Current Availability Slots
          </div>
          <div className="slots-list">
            {slots.length === 0 ? (
              <div style={{ color: 'var(--grey)', fontSize: '0.85rem', padding: '0.5rem 0' }}>No slots configured yet.</div>
            ) : (
              slots.map((slot) => {
                const booked = isSlotBooked(slot);
                return (
                  <div key={slot.id} className="slot-item">
                    <div>
                      <div className="slot-item-info">{formatDate(slot.date)}</div>
                      <div className="slot-item-meta">{formatTimeRange(slot.start_time, slot.end_time)}</div>
                    </div>
                    <div className="slot-item-right">
                      <span className={`badge-pill ${booked ? 'badge-full' : 'badge-open'}`}>
                        {booked ? 'Booked' : 'Open'}
                      </span>
                      {!booked && (
                        <button className="btn-del" title="Delete slot" aria-label="Delete slot" onClick={() => deleteSlot(slot.id)}>×</button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
