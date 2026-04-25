import Link from 'next/link';
import Head from 'next/head';

export default function AboutPage() {
  return (
    <>
      <Head><title>About — SportShield</title></Head>
      <div style={{ fontFamily: 'var(--font-body, sans-serif)', background: 'var(--white, #fff)', minHeight: '100vh' }}>
        {/* Minimal nav */}
        <nav style={{ borderBottom: '2px solid #1a5c1a', padding: '0 40px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/" style={{ fontFamily: 'var(--font-display, sans-serif)', fontWeight: 800, fontSize: '1.4rem', color: '#1a5c1a', textDecoration: 'none', letterSpacing: '0.04em' }}>
            SPORTSHIELD
          </Link>
          <Link href="/signup" style={{ background: '#1a5c1a', color: '#fff', fontWeight: 700, fontSize: '0.85rem', padding: '9px 20px', borderRadius: 6, textDecoration: 'none' }}>
            Get Started Free
          </Link>
        </nav>

        {/* Hero */}
        <section style={{ background: '#c8e6c8', padding: '80px 40px', textAlign: 'center' }}>
          <h1 style={{ fontFamily: 'var(--font-display, sans-serif)', fontWeight: 900, fontSize: 'clamp(2.5rem, 5vw, 4rem)', color: '#111a11', lineHeight: 1.05, marginBottom: 20 }}>
            About SportShield
          </h1>
          <p style={{ fontSize: '1.1rem', color: '#4a5c4a', maxWidth: 560, margin: '0 auto', lineHeight: 1.7 }}>
            We're on a mission to empower every sports creator, photographer, and media professional to protect their work online.
          </p>
        </section>

        {/* Story */}
        <section style={{ maxWidth: 780, margin: '0 auto', padding: '80px 40px' }}>
          <p style={{ fontSize: '0.85rem', fontWeight: 700, letterSpacing: '0.14em', color: '#8fa08f', textTransform: 'uppercase', marginBottom: 32 }}>OUR STORY</p>
          <h2 style={{ fontFamily: 'var(--font-display, sans-serif)', fontWeight: 800, fontSize: '2.2rem', color: '#1a5c1a', marginBottom: 24, lineHeight: 1.1 }}>
            Built for the Google Solutions Challenge 2026
          </h2>
          <p style={{ fontSize: '1rem', color: '#4a5c4a', lineHeight: 1.8, marginBottom: 24 }}>
            SportShield was created by <strong style={{ color: '#111a11' }}>Sara</strong> (full-stack web) and <strong style={{ color: '#111a11' }}>Anshu</strong> (Flutter/mobile) as a Google Solutions Challenge 2026 submission. We set out to solve a real problem faced by sports photographers, video creators, and clubs worldwide — unauthorized use of their media content with no easy way to detect or act on it.
          </p>
          <p style={{ fontSize: '1rem', color: '#4a5c4a', lineHeight: 1.8, marginBottom: 24 }}>
            Using perceptual hashing (pHash) and AI-powered reverse image search, SportShield automatically fingerprints your uploaded media and continuously scans the open web for unauthorized copies — even when images have been cropped, resized, or recoloured.
          </p>
          <p style={{ fontSize: '1rem', color: '#4a5c4a', lineHeight: 1.8 }}>
            We built the entire platform in under a week: a Next.js web app, a FastAPI backend on Render, Firebase for real-time data, Cloudinary for media storage, and a Flutter mobile app — all free-tier infrastructure that can scale.
          </p>
        </section>

        {/* Values */}
        <section style={{ background: '#f0fbf0', padding: '80px 40px' }}>
          <div style={{ maxWidth: 1000, margin: '0 auto' }}>
            <p style={{ fontSize: '0.85rem', fontWeight: 700, letterSpacing: '0.14em', color: '#8fa08f', textTransform: 'uppercase', marginBottom: 32, textAlign: 'center' }}>WHAT WE BELIEVE</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 32 }}>
              {[
                { icon: '⚡', title: 'Speed matters', desc: 'Violations spread fast. Our automated daily rescans mean you find out about unauthorized use quickly — not weeks later.' },
                { icon: '🛡️', title: 'Creators deserve protection', desc: 'Sports photography and videography take real skill and effort. The people who create it deserve to control how it\'s used.' },
                { icon: '📄', title: 'Legal tools for everyone', desc: 'DMCA notices and ownership certificates shouldn\'t require a lawyer. We make it a 30-second task for any creator.' },
              ].map(v => (
                <div key={v.title} style={{ background: '#fff', borderRadius: 12, padding: 32, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                  <div style={{ fontSize: '2rem', marginBottom: 16 }}>{v.icon}</div>
                  <h3 style={{ fontWeight: 700, fontSize: '1.05rem', color: '#111a11', marginBottom: 10 }}>{v.title}</h3>
                  <p style={{ fontSize: '0.87rem', color: '#4a5c4a', lineHeight: 1.7 }}>{v.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section style={{ background: '#111a11', padding: '80px 40px', textAlign: 'center' }}>
          <h2 style={{ fontFamily: 'var(--font-display, sans-serif)', fontWeight: 900, fontSize: '2.5rem', color: '#fff', marginBottom: 24 }}>
            Ready to protect your media?
          </h2>
          <Link href="/signup" style={{ display: 'inline-block', background: '#1a5c1a', color: '#fff', fontWeight: 700, fontSize: '0.85rem', letterSpacing: '0.08em', padding: '14px 32px', borderRadius: 6, textDecoration: 'none', textTransform: 'uppercase' }}>
            Get Started Free
          </Link>
        </section>

        {/* Footer */}
        <footer style={{ background: '#111a11', borderTop: '1px solid rgba(255,255,255,0.1)', padding: '24px 40px', textAlign: 'center' }}>
          <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.3)' }}>
            © 2026 SportShield · <Link href="/" style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>Home</Link> · <Link href="/contact" style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>Contact</Link>
          </p>
        </footer>
      </div>
    </>
  );
}
