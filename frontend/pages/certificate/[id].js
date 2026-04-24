import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { ArrowLeft, Award, Download } from 'lucide-react';
import { format } from 'date-fns';
import { db } from '../../lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { useAuth } from '../../lib/useAuth';

export default function CertificatePage() {
  const router      = useRouter();
  const { id }      = router.query;
  const { profile } = useAuth();
  const [asset, setAsset]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (!id) return;
    const unsub = onSnapshot(doc(db, 'assets', id), snap => {
      if (snap.exists()) setAsset({ id: snap.id, ...snap.data() });
      setLoading(false);
    });
    return () => unsub();
  }, [id]);

  const handleDownload = async () => {
    if (generating || !asset) return;
    setGenerating(true);
    try {
      const { jsPDF } = await import('jspdf');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

      const W       = 210;
      const uploadedAt = asset.uploadedAt?.toDate?.() || new Date();
      const certDate   = format(new Date(), 'MMMM d, yyyy');
      const uploadDate = format(uploadedAt, 'MMMM d, yyyy');
      const orgName    = profile?.orgName || 'SportShield User';

      // Red header band
      pdf.setFillColor(220, 38, 38);
      pdf.rect(0, 0, W, 42, 'F');

      // Shield icon placeholder
      pdf.setFillColor(255, 255, 255);
      pdf.circle(20, 21, 9, 'F');
      pdf.setFontSize(14);
      pdf.setTextColor(220, 38, 38);
      pdf.text('⬡', 15.5, 24.5);

      // Header text
      pdf.setFontSize(22);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(255, 255, 255);
      pdf.text('SPORTSHIELD', 34, 17);

      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(254, 202, 202);
      pdf.text('IP Protection Platform', 34, 24);

      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(255, 255, 255);
      pdf.text('CERTIFICATE OF OWNERSHIP', 34, 34);

      // Certificate ID band
      pdf.setFillColor(17, 24, 39);
      pdf.rect(0, 42, W, 10, 'F');
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(156, 163, 175);
      pdf.text(`Certificate ID: SS-${id?.slice(0, 8).toUpperCase() || '--------'}   |   Issued: ${certDate}`, 14, 49);

      // Body
      let y = 64;
      const field = (label, value) => {
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(107, 114, 128);
        pdf.text(label.toUpperCase(), 14, y);
        y += 5;
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(17, 24, 39);
        pdf.text(value, 14, y);
        y += 10;
      };

      field('Organization / Rights Holder', orgName);
      field('Asset Name', asset.filename || 'Unnamed Asset');
      field('Asset Type', (asset.type || 'image').toUpperCase());
      field('Upload Date', uploadDate);
      field('Certificate Date', certDate);

      // Divider
      pdf.setDrawColor(229, 231, 235);
      pdf.setLineWidth(0.5);
      pdf.line(14, y, W - 14, y);
      y += 8;

      // pHash box
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(107, 114, 128);
      pdf.text('PERCEPTUAL FINGERPRINT (pHash)', 14, y);
      y += 5;
      pdf.setFillColor(243, 244, 246);
      pdf.roundedRect(14, y, W - 28, 12, 2, 2, 'F');
      pdf.setFontSize(9);
      pdf.setFont('courier', 'normal');
      pdf.setTextColor(22, 163, 74);
      pdf.text(asset.phash || 'N/A', 18, y + 8);
      y += 20;

      // Footer band
      pdf.setFillColor(17, 24, 39);
      pdf.rect(0, 277, W, 20, 'F');
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(156, 163, 175);
      pdf.text('This certificate is machine-generated and cryptographically linked to the asset fingerprint.', 14, 285);
      pdf.text('Verify at: sportshield-rouge.vercel.app/verify', 14, 292);

      pdf.save(`SportShield_Certificate_${id?.slice(0, 8) || 'asset'}.pdf`);
    } catch (err) {
      console.error(err);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
      <p className="text-gray-500">Loading…</p>
    </div>
  );

  if (!asset) return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center gap-4">
      <p className="text-gray-400">Asset not found.</p>
      <Link href="/" className="text-red-400 hover:text-red-300 text-sm">← Dashboard</Link>
    </div>
  );

  const uploadedAt = asset.uploadedAt?.toDate?.() || new Date();
  const orgName    = profile?.orgName || 'SportShield User';

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <nav className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center gap-4">
        <Link href={`/assets/${id}`} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
          <ArrowLeft size={20} /><span className="text-sm">Asset Detail</span>
        </Link>
        <div className="flex items-center gap-2 ml-2">
          <Award className="text-red-500" size={20} />
          <span className="font-bold text-white">Ownership Certificate</span>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-6 py-8">
        {/* Certificate preview card */}
        <div className="bg-white rounded-2xl overflow-hidden shadow-2xl mb-8">
          {/* Red header */}
          <div className="bg-red-600 px-8 py-6 flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <Award size={28} className="text-white" />
            </div>
            <div>
              <p className="text-white font-black text-xl tracking-wide">SPORTSHIELD</p>
              <p className="text-red-200 text-xs">IP Protection Platform</p>
              <p className="text-white font-bold text-sm mt-0.5">CERTIFICATE OF OWNERSHIP</p>
            </div>
          </div>

          {/* Dark cert ID bar */}
          <div className="bg-gray-900 px-8 py-2 flex items-center justify-between">
            <span className="text-gray-400 text-xs font-mono">
              SS-{id?.slice(0, 8).toUpperCase() || '--------'}
            </span>
            <span className="text-gray-400 text-xs">
              Issued: {format(new Date(), 'MMM d, yyyy')}
            </span>
          </div>

          {/* Body */}
          <div className="px-8 py-6 space-y-4">
            {[
              { label: 'Organization / Rights Holder', value: orgName },
              { label: 'Asset Name',  value: asset.filename || 'Unnamed Asset' },
              { label: 'Asset Type',  value: (asset.type || 'image').toUpperCase() },
              { label: 'Upload Date', value: format(uploadedAt, 'MMMM d, yyyy') },
            ].map(f => (
              <div key={f.label}>
                <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">{f.label}</p>
                <p className="text-gray-900 font-bold text-sm mt-0.5">{f.value}</p>
              </div>
            ))}

            <div className="border-t border-gray-200 pt-4">
              <p className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-2">
                Perceptual Fingerprint (pHash)
              </p>
              <div className="bg-gray-100 rounded-lg px-4 py-3">
                <code className="text-green-700 font-mono text-xs break-all">
                  {asset.phash || 'N/A'}
                </code>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-900 px-8 py-3">
            <p className="text-gray-500 text-xs">
              This certificate is machine-generated and linked to the asset fingerprint.
            </p>
          </div>
        </div>

        {/* Download button */}
        <button
          onClick={handleDownload}
          disabled={generating}
          className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-colors"
        >
          <Download size={18} />
          {generating ? 'Generating PDF…' : 'Download Certificate PDF'}
        </button>

        <p className="text-center text-xs text-gray-600 mt-4">
          PDF includes a cryptographic fingerprint for legal use.
        </p>
      </main>
    </div>
  );
}
