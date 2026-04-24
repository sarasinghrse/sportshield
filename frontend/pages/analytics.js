import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, BarChart2 } from 'lucide-react';
import { subDays, startOfDay, format } from 'date-fns';
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
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

  // --- Violations per day (last 30 days) ---
  const last30 = Array.from({ length: 30 }, (_, i) => {
    const d   = startOfDay(subDays(new Date(), 29 - i));
    const key = format(d, 'MMM d');
    return { date: key, violations: 0, _ts: d.getTime() };
  });

  alerts.forEach(a => {
    const ts = a.createdAt?.toDate?.()?.getTime?.();
    if (!ts) return;
    const dayStart = startOfDay(new Date(ts)).getTime();
    const slot     = last30.find(d => d._ts === dayStart);
    if (slot) slot.violations += 1;
  });

  const lineData = last30.map(({ date, violations }) => ({ date, violations }));
  const showLabels = lineData.filter((_, i) => i % 5 === 0).map(d => d.date);

  // --- Platform breakdown ---
  const platformMap = {};
  alerts.forEach(a => {
    try {
      const host = new URL(a.foundUrl || 'http://unknown').hostname.replace('www.', '');
      platformMap[host] = (platformMap[host] || 0) + 1;
    } catch { platformMap['unknown'] = (platformMap['unknown'] || 0) + 1; }
  });
  const barData = Object.entries(platformMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([platform, count]) => ({ platform, count }));

  // --- Top violated assets ---
  const assetViolations = {};
  alerts.forEach(a => {
    if (a.assetId) assetViolations[a.assetId] = (assetViolations[a.assetId] || 0) + 1;
  });
  const topAssets = assets
    .map(a => ({ ...a, violations: assetViolations[a.id] || 0 }))
    .filter(a => a.violations > 0)
    .sort((a, b) => b.violations - a.violations)
    .slice(0, 5);

  // --- Summary stats ---
  const totalViolations  = alerts.length;
  const assetsMonitored  = assets.length;
  const dismissed        = alerts.filter(a => a.isRead).length;
  const resolutionRate   = totalViolations > 0 ? Math.round((dismissed / totalViolations) * 100) : 0;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <nav className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center gap-4">
        <Link href="/" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
          <ArrowLeft size={20} /><span className="text-sm">Dashboard</span>
        </Link>
        <div className="flex items-center gap-2 ml-2">
          <BarChart2 className="text-red-500" size={20} />
          <span className="font-bold text-white">Analytics</span>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {/* Summary stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Violations',  value: totalViolations,  color: 'border-red-500/30 bg-red-500/5',    icon: '🚨' },
            { label: 'Assets Monitored', value: assetsMonitored,  color: 'border-blue-500/30 bg-blue-500/5',  icon: '🛡️' },
            { label: 'Dismissed',         value: dismissed,         color: 'border-gray-700 bg-gray-800/40',    icon: '✅' },
            { label: 'Resolution Rate',  value: `${resolutionRate}%`, color: 'border-green-500/30 bg-green-500/5', icon: '📊' },
          ].map(s => (
            <div key={s.label} className={`border rounded-xl p-4 ${s.color}`}>
              <div className="text-xl mb-1">{s.icon}</div>
              <div className="text-3xl font-bold">{s.value}</div>
              <div className="text-xs text-gray-400 mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Violations over time */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
          <h2 className="font-semibold text-white mb-5">Violations — Last 30 Days</h2>
          {totalViolations === 0 ? (
            <div className="h-48 flex items-center justify-center text-gray-600 text-sm">
              No violations yet — your assets are safe 🛡️
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={lineData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: '#6b7280', fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                  tickFormatter={v => showLabels.includes(v) ? v : ''}
                />
                <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '8px', color: '#f9fafb' }}
                  labelStyle={{ color: '#9ca3af', fontSize: '12px' }}
                />
                <Line type="monotone" dataKey="violations" stroke="#ef4444" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: '#ef4444' }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* Platform breakdown */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h2 className="font-semibold text-white mb-5">Platform Breakdown</h2>
            {barData.length === 0 ? (
              <div className="h-40 flex items-center justify-center text-gray-600 text-sm">No data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={barData} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" horizontal={false} />
                  <XAxis type="number" tick={{ fill: '#6b7280', fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <YAxis dataKey="platform" type="category" tick={{ fill: '#9ca3af', fontSize: 11 }} tickLine={false} axisLine={false} width={90} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '8px', color: '#f9fafb' }}
                  />
                  <Bar dataKey="count" fill="#ef4444" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Top violated assets */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h2 className="font-semibold text-white mb-5">Most Violated Assets</h2>
            {topAssets.length === 0 ? (
              <div className="h-40 flex items-center justify-center text-gray-600 text-sm">No violations recorded</div>
            ) : (
              <div className="space-y-3">
                {topAssets.map((a, i) => (
                  <Link key={a.id} href={`/assets/${a.id}`}
                    className="flex items-center gap-3 p-3 rounded-lg bg-gray-800/50 hover:bg-gray-800 transition-colors">
                    <span className="text-gray-500 text-xs font-bold w-4">#{i + 1}</span>
                    {a.originalUrl ? (
                      <img src={a.originalUrl} alt="" className="w-8 h-8 rounded-lg object-cover bg-gray-700 flex-shrink-0" />
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-gray-700 flex items-center justify-center text-sm flex-shrink-0">
                        {a.type === 'video' ? '🎬' : '🖼️'}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">{a.filename || 'Unnamed'}</p>
                    </div>
                    <span className="text-xs font-bold text-red-400 flex-shrink-0">{a.violations} match{a.violations !== 1 ? 'es' : ''}</span>
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
