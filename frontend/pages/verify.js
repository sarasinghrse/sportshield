import { useState } from 'react';
import Link from 'next/link';
import { Shield, Search } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

export default function VerifyPage() {
  const [url,     setUrl]     = useState('');
  const [result,  setResult]  = useState(null); // null | 'flagged' | 'clean'
  const [match,   setMatch]   = useState(null);
  const [loading, setLoading] = useState(false);

  const handleCheck = async () => {
    const trimmed = url.trim();
    if (!trimmed) return;
    setLoading(true);
    setResult(null);
    setMatch(null);
    try {
      const q    = query(collection(db, 'alerts'), where('foundUrl', '==', trimmed));
      const snap = await getDocs(q);
      if (snap.empty) {
        setResult('clean');
      } else {
        setResult('flagged');
        setMatch({ id: snap.docs[0].id, ...snap.docs[0].data() });
      }
    } catch (err) {
      console.error(err);
      setResult('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      {/* Nav */}
      <nav className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="text-red-500" size={22} />
          <span className="font-bold text-white">SportShield</span>
          <span className="text-gray-600 text-sm hidden sm:inline">· URL Verification</span>
        </div>
        <Link href="/" className="text-sm text-gray-400 hover:text-white transition-colors">
          Dashboard →
        </Link>
      </nav>

      {/* Main */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-lg">
          <div className="text-center mb-8">
            <div className="text-5xl mb-4">🔍</div>
            <h1 className="text-2xl font-bold text-white mb-2">Verify a URL</h1>
            <p className="text-gray-400 text-sm">
              Check if a URL has been flagged as containing unauthorized sports media.
            </p>
          </div>

          {/* Search box */}
          <div className="flex gap-2 mb-6">
            <input
              type="url"
              value={url}
              onChange={e => setUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCheck()}
              placeholder="https://example.com/suspicious-content"
              className="flex-1 bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-red-500 transition-colors"
            />
            <button
              onClick={handleCheck}
              disabled={loading || !url.trim()}
              className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-5 py-3 rounded-xl font-medium text-sm transition-colors flex items-center gap-2"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" />
              ) : (
                <Search size={16} />
              )}
              Check
            </button>
          </div>

          {/* Result */}
          {result === 'clean' && (
            <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-6 text-center">
              <div className="text-4xl mb-3">✅</div>
              <p className="text-green-400 font-bold text-lg mb-1">Not Flagged</p>
              <p className="text-gray-400 text-sm">
                This URL is not in our database of unauthorized media uses.
              </p>
            </div>
          )}

          {result === 'flagged' && match && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6">
              <div className="text-center mb-4">
                <div className="text-4xl mb-3">🚨</div>
                <p className="text-red-400 font-bold text-lg mb-1">Flagged as Unauthorized</p>
                <p className="text-gray-400 text-sm">
                  This URL has been flagged in the SportShield database as containing unauthorized sports media.
                </p>
              </div>
              <div className="bg-gray-900/60 rounded-lg p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Confidence</span>
                  <span className="text-red-400 font-bold">{Math.round((match.confidence || 0) * 100)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Severity</span>
                  <span className="text-white capitalize">{match.severity || 'unknown'}</span>
                </div>
              </div>
              <p className="text-center text-xs text-gray-600 mt-4">
                If you believe this is incorrect, contact the rights holder directly.
              </p>
            </div>
          )}

          {result === 'error' && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-6 text-center">
              <p className="text-yellow-400 font-bold mb-1">Check Failed</p>
              <p className="text-gray-400 text-sm">Could not query the database. Please try again.</p>
            </div>
          )}

          {/* Info note */}
          {!result && (
            <p className="text-center text-xs text-gray-600 mt-4">
              This tool checks against publicly tracked violations only.
              <br />No personal data is logged from this lookup.
            </p>
          )}
        </div>
      </main>

      <footer className="text-center py-4 text-xs text-gray-700 border-t border-gray-900">
        SportShield — Google Solutions Challenge 2025
      </footer>
    </div>
  );
}
