import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { ArrowLeft, ExternalLink, Shield } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { db, subscribeToScanResults } from '../../lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';

export default function AssetDetail() {
  const router        = useRouter();
  const { id }        = router.query;
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

  const statusConfig = {
    pending:  { label: 'Pending',  cls: 'bg-gray-700 text-gray-300' },
    scanning: { label: 'Scanning', cls: 'bg-blue-900/60 text-blue-300' },
    complete: { label: 'Complete', cls: 'bg-green-900/60 text-green-300' },
    error:    { label: 'Error',    cls: 'bg-red-900/60 text-red-300' },
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
      <p className="text-gray-500">Loading…</p>
    </div>
  );

  if (!asset) return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center gap-4">
      <p className="text-gray-400">Asset not found.</p>
      <Link href="/" className="text-red-400 hover:text-red-300 text-sm">← Back to Dashboard</Link>
    </div>
  );

  const { label, cls } = statusConfig[asset.status] || statusConfig.pending;
  const uploadedAt     = asset.uploadedAt?.toDate?.() || new Date();

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <nav className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center gap-4">
        <Link href="/" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
          <ArrowLeft size={20} /><span className="text-sm">Dashboard</span>
        </Link>
        <div className="flex items-center gap-2 ml-2">
          <Shield className="text-red-500" size={22} />
          <span className="font-bold text-white">SportShield</span>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-8">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-8 flex items-start gap-5">
          {asset.originalUrl ? (
            <img src={asset.originalUrl} alt={asset.filename} className="w-20 h-20 rounded-xl object-cover bg-gray-800 flex-shrink-0" />
          ) : (
            <div className="w-20 h-20 rounded-xl bg-gray-800 flex items-center justify-center flex-shrink-0 text-3xl">
              {asset.type === 'video' ? '🎬' : '🖼️'}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-white truncate mb-1">{asset.filename || 'Unnamed'}</h1>
            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-400 mb-3">
              <span className="capitalize">{asset.type || 'image'}</span>
              <span>·</span>
              <span>Uploaded {formatDistanceToNow(uploadedAt, { addSuffix: true })}</span>
              <span>·</span>
              <span>{asset.scanCount || 0} scan{asset.scanCount !== 1 ? 's' : ''}</span>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${cls}`}>
                {asset.status === 'scanning' && <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse inline-block" />}
                {label}
              </span>
              {(asset.matchCount || 0) > 0 && (
                <span className="text-xs text-red-400 font-semibold">⚠️ {asset.matchCount} match{asset.matchCount !== 1 ? 'es' : ''} found</span>
              )}
            </div>
          </div>
        </div>

        {asset.phash && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6">
            <p className="text-xs text-gray-500 mb-1 uppercase tracking-wider font-medium">Perceptual Fingerprint (pHash)</p>
            <code className="text-green-400 font-mono text-sm break-all">{asset.phash}</code>
          </div>
        )}

        <section>
          <h2 className="font-semibold text-white mb-4">
            Scan Results
            {scanResults.length > 0 && <span className="ml-2 text-xs text-gray-500 font-normal">({scanResults.length} match{scanResults.length !== 1 ? 'es' : ''})</span>}
          </h2>
          {scanResults.length === 0 ? (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-10 text-center">
              {asset.status === 'scanning' ? (
                <><div className="text-4xl mb-3">🔍</div><p className="text-gray-400 font-medium">Scanning in progress…</p><p className="text-gray-600 text-sm mt-1">Results will appear here automatically.</p></>
              ) : asset.status === 'complete' ? (
                <><div className="text-4xl mb-3">✅</div><p className="text-gray-400 font-medium">No unauthorized copies found</p></>
              ) : (
                <><div className="text-4xl mb-3">🕐</div><p className="text-gray-400 font-medium">Scan pending</p></>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {scanResults.map(result => {
                const confidence = Math.round((result.confidence || 0) * 100);
                const isHigh     = confidence >= 90;
                return (
                  <div key={result.id} className={`border rounded-xl overflow-hidden ${isHigh ? 'border-red-500/40 bg-red-500/5' : 'border-yellow-500/40 bg-yellow-500/5'}`}>
                    <div className="flex items-start gap-4 p-4">
                      {result.thumbnailUrl ? (
                        <img src={result.thumbnailUrl} alt="" className="w-16 h-16 rounded-lg object-cover bg-gray-800 flex-shrink-0" />
                      ) : (
                        <div className="w-16 h-16 rounded-lg bg-gray-800 flex items-center justify-center flex-shrink-0 text-2xl">🖼️</div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="flex-1 bg-gray-800 rounded-full h-2 overflow-hidden">
                            <div className={`h-full rounded-full ${isHigh ? 'bg-red-500' : 'bg-yellow-500'}`} style={{ width: `${confidence}%` }} />
                          </div>
                          <span className={`text-xs font-bold tabular-nums ${isHigh ? 'text-red-400' : 'text-yellow-400'}`}>{confidence}%</span>
                        </div>
                        <a href={result.foundUrl} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 truncate">
                          <ExternalLink size={11} />{result.foundUrl}
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}