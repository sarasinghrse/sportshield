import { useState } from 'react';
import Link from 'next/link';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

export default function VerifyPage() {
  const [url,     setUrl]     = useState('');
  const [result,  setResult]  = useState(null);
  const [match,   setMatch]   = useState(null);
  const [loading, setLoading] = useState(false);

  const handleCheck = async () => {
    const trimmed = url.trim();
    if (!trimmed) return;
    setLoading(true); setResult(null); setMatch(null);
    try {
      const q    = query(collection(db, 'alerts'), where('foundUrl', '==', trimmed));
      const snap = await getDocs(q);
      if (snap.empty) { setResult('clean'); }
      else            { setResult('flagged'); setMatch({ id: snap.docs[0].id, ...snap.docs[0].data() }); }
    } catch { setResult('error'); }
    finally { setLoading(false); }
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
          <span className="ap-page-tag" style={{ marginLeft: 4 }}>/ Verify URL</span>
        </div>
        <div className="ap-nav-right">
          <Link href="/" className="ap-nav-link">Dashboard →</Link>
        </div>
      </nav>

      {/* Main */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
        <div style={{ width: '100%', maxWidth: 560 }}>

          {/* Hero */}
          <div style={{ textAlign: 'center', marginBottom: 36 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 72, height: 72, borderRadius: '50%', background: 'rgba(26,92,26,0.2)', border: '1px solid rgba(26,92,26,0.4)', fontSize: '2rem', marginBottom: 20 }}>
              🔍
            </div>
            <h1 className="ap-heading" style={{ marginBottom: 10 }}>Verify a URL</h1>
            <p className="ap-muted">
              Check if a URL has been flagged as containing unauthorized sports media in the SportShield database.
            </p>
          </div>

          {/* Search */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
            <input
              type="url" value={url}
              onChange={e => setUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCheck()}
              placeholder="https://example.com/sports-content"
              className="ap-input"
              style={{ flex: 1 }}
            />
            <button
              onClick={handleCheck}
              disabled={loading || !url.trim()}
              className="ap-btn ap-btn-green"
              style={{ flexShrink: 0 }}
            >
              {loading ? (
                <span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />
              ) : 'Check'}
            </button>
          </div>

          {/* Results */}
          {result === 'clean' && (
            <div className="ap-card" style={{ padding: '28px 24px', textAlign: 'center', border: '1px solid rgba(74,222,128,0.25)', background: 'rgba(74,222,128,0.05)' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>✅</div>
              <p style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '1.3rem', color: '#4ade80', marginBottom: 8 }}>
                Not Flagged
              </p>
              <p className="ap-muted">This URL is not in our database of unauthorized media uses.</p>
            </div>
          )}

          {result === 'flagged' && match && (
            <div className="ap-card" style={{ padding: '28px 24px', border: '1px solid rgba(239,68,68,0.28)', background: 'rgba(239,68,68,0.05)' }}>
              <div style={{ textAlign: 'center', marginBottom: 18 }}>
                <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🚨</div>
                <p style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '1.3rem', color: '#f87171', marginBottom: 8 }}>
                  Flagged as Unauthorized
                </p>
                <p className="ap-muted">
                  This URL has been flagged in the SportShield database as containing unauthorized sports media.
                </p>
              </div>
              <div style={{ background: 'rgba(12,24,14,0.7)', borderRadius: 10, padding: '14px 18px' }}>
                {[
                  { label: 'Confidence', value: `${Math.round((match.confidence || 0) * 100)}%`, color: '#f87171' },
                  { label: 'Severity',   value: match.severity || 'unknown',                      color: '#fff' },
                ].map(row => (
                  <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <span style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.42)' }}>{row.label}</span>
                    <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '0.9rem', color: row.color, textTransform: 'capitalize' }}>{row.value}</span>
                  </div>
                ))}
              </div>
              <p style={{ textAlign: 'center', fontSize: '0.75rem', color: 'rgba(255,255,255,0.28)', marginTop: 16 }}>
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

          {!result && (
            <p style={{ textAlign: 'center', fontSize: '0.78rem', color: 'rgba(255,255,255,0.28)', marginTop: 16 }}>
              This tool checks against publicly tracked violations only.<br />
              No personal data is logged from this lookup.
            </p>
          )}
        </div>
      </main>

      <footer style={{ textAlign: 'center', padding: '16px', fontSize: '0.75rem', color: 'rgba(255,255,255,0.2)', borderTop: '1px solid rgba(26,92,26,0.15)' }}>
        SportShield — Google Solutions Challenge 2026
      </footer>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
