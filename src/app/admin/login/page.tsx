'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function AdminLoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError('');
    setLoading(true);

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (authError) {
      setError('Invalid email or password. Please try again.');
      return;
    }

    router.push('/admin');
    router.refresh();
  };

  return (
    <div style={{ background: 'var(--off-white)', minHeight: '100vh' }}>
      {/* Topbar */}
      <div className="topbar">
        <Link href="/" className="topbar-brand" style={{ textDecoration: 'none' }}>
          AERO<span>HAWK</span>
          <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-barlow-condensed)', letterSpacing: '3px', marginLeft: '4px' }}>
            ADMIN
          </span>
        </Link>
      </div>

      {/* Login Card */}
      <div className="admin-login-wrap">
        <div className="login-card">
          <div className="login-header">
            <h2>AERO<span>HAWK</span></h2>
            <p>Admin Portal — Staff Only</p>
          </div>
          <div className="login-body">
            {error && <div className="login-error">{error}</div>}
            <div className="form-group">
              <label>Email</label>
              <input
                className="form-control"
                type="email"
                placeholder="admin@aerohawkcleaning.com.au"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input
                className="form-control"
                type="password"
                placeholder="Enter admin password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              />
            </div>
            <button className="btn-login" onClick={handleLogin} disabled={loading}>
              {loading ? 'Signing in...' : 'Login to Admin'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
