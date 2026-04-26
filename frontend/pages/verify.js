import { useState } from 'react';
import Link from 'next/link';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function VerifyPage() {
  const [url,         setUrl]         = useState('');
  const [result,      setResult]      = useState(null);
  const [match,       setMatch]       = useState(null);
  const [loading,     setLoading]     = useState(false);
  const [reporting,   setReporting]   = useState(false);
  const [reported,    setReported]    = useState(false);

  const handleCheck = async () => {
    const trimmed = url.trim();
    if (!trimmed) return;
    setLoading(true); setResult(null); setMatch(null); setReported(false);
    try {
      const q    = query(collection(db, 'alerts'), where('foundUrl', '==', trimmed));
      const snap = await getDocs(q);
      if (snap.empty) { setResult('clean'); }
      else            { setResult('flagged'); setMatch({ id: snap.docs[0].id, ...snap.docs[0].data() }); }
    } catch { setResult('error'); }
    finally { setLoading(false); }
  };

  const handleReportOwner = async () => {
    if (!match || reporting) return;
    setReporting(true);
    try {
      const res = await fetch(`${API_URL}/api/contact/report-owner`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url:        url.trim(),
          confidence: match.confidence || 0,
          asset_name: 'Sports media asset',
        }),
      });
      const data = await res.json();
      setReported(data.ok);
    } catch { setReported(false); }
    finally { setReporting(false); }
  };

  return (
    <div className="ap-root" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>

      {/* Nav */}
      <nav className="ap-nav">
        <div className="ap-nav-left">
          <Link href="/" className="ap-logo">
            <img src="/images/sportshield-logo-transparent.png" alt="SportShield" />
            <span className="ap-logo-text">SPORTSHIELD</span>
          </Link>
          <span className="ap-page-tag">/ Verify URL</span>
        </div>
        <div className="ap-nav-right">
          <Link href="/public-dashboard" className="ap-nav-link">Community</Link>
          <Link href="/" className="ap-nav-link">Dashboard →</Link>
        </div>
      </nav>

      {/* Main */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '56px 24px 40px' }}>
        <div style={{ width: '100%', maxWidth: 580 }}>

          {/* Hero */}
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 80, height: 80, borderRadius: '50%', background: 'rgba(26,92,26,0.2)', border: '1px solid rgba(26,92,26,0.5)', fontSize: '2.2rem', marginBottom: 22 }}>
                          </div>
            <h1 className="ap-heading" style={{ marginBottom: 12, fontSize: 'clamp(1.8rem,5vw,2.6rem)' }}>Verify a URL</h1>
            <p className="ap-muted" style={{ maxWidth: 440, margin: '0 auto', fontSize: '0.95rem', lineHeight: 1.75 }}>
              Check if any web URL has been flagged in the SportShield database as containing unauthorized sports media.
              No account required.
            </p>
          </div>

          {/* ── Search box ── PROMINENT ── */}
          <div style={{ background: 'rgba(12,24,14,0.9)', border: '1px solid rgba(26,92,26,0.4)', borderRadius: 16, padding: '24px 24px 20px', marginBottom: 28, boxShadow: '0 4px 32px rgba(26,92,26,0.2)' }}>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>
              Paste the URL to check
            </label>
            <input
              type="url" value={url}
              onChange={e => setUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !loading && handleCheck()}
              placeholder="https://example.com/sports-content"
              className="ap-input"
              style={{ marginBottom: 14, fontSize: '1rem' }}
            />
            <button
              onClick={handleCheck}
              disabled={loading || !url.trim()}
              className="ap-btn ap-btn-green"
              style={{
                width: '100%',
                justifyContent: 'center',
                padding: '15px',
                fontSize: '1rem',
                letterSpacing: '0.06em',
                boxShadow: '0 4px 24px rgba(26,92,26,0.5)',
              }}
            >
              {loading ? (
                <>
                  <span style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />
                  Checking…
                </>
              ) : (
                <>Check This URL</>
              )}
            </button>
          </div>

          {/* Results */}
          {result === 'clean' && (
            <div className="ap-card" style={{ padding: '32px 28px', textAlign: 'center', border: '1px solid rgba(74,222,128,0.25)', background: 'rgba(74,222,128,0.05)' }}>
              <div style={{ marginBottom: 14, display:"flex", justifyContent:"center" }}><svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></div>
              <p style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '1.4rem', color: '#4ade80', marginBottom: 10 }}>Not Flagged</p>
              <p className="ap-muted">This URL is not in our database of unauthorized media uses.</p>
              <p className="ap-muted" style={{ marginTop: 8, fontSize: '0.78rem' }}>
                This checks only media SportShield users have uploaded. It's not a guarantee the content is licensed.
              </p>
            </div>
          )}

          {result === 'flagged' && match && (
            <div className="ap-card" style={{ padding: '28px 24px', border: '1px solid rgba(239,68,68,0.35)', background: 'rgba(239,68,68,0.05)' }}>
              {/* Header */}
              <div style={{ textAlign: 'center', marginBottom: 22 }}>
                <div style={{ marginBottom: 12, display:"flex", justifyContent:"center" }}><svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></div>
                <p style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '1.4rem', color: '#f87171', marginBottom: 8 }}>
                  Flagged as Unauthorized
                </p>
                <p className="ap-muted" style={{ maxWidth: 380, margin: '0 auto' }}>
                  This URL has been flagged in the SportShield database as containing unauthorized sports media.
                </p>
              </div>

              {/* Details */}
              <div style={{ background: 'rgba(12,24,14,0.7)', borderRadius: 10, padding: '14px 18px', marginBottom: 20 }}>
                {[
                  { label: 'Confidence', value: `${Math.round((match.confidence || 0) * 100)}%`, color: '#f87171' },
                  { label: 'Severity',   value: match.severity || 'unknown',                      color: '#fff'    },
                ].map(row => (
                  <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <span style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.42)' }}>{row.label}</span>
                    <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '0.92rem', color: row.color, textTransform: 'capitalize' }}>{row.value}</span>
                  </div>
                ))}
              </div>

              {/* Report button */}
              {!reported ? (
                <button onClick={handleReportOwner} disabled={reporting}
                  style={{
                    width: '100%', padding: '13px', borderRadius: 10,
                    border: '1px solid rgba(239,68,68,0.4)',
                    background: reporting ? 'rgba(239,68,68,0.1)' : 'rgba(239,68,68,0.15)',
                    color: '#f87171', fontFamily: 'var(--font-display)', fontWeight: 800,
                    fontSize: '0.88rem', letterSpacing: '0.06em', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    marginBottom: 12, transition: 'background 0.2s',
                  }}>
                  {reporting ? 'Sending notice…' : 'Alert Site Owner (Auto DMCA)'}
                </button>
              ) : (
                <div style={{ width: '100%', padding: '13px', borderRadius: 10, background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.25)', textAlign: 'center', marginBottom: 12 }}>
                  <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.88rem', color: '#4ade80' }}>
                    DMCA notice sent to site owner
                  </p>
                </div>
              )}

              <p style={{ textAlign: 'center', fontSize: '0.75rem', color: 'rgba(255,255,255,0.28)', marginTop: 8 }}>
                If you believe this is incorrect, contact the rights holder directly.
              </p>
            </div>
          )}

          {result === 'error' && (
            <div className="ap-card" style={{ padding: '24px', textAlign: 'center', border: '1px solid rgba(245,158,11,0.25)', background: 'rgba(245,158,11,0.05)' }}>
              <p style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.1rem', color: '#fbbf24', marginBottom: 6 }}>Check Failed</p>
              <p className="ap-muted">Could not query the database. Please try again.</p>
            </div>
          )}

          {!result && !loading && (
            <p style={{ textAlign: 'center', fontSize: '0.78rem', color: 'rgba(255,255,255,0.28)', marginTop: 4 }}>
              Checks against publicly tracked violations only · No personal data logged
            </p>
          )}

          {/* Use cases */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 12, marginTop: 36 }}>
            {[
              { icon: null, title: 'Rights holders', desc: 'Check if your content is being used without permission anywhere on the web.' },
              { icon: null, title: 'Journalists',    desc: 'Verify an image\'s legitimacy before publishing in your article or report.' },
              { icon: null, title: 'Sports clubs',   desc: 'Monitor if your official photography is being reused on unofficial sites.' },
            ].map(u => (
              <div key={u.title} className="ap-card" style={{ padding: '18px 16px' }}>
                <div style={{ fontSize: '1.4rem', marginBottom: 8 }}>{u.icon}</div>
                <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.88rem', color: '#fff', marginBottom: 6 }}>{u.title}</p>
                <p className="ap-muted" style={{ fontSize: '0.78rem', lineHeight: 1.6 }}>{u.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      <footer style={{ textAlign: 'center', padding: '16px', fontSize: '0.75rem', color: 'rgba(255,255,255,0.2)', borderTop: '1px solid rgba(26,92,26,0.15)' }}>
        SportShield — Google Solutions Challenge 2026
      </footer>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
