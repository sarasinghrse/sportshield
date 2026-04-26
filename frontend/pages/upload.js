import { useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import toast, { Toaster } from 'react-hot-toast';
import { db } from '../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import ProfileAvatar from '../components/ProfileAvatar';

const API_URL    = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const MAX_SIZE_MB = 50;
const TAB_UPLOAD  = 'upload';
const TAB_URL     = 'url';

export default function UploadPage() {
  const fileInputRef = useRef(null);
  const [tab,             setTab]            = useState(TAB_UPLOAD);

  /* File upload */
  const [selectedFile,    setSelectedFile]   = useState(null);
  const [preview,         setPreview]        = useState(null);
  const [uploading,       setUploading]      = useState(false);
  const [uploadProgress,  setUploadProgress] = useState(0);
  const [uploadedAsset,   setUploadedAsset]  = useState(null);
  const [dragOver,        setDragOver]       = useState(false);
  const [isPublic,        setIsPublic]       = useState(true);

  /* Social URL */
  const [socialUrl,       setSocialUrl]      = useState('');
  const [socialLabel,     setSocialLabel]    = useState('');
  const [scanning,        setScanning]       = useState(false);
  const [socialResult,    setSocialResult]   = useState(null);

  /* ── File helpers ── */
  const handleFileSelect = useCallback((file) => {
    if (!file) return;
    const allowed = ['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/quicktime','video/x-msvideo','video/webm'];
    if (!allowed.includes(file.type)) { toast.error('Unsupported file type.'); return; }
    const mb = file.size / (1024 * 1024);
    if (mb > MAX_SIZE_MB) { toast.error(`File too large (${mb.toFixed(1)} MB). Max ${MAX_SIZE_MB} MB.`); return; }
    setSelectedFile(file); setUploadedAsset(null);
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
      const id = data.id || data.assetId;
      if (id) await updateDoc(doc(db, 'assets', id), { isPublic });
      toast.success(isPublic ? 'Asset registered! Visible on Community Dashboard.' : 'Asset registered privately!');
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

  /* ── Social URL scan ── */
  const handleSocialScan = async () => {
    const trimmed = socialUrl.trim();
    if (!trimmed) return;
    setScanning(true); setSocialResult(null);
    try {
      const res  = await fetch(`${API_URL}/api/media/scan-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: trimmed, label: socialLabel || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || `Error ${res.status}`);
      const id = data.id || data.assetId;
      if (id) await updateDoc(doc(db, 'assets', id), { isPublic });
      setSocialResult(data);
      toast.success('Image extracted and scan started!');
    } catch (err) {
      toast.error(`Scan failed: ${err.message}`);
    } finally { setScanning(false); }
  };

  /* ── Shared success card ── */
  const SuccessCard = ({ asset, onReset }) => (
    <div className="ap-card" style={{ padding: '36px 32px', textAlign: 'center', border: '1px solid rgba(74,222,128,0.25)', background: 'rgba(74,222,128,0.04)' }}>
      <div style={{ marginBottom: 16, display:"flex", justifyContent:"center" }}><svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></div>
      <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '1.6rem', color: '#fff', marginBottom: 8 }}>Asset Registered!</h2>
      <p className="ap-muted" style={{ marginBottom: 4 }}>
        <strong style={{ color: '#fff' }}>{asset.filename || 'Extracted image'}</strong> has been fingerprinted.
      </p>
      <p className="ap-muted" style={{ marginBottom: 4, fontSize: '0.82rem' }}>Background scan started. Results appear in a few minutes.</p>
      <p style={{ fontSize: '0.8rem', color: isPublic ? '#4ade80' : 'rgba(255,255,255,0.4)', marginBottom: 24 }}>
        {isPublic ? 'Visible on Community Dashboard' : 'Private — only you can see this'}
      </p>
      {asset.phash && (
        <div className="ap-card" style={{ padding: '14px 18px', marginBottom: 24, textAlign: 'left' }}>
          <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.38)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700, marginBottom: 6 }}>Perceptual Hash (pHash)</p>
          <code style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: '#4ade80', wordBreak: 'break-all' }}>{asset.phash}</code>
        </div>
      )}
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
        <button onClick={onReset} className="ap-btn ap-btn-ghost">Scan Another</button>
        <Link href="/" className="ap-btn ap-btn-green">View Dashboard →</Link>
      </div>
    </div>
  );

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
          <span className="ap-page-tag">/ Upload</span>
        </div>
        <div className="ap-nav-right">
          <Link href="/public-dashboard" className="ap-nav-link">Community</Link>
          <ProfileAvatar />
        </div>
      </nav>

      <main style={{ maxWidth: 720, margin: '0 auto', padding: '40px 24px' }}>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <h1 className="ap-heading">Protect Your Media</h1>
          <p className="ap-muted" style={{ marginTop: 8 }}>
            Upload a file or paste a social media / web URL to register its fingerprint and start monitoring for unauthorized use.
          </p>
        </div>

        {/* Tab switcher */}
        <div style={{ display: 'flex', marginBottom: 24, background: 'rgba(12,24,14,0.7)', borderRadius: 10, border: '1px solid rgba(26,92,26,0.28)', overflow: 'hidden' }}>
          {[
            { key: TAB_UPLOAD, label: 'Upload File' },
            { key: TAB_URL,    label: 'Social / Web URL' },
          ].map(t => (
            <button key={t.key} onClick={() => { setTab(t.key); setUploadedAsset(null); setSocialResult(null); }}
              style={{
                flex: 1, padding: '13px 20px', border: 'none', cursor: 'pointer',
                fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '0.87rem', letterSpacing: '0.04em',
                background:   tab === t.key ? 'rgba(26,92,26,0.45)' : 'none',
                color:        tab === t.key ? '#4ade80' : 'rgba(255,255,255,0.4)',
                borderBottom: tab === t.key ? '2px solid #4ade80' : '2px solid transparent',
                transition: 'all 0.2s',
              }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ════════ FILE UPLOAD TAB ════════ */}
        {tab === TAB_UPLOAD && (
          uploadedAsset ? <SuccessCard asset={uploadedAsset} onReset={handleReset} /> : (
            <>
              <div
                className={`ap-dropzone${dragOver ? ' drag' : ''}${selectedFile ? ' has-file' : ''}`}
                onDrop={handleDrop}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onClick={() => !selectedFile && fileInputRef.current?.click()}
              >
                <input ref={fileInputRef} type="file" style={{ display: 'none' }}
                  accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime,video/x-msvideo,video/webm"
                  onChange={e => handleFileSelect(e.target.files?.[0])} />
                {!selectedFile ? (
                  <div>
                    <div style={{ marginBottom: 14, display:"flex", justifyContent:"center" }}><svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="rgba(74,222,128,0.5)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg></div>
                    <p style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.1rem', color: '#fff', marginBottom: 8 }}>
                      Drop your file here or click to browse
                    </p>
                    <p className="ap-muted" style={{ fontSize: '0.82rem' }}>Images: JPEG, PNG, WebP, GIF · Videos: MP4, MOV, AVI, WebM</p>
                    <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.25)', marginTop: 6 }}>Max {MAX_SIZE_MB} MB</p>
                  </div>
                ) : (
                  <div>
                    {preview?.type === 'image' ? (
                      <img src={preview.src} alt="Preview" style={{ maxHeight: 180, maxWidth: '100%', borderRadius: 10, objectFit: 'contain', marginBottom: 14 }} />
                    ) : (
                      <div style={{ marginBottom: 14, display:"flex", justifyContent:"center" }}><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="rgba(74,222,128,0.5)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg></div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                      <span className="ap-muted" style={{ fontSize: '0.85rem' }}>{selectedFile.name} · {(selectedFile.size/1024/1024).toFixed(2)} MB</span>
                      <button onClick={e => { e.stopPropagation(); handleReset(); }}
                        style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', display:'flex', alignItems:'center' }}
                        onMouseEnter={e => e.currentTarget.style.color = '#f87171'}
                        onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.4)'}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
                    </div>
                  </div>
                )}
              </div>

              {uploading && (
                <div style={{ marginTop: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: 'rgba(255,255,255,0.45)', marginBottom: 8 }}>
                    <span>Uploading & fingerprinting…</span><span>{uploadProgress}%</span>
                  </div>
                  <div className="ap-progress-track"><div className="ap-progress-fill" style={{ width: `${uploadProgress}%` }} /></div>
                  <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.28)', marginTop: 6 }}>First upload may take ~30 s while the server wakes up.</p>
                </div>
              )}

              <div className="ap-card" style={{ padding: '18px 20px', marginTop: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                <div>
                  <p style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '0.95rem', color: '#fff', marginBottom: 3 }}>
                    {isPublic ? 'Share on Community Dashboard' : 'Keep Private'}
                  </p>
                  <p className="ap-muted" style={{ fontSize: '0.78rem' }}>
                    {isPublic ? 'Violations will be visible to everyone on the public dashboard.' : 'Only you can see this asset.'}
                  </p>
                </div>
                <label className="ap-toggle" style={{ flexShrink: 0 }}>
                  <input type="checkbox" checked={isPublic} onChange={e => setIsPublic(e.target.checked)} />
                  <span className="ap-toggle-slider" />
                </label>
              </div>

              <button onClick={handleUpload} disabled={!selectedFile || uploading} className="ap-btn ap-btn-green"
                style={{ marginTop: 16, width: '100%', justifyContent: 'center', padding: '14px', fontSize: '0.95rem' }}>
                {uploading ? 'Uploading…' : 'Register & Start Monitoring'}
              </button>
            </>
          )
        )}

        {/* ════════ SOCIAL URL TAB ════════ */}
        {tab === TAB_URL && (
          socialResult ? <SuccessCard asset={socialResult} onReset={() => { setSocialResult(null); setSocialUrl(''); setSocialLabel(''); }} /> : (
            <>
              <div className="ap-card" style={{ padding: 28, marginBottom: 20 }}>
                <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1rem', color: '#fff', marginBottom: 6 }}>
                  Scan from Social Media or the Web
                </h3>
                <p className="ap-muted" style={{ fontSize: '0.85rem', marginBottom: 20, lineHeight: 1.7 }}>
                  Paste a public Instagram post URL, Twitter/X tweet URL, or any web page containing sports media.
                  SportShield extracts the main image and runs a full fingerprint + reverse-image scan.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Post / Page URL *</label>
                    <input type="url" value={socialUrl} onChange={e => setSocialUrl(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleSocialScan()}
                      placeholder="https://www.instagram.com/p/... or https://x.com/..."
                      className="ap-input" />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Label (optional)</label>
                    <input type="text" value={socialLabel} onChange={e => setSocialLabel(e.target.value)}
                      placeholder="e.g. Champions League Final post" className="ap-input" />
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 18, paddingTop: 16, borderTop: '1px solid rgba(26,92,26,0.2)' }}>
                  <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.9rem', color: '#fff' }}>
                    {isPublic ? 'Public' : 'Private'}
                  </p>
                  <label className="ap-toggle">
                    <input type="checkbox" checked={isPublic} onChange={e => setIsPublic(e.target.checked)} />
                    <span className="ap-toggle-slider" />
                  </label>
                </div>

                <button onClick={handleSocialScan} disabled={!socialUrl.trim() || scanning}
                  className="ap-btn ap-btn-green"
                  style={{ marginTop: 20, width: '100%', justifyContent: 'center', padding: '14px', fontSize: '0.95rem' }}>
                  {scanning ? 'Extracting & Scanning…' : 'Extract & Scan Image'}
                </button>
                {scanning && (
                  <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.35)', textAlign: 'center', marginTop: 10 }}>
                    Fetching page · extracting og:image · uploading · fingerprinting…
                  </p>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12 }}>
                {[
                  { abbr: 'IN', color: '#c13584', name: 'Instagram', note: 'Public posts only. Works on post pages — not stories.' },
                  { abbr: 'X', color: '#1da1f2', name: 'Twitter / X', note: 'Public tweets with images. Paste the full tweet URL.' },
                  { abbr: 'WB', color: '#3b82f6', name: 'Any Web Page', note: 'Any public page with a featured image or og:image tag.' },
                ].map(p => (
                  <div key={p.name} className="ap-card" style={{ padding: '16px 18px' }}>
                    <span style={{ display:"inline-flex", alignItems:"center", justifyContent:"center", width:32, height:32, borderRadius:6, background:p.color, color:"#fff", fontFamily:"var(--font-display)", fontWeight:800, fontSize:"0.7rem", marginBottom:6 }}>{p.abbr}</span>
                    <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.88rem', color: '#fff', marginBottom: 4 }}>{p.name}</p>
                    <p className="ap-muted" style={{ fontSize: '0.77rem', lineHeight: 1.6 }}>{p.note}</p>
                  </div>
                ))}
              </div>
            </>
          )
        )}

        {/* How it works mini */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginTop: 28 }}>
          {[
            { title: 'Fingerprinted', desc: 'A pHash is generated — robust to compression, resizing, and cropping.', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg> },
            { title: 'Scanned', desc: 'We search the web for unauthorized copies using reverse image search + AI.', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg> },
            { title: 'Alerted', desc: 'You get an instant alert the moment an unauthorized copy is detected.', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg> },
          ].map(c => (
            <div key={c.title} className="ap-card" style={{ padding: '18px 16px' }}>
              <div style={{ marginBottom: 8 }}>{c.icon}</div>
              <p style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '0.95rem', color: '#fff', marginBottom: 6 }}>{c.title}</p>
              <p className="ap-muted" style={{ fontSize: '0.78rem', lineHeight: 1.6 }}>{c.desc}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
