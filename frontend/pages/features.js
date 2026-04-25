import Head from 'next/head';
import Link from 'next/link';
import Navbar from '../components/landing/Navbar';
import Footer from '../components/landing/Footer';

const FEATURES = [
  {
    id: 'monitor',
    icon: '🌐',
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
    cta: { label: 'Start Monitoring →', href: '/upload' },
  },
  {
    id: 'detect',
    icon: '⚡',
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
    cta: { label: 'Upload an Asset →', href: '/upload' },
  },
  {
    id: 'dmca',
    icon: '📄',
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
    cta: { label: 'View an Alert →', href: '/alerts' },
  },
  {
    id: 'cert',
    icon: '🏅',
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
    cta: { label: 'View Certificate Demo →', href: '/certificate/demo' },
  },
  {
    id: 'analytics',
    icon: '📊',
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
    cta: { label: 'See Analytics →', href: '/analytics' },
  },
  {
    id: 'verify',
    icon: '🔍',
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
    icon: '🏟️',
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
    icon: '🤖',
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
    cta: { label: 'Upload & Detect →', href: '/upload' },
  },
  {
    id: 'social',
    icon: '📱',
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
    cta: { label: 'Try Social Scan →', href: '/upload' },
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
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
            {FEATURES.map(f => (
              <a key={f.id} href={`#${f.id}`}
                style={{ background: 'rgba(26,92,26,0.2)', border: '1px solid rgba(26,92,26,0.4)', borderRadius: 20, padding: '6px 14px', fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', textDecoration: 'none', transition: 'color 0.2s,border-color 0.2s' }}
                onMouseEnter={e => { e.target.style.color = '#4ade80'; e.target.style.borderColor = 'rgba(74,222,128,0.5)'; }}
                onMouseLeave={e => { e.target.style.color = 'rgba(255,255,255,0.7)'; e.target.style.borderColor = 'rgba(26,92,26,0.4)'; }}>
                {f.icon} {f.title}
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
                <Link href={f.cta.href} className="ap-btn ap-btn-green" style={{ fontSize: '0.85rem' }}>
                  {f.cta.label}
                </Link>
              </div>

              {/* Bullet card */}
              <div className="ap-card" style={{ padding: 28 }}>
                <p style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '0.82rem', color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16 }}>
                  What you get
                </p>
                {f.bullets.map((b, bi) => (
                  <div key={bi} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
                    <span style={{ color: f.color, fontSize: '1rem', flexShrink: 0, marginTop: 1 }}>✓</span>
                    <span style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.75)', lineHeight: 1.6 }}>{b}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        ))}

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
