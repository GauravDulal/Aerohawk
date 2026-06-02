'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/Toast';
import ConfirmModal from '@/components/ui/ConfirmModal';
import type { AvailabilitySlot, Appointment, BlockedDate } from '@/lib/types';
import { formatDate, formatTimeRange } from '@/lib/utils';

export default function AdminDashboardPage() {
  const supabase = createClient();
  const { showToast } = useToast();

  // Data
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([]);

  // Availability form
  const [availDate, setAvailDate] = useState('');
  const [availStart, setAvailStart] = useState('09:00');
  const [availEnd, setAvailEnd] = useState('10:00');
  const [genStart, setGenStart] = useState('08:00');
  const [genEnd, setGenEnd] = useState('17:00');

  // Block date
  const [blockDate, setBlockDate] = useState('');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [modalConfig, setModalConfig] = useState({
    title: '',
    subtitle: '',
    body: '',
    confirmLabel: 'Confirm',
    onConfirm: () => {},
  });

  const todayStr = new Date().toISOString().split('T')[0];

  const fetchData = useCallback(async () => {
    const [slotsRes, apptsRes, blockedRes] = await Promise.all([
      supabase.from('availability_slots').select('*').order('date').order('start_time'),
      supabase.from('appointments').select('*').order('date').order('start_time'),
      supabase.from('blocked_dates').select('*').order('date'),
    ]);

    if (slotsRes.data) setSlots(slotsRes.data);
    if (apptsRes.data) setAppointments(apptsRes.data);
    if (blockedRes.data) setBlockedDates(blockedRes.data);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
  }, [fetchData]);

  // ── STATS ──
  const totalBookings = appointments.length;
  const pendingCount = appointments.filter((a) => a.status === 'pending').length;
  const confirmedCount = appointments.filter((a) => a.status === 'confirmed').length;
  const todayCount = appointments.filter((a) => a.date === todayStr).length;

  // ── AVAILABILITY MANAGEMENT ──
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

    // Use upsert to skip duplicates
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

  // Check if a slot is booked
  const isSlotBooked = (slot: AvailabilitySlot) => {
    return appointments.some(
      (a) =>
        a.date === slot.date &&
        a.status !== 'cancelled' &&
        !(a.end_time <= slot.start_time || a.start_time >= slot.end_time)
    );
  };

  // ── BLOCKED DATES ──
  const handleBlockDate = async () => {
    if (!blockDate) {
      showToast('Select a date to block.', 'error');
      return;
    }

    const { error } = await supabase.from('blocked_dates').insert({ date: blockDate });
    if (error) {
      if (error.code === '23505') {
        showToast('Already blocked.', 'error');
      } else {
        showToast('Failed to block date.', 'error');
      }
      return;
    }

    showToast(`${formatDate(blockDate)} blocked.`, 'success');
    setBlockDate('');
    fetchData();
  };

  const unblockDate = async (id: string, date: string) => {
    const { error } = await supabase.from('blocked_dates').delete().eq('id', id);
    if (error) {
      showToast('Failed to unblock date.', 'error');
      return;
    }
    showToast(`${formatDate(date)} unblocked.`, 'success');
    fetchData();
  };

  // ── APPOINTMENTS ──
  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from('appointments').update({ status }).eq('id', id);
    if (error) {
      showToast('Failed to update status.', 'error');
      return;
    }
    showToast(`Status updated to ${status}`, 'success');
    fetchData();
  };

  const confirmDeleteAppt = (appt: Appointment) => {
    setModalConfig({
      title: 'Delete Appointment',
      subtitle: appt.name,
      body: 'This will permanently remove this booking.',
      confirmLabel: 'Delete',
      onConfirm: async () => {
        const { error } = await supabase.from('appointments').delete().eq('id', appt.id);
        if (error) {
          showToast('Failed to delete appointment.', 'error');
          return;
        }
        showToast('Appointment deleted.', 'error');
        fetchData();
      },
    });
    setModalOpen(true);
  };

  const exportCSV = () => {
    if (appointments.length === 0) {
      showToast('No appointments to export.', 'error');
      return;
    }
    const headers = ['Ref', 'Name', 'Phone', 'Email', 'Service', 'Address', 'Notes', 'Date', 'Time', 'Status', 'Booked At'];
    const rows = appointments.map((a) =>
      [a.ref_code, a.name, a.phone, a.email, a.service, a.address, a.notes, a.date, `${a.start_time}-${a.end_time}`, a.status, a.created_at]
        .map((v) => `"${v || ''}"`)
        .join(',')
    );
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'aerohawk-bookings.csv';
    link.click();
    URL.revokeObjectURL(url);
    showToast('Exported as CSV!', 'success');
  };

  // Filter appointments
  const filteredAppts = appointments
    .filter((a) => {
      const matchSearch = !searchQuery ||
        a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.ref_code.toLowerCase().includes(searchQuery.toLowerCase());
      const matchStatus = !statusFilter || a.status === statusFilter;
      return matchSearch && matchStatus;
    })
    .sort((a, b) => a.date.localeCompare(b.date) || a.start_time.localeCompare(b.start_time));

  const statusColors: Record<string, string> = {
    pending: 'var(--warning)',
    confirmed: 'var(--success)',
    completed: 'var(--grey)',
    cancelled: 'var(--danger)',
  };

  return (
    <>
      <div className="admin-layout">
        {/* Stats Row */}
        <div className="stats-row">
          <div className="stat-card">
            <div className="stat-card-num">{totalBookings}</div>
            <div className="stat-card-label">Total Bookings</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-num" style={{ color: 'var(--warning)' }}>{pendingCount}</div>
            <div className="stat-card-label">Pending</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-num" style={{ color: 'var(--success)' }}>{confirmedCount}</div>
            <div className="stat-card-label">Confirmed</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-num" style={{ color: 'var(--accent)' }}>{todayCount}</div>
            <div className="stat-card-label">Today</div>
          </div>
        </div>

        <div className="admin-grid">
          {/* Availability Manager */}
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
                              <button className="btn-del" title="Delete slot" onClick={() => deleteSlot(slot.id)}>×</button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Block Dates */}
              <div style={{ marginTop: '1.2rem' }}>
                <div className="form-group">
                  <label>Block a Full Day</label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input className="form-control" type="date" min={todayStr} value={blockDate} onChange={(e) => setBlockDate(e.target.value)} />
                    <button className="btn-add-slot" onClick={handleBlockDate} style={{ whiteSpace: 'nowrap' }}>Block Date</button>
                  </div>
                </div>
                <div className="blocked-list">
                  {blockedDates.length === 0 ? (
                    <span style={{ color: 'var(--grey)', fontSize: '0.8rem' }}>No blocked dates.</span>
                  ) : (
                    blockedDates.map((bd) => (
                      <div key={bd.id} className="blocked-pill">
                        {formatDate(bd.date)}
                        <button onClick={() => unblockDate(bd.id, bd.date)} title="Unblock">×</button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Appointments */}
          <div className="card">
            <div className="card-header">
              <div className="card-icon">
                <svg viewBox="0 0 24 24">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
              <h3>Appointments</h3>
            </div>
            <div className="card-body" style={{ padding: '1rem' }}>
              <div className="filter-row">
                <input
                  type="text"
                  placeholder="Search name…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ flex: 1, minWidth: '100px' }}
                />
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  <option value="">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
                <button className="btn-export" onClick={exportCSV}>⬇ Export</button>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="appts-table">
                  <thead>
                    <tr>
                      <th>Client</th>
                      <th>Service</th>
                      <th>Date &amp; Time</th>
                      <th>Status</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAppts.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="no-data">No appointments found.</td>
                      </tr>
                    ) : (
                      filteredAppts.map((a) => (
                        <tr key={a.id}>
                          <td>
                            <div className="client-name">{a.name}</div>
                            <div className="client-phone">{a.phone}</div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--grey-light)' }}>{a.ref_code}</div>
                          </td>
                          <td style={{ fontSize: '0.82rem' }}>
                            {a.service}<br />
                            <span style={{ color: 'var(--grey)', fontSize: '0.75rem' }}>{a.address}</span>
                          </td>
                          <td style={{ fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                            {formatDate(a.date)}<br />
                            <strong>{formatTimeRange(a.start_time, a.end_time)}</strong>
                          </td>
                          <td>
                            <select
                              className="status-select"
                              value={a.status}
                              onChange={(e) => updateStatus(a.id, e.target.value)}
                              style={{ borderLeft: `3px solid ${statusColors[a.status] || 'var(--grey)'}` }}
                            >
                              <option value="pending">Pending</option>
                              <option value="confirmed">Confirmed</option>
                              <option value="completed">Completed</option>
                              <option value="cancelled">Cancelled</option>
                            </select>
                          </td>
                          <td>
                            <button className="btn-sm-del" onClick={() => confirmDeleteAppt(a)}>Delete</button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ConfirmModal
        open={modalOpen}
        title={modalConfig.title}
        subtitle={modalConfig.subtitle}
        body={modalConfig.body}
        confirmLabel={modalConfig.confirmLabel}
        onConfirm={modalConfig.onConfirm}
        onCancel={() => setModalOpen(false)}
      />
    </>
  );
}
