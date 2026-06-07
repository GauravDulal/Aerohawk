'use client';

import { ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { ToastProvider } from '@/components/ui/Toast';

export default function AdminLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/admin/login');
    router.refresh();
  };

  const isLoginPage = pathname === '/admin/login';

  if (isLoginPage) {
    return <ToastProvider>{children}</ToastProvider>;
  }

  return (
    <ToastProvider>
      <div style={{ background: 'var(--off-white)', minHeight: '100vh' }}>
        <div className="topbar">
          <Link href="/" className="topbar-brand" style={{ textDecoration: 'none' }}>
            AERO<span>HAWK</span>
            <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-barlow-condensed)', letterSpacing: '3px', marginLeft: '4px' }}>
              ADMIN
            </span>
          </Link>
          <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
            <Link href="/book" className={`tab-btn${pathname === '/book' ? ' active' : ''}`} style={{ textDecoration: 'none' }}>
              📅 Booking
            </Link>
            <Link href="/admin" className={`tab-btn${pathname === '/admin' ? ' active' : ''}`} style={{ textDecoration: 'none' }}>
              ⚙ Dashboard
            </Link>
            <button
              className="tab-btn"
              onClick={handleLogout}
              style={{ marginLeft: '0.5rem' }}
              aria-label="Logout"
            >
              Logout
            </button>
          </div>
        </div>
        {children}
      </div>
    </ToastProvider>
  );
}
