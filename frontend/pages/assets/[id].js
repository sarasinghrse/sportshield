import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { db, subscribeToScanResults, setAssetVisibility } from '../../lib/firebase';
import Footer from '../../components/landing/Footer';
import { doc, onSnapshot, deleteDoc } from 'firebase/firestore';
import toast, { Toaster } from 'react-hot-toast';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

// ── Platform icon SVGs ───────────────────────────────────────────────────────
const platformIcons = {
  instagram: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>,
  twitter: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"/></svg>,
  facebook: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>,
  youtube: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19.1c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"/><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"/></svg>,
  reddit: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="1.5"/><circle cx="8.5" cy="12.5" r="1.2"/><circle cx="15.5" cy="12.5" r="1.2"/><path d="M9 16s1.5 1 3 1 3-1 3-1" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  news: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/><path d="M18 14h-8"/><path d="M15 18h-5"/><path d="M10 6h8v4h-8V6Z"/></svg>,
  shop: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>,
  globe: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>,
};

const speedColors = {
  rapid:    { color: '#ef4444', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.25)', label: 'Rapid Spread' },
  moderate: { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.25)', label: 'Moderate Spread' },
  slow:     { color: '#3b82f6', bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.25)', label: 'Limited Spread' },
  none:     { color: '#4ade80', bg: 'rgba(74,222,128,0.1)',  border: 'rgba(74,222,128,0.2)',  label: 'No Spread' },
};

const typeColors = {
  social:    '#e879f9',
  news:      '#60a5fa',
  ecommerce: '#f59e0b',
  video:     '#ef4444',
  forum:     '#fb923c',
  media:     '#34d399',
  website:   'rgba(255,255,255,0.5)',
};

export default function AssetDetail() {
  const router = useRouter();
  const { id } = router.query;
  const [asset,       setAsset]       = useState(null);
  const [scanResults, setScanResults] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [propagation, setPropagation] = useState(null);
  const [propLoading, setPropLoading] = useState(false);

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

  // Fetch propagation data from backend (or build client-side from scanResults)
  useEffect(() => {
    if (!id) return;
    setPropLoading(true);
    // Try backend first, fall back to client-side construction
    fetch(`${API_URL}/api/media/propagation/${id}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setPropagation(data); })
      .catch(() => {})
      .finally(() => setPropLoading(false));
  }, [id]);

  // Client-side fallback: build propagation from scanResults if backend didn't return data
  useEffect(() => {
    if (propagation || propLoading || scanResults.length === 0) return;
    const domainMap = {};
    const timeline = scanResults.map((r, i) => {
      const url = r.foundUrl || '';
      let domain;
      try { domain = new URL(url.includes('://') ? url : `https://${url}`).hostname.replace(/^www\./, ''); }
      catch { domain = url; }
      domainMap[domain] = (domainMap[domain] || 0) + 1;
      const typeMap = { 'instagram.com': 'social', 'twitter.com': 'social', 'x.com': 'social',
        'facebook.com': 'social', 'youtube.com': 'video', 'reddit.com': 'forum',
        'tiktok.com': 'social', 'pinterest.com': 'social' };
      const iconMap = { 'instagram.com': 'instagram', 'twitter.com': 'twitter', 'x.com': 'twitter',
        'facebook.com': 'facebook', 'youtube.com': 'youtube', 'reddit.com': 'reddit' };
      const matchedKey = Object.keys(typeMap).find(k => domain.endsWith(k));
      return {
        id: r.id, domain, url,
        platform: { type: matchedKey ? typeMap[matchedKey] : 'website', platform: domain, icon: matchedKey ? iconMap[matchedKey] || 'globe' : 'globe' },
        confidence: r.confidence || 0, classification: r.classification || 'unknown',
        firstSeenAt: r.scannedAt?.toDate?.()?.toISOString?.() || new Date().toISOString(),
        severity: r.severity || 'low', order: i + 1,
      };
    });
    const uniqueDomains = Object.keys(domainMap).length;
    const platformBreakdown = {};
    timeline.forEach(n => { platformBreakdown[n.platform.type] = (platformBreakdown[n.platform.type] || 0) + 1; });
    const domains = [...new Set(timeline.map(t => t.domain))];
    const graph = domains.length ? [{ from: 'original', to: domains[0] }, ...domains.slice(1).map((d, i) => ({ from: domains[i], to: d }))] : [];
    setPropagation({
      assetId: id, totalNodes: timeline.length, uniqueDomains,
      platformBreakdown, timeline,
      spreadSpeed: uniqueDomains >= 5 ? 'rapid' : uniqueDomains >= 3 ? 'moderate' : uniqueDomains >= 1 ? 'slow' : 'none',
      domainGraph: graph,
    });
  }, [scanResults, propagation, propLoading]);

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
              {asset.type === 'video' ? <svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='rgba(255,255,255,0.5)' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><polygon points='23 7 16 12 23 17 23 7'/><rect x='1' y='5' width='15' height='14' rx='2' ry='2'/></svg> : <svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='rgba(255,255,255,0.5)' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><rect x='3' y='3' width='18' height='18' rx='2' ry='2'/><circle cx='8.5' cy='8.5' r='1.5'/><polyline points='21 15 16 10 5 21'/></svg>}
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
                  {asset.matchCount} match{asset.matchCount !== 1 ? 'es' : ''} found
                </span>
              )}
              <Link href={`/certificate/${id}`}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.78rem', color: '#fbbf24', textDecoration: 'none', border: '1px solid rgba(251,191,36,0.28)', borderRadius: 20, padding: '3px 10px', transition: 'border-color 0.2s' }}>
                Certificate
              </Link>
              {/* Visibility toggle */}
              <button onClick={toggleVisibility} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.78rem', color: isPublic ? '#4ade80' : 'rgba(255,255,255,0.4)', textDecoration: 'none', border: `1px solid ${isPublic ? 'rgba(74,222,128,0.3)' : 'rgba(255,255,255,0.15)'}`, borderRadius: 20, padding: '3px 10px', background: 'none', cursor: 'pointer', transition: 'all 0.2s' }}>
                {isPublic ? 'Public' : 'Private'}
              </button>
              {/* Manual scan */}
              <button onClick={async () => {
                try {
                  toast.loading('Triggering scan…', { id: 'scan' });
                  await fetch(`${API_URL}/api/media/scan/${id}`, { method: 'POST' });
                  toast.success('Scan started!', { id: 'scan' });
                } catch { toast.error('Failed to trigger scan', { id: 'scan' }); }
              }} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.78rem', color: '#34d399', border: '1px solid rgba(52,211,153,0.3)', borderRadius: 20, padding: '3px 10px', background: 'none', cursor: 'pointer', transition: 'all 0.2s' }}>
                Scan Now
              </button>
              {/* Delete asset */}
              <button onClick={async () => {
                if (!confirm('Delete this asset? This removes it from your dashboard and the community dashboard.')) return;
                try {
                  await deleteDoc(doc(db, 'assets', id));
                  toast.success('Asset deleted');
                  router.push('/');
                } catch { toast.error('Failed to delete asset'); }
              }} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.78rem', color: '#f87171', border: '1px solid rgba(248,113,113,0.25)', borderRadius: 20, padding: '3px 10px', background: 'none', cursor: 'pointer', transition: 'all 0.2s' }}>
                Delete
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

        {/* ── S10: Deepfake Analysis Card ── */}
        {(() => {
          const df = asset.deepfakeAnalysis;
          const hasResult = df && typeof df === 'object';
          const isError = hasResult && (df.label === 'unknown' || df.error);
          const hasGoodResult = hasResult && !isError && df.label;
          const riskColors = {
            critical: { color: '#ef4444', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.25)', icon: '🚨' },
            high:     { color: '#f97316', bg: 'rgba(249,115,22,0.08)', border: 'rgba(249,115,22,0.25)', icon: '⚠️' },
            medium:   { color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.25)', icon: '⚡' },
            low:      { color: '#3b82f6', bg: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.25)', icon: 'ℹ️' },
            none:     { color: '#4ade80', bg: 'rgba(74,222,128,0.06)', border: 'rgba(74,222,128,0.2)',  icon: '✅' },
            unknown:  { color: 'rgba(255,255,255,0.4)', bg: 'rgba(255,255,255,0.03)', border: 'rgba(255,255,255,0.08)', icon: '❓' },
          };
          const rc = riskColors[hasGoodResult ? df.riskLevel : 'unknown'] || riskColors.unknown;
          const confPct = hasGoodResult ? Math.round((df.confidence || 0) * 100) : 0;

          const runAnalysis = async () => {
            try {
              toast.loading('Running deepfake analysis… (models may take ~30s to warm up)', { id: 'df', duration: 90000 });
              const res = await fetch(`${API_URL}/api/media/deepfake-check/${id}`, { method: 'POST' });
              if (!res.ok) throw new Error('Analysis failed');
              const result = await res.json();
              if (result.error || result.label === 'unknown') {
                toast.error(result.error || 'Models unavailable — try again in 30s', { id: 'df' });
              } else {
                toast.success(result.label || 'Analysis complete', { id: 'df' });
              }
            } catch (err) {
              toast.error('Deepfake analysis failed — is the backend running?', { id: 'df' });
            }
          };

          return (
            <div className="ap-card" style={{ padding: '20px 24px', marginBottom: 20, borderColor: hasGoodResult && df.isDeepfake ? rc.border : undefined }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={hasGoodResult && df.isDeepfake ? '#ef4444' : '#4ade80'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                    {hasGoodResult && df.isDeepfake
                      ? <line x1="9" y1="9" x2="15" y2="15" stroke="#ef4444" strokeWidth="2"/>
                      : <polyline points="9 12 11 14 15 10"/>
                    }
                  </svg>
                  <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.38)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>
                    Deepfake Analysis
                  </p>
                </div>
                {hasGoodResult && (
                  <span style={{
                    fontSize: '0.68rem', fontWeight: 700, padding: '3px 10px', borderRadius: 10,
                    color: rc.color, background: rc.bg, border: `1px solid ${rc.border}`,
                    textTransform: 'uppercase', letterSpacing: '0.06em',
                  }}>
                    {rc.icon} {df.riskLevel}
                  </span>
                )}
              </div>

              {hasGoodResult ? (
                <>
                  {/* Main result */}
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 16, padding: '16px 18px', borderRadius: 12, marginBottom: 14,
                    background: rc.bg, border: `1px solid ${rc.border}`,
                  }}>
                    <div style={{ fontSize: '2.2rem', lineHeight: 1 }}>{rc.icon}</div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '1.1rem', color: rc.color, marginBottom: 2 }}>
                        {df.label}
                      </p>
                      <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)' }}>
                        {df.isDeepfake
                          ? 'This image shows signs of synthetic generation or face manipulation.'
                          : 'No deepfake indicators detected — image appears authentic.'}
                      </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '1.6rem', color: rc.color }}>
                        {confPct}%
                      </p>
                      <p style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' }}>confidence</p>
                    </div>
                  </div>

                  {/* Confidence bar */}
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.3)' }}>Authentic</span>
                      <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.3)' }}>Deepfake</span>
                    </div>
                    <div style={{ width: '100%', height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.06)', overflow: 'hidden', position: 'relative' }}>
                      <div style={{
                        position: 'absolute', left: 0, top: 0, height: '100%', borderRadius: 4,
                        width: `${df.isDeepfake ? confPct : 100 - confPct}%`,
                        background: 'linear-gradient(90deg, #4ade80 0%, #fbbf24 50%, #ef4444 100%)',
                        opacity: 0.8, transition: 'width 0.6s ease',
                      }} />
                      <div style={{
                        position: 'absolute', top: -3, height: 14, width: 3, borderRadius: 2,
                        background: '#fff', boxShadow: '0 0 6px rgba(255,255,255,0.5)',
                        left: `${df.isDeepfake ? confPct : 100 - confPct}%`,
                        transform: 'translateX(-50%)', transition: 'left 0.6s ease',
                      }} />
                    </div>
                  </div>

                  {/* Forensic indicators */}
                  {df.forensics && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                      {[
                        { key: 'faceManipulation', label: 'Face Manipulation', icon: '👤' },
                        { key: 'generativeAI',     label: 'Generative AI',     icon: '🤖' },
                        { key: 'naturalImage',     label: 'Natural Image',     icon: '🌿' },
                      ].map(({ key, label, icon }) => {
                        const val = df.forensics[key];
                        if (val == null) return (
                          <div key={key} style={{ textAlign: 'center', padding: '10px 6px', borderRadius: 8, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <p style={{ fontSize: '1rem', marginBottom: 4 }}>{icon}</p>
                            <p style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.2)' }}>N/A</p>
                            <p style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.25)', marginTop: 2 }}>{label}</p>
                          </div>
                        );
                        const pct = Math.round(val * 100);
                        const fColor = key === 'naturalImage' ? '#4ade80' : pct >= 70 ? '#ef4444' : pct >= 40 ? '#f59e0b' : '#3b82f6';
                        return (
                          <div key={key} style={{ textAlign: 'center', padding: '10px 6px', borderRadius: 8, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <p style={{ fontSize: '1rem', marginBottom: 4 }}>{icon}</p>
                            <p style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '1rem', color: fColor }}>{pct}%</p>
                            <p style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>{label}</p>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {df.model && (
                    <p style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.18)', marginTop: 10, textAlign: 'right' }}>
                      Model: {df.model}
                    </p>
                  )}

                  {/* Re-run button */}
                  <div style={{ marginTop: 12, textAlign: 'center' }}>
                    <button onClick={runAnalysis} className="ap-btn ap-btn-ghost" style={{ fontSize: '0.72rem', padding: '6px 16px' }}>
                      Re-run Analysis
                    </button>
                  </div>
                </>
              ) : isError ? (
                /* Model returned unknown/error — show retry */
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <div style={{ fontSize: '2rem', marginBottom: 8 }}>⏳</div>
                  <p style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '0.95rem', color: '#f59e0b', marginBottom: 6 }}>
                    Models are warming up
                  </p>
                  <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.35)', marginBottom: 4 }}>
                    {df.error || 'HuggingFace free-tier models need ~30s to cold-start.'}
                  </p>
                  <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.25)', marginBottom: 14 }}>
                    Click below to retry — the models should be ready now.
                  </p>
                  <button onClick={runAnalysis} className="ap-btn ap-btn-green" style={{ padding: '10px 24px', fontSize: '0.82rem' }}>
                    Retry Deepfake Analysis
                  </button>
                </div>
              ) : (
                /* Never run */
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <div style={{ fontSize: '2rem', marginBottom: 8, opacity: 0.4 }}>🛡️</div>
                  <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.35)', marginBottom: 12 }}>
                    Deepfake analysis not yet run on this asset.
                  </p>
                  <button onClick={runAnalysis} className="ap-btn ap-btn-green" style={{ padding: '10px 24px', fontSize: '0.82rem' }}>
                    Run Deepfake Analysis
                  </button>
                </div>
              )}
            </div>
          );
        })()}

        {/* Risk Score — uses backend value if present, otherwise estimates client-side */}
        {(() => {
          const n = asset.matchCount || 0;
          const riskScore = asset.riskScore != null ? asset.riskScore
            : n === 0 ? 0
            : (() => {
                const volume = n <= 2 ? n * 10 : n <= 4 ? 20 + (n - 2) * 5 : 30;
                const confidence = 20;
                const severity = n >= 3 ? 15 : n >= 1 ? 8 : 0;
                const ai = asset.aiDetection?.is_ai ? Math.round(asset.aiDetection.confidence * 15) : 0;
                return Math.min(100, volume + confidence + severity + ai);
              })();
          const breakdown = asset.riskBreakdown || (() => {
            const volume = n <= 2 ? n * 10 : n <= 4 ? 20 + (n - 2) * 5 : 30;
            return { volume, confidence: 20, severity: n >= 3 ? 15 : n >= 1 ? 8 : 0, aiFlag: asset.aiDetection?.is_ai ? Math.round(asset.aiDetection.confidence * 15) : 0 };
          })();
          const color = riskScore >= 75 ? '#ef4444' : riskScore >= 50 ? '#f59e0b' : riskScore >= 25 ? '#3b82f6' : '#4ade80';
          return (
            <div className="ap-card" style={{ padding: '20px 24px', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.38)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>
                  Composite Risk Score
                </p>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '1.6rem', color }}>
                  {riskScore}/100
                </span>
              </div>
              <div style={{ width: '100%', height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.08)', overflow: 'hidden', marginBottom: 14 }}>
                <div style={{ width: `${riskScore}%`, height: '100%', borderRadius: 4, transition: 'width 0.6s ease', background: color }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                {[
                  { key: 'volume',     label: 'Volume',     max: 30 },
                  { key: 'confidence', label: 'Confidence', max: 35 },
                  { key: 'severity',   label: 'Severity',   max: 20 },
                  { key: 'aiFlag',     label: 'AI Flag',    max: 15 },
                ].map(({ key, label, max }) => {
                  const val = breakdown[key] || 0;
                  return (
                    <div key={key} style={{ textAlign: 'center' }}>
                      <p style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1rem', color: '#fff', marginBottom: 2 }}>
                        {val}<span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)' }}>/{max}</span>
                      </p>
                      <p style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* ── S5: Invisible Watermark Card ── */}
        {asset.type === 'image' && (
          <div className="ap-card" style={{ padding: '20px 24px', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
                <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.38)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>
                  Invisible Watermark (LSB)
                </p>
              </div>
              {asset.invisibleWmUrl ? (
                <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '3px 10px', borderRadius: 10, color: '#4ade80', background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)' }}>
                  Embedded
                </span>
              ) : (
                <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '3px 10px', borderRadius: 10, color: 'rgba(255,255,255,0.35)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  Not Applied
                </span>
              )}
            </div>

            {asset.invisibleWmUrl ? (
              <>
                <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)', marginBottom: 12 }}>
                  A hidden identifier is embedded in this image using LSB steganography. If this image is leaked, the watermark can be extracted to identify the source.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                  <div style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', textAlign: 'center' }}>
                    <p style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', marginBottom: 4 }}>Method</p>
                    <p style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '0.85rem', color: '#60a5fa' }}>LSB Steganography</p>
                  </div>
                  <div style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', textAlign: 'center' }}>
                    <p style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', marginBottom: 4 }}>Format</p>
                    <p style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '0.85rem', color: '#60a5fa' }}>PNG (lossless)</p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    onClick={async () => {
                      try {
                        toast.loading('Verifying watermark…', { id: 'wm' });
                        const res = await fetch(`${API_URL}/api/media/extract-watermark/${id}`);
                        const data = await res.json();
                        if (data.found && data.checksum_valid) {
                          toast.success(`Watermark verified — User: ${data.payload?.uid}, Asset: ${data.payload?.aid?.slice(0,8)}`, { id: 'wm', duration: 6000 });
                        } else if (data.found) {
                          toast.error('Watermark found but checksum invalid', { id: 'wm' });
                        } else {
                          toast.error('No watermark detected', { id: 'wm' });
                        }
                      } catch { toast.error('Verification failed', { id: 'wm' }); }
                    }}
                    className="ap-btn ap-btn-green" style={{ flex: 1, padding: '8px 16px', fontSize: '0.78rem' }}
                  >
                    Verify Watermark
                  </button>
                  <a href={asset.invisibleWmUrl} target="_blank" rel="noopener noreferrer"
                    className="ap-btn ap-btn-ghost" style={{ flex: 1, padding: '8px 16px', fontSize: '0.78rem', textAlign: 'center', textDecoration: 'none' }}>
                    View Watermarked Copy
                  </a>
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.35)', marginBottom: 12 }}>
                  No invisible watermark has been applied yet.
                </p>
                <button
                  onClick={async () => {
                    try {
                      toast.loading('Embedding invisible watermark…', { id: 'wm' });
                      const res = await fetch(`${API_URL}/api/media/invisible-watermark/${id}`, { method: 'POST' });
                      if (!res.ok) throw new Error();
                      toast.success('Invisible watermark embedded', { id: 'wm' });
                    } catch { toast.error('Failed to embed watermark', { id: 'wm' }); }
                  }}
                  className="ap-btn ap-btn-green" style={{ padding: '10px 24px', fontSize: '0.82rem' }}
                >
                  Apply Invisible Watermark
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── S4: Video Fingerprint Card ── */}
        {asset.type === 'video' && asset.videoFingerprint && (
          <div className="ap-card" style={{ padding: '20px 24px', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#e879f9" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="23 7 16 12 23 17 23 7"/>
                  <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
                </svg>
                <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.38)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>
                  Video Fingerprint
                </p>
              </div>
              <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '3px 10px', borderRadius: 10, color: '#e879f9', background: 'rgba(232,121,249,0.08)', border: '1px solid rgba(232,121,249,0.2)' }}>
                {asset.videoFingerprint.method === 'opencv' ? 'OpenCV' : 'Fallback'}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
              <div style={{ textAlign: 'center', padding: '12px 8px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <p style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '1.4rem', color: '#fff' }}>{asset.videoFingerprint.frameCount}</p>
                <p style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase' }}>Key Frames</p>
              </div>
              <div style={{ textAlign: 'center', padding: '12px 8px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <p style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '1.4rem', color: '#fff' }}>
                  {asset.videoFingerprint.duration_estimate ? `${asset.videoFingerprint.duration_estimate}s` : '—'}
                </p>
                <p style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase' }}>Duration</p>
              </div>
              <div style={{ textAlign: 'center', padding: '12px 8px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <p style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '1.4rem', color: '#fff' }}>
                  {asset.videoFingerprint.frameHashes?.length || 0}
                </p>
                <p style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase' }}>Hashes</p>
              </div>
            </div>

            {/* Primary hash */}
            {asset.videoFingerprint.primaryHash && (
              <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(232,121,249,0.05)', border: '1px solid rgba(232,121,249,0.12)', marginBottom: 14 }}>
                <p style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', marginBottom: 4 }}>Primary Frame Hash</p>
                <code style={{ fontFamily: 'monospace', fontSize: '0.82rem', color: '#e879f9', wordBreak: 'break-all' }}>
                  {asset.videoFingerprint.primaryHash}
                </code>
              </div>
            )}

            {/* Frame hash list (collapsible) */}
            {asset.videoFingerprint.frameHashes?.length > 0 && (
              <details style={{ fontSize: '0.75rem' }}>
                <summary style={{ color: 'rgba(255,255,255,0.4)', cursor: 'pointer', marginBottom: 8 }}>
                  View all {asset.videoFingerprint.frameHashes.length} frame hashes
                </summary>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {asset.videoFingerprint.frameHashes.map((h, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 10px', borderRadius: 6, background: 'rgba(255,255,255,0.02)' }}>
                      <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.25)', minWidth: 28 }}>#{i+1}</span>
                      <code style={{ fontFamily: 'monospace', fontSize: '0.72rem', color: 'rgba(232,121,249,0.7)' }}>{h}</code>
                    </div>
                  ))}
                </div>
              </details>
            )}

            {/* Compare button */}
            <div style={{ marginTop: 14, textAlign: 'center' }}>
              <button
                onClick={async () => {
                  try {
                    toast.loading('Comparing video frames against asset database…', { id: 'vc' });
                    const res = await fetch(`${API_URL}/api/media/video-compare/${id}`, { method: 'POST' });
                    const data = await res.json();
                    if (data.matches?.length > 0) {
                      toast.success(`Found ${data.matches.length} matching asset(s)`, { id: 'vc', duration: 5000 });
                    } else {
                      toast.success(`No matches found (compared against ${data.comparedAgainst} assets)`, { id: 'vc' });
                    }
                  } catch { toast.error('Comparison failed', { id: 'vc' }); }
                }}
                className="ap-btn ap-btn-ghost" style={{ padding: '8px 20px', fontSize: '0.78rem' }}
              >
                Compare Against Asset Database
              </button>
            </div>
          </div>
        )}

        {/* ── S13: Music / Audio Detection Card ── */}
        {(asset.type === 'video' || asset.type === 'audio') && (() => {
          const ma = asset.musicAnalysis;
          const hasResult = ma && typeof ma === 'object';
          const riskMap = {
            high:   { color: '#ef4444', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.2)' },
            medium: { color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)' },
            low:    { color: '#3b82f6', bg: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.2)' },
            none:   { color: '#4ade80', bg: 'rgba(74,222,128,0.06)', border: 'rgba(74,222,128,0.2)' },
          };
          const rc = riskMap[hasResult ? ma.riskLevel : 'none'] || riskMap.none;

          const runDetection = async () => {
            try {
              toast.loading('Analyzing audio…', { id: 'music' });
              const res = await fetch(`${API_URL}/api/media/music-detect/${id}`, { method: 'POST' });
              if (!res.ok) throw new Error();
              const data = await res.json();
              toast.success(data.summary || 'Analysis complete', { id: 'music', duration: 5000 });
            } catch { toast.error('Music detection failed', { id: 'music' }); }
          };

          return (
            <div className="ap-card" style={{ padding: '20px 24px', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fb923c" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 18V5l12-2v13"/>
                    <circle cx="6" cy="18" r="3"/>
                    <circle cx="18" cy="16" r="3"/>
                  </svg>
                  <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.38)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>
                    Music / Audio Detection
                  </p>
                </div>
                {hasResult && (
                  <span style={{
                    fontSize: '0.68rem', fontWeight: 700, padding: '3px 10px', borderRadius: 10,
                    color: rc.color, background: rc.bg, border: `1px solid ${rc.border}`,
                    textTransform: 'uppercase',
                  }}>
                    {ma.riskLevel} risk
                  </span>
                )}
              </div>

              {hasResult ? (
                <>
                  <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.45)', marginBottom: 14 }}>
                    {ma.summary}
                  </p>

                  {ma.tracks?.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
                      {ma.tracks.map((track, i) => (
                        <div key={i} style={{
                          padding: '12px 16px', borderRadius: 10,
                          background: 'rgba(251,146,60,0.05)', border: '1px solid rgba(251,146,60,0.15)',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                            <p style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '0.9rem', color: '#fff' }}>
                              {track.title}
                            </p>
                            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#fb923c' }}>
                              {Math.round((track.confidence || 0) * 100)}% match
                            </span>
                          </div>
                          <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)' }}>
                            {track.artist}{track.album ? ` — ${track.album}` : ''}
                          </p>
                          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                            {track.spotifyUrl && (
                              <a href={track.spotifyUrl} target="_blank" rel="noopener noreferrer"
                                style={{ fontSize: '0.68rem', color: '#1DB954', textDecoration: 'none', padding: '2px 8px', borderRadius: 6, background: 'rgba(29,185,84,0.1)', border: '1px solid rgba(29,185,84,0.2)' }}>
                                Spotify
                              </a>
                            )}
                            {track.appleMusicUrl && (
                              <a href={track.appleMusicUrl} target="_blank" rel="noopener noreferrer"
                                style={{ fontSize: '0.68rem', color: '#fc3c44', textDecoration: 'none', padding: '2px 8px', borderRadius: 6, background: 'rgba(252,60,68,0.1)', border: '1px solid rgba(252,60,68,0.2)' }}>
                                Apple Music
                              </a>
                            )}
                            <span style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.25)', alignSelf: 'center' }}>
                              via {track.source}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {ma.audioInfo && (
                    <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                      {ma.audioInfo.format && (
                        <span style={{ fontSize: '0.68rem', padding: '3px 10px', borderRadius: 8, color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                          Format: {ma.audioInfo.format}
                        </span>
                      )}
                      <span style={{ fontSize: '0.68rem', padding: '3px 10px', borderRadius: 8, color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                        Method: {ma.method}
                      </span>
                    </div>
                  )}

                  <div style={{ textAlign: 'center' }}>
                    <button onClick={runDetection} className="ap-btn ap-btn-ghost" style={{ fontSize: '0.72rem', padding: '6px 16px' }}>
                      Re-run Detection
                    </button>
                  </div>
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '16px 0' }}>
                  <div style={{ fontSize: '2rem', marginBottom: 8, opacity: 0.4 }}>🎵</div>
                  <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.35)', marginBottom: 12 }}>
                    Music detection not yet run on this asset.
                  </p>
                  <button onClick={runDetection} className="ap-btn ap-btn-green" style={{ padding: '10px 24px', fontSize: '0.82rem' }}>
                    Run Music Detection
                  </button>
                </div>
              )}
            </div>
          );
        })()}

        {/* ── S8: Content Propagation Map ── */}
        {propagation && propagation.totalNodes > 0 && (
          <div className="ap-card" style={{ padding: '20px 24px', marginBottom: 20 }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="2"/><path d="M12 2v4m0 12v4M2 12h4m12 0h4"/><circle cx="12" cy="12" r="10"/><path d="m4.93 4.93 2.83 2.83m8.48 8.48 2.83 2.83M4.93 19.07l2.83-2.83m8.48-8.48 2.83-2.83"/></svg>
                <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.38)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>
                  Content Propagation Map
                </p>
              </div>
              {(() => {
                const s = speedColors[propagation.spreadSpeed] || speedColors.none;
                return (
                  <span style={{
                    fontSize: '0.7rem', fontWeight: 700, padding: '3px 10px', borderRadius: 10,
                    color: s.color, background: s.bg, border: `1px solid ${s.border}`,
                  }}>
                    {s.label}
                  </span>
                );
              })()}
            </div>

            {/* Summary stats row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
              {[
                { label: 'Total Detections', value: propagation.totalNodes },
                { label: 'Unique Domains', value: propagation.uniqueDomains },
                { label: 'Platform Types', value: Object.keys(propagation.platformBreakdown).length },
              ].map(({ label, value }) => (
                <div key={label} style={{ textAlign: 'center', padding: '12px 8px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <p style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '1.4rem', color: '#fff', marginBottom: 2 }}>{value}</p>
                  <p style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</p>
                </div>
              ))}
            </div>

            {/* Platform breakdown chips */}
            {Object.keys(propagation.platformBreakdown).length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
                {Object.entries(propagation.platformBreakdown).map(([type, count]) => (
                  <span key={type} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    fontSize: '0.72rem', fontWeight: 600, padding: '4px 10px', borderRadius: 8,
                    color: typeColors[type] || 'rgba(255,255,255,0.5)',
                    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                  }}>
                    {platformIcons[type === 'social' ? 'instagram' : type === 'news' ? 'news' : type === 'ecommerce' ? 'shop' : type === 'video' ? 'youtube' : type === 'forum' ? 'reddit' : 'globe'] || platformIcons.globe}
                    <span style={{ textTransform: 'capitalize' }}>{type}</span>
                    <span style={{ fontFamily: 'var(--font-display)', fontWeight: 900, color: '#fff' }}>{count}</span>
                  </span>
                ))}
              </div>
            )}

            {/* Propagation Timeline (vertical) */}
            <div style={{ position: 'relative', paddingLeft: 28 }}>
              {/* Vertical line */}
              <div style={{ position: 'absolute', left: 9, top: 8, bottom: 8, width: 2, background: 'rgba(26,92,26,0.4)', borderRadius: 1 }} />

              {/* Origin node */}
              <div style={{ position: 'relative', marginBottom: 16 }}>
                <div style={{ position: 'absolute', left: -28, top: 2, width: 20, height: 20, borderRadius: '50%', background: '#1a5c1a', border: '2px solid #4ade80', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                </div>
                <div style={{ paddingTop: 1 }}>
                  <p style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '0.85rem', color: '#4ade80' }}>Original Upload</p>
                  <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.3)' }}>Protected asset — source of truth</p>
                </div>
              </div>

              {/* Propagation nodes */}
              {propagation.timeline.map((node, i) => {
                const isUnauth = node.classification === 'unauthorized';
                const nodeColor = isUnauth ? '#f87171' : node.classification === 'authorized' ? '#4ade80' : '#f59e0b';
                const confPct = Math.round((node.confidence || 0) * 100);
                const icon = platformIcons[node.platform?.icon] || platformIcons.globe;
                const pColor = typeColors[node.platform?.type] || 'rgba(255,255,255,0.5)';

                let timeLabel = '';
                try {
                  const d = new Date(node.firstSeenAt);
                  timeLabel = formatDistanceToNow(d, { addSuffix: true });
                } catch { timeLabel = ''; }

                return (
                  <div key={node.id || i} style={{ position: 'relative', marginBottom: i < propagation.timeline.length - 1 ? 12 : 0 }}>
                    {/* Node dot */}
                    <div style={{
                      position: 'absolute', left: -28, top: 4,
                      width: 20, height: 20, borderRadius: '50%',
                      background: isUnauth ? 'rgba(248,113,113,0.15)' : 'rgba(74,222,128,0.1)',
                      border: `2px solid ${nodeColor}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: pColor,
                    }}>
                      {icon}
                    </div>

                    {/* Node content */}
                    <div style={{
                      padding: '10px 14px', borderRadius: 10,
                      background: isUnauth ? 'rgba(248,113,113,0.04)' : 'rgba(255,255,255,0.02)',
                      border: `1px solid ${isUnauth ? 'rgba(248,113,113,0.15)' : 'rgba(255,255,255,0.06)'}`,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '0.82rem', color: '#fff' }}>
                            #{node.order}
                          </span>
                          <span style={{ fontSize: '0.78rem', fontWeight: 600, color: pColor }}>
                            {node.platform?.platform || node.domain}
                          </span>
                          <span style={{
                            fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase',
                            letterSpacing: '0.06em', padding: '1px 6px', borderRadius: 6,
                            color: nodeColor,
                            background: isUnauth ? 'rgba(248,113,113,0.1)' : 'rgba(74,222,128,0.1)',
                          }}>
                            {node.classification || 'unknown'}
                          </span>
                        </div>
                        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '0.78rem', color: confPct >= 85 ? '#ef4444' : confPct >= 65 ? '#f59e0b' : '#60a5fa' }}>
                          {confPct}%
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <a href={node.url} target="_blank" rel="noopener noreferrer"
                          style={{ fontSize: '0.72rem', color: '#60a5fa', textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>
                          {node.domain}
                        </a>
                        {timeLabel && (
                          <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.28)' }}>{timeLabel}</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Domain flow graph (horizontal) */}
            {propagation.domainGraph.length > 0 && (
              <div style={{ marginTop: 20, padding: '14px 16px', borderRadius: 10, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <p style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700, marginBottom: 10 }}>
                  Spread Path
                </p>
                <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                  {propagation.domainGraph.map((edge, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {i === 0 && (
                        <span style={{
                          fontSize: '0.72rem', fontWeight: 700, padding: '3px 10px', borderRadius: 8,
                          background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.2)', color: '#4ade80',
                        }}>
                          {edge.from === 'original' ? '🛡 Original' : edge.from}
                        </span>
                      )}
                      <svg width="16" height="12" viewBox="0 0 16 12" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 6h12M10 2l4 4-4 4"/>
                      </svg>
                      <span style={{
                        fontSize: '0.72rem', fontWeight: 600, padding: '3px 10px', borderRadius: 8,
                        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.55)',
                      }}>
                        {edge.to}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* ══ PHASE 1 — PRODUCTION-GRADE PROTECTION STACK ══════════════ */}
        {/* ═══════════════════════════════════════════════════════════════ */}

        {/* ── C2PA Content Credentials Card ── */}
        {asset.type === 'image' && (() => {
          const c2pa = asset.c2pa;
          const hasCred = c2pa && c2pa.signed;
          return (
            <div className="ap-card" style={{ padding: '20px 24px', marginBottom: 20, borderColor: hasCred ? 'rgba(96,165,250,0.25)' : undefined }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                    <path d="M9 12l2 2 4-4"/>
                  </svg>
                  <div>
                    <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.38)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>
                      C2PA Content Credentials
                    </p>
                    <p style={{ fontSize: '0.6rem', color: 'rgba(96,165,250,0.6)', marginTop: 2 }}>
                      Adobe, BBC, Sony, Leica & 6,000+ orgs
                    </p>
                  </div>
                </div>
                {hasCred ? (
                  <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '3px 10px', borderRadius: 10, color: '#60a5fa', background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.2)' }}>
                    Signed — {c2pa.algorithm}
                  </span>
                ) : (
                  <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '3px 10px', borderRadius: 10, color: 'rgba(255,255,255,0.35)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    Not Signed
                  </span>
                )}
              </div>

              {hasCred ? (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 14 }}>
                    <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(96,165,250,0.05)', border: '1px solid rgba(96,165,250,0.12)' }}>
                      <p style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', marginBottom: 4 }}>Standard</p>
                      <code style={{ fontFamily: 'monospace', fontSize: '0.74rem', color: '#60a5fa' }}>{c2pa.standard || 'C2PA v2'}</code>
                    </div>
                    <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(96,165,250,0.05)', border: '1px solid rgba(96,165,250,0.12)' }}>
                      <p style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', marginBottom: 4 }}>Signed At</p>
                      <code style={{ fontFamily: 'monospace', fontSize: '0.72rem', color: '#60a5fa' }}>
                        {c2pa.signedAt ? new Date(c2pa.signedAt).toLocaleString() : '—'}
                      </code>
                    </div>
                  </div>
                  <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', marginBottom: 14 }}>
                    <p style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', marginBottom: 4 }}>Claim Generator</p>
                    <code style={{ fontFamily: 'monospace', fontSize: '0.74rem', color: 'rgba(255,255,255,0.5)' }}>{c2pa.claimGenerator}</code>
                  </div>
                  <p style={{ fontSize: '0.72rem', color: 'rgba(96,165,250,0.5)', marginBottom: 14, lineHeight: 1.5 }}>
                    This asset's provenance is cryptographically signed using the C2PA standard — the same technology used by Adobe Creative Cloud, BBC, Sony, and Leica cameras. Verifiable and court-admissible.
                  </p>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button
                      onClick={async () => {
                        try {
                          toast.loading('Verifying C2PA credentials…', { id: 'c2pa' });
                          const res = await fetch(`${API_URL}/api/media/c2pa-verify/${id}`);
                          const data = await res.json();
                          if (data.has_credentials && data.is_valid) {
                            toast.success(`C2PA Verified — Creator: ${data.summary?.creator || 'verified'}`, { id: 'c2pa', duration: 5000 });
                          } else {
                            toast.error('C2PA verification failed or no credentials', { id: 'c2pa' });
                          }
                        } catch { toast.error('Verification failed', { id: 'c2pa' }); }
                      }}
                      className="ap-btn ap-btn-green" style={{ flex: 1, padding: '8px 16px', fontSize: '0.78rem' }}
                    >
                      Verify Credential
                    </button>
                    {c2pa.c2paUrl && (
                      <a href={c2pa.c2paUrl} target="_blank" rel="noopener noreferrer"
                        className="ap-btn ap-btn-ghost" style={{ flex: 1, padding: '8px 16px', fontSize: '0.78rem', textAlign: 'center', textDecoration: 'none' }}>
                        Download Signed Copy
                      </a>
                    )}
                  </div>
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '16px 0' }}>
                  <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.35)', marginBottom: 12 }}>
                    Sign this asset with C2PA Content Credentials for cryptographic proof of ownership.
                  </p>
                  <button
                    onClick={async () => {
                      try {
                        toast.loading('Signing with C2PA…', { id: 'c2pa' });
                        const res = await fetch(`${API_URL}/api/media/c2pa-sign/${id}`, { method: 'POST' });
                        if (!res.ok) throw new Error();
                        toast.success('C2PA Content Credential signed!', { id: 'c2pa' });
                      } catch { toast.error('C2PA signing failed', { id: 'c2pa' }); }
                    }}
                    className="ap-btn ap-btn-green" style={{ padding: '10px 24px', fontSize: '0.82rem' }}
                  >
                    Sign with C2PA
                  </button>
                </div>
              )}
            </div>
          );
        })()}

        {/* ── Meta PDQ Hash Card ── */}
        {asset.type === 'image' && (() => {
          const pdq = asset.pdqHash;
          const hasPdq = pdq && pdq.hash;
          return (
            <div className="ap-card" style={{ padding: '20px 24px', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
                    <rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
                  </svg>
                  <div>
                    <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.38)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>
                      Meta PDQ Hash
                    </p>
                    <p style={{ fontSize: '0.6rem', color: 'rgba(167,139,250,0.6)', marginTop: 2 }}>
                      Production-grade · 256-bit · Used at billion-scale by Meta
                    </p>
                  </div>
                </div>
                {hasPdq && (
                  <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '3px 10px', borderRadius: 10, color: '#a78bfa', background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.2)' }}>
                    Q:{pdq.quality || 0}
                  </span>
                )}
              </div>
              {hasPdq ? (
                <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <p style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', marginBottom: 4 }}>PDQ Hash (256-bit)</p>
                  <code style={{ fontFamily: 'monospace', fontSize: '0.68rem', color: 'rgba(167,139,250,0.7)', wordBreak: 'break-all', lineHeight: 1.6 }}>{pdq.hash}</code>
                  <p style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.25)', marginTop: 8 }}>
                    Thresholds: ≤31 = near-duplicate · ≤63 = similar · &gt;63 = different
                  </p>
                </div>
              ) : (
                <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.35)', textAlign: 'center', padding: '10px 0' }}>
                  PDQ hash will be generated on upload.
                </p>
              )}
            </div>
          );
        })()}

        {/* ── CLIP Semantic Vector Card ── */}
        {asset.type === 'image' && (() => {
          const clip = asset.clipIndex;
          const hasClip = clip && clip.indexed;
          return (
            <div className="ap-card" style={{ padding: '20px 24px', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f472b6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                    <path d="M11 8v6M8 11h6"/>
                  </svg>
                  <div>
                    <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.38)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>
                      CLIP Semantic Search
                    </p>
                    <p style={{ fontSize: '0.6rem', color: 'rgba(244,114,182,0.6)', marginTop: 2 }}>
                      AI vector search · Catches crops, recolors, memes, AI edits
                    </p>
                  </div>
                </div>
                {hasClip ? (
                  <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '3px 10px', borderRadius: 10, color: '#f472b6', background: 'rgba(244,114,182,0.08)', border: '1px solid rgba(244,114,182,0.2)' }}>
                    {clip.dimensions}D Indexed
                  </span>
                ) : (
                  <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '3px 10px', borderRadius: 10, color: 'rgba(255,255,255,0.35)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    Not Indexed
                  </span>
                )}
              </div>
              <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', marginBottom: 10, lineHeight: 1.5 }}>
                {hasClip
                  ? `This asset's ${clip.dimensions}-dimensional CLIP embedding is stored in the Qdrant vector database. It catches visually similar content even after heavy edits — crops, recolors, meme overlays, AI upscaling, and mirrors.`
                  : 'CLIP embedding will be generated on upload if HuggingFace API is available.'}
              </p>
              {hasClip && (
                <p style={{ fontSize: '0.62rem', color: 'rgba(244,114,182,0.4)', fontStyle: 'italic' }}>
                  Vector ID: {clip.vector_id}
                </p>
              )}
            </div>
          );
        })()}

        {/* ── Forensic Watermark (DCT) Card ── */}
        {asset.type === 'image' && (() => {
          const fw = asset.forensicWatermark;
          const hasFw = fw && fw.algorithm;
          return (
            <div className="ap-card" style={{ padding: '20px 24px', marginBottom: 20, borderColor: hasFw ? 'rgba(251,146,60,0.25)' : undefined }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fb923c" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                  <div>
                    <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.38)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>
                      Forensic Watermark
                    </p>
                    <p style={{ fontSize: '0.6rem', color: 'rgba(251,146,60,0.6)', marginTop: 2 }}>
                      DWT-DCT-SVD · Survives re-compression & screenshots
                    </p>
                  </div>
                </div>
                {hasFw ? (
                  <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '3px 10px', borderRadius: 10, color: '#fb923c', background: 'rgba(251,146,60,0.08)', border: '1px solid rgba(251,146,60,0.2)' }}>
                    {fw.bits_embedded} bits embedded
                  </span>
                ) : (
                  <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '3px 10px', borderRadius: 10, color: 'rgba(255,255,255,0.35)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    Not Embedded
                  </span>
                )}
              </div>

              {hasFw ? (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 14 }}>
                    <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(251,146,60,0.05)', border: '1px solid rgba(251,146,60,0.12)' }}>
                      <p style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', marginBottom: 4 }}>Algorithm</p>
                      <code style={{ fontFamily: 'monospace', fontSize: '0.74rem', color: '#fb923c' }}>{fw.algorithm}</code>
                    </div>
                    <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(251,146,60,0.05)', border: '1px solid rgba(251,146,60,0.12)' }}>
                      <p style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', marginBottom: 4 }}>Session</p>
                      <code style={{ fontFamily: 'monospace', fontSize: '0.72rem', color: '#fb923c' }}>{fw.session_id?.slice(0, 8)}…</code>
                    </div>
                    <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(251,146,60,0.05)', border: '1px solid rgba(251,146,60,0.12)' }}>
                      <p style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', marginBottom: 4 }}>Payload Hash</p>
                      <code style={{ fontFamily: 'monospace', fontSize: '0.72rem', color: '#fb923c' }}>{fw.payload_hash}</code>
                    </div>
                  </div>
                  <p style={{ fontSize: '0.72rem', color: 'rgba(251,146,60,0.5)', marginBottom: 14, lineHeight: 1.5 }}>
                    Unlike LSB steganography, this DCT-domain watermark survives JPEG re-compression, screenshots, and social media re-encoding. If a leak surfaces, extract the watermark to identify the exact session that leaked it.
                  </p>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button
                      onClick={async () => {
                        try {
                          toast.loading('Extracting forensic watermark…', { id: 'fwm' });
                          const res = await fetch(`${API_URL}/api/media/extract-forensic-watermark/${id}`);
                          const data = await res.json();
                          if (data.found && data.integrity_valid) {
                            toast.success(`Watermark verified — Leaker: ${data.leaker_id || 'unknown'} | Session: ${data.session_id || 'unknown'}`, { id: 'fwm', duration: 6000 });
                          } else if (data.found) {
                            toast.success('Watermark found but integrity check failed', { id: 'fwm' });
                          } else {
                            toast.error('No forensic watermark detected', { id: 'fwm' });
                          }
                        } catch { toast.error('Extraction failed', { id: 'fwm' }); }
                      }}
                      className="ap-btn ap-btn-green" style={{ flex: 1, padding: '8px 16px', fontSize: '0.78rem' }}
                    >
                      Verify Watermark
                    </button>
                    {asset.forensicWmUrl && (
                      <a href={asset.forensicWmUrl} target="_blank" rel="noopener noreferrer"
                        className="ap-btn ap-btn-ghost" style={{ flex: 1, padding: '8px 16px', fontSize: '0.78rem', textAlign: 'center', textDecoration: 'none' }}>
                        Download Protected Copy
                      </a>
                    )}
                  </div>
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '16px 0' }}>
                  <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.35)', marginBottom: 12 }}>
                    Embed a forensic watermark that survives re-compression and screenshots.
                  </p>
                  <button
                    onClick={async () => {
                      try {
                        toast.loading('Embedding forensic watermark…', { id: 'fwm' });
                        const res = await fetch(`${API_URL}/api/media/forensic-watermark/${id}`, { method: 'POST' });
                        if (!res.ok) throw new Error();
                        toast.success('Forensic watermark embedded!', { id: 'fwm' });
                      } catch { toast.error('Embedding failed', { id: 'fwm' }); }
                    }}
                    className="ap-btn ap-btn-green" style={{ padding: '10px 24px', fontSize: '0.82rem' }}
                  >
                    Embed Forensic Watermark
                  </button>
                </div>
              )}
            </div>
          );
        })()}

        {/* ── S11: Proof of Ownership Card ── */}
        {(() => {
          const proof = asset.ownershipProof;
          const hasProof = proof && proof.proofId;
          return (
            <div className="ap-card" style={{ padding: '20px 24px', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                    <polyline points="9 12 11 14 15 10"/>
                  </svg>
                  <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.38)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>
                    Proof of Ownership
                  </p>
                </div>
                {hasProof ? (
                  <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '3px 10px', borderRadius: 10, color: '#4ade80', background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)' }}>
                    Verified
                  </span>
                ) : (
                  <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '3px 10px', borderRadius: 10, color: 'rgba(255,255,255,0.35)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    Not Generated
                  </span>
                )}
              </div>

              {hasProof ? (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 14 }}>
                    <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(251,191,36,0.05)', border: '1px solid rgba(251,191,36,0.12)' }}>
                      <p style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', marginBottom: 4 }}>Proof ID</p>
                      <code style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: '#fbbf24' }}>{proof.proofId}</code>
                    </div>
                    <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(251,191,36,0.05)', border: '1px solid rgba(251,191,36,0.12)' }}>
                      <p style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', marginBottom: 4 }}>Timestamp</p>
                      <code style={{ fontFamily: 'monospace', fontSize: '0.72rem', color: '#fbbf24' }}>
                        {proof.timestamp ? new Date(proof.timestamp).toLocaleString() : '—'}
                      </code>
                    </div>
                  </div>
                  <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', marginBottom: 14 }}>
                    <p style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', marginBottom: 4 }}>SHA-256 File Hash</p>
                    <code style={{ fontFamily: 'monospace', fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', wordBreak: 'break-all' }}>{proof.fileHash}</code>
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <a href={`${API_URL}/api/media/proof-certificate/${id}`}
                      className="ap-btn ap-btn-green" style={{ flex: 1, padding: '8px 16px', fontSize: '0.78rem', textAlign: 'center', textDecoration: 'none' }}>
                      Download Certificate
                    </a>
                    <button
                      onClick={async () => {
                        try {
                          toast.loading('Verifying proof…', { id: 'proof' });
                          const res = await fetch(`${API_URL}/api/media/proof/${id}`);
                          const data = await res.json();
                          toast.success(`Proof ${data.proofId} — Status: ${data.status}`, { id: 'proof', duration: 5000 });
                        } catch { toast.error('Verification failed', { id: 'proof' }); }
                      }}
                      className="ap-btn ap-btn-ghost" style={{ flex: 1, padding: '8px 16px', fontSize: '0.78rem' }}
                    >
                      Verify Proof
                    </button>
                  </div>
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '16px 0' }}>
                  <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.35)', marginBottom: 12 }}>
                    No ownership proof generated yet.
                  </p>
                  <button
                    onClick={async () => {
                      try {
                        toast.loading('Generating ownership proof…', { id: 'proof' });
                        const res = await fetch(`${API_URL}/api/media/proof/${id}`, { method: 'POST' });
                        if (!res.ok) throw new Error();
                        toast.success('Ownership proof created', { id: 'proof' });
                      } catch { toast.error('Failed to generate proof', { id: 'proof' }); }
                    }}
                    className="ap-btn ap-btn-green" style={{ padding: '10px 24px', fontSize: '0.82rem' }}
                  >
                    Generate Ownership Proof
                  </button>
                </div>
              )}
            </div>
          );
        })()}

        {/* ── S12: Monitoring / Scheduled Scans Card ── */}
        <div className="ap-card" style={{ padding: '20px 24px', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
              <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.38)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>
                Monitoring
              </p>
            </div>
            {asset.monitoringEnabled ? (
              <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '3px 10px', borderRadius: 10, color: '#4ade80', background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)' }}>
                Active — every {asset.monitoringInterval || 24}h
              </span>
            ) : (
              <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '3px 10px', borderRadius: 10, color: 'rgba(255,255,255,0.35)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                Inactive
              </span>
            )}
          </div>
          <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)', marginBottom: 14 }}>
            {asset.monitoringEnabled
              ? 'This asset is being periodically re-scanned to detect new unauthorized copies.'
              : 'Enable monitoring to automatically re-scan this asset on a schedule.'}
          </p>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={async () => {
                try {
                  toast.loading('Starting re-scan…', { id: 'rescan' });
                  const res = await fetch(`${API_URL}/api/media/rescan/${id}`, { method: 'POST' });
                  if (!res.ok) throw new Error();
                  toast.success('Re-scan started', { id: 'rescan' });
                } catch { toast.error('Re-scan failed', { id: 'rescan' }); }
              }}
              className="ap-btn ap-btn-green" style={{ flex: 1, padding: '8px 16px', fontSize: '0.78rem' }}
            >
              Scan Now
            </button>
            {asset.monitoringEnabled ? (
              <button
                onClick={async () => {
                  try {
                    const res = await fetch(`${API_URL}/api/media/schedule/${id}`, { method: 'DELETE' });
                    if (!res.ok) throw new Error();
                    toast.success('Monitoring disabled');
                  } catch { toast.error('Failed'); }
                }}
                className="ap-btn ap-btn-ghost" style={{ flex: 1, padding: '8px 16px', fontSize: '0.78rem' }}
              >
                Disable Monitoring
              </button>
            ) : (
              <button
                onClick={async () => {
                  try {
                    const res = await fetch(`${API_URL}/api/media/schedule/${id}`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ intervalHours: 24 }),
                    });
                    if (!res.ok) throw new Error();
                    toast.success('Monitoring enabled — scanning every 24h');
                  } catch { toast.error('Failed'); }
                }}
                className="ap-btn ap-btn-ghost" style={{ flex: 1, padding: '8px 16px', fontSize: '0.78rem' }}
              >
                Enable 24h Monitoring
              </button>
            )}
          </div>
          {asset.lastScannedAt && (
            <p style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.25)', marginTop: 10, textAlign: 'center' }}>
              Last scanned: {(() => { try { const d = asset.lastScannedAt?.toDate?.() || new Date(asset.lastScannedAt); return formatDistanceToNow(d, { addSuffix: true }); } catch { return '—'; } })()}
            </p>
          )}
        </div>

        {/* ── S7: DMCA Takedown Card ── */}
        {(asset.matchCount || 0) > 0 && (
          <div className="ap-card" style={{ padding: '20px 24px', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="12" y1="18" x2="12" y2="12"/>
                  <line x1="9" y1="15" x2="15" y2="15"/>
                </svg>
                <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.38)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>
                  DMCA Takedown
                </p>
              </div>
              {asset.dmcaCount > 0 && (
                <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '3px 10px', borderRadius: 10, color: '#f87171', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)' }}>
                  {asset.dmcaCount} notice{asset.dmcaCount !== 1 ? 's' : ''} sent
                </span>
              )}
            </div>
            <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)', marginBottom: 14 }}>
              Generate DMCA takedown notices for all unauthorized copies detected in scans.
            </p>
            <button
              onClick={async () => {
                try {
                  toast.loading('Generating DMCA notices…', { id: 'dmca' });
                  const res = await fetch(`${API_URL}/api/media/dmca-batch/${id}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      ownerName: 'SportShield User',
                      ownerEmail: 'user@sportshield.app',
                    }),
                  });
                  if (!res.ok) throw new Error();
                  const data = await res.json();
                  toast.success(`Generated ${data.noticesGenerated} DMCA notice(s)`, { id: 'dmca', duration: 5000 });
                } catch { toast.error('Failed to generate notices', { id: 'dmca' }); }
              }}
              className="ap-btn ap-btn-green" style={{ width: '100%', padding: '10px 24px', fontSize: '0.82rem' }}
            >
              Generate DMCA Notices for All Unauthorized Copies
            </button>
          </div>
        )}

        {/* ── S14: Content Licensing Card ── */}
        <div className="ap-card" style={{ padding: '20px 24px', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.38)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>
                Content Licensing
              </p>
            </div>
          </div>
          <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)', marginBottom: 14 }}>
            Manage who is licensed to use this content and on which platforms.
          </p>
          <button
            onClick={async () => {
              try {
                toast.loading('Creating license…', { id: 'lic' });
                const res = await fetch(`${API_URL}/api/media/license/${id}`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    licenseeName: 'Example Partner',
                    licenseeEmail: 'partner@example.com',
                    licenseType: 'non_exclusive',
                    durationDays: 365,
                    territory: 'worldwide',
                  }),
                });
                if (!res.ok) throw new Error();
                const data = await res.json();
                toast.success(`License ${data.licenseId} created`, { id: 'lic', duration: 5000 });
              } catch { toast.error('Failed to create license', { id: 'lic' }); }
            }}
            className="ap-btn ap-btn-ghost" style={{ width: '100%', padding: '8px 16px', fontSize: '0.78rem' }}
          >
            Create New License
          </button>
          <button
            onClick={async () => {
              try {
                toast.loading('Loading licenses…', { id: 'lic-list' });
                const res = await fetch(`${API_URL}/api/media/licenses/${id}`);
                const data = await res.json();
                if (data.licenses?.length > 0) {
                  toast.success(`${data.licenses.length} license(s) found — ${data.licenses.map(l => `${l.licenseId}: ${l.licensee?.name}`).join(', ')}`, { id: 'lic-list', duration: 8000 });
                } else {
                  toast.success('No licenses found for this asset', { id: 'lic-list' });
                }
              } catch { toast.error('Failed to load licenses', { id: 'lic-list' }); }
            }}
            className="ap-btn ap-btn-ghost" style={{ width: '100%', padding: '8px 16px', fontSize: '0.78rem', marginTop: 8 }}
          >
            View Existing Licenses
          </button>
        </div>

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
                  <div style={{ marginBottom: 12, display:"flex", justifyContent:"center" }}><svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="rgba(74,222,128,0.4)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></div>
                  <p className="ap-subheading" style={{ marginBottom: 6 }}>Scanning in progress…</p>
                  <p className="ap-muted">Results appear here automatically when ready.</p>
                </>
              ) : asset.status === 'complete' ? (
                <>
                  <div style={{ marginBottom: 12, display:"flex", justifyContent:"center" }}><svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></div>
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
                const isAuthorized = result.classification === 'authorized';
                const isHigh     = !isAuthorized && confidence >= 90;
                const barColor   = isAuthorized ? '#4ade80' : isHigh ? '#ef4444' : '#f59e0b';
                const borderColor = isAuthorized ? 'rgba(74,222,128,0.25)' : isHigh ? 'rgba(239,68,68,0.28)' : 'rgba(245,158,11,0.25)';
                const bgColor    = isAuthorized ? 'rgba(74,222,128,0.04)' : isHigh ? 'rgba(239,68,68,0.05)' : 'rgba(245,158,11,0.04)';
                return (
                  <div key={result.id} style={{ borderRadius: 12, overflow: 'hidden', border: `1px solid ${borderColor}`, background: bgColor }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, padding: 16 }}>
                      {result.thumbnailUrl ? (
                        <img src={result.thumbnailUrl} alt="" style={{ width: 60, height: 60, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
                      ) : (
                        <div style={{ width: 60, height: 60, borderRadius: 8, background: 'rgba(26,92,26,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg></div>
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
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <a href={result.foundUrl} target="_blank" rel="noopener noreferrer"
                            style={{ fontSize: '0.8rem', color: '#60a5fa', textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                            ↗ {result.foundUrl}
                          </a>
                          {result.classification && (
                            <span style={{
                              flexShrink: 0, fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase',
                              letterSpacing: '0.06em', padding: '2px 8px', borderRadius: 10,
                              color: isAuthorized ? '#4ade80' : '#f87171',
                              background: isAuthorized ? 'rgba(74,222,128,0.1)' : 'rgba(248,113,113,0.1)',
                              border: `1px solid ${isAuthorized ? 'rgba(74,222,128,0.2)' : 'rgba(248,113,113,0.2)'}`,
                            }}>
                              {result.classification}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
