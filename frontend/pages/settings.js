import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { auth, db } from '../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useAuth } from '../lib/useAuth';
import toast, { Toaster } from 'react-hot-toast';

export default function SettingsPage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const [orgName,   setOrgName]   = useState('');
  const [threshold, setThreshold] = useState(75);
  const [saving,    setSaving]    = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading, router]);

  useEffect(() => {
    if (profile) {
      setOrgName(profile.orgName || '');
      setThreshold(profile.settings?.confidenceThreshold ?? 75);
    }
  }, [profile]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(
        doc(db, 'users', user.uid),
        { orgName, settings: { confidenceThreshold: threshold } },
        { merge: true }
      );
      toast.success('Settings saved!');
    } catch {
      toast.error('Failed to save.');
    } finally { setSaving(false); }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    router.push('/login');
  };

  if (loading) return (
    <div className="ap-root" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p className="ap-muted">Loading…</p>
    </div>
  );

  return (
    <div className="ap-root">
      <Toaster position="top-right" toastOptions={{ style: { background: '#0d1f10', color: '#fff', border: '1px solid rgba(26,92,26,0.4)' } }} />

      <nav className="ap-nav">
        <div className="ap-nav-left">
          <Link href="/" className="ap-back">← Dashboard</Link>
          <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.1)' }} />
          <Link href="/" className="ap-logo">
            <img src="/images/sportshield-logo-transparent.png" alt="SportShield" />
            <span className="ap-logo-text">SPORTSHIELD</span>
          </Link>
          <span className="ap-page-tag" style={{ marginLeft: 4 }}>/ Settings</span>
        </div>
      </nav>

      <main style={{ maxWidth: 640, margin: '0 auto', padding: '32px 24px' }}>
        <h1 className="ap-heading" style={{ marginBottom: 28 }}>Settings</h1>

        {/* Profile */}
        <div className="ap-card" style={{ padding: '24px 28px', marginBottom: 18 }}>
          <p className="ap-section-title" style={{ marginBottom: 20 }}>Profile</p>
          <div style={{ marginBottom: 18 }}>
            <label style={{ display: 'block', fontSize: '0.72rem', color: 'rgba(255,255,255,0.42)', fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', marginBottom: 8 }}>
              Organisation / Name
            </label>
            <input type="text" value={orgName} onChange={e => setOrgName(e.target.value)}
              className="ap-input" placeholder="Your team or name" />
          </div>
          <div style={{ marginBottom: 18 }}>
            <label style={{ display: 'block', fontSize: '0.72rem', color: 'rgba(255,255,255,0.42)', fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', marginBottom: 8 }}>
              Email
            </label>
            <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.9rem', padding: '8px 0' }}>{user?.email}</p>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', color: 'rgba(255,255,255,0.42)', fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', marginBottom: 8 }}>
              Account Type
            </label>
            <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.9rem', padding: '8px 0', textTransform: 'capitalize' }}>
              {profile?.accountType || '—'}
            </p>
          </div>
        </div>

        {/* Detection sensitivity */}
        <div className="ap-card" style={{ padding: '24px 28px', marginBottom: 24 }}>
          <p className="ap-section-title" style={{ marginBottom: 6 }}>Detection Sensitivity</p>
          <p className="ap-muted" style={{ marginBottom: 22 }}>
            Only flag matches above this confidence level. Lower = more alerts. Higher = fewer but more certain.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
            <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.38)', minWidth: 32 }}>50%</span>
            <input type="range" min="50" max="99" value={threshold}
              onChange={e => setThreshold(Number(e.target.value))}
              style={{ flex: 1, accentColor: '#4ade80' }} />
            <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.38)', minWidth: 32 }}>99%</span>
          </div>
          <div style={{ textAlign: 'center' }}>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '2.8rem', color: '#4ade80' }}>
              {threshold}%
            </span>
            <p className="ap-muted" style={{ fontSize: '0.75rem', marginTop: 4 }}>Current threshold</p>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={handleSave} disabled={saving}
            className="ap-btn ap-btn-green" style={{ flex: 1, justifyContent: 'center' }}>
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
          <button onClick={handleSignOut}
            className="ap-btn ap-btn-ghost" style={{ padding: '10px 22px' }}>
            Sign Out
          </button>
        </div>
      </main>
    </div>
  );
}
