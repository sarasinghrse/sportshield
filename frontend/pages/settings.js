import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { auth, db } from '../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useAuth } from '../lib/useAuth';
import ProfileAvatar from '../components/ProfileAvatar';
import toast, { Toaster } from 'react-hot-toast';

/* ── helpers ───────────────────────────────────────────────────── */
function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <label style={{
        display: 'block', fontSize: '0.72rem', color: 'rgba(255,255,255,0.42)',
        fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', marginBottom: 8,
      }}>
        {label}
      </label>
      {children}
    </div>
  );
}

/* Compress + convert image file to small base64 for Firestore storage */
function compressImage(file, maxPx = 160) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ratio = Math.min(maxPx / img.width, maxPx / img.height, 1);
        canvas.width  = Math.round(img.width  * ratio);
        canvas.height = Math.round(img.height * ratio);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

/* ── page ───────────────────────────────────────────────────────── */
export default function SettingsPage() {
  const { user, profile, loading } = useAuth();
  const router   = useRouter();
  const fileRef  = useRef(null);

  const [displayName,   setDisplayName]   = useState('');
  const [gender,        setGender]        = useState('');
  const [phone,         setPhone]         = useState('');
  const [emailUpdates,  setEmailUpdates]  = useState(false);
  const [threshold,     setThreshold]     = useState(75);
  const [profilePic,    setProfilePic]    = useState(null);
  const [saving,        setSaving]        = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading, router]);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName || '');
      setGender(profile.gender || '');
      setPhone(profile.phone || '');
      setEmailUpdates(profile.emailUpdates ?? false);
      setThreshold(profile.settings?.confidenceThreshold ?? 75);
      setProfilePic(profile.profilePic || null);
    }
  }, [profile]);

  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const b64 = await compressImage(file, 160);
      setProfilePic(b64);
    } catch {
      toast.error('Could not process image.');
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await setDoc(
        doc(db, 'users', user.uid),
        {
          displayName,
          gender,
          phone,
          emailUpdates,
          profilePic: profilePic || null,
          settings: { confidenceThreshold: threshold },
        },
        { merge: true }
      );
      toast.success('Profile saved!');
    } catch (err) {
      toast.error('Save failed — ' + err.message);
    } finally { setSaving(false); }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    router.push('/landing');
  };

  if (loading) return (
    <div className="ap-root" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p className="ap-muted">Loading…</p>
    </div>
  );

  return (
    <div className="ap-root">
      <Toaster position="top-right" toastOptions={{
        style: { background: '#0d1f10', color: '#fff', border: '1px solid rgba(26,92,26,0.4)' },
      }} />

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
        <div className="ap-nav-right">
          <ProfileAvatar />
        </div>
      </nav>

      <main style={{ maxWidth: 660, margin: '0 auto', padding: '32px 24px' }}>
        <h1 className="ap-heading" style={{ marginBottom: 28 }}>Settings</h1>

        {/* Profile Photo */}
        <div className="ap-card" style={{ padding: '24px 28px', marginBottom: 18 }}>
          <p className="ap-section-title" style={{ marginBottom: 20 }}>Profile Photo</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <div
              onClick={() => fileRef.current?.click()}
              style={{
                width: 80, height: 80, borderRadius: '50%', overflow: 'hidden',
                border: '2px solid rgba(74,222,128,0.5)', cursor: 'pointer',
                background: 'rgba(26,92,26,0.3)', display: 'flex', alignItems: 'center',
                justifyContent: 'center', flexShrink: 0,
              }}
              title="Click to change photo"
            >
              {profilePic ? (
                <img src={profilePic} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="rgba(74,222,128,0.6)" strokeWidth="1.5">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
              )}
            </div>
            <div>
              <button
                onClick={() => fileRef.current?.click()}
                className="ap-btn ap-btn-ghost"
                style={{ fontSize: '0.82rem', padding: '8px 18px', marginBottom: 6 }}
              >
                Upload Photo
              </button>
              <p className="ap-muted" style={{ fontSize: '0.72rem' }}>
                JPG or PNG · compressed to thumbnail size
              </p>
              <input ref={fileRef} type="file" accept="image/*"
                style={{ display: 'none' }} onChange={handlePhotoChange} />
            </div>
          </div>
        </div>

        {/* Personal Details */}
        <div className="ap-card" style={{ padding: '24px 28px', marginBottom: 18 }}>
          <p className="ap-section-title" style={{ marginBottom: 20 }}>Personal Details</p>

          <Field label="Full Name">
            <input type="text" value={displayName} onChange={e => setDisplayName(e.target.value)}
              className="ap-input" placeholder="Your full name" />
          </Field>

          <Field label="Email Address">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input type="email" value={user?.email || ''} readOnly
                className="ap-input" style={{ opacity: 0.55, cursor: 'not-allowed', flex: 1 }} />
              <span style={{ fontSize: '0.72rem', color: 'rgba(74,222,128,0.7)', whiteSpace: 'nowrap' }}>
                via Firebase Auth
              </span>
            </div>
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Field label="Gender">
              <select value={gender} onChange={e => setGender(e.target.value)}
                className="ap-input" style={{ cursor: 'pointer' }}>
                <option value="">Prefer not to say</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="nonbinary">Non-binary</option>
                <option value="other">Other</option>
              </select>
            </Field>

            <Field label="Phone Number">
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                className="ap-input" placeholder="+91 98765 43210" />
            </Field>
          </div>
        </div>

        {/* Notifications */}
        <div className="ap-card" style={{ padding: '24px 28px', marginBottom: 18 }}>
          <p className="ap-section-title" style={{ marginBottom: 20 }}>Notifications</p>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div>
              <p style={{ color: 'rgba(255,255,255,0.82)', fontWeight: 600, fontSize: '0.88rem', marginBottom: 3 }}>
                Email Updates
              </p>
              <p className="ap-muted" style={{ fontSize: '0.76rem' }}>
                Receive match alerts and scan summaries directly in your inbox
              </p>
            </div>
            <button
              onClick={() => setEmailUpdates(v => !v)}
              style={{
                width: 48, height: 26, borderRadius: 13, border: 'none',
                background: emailUpdates ? '#4ade80' : 'rgba(255,255,255,0.15)',
                position: 'relative', cursor: 'pointer', transition: 'background 0.2s', flexShrink: 0,
              }}
              aria-label="Toggle email updates"
            >
              <span style={{
                position: 'absolute', top: 3,
                left: emailUpdates ? 25 : 3,
                width: 20, height: 20, borderRadius: '50%',
                background: emailUpdates ? '#0a1210' : 'rgba(255,255,255,0.6)',
                transition: 'left 0.2s', display: 'block',
              }} />
            </button>
          </div>

          {emailUpdates && (
            <div style={{
              background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.2)',
              borderRadius: 8, padding: '10px 14px',
            }}>
              <p style={{ fontSize: '0.78rem', color: 'rgba(74,222,128,0.85)' }}>
                Alerts will be sent to <strong>{user?.email}</strong>
              </p>
            </div>
          )}
        </div>

        {/* Detection Sensitivity */}
        <div className="ap-card" style={{ padding: '24px 28px', marginBottom: 24 }}>
          <p className="ap-section-title" style={{ marginBottom: 6 }}>Detection Sensitivity</p>
          <p className="ap-muted" style={{ marginBottom: 22, fontSize: '0.8rem' }}>
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
            className="ap-btn ap-btn-ghost"
            style={{ padding: '10px 22px', color: 'rgba(248,113,113,0.8)', borderColor: 'rgba(248,113,113,0.2)' }}>
            Log Out
          </button>
        </div>
      </main>
    </div>
  );
}
