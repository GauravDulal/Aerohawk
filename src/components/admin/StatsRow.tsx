'use client';

import type { Appointment } from '@/lib/types';

interface StatsRowProps {
  appointments: Appointment[];
}

export default function StatsRow({ appointments }: StatsRowProps) {
  const todayStr = new Date().toISOString().split('T')[0];
  const totalBookings = appointments.length;
  const pendingCount = appointments.filter((a) => a.status === 'pending').length;
  const confirmedCount = appointments.filter((a) => a.status === 'confirmed').length;
  const todayCount = appointments.filter((a) => a.date === todayStr).length;

  return (
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
  );
}
