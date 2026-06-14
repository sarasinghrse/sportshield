import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { formatDistanceToNow, subDays, startOfDay, format } from 'date-fns';
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function AdminDashboard() {
  const router = useRouter();
  const [auth, setAuth] = useState(null);
  const [tab, setTab] = useState('community');
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
  const [alertFilter, setAlertFilter] = useState('all');

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
    loadAllAssets();
    loadAllAlerts();
  }, [auth]);

  async function adminFetch(path) {
    const res = await fetch(`${API_URL}${path}`);
    return res.json();
  }

  async function loadMessages() {
    try {
      const data = await adminFetch('/api/admin/messages');
      if (data.ok) setMessages(data.messages);
    } catch {} finally { setLoading(false); }
  }

  async function markRead(id) {
    try {
      const res = await fetch(`${API_URL}/api/admin/messages/${id}/read`, { method: 'POST' });
      if (!res.ok) throw new Error(`Status ${res.status}`);
      setMessages(prev => prev.map(m => m.id === id ? { ...m, read: true } : m));
    } catch (err) {
      alert(`Failed to mark as read: ${err.message}`);
    }
  }

  async function runHealthCheck() {
    setHealthLoading(true);
    try {
      const data = await adminFetch('/api/admin/health-check');
      if (data.ok) setHealthResults(data.results);
    } catch {} finally { setHealthLoading(false); }
  }

  async function loadUserStats() {
    try {
      const data = await adminFetch('/api/admin/user-stats');
      if (data.ok) setUserStats(data.stats);
    } catch {}
  }

  async function loadAllAssets() {
    setAssetsLoading(true);
    try {
      const data = await adminFetch('/api/admin/all-assets');
      if (data.ok) setAllAssets(data.assets);
    } catch {} finally { setAssetsLoading(false); }
  }

  async function loadAllAlerts() {
    setAlertsLoading(true);
    try {
      const data = await adminFetch('/api/admin/all-alerts');
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
    if (!confirm('Permanently delete this asset? This cannot be undone.')) return;
    await fetch(`${API_URL}/api/admin/assets/${id}`, { method: 'DELETE' });
    setAllAssets(prev => prev.filter(a => a.id !== id));
  }

  if (!auth) return null;

  const unreadCount = messages.filter(m => !m.read).length;

  // Build alert map: assetId → alerts[]
  const alertsByAsset = {};
  allAlerts.forEach(a => {
    if (!alertsByAsset[a.assetId]) alertsByAsset[a.assetId] = [];
    alertsByAsset[a.assetId].push(a);
  });

  // Community filters
  const violatedAssets = allAssets.filter(a => (alertsByAsset[a.id]?.length || 0) > 0).length;
  const communityScore = allAssets.length > 0
    ? Math.round(((allAssets.length - violatedAssets) / allAssets.length) * 100)
    : 100;
  const filteredAssets = allAssets.filter(a => {
    if (assetFilter === 'violations') return (alertsByAsset[a.id]?.length || 0) > 0;
    if (assetFilter === 'clean') return (alertsByAsset[a.id]?.length || 0) === 0;
    if (assetFilter === 'flagged') return a.adminFlagged;
    return true;
  });

  // Alert filters
  const unreadAlerts = allAlerts.filter(a => !a.isRead).length;
  const filteredAlerts = allAlerts.filter(a => {
    if (alertFilter === 'high') return a.severity === 'high';
    if (alertFilter === 'medium') return a.severity === 'medium';
    if (alertFilter === 'unread') return !a.isRead;
    return true;
  });

  // Analytics data
  const last30 = Array.from({ length: 30 }, (_, i) => {
    const d = startOfDay(subDays(new Date(), 29 - i));
    return { date: format(d, 'MMM d'), violations: 0, _ts: d.getTime() };
  });
  allAlerts.forEach(a => {
    const ts = a.createdAt ? new Date(a.createdAt).getTime() : null;
    if (!ts) return;
    const slot = last30.find(d => d._ts === startOfDay(new Date(ts)).getTime());
    if (slot) slot.violations += 1;
  });
  const lineData = last30.map(({ date, violations }) => ({ date, violations }));
  const showLabels = lineData.filter((_, i) => i % 5 === 0).map(d => d.date);

  const platformMap = {};
  allAlerts.forEach(a => {
    try {
      const host = new URL(a.foundUrl || 'http://unknown').hostname.replace('www.', '');
      platformMap[host] = (platformMap[host] || 0) + 1;
    } catch { platformMap['unknown'] = (platformMap['unknown'] || 0) + 1; }
  });
  const barData = Object.entries(platformMap)
    .sort((a, b) => b[1] - a[1]).slice(0, 8)
    .map(([platform, count]) => ({ platform, count }));

  const assetViolations = {};
  allAlerts.forEach(a => { if (a.assetId) assetViolations[a.assetId] = (assetViolations[a.assetId] || 0) + 1; });
  const topAssets = allAssets
    .map(a => ({ ...a, violations: assetViolations[a.id] || 0 }))
    .filter(a => a.violations > 0)
    .sort((a, b) => b.violations - a.violations).slice(0, 5);

  const totalViolations = allAlerts.length;
  const dismissed = allAlerts.filter(a => a.isRead).length;
  const resolutionRate = totalViolations > 0 ? Math.round((dismissed / totalViolations) * 100) : 0;
  const avgRiskScore = allAssets.length > 0
    ? Math.round(allAssets.reduce((s, a) => {
        const n = a.matchCount || 0;
        if (n === 0) return s;
        return s + Math.min(100, (n <= 2 ? n * 10 : n <= 4 ? 20 + (n - 2) * 5 : 30) + 20 + (n >= 3 ? 15 : n >= 1 ? 8 : 0));
      }, 0) / allAssets.length)
    : 0;

  const tooltipStyle = {
    backgroundColor: '#0d1f10',
    border: '1px solid rgba(26,92,26,0.4)',
    borderRadius: 8,
    color: '#fff',
    fontFamily: 'Barlow, sans-serif',
    fontSize: 12,
  };

  const TABS = [
    { key: 'community', label: 'Community' },
    { key: 'analytics', label: 'Analytics' },
    { key: 'alerts', label: 'Alerts' },
    { key: 'health', label: 'Health Check' },
    { key: 'stats', label: 'User Stats' },
    { key: 'messages', label: 'Messages', badge: unreadCount },
  ];

  return (
    <div className="ap-root">
      <Head><title>Admin — SportShield</title></Head>

      {/* Nav — matches ap-nav from rest of site */}
      <nav className="ap-nav">
        <div className="ap-nav-left">
          <Link href="/landing" className="ap-logo">
            <img src="/images/sportshield-logo-transparent.png" alt="SportShield" />
            <span className="ap-logo-text">SPORTSHIELD</span>
          </Link>
          <span className="ap-page-tag" style={{ marginLeft: 4 }}>/ Admin</span>
        </div>
        <div className="ap-nav-right">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => {
                setTab(t.key);
                if (t.key === 'health' && !healthResults.length) runHealthCheck();
              }}
              className={`ap-filter${tab === t.key ? ' active' : ''}`}
              style={{ padding: '5px 12px', fontSize: '0.75rem' }}
            >
              {t.label}
              {t.badge > 0 && (
                <span className="ap-badge ap-badge-new" style={{ marginLeft: 4 }}>{t.badge}</span>
              )}
            </button>
          ))}
          <button
            onClick={() => { sessionStorage.removeItem('adminAuth'); router.push('/login'); }}
            className="ap-btn ap-btn-ghost"
            style={{ padding: '5px 12px', fontSize: '0.75rem', color: '#f87171', borderColor: 'rgba(239,68,68,0.25)' }}
          >
            Logout
          </button>
        </div>
      </nav>

      <main style={{ maxWidth: 1060, margin: '0 auto', padding: '32px 24px' }}>

        {/* ═══════════════════ COMMUNITY ═══════════════════ */}
        {tab === 'community' && (
          <>
            <div style={{ marginBottom: 32 }}>
              <h1 className="ap-heading">Community Dashboard</h1>
              <p className="ap-muted" style={{ marginTop: 6 }}>
                All assets across the platform. Flag or remove content that violates community guidelines.
              </p>
            </div>

            {/* Stats row — same layout as public dashboard */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 14, marginBottom: 28 }}>
              {[
                { label: 'Community Score', value: `${communityScore}%`, accent: communityScore >= 70 ? 'rgba(74,222,128,0.2)' : 'rgba(245,158,11,0.2)' },
                { label: 'Total Assets', value: allAssets.length, accent: 'rgba(26,92,26,0.3)' },
                { label: 'Total Violations', value: totalViolations, accent: 'rgba(239,68,68,0.2)' },
                { label: 'Assets with Issues', value: violatedAssets, accent: 'rgba(245,158,11,0.2)' },
                { label: 'Clean Assets', value: allAssets.length - violatedAssets, accent: 'rgba(74,222,128,0.15)' },
              ].map(s => (
                <div key={s.label} className="ap-card" style={{ padding: '18px 20px', borderColor: s.accent }}>
                  <div className="ap-stat-num">{s.value}</div>
                  <div className="ap-stat-label">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Filter pills */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 22, flexWrap: 'wrap', alignItems: 'center' }}>
              {[
                { key: 'all', label: `All Assets (${allAssets.length})` },
                { key: 'violations', label: `Has Violations (${violatedAssets})` },
                { key: 'clean', label: `Clean (${allAssets.length - violatedAssets})` },
                { key: 'flagged', label: `Flagged (${allAssets.filter(a => a.adminFlagged).length})` },
              ].map(f => (
                <button key={f.key} onClick={() => setAssetFilter(f.key)}
                  className={`ap-filter${assetFilter === f.key ? ' active' : ''}`}>
                  {f.label}
                </button>
              ))}
              <button onClick={loadAllAssets} disabled={assetsLoading}
                className="ap-btn ap-btn-ghost" style={{ marginLeft: 'auto', padding: '5px 14px', fontSize: '0.78rem' }}>
                {assetsLoading ? 'Refreshing…' : 'Refresh'}
              </button>
            </div>

            {/* Asset grid — same card layout as public dashboard */}
            {assetsLoading && allAssets.length === 0 ? (
              <div className="ap-card" style={{ padding: 64, textAlign: 'center' }}>
                <p className="ap-muted">Loading community assets…</p>
              </div>
            ) : filteredAssets.length === 0 ? (
              <div className="ap-card" style={{ padding: 64, textAlign: 'center' }}>
                <p className="ap-muted">No assets match this filter.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 18 }}>
                {filteredAssets.map(asset => {
                  const assetAlerts = alertsByAsset[asset.id] || [];
                  const violations = assetAlerts.length;
                  const maxConf = violations > 0
                    ? Math.round(Math.max(...assetAlerts.map(a => a.confidence || 0)) * 100)
                    : 0;
                  const uploadedAt = asset.uploadedAt ? new Date(asset.uploadedAt) : new Date();

                  return (
                    <div key={asset.id} className="ap-card"
                      style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                      {/* Thumbnail */}
                      <div style={{ height: 150, background: 'rgba(26,92,26,0.15)', position: 'relative', overflow: 'hidden' }}>
                        {asset.originalUrl ? (
                          <img src={asset.originalUrl} alt={asset.filename}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.2)', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '0.85rem' }}>
                            {asset.type === 'video' ? 'Video' : 'Image'}
                          </div>
                        )}
                        {violations > 0 && (
                          <div style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(239,68,68,0.9)', color: '#fff', borderRadius: 20, padding: '3px 10px', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '0.72rem' }}>
                            {violations} violation{violations !== 1 ? 's' : ''}
                          </div>
                        )}
                        {violations === 0 && !asset.adminFlagged && (
                          <div style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(74,222,128,0.85)', color: '#081008', borderRadius: 20, padding: '3px 10px', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '0.72rem' }}>
                            Clean
                          </div>
                        )}
                        {asset.adminFlagged && (
                          <div style={{ position: 'absolute', top: 10, left: 10, background: 'rgba(239,68,68,0.9)', color: '#fff', borderRadius: 20, padding: '3px 10px', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '0.72rem' }}>
                            Flagged
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div style={{ padding: '14px 16px', flex: 1 }}>
                        <p style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '0.95rem', color: '#fff', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {asset.filename || 'Unnamed Asset'}
                        </p>
                        <p className="ap-muted" style={{ fontSize: '0.72rem', marginBottom: 10 }}>
                          {asset.type || 'image'} · {formatDistanceToNow(uploadedAt, { addSuffix: true })} · User {(asset.userId || '').slice(0, 8)}…
                        </p>

                        {violations > 0 ? (
                          <>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                              <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)' }}>Highest confidence</span>
                              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '0.85rem', color: '#f87171' }}>{maxConf}%</span>
                            </div>
                            <div className="ap-conf-bar-track">
                              <div className="ap-conf-bar-fill" style={{ width: `${maxConf}%`, background: maxConf >= 90 ? '#ef4444' : '#f59e0b' }} />
                            </div>
                          </>
                        ) : (
                          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.8rem', color: '#4ade80' }}>
                            No violations detected
                          </span>
                        )}
                      </div>

                      {/* Admin actions — footer */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', borderTop: '1px solid rgba(26,92,26,0.18)' }}>
                        <span className={`ap-badge ${asset.status === 'complete' ? 'ap-badge-complete' : asset.status === 'scanning' ? 'ap-badge-scanning' : 'ap-badge-pending'}`}>
                          {asset.status || 'pending'}
                        </span>
                        <span className="ap-muted" style={{ fontSize: '0.7rem' }}>
                          {asset.scanCount || 0} scans
                        </span>
                        <div style={{ marginLeft: 'auto', display: 'flex', gap: 5 }}>
                          {!asset.adminFlagged ? (
                            <button onClick={() => flagAsset(asset.id)}
                              className="ap-btn ap-btn-ghost"
                              style={{ padding: '3px 8px', fontSize: '0.68rem', color: '#fbbf24', borderColor: 'rgba(251,191,36,0.25)' }}>
                              Flag
                            </button>
                          ) : (
                            <button onClick={() => unflagAsset(asset.id)}
                              className="ap-btn ap-btn-ghost"
                              style={{ padding: '3px 8px', fontSize: '0.68rem', color: '#4ade80', borderColor: 'rgba(74,222,128,0.25)' }}>
                              Unflag
                            </button>
                          )}
                          <button onClick={() => removeAsset(asset.id)}
                            className="ap-btn ap-btn-ghost"
                            style={{ padding: '3px 8px', fontSize: '0.68rem', color: '#f87171', borderColor: 'rgba(239,68,68,0.25)' }}>
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ═══════════════════ ANALYTICS ═══════════════════ */}
        {tab === 'analytics' && (
          <>
            <div style={{ marginBottom: 32 }}>
              <h1 className="ap-heading">Platform Analytics</h1>
              <p className="ap-muted" style={{ marginTop: 6 }}>Violation trends, platform breakdown and asset risk overview — all users combined.</p>
            </div>

            {/* Stats row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 16, marginBottom: 28 }}>
              {[
                { label: 'Total Violations', value: totalViolations, accent: 'rgba(239,68,68,0.18)' },
                { label: 'Assets Monitored', value: allAssets.length, accent: 'rgba(26,92,26,0.28)' },
                { label: 'Avg Risk Score', value: avgRiskScore, accent: avgRiskScore >= 50 ? 'rgba(245,158,11,0.2)' : 'rgba(74,222,128,0.15)' },
                { label: 'Dismissed', value: dismissed, accent: 'rgba(255,255,255,0.06)' },
                { label: 'Resolution Rate', value: `${resolutionRate}%`, accent: 'rgba(74,222,128,0.15)' },
              ].map(s => (
                <div key={s.label} className="ap-card" style={{ padding: '20px 22px', borderColor: s.accent }}>
                  <div className="ap-stat-num">{s.value}</div>
                  <div className="ap-stat-label">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Violations over time */}
            <div className="ap-chart-card" style={{ marginBottom: 20 }}>
              <div className="ap-chart-title">Violations — Last 30 Days</div>
              {totalViolations === 0 ? (
                <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <p className="ap-muted">No violations yet — all assets are clean.</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={lineData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(26,92,26,0.2)" />
                    <XAxis dataKey="date" tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11 }} tickLine={false} axisLine={false}
                      interval="preserveStartEnd" tickFormatter={v => showLabels.includes(v) ? v : ''} />
                    <YAxis tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: 'rgba(255,255,255,0.5)' }} />
                    <Line type="monotone" dataKey="violations" stroke="#4ade80" strokeWidth={2.5}
                      dot={false} activeDot={{ r: 5, fill: '#4ade80', strokeWidth: 0 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              {/* Platform breakdown */}
              <div className="ap-chart-card">
                <div className="ap-chart-title">Platform Breakdown</div>
                {barData.length === 0 ? (
                  <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <p className="ap-muted">No data yet</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={barData} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(26,92,26,0.2)" horizontal={false} />
                      <XAxis type="number" tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                      <YAxis dataKey="platform" type="category" tick={{ fill: 'rgba(255,255,255,0.55)', fontSize: 11 }} tickLine={false} axisLine={false} width={90} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Bar dataKey="count" fill="#1a5c1a" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Most violated assets */}
              <div className="ap-chart-card">
                <div className="ap-chart-title">Most Violated Assets</div>
                {topAssets.length === 0 ? (
                  <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <p className="ap-muted">No violations recorded</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {topAssets.map((a, i) => (
                      <div key={a.id}
                        style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 10, background: 'rgba(26,92,26,0.12)' }}>
                        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '0.8rem', color: 'rgba(255,255,255,0.35)', width: 20 }}>#{i + 1}</span>
                        {a.originalUrl ? (
                          <img src={a.originalUrl} alt="" style={{ width: 32, height: 32, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }} />
                        ) : (
                          <div style={{ width: 32, height: 32, borderRadius: 6, background: 'rgba(26,92,26,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', flexShrink: 0 }}>
                            {a.type === 'video' ? 'Vid' : 'Img'}
                          </div>
                        )}
                        <p style={{ flex: 1, fontSize: '0.82rem', color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {a.filename || 'Unnamed'}
                        </p>
                        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '0.82rem', color: '#f87171', flexShrink: 0 }}>
                          {a.violations} match{a.violations !== 1 ? 'es' : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Platform analytics — same as public dashboard bottom */}
            {allAlerts.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginTop: 20 }}>
                <div className="ap-chart-card">
                  <div className="ap-chart-title" style={{ textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.82rem', color: 'rgba(255,255,255,0.5)' }}>
                    Violations by Platform
                  </div>
                  {(() => {
                    const sorted = Object.entries(platformMap).sort((a, b) => b[1] - a[1]).slice(0, 6);
                    const max = sorted[0]?.[1] || 1;
                    return sorted.map(([platform, count]) => (
                      <div key={platform} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                        <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.6)', minWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{platform}</span>
                        <div style={{ flex: 1, height: 8, borderRadius: 4, background: 'rgba(26,92,26,0.2)', overflow: 'hidden' }}>
                          <div style={{ width: `${(count / max) * 100}%`, height: '100%', borderRadius: 4, background: '#1a5c1a' }} />
                        </div>
                        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '0.78rem', color: '#4ade80', minWidth: 24 }}>{count}</span>
                      </div>
                    ));
                  })()}
                </div>
                <div className="ap-chart-card">
                  <div className="ap-chart-title" style={{ textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.82rem', color: 'rgba(255,255,255,0.5)' }}>
                    Protection Overview
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <div style={{ padding: '14px 16px', background: 'rgba(74,222,128,0.06)', borderRadius: 10, border: '1px solid rgba(74,222,128,0.15)' }}>
                      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '2rem', color: '#4ade80' }}>{allAssets.length - violatedAssets}</div>
                      <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>Clean Assets</div>
                    </div>
                    <div style={{ padding: '14px 16px', background: 'rgba(239,68,68,0.06)', borderRadius: 10, border: '1px solid rgba(239,68,68,0.15)' }}>
                      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '2rem', color: '#f87171' }}>{violatedAssets}</div>
                      <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>With Violations</div>
                    </div>
                    <div style={{ padding: '14px 16px', background: 'rgba(26,92,26,0.1)', borderRadius: 10, border: '1px solid rgba(26,92,26,0.25)', gridColumn: 'span 2' }}>
                      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '2rem', color: communityScore >= 70 ? '#4ade80' : '#fbbf24' }}>{communityScore}%</div>
                      <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>Community Protection Score</div>
                      <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)', marginTop: 6 }}>
                        Percentage of monitored assets with no violations detected
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* ═══════════════════ ALERTS ═══════════════════ */}
        {tab === 'alerts' && (
          <>
            <div style={{ marginBottom: 28 }}>
              <h1 className="ap-heading">All User Alerts</h1>
              <p className="ap-muted" style={{ marginTop: 6 }}>
                {allAlerts.length} total · {unreadAlerts} unread — across all users on the platform
              </p>
            </div>

            {/* Filters */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center' }}>
              {[
                { key: 'all', label: `All (${allAlerts.length})` },
                { key: 'unread', label: `Unread (${unreadAlerts})` },
                { key: 'high', label: 'High Severity' },
                { key: 'medium', label: 'Medium' },
              ].map(f => (
                <button key={f.key} onClick={() => setAlertFilter(f.key)}
                  className={`ap-filter${alertFilter === f.key ? ' active' : ''}`}>
                  {f.label}
                </button>
              ))}
              <button onClick={loadAllAlerts} disabled={alertsLoading}
                className="ap-btn ap-btn-ghost" style={{ marginLeft: 'auto', padding: '5px 14px', fontSize: '0.78rem' }}>
                {alertsLoading ? 'Loading…' : 'Refresh'}
              </button>
            </div>

            {/* Alert list — same card layout as /alerts page */}
            {alertsLoading && allAlerts.length === 0 ? (
              <div className="ap-card" style={{ padding: 64, textAlign: 'center' }}>
                <p className="ap-muted">Loading alerts…</p>
              </div>
            ) : filteredAlerts.length === 0 ? (
              <div className="ap-card" style={{ padding: 64, textAlign: 'center' }}>
                <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'center' }}>
                  <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="rgba(74,222,128,0.5)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                </div>
                <p className="ap-subheading" style={{ marginBottom: 8 }}>No alerts</p>
                <p className="ap-muted">{alertFilter === 'all' ? 'No violations detected yet.' : 'No alerts match this filter.'}</p>
              </div>
            ) : (
              <div>
                {filteredAlerts.slice(0, 50).map(alert => {
                  const createdAt = alert.createdAt ? new Date(alert.createdAt) : new Date();
                  const confidence = Math.round((alert.confidence || 0) * 100);
                  const isHigh = alert.severity === 'high';
                  const barColor = confidence >= 90 ? '#ef4444' : confidence >= 75 ? '#f59e0b' : '#4ade80';
                  const rs = alert.riskScore != null ? alert.riskScore
                    : Math.min(100, Math.round((alert.confidence || 0.5) * 60 + (isHigh ? 30 : 15)));

                  return (
                    <div key={alert.id}
                      className={`ap-alert-card${isHigh ? '' : ' medium'}`}
                      style={{ marginBottom: 10 }}>
                      {/* Header */}
                      <div className="ap-alert-card-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span className={`ap-badge ${isHigh ? 'ap-badge-high' : 'ap-badge-medium'}`} style={{ textTransform: 'uppercase' }}>
                            {alert.severity || 'medium'}
                          </span>
                          <span style={{
                            fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '0.7rem',
                            padding: '2px 8px', borderRadius: 10,
                            color: rs >= 75 ? '#ef4444' : rs >= 50 ? '#f59e0b' : '#4ade80',
                            background: rs >= 75 ? 'rgba(239,68,68,0.12)' : rs >= 50 ? 'rgba(245,158,11,0.12)' : 'rgba(74,222,128,0.1)',
                            border: `1px solid ${rs >= 75 ? 'rgba(239,68,68,0.25)' : rs >= 50 ? 'rgba(245,158,11,0.25)' : 'rgba(74,222,128,0.2)'}`,
                          }}>
                            Risk {rs}
                          </span>
                          {!alert.isRead && (
                            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '0.7rem', color: '#fca5a5', letterSpacing: '0.08em' }}>
                              ● NEW
                            </span>
                          )}
                          <span className="ap-muted" style={{ fontSize: '0.68rem' }}>
                            User: {(alert.userId || '').slice(0, 8)}…
                          </span>
                        </div>
                        <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.35)' }}>
                          {formatDistanceToNow(createdAt, { addSuffix: true })}
                        </span>
                      </div>

                      {/* Body */}
                      <div className="ap-alert-card-body">
                        <p style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.02rem', color: '#fff', marginBottom: 10, letterSpacing: '0.01em' }}>
                          Unauthorized use detected — {confidence}% confidence
                        </p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                          <div className="ap-conf-bar-track">
                            <div className="ap-conf-bar-fill" style={{ width: `${confidence}%`, background: barColor }} />
                          </div>
                          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '0.9rem', color: barColor, minWidth: 36 }}>
                            {confidence}%
                          </span>
                        </div>
                        {alert.foundUrl && (
                          <a href={alert.foundUrl} target="_blank" rel="noopener noreferrer"
                            style={{ display: 'block', fontSize: '0.78rem', color: '#60a5fa', textDecoration: 'none', marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            ↗ {alert.foundUrl}
                          </a>
                        )}
                        {alert.takedownStatus && alert.takedownStatus !== 'none' && (
                          <span className="ap-badge" style={{ background: 'rgba(96,165,250,0.12)', color: '#60a5fa', border: '1px solid rgba(96,165,250,0.2)' }}>
                            Takedown: {alert.takedownStatus}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
                {filteredAlerts.length > 50 && (
                  <p className="ap-muted" style={{ textAlign: 'center', padding: '14px 0' }}>
                    Showing 50 of {filteredAlerts.length} alerts
                  </p>
                )}
              </div>
            )}
          </>
        )}

        {/* ═══════════════════ HEALTH CHECK ═══════════════════ */}
        {tab === 'health' && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28, flexWrap: 'wrap' }}>
              <div>
                <h1 className="ap-heading">Endpoint Health</h1>
                <p className="ap-muted" style={{ marginTop: 6 }}>
                  Checks all backend endpoints and reports status and latency.
                </p>
              </div>
              <button onClick={runHealthCheck} disabled={healthLoading}
                className="ap-btn ap-btn-green" style={{ marginLeft: 'auto', padding: '10px 20px' }}>
                {healthLoading ? 'Scanning…' : 'Scan Now'}
              </button>
            </div>

            {healthResults.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 24 }}>
                {[
                  { label: 'Healthy', value: healthResults.filter(r => r.ok).length, color: '#4ade80' },
                  { label: 'Failed', value: healthResults.filter(r => !r.ok).length, color: '#ef4444' },
                  { label: 'Avg Latency', value: `${Math.round(healthResults.reduce((s, r) => s + (r.latency_ms || 0), 0) / healthResults.length)}ms`, color: '#60a5fa' },
                ].map(s => (
                  <div key={s.label} className="ap-card" style={{ padding: '20px 22px', textAlign: 'center' }}>
                    <div className="ap-stat-num" style={{ color: s.color }}>{s.value}</div>
                    <div className="ap-stat-label">{s.label}</div>
                  </div>
                ))}
              </div>
            )}

            {healthResults.length === 0 ? (
              <div className="ap-card" style={{ padding: 64, textAlign: 'center' }}>
                <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'center' }}>
                  <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="rgba(74,222,128,0.5)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
                </div>
                <p className="ap-subheading" style={{ marginBottom: 8 }}>No results yet</p>
                <p className="ap-muted">Click "Scan Now" to check all backend endpoints.</p>
              </div>
            ) : (
              <div className="ap-card" style={{ padding: '6px 0' }}>
                {healthResults.map((r, i) => (
                  <div key={r.endpoint}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px',
                      borderBottom: i < healthResults.length - 1 ? '1px solid rgba(26,92,26,0.15)' : 'none',
                    }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: r.ok ? '#4ade80' : '#ef4444', flexShrink: 0 }} />
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.85rem', color: '#fff', flex: 1 }}>{r.endpoint}</span>
                    <span style={{
                      fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '0.78rem',
                      color: r.ok ? '#4ade80' : '#f87171',
                    }}>
                      {r.ok ? `${r.status} OK` : `${r.status || 'ERR'} FAIL`}
                    </span>
                    {r.latency_ms != null && (
                      <span style={{
                        fontSize: '0.75rem', minWidth: 55, textAlign: 'right',
                        color: r.latency_ms > 2000 ? '#f87171' : r.latency_ms > 500 ? '#fbbf24' : 'rgba(255,255,255,0.35)',
                        fontWeight: r.latency_ms > 2000 ? 700 : 400,
                      }}>
                        {r.latency_ms}ms
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ═══════════════════ USER STATS ═══════════════════ */}
        {tab === 'stats' && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28 }}>
              <div>
                <h1 className="ap-heading">User Statistics</h1>
                <p className="ap-muted" style={{ marginTop: 6 }}>
                  Aggregated data across all registered users and their assets.
                </p>
              </div>
              <button onClick={loadUserStats}
                className="ap-btn ap-btn-ghost" style={{ marginLeft: 'auto', padding: '7px 16px', fontSize: '0.78rem' }}>
                Refresh
              </button>
            </div>

            {!userStats ? (
              <div className="ap-card" style={{ padding: 64, textAlign: 'center' }}>
                <p className="ap-muted">Loading stats…</p>
              </div>
            ) : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 20 }}>
                  {[
                    { label: 'Total Users', value: userStats.totalUsers, color: '#4ade80' },
                    { label: 'New This Week', value: userStats.newUsersThisWeek, color: '#60a5fa' },
                    { label: 'Protected Assets', value: userStats.totalAssets, color: '#34d399' },
                    { label: 'New Assets (Week)', value: userStats.newAssetsThisWeek, color: '#a78bfa' },
                  ].map(s => (
                    <div key={s.label} className="ap-card" style={{ padding: '20px 22px' }}>
                      <div className="ap-stat-num" style={{ color: s.color }}>{s.value}</div>
                      <div className="ap-stat-label">{s.label}</div>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                  {/* Scan overview */}
                  <div className="ap-chart-card">
                    <div className="ap-chart-title">Scan Overview</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {[
                        { label: 'Total Scans', value: userStats.totalScansRun, max: userStats.totalScansRun, color: '#4ade80' },
                        { label: 'Completed', value: userStats.completedScans, max: userStats.totalAssets, color: '#34d399' },
                        { label: 'Scanning Now', value: userStats.scanningNow, max: userStats.totalAssets, color: '#60a5fa' },
                        { label: 'Errored', value: userStats.erroredScans, max: userStats.totalAssets, color: '#ef4444' },
                        { label: 'Matches Found', value: userStats.totalMatchesFound, max: userStats.totalScansRun || 1, color: '#f87171' },
                      ].map(r => (
                        <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', minWidth: 105 }}>{r.label}</span>
                          <div style={{ flex: 1, height: 8, borderRadius: 4, background: 'rgba(26,92,26,0.2)', overflow: 'hidden' }}>
                            <div style={{ width: `${r.max ? Math.min(100, (r.value / r.max) * 100) : 0}%`, height: '100%', borderRadius: 4, background: r.color, minWidth: r.value > 0 ? 4 : 0 }} />
                          </div>
                          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '0.82rem', color: r.color, minWidth: 32, textAlign: 'right' }}>{r.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Alerts overview */}
                  <div className="ap-chart-card">
                    <div className="ap-chart-title">Alert Overview</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {[
                        { label: 'Total Alerts', value: userStats.totalAlerts, max: userStats.totalAlerts, color: '#fbbf24' },
                        { label: 'Unread', value: userStats.unreadAlerts, max: userStats.totalAlerts, color: '#f87171' },
                        { label: 'High Severity', value: userStats.highSeverityAlerts, max: userStats.totalAlerts, color: '#ef4444' },
                        { label: 'Resolved', value: userStats.totalAlerts - userStats.unreadAlerts, max: userStats.totalAlerts, color: '#4ade80' },
                        { label: 'Public Assets', value: userStats.publicAssets, max: userStats.totalAssets, color: '#34d399' },
                        { label: 'Private Assets', value: userStats.privateAssets, max: userStats.totalAssets, color: 'rgba(255,255,255,0.5)' },
                      ].map(r => (
                        <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', minWidth: 105 }}>{r.label}</span>
                          <div style={{ flex: 1, height: 8, borderRadius: 4, background: 'rgba(26,92,26,0.2)', overflow: 'hidden' }}>
                            <div style={{ width: `${r.max ? Math.min(100, (r.value / r.max) * 100) : 0}%`, height: '100%', borderRadius: 4, background: r.color, minWidth: r.value > 0 ? 4 : 0 }} />
                          </div>
                          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '0.82rem', color: r.color, minWidth: 32, textAlign: 'right' }}>{r.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {/* ═══════════════════ MESSAGES ═══════════════════ */}
        {tab === 'messages' && (
          <>
            <div style={{ marginBottom: 28 }}>
              <h1 className="ap-heading">Contact Messages</h1>
              <p className="ap-muted" style={{ marginTop: 6 }}>
                {messages.length} total · {unreadCount} unread
              </p>
            </div>

            {loading ? (
              <div className="ap-card" style={{ padding: 64, textAlign: 'center' }}>
                <p className="ap-muted">Loading messages…</p>
              </div>
            ) : messages.length === 0 ? (
              <div className="ap-card" style={{ padding: 64, textAlign: 'center' }}>
                <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'center' }}>
                  <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="rgba(74,222,128,0.5)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                </div>
                <p className="ap-subheading" style={{ marginBottom: 8 }}>No messages yet</p>
                <p className="ap-muted">Contact form submissions will appear here.</p>
              </div>
            ) : (
              <div>
                {messages.map(m => (
                  <div key={m.id} className="ap-card" style={{ padding: '18px 20px', marginBottom: 10, opacity: m.read ? 0.65 : 1 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: m.read ? 'rgba(255,255,255,0.15)' : '#4ade80', flexShrink: 0, marginTop: 4 }} />
                      <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '0.95rem', color: '#fff' }}>{m.name}</span>
                      <span className="ap-muted" style={{ fontSize: '0.75rem' }}>{m.email}</span>
                      <span className="ap-muted" style={{ fontSize: '0.72rem', marginLeft: 'auto' }}>
                        {m.createdAt ? formatDistanceToNow(new Date(m.createdAt), { addSuffix: true }) : ''}
                      </span>
                    </div>
                    <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.85rem', color: '#4ade80', marginBottom: 6 }}>
                      {m.subject}
                    </p>
                    <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.65)', lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>
                      {m.message}
                    </p>
                    {!m.read && (
                      <button onClick={() => markRead(m.id)}
                        className="ap-btn ap-btn-ghost"
                        style={{ marginTop: 10, padding: '4px 12px', fontSize: '0.75rem' }}>
                        Mark as read
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

      </main>
    </div>
  );
}
