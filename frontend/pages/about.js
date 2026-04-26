import Head from 'next/head';
import Link from 'next/link';
import Navbar from '../components/landing/Navbar';
import Footer from '../components/landing/Footer';

const VALUES = [
  { icon: <svg width='28' height='28' viewBox='0 0 24 24' fill='#fbbf24'><path d='M13 2L3 14h9l-1 8 10-12h-9l1-8z'/></svg>, title: 'Speed matters',
    desc: 'Violations spread fast. Our automated scans mean you find out about unauthorized use quickly — not weeks later.' },
  { icon: <svg width='28' height='28' viewBox='0 0 24 24' fill='none' stroke='#4ade80' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round'><path d='M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z'/></svg>, title: 'Creators deserve protection',
    desc: 'Sports photography and videography take real skill. Creators deserve to control how their work is used.' },
  { icon: <svg width='28' height='28' viewBox='0 0 24 24' fill='none' stroke='#60a5fa' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round'><path d='M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z'/><polyline points='14 2 14 8 20 8'/><line x1='16' y1='13' x2='8' y2='13'/><line x1='16' y1='17' x2='8' y2='17'/></svg>, title: 'Legal tools for everyone',
    desc: 'DMCA notices and ownership certificates shouldn\'t require a lawyer. We make it a 30-second task.' },
  { icon: <svg width='28' height='28' viewBox='0 0 24 24' fill='none' stroke='#a78bfa' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round'><rect x='3' y='11' width='18' height='10' rx='2'/><circle cx='12' cy='5' r='2'/><path d='M12 7v4'/><line x1='8' y1='16' x2='8.01' y2='16'/><line x1='16' y1='16' x2='16.01' y2='16'/></svg>, title: 'AI on your side',
    desc: 'From AI-generated image detection to reverse-image scanning, we put cutting-edge tools in every creator\'s hands.' },
];

const TEAM = [
  { name: 'Sara Singh',  role: 'Full-Stack Web', linkedin: 'https://www.linkedin.com/in/sara-singh-574673267/',  email: '20singhsara@gmail.com' },
  { name: 'Anshu Raj',   role: 'Flutter / Mobile', linkedin: 'https://www.linkedin.com/in/anshu-raj-142b55253/', email: 'anshurajwork@gmail.com' },
  { name: 'Amit Singh',  role: 'Backend / AI',    linkedin: 'https://www.linkedin.com/in/amit-singh-58101928a/', email: 'amitksingh3022@gmail.com' },
];

const STACK = [
  'Next.js 14', 'FastAPI', 'Firebase Firestore', 'Cloudinary', 'SerpAPI',
  'HuggingFace AI', 'Brevo Email', 'Python pHash', 'Render (free)', 'Vercel',
];

export default function AboutPage() {
  return (
    <>
      <Head><title>About — SportShield</title></Head>

      {/* Shared landing navbar */}
      <Navbar />

      <div className="ap-root" style={{ paddingTop: 64 }}>

        {/* ── Hero ── */}
        <section style={{ background: 'linear-gradient(135deg,#0a1710 0%,#0d2010 50%,#0a1710 100%)', padding: 'clamp(60px,8vw,100px) 24px', textAlign: 'center', borderBottom: '1px solid rgba(26,92,26,0.2)' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(26,92,26,0.18)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: 20, padding: '4px 14px', marginBottom: 20 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#4ade80', display: 'inline-block' }} />
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.78rem', color: '#4ade80', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              Google Solutions Challenge 2026
            </span>
          </div>
          <h1 className="ap-heading" style={{ fontSize: 'clamp(2.4rem,6vw,4rem)', marginBottom: 18 }}>
            About <span style={{ color: '#4ade80' }}>SportShield</span>
          </h1>
          <p className="ap-muted" style={{ maxWidth: 560, margin: '0 auto', fontSize: '1.05rem', lineHeight: 1.75 }}>
            We're on a mission to empower every sports creator, photographer, and media professional to protect their work online — with free, AI-powered tools.
          </p>
        </section>

        {/* ── Story ── */}
        <section style={{ maxWidth: 820, margin: '0 auto', padding: 'clamp(48px,6vw,80px) 24px' }}>
          <p style={{ fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.14em', color: 'rgba(74,222,128,0.7)', textTransform: 'uppercase', marginBottom: 20 }}>OUR STORY</p>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(1.6rem,4vw,2.4rem)', color: '#4ade80', marginBottom: 28, lineHeight: 1.1 }}>
            Built to solve a real problem
          </h2>
          <p className="ap-muted" style={{ fontSize: '1rem', lineHeight: 1.85, marginBottom: 20 }}>
            SportShield was created by <strong style={{ color: '#fff' }}>Sara</strong> ,{' '}
            <strong style={{ color: '#fff' }}>Anshu</strong> , and{' '}
            <strong style={{ color: '#fff' }}>Amit</strong> as a Google Solutions Challenge 2026 submission.
            We set out to solve a real problem faced by sports photographers, video creators, and clubs worldwide —
            unauthorized use of their media content with no easy way to detect or act on it.
          </p>
          <p className="ap-muted" style={{ fontSize: '1rem', lineHeight: 1.85, marginBottom: 20 }}>
            Using perceptual hashing (pHash) and AI-powered reverse image search, SportShield automatically fingerprints
            your uploaded media and continuously scans the open web for unauthorized copies — even when images have been
            cropped, resized, or recoloured.
          </p>
          <p className="ap-muted" style={{ fontSize: '1rem', lineHeight: 1.85 }}>
            We built the entire platform in under a week: a Next.js web app, a FastAPI backend on Render, Firebase for
            real-time data, Cloudinary for media storage, a Flutter mobile app, and HuggingFace AI for detecting
            AI-generated images — all free-tier infrastructure that can scale.
          </p>
        </section>

        {/* ── Values ── */}
        <section style={{ background: 'rgba(10,23,12,0.8)', padding: 'clamp(48px,6vw,80px) 24px', borderTop: '1px solid rgba(26,92,26,0.2)', borderBottom: '1px solid rgba(26,92,26,0.2)' }}>
          <div style={{ maxWidth: 1060, margin: '0 auto' }}>
            <p style={{ fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.14em', color: 'rgba(74,222,128,0.7)', textTransform: 'uppercase', marginBottom: 14, textAlign: 'center' }}>WHAT WE BELIEVE</p>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(1.6rem,4vw,2.2rem)', color: '#fff', textAlign: 'center', marginBottom: 40 }}>Our Values</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 20 }}>
              {VALUES.map(v => (
                <div key={v.title} className="ap-card" style={{ padding: 28 }}>
                  <div style={{ marginBottom: 14 }}>{v.icon}</div>
                  <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1rem', color: '#fff', marginBottom: 10 }}>{v.title}</h3>
                  <p className="ap-muted" style={{ fontSize: '0.87rem', lineHeight: 1.7 }}>{v.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Team ── */}
        <section style={{ maxWidth: 1060, margin: '0 auto', padding: 'clamp(48px,6vw,80px) 24px' }}>
          <p style={{ fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.14em', color: 'rgba(74,222,128,0.7)', textTransform: 'uppercase', marginBottom: 14, textAlign: 'center' }}>THE BUILDERS</p>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(1.6rem,4vw,2.2rem)', color: '#fff', textAlign: 'center', marginBottom: 40 }}>Our Team</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 20 }}>
            {TEAM.map(m => (
              <div key={m.name} className="ap-card" style={{ padding: 28, textAlign: 'center' }}>
                <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(26,92,26,0.3)', border: '2px solid rgba(74,222,128,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: '1.8rem' }}>
                  {m.name.split(' ')[0][0]}
                </div>
                <p style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.1rem', color: '#fff', marginBottom: 4 }}>{m.name}</p>
                <p style={{ fontSize: '0.8rem', color: '#4ade80', marginBottom: 14, fontWeight: 600 }}>{m.role}</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
                  <a href={`mailto:${m.email}`} className="ap-muted" style={{ fontSize: '0.78rem', textDecoration: 'none' }}>{m.email}</a>
                  <a href={m.linkedin} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: '#60a5fa', textDecoration: 'none' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                    LinkedIn ↗
                  </a>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Tech Stack ── */}
        <section style={{ background: 'rgba(10,23,12,0.8)', padding: 'clamp(40px,5vw,64px) 24px', borderTop: '1px solid rgba(26,92,26,0.2)' }}>
          <div style={{ maxWidth: 820, margin: '0 auto', textAlign: 'center' }}>
            <p style={{ fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.14em', color: 'rgba(74,222,128,0.7)', textTransform: 'uppercase', marginBottom: 14 }}>BUILT WITH</p>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(1.4rem,3vw,1.9rem)', color: '#fff', marginBottom: 28 }}>Free-tier stack that scales</h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
              {STACK.map(t => (
                <span key={t} style={{ background: 'rgba(26,92,26,0.2)', border: '1px solid rgba(26,92,26,0.4)', borderRadius: 20, padding: '6px 16px', fontSize: '0.82rem', color: 'rgba(255,255,255,0.75)', fontWeight: 600 }}>{t}</span>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section style={{ textAlign: 'center', padding: 'clamp(56px,7vw,96px) 24px', background: 'linear-gradient(180deg,#0a1710,#0d2010)' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 'clamp(2rem,5vw,3rem)', color: '#fff', marginBottom: 20 }}>
            Ready to protect your media?
          </h2>
          <p className="ap-muted" style={{ marginBottom: 32, maxWidth: 440, margin: '0 auto 32px' }}>
            Join sports creators who use SportShield to monitor, detect, and fight unauthorized media use.
          </p>
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/signup" className="ap-btn ap-btn-green" style={{ fontSize: '0.9rem', padding: '13px 30px' }}>Get Started Free →</Link>
            <Link href="/contact" className="ap-btn ap-btn-ghost" style={{ fontSize: '0.9rem', padding: '13px 30px' }}>Contact Us</Link>
          </div>
        </section>
      </div>

      {/* Shared landing footer */}
      <Footer />
    </>
  );
}
