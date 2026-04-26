// components/ProfileAvatar.jsx
// Profile icon that lives in every app-page nav bar.
// Shows user's photo (or initials fallback), clicking opens a dropdown
// with links to Settings, Community Dashboard, and Logout.

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

  // Close on outside click
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

  return (
    <div className="pav-root" ref={ref}>
      {/* Avatar trigger button */}
      <button
        className="pav-trigger"
        onClick={() => setOpen(o => !o)}
        aria-label="Profile menu"
        title={displayName}
      >
        {photoUrl ? (
          <img src={photoUrl} alt={displayName} className="pav-photo" />
        ) : (
          <span className="pav-initials">{initials}</span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="pav-dropdown">
          {/* User identity */}
          <div className="pav-identity">
            <div className="pav-identity-avatar">
              {photoUrl ? (
                <img src={photoUrl} alt={displayName} className="pav-photo" />
              ) : (
                <span className="pav-initials">{initials}</span>
              )}
            </div>
            <div>
              <p className="pav-name">{displayName}</p>
              <p className="pav-email">{user?.email}</p>
            </div>
          </div>

          <div className="pav-divider" />

          {/* Navigation links */}
          <Link href="/settings" className="pav-item" onClick={() => setOpen(false)}>
            <SettingsIcon />
            Settings
          </Link>
          <Link href="/public-dashboard" className="pav-item" onClick={() => setOpen(false)}>
            <CommunityIcon />
            Community Dashboard
          </Link>

          <div className="pav-divider" />

          <button className="pav-item pav-logout" onClick={handleLogout}>
            <LogoutIcon />
            Log out
          </button>
        </div>
      )}
    </div>
  );
}

/* ── inline SVG icons ── */
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
