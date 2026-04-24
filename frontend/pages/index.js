import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { subscribeToAssets, subscribeToAlerts, markAlertRead } from '../lib/firebase';

export default function Dashboard() {
  const [assets,  setAssets]  = useState([]);
  const [alerts,  setAlerts]  = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubAssets = subscribeToAssets(data => { setAssets(data); setLoading(false); });
    const unsubAlerts = subscribeToAlerts(data => setAlerts(data));
    return () => { unsubAssets(); unsubAlerts(); };
  }, []);

  const unread       = alerts.filter(a => !a.isRead).length;
  const totalMatches = assets.reduce((s, a) => s + (a.matchCount || 0), 0);
  const scanning     = assets.filter(a => a.status === 'scanning').length;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <nav className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🛡️</span>
          <span className="text-xl font-bold">SportShield</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/upload"
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            + Upload Media
          </Link>
          <Link href="/alerts" className="relative">
            <span className="text-2xl">🔔</span>
            {unread > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </Link>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Assets Protected', value: assets.length,  icon: '🛡️', color: 'border-blue-500/30 bg-blue-500/5' },
            { label: 'Matches Found',    value: totalMatches,   icon: '⚠️', color: 'border-red-500/30 bg-red-500/5'  },
            { label: 'Unread Alerts',    value: unread,         icon: '🔔', color: 'border-yellow-500/30 bg-yellow-500/5' },
            { label: 'Scanning Now',     value: scanning,       icon: '🔍', color: 'border-green-500/30 bg-green-500/5' },
          ].map(s => (
            <div key={s.label} className={`border rounded-xl p-4 ${s.color}`}>
              <div className="text-xl mb-1">{s.icon}</div>
              <div className="text-3xl font-bold">{s.value}</div>
              <div className="text-xs text-gray-400 mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {alerts.filter(a => !a.isRead).length > 0 && (
          <section className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-white">Recent Alerts</h2>
              <Link href="/alerts" className="text-sm text-red-400 hover:text-red-300">View all →</Link>
            </div>
            <div className="space-y-2">
              {alerts.filter(a => !a.isRead).slice(0, 3).map(alert => {
                const pct    = Math.round((alert.confidence || 0) * 100);
                const isHigh = alert.severity === 'high';
                return (
                  <div key={alert.id}
                    className={`flex items-center gap-3 p-4 rounded-xl border ${isHigh ? 'bg-red-500/5 border-red-500/30' : 'bg-yellow-500/5 border-yellow-500/30'}`}>
                    <span className="text-xl flex-shrink-0">{isHigh ? '🚨' : '⚠️'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white">{pct}% confidence — unauthorized copy detected</p>
                      <p className="text-xs text-blue-400 truncate">{alert.foundUrl}</p>
                    </div>
                    <button onClick={() => markAlertRead(alert.id)}
                      className="text-xs border border-gray-600 hover:border-gray-400 text-gray-400 hover:text-white px-3 py-1 rounded-lg transition-colors flex-shrink-0">
                      Dismiss
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-white">Protected Assets</h2>
            <span className="text-sm text-gray-500">{assets.length} total</span>
          </div>
          {loading ? (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center text-gray-500">Loading...</div>
          ) : assets.length === 0 ? (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
              <div className="text-5xl mb-4">🛡️</div>
              <p className="text-gray-400 font-medium mb-2">No assets yet</p>
              <p className="text-gray-600 text-sm mb-6">Upload an image or video to start monitoring for unauthorized use.</p>
              <Link href="/upload"
                className="inline-block bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl font-medium transition-colors">
                Upload your first asset
              </Link>
            </div>
          ) : (
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-800 text-left bg-gray-900">
                    <th className="px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Asset</th>
                    <th className="px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                    <th className="px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Matches</th>
                    <th className="px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider hidden md:table-cell">Scans</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/50">
                  {assets.map(asset => <AssetRow key={asset.id} asset={asset} />)}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function AssetRow({ asset }) {
  const router = useRouter();
  const statusConfig = {
    pending:  { label: 'Pending',  cls: 'bg-gray-700 text-gray-300' },
    scanning: { label: 'Scanning', cls: 'bg-blue-900/60 text-blue-300' },
    complete: { label: 'Complete', cls: 'bg-green-900/60 text-green-300' },
    error:    { label: 'Error',    cls: 'bg-red-900/60 text-red-300' },
  };
  const { label, cls } = statusConfig[asset.status] || statusConfig.pending;

  return (
    <tr className="hover:bg-gray-800/40 transition-colors cursor-pointer"
      onClick={() => router.push(`/assets/${asset.id}`)}>
      <td className="px-5 py-3">
        <div className="flex items-center gap-3">
          {asset.originalUrl ? (
            <img src={asset.originalUrl} alt="" width={40} height={40}
              className="w-10 h-10 rounded-lg object-cover bg-gray-800 flex-shrink-0"
              onError={e => { e.target.style.display = 'none'; }} />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center flex-shrink-0 text-lg">
              {asset.type === 'video' ? '🎬' : '🖼️'}
            </div>
          )}
          <div>
            <p className="text-sm font-medium text-white truncate max-w-[180px] md:max-w-[280px]">{asset.filename || 'Unnamed'}</p>
            <p className="text-xs text-gray-500 capitalize">{asset.type || 'image'}</p>
          </div>
        </div>
      </td>
      <td className="px-5 py-3">
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
          {asset.status === 'scanning' && <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse inline-block" />}
          {label}
        </span>
      </td>
      <td className="px-5 py-3">
        <span className={`text-sm font-semibold ${(asset.matchCount || 0) > 0 ? 'text-red-400' : 'text-gray-600'}`}>
          {(asset.matchCount || 0) > 0 ? `⚠️ ${asset.matchCount}` : '—'}
        </span>
      </td>
      <td className="px-5 py-3 hidden md:table-cell">
        <span className="text-sm text-gray-500">{asset.scanCount || 0}</span>
      </td>
    </tr>
  );
}