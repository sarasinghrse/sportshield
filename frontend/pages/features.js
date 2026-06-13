import Head from 'next/head';
import Link from 'next/link';
import Navbar from '../components/landing/Navbar';
import Footer from '../components/landing/Footer';

const FEATURES = [
  {
    id: 'monitor',
    icon: <svg width='28' height='28' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round'><circle cx='12' cy='12' r='10'/><line x1='2' y1='12' x2='22' y2='12'/><path d='M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z'/></svg>,
    color: '#4ade80',
    title: 'Media Monitoring',
    subtitle: 'Always-on watch for your sports media',
    desc: 'SportShield continuously monitors the open web for unauthorized copies of your images and videos. Once you upload a file, our system fingerprints it and runs background scans every day — checking millions of indexed pages for matches. You get a notification the moment something is found.',
    bullets: [
      'Automated daily rescans of all your assets',
      'Monitors blogs, news sites, social platforms, and e-commerce',
      'No manual searching required — runs silently in the background',
      'Real-time Firestore alerts pushed to your dashboard instantly',
    ],
    cta: { label: 'Start Monitoring →', href: '/signup' },
  },
  {
    id: 'detect',
    icon: <svg width='28' height='28' viewBox='0 0 24 24' fill='currentColor'><path d='M13 2L3 14h9l-1 8 10-12h-9l1-8z'/></svg>,
    color: '#fbbf24',
    title: 'AI Violation Detection',
    subtitle: 'Find stolen media even after editing',
    desc: 'Our perceptual hashing (pHash) algorithm generates a unique fingerprint for every image. Unlike MD5, pHash is robust to common transformations — cropping, resizing, colour grading, compression — so we can still detect your image even if the thief changed it. Combined with Google Reverse Image search via SerpAPI, we surface matches from across the web.',
    bullets: [
      'Perceptual hash fingerprinting (64-bit pHash)',
      'Matches survive cropping, resizing, JPEG compression, and colour changes',
      'Google Reverse Image + Google Lens double-check',
      'Confidence score per match (low / medium / high / critical)',
    ],
    cta: { label: 'Upload an Asset →', href: '/signup' },
  },
  {
    id: 'dmca',
    icon: <svg width='28' height='28' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round'><path d='M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z'/><polyline points='14 2 14 8 20 8'/><line x1='16' y1='13' x2='8' y2='13'/></svg>,
    color: '#f87171',
    title: 'DMCA Takedown Notices',
    subtitle: 'Legal action in 30 seconds',
    desc: 'Once a violation is confirmed, SportShield generates a DMCA takedown notice pre-filled with all the required legal information — your asset details, the infringing URL, confidence score, and the relevant legal clause. Send it directly to the hosting platform or download it as a PDF.',
    bullets: [
      'Auto-filled DMCA notice template (DMCA §512)',
      'Sends directly to the infringing site\'s webmaster',
      'PDF download for legal records',
      'Tracks takedown status — pending, sent, resolved',
    ],
    cta: { label: 'View an Alert →', href: '/dmca-notice' },
  },
  {
    id: 'cert',
    icon: <svg width='28' height='28' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round'><circle cx='12' cy='8' r='6'/><path d='M15.477 12.89L17 22l-5-3-5 3 1.523-9.11'/></svg>,
    color: '#a78bfa',
    title: 'Ownership Certificate',
    subtitle: 'Prove your media ownership at any time',
    desc: 'For every asset you upload, SportShield generates a tamper-evident ownership certificate containing your name, the upload timestamp, the perceptual hash fingerprint, and a QR code for instant verification. Use it as proof in legal disputes, licensing negotiations, or social media disputes.',
    bullets: [
      'Timestamped certificate with pHash fingerprint',
      'QR code for instant public verification',
      'PDF download — legally admissible as evidence of prior art',
      'Unique asset ID stored immutably in Firebase',
    ],
    cta: null,
  },
  {
    id: 'analytics',
    icon: <svg width='28' height='28' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round'><line x1='18' y1='20' x2='18' y2='10'/><line x1='12' y1='20' x2='12' y2='4'/><line x1='6' y1='20' x2='6' y2='14'/></svg>,
    color: '#38bdf8',
    title: 'Analytics Dashboard',
    subtitle: 'Understand your IP landscape at a glance',
    desc: 'SportShield\'s analytics dashboard gives you a bird\'s-eye view of your media portfolio\'s health. Track violations over time, see which assets are most targeted, monitor scan frequency, and identify high-risk geographies — all in an interactive dark-green dashboard.',
    bullets: [
      'Violation trends over 7 / 30 / 90 days',
      'Per-asset match count and scan history',
      'Severity breakdown (low / medium / high)',
      'Protection score — real-time health indicator',
    ],
    cta: { label: 'Start Analysing →', href: '/login' },
  },
  {
    id: 'verify',
    icon: <svg width='28' height='28' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round'><circle cx='11' cy='11' r='8'/><line x1='21' y1='21' x2='16.65' y2='16.65'/></svg>,
    color: '#4ade80',
    title: 'URL Verification',
    subtitle: 'Check any URL for stolen sports media',
    desc: 'The public Verify URL tool lets anyone — rights holders, journalists, or fans — paste a web address and instantly check whether it has been flagged by SportShield as containing unauthorized sports media. No account required. If flagged, site owners can be notified automatically.',
    bullets: [
      'No login required — fully public tool',
      'Instant lookup against the SportShield violations database',
      'One-click "Report to Site Owner" sends a DMCA notice automatically',
      'Returns confidence score and severity level',
    ],
    cta: { label: 'Verify a URL →', href: '/verify' },
  },
  {
    id: 'community',
    icon: <svg width='28' height='28' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round'><rect x='2' y='3' width='20' height='18' rx='2'/><path d='M8 21V3M16 21V3M2 12h20'/></svg>,
    color: '#86efac',
    title: 'Community Dashboard',
    subtitle: 'Transparency in the fight against sports IP theft',
    desc: 'Creators can choose to share their protection status publicly on the SportShield Community Dashboard. This live feed shows all opted-in assets, their scan results, and violation statistics — giving the wider sports community visibility into how widespread media theft really is.',
    bullets: [
      'Real-time public feed of opted-in assets',
      'Per-asset violation badges and confidence bars',
      'Filter by violations / clean / all',
      'Toggle privacy per asset — public or private — any time',
    ],
    cta: { label: 'View Community →', href: '/public-dashboard' },
  },
  {
    id: 'ai-detect',
    icon: <svg width='28' height='28' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round'><rect x='3' y='11' width='18' height='10' rx='2'/><circle cx='12' cy='5' r='2'/><path d='M12 7v4'/><line x1='8' y1='16' x2='8.01' y2='16'/><line x1='16' y1='16' x2='16.01' y2='16'/></svg>,
    color: '#c084fc',
    title: 'AI-Generated Image Detection',
    subtitle: 'Know if an image is real or machine-made',
    desc: 'Powered by HuggingFace\'s free Inference API (model: Organika/sdxl-detector), SportShield automatically analyses every uploaded image after scanning and labels it as "Authentic" or "AI-Generated". This helps you identify deepfakes, AI-doctored sports imagery, and synthetic media used to misrepresent events.',
    bullets: [
      'Automatic AI detection on every image upload',
      'Powered by HuggingFace Inference API — free tier',
      'Returns confidence score: Authentic vs AI-Generated',
      'Shown on the asset detail page after scanning completes',
    ],
    cta: { label: 'Upload & Detect →', href: '/signup' },
  },
  {
    id: 'social',
    icon: <svg width='28' height='28' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round'><rect x='5' y='2' width='14' height='20' rx='2' ry='2'/><line x1='12' y1='18' x2='12.01' y2='18'/></svg>,
    color: '#60a5fa',
    title: 'Social Media Scanning',
    subtitle: 'Scan Instagram & Twitter posts directly',
    desc: 'Paste the URL of any public Instagram post, Twitter/X tweet, or web page and SportShield will automatically extract the media, fingerprint it, and run a full reverse-image scan. Perfect for scanning screenshots shared on social media or tracking media that originated on a social platform.',
    bullets: [
      'Paste any public Instagram or Twitter/X post URL',
      'Automatically extracts the main image (og:image)',
      'Runs the full fingerprint + web scan pipeline',
      'Works on any public web page with embedded media',
    ],
    cta: { label: 'Try Social Scan →', href: '/verify' },
  },
];

export default function FeaturesPage() {
  return (
    <>
      <Head><title>Features — SportShield</title></Head>
      <Navbar />

      <div className="ap-root" style={{ paddingTop: 64 }}>

        {/* ── Hero ── */}
        <section style={{ background: 'linear-gradient(135deg,#0a1710,#0d2010)', padding: 'clamp(56px,7vw,96px) 24px', textAlign: 'center', borderBottom: '1px solid rgba(26,92,26,0.2)' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(26,92,26,0.18)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: 20, padding: '4px 14px', marginBottom: 20 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#4ade80', display: 'inline-block' }} />
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.78rem', color: '#4ade80', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              Everything in one place
            </span>
          </div>
          <h1 className="ap-heading" style={{ fontSize: 'clamp(2.4rem,6vw,4rem)', marginBottom: 18 }}>
            SportShield <span style={{ color: '#4ade80' }}>Features</span>
          </h1>
          <p className="ap-muted" style={{ maxWidth: 560, margin: '0 auto 36px', fontSize: '1.05rem', lineHeight: 1.75 }}>
            One platform to monitor, detect, protect, and prove your sports media ownership — using free-tier AI tools that punch above their weight.
          </p>
          {/* Quick jump pills */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10, maxWidth: 720, margin: '0 auto' }}>
            {FEATURES.map(f => (
              <a key={f.id} href={`#${f.id}`}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: 'rgba(26,92,26,0.2)', border: '1px solid rgba(26,92,26,0.4)', borderRadius: 10, padding: '10px 14px', fontSize: '0.78rem', color: 'rgba(255,255,255,0.7)', textDecoration: 'none', transition: 'color 0.2s,border-color 0.2s,background 0.2s', textAlign: 'center' }}
                onMouseEnter={e => { e.currentTarget.style.color = '#4ade80'; e.currentTarget.style.borderColor = 'rgba(74,222,128,0.5)'; e.currentTarget.style.background = 'rgba(26,92,26,0.35)'; }}
                onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; e.currentTarget.style.borderColor = 'rgba(26,92,26,0.4)'; e.currentTarget.style.background = 'rgba(26,92,26,0.2)'; }}>
                {f.title}
              </a>
            ))}
          </div>
        </section>

        {/* ── Feature sections ── */}
        {FEATURES.map((f, i) => (
          <section
            key={f.id}
            id={f.id}
            style={{
              padding: 'clamp(56px,6vw,88px) 24px',
              borderBottom: '1px solid rgba(26,92,26,0.15)',
              background: i % 2 === 0 ? 'transparent' : 'rgba(10,23,12,0.5)',
              scrollMarginTop: 80,
            }}
          >
            <div style={{ maxWidth: 1020, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 48, alignItems: 'center' }}>
              {/* Text */}
              <div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(26,92,26,0.25)', border: `1px solid ${f.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.6rem' }}>
                    {f.icon}
                  </div>
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.78rem', color: f.color, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                    Feature
                  </span>
                </div>
                <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 'clamp(1.8rem,4vw,2.6rem)', color: '#fff', marginBottom: 8, lineHeight: 1.1 }}>
                  {f.title}
                </h2>
                <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem', color: f.color, marginBottom: 18 }}>{f.subtitle}</p>
                <p className="ap-muted" style={{ fontSize: '0.95rem', lineHeight: 1.8, marginBottom: 24 }}>{f.desc}</p>
                {f.cta && (
                  <Link href={f.cta.href} className="ap-btn ap-btn-green" style={{ fontSize: '0.85rem' }}>
                    {f.cta.label}
                  </Link>
                )}
              </div>

              {/* Bullet card */}
              <div className="ap-card" style={{ padding: 28 }}>
                <p style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '0.82rem', color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16 }}>
                  What you get
                </p>
                {f.bullets.map((b, bi) => (
                  <div key={bi} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
                    <span style={{ color: f.color, flexShrink: 0, marginTop: 1 }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg></span>
                    <span style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.75)', lineHeight: 1.6 }}>{b}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        ))}

        {/* ── Tech Stack ── */}
        <section style={{ padding: 'clamp(56px,6vw,88px) 24px', borderBottom: '1px solid rgba(26,92,26,0.15)' }}>
          <div style={{ maxWidth: 1020, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: 40 }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 'clamp(1.8rem,4vw,2.4rem)', color: '#fff', marginBottom: 12 }}>
                Built With
              </h2>
              <p className="ap-muted" style={{ maxWidth: 520, margin: '0 auto', fontSize: '0.95rem', lineHeight: 1.7 }}>
                SportShield is built on Google Cloud and open-source tools — most running on free tiers.
              </p>
            </div>

            <p style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '0.82rem', color: '#4ade80', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 16 }}>Google Technologies</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, marginBottom: 32 }}>
              {[
                { name: 'Firebase Auth', desc: 'Google sign-in & user management' },
                { name: 'Cloud Firestore', desc: 'Real-time NoSQL database' },
                { name: 'Firebase Hosting', desc: 'Frontend deployment' },
                { name: 'Gemini 2.0 Flash', desc: 'AI assistant chat' },
                { name: 'Google Lens API', desc: 'Reverse image search fallback' },
                { name: 'Google Cloud Run', desc: 'Serverless backend hosting' },
                { name: 'SerpAPI (Google)', desc: 'Reverse image search' },
                { name: 'Chrome Extension', desc: 'Manifest V3 browser extension' },
              ].map(t => (
                <div key={t.name} className="ap-card" style={{ padding: '14px 16px' }}>
                  <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.88rem', color: '#fff', marginBottom: 3 }}>{t.name}</p>
                  <p className="ap-muted" style={{ fontSize: '0.75rem', lineHeight: 1.5 }}>{t.desc}</p>
                </div>
              ))}
            </div>

            <p style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '0.82rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 16 }}>Other Tools</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
              {[
                { name: 'Next.js', desc: 'React framework for frontend' },
                { name: 'FastAPI (Python)', desc: 'Backend REST API' },
                { name: 'pHash', desc: 'Perceptual image fingerprinting' },
                { name: 'HuggingFace', desc: 'AI-generated image detection' },
                { name: 'Twilio', desc: 'WhatsApp alert notifications' },
                { name: 'Brevo', desc: 'Transactional email delivery' },
                { name: 'Render', desc: 'Backend deployment' },
                { name: 'Vercel', desc: 'Frontend deployment' },
              ].map(t => (
                <div key={t.name} className="ap-card" style={{ padding: '14px 16px' }}>
                  <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.88rem', color: '#fff', marginBottom: 3 }}>{t.name}</p>
                  <p className="ap-muted" style={{ fontSize: '0.75rem', lineHeight: 1.5 }}>{t.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section style={{ textAlign: 'center', padding: 'clamp(56px,7vw,96px) 24px', background: 'linear-gradient(180deg,#0a1710,#0d2010)' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 'clamp(2rem,5vw,3rem)', color: '#fff', marginBottom: 18 }}>
            Start protecting your media today
          </h2>
          <p className="ap-muted" style={{ marginBottom: 32, maxWidth: 440, margin: '0 auto 32px' }}>Free. No credit card. No lawyers. Just results.</p>
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/signup" className="ap-btn ap-btn-green" style={{ fontSize: '0.95rem', padding: '14px 32px' }}>Get Started Free</Link>
            <Link href="/public-dashboard" className="ap-btn ap-btn-ghost" style={{ fontSize: '0.95rem', padding: '14px 32px' }}>View Community →</Link>
          </div>
        </section>
      </div>

      <Footer />
    </>
  );
}
