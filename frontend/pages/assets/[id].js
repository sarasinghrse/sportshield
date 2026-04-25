import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { db, subscribeToScanResults, setAssetVisibility } from '../../lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import toast, { Toaster } from 'react-hot-toast';

export default function AssetDetail() {
  const router = useRouter();
  const { id } = router.query;
  const [asset,       setAsset]       = useState(null);
  const [scanResults, setScanResults] = useState([]);
  const [loading,     setLoading]     = useState(true);

  useEffect(() => {
    if (!id) return;
    const unsub = onSnapshot(doc(db, 'assets', id), snap => {
      if (snap.exists()) setAsset({ id: snap.id, ...snap.data() });
      setLoading(false);
    });
    return () => unsub();
  }, [id]);

  useEffect(() => {
    if (!id) return;
    const unsub = subscribeToScanResults(id, setScanResults);
    return () => unsub();
  }, [id]);

  const toggleVisibility = async () => {
    if (!asset) return;
    const next = asset.isPublic === false ? true : false;
    try {
      await setAssetVisibility(id, next);
      toast.success(next ? 'Visible on Community Dashboard' : 'Set to Private');
    } catch { toast.error('Failed to update visibility'); }
  };

  const badgeMap = {
    pending:  { label: 'Pending',  cls: 'ap-badge-pending'  },
    scanning: { label: 'Scanning', cls: 'ap-badge-scanning' },
    complete: { label: 'Complete', cls: 'ap-badge-complete' },
    error:    { label: 'Error',    cls: 'ap-badge-error'    },
  };

  if (loading) return (
    <div className="ap-root" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p className="ap-muted">Loading…</p>
    </div>
  );

  if (!asset) return (
    <div className="ap-root" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
      <p className="ap-muted">Asset not found.</p>
      <Link href="/" className="ap-back">← Back to Dashboard</Link>
    </div>
  );

  const { label, cls } = badgeMap[asset.status] || badgeMap.pending;
  const uploadedAt = asset.uploadedAt?.toDate?.() || new Date();
  const isPublic   = asset.isPublic !== false; // default true for legacy assets

  return (
    <div className="ap-root">
      <Toaster position="top-right" toastOptions={{ style: { background: '#0d1f10', color: '#fff', border: '1px solid rgba(26,92,26,0.4)' } }} />

      {/* Nav */}
      <nav className="ap-nav">
        <div className="ap-nav-left">
          <Link href="/" className="ap-back">← Dashboard</Link>
          <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.1)' }} />
          <Link href="/" className="ap-logo">
            <img src="/images/sportshield-logo-transparent.png" alt="SportShield" />
            <span className="ap-logo-text">SPORTSHIELD</span>
          </Link>
          <span className="ap-page-tag" style={{ marginLeft: 4 }}>/ Asset</span>
        </div>
      </nav>

      <main style={{ maxWidth: 860, margin: '0 auto', padding: '32px 24px' }}>

        {/* Asset header card */}
        <div className="ap-card" style={{ padding: '24px 28px', marginBottom: 20, display: 'flex', alignItems: 'flex-start', gap: 20 }}>
          {asset.originalUrl ? (
            <img src={asset.originalUrl} alt={asset.filename}
              style={{ width: 88, height: 88, borderRadius: 12, objectFit: 'cover', background: 'rgba(26,92,26,0.2)', flexShrink: 0 }} />
          ) : (
            <div style={{ width: 88, height: 88, borderRadius: 12, background: 'rgba(26,92,26,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', flexShrink: 0 }}>
              {asset.type === 'video' ? '🎬' : '🖼️'}
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '1.5rem', color: '#fff', marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {asset.filename || 'Unnamed Asset'}
            </h1>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginBottom: 14, fontSize: '0.82rem', color: 'rgba(255,255,255,0.45)' }}>
              <span style={{ textTransform: 'capitalize' }}>{asset.type || 'image'}</span>
              <span>·</span>
              <span>Uploaded {formatDistanceToNow(uploadedAt, { addSuffix: true })}</span>
              <span>·</span>
              <span>{asset.scanCount || 0} scan{asset.scanCount !== 1 ? 's' : ''}</span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
              <span className={`ap-badge ${cls}`}>
                {asset.status === 'scanning' && (
                  <span style={{ width: 6, height: 6, background: '#34d399', borderRadius: '50%', display: 'inline-block' }} />
                )}
                {label}
              </span>
              {(asset.matchCount || 0) > 0 && (
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '0.8rem', color: '#f87171' }}>
                  ⚠ {asset.matchCount} match{asset.matchCount !== 1 ? 'es' : ''} found
                </span>
              )}
              <Link href={`/certificate/${id}`}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.78rem', color: '#fbbf24', textDecoration: 'none', border: '1px solid rgba(251,191,36,0.28)', borderRadius: 20, padding: '3px 10px', transition: 'border-color 0.2s' }}>
                🏅 Certificate
              </Link>
              {/* Visibility toggle */}
              <button onClick={toggleVisibility} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.78rem', color: isPublic ? '#4ade80' : 'rgba(255,255,255,0.4)', textDecoration: 'none', border: `1px solid ${isPublic ? 'rgba(74,222,128,0.3)' : 'rgba(255,255,255,0.15)'}`, borderRadius: 20, padding: '3px 10px', background: 'none', cursor: 'pointer', transition: 'all 0.2s' }}>
                {isPublic ? '🌐 Public' : '🔒 Private'}
              </button>
            </div>
          </div>
        </div>

        {/* pHash */}
        {asset.phash && (
          <div className="ap-card" style={{ padding: '16px 20px', marginBottom: 20 }}>
            <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.38)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700, marginBottom: 8 }}>
              Perceptual Fingerprint (pHash)
            </p>
            <code style={{ fontFamily: 'monospace', fontSize: '0.88rem', color: '#4ade80', wordBreak: 'break-all' }}>
              {asset.phash}
            </code>
          </div>
        )}

        {/* Scan results */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <span className="ap-section-title">Scan Results</span>
            {scanResults.length > 0 && (
              <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.38)' }}>
                ({scanResults.length} match{scanResults.length !== 1 ? 'es' : ''})
              </span>
            )}
          </div>

          {scanResults.length === 0 ? (
            <div className="ap-card" style={{ padding: 56, textAlign: 'center' }}>
              {asset.status === 'scanning' ? (
                <>
                  <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🔍</div>
                  <p className="ap-subheading" style={{ marginBottom: 6 }}>Scanning in progress…</p>
                  <p className="ap-muted">Results appear here automatically when ready.</p>
                </>
              ) : asset.status === 'complete' ? (
                <>
                  <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>✅</div>
                  <p className="ap-subheading" style={{ marginBottom: 6 }}>No unauthorized copies found</p>
                  <p className="ap-muted">Your asset appears to be used only in authorised contexts.</p>
                </>
              ) : (
                <>
                  <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>⏳</div>
                  <p className="ap-subheading">Scan pending</p>
                </>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {scanResults.map(result => {
                const confidence = Math.round((result.confidence || 0) * 100);
                const isHigh     = confidence >= 90;
                const barColor   = isHigh ? '#ef4444' : '#f59e0b';
                return (
                  <div key={result.id} style={{ borderRadius: 12, overflow: 'hidden', border: `1px solid ${isHigh ? 'rgba(239,68,68,0.28)' : 'rgba(245,158,11,0.25)'}`, background: isHigh ? 'rgba(239,68,68,0.05)' : 'rgba(245,158,11,0.04)' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, padding: 16 }}>
                      {result.thumbnailUrl ? (
                        <img src={result.thumbnailUrl} alt="" style={{ width: 60, height: 60, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
                      ) : (
                        <div style={{ width: 60, height: 60, borderRadius: 8, background: 'rgba(26,92,26,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', flexShrink: 0 }}>🖼️</div>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                          <div className="ap-conf-bar-track">
                            <div className="ap-conf-bar-fill" style={{ width: `${confidence}%`, background: barColor }} />
                          </div>
                          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '0.9rem', color: barColor, minWidth: 36 }}>
                            {confidence}%
                          </span>
                        </div>
                        <a href={result.foundUrl} target="_blank" rel="noopener noreferrer"
                          style={{ fontSize: '0.8rem', color: '#60a5fa', textDecoration: 'none', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          ↗ {result.foundUrl}
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
