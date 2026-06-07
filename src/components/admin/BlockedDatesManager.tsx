'use client';

import { useState } from 'react';
import type { BlockedDate } from '@/lib/types';
import { formatDate } from '@/lib/utils';
import type { SupabaseClient } from '@supabase/supabase-js';

interface BlockedDatesManagerProps {
  supabase: SupabaseClient;
  blockedDates: BlockedDate[];
  showToast: (message: string, type?: 'success' | 'error' | 'default') => void;
  fetchData: () => Promise<void>;
}

export default function BlockedDatesManager({ supabase, blockedDates, showToast, fetchData }: BlockedDatesManagerProps) {
  const [blockDate, setBlockDate] = useState('');
  const todayStr = new Date().toISOString().split('T')[0];

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

  return (
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
              <button onClick={() => unblockDate(bd.id, bd.date)} title="Unblock" aria-label={`Unblock ${formatDate(bd.date)}`}>×</button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
