import { useState } from 'react';
import { useRouter } from 'next/router';
import { Building2, User, Upload, CheckCircle } from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import toast, { Toaster } from 'react-hot-toast';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function Onboarding() {
  const router = useRouter();
  const [step,        setStep]        = useState(1);
  const [accountType, setAccountType] = useState('');
  const [orgName,     setOrgName]     = useState('');
  const [saving,      setSaving]      = useState(false);
  const [file,        setFile]        = useState(null);
  const [uploading,   setUploading]   = useState(false);

  const saveProfile = async () => {
    if (!accountType || !orgName.trim()) { toast.error('Please fill in all fields.'); return; }
    setSaving(true);
    try {
      const user = auth.currentUser;
      await setDoc(doc(db, 'users', user.uid), {
        orgName:           orgName.trim(),
        accountType,
        email:             user.email,
        createdAt:         serverTimestamp(),
        onboardingComplete: false,
        settings:          { confidenceThreshold: 75 },
      });
      setStep(2);
    } catch { toast.error('Failed to save. Try again.'); }
    finally { setSaving(false); }
  };

  const uploadAsset = async () => {
    if (!file) { toast.error('Please select a file.'); return; }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(`${API_URL}/api/media/upload`, { method: 'POST', body: fd });
      if (!res.ok) throw new Error();
      const user = auth.currentUser;
      await setDoc(doc(db, 'users', user.uid), { onboardingComplete: true }, { merge: true });
      setStep(3);
      setTimeout(() => router.push('/'), 3000);
    } catch { toast.error('Upload failed. Try again.'); }
    finally { setUploading(false); }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center px-4">
      <Toaster position="top-right" />

      <div className="flex items-center gap-3 mb-10">
        <span className="text-3xl">🛡️</span>
        <span className="text-2xl font-bold">SportShield</span>
      </div>

      {/* Step indicators */}
      <div className="flex items-center gap-2 mb-10">
        {[1, 2, 3].map(n => (
          <div key={n} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors
              ${step > n ? 'bg-green-500 text-white' : step === n ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-500'}`}>
              {step > n ? '✓' : n}
            </div>
            {n < 3 && <div className={`w-12 h-0.5 ${step > n ? 'bg-green-500' : 'bg-gray-800'}`} />}
          </div>
        ))}
      </div>

      <div className="w-full max-w-lg bg-gray-900 border border-gray-800 rounded-2xl p-8">

        {step === 1 && (
          <>
            <h2 className="text-xl font-bold mb-2">Welcome to SportShield</h2>
            <p className="text-gray-400 text-sm mb-6">Tell us about yourself to set up your dashboard.</p>

            <div className="grid grid-cols-2 gap-4 mb-6">
              {[
                { type: 'club',       icon: <Building2 size={28} />, label: 'Sports Club',  desc: 'Team, franchise, or organisation' },
                { type: 'individual', icon: <User size={28} />,      label: 'Individual',   desc: 'Athlete or content creator' },
              ].map(opt => (
                <button key={opt.type} onClick={() => setAccountType(opt.type)}
                  className={`p-5 rounded-xl border-2 text-left transition-all
                    ${accountType === opt.type ? 'border-red-500 bg-red-500/10' : 'border-gray-700 hover:border-gray-500'}`}>
                  <div className={`mb-3 ${accountType === opt.type ? 'text-red-400' : 'text-gray-400'}`}>{opt.icon}</div>
                  <p className="font-semibold text-white text-sm">{opt.label}</p>
                  <p className="text-xs text-gray-500 mt-1">{opt.desc}</p>
                </button>
              ))}
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-400 mb-2">
                {accountType === 'individual' ? 'Your name' : 'Organisation name'}
              </label>
              <input type="text" value={orgName} onChange={e => setOrgName(e.target.value)}
                placeholder={accountType === 'individual' ? 'e.g. Priya Sharma' : 'e.g. Mumbai Cricket Club'}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-red-500 placeholder-gray-600" />
            </div>

            <button onClick={saveProfile} disabled={!accountType || !orgName.trim() || saving}
              className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white py-3 rounded-xl font-semibold transition-colors">
              {saving ? 'Saving…' : 'Continue →'}
            </button>
          </>
        )}

        {step === 2 && (
          <>
            <h2 className="text-xl font-bold mb-2">Upload your first asset</h2>
            <p className="text-gray-400 text-sm mb-6">Add an image or video to protect. We'll scan the web for unauthorized copies.</p>

            <div onClick={() => document.getElementById('ob-file').click()}
              className="border-2 border-dashed border-gray-700 hover:border-red-500/50 rounded-xl p-10 text-center cursor-pointer transition-colors mb-6">
              <input id="ob-file" type="file" className="hidden" accept="image/*,video/*"
                onChange={e => setFile(e.target.files[0])} />
              {file ? (
                <>
                  <CheckCircle size={40} className="text-green-400 mx-auto mb-3" />
                  <p className="text-white font-medium">{file.name}</p>
                  <p className="text-xs text-gray-500 mt-1">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
                </>
              ) : (
                <>
                  <Upload size={40} className="text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-400">Click to select a file</p>
                  <p className="text-xs text-gray-600 mt-1">Max 50 MB</p>
                </>
              )}
            </div>

            <div className="flex gap-3">
              <button onClick={() => router.push('/')}
                className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 text-gray-400 rounded-xl font-medium transition-colors text-sm">
                Skip for now
              </button>
              <button onClick={uploadAsset} disabled={!file || uploading}
                className="flex-1 py-3 bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white rounded-xl font-semibold transition-colors">
                {uploading ? 'Uploading…' : 'Upload & Scan'}
              </button>
            </div>
          </>
        )}

        {step === 3 && (
          <div className="text-center py-6">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-xl font-bold mb-2">You're protected!</h2>
            <p className="text-gray-400 text-sm mb-2">Your asset is fingerprinted and a scan is running.</p>
            <p className="text-gray-500 text-xs">Taking you to your dashboard…</p>
          </div>
        )}
      </div>
    </div>
  );
}