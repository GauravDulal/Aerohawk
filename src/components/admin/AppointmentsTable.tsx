'use client';

import { useState } from 'react';
import type { Appointment } from '@/lib/types';
import { formatDate, formatTimeRange } from '@/lib/utils';
import ConfirmModal from '@/components/ui/ConfirmModal';
import type { SupabaseClient } from '@supabase/supabase-js';

interface AppointmentsTableProps {
  supabase: SupabaseClient;
  appointments: Appointment[];
  showToast: (message: string, type?: 'success' | 'error' | 'default') => void;
  fetchData: () => Promise<void>;
}

const PAGE_SIZE = 25;

/** Escape CSV cell values to prevent formula injection in Excel/Sheets */
function escapeCsvCell(value: string): string {
  const str = String(value || '');
  // Prefix formula-triggering characters with an apostrophe
  const escaped = /^[=+\-@\t\r]/.test(str) ? `'${str}` : str;
  return `"${escaped.replace(/"/g, '""')}"`;
}

export default function AppointmentsTable({ supabase, appointments, showToast, fetchData }: AppointmentsTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalConfig, setModalConfig] = useState({
    title: '',
    subtitle: '',
    body: '',
    confirmLabel: 'Confirm',
    onConfirm: () => {},
  });

  const statusColors: Record<string, string> = {
    pending: 'var(--warning)',
    confirmed: 'var(--success)',
    completed: 'var(--grey)',
    cancelled: 'var(--danger)',
  };

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
        showToast('Appointment deleted.', 'success');
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
        .map(escapeCsvCell)
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

  // Filter & sort
  const filteredAppts = appointments
    .filter((a) => {
      const matchSearch = !searchQuery ||
        a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.ref_code.toLowerCase().includes(searchQuery.toLowerCase());
      const matchStatus = !statusFilter || a.status === statusFilter;
      return matchSearch && matchStatus;
    })
    .sort((a, b) => a.date.localeCompare(b.date) || a.start_time.localeCompare(b.start_time));

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredAppts.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages - 1);
  const pagedAppts = filteredAppts.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);

  return (
    <>
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
              placeholder="Search name or ref…"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(0); }}
              style={{ flex: 1, minWidth: '100px' }}
              aria-label="Search appointments"
            />
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
              aria-label="Filter by status"
            >
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <button className="btn-export" onClick={exportCSV} aria-label="Export appointments as CSV">⬇ Export</button>
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
                {pagedAppts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="no-data">No appointments found.</td>
                  </tr>
                ) : (
                  pagedAppts.map((a) => (
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
                          aria-label={`Change status for ${a.name}`}
                        >
                          <option value="pending">Pending</option>
                          <option value="confirmed">Confirmed</option>
                          <option value="completed">Completed</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </td>
                      <td>
                        <button className="btn-sm-del" onClick={() => confirmDeleteAppt(a)} aria-label={`Delete appointment for ${a.name}`}>Delete</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="pagination-row">
              <button
                className="cal-nav-btn"
                onClick={() => setPage(Math.max(0, currentPage - 1))}
                disabled={currentPage === 0}
                aria-label="Previous page"
              >
                ‹
              </button>
              <span className="pagination-info">
                Page {currentPage + 1} of {totalPages} ({filteredAppts.length} total)
              </span>
              <button
                className="cal-nav-btn"
                onClick={() => setPage(Math.min(totalPages - 1, currentPage + 1))}
                disabled={currentPage >= totalPages - 1}
                aria-label="Next page"
              >
                ›
              </button>
            </div>
          )}
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
