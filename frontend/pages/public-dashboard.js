import { useState, useEffect } from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { subscribeToPublicAssets, subscribeToPublicAlerts } from '../lib/firebase';

export default function PublicDashboard() {
  const [assets,  setAssets]  = useState([]);
  const [alerts,  setAlerts]  = useState([]);
  const [filter,  setFilter]  = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const u1 = subscribeToPublicAssets(data => { setAssets(data); setLoading(false); });
    const u2 = subscribeToPublicAlerts(setAlerts);
    return () => { u1(); u2(); };
  }, []);

  // Build alert map: assetId → alerts[]
  const alertsByAsset = {};
  alerts.forEach(a => {
    if (!alertsByAsset[a.assetId]) alertsByAsset[a.assetId] = [];
    alertsByAsset[a.assetId].push(a);
  });

  const filtered = assets.filter(a => {
    if (filter === 'violations') return (alertsByAsset[a.id]?.length || 0) > 0;
    if (filter === 'clean')      return (alertsByAsset[a.id]?.length || 0) === 0;
    return true;
  });

  const totalViolations = alerts.length;
  const violatedAssets  = assets.filter(a => (alertsByAsset[a.id]?.length || 0) > 0).length;

  return (
    <div className="ap-root">
      {/* Nav */}
      <nav className="ap-nav">
        <div className="ap-nav-left">
          <Link href="/landing" className="ap-logo">
            <img src="/images/sportshield-logo-transparent.png" alt="SportShield" />
            <span className="ap-logo-text">SPORTSHIELD</span>
          </Link>
          <span className="ap-page-tag" style={{ marginLeft: 4 }}>/ Community</span>
        </div>
        <div className="ap-nav-right">
          <Link href="/verify"  className="ap-nav-link">Verify URL</Link>
          <Link href="/login"   className="ap-nav-link">Dashboard →</Link>
          <Link href="/signup"  className="ap-btn ap-btn-green" style={{ padding: '8px 18px', fontSize: '0.78rem' }}>
            Join Free
          </Link>
        </div>
      </nav>

      <main style={{ maxWidth: 1060, margin: '0 auto', padding: '40px 24px' }}>

        {/* Header */}
        <div style={{ marginBottom: 36 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(26,92,26,0.18)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: 20, padding: '4px 14px', marginBottom: 18 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#4ade80', display: 'inline-block' }} />
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.78rem', color: '#4ade80', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              Live Community Dashboard
            </span>
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 'clamp(2rem,5vw,3rem)', color: '#fff', lineHeight: 1.05, marginBottom: 14 }}>
            Sports Media<br />
            <span style={{ color: '#4ade80' }}>Protected in Public</span>
          </h1>
          <p className="ap-muted" style={{ maxWidth: 540, fontSize: '1rem', lineHeight: 1.7 }}>
            Every asset on this page is actively monitored by SportShield. Creators choose to share their protection status publicly — adding transparency to the fight against sports IP theft.
          </p>
        </div>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 36 }}>
          {[
            { label: 'Assets Monitored',   value: assets.length,     accent: 'rgba(26,92,26,0.3)' },
            { label: 'Total Violations',   value: totalViolations,   accent: 'rgba(239,68,68,0.2)' },
            { label: 'Assets with Issues', value: violatedAssets,    accent: 'rgba(245,158,11,0.2)' },
            { label: 'Clean Assets',       value: assets.length - violatedAssets, accent: 'rgba(74,222,128,0.15)' },
          ].map(s => (
            <div key={s.label} className="ap-card" style={{ padding: '18px 20px', borderColor: s.accent }}>
              <div className="ap-stat-num">{s.value}</div>
              <div className="ap-stat-label">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filter pills */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 22, flexWrap: 'wrap' }}>
          {[
            { key: 'all',        label: `All Assets (${assets.length})` },
            { key: 'violations', label: `Has Violations (${violatedAssets})` },
            { key: 'clean',      label: `Clean (${assets.length - violatedAssets})` },
          ].map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={`ap-filter ${filter === f.key ? 'active' : ''}`}>
              {f.label}
            </button>
          ))}
        </div>

        {/* Asset grid */}
        {loading ? (
          <div className="ap-card" style={{ padding: 64, textAlign: 'center' }}>
            <p className="ap-muted">Loading community assets…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="ap-card" style={{ padding: 64, textAlign: 'center' }}>
            <div style={{ marginBottom: 16, display:"flex", justifyContent:"center" }}><svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="rgba(74,222,128,0.5)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="18" rx="2"/><path d="M8 21V3M16 21V3M2 12h20"/></svg></div>
            <p className="ap-subheading" style={{ marginBottom: 8 }}>No assets here yet</p>
            <p className="ap-muted" style={{ marginBottom: 24 }}>Be the first to protect your sports media publicly.</p>
            <Link href="/signup" className="ap-btn ap-btn-green">Start Protecting Free →</Link>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 18 }}>
            {filtered.map(asset => {
              const assetAlerts = alertsByAsset[asset.id] || [];
              const violations  = assetAlerts.length;
              const maxConf     = violations > 0
                ? Math.round(Math.max(...assetAlerts.map(a => a.confidence || 0)) * 100)
                : 0;
              const uploadedAt  = asset.uploadedAt?.toDate?.() || new Date();

              return (
                <div key={asset.id} className="ap-card" style={{ overflow: 'hidden', transition: 'border-color 0.2s, transform 0.2s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(74,222,128,0.4)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(26,92,26,0.28)'; e.currentTarget.style.transform = 'none'; }}
                >
                  {/* Thumbnail */}
                  <div style={{ height: 160, background: 'rgba(26,92,26,0.15)', position: 'relative', overflow: 'hidden' }}>
                    {asset.originalUrl ? (
                      <img src={asset.originalUrl} alt={asset.filename}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem' }}>
                        {asset.type === 'video' ? 'Video' : 'Image'}
                      </div>
                    )}
                    {/* Violation badge overlay */}
                    {violations > 0 && (
                      <div style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(239,68,68,0.9)', color: '#fff', borderRadius: 20, padding: '3px 10px', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '0.75rem' }}>
                        ! {violations} violation{violations !== 1 ? 's' : ''}
                      </div>
                    )}
                    {violations === 0 && (
                      <div style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(74,222,128,0.85)', color: '#081008', borderRadius: 20, padding: '3px 10px', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '0.75rem' }}>
                        Clean
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div style={{ padding: '16px 18px' }}>
                    <p style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1rem', color: '#fff', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {asset.filename || 'Unnamed Asset'}
                    </p>
                    <p className="ap-muted" style={{ fontSize: '0.75rem', marginBottom: 12 }}>
                      {asset.type || 'image'} · {formatDistanceToNow(uploadedAt, { addSuffix: true })}
                    </p>

                    {violations > 0 ? (
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                          <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>Highest confidence</span>
                          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '0.88rem', color: '#f87171' }}>{maxConf}%</span>
                        </div>
                        <div className="ap-conf-bar-track">
                          <div className="ap-conf-bar-fill" style={{ width: `${maxConf}%`, background: maxConf >= 90 ? '#ef4444' : '#f59e0b' }} />
                        </div>
                        {/* Top violation URL */}
                        {assetAlerts[0]?.foundUrl && (
                          <a href={assetAlerts[0].foundUrl} target="_blank" rel="noopener noreferrer"
                            style={{ display: 'block', fontSize: '0.72rem', color: '#60a5fa', textDecoration: 'none', marginTop: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            ↗ {assetAlerts[0].foundUrl}
                          </a>
                        )}
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.82rem', color: '#4ade80' }}>
                          No violations detected
                        </span>
                      </div>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14, paddingTop: 12, borderTop: '1px solid rgba(26,92,26,0.18)' }}>
                      <span className={`ap-badge ${asset.status === 'complete' ? 'ap-badge-complete' : asset.status === 'scanning' ? 'ap-badge-scanning' : 'ap-badge-pending'}`}>
                        {asset.status || 'pending'}
                      </span>
                      <span className="ap-muted" style={{ fontSize: '0.72rem', marginLeft: 'auto' }}>
                        {asset.scanCount || 0} scan{asset.scanCount !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* CTA */}
        {!loading && filtered.length > 0 && (
          <div style={{ textAlign: 'center', marginTop: 56, padding: '40px 32px', background: 'rgba(26,92,26,0.12)', border: '1px solid rgba(26,92,26,0.28)', borderRadius: 16 }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '2rem', color: '#fff', marginBottom: 12 }}>
              Protect Your Sports Media Too
            </h2>
            <p className="ap-muted" style={{ marginBottom: 24, maxWidth: 480, margin: '0 auto 24px' }}>
              Join thousands of sports creators who use SportShield to monitor, detect, and act against unauthorized media use.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href="/signup" className="ap-btn ap-btn-green">Start Free — No Credit Card</Link>
              <Link href="/verify" className="ap-btn ap-btn-ghost">Verify a URL</Link>
            </div>
          </div>
        )}
      </main>

      <footer style={{ textAlign: 'center', padding: '20px', fontSize: '0.78rem', color: 'rgba(255,255,255,0.2)', borderTop: '1px solid rgba(26,92,26,0.15)', marginTop: 40 }}>
        SportShield — Google Solutions Challenge 2026 · Public data only
      </footer>
    </div>
  );
}
