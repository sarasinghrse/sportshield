import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function AdminDashboard() {
  const router = useRouter();
  const [auth, setAuth] = useState(null);
  const [tab, setTab] = useState('messages');
  const [messages, setMessages] = useState([]);
  const [healthResults, setHealthResults] = useState([]);
  const [userStats, setUserStats] = useState(null);
  const [allAssets, setAllAssets] = useState([]);
  const [allAlerts, setAllAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [healthLoading, setHealthLoading] = useState(false);
  const [assetsLoading, setAssetsLoading] = useState(false);
  const [alertsLoading, setAlertsLoading] = useState(false);
  const [assetFilter, setAssetFilter] = useState('all');

  useEffect(() => {
    const stored = sessionStorage.getItem('adminAuth');
    if (!stored) { router.push('/login'); return; }
    const creds = JSON.parse(stored);
    fetch(`${API_URL}/api/admin/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(creds),
    }).then(r => {
      if (!r.ok) { sessionStorage.removeItem('adminAuth'); router.push('/login'); return; }
      setAuth(creds);
    }).catch(() => { router.push('/login'); });
  }, []);

  useEffect(() => {
    if (!auth) return;
    loadMessages();
    loadUserStats();
  }, [auth]);

  async function loadMessages() {
    try {
      const res = await fetch(`${API_URL}/api/admin/messages`);
      const data = await res.json();
      if (data.ok) setMessages(data.messages);
    } catch {} finally { setLoading(false); }
  }

  async function markRead(id) {
    await fetch(`${API_URL}/api/admin/messages/${id}/read`, { method: 'POST' });
    setMessages(prev => prev.map(m => m.id === id ? { ...m, read: true } : m));
  }

  async function runHealthCheck() {
    setHealthLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/health-check`);
      const data = await res.json();
      if (data.ok) setHealthResults(data.results);
    } catch {} finally { setHealthLoading(false); }
  }

  async function loadUserStats() {
    try {
      const res = await fetch(`${API_URL}/api/admin/user-stats`);
      const data = await res.json();
      if (data.ok) setUserStats(data.stats);
    } catch {}
  }

  async function loadAllAssets() {
    setAssetsLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/all-assets`);
      const data = await res.json();
      if (data.ok) setAllAssets(data.assets);
    } catch {} finally { setAssetsLoading(false); }
  }

  async function loadAllAlerts() {
    setAlertsLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/all-alerts`);
      const data = await res.json();
      if (data.ok) setAllAlerts(data.alerts);
    } catch {} finally { setAlertsLoading(false); }
  }

  async function flagAsset(id) {
    await fetch(`${API_URL}/api/admin/assets/${id}/flag`, { method: 'POST' });
    setAllAssets(prev => prev.map(a => a.id === id ? { ...a, adminFlagged: true, isPublic: false } : a));
  }

  async function unflagAsset(id) {
    await fetch(`${API_URL}/api/admin/assets/${id}/unflag`, { method: 'POST' });
    setAllAssets(prev => prev.map(a => a.id === id ? { ...a, adminFlagged: false, isPublic: true } : a));
  }

  async function removeAsset(id) {
    if (!confirm('Permanently delete this asset?')) return;
    await fetch(`${API_URL}/api/admin/assets/${id}`, { method: 'DELETE' });
    setAllAssets(prev => prev.filter(a => a.id !== id));
  }

  if (!auth) return null;

  const unreadCount = messages.filter(m => !m.read).length;

  const filteredAssets = allAssets.filter(a => {
    if (assetFilter === 'flagged') return a.adminFlagged;
    if (assetFilter === 'public') return a.isPublic !== false && !a.adminFlagged;
    if (assetFilter === 'private') return a.isPublic === false;
    return true;
  });

  const TABS = [
    { key: 'messages', label: 'Messages', badge: unreadCount, onClick: () => setTab('messages') },
    { key: 'community', label: 'Community', onClick: () => { setTab('community'); if (!allAssets.length) loadAllAssets(); } },
    { key: 'analytics', label: 'Analytics', onClick: () => { setTab('analytics'); if (!userStats) loadUserStats(); } },
    { key: 'alerts', label: 'All Alerts', onClick: () => { setTab('alerts'); if (!allAlerts.length) loadAllAlerts(); } },
    { key: 'health', label: 'Health', onClick: () => { setTab('health'); if (!healthResults.length) runHealthCheck(); } },
    { key: 'stats', label: 'Users', onClick: () => { setTab('stats'); if (!userStats) loadUserStats(); } },
  ];

  return (
    <>
      <Head><title>Admin Dashboard — SportShield</title></Head>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;800;900&family=Barlow:wght@400;500;600&display=swap');
        .adm-root {
          min-height: 100vh; background: #0a1210; color: #d4e8d4;
          font-family: 'Barlow', sans-serif;
        }
        .adm-nav {
          position: sticky; top: 0; z-index: 50;
          background: rgba(10,18,12,0.96); backdrop-filter: blur(12px);
          border-bottom: 1px solid rgba(26,92,26,0.4);
          padding: 0 24px; display: flex; align-items: center; height: 56px; gap: 8px;
        }
        .adm-nav-logo {
          display: flex; align-items: center; gap: 8px; text-decoration: none; color: #fff;
          font-family: 'Barlow Condensed', sans-serif; font-weight: 900; font-size: 1.1rem;
          margin-right: 12px;
        }
        .adm-tab {
          background: none; border: none; color: rgba(255,255,255,0.45);
          font-family: 'Barlow', sans-serif; font-size: 0.8rem; font-weight: 600;
          cursor: pointer; padding: 6px 12px; border-radius: 8px; transition: all 0.2s;
          white-space: nowrap;
        }
        .adm-tab:hover { color: #fff; background: rgba(26,92,26,0.2); }
        .adm-tab.active { color: #4ade80; background: rgba(26,92,26,0.3); }
        .adm-card {
          background: rgba(13,26,16,0.85); border: 1px solid rgba(26,92,26,0.35);
          border-radius: 14px; padding: 24px;
        }
        .adm-badge {
          display: inline-flex; align-items: center; justify-content: center;
          min-width: 18px; height: 18px; border-radius: 9px;
          background: #ef4444; color: #fff; font-size: 0.68rem; font-weight: 700;
          padding: 0 5px; margin-left: 4px;
        }
        .adm-msg-row {
          padding: 16px 0; border-bottom: 1px solid rgba(26,92,26,0.15);
          display: flex; gap: 16px; align-items: flex-start;
        }
        .adm-msg-row:last-child { border-bottom: none; }
        .adm-stat-card {
          background: rgba(26,92,26,0.15); border: 1px solid rgba(26,92,26,0.3);
          border-radius: 12px; padding: 20px; text-align: center;
        }
        .adm-stat-num {
          font-family: 'Barlow Condensed', sans-serif; font-weight: 900;
          font-size: 2.2rem; color: #4ade80;
        }
        .adm-health-row {
          display: flex; align-items: center; gap: 12px;
          padding: 12px 0; border-bottom: 1px solid rgba(26,92,26,0.15);
        }
        .adm-health-row:last-child { border-bottom: none; }
        .adm-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
        .adm-title {
          font-family: 'Barlow Condensed', sans-serif; font-weight: 800;
          font-size: 1.5rem; color: #fff; margin-bottom: 20px;
        }
        .adm-pill {
          font-size: 0.75rem; padding: 4px 12px; border-radius: 20px;
          border: 1px solid rgba(26,92,26,0.35); background: none;
          color: rgba(255,255,255,0.5); cursor: pointer; font-family: 'Barlow', sans-serif;
          font-weight: 600; transition: all 0.2s;
        }
        .adm-pill.active { background: rgba(26,92,26,0.3); color: #4ade80; border-color: rgba(74,222,128,0.4); }
        .adm-pill:hover { color: #fff; }
        .adm-btn-sm {
          font-size: 0.72rem; padding: 4px 10px; border-radius: 6px; border: 1px solid;
          background: none; cursor: pointer; font-family: 'Barlow', sans-serif; font-weight: 600;
          transition: all 0.2s;
        }
        .adm-asset-row {
          display: flex; align-items: center; gap: 12px; padding: 14px 0;
          border-bottom: 1px solid rgba(26,92,26,0.12);
        }
        .adm-asset-row:last-child { border-bottom: none; }
        .adm-alert-row {
          padding: 14px 0; border-bottom: 1px solid rgba(26,92,26,0.12);
        }
        .adm-alert-row:last-child { border-bottom: none; }
      `}</style>

      <div className="adm-root">
        <nav className="adm-nav">
          <Link href="/landing" className="adm-nav-logo">
            <img src="/images/sportshield-logo-transparent.png" alt="" style={{ height: 28 }} />
            SPORTSHIELD
          </Link>
          <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.75rem', marginRight: 8 }}>Admin</span>
          <div style={{ flex: 1 }} />
          {TABS.map(t => (
            <button key={t.key} className={`adm-tab${tab === t.key ? ' active' : ''}`} onClick={t.onClick}>
              {t.label}
              {t.badge > 0 && <span className="adm-badge">{t.badge}</span>}
            </button>
          ))}
          <button
            onClick={() => { sessionStorage.removeItem('adminAuth'); router.push('/login'); }}
            style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', borderRadius: 8, padding: '5px 12px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', fontFamily: "'Barlow', sans-serif", marginLeft: 8 }}>
            Logout
          </button>
        </nav>

        <main style={{ maxWidth: 1060, margin: '0 auto', padding: '32px 24px' }}>

          {/* ═══ Messages ═══ */}
          {tab === 'messages' && (
            <div>
              <h2 className="adm-title">
                Contact Messages
                {unreadCount > 0 && <span style={{ color: '#4ade80', fontSize: '0.9rem', fontWeight: 600, marginLeft: 10 }}>{unreadCount} unread</span>}
              </h2>
              {loading ? (
                <p style={{ color: 'rgba(255,255,255,0.4)' }}>Loading messages...</p>
              ) : messages.length === 0 ? (
                <div className="adm-card" style={{ textAlign: 'center', padding: 48 }}>
                  <p style={{ color: 'rgba(255,255,255,0.4)' }}>No messages yet.</p>
                </div>
              ) : (
                <div className="adm-card">
                  {messages.map(m => (
                    <div key={m.id} className="adm-msg-row" style={{ opacity: m.read ? 0.6 : 1 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: m.read ? 'rgba(255,255,255,0.15)' : '#4ade80', marginTop: 6, flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', gap: 12, alignItems: 'baseline', marginBottom: 4, flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 700, color: '#fff', fontSize: '0.9rem' }}>{m.name}</span>
                          <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.35)' }}>{m.email}</span>
                          <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.2)', marginLeft: 'auto' }}>
                            {m.createdAt ? new Date(m.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                          </span>
                        </div>
                        <p style={{ fontSize: '0.78rem', color: '#4ade80', fontWeight: 600, marginBottom: 4 }}>{m.subject}</p>
                        <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{m.message}</p>
                        {!m.read && (
                          <button onClick={() => markRead(m.id)}
                            style={{ marginTop: 8, background: 'rgba(26,92,26,0.2)', border: '1px solid rgba(26,92,26,0.4)', color: '#4ade80', borderRadius: 6, padding: '4px 12px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>
                            Mark as read
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ═══ Community Dashboard (Admin) ═══ */}
          {tab === 'community' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
                <h2 className="adm-title" style={{ marginBottom: 0 }}>Community Assets</h2>
                <button onClick={loadAllAssets} disabled={assetsLoading} className="adm-btn-sm"
                  style={{ borderColor: 'rgba(74,222,128,0.3)', color: '#4ade80' }}>
                  {assetsLoading ? 'Loading...' : 'Refresh'}
                </button>
                <div style={{ flex: 1 }} />
                <div style={{ display: 'flex', gap: 6 }}>
                  {[
                    { key: 'all', label: `All (${allAssets.length})` },
                    { key: 'public', label: `Public (${allAssets.filter(a => a.isPublic !== false && !a.adminFlagged).length})` },
                    { key: 'flagged', label: `Flagged (${allAssets.filter(a => a.adminFlagged).length})` },
                    { key: 'private', label: `Private (${allAssets.filter(a => a.isPublic === false).length})` },
                  ].map(f => (
                    <button key={f.key} className={`adm-pill${assetFilter === f.key ? ' active' : ''}`} onClick={() => setAssetFilter(f.key)}>
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {assetsLoading && allAssets.length === 0 ? (
                <div className="adm-card" style={{ textAlign: 'center', padding: 48 }}>
                  <p style={{ color: 'rgba(255,255,255,0.4)' }}>Loading community assets...</p>
                </div>
              ) : filteredAssets.length === 0 ? (
                <div className="adm-card" style={{ textAlign: 'center', padding: 48 }}>
                  <p style={{ color: 'rgba(255,255,255,0.4)' }}>No assets in this category.</p>
                </div>
              ) : (
                <div className="adm-card">
                  {filteredAssets.map(asset => (
                    <div key={asset.id} className="adm-asset-row">
                      {asset.originalUrl ? (
                        <img src={asset.originalUrl} alt="" style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'cover', flexShrink: 0, background: 'rgba(26,92,26,0.2)' }} />
                      ) : (
                        <div style={{ width: 44, height: 44, borderRadius: 8, background: 'rgba(26,92,26,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'rgba(255,255,255,0.3)', fontSize: '0.7rem' }}>
                          {asset.type || 'img'}
                        </div>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: '0.88rem', fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 2 }}>
                          {asset.filename || 'Unnamed'}
                        </p>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)' }}>
                          <span>User: {(asset.userId || '').slice(0, 8)}...</span>
                          <span>·</span>
                          <span>{asset.matchCount || 0} matches</span>
                          <span>·</span>
                          <span>{asset.status || 'pending'}</span>
                          {asset.adminFlagged && <span style={{ color: '#f87171', fontWeight: 700 }}>FLAGGED</span>}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                        <span style={{ fontSize: '0.72rem', padding: '3px 8px', borderRadius: 12, background: asset.isPublic !== false ? 'rgba(74,222,128,0.1)' : 'rgba(255,255,255,0.05)', color: asset.isPublic !== false ? '#4ade80' : 'rgba(255,255,255,0.3)', border: '1px solid', borderColor: asset.isPublic !== false ? 'rgba(74,222,128,0.2)' : 'rgba(255,255,255,0.08)', fontWeight: 600 }}>
                          {asset.isPublic !== false ? 'Public' : 'Private'}
                        </span>
                        {!asset.adminFlagged ? (
                          <button onClick={() => flagAsset(asset.id)} className="adm-btn-sm"
                            style={{ borderColor: 'rgba(251,191,36,0.3)', color: '#fbbf24' }}>
                            Flag
                          </button>
                        ) : (
                          <button onClick={() => unflagAsset(asset.id)} className="adm-btn-sm"
                            style={{ borderColor: 'rgba(74,222,128,0.3)', color: '#4ade80' }}>
                            Unflag
                          </button>
                        )}
                        <button onClick={() => removeAsset(asset.id)} className="adm-btn-sm"
                          style={{ borderColor: 'rgba(239,68,68,0.3)', color: '#f87171' }}>
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ═══ Analytics ═══ */}
          {tab === 'analytics' && (
            <div>
              <h2 className="adm-title">Platform Analytics</h2>
              {!userStats ? (
                <p style={{ color: 'rgba(255,255,255,0.4)' }}>Loading analytics...</p>
              ) : (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
                    {[
                      { label: 'Total Scans Run', value: userStats.totalScansRun, color: '#4ade80' },
                      { label: 'Matches Found', value: userStats.totalMatchesFound, color: '#f87171' },
                      { label: 'Scanning Now', value: userStats.scanningNow, color: '#34d399' },
                      { label: 'Errored Scans', value: userStats.erroredScans, color: '#ef4444' },
                    ].map(s => (
                      <div key={s.label} className="adm-stat-card">
                        <div className="adm-stat-num" style={{ color: s.color }}>{s.value}</div>
                        <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.78rem', marginTop: 4 }}>{s.label}</p>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
                    <div className="adm-card">
                      <p style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: '1rem', color: '#fff', marginBottom: 16 }}>Asset Breakdown</p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {[
                          { label: 'Total Assets', value: userStats.totalAssets, color: '#4ade80' },
                          { label: 'Public', value: userStats.publicAssets, color: '#34d399' },
                          { label: 'Private', value: userStats.privateAssets, color: 'rgba(255,255,255,0.5)' },
                          { label: 'Completed', value: userStats.completedScans, color: '#4ade80' },
                          { label: 'Errored', value: userStats.erroredScans, color: '#ef4444' },
                        ].map(r => (
                          <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.6)', minWidth: 100 }}>{r.label}</span>
                            <div style={{ flex: 1, height: 8, borderRadius: 4, background: 'rgba(26,92,26,0.2)', overflow: 'hidden' }}>
                              <div style={{ width: `${userStats.totalAssets ? (r.value / userStats.totalAssets) * 100 : 0}%`, height: '100%', borderRadius: 4, background: r.color, minWidth: r.value > 0 ? 4 : 0 }} />
                            </div>
                            <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: '0.85rem', color: r.color, minWidth: 28, textAlign: 'right' }}>{r.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="adm-card">
                      <p style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: '1rem', color: '#fff', marginBottom: 16 }}>Alert Breakdown</p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {[
                          { label: 'Total Alerts', value: userStats.totalAlerts, color: '#fbbf24' },
                          { label: 'Unread', value: userStats.unreadAlerts, color: '#f87171' },
                          { label: 'High Severity', value: userStats.highSeverityAlerts, color: '#ef4444' },
                          { label: 'Resolved', value: userStats.totalAlerts - userStats.unreadAlerts, color: '#4ade80' },
                        ].map(r => (
                          <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.6)', minWidth: 100 }}>{r.label}</span>
                            <div style={{ flex: 1, height: 8, borderRadius: 4, background: 'rgba(26,92,26,0.2)', overflow: 'hidden' }}>
                              <div style={{ width: `${userStats.totalAlerts ? (r.value / userStats.totalAlerts) * 100 : 0}%`, height: '100%', borderRadius: 4, background: r.color, minWidth: r.value > 0 ? 4 : 0 }} />
                            </div>
                            <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: '0.85rem', color: r.color, minWidth: 28, textAlign: 'right' }}>{r.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="adm-card">
                    <p style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: '1rem', color: '#fff', marginBottom: 16 }}>This Week</p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
                      {[
                        { label: 'New Users', value: userStats.newUsersThisWeek, color: '#60a5fa' },
                        { label: 'New Assets', value: userStats.newAssetsThisWeek, color: '#4ade80' },
                        { label: 'Total Users', value: userStats.totalUsers, color: '#a78bfa' },
                        { label: 'Total Assets', value: userStats.totalAssets, color: '#34d399' },
                      ].map(s => (
                        <div key={s.label} style={{ textAlign: 'center', padding: '16px 12px', background: 'rgba(26,92,26,0.1)', borderRadius: 10, border: '1px solid rgba(26,92,26,0.2)' }}>
                          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: '1.8rem', color: s.color }}>{s.value}</div>
                          <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>{s.label}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ═══ All Alerts ═══ */}
          {tab === 'alerts' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
                <h2 className="adm-title" style={{ marginBottom: 0 }}>All User Alerts</h2>
                <button onClick={loadAllAlerts} disabled={alertsLoading} className="adm-btn-sm"
                  style={{ borderColor: 'rgba(74,222,128,0.3)', color: '#4ade80' }}>
                  {alertsLoading ? 'Loading...' : 'Refresh'}
                </button>
                <span style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.35)', marginLeft: 'auto' }}>
                  {allAlerts.length} total
                </span>
              </div>

              {alertsLoading && allAlerts.length === 0 ? (
                <div className="adm-card" style={{ textAlign: 'center', padding: 48 }}>
                  <p style={{ color: 'rgba(255,255,255,0.4)' }}>Loading alerts...</p>
                </div>
              ) : allAlerts.length === 0 ? (
                <div className="adm-card" style={{ textAlign: 'center', padding: 48 }}>
                  <p style={{ color: 'rgba(255,255,255,0.4)' }}>No alerts yet.</p>
                </div>
              ) : (
                <div className="adm-card">
                  {allAlerts.slice(0, 50).map(alert => {
                    const pct = Math.round((alert.confidence || 0) * 100);
                    return (
                      <div key={alert.id} className="adm-alert-row">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: alert.isRead ? 'rgba(255,255,255,0.15)' : '#f87171', flexShrink: 0 }} />
                          <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: '0.9rem', color: pct >= 80 ? '#ef4444' : pct >= 50 ? '#fbbf24' : '#4ade80' }}>
                            {pct}% confidence
                          </span>
                          <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.3)' }}>
                            User: {(alert.userId || '').slice(0, 8)}...
                          </span>
                          <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.2)', marginLeft: 'auto' }}>
                            {alert.createdAt ? new Date(alert.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                          </span>
                        </div>
                        {alert.foundUrl && (
                          <p style={{ fontSize: '0.78rem', color: '#60a5fa', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginLeft: 20 }}>
                            {alert.foundUrl}
                          </p>
                        )}
                        <div style={{ display: 'flex', gap: 8, marginLeft: 20, marginTop: 4 }}>
                          {alert.severity && (
                            <span style={{ fontSize: '0.68rem', padding: '2px 8px', borderRadius: 10, background: alert.severity === 'high' ? 'rgba(239,68,68,0.15)' : 'rgba(251,191,36,0.15)', color: alert.severity === 'high' ? '#f87171' : '#fbbf24', fontWeight: 600 }}>
                              {alert.severity}
                            </span>
                          )}
                          {alert.takedownStatus && alert.takedownStatus !== 'none' && (
                            <span style={{ fontSize: '0.68rem', padding: '2px 8px', borderRadius: 10, background: 'rgba(96,165,250,0.12)', color: '#60a5fa', fontWeight: 600 }}>
                              Takedown: {alert.takedownStatus}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {allAlerts.length > 50 && (
                    <p style={{ textAlign: 'center', fontSize: '0.82rem', color: 'rgba(255,255,255,0.3)', padding: '14px 0' }}>
                      Showing 50 of {allAlerts.length} alerts
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ═══ Health Check ═══ */}
          {tab === 'health' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
                <h2 className="adm-title" style={{ marginBottom: 0 }}>Endpoint Health Check</h2>
                <button onClick={runHealthCheck} disabled={healthLoading} className="adm-btn-sm"
                  style={{ borderColor: 'rgba(74,222,128,0.3)', color: '#4ade80' }}>
                  {healthLoading ? 'Scanning...' : 'Scan Now'}
                </button>
              </div>

              {healthResults.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 20 }}>
                  <div className="adm-stat-card">
                    <div className="adm-stat-num" style={{ color: '#4ade80' }}>{healthResults.filter(r => r.ok).length}</div>
                    <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.78rem', marginTop: 4 }}>Healthy</p>
                  </div>
                  <div className="adm-stat-card">
                    <div className="adm-stat-num" style={{ color: '#ef4444' }}>{healthResults.filter(r => !r.ok).length}</div>
                    <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.78rem', marginTop: 4 }}>Failed</p>
                  </div>
                  <div className="adm-stat-card">
                    <div className="adm-stat-num" style={{ color: '#60a5fa' }}>
                      {healthResults.length > 0 ? Math.round(healthResults.reduce((s, r) => s + (r.latency_ms || 0), 0) / healthResults.length) : 0}ms
                    </div>
                    <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.78rem', marginTop: 4 }}>Avg Latency</p>
                  </div>
                </div>
              )}

              {healthResults.length === 0 ? (
                <div className="adm-card" style={{ textAlign: 'center', padding: 48 }}>
                  <p style={{ color: 'rgba(255,255,255,0.4)' }}>Click "Scan Now" to check all endpoints.</p>
                </div>
              ) : (
                <div className="adm-card">
                  {healthResults.map(r => (
                    <div key={r.endpoint} className="adm-health-row">
                      <div className="adm-dot" style={{ background: r.ok ? '#4ade80' : '#ef4444' }} />
                      <span style={{ fontFamily: "'Courier New', monospace", fontSize: '0.82rem', color: '#fff', flex: 1 }}>{r.endpoint}</span>
                      <span style={{ fontSize: '0.78rem', color: r.ok ? '#4ade80' : '#f87171', fontWeight: 600 }}>
                        {r.ok ? `${r.status} OK` : `${r.status || 'ERR'} FAIL`}
                      </span>
                      {r.latency_ms != null && (
                        <span style={{ fontSize: '0.72rem', color: r.latency_ms > 2000 ? '#f87171' : r.latency_ms > 500 ? '#fbbf24' : 'rgba(255,255,255,0.3)', minWidth: 60, textAlign: 'right', fontWeight: r.latency_ms > 2000 ? 700 : 400 }}>
                          {r.latency_ms}ms
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ═══ User Stats ═══ */}
          {tab === 'stats' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
                <h2 className="adm-title" style={{ marginBottom: 0 }}>User Statistics</h2>
                <button onClick={loadUserStats} className="adm-btn-sm"
                  style={{ borderColor: 'rgba(74,222,128,0.3)', color: '#4ade80' }}>
                  Refresh
                </button>
              </div>
              {!userStats ? (
                <p style={{ color: 'rgba(255,255,255,0.4)' }}>Loading stats...</p>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
                  {[
                    { label: 'Total Users', value: userStats.totalUsers, color: '#4ade80' },
                    { label: 'New This Week', value: userStats.newUsersThisWeek, color: '#60a5fa' },
                    { label: 'Protected Assets', value: userStats.totalAssets, color: '#34d399' },
                    { label: 'New Assets (Week)', value: userStats.newAssetsThisWeek, color: '#a78bfa' },
                    { label: 'Total Alerts', value: userStats.totalAlerts, color: '#fbbf24' },
                    { label: 'Unread Alerts', value: userStats.unreadAlerts, color: '#f87171' },
                    { label: 'High Severity', value: userStats.highSeverityAlerts, color: '#ef4444' },
                    { label: 'Total Scans', value: userStats.totalScansRun, color: '#4ade80' },
                    { label: 'Matches Found', value: userStats.totalMatchesFound, color: '#f87171' },
                    { label: 'Public Assets', value: userStats.publicAssets, color: '#34d399' },
                    { label: 'Private Assets', value: userStats.privateAssets, color: 'rgba(255,255,255,0.5)' },
                    { label: 'Scan Errors', value: userStats.erroredScans, color: '#ef4444' },
                  ].map(s => (
                    <div key={s.label} className="adm-stat-card">
                      <div className="adm-stat-num" style={{ color: s.color, fontSize: '2rem' }}>{s.value}</div>
                      <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.78rem', marginTop: 4 }}>{s.label}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </main>
      </div>
    </>
  );
}
