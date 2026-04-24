import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { ArrowLeft, Copy, Download, FileText } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import toast, { Toaster } from 'react-hot-toast';
import { db } from '../../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

export default function DmcaPage() {
  const router        = useRouter();
  const { alertId }   = router.query;
  const [alert,       setAlert]       = useState(null);
  const [asset,       setAsset]       = useState(null);
  const [loading,     setLoading]     = useState(true);

  // Editable contact fields
  const [name,    setName]    = useState('');
  const [phone,   setPhone]   = useState('');
  const [address, setAddress] = useState('');

  useEffect(() => {
    if (!alertId) return;
    (async () => {
      const alertSnap = await getDoc(doc(db, 'alerts', alertId));
      if (!alertSnap.exists()) { setLoading(false); return; }
      const alertData = { id: alertSnap.id, ...alertSnap.data() };
      setAlert(alertData);

      if (alertData.assetId) {
        const assetSnap = await getDoc(doc(db, 'assets', alertData.assetId));
        if (assetSnap.exists()) setAsset({ id: assetSnap.id, ...assetSnap.data() });
      }
      setLoading(false);
    })();
  }, [alertId]);

  const uploadedDate = asset?.uploadedAt?.toDate?.() || new Date();
  const noticeDate   = format(new Date(), 'MMMM d, yyyy');

  const noticeText = `DMCA TAKEDOWN NOTICE
Date: ${noticeDate}

To Whom It May Concern,

I am writing to notify you of an infringement of my copyright under the Digital Millennium Copyright Act (17 U.S.C. § 512).

IDENTIFICATION OF COPYRIGHTED WORK
Asset Name:      ${asset?.filename || '[Asset Name]'}
Asset Type:      ${asset?.type || 'image'}
Upload Date:     ${format(uploadedDate, 'MMMM d, yyyy')}
Perceptual Hash: ${asset?.phash || '[pHash fingerprint]'}
Confidence:      ${Math.round((alert?.confidence || 0) * 100)}%

LOCATION OF INFRINGING MATERIAL
URL: ${alert?.foundUrl || '[Violation URL]'}

I have a good faith belief that use of the copyrighted material described above is not authorized by the copyright owner, its agent, or the law.

I declare, under penalty of perjury, that the information in this notification is accurate, and that I am the copyright owner or am authorized to act on behalf of the copyright owner.

Contact Information:
Name:    ${name || '[Your Full Name]'}
Phone:   ${phone || '[Your Phone Number]'}
Address: ${address || '[Your Address]'}

Signature: ${name || '[Your Full Name]'}
Date: ${noticeDate}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(noticeText)
      .then(() => toast.success('Copied to clipboard!'))
      .catch(() => toast.error('Failed to copy'));
  };

  const handleDownload = () => {
    const blob = new Blob([noticeText], { type: 'text/plain' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `DMCA_Notice_${alertId?.slice(0, 8) || 'notice'}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Downloaded!');
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
      <p className="text-gray-500">Loading…</p>
    </div>
  );

  if (!alert) return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center gap-4">
      <p className="text-gray-400">Alert not found.</p>
      <Link href="/alerts" className="text-red-400 hover:text-red-300 text-sm">← Back to Alerts</Link>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Toaster position="top-right" />
      <nav className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center gap-4">
        <Link href="/alerts" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
          <ArrowLeft size={20} /><span className="text-sm">Alerts</span>
        </Link>
        <div className="flex items-center gap-2 ml-2">
          <FileText className="text-red-500" size={20} />
          <span className="font-bold text-white">DMCA Notice Generator</span>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-8">
        {/* Violation summary */}
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-5 mb-6">
          <p className="text-sm font-semibold text-red-400 mb-1">Violation Detected</p>
          <p className="text-sm text-gray-300 truncate">{alert.foundUrl}</p>
          <p className="text-xs text-gray-500 mt-1">
            {Math.round((alert.confidence || 0) * 100)}% confidence · Asset: {asset?.filename || 'Unknown'}
          </p>
        </div>

        {/* Contact fields */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6">
          <h2 className="text-sm font-semibold text-gray-300 mb-4">Your Contact Information</h2>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Full Name</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="John Smith"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-red-500 transition-colors"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Phone Number</label>
              <input
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="+1 (555) 000-0000"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-red-500 transition-colors"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Address</label>
              <input
                value={address}
                onChange={e => setAddress(e.target.value)}
                placeholder="123 Main St, City, State, ZIP"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-red-500 transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Notice preview */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden mb-6">
          <div className="flex items-center justify-between px-5 py-3 border-b border-gray-800">
            <span className="text-sm font-semibold text-gray-300">Notice Preview</span>
            <div className="flex gap-2">
              <button onClick={handleCopy}
                className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 px-3 py-1.5 rounded-lg transition-colors">
                <Copy size={12} /> Copy
              </button>
              <button onClick={handleDownload}
                className="flex items-center gap-1.5 text-xs text-white bg-red-600 hover:bg-red-700 px-3 py-1.5 rounded-lg transition-colors">
                <Download size={12} /> Download .txt
              </button>
            </div>
          </div>
          <pre className="px-5 py-4 text-xs text-gray-300 font-mono whitespace-pre-wrap leading-relaxed overflow-auto max-h-[500px]">
            {noticeText}
          </pre>
        </div>

        <p className="text-xs text-gray-600 text-center">
          This notice is auto-generated. Consult a legal professional before sending.
        </p>
      </main>
    </div>
  );
}
