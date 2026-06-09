// components/ProfileAvatar.jsx
// Profile icon in app-page nav bar. Photo or initials → dropdown with
// Settings, Community Dashboard, Logout.

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useAuth } from '../lib/useAuth';

export default function ProfileAvatar() {
  const { user, profile } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = async () => {
    setOpen(false);
    await signOut(auth);
    router.push('/landing');
  };

  const displayName = profile?.displayName || user?.displayName || user?.email?.split('@')[0] || 'User';
  const initials = displayName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  const photoUrl = profile?.profilePic || null;

  const triggerStyle = {
    width: 36, height: 36, borderRadius: '50%',
    border: '2px solid rgba(74,222,128,0.4)',
    background: 'rgba(26,92,26,0.3)',
    cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden', padding: 0, flexShrink: 0,
    transition: 'border-color 0.2s, transform 0.2s',
  };

  const photoStyle = {
    width: '100%', height: '100%', objectFit: 'cover', display: 'block',
  };

  const initialsStyle = {
    fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '0.8rem',
    color: '#4ade80', letterSpacing: '0.04em',
  };

  const dropdownStyle = {
    position: 'absolute', top: 'calc(100% + 8px)', right: 0,
    minWidth: 240, padding: 10,
    background: '#0d1f10',
    border: '1px solid rgba(74,222,128,0.18)',
    borderRadius: 12,
    boxShadow: '0 12px 32px rgba(0,0,0,0.5)',
    zIndex: 100,
    display: 'flex', flexDirection: 'column', gap: 2,
  };

  const itemStyle = {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '9px 12px', borderRadius: 8,
    color: 'rgba(255,255,255,0.8)',
    fontSize: '0.85rem', fontWeight: 500,
    textDecoration: 'none', cursor: 'pointer',
    background: 'none', border: 'none', textAlign: 'left',
    transition: 'background 0.15s',
  };

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setOpen(o => !o)}
        aria-label="Profile menu"
        title={displayName}
        style={triggerStyle}
        onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(74,222,128,0.7)'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(74,222,128,0.4)'; }}
      >
        {photoUrl ? (
          <img src={photoUrl} alt={displayName} style={photoStyle} />
        ) : (
          <span style={initialsStyle}>{initials}</span>
        )}
      </button>

      {open && (
        <div style={dropdownStyle}>
          {/* Identity */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px 12px' }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', overflow: 'hidden', background: 'rgba(26,92,26,0.3)', border: '1px solid rgba(74,222,128,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {photoUrl ? (
                <img src={photoUrl} alt={displayName} style={photoStyle} />
              ) : (
                <span style={initialsStyle}>{initials}</span>
              )}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.88rem', color: '#fff', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {displayName}
              </p>
              <p style={{ fontSize: '0.74rem', color: 'rgba(255,255,255,0.45)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.email}
              </p>
            </div>
          </div>

          <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '4px 0' }} />

          <Link href="/settings" style={itemStyle} onClick={() => setOpen(false)}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(74,222,128,0.08)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}>
            <SettingsIcon />
            Settings
          </Link>
          <Link href="/public-dashboard" style={itemStyle} onClick={() => setOpen(false)}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(74,222,128,0.08)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}>
            <CommunityIcon />
            Community Dashboard
          </Link>

          <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '4px 0' }} />

          <button onClick={handleLogout} style={{ ...itemStyle, color: 'rgba(248,113,113,0.85)' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(248,113,113,0.08)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}>
            <LogoutIcon />
            Log out
          </button>
        </div>
      )}
    </div>
  );
}

const SettingsIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
  </svg>
);

const CommunityIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);

const LogoutIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
    <polyline points="16 17 21 12 16 7"/>
    <line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
);
