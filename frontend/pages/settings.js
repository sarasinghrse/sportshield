import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { ArrowLeft, Shield, Save } from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useAuth } from '../lib/useAuth';
import toast, { Toaster } from 'react-hot-toast';

export default function SettingsPage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const [orgName,    setOrgName]    = useState('');
  const [threshold,  setThreshold]  = useState(75);
  const [saving,     setSaving]     = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading, router]);

  useEffect(() => {
    if (profile) {
      setOrgName(profile.orgName || '');
      setThreshold(profile.settings?.confidenceThreshold ?? 75);
    }
  }, [profile]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'users', user.uid),
        { orgName, settings: { confidenceThreshold: threshold } },
        { merge: true });
      toast.success('Settings saved!');
    } catch { toast.error('Failed to save.'); }
    finally { setSaving(false); }
  };

  const handleSignOut = async () => { await signOut(auth); router.push('/login'); };

  if (loading) return <div className="min-h-screen bg-gray-950 flex items-center justify-center"><p className="text-gray-500">Loading…</p></div>;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Toaster position="top-right" />
      <nav className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center gap-4">
        <Link href="/" className="text-gray-400 hover:text-white"><ArrowLeft size={20} /></Link>
        <Shield className="text-red-500" size={22} />
        <span className="font-bold">SportShield</span>
      </nav>

      <main className="max-w-xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold mb-8">Settings</h1>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
          <h2 className="font-semibold mb-4">Profile</h2>
          <div className="mb-4">
            <label className="block text-sm text-gray-400 mb-1">Organisation / Name</label>
            <input type="text" value={orgName} onChange={e => setOrgName(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-red-500" />
          </div>
          <div className="mb-2">
            <label className="block text-sm text-gray-400 mb-1">Email</label>
            <p className="text-white py-2 text-sm">{user?.email}</p>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Account type</label>
            <p className="text-white py-2 text-sm capitalize">{profile?.accountType || '—'}</p>
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
          <h2 className="font-semibold mb-1">Detection sensitivity</h2>
          <p className="text-sm text-gray-500 mb-5">Only flag matches above this confidence level. Lower = more alerts. Higher = fewer but more certain.</p>
          <div className="flex items-center gap-4">
<span className="text-sm text-gray-500 w-8">50%</span>
<input type="range" min="50" max="99" value={threshold}
onChange={e => setThreshold(Number(e.target.value))}
className="flex-1 accent-red-500" />
<span className="text-sm text-gray-500 w-8">99%</span>
</div>
<div className="text-center mt-3">
<span className="text-2xl font-bold text-red-400">{threshold}%</span>
<p className="text-xs text-gray-500 mt-1">Current threshold</p>
</div>
</div>
    <div className="flex gap-3">
      <button onClick={handleSave} disabled={saving}
        className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white py-3 rounded-xl font-semibold transition-colors">
        <Save size={16} />{saving ? 'Saving…' : 'Save changes'}
      </button>
      <button onClick={handleSignOut}
        className="px-6 py-3 bg-gray-800 hover:bg-gray-700 text-gray-400 rounded-xl font-medium transition-colors">
        Sign out
      </button>
    </div>
  </main>
</div>
);
}