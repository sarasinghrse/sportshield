import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { Shield, Upload, X, CheckCircle, ArrowLeft, Film, Bell } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const MAX_SIZE_MB = 50;

export default function UploadPage() {
  const router = useRouter();
  const fileInputRef = useRef(null);

  const [selectedFile,   setSelectedFile]   = useState(null);
  const [preview,        setPreview]        = useState(null);
  const [uploading,      setUploading]      = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedAsset,  setUploadedAsset]  = useState(null);
  const [dragOver,       setDragOver]       = useState(false);

  const handleFileSelect = useCallback((file) => {
    if (!file) return;
    const allowedTypes = ['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/quicktime','video/x-msvideo','video/webm'];
    if (!allowedTypes.includes(file.type)) { toast.error('Unsupported file type.'); return; }
    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > MAX_SIZE_MB) { toast.error(`File too large (${sizeMB.toFixed(1)} MB). Max is ${MAX_SIZE_MB} MB.`); return; }
    setSelectedFile(file);
    setUploadedAsset(null);
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => setPreview({ type: 'image', src: e.target.result });
      reader.readAsDataURL(file);
    } else {
      setPreview({ type: 'video' });
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    handleFileSelect(e.dataTransfer.files[0]);
  }, [handleFileSelect]);

  const startFakeProgress = () => {
    setUploadProgress(0);
    let val = 0;
    const iv = setInterval(() => {
      val += val < 70 ? Math.random() * 7 : Math.random() * 1.5;
      if (val >= 90) { clearInterval(iv); val = 90; }
      setUploadProgress(Math.min(Math.round(val), 90));
    }, 400);
    return iv;
  };

  const handleUpload = async () => {
    if (!selectedFile || uploading) return;
    setUploading(true);
    const iv = startFakeProgress();
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      const res = await fetch(`${API_URL}/api/media/upload`, { method: 'POST', body: formData });
      clearInterval(iv);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || `Server error ${res.status}`);
      }
      const data = await res.json();
      setUploadProgress(100);
      setUploadedAsset(data);
      toast.success('Upload successful! Background scan started.');
    } catch (err) {
      clearInterval(iv);
      setUploadProgress(0);
      toast.error(`Upload failed: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null); setPreview(null); setUploadedAsset(null); setUploadProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Toaster position="top-right" />
      <nav className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center gap-4">
        <Link href="/" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
          <ArrowLeft size={20} /><span className="text-sm">Dashboard</span>
        </Link>
        <div className="flex items-center gap-2 ml-2">
          <Shield className="text-red-500" size={22} />
          <span className="font-bold text-white">SportShield</span>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-6 py-12">
        <h1 className="text-2xl font-bold text-white mb-2">Upload Media Asset</h1>
        <p className="text-gray-400 mb-8">Upload an image or video to register its fingerprint and begin monitoring for unauthorized use.</p>

        {uploadedAsset ? (
          <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-8 text-center">
            <CheckCircle size={48} className="text-green-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Asset Registered!</h2>
            <p className="text-gray-400 mb-2"><strong className="text-white">{uploadedAsset.filename}</strong> has been fingerprinted.</p>
            <p className="text-gray-500 text-sm mb-6">Background scan started. Results appear on the dashboard in a few minutes.</p>
            {uploadedAsset.phash && (
              <div className="bg-gray-900 rounded-lg p-4 mb-6 text-left">
                <div className="text-xs text-gray-500 mb-1">Perceptual Hash (pHash)</div>
                <code className="text-green-400 font-mono text-sm break-all">{uploadedAsset.phash}</code>
              </div>
            )}
            <div className="flex gap-3 justify-center flex-wrap">
              <button onClick={handleReset} className="px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2">
                <Upload size={16} /> Upload Another
              </button>
              <Link href="/" className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors">
                View Dashboard →
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onClick={() => !selectedFile && fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-12 text-center transition-all cursor-pointer ${
                dragOver ? 'border-red-500 bg-red-500/10' : selectedFile ? 'border-gray-700 bg-gray-900 cursor-default' : 'border-gray-700 bg-gray-900 hover:border-red-500/50'}`}
            >
              <input ref={fileInputRef} type="file" className="hidden"
                accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime,video/x-msvideo,video/webm"
                onChange={(e) => handleFileSelect(e.target.files?.[0])} />
              {!selectedFile ? (
                <>
                  <Upload size={48} className="text-gray-600 mx-auto mb-4" />
                  <p className="text-white font-semibold mb-2">Drop your file here or click to browse</p>
                  <p className="text-gray-500 text-sm">Images: JPEG, PNG, WebP, GIF · Videos: MP4, MOV, AVI, WebM</p>
                  <p className="text-gray-600 text-xs mt-2">Maximum size: {MAX_SIZE_MB} MB</p>
                </>
              ) : (
                <div className="space-y-4">
                  {preview?.type === 'image' ? (
                    <img src={preview.src} alt="Preview" className="max-h-48 mx-auto rounded-lg object-contain" />
                  ) : (
                    <div className="flex items-center justify-center gap-3">
                      <Film size={40} className="text-blue-400" />
                      <div className="text-left">
                        <p className="text-white font-medium">{selectedFile.name}</p>
                        <p className="text-gray-500 text-sm">Video file</p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center justify-center gap-4 text-sm">
                    <span className="text-gray-400">{selectedFile.name} · {(selectedFile.size / 1024 / 1024).toFixed(2)} MB</span>
                    <button onClick={(e) => { e.stopPropagation(); handleReset(); }} className="text-gray-500 hover:text-red-400 transition-colors">
                      <X size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {uploading && (
              <div className="mt-4">
                <div className="flex justify-between text-sm text-gray-400 mb-2">
                  <span>Uploading & fingerprinting…</span><span>{uploadProgress}%</span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-2">
                  <div className="bg-red-500 h-2 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                </div>
                <p className="text-xs text-gray-600 mt-2">First upload may take ~30 s while the server wakes up.</p>
              </div>
            )}

            <button onClick={handleUpload} disabled={!selectedFile || uploading}
              className={`mt-6 w-full py-4 rounded-xl font-semibold text-lg flex items-center justify-center gap-2 transition-colors ${
                !selectedFile || uploading ? 'bg-gray-800 text-gray-600 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700 text-white'}`}>
              <Shield size={20} />
              {uploading ? 'Uploading…' : 'Register & Start Monitoring'}
            </button>

            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              {[
                { icon: <Shield size={18} className="text-blue-400" />, title: 'Fingerprinted', desc: 'A unique pHash is generated from your media, robust to compression and resizing.' },
                { icon: <CheckCircle size={18} className="text-green-400" />, title: 'Scanned', desc: 'We search the web for unauthorized copies and compare against your fingerprint.' },
                { icon: <Bell size={18} className="text-yellow-400" />, title: 'Alerted', desc: 'You get an instant alert if an unauthorized copy is found anywhere online.' },
              ].map(({ icon, title, desc }) => (
                <div key={title} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">{icon}<span className="font-semibold text-white">{title}</span></div>
                  <p className="text-gray-500">{desc}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}