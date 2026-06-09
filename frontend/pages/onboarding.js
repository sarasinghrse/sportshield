import { useState } from 'react';
import { useRouter } from 'next/router';
import { auth, db } from '../lib/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import toast, { Toaster } from 'react-hot-toast';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function Onboarding() {
  const router = useRouter();
  const [step,        setStep]        = useState(1);
  const [accountType, setAccountType] = useState('');
  const [orgName,     setOrgName]     = useState('');
  const [saving,      setSaving]      = useState(false);
  const [file,        setFile]        = useState(null);
  const [uploading,   setUploading]   = useState(false);

  const saveProfile = async () => {
    if (!accountType || !orgName.trim()) { toast.error('Please fill in all fields.'); return; }
    setSaving(true);
    try {
      const user = auth.currentUser;
      if (!user) { toast.error('Not signed in.'); return; }
      await setDoc(doc(db, 'users', user.uid), {
        orgName:           orgName.trim(),
        accountType,
        email:             user.email,
        createdAt:         serverTimestamp(),
        onboardingComplete: false,
        settings:          { confidenceThreshold: 75 },
      });
      setStep(2);
    } catch (err) {
      console.error('Onboarding save error:', err);
      toast('Profile will be saved later — continuing setup.', { icon: '⚠️' });
      setStep(2);
    } finally { setSaving(false); }
  };

  const uploadAsset = async () => {
    if (!file) { toast.error('Please select a file.'); return; }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(`${API_URL}/api/media/upload`, { method: 'POST', body: fd });
      if (!res.ok) throw new Error();
      const user = auth.currentUser;
      await setDoc(doc(db, 'users', user.uid), { onboardingComplete: true }, { merge: true });
      setStep(3);
      setTimeout(() => router.push('/'), 3000);
    } catch { toast.error('Upload failed. Try again.'); }
    finally { setUploading(false); }
  };

  const skipUpload = async () => {
    try {
      const user = auth.currentUser;
      if (user) await setDoc(doc(db, 'users', user.uid), { onboardingComplete: true }, { merge: true });
    } catch {}
    router.push('/');
  };

  return (
    <div className="ap-root" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: 24 }}>
      <Toaster position="top-right" toastOptions={{ style: { background: '#0d1f10', color: '#fff', border: '1px solid rgba(26,92,26,0.4)' } }} />

      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32 }}>
        <img src="/images/sportshield-logo-transparent.png" alt="SportShield" style={{ height: 36 }} />
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '1.5rem', color: '#5cc85c', letterSpacing: '0.06em' }}>SPORTSHIELD</span>
      </div>

      {/* Step indicators */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 32 }}>
        {[1, 2, 3].map(n => (
          <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.82rem', fontFamily: 'var(--font-display)', fontWeight: 800,
              background: step > n ? '#1a5c1a' : step === n ? '#1a5c1a' : 'rgba(255,255,255,0.06)',
              color: step >= n ? '#fff' : 'rgba(255,255,255,0.25)',
              border: step === n ? '2px solid #4ade80' : '2px solid transparent',
              transition: 'all 0.3s',
            }}>
              {step > n ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              ) : n}
            </div>
            {n < 3 && (
              <div style={{ width: 40, height: 2, borderRadius: 1, background: step > n ? '#1a5c1a' : 'rgba(255,255,255,0.08)', transition: 'background 0.3s' }} />
            )}
          </div>
        ))}
      </div>

      {/* Card */}
      <div className="ap-card" style={{ width: '100%', maxWidth: 520, padding: '36px 32px' }}>

        {/* ── Step 1: Profile ── */}
        {step === 1 && (
          <>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '1.4rem', color: '#fff', marginBottom: 6 }}>
              Welcome to SportShield
            </h2>
            <p className="ap-muted" style={{ marginBottom: 24, fontSize: '0.88rem' }}>
              Tell us about yourself to set up your dashboard.
            </p>

            {/* Account type */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
              {[
                { type: 'club', label: 'Sports Club', desc: 'Team, franchise, or organisation', icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/></svg> },
                { type: 'individual', label: 'Individual', desc: 'Athlete or content creator', icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> },
              ].map(opt => (
                <button key={opt.type} onClick={() => setAccountType(opt.type)}
                  style={{
                    padding: '20px 16px', borderRadius: 12, textAlign: 'left', cursor: 'pointer',
                    background: accountType === opt.type ? 'rgba(26,92,26,0.2)' : 'rgba(255,255,255,0.03)',
                    border: accountType === opt.type ? '2px solid #4ade80' : '2px solid rgba(255,255,255,0.08)',
                    transition: 'all 0.2s',
                  }}>
                  <div style={{ color: accountType === opt.type ? '#4ade80' : 'rgba(255,255,255,0.35)', marginBottom: 10 }}>{opt.icon}</div>
                  <p style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '0.92rem', color: '#fff', marginBottom: 4 }}>{opt.label}</p>
                  <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.38)' }}>{opt.desc}</p>
                </button>
              ))}
            </div>

            {/* Name input */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: '0.72rem', color: 'rgba(255,255,255,0.42)', fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', marginBottom: 8 }}>
                {accountType === 'individual' ? 'Your name' : 'Organisation name'}
              </label>
              <input type="text" value={orgName} onChange={e => setOrgName(e.target.value)}
                placeholder={accountType === 'individual' ? 'e.g. Priya Sharma' : 'e.g. Mumbai Cricket Club'}
                className="ap-input" />
            </div>

            <button onClick={saveProfile} disabled={!accountType || !orgName.trim() || saving}
              className="ap-btn ap-btn-green"
              style={{ width: '100%', justifyContent: 'center', padding: '14px', fontSize: '0.95rem' }}>
              {saving ? 'Saving…' : 'Continue →'}
            </button>
          </>
        )}

        {/* ── Step 2: Upload ── */}
        {step === 2 && (
          <>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '1.4rem', color: '#fff', marginBottom: 6 }}>
              Upload your first asset
            </h2>
            <p className="ap-muted" style={{ marginBottom: 24, fontSize: '0.88rem' }}>
              Add an image or video to protect. We&apos;ll scan the web for unauthorized copies.
            </p>

            <div onClick={() => document.getElementById('ob-file')?.click()}
              className="ap-dropzone"
              style={{ marginBottom: 24, cursor: 'pointer' }}>
              <input id="ob-file" type="file" style={{ display: 'none' }} accept="image/*,video/*"
                onChange={e => setFile(e.target.files?.[0])} />
              {file ? (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ marginBottom: 10, display: 'flex', justifyContent: 'center' }}>
                    <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                  </div>
                  <p style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '0.95rem', color: '#fff', marginBottom: 4 }}>{file.name}</p>
                  <p className="ap-muted" style={{ fontSize: '0.78rem' }}>{(file.size / 1024 / 1024).toFixed(1)} MB</p>
                </div>
              ) : (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ marginBottom: 10, display: 'flex', justifyContent: 'center' }}>
                    <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="rgba(74,222,128,0.5)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                  </div>
                  <p style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '0.95rem', color: '#fff', marginBottom: 4 }}>Click to select a file</p>
                  <p className="ap-muted" style={{ fontSize: '0.78rem' }}>Images or videos · Max 50 MB</p>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={skipUpload}
                className="ap-btn ap-btn-ghost"
                style={{ flex: 1, justifyContent: 'center', padding: '13px' }}>
                Skip for now
              </button>
              <button onClick={uploadAsset} disabled={!file || uploading}
                className="ap-btn ap-btn-green"
                style={{ flex: 1, justifyContent: 'center', padding: '13px' }}>
                {uploading ? 'Uploading…' : 'Upload & Scan'}
              </button>
            </div>
          </>
        )}

        {/* ── Step 3: Done ── */}
        {step === 3 && (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'center' }}>
              <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>
            </div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '1.5rem', color: '#fff', marginBottom: 8 }}>
              You&apos;re protected!
            </h2>
            <p className="ap-muted" style={{ marginBottom: 6 }}>Your asset is fingerprinted and a scan is running.</p>
            <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.25)' }}>Taking you to your dashboard…</p>
          </div>
        )}
      </div>
    </div>
  );
}
