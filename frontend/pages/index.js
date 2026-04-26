import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { subscribeToAssets, subscribeToAlerts, markAlertRead } from '../lib/firebase';
import { useAuth } from '../lib/useAuth';
import ProfileAvatar from '../components/ProfileAvatar';

/* ── shared dark-green design tokens (mirrors sportshield.css) ── */
const C = {
  bg:        '#0a1210',
  card:      'rgba(13,26,16,0.85)',
  cardBorder:'rgba(26,92,26,0.35)',
  navBg:     'rgba(10,18,12,0.96)',
  navBorder: 'rgba(26,92,26,0.4)',
  green:     '#1a5c1a',
  greenLight:'#3caa3c',
  greenGlow: 'rgba(26,92,26,0.25)',
  text:      '#d4e8d4',
  muted:     'rgba(255,255,255,0.45)',
  heading:   '#ffffff',
};

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [assets,  setAssets]  = useState([]);
  const [alerts,  setAlerts]  = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) router.replace('/landing');
  }, [user, authLoading]);

  useEffect(() => {
    const unsubAssets = subscribeToAssets(data => { setAssets(data); setLoading(false); });
    const unsubAlerts = subscribeToAlerts(data => setAlerts(data));
    return () => { unsubAssets(); unsubAlerts(); };
  }, []);

  const unread       = alerts.filter(a => !a.isRead).length;
  const totalMatches = assets.reduce((s, a) => s + (a.matchCount || 0), 0);
  const scanning     = assets.filter(a => a.status === 'scanning').length;

  const protectionScore = Math.max(0, 100 - unread * 10 - scanning * 5);
  const ringColor =
    protectionScore >= 80 ? '#3caa3c'
    : protectionScore >= 50 ? '#d97706'
    : '#dc2626';

  if (authLoading) return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: C.muted, fontFamily: 'Barlow, sans-serif' }}>Loading…</p>
    </div>
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;800;900&family=Barlow:wght@400;500;600&display=swap');
        * { box-sizing: border-box; }
        body { margin: 0; background: ${C.bg}; }

        .db-nav {
          position: sticky; top: 0; z-index: 100;
          background: ${C.navBg};
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border-bottom: 1px solid ${C.navBorder};
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 32px; height: 62px;
        }
        .db-logo { display: flex; align-items: center; gap: 10px; text-decoration: none; }
        .db-logo img { height: 32px; width: auto; }
        .db-logo-text {
          font-family: 'Barlow Condensed', sans-serif; font-weight: 900;
          font-size: 1.3rem; color: #5cc85c; letter-spacing: 0.06em;
        }
        .db-nav-link {
          font-family: 'Barlow', sans-serif; font-size: 0.87rem; font-weight: 500;
          color: rgba(255,255,255,0.65); text-decoration: none;
          padding: 7px 14px; border-radius: 6px; transition: color 0.2s, background 0.2s;
        }
        .db-nav-link:hover { color: #5cc85c; background: rgba(26,92,26,0.15); }
        .db-upload-btn {
          background: #1a5c1a; color: #fff; font-family: 'Barlow Condensed', sans-serif;
          font-weight: 800; font-size: 0.85rem; letter-spacing: 0.06em;
          padding: 9px 20px; border-radius: 6px; text-decoration: none;
          text-transform: uppercase; transition: background 0.2s;
          box-shadow: 0 2px 12px rgba(26,92,26,0.4);
        }
        .db-upload-btn:hover { background: #237523; }
        .db-bell { position: relative; color: rgba(255,255,255,0.65); font-size: 1.3rem; cursor: pointer; text-decoration: none; }

        .db-card {
          background: ${C.card};
          border: 1px solid ${C.cardBorder};
          border-radius: 14px;
        }

        .db-stat-label {
          font-family: 'Barlow', sans-serif; font-size: 0.75rem;
          color: ${C.muted}; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.06em;
        }
        .db-stat-value {
          font-family: 'Barlow Condensed', sans-serif; font-weight: 900;
          font-size: 2.4rem; color: #fff; line-height: 1;
        }

        .db-section-title {
          font-family: 'Barlow Condensed', sans-serif; font-weight: 800;
          font-size: 1.25rem; color: ${C.heading}; letter-spacing: 0.02em;
        }

        .db-table { width: 100%; border-collapse: collapse; }
        .db-table thead tr { border-bottom: 1px solid rgba(26,92,26,0.25); }
        .db-table thead th {
          padding: 12px 20px; text-align: left;
          font-family: 'Barlow', sans-serif; font-size: 0.7rem;
          font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase;
          color: ${C.muted};
        }
        .db-table tbody tr {
          border-bottom: 1px solid rgba(26,92,26,0.12);
          transition: background 0.15s; cursor: pointer;
        }
        .db-table tbody tr:last-child { border-bottom: none; }
        .db-table tbody tr:hover { background: rgba(26,92,26,0.1); }
        .db-table td { padding: 12px 20px; font-family: 'Barlow', sans-serif; }

        .db-badge {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 3px 10px; border-radius: 20px;
          font-size: 0.72rem; font-weight: 600; font-family: 'Barlow', sans-serif;
        }
        .db-badge-complete  { background: rgba(26,92,26,0.25);  color: #5cc85c; border: 1px solid rgba(92,200,92,0.25); }
        .db-badge-scanning  { background: rgba(6,78,59,0.25);   color: #34d399; border: 1px solid rgba(52,211,153,0.25); }
        .db-badge-pending   { background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.5); border: 1px solid rgba(255,255,255,0.1); }
        .db-badge-error     { background: rgba(220,38,38,0.15); color: #f87171; border: 1px solid rgba(248,113,113,0.25); }

        .db-alert-row {
          display: flex; align-items: center; gap: 14px;
          padding: 14px 18px; border-radius: 10px;
          border: 1px solid rgba(220,38,38,0.25);
          background: rgba(220,38,38,0.07);
          margin-bottom: 8px;
        }
        .db-dismiss-btn {
          font-family: 'Barlow', sans-serif; font-size: 0.75rem; font-weight: 600;
          padding: 5px 12px; border-radius: 6px; cursor: pointer;
          border: 1px solid rgba(255,255,255,0.18); background: none;
          color: rgba(255,255,255,0.5); transition: color 0.2s, border-color 0.2s;
          flex-shrink: 0;
        }
        .db-dismiss-btn:hover { color: #fff; border-color: rgba(255,255,255,0.4); }
        .db-view-all {
          font-family: 'Barlow Condensed', sans-serif; font-weight: 700; font-size: 0.82rem;
          letter-spacing: 0.06em; color: #3caa3c; text-decoration: none;
          text-transform: uppercase; transition: color 0.2s;
        }
        .db-view-all:hover { color: #5cc85c; }
      `}</style>

      <div style={{ minHeight: '100vh', background: C.bg, fontFamily: 'Barlow, sans-serif' }}>

        {/* ── Navbar ── */}
        <nav className="db-nav">
          <Link href="/" className="db-logo">
            <img src="/images/sportshield-logo-transparent.png" alt="SportShield" />
            <span className="db-logo-text">SPORTSHIELD</span>
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Link href="/public-dashboard" className="db-nav-link">Community</Link>
            <Link href="/analytics" className="db-nav-link">Analytics</Link>
            <Link href="/settings"  className="db-nav-link">Settings</Link>
            <Link href="/upload"    className="db-upload-btn" style={{ marginLeft: 8 }}>+ Upload</Link>
            <ProfileAvatar />
            <Link href="/alerts"    className="db-bell" style={{ marginLeft: 14 }}>
              &#128276;
              {unread > 0 && (
                <span style={{
                  position: 'absolute', top: -4, right: -4,
                  background: '#dc2626', color: '#fff',
                  fontSize: '0.6rem', fontWeight: 700,
                  borderRadius: '50%', width: 16, height: 16,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </Link>
          </div>
        </nav>

        <main style={{ maxWidth: 1060, margin: '0 auto', padding: '32px 24px' }}>

          {/* ── Protection Score ── */}
          <div className="db-card" style={{ padding: '24px 28px', marginBottom: 28, display: 'flex', alignItems: 'center', gap: 24 }}>
            {/* Ring */}
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <svg width="88" height="88" viewBox="0 0 88 88">
                <circle cx="44" cy="44" r="36" fill="none" stroke="rgba(26,92,26,0.25)" strokeWidth="8" />
                <circle
                  cx="44" cy="44" r="36"
                  fill="none"
                  stroke={ringColor}
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 36}`}
                  strokeDashoffset={`${2 * Math.PI * 36 * (1 - protectionScore / 100)}`}
                  transform="rotate(-90 44 44)"
                  style={{ transition: 'stroke-dashoffset 0.6s ease', filter: `drop-shadow(0 0 6px ${ringColor}60)` }}
                />
              </svg>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: '1.5rem', color: ringColor }}>
                  {protectionScore}
                </span>
              </div>
            </div>
            {/* Text */}
            <div style={{ flex: 1 }}>
              <p style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: '1.3rem', color: '#fff', marginBottom: 4 }}>
                Protection Score
              </p>
              <p style={{ color: C.muted, fontSize: '0.87rem', marginBottom: 14 }}>
                {protectionScore >= 80
                  ? 'Your assets are well protected.'
                  : protectionScore >= 50
                  ? 'Some alerts need your attention.'
                  : 'High risk — review your alerts now.'}
              </p>
              <div style={{ display: 'flex', gap: 10 }}>
                <Link href="/analytics" style={{
                  fontSize: '0.78rem', color: '#3caa3c',
                  border: '1px solid rgba(60,170,60,0.3)', borderRadius: 6,
                  padding: '5px 12px', textDecoration: 'none',
                  fontFamily: "'Barlow', sans-serif", fontWeight: 600,
                  transition: 'border-color 0.2s',
                }}>View Analytics</Link>
                {unread > 0 && (
                  <Link href="/alerts" style={{
                    fontSize: '0.78rem', color: '#f87171',
                    border: '1px solid rgba(248,113,113,0.3)', borderRadius: 6,
                    padding: '5px 12px', textDecoration: 'none',
                    fontFamily: "'Barlow', sans-serif", fontWeight: 600,
                  }}>{unread} Unread Alert{unread !== 1 ? 's' : ''}</Link>
                )}
              </div>
            </div>
          </div>

          {/* ── Stats Grid ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 28 }}>
            {[
              { label: 'Assets Protected', value: assets.length,  color: '#4ade80', accent: 'rgba(26,92,26,0.3)' },
              { label: 'Matches Found',    value: totalMatches,   color: '#f87171', accent: 'rgba(220,38,38,0.2)' },
              { label: 'Unread Alerts',    value: unread,         color: '#fbbf24', accent: 'rgba(217,119,6,0.2)'  },
              { label: 'Scanning Now',     value: scanning,       color: '#34d399', accent: 'rgba(52,211,153,0.15)'},
            ].map(s => (
              <div key={s.label} className="db-card" style={{ padding: '18px 20px', borderColor: s.accent }}>
                <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: '2.6rem', color: s.color, lineHeight: 1, marginBottom: 4 }}>
                  {s.value}
                </div>
                <div className="db-stat-label">{s.label}</div>
              </div>
            ))}
          </div>

          {/* ── Recent Alerts ── */}
          {unread > 0 && (
            <section style={{ marginBottom: 28 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <span className="db-section-title">Recent Alerts</span>
                <Link href="/alerts" className="db-view-all">View all →</Link>
              </div>
              {alerts.filter(a => !a.isRead).slice(0, 3).map(alert => {
                const pct = Math.round((alert.confidence || 0) * 100);
                return (
                  <div key={alert.id} className="db-alert-row">
                    <span style={{ flexShrink: 0, color: '#f87171', display:'flex' }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: '0.88rem', fontWeight: 600, color: '#fff', marginBottom: 3 }}>
                        {pct}% confidence — unauthorized copy detected
                      </p>
                      <p style={{ fontSize: '0.78rem', color: '#60a5fa', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {alert.foundUrl}
                      </p>
                    </div>
                    <button className="db-dismiss-btn" onClick={() => markAlertRead(alert.id)}>Dismiss</button>
                  </div>
                );
              })}
            </section>
          )}

          {/* ── Protected Assets ── */}
          <section>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <span className="db-section-title">Protected Assets</span>
              <span style={{ fontSize: '0.82rem', color: C.muted }}>{assets.length} total</span>
            </div>

            {loading ? (
              <div className="db-card" style={{ padding: 48, textAlign: 'center', color: C.muted }}>Loading…</div>
            ) : assets.length === 0 ? (
              <div className="db-card" style={{ padding: 56, textAlign: 'center' }}>
                <div style={{ marginBottom: 16, display:'flex', justifyContent:'center' }}><svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="rgba(74,222,128,0.6)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></div>
                <p style={{ color: '#fff', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: '1.2rem', marginBottom: 8 }}>
                  No assets yet
                </p>
                <p style={{ color: C.muted, fontSize: '0.87rem', marginBottom: 24, maxWidth: 360, margin: '0 auto 24px' }}>
                  Upload an image or video to start monitoring for unauthorized use.
                </p>
                <Link href="/upload" style={{
                  display: 'inline-block', background: '#1a5c1a', color: '#fff',
                  fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800,
                  fontSize: '0.85rem', letterSpacing: '0.06em', textTransform: 'uppercase',
                  padding: '11px 28px', borderRadius: 8, textDecoration: 'none',
                  boxShadow: '0 4px 16px rgba(26,92,26,0.4)',
                }}>Upload your first asset</Link>
              </div>
            ) : (
              <div className="db-card" style={{ overflow: 'hidden' }}>
                <div className="db-table-wrap" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                <table className="db-table">
                  <thead>
                    <tr>
                      <th>Asset</th>
                      <th>Status</th>
                      <th>Matches</th>
                      <th>Scans</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assets.map(asset => <AssetRow key={asset.id} asset={asset} />)}
                  </tbody>
                </table>
                </div>
              </div>
            )}
          </section>
        </main>
      </div>
    </>
  );
}

function AssetRow({ asset }) {
  const router = useRouter();
  const badgeMap = {
    pending:  { label: 'Pending',  cls: 'db-badge-pending'  },
    scanning: { label: 'Scanning', cls: 'db-badge-scanning' },
    complete: { label: 'Complete', cls: 'db-badge-complete' },
    error:    { label: 'Error',    cls: 'db-badge-error'    },
  };
  const { label, cls } = badgeMap[asset.status] || badgeMap.pending;

  return (
    <tr onClick={() => router.push(`/assets/${asset.id}`)}>
      <td>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {asset.originalUrl ? (
            <img src={asset.originalUrl} alt="" style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover', background: 'rgba(26,92,26,0.2)', flexShrink: 0 }}
              onError={e => { e.target.style.display = 'none'; }} />
          ) : (
            <div style={{ width: 40, height: 40, borderRadius: 8, background: 'rgba(26,92,26,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '1.2rem' }}>
              {asset.type === 'video' ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg> : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>}
            </div>
          )}
          <div>
            <p style={{ fontSize: '0.88rem', fontWeight: 600, color: '#fff', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 2 }}>
              {asset.filename || 'Unnamed'}
            </p>
            <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.38)', textTransform: 'capitalize' }}>
              {asset.type || 'image'}
            </p>
          </div>
        </div>
      </td>
      <td>
        <span className={`db-badge ${cls}`}>
          {asset.status === 'scanning' && (
            <span style={{ width: 6, height: 6, background: '#34d399', borderRadius: '50%', display: 'inline-block', animation: 'pulse 1.5s infinite' }} />
          )}
          {label}
        </span>
      </td>
      <td>
        <span style={{ fontSize: '0.88rem', fontWeight: 700, color: (asset.matchCount || 0) > 0 ? '#f87171' : 'rgba(255,255,255,0.25)' }}>
          {(asset.matchCount || 0) > 0 ? `! ${asset.matchCount}` : '—'}
        </span>
      </td>
      <td>
        <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.4)' }}>{asset.scanCount || 0}</span>
      </td>
    </tr>
  );
}
