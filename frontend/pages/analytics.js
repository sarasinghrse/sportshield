import { useState, useEffect } from 'react';
import Link from 'next/link';
import ProfileAvatar from '../components/ProfileAvatar';
import { subDays, startOfDay, format } from 'date-fns';
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { subscribeToAlerts, subscribeToAssets } from '../lib/firebase';

export default function AnalyticsPage() {
  const [alerts, setAlerts] = useState([]);
  const [assets, setAssets] = useState([]);

  useEffect(() => {
    const u1 = subscribeToAlerts(setAlerts);
    const u2 = subscribeToAssets(setAssets);
    return () => { u1(); u2(); };
  }, []);

  /* Violations per day — last 30 */
  const last30 = Array.from({ length: 30 }, (_, i) => {
    const d   = startOfDay(subDays(new Date(), 29 - i));
    return { date: format(d, 'MMM d'), violations: 0, _ts: d.getTime() };
  });
  alerts.forEach(a => {
    const ts = a.createdAt?.toDate?.()?.getTime?.();
    if (!ts) return;
    const slot = last30.find(d => d._ts === startOfDay(new Date(ts)).getTime());
    if (slot) slot.violations += 1;
  });
  const lineData  = last30.map(({ date, violations }) => ({ date, violations }));
  const showLabels = lineData.filter((_, i) => i % 5 === 0).map(d => d.date);

  /* Platform breakdown */
  const platformMap = {};
  alerts.forEach(a => {
    try {
      const host = new URL(a.foundUrl || 'http://unknown').hostname.replace('www.', '');
      platformMap[host] = (platformMap[host] || 0) + 1;
    } catch { platformMap['unknown'] = (platformMap['unknown'] || 0) + 1; }
  });
  const barData = Object.entries(platformMap)
    .sort((a, b) => b[1] - a[1]).slice(0, 8)
    .map(([platform, count]) => ({ platform, count }));

  /* Top violated assets */
  const assetViolations = {};
  alerts.forEach(a => { if (a.assetId) assetViolations[a.assetId] = (assetViolations[a.assetId] || 0) + 1; });
  const topAssets = assets
    .map(a => ({ ...a, violations: assetViolations[a.id] || 0 }))
    .filter(a => a.violations > 0)
    .sort((a, b) => b.violations - a.violations).slice(0, 5);

  /* Summary stats */
  const totalViolations = alerts.length;
  const assetsMonitored = assets.length;
  const dismissed       = alerts.filter(a => a.isRead).length;
  const resolutionRate  = totalViolations > 0 ? Math.round((dismissed / totalViolations) * 100) : 0;

  const tooltipStyle = {
    backgroundColor: '#0d1f10',
    border: '1px solid rgba(26,92,26,0.4)',
    borderRadius: 8,
    color: '#fff',
    fontFamily: 'Barlow, sans-serif',
    fontSize: 12,
  };

  return (
    <div className="ap-root">
      {/* Nav */}
      <nav className="ap-nav">
        <div className="ap-nav-left">
          <Link href="/" className="ap-back">← Dashboard</Link>
          <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.1)' }} />
          <Link href="/" className="ap-logo">
            <img src="/images/sportshield-logo-transparent.png" alt="SportShield" />
            <span className="ap-logo-text">SPORTSHIELD</span>
          </Link>
          <span className="ap-page-tag" style={{ marginLeft: 4 }}>/ Analytics</span>
        </div>
        <div className="ap-nav-right">
          <ProfileAvatar />
        </div>
      </nav>

      <main style={{ maxWidth: 1060, margin: '0 auto', padding: '32px 24px' }}>

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <h1 className="ap-heading">Analytics</h1>
          <p className="ap-muted" style={{ marginTop: 6 }}>Violation trends, platform breakdown and asset risk overview.</p>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 28 }}>
          {[
            { label: 'Total Violations',  value: totalViolations,    accent: 'rgba(239,68,68,0.18)' },
            { label: 'Assets Monitored', value: assetsMonitored,    accent: 'rgba(26,92,26,0.28)'  },
            { label: 'Dismissed',         value: dismissed,           accent: 'rgba(255,255,255,0.06)' },
            { label: 'Resolution Rate',  value: `${resolutionRate}%`, accent: 'rgba(74,222,128,0.15)' },
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
              <p className="ap-muted">No violations yet — your assets are clean.</p>
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
                  <Link key={a.id} href={`/assets/${a.id}`}
                    style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 10, background: 'rgba(26,92,26,0.12)', textDecoration: 'none', transition: 'background 0.2s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(26,92,26,0.22)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(26,92,26,0.12)'}
                  >
                    <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '0.8rem', color: 'rgba(255,255,255,0.35)', width: 20 }}>#{i + 1}</span>
                    {a.originalUrl ? (
                      <img src={a.originalUrl} alt="" style={{ width: 32, height: 32, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: 32, height: 32, borderRadius: 6, background: 'rgba(26,92,26,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', flexShrink: 0 }}>
                        {a.type === 'video' ? 'Video' : 'Image'}
                      </div>
                    )}
                    <p style={{ flex: 1, fontSize: '0.85rem', color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {a.filename || 'Unnamed'}
                    </p>
                    <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '0.85rem', color: '#f87171', flexShrink: 0 }}>
                      {a.violations} match{a.violations !== 1 ? 'es' : ''}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
