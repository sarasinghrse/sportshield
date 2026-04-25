import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import toast, { Toaster } from 'react-hot-toast';
import { db } from '../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';

const API_URL    = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const MAX_SIZE_MB = 50;

export default function UploadPage() {
  const router         = useRouter();
  const fileInputRef   = useRef(null);

  const [selectedFile,   setSelectedFile]   = useState(null);
  const [preview,        setPreview]        = useState(null);
  const [uploading,      setUploading]      = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedAsset,  setUploadedAsset]  = useState(null);
  const [dragOver,       setDragOver]       = useState(false);
  const [isPublic,       setIsPublic]       = useState(true); // default: share on community

  const handleFileSelect = useCallback((file) => {
    if (!file) return;
    const allowed = ['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/quicktime','video/x-msvideo','video/webm'];
    if (!allowed.includes(file.type)) { toast.error('Unsupported file type.'); return; }
    const mb = file.size / (1024 * 1024);
    if (mb > MAX_SIZE_MB) { toast.error(`File too large (${mb.toFixed(1)} MB). Max ${MAX_SIZE_MB} MB.`); return; }
    setSelectedFile(file);
    setUploadedAsset(null);
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = e => setPreview({ type: 'image', src: e.target.result });
      reader.readAsDataURL(file);
    } else { setPreview({ type: 'video' }); }
  }, []);

  const handleDrop = useCallback(e => {
    e.preventDefault(); setDragOver(false);
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

      // Set visibility based on toggle
      if (data.id) {
        await updateDoc(doc(db, 'assets', data.id), { isPublic });
      }
      toast.success(isPublic
        ? 'Asset registered! Visible on Community Dashboard.'
        : 'Asset registered privately! Scan started.');
    } catch (err) {
      clearInterval(iv);
      setUploadProgress(0);
      toast.error(`Upload failed: ${err.message}`);
    } finally { setUploading(false); }
  };

  const handleReset = () => {
    setSelectedFile(null); setPreview(null);
    setUploadedAsset(null); setUploadProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="ap-root">
      <Toaster position="top-right" toastOptions={{ style: { background: '#0d1f10', color: '#fff', border: '1px solid rgba(26,92,26,0.4)' } }} />

      {/* Nav */}
      <nav className="ap-nav">
        <div className="ap-nav-left">
          <Link href="/" className="ap-back">← Dashboard</Link>
          <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.1)' }} />
          <Link href="/" className="ap-logo">
            <img src="/images/sportshield-logo-transparent.png" alt="SportShield" />
            <span className="ap-logo-text">SPORTSHIELD</span>
          </Link>
          <span className="ap-page-tag" style={{ marginLeft: 4 }}>/ Upload</span>
        </div>
      </nav>

      <main style={{ maxWidth: 680, margin: '0 auto', padding: '40px 24px' }}>

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <h1 className="ap-heading">Upload Media Asset</h1>
          <p className="ap-muted" style={{ marginTop: 8 }}>
            Upload an image or video to register its fingerprint and begin monitoring for unauthorized use.
          </p>
        </div>

        {uploadedAsset ? (
          /* ── Success state ── */
          <div className="ap-card" style={{ padding: '36px 32px', textAlign: 'center', border: '1px solid rgba(74,222,128,0.25)', background: 'rgba(74,222,128,0.04)' }}>
            <div style={{ fontSize: '3rem', marginBottom: 16 }}>✅</div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '1.6rem', color: '#fff', marginBottom: 8 }}>
              Asset Registered!
            </h2>
            <p className="ap-muted" style={{ marginBottom: 6 }}>
              <strong style={{ color: '#fff' }}>{uploadedAsset.filename}</strong> has been fingerprinted.
            </p>
            <p className="ap-muted" style={{ marginBottom: 4, fontSize: '0.82rem' }}>
              Background scan started. Results appear in a few minutes.
            </p>
            <p style={{ fontSize: '0.8rem', color: isPublic ? '#4ade80' : 'rgba(255,255,255,0.4)', marginBottom: 24 }}>
              {isPublic ? '🌐 Visible on Community Dashboard' : '🔒 Private — only you can see this'}
            </p>
            {uploadedAsset.phash && (
              <div className="ap-card" style={{ padding: '14px 18px', marginBottom: 24, textAlign: 'left' }}>
                <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.38)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700, marginBottom: 6 }}>
                  Perceptual Hash (pHash)
                </p>
                <code style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: '#4ade80', wordBreak: 'break-all' }}>
                  {uploadedAsset.phash}
                </code>
              </div>
            )}
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button onClick={handleReset} className="ap-btn ap-btn-ghost">
                Upload Another
              </button>
              <Link href="/" className="ap-btn ap-btn-green">
                View Dashboard →
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* ── Drop zone ── */}
            <div
              className={`ap-dropzone${dragOver ? ' drag' : ''}${selectedFile ? ' has-file' : ''}`}
              onDrop={handleDrop}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onClick={() => !selectedFile && fileInputRef.current?.click()}
            >
              <input ref={fileInputRef} type="file"
                style={{ display: 'none' }}
                accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime,video/x-msvideo,video/webm"
                onChange={e => handleFileSelect(e.target.files?.[0])} />

              {!selectedFile ? (
                <div>
                  <div style={{ fontSize: '2.5rem', marginBottom: 14 }}>📂</div>
                  <p style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.1rem', color: '#fff', marginBottom: 8 }}>
                    Drop your file here or click to browse
                  </p>
                  <p className="ap-muted" style={{ fontSize: '0.82rem' }}>Images: JPEG, PNG, WebP, GIF · Videos: MP4, MOV, AVI, WebM</p>
                  <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.25)', marginTop: 6 }}>Max {MAX_SIZE_MB} MB</p>
                </div>
              ) : (
                <div>
                  {preview?.type === 'image' ? (
                    <img src={preview.src} alt="Preview"
                      style={{ maxHeight: 180, maxWidth: '100%', borderRadius: 10, objectFit: 'contain', marginBottom: 14 }} />
                  ) : (
                    <div style={{ fontSize: '3rem', marginBottom: 14 }}>🎬</div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                    <span className="ap-muted" style={{ fontSize: '0.85rem' }}>
                      {selectedFile.name} · {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </span>
                    <button onClick={e => { e.stopPropagation(); handleReset(); }}
                      style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '1.1rem', transition: 'color 0.2s' }}
                      onMouseEnter={e => e.target.style.color = '#f87171'}
                      onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.4)'}
                    >✕</button>
                  </div>
                </div>
              )}
            </div>

            {/* Progress bar */}
            {uploading && (
              <div style={{ marginTop: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: 'rgba(255,255,255,0.45)', marginBottom: 8 }}>
                  <span>Uploading & fingerprinting…</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="ap-progress-track">
                  <div className="ap-progress-fill" style={{ width: `${uploadProgress}%` }} />
                </div>
                <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.28)', marginTop: 6 }}>
                  First upload may take ~30 s while the server wakes up.
                </p>
              </div>
            )}

            {/* ── Public / Private toggle ── */}
            <div className="ap-card" style={{ padding: '18px 20px', marginTop: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '0.95rem', color: '#fff', marginBottom: 3 }}>
                  {isPublic ? '🌐 Share on Community Dashboard' : '🔒 Keep Private'}
                </p>
                <p className="ap-muted" style={{ fontSize: '0.78rem' }}>
                  {isPublic
                    ? 'This asset and its violations will be visible to everyone on the public dashboard.'
                    : 'Only you can see this asset and its results.'}
                </p>
              </div>
              <label className="ap-toggle" style={{ flexShrink: 0, marginLeft: 20 }}>
                <input type="checkbox" checked={isPublic} onChange={e => setIsPublic(e.target.checked)} />
                <span className="ap-toggle-slider" />
              </label>
            </div>

            {/* Upload button */}
            <button
              onClick={handleUpload}
              disabled={!selectedFile || uploading}
              className="ap-btn ap-btn-green"
              style={{ marginTop: 16, width: '100%', justifyContent: 'center', padding: '14px', fontSize: '0.95rem' }}
            >
              {uploading ? 'Uploading…' : 'Register & Start Monitoring'}
            </button>

            {/* Info cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginTop: 28 }}>
              {[
                { icon: '🔏', title: 'Fingerprinted',  desc: 'A unique pHash is generated — robust to compression, resizing, and cropping.' },
                { icon: '🌐', title: 'Scanned',         desc: 'We search the web for unauthorized copies using reverse image search and AI.' },
                { icon: '🔔', title: 'Alerted',         desc: 'You get an instant alert the moment an unauthorized copy is detected.' },
              ].map(c => (
                <div key={c.title} className="ap-card" style={{ padding: '18px 16px' }}>
                  <div style={{ fontSize: '1.5rem', marginBottom: 8 }}>{c.icon}</div>
                  <p style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '0.95rem', color: '#fff', marginBottom: 6 }}>{c.title}</p>
                  <p className="ap-muted" style={{ fontSize: '0.78rem', lineHeight: 1.6 }}>{c.desc}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
