'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/Toast';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import StatsRow from '@/components/admin/StatsRow';
import AvailabilityManager from '@/components/admin/AvailabilityManager';
import BlockedDatesManager from '@/components/admin/BlockedDatesManager';
import AppointmentsTable from '@/components/admin/AppointmentsTable';
import type { AvailabilitySlot, Appointment, BlockedDate } from '@/lib/types';

export default function AdminDashboardPage() {
  const supabase = useMemo(() => createClient(), []);
  const { showToast } = useToast();

  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    const [slotsRes, apptsRes, blockedRes] = await Promise.all([
      supabase.from('availability_slots').select('*').order('date').order('start_time'),
      supabase.from('appointments').select('*').order('date').order('start_time'),
      supabase.from('blocked_dates').select('*').order('date'),
    ]);

    if (slotsRes.data) setSlots(slotsRes.data);
    if (apptsRes.data) setAppointments(apptsRes.data);
    if (blockedRes.data) setBlockedDates(blockedRes.data);
    setLoading(false);
  }, [supabase]);

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

  if (loading) {
    return (
      <div className="admin-layout" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <LoadingSpinner size="lg" label="Loading dashboard..." />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="admin-layout">
        <StatsRow appointments={appointments} />

        <div className="admin-grid">
          {/* Left column: Availability + Blocked Dates */}
          <div>
            <AvailabilityManager
              supabase={supabase}
              slots={slots}
              appointments={appointments}
              showToast={showToast}
              fetchData={fetchData}
            />
            <div className="card" style={{ marginTop: '1.5rem' }}>
              <div className="card-header">
                <div className="card-icon">
                  <svg viewBox="0 0 24 24">
                    <rect x="3" y="4" width="18" height="18" rx="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                </div>
                <h3>Blocked Dates</h3>
              </div>
              <div className="card-body">
                <BlockedDatesManager
                  supabase={supabase}
                  blockedDates={blockedDates}
                  showToast={showToast}
                  fetchData={fetchData}
                />
              </div>
            </div>
          </div>

          {/* Right column: Appointments */}
          <AppointmentsTable
            supabase={supabase}
            appointments={appointments}
            showToast={showToast}
            fetchData={fetchData}
          />
        </div>
      </div>
    </ErrorBoundary>
  );
}
