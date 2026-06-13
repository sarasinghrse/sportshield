import Link from 'next/link';
import Head from 'next/head';
import Footer from '../components/landing/Footer';

export default function SportsClubDemo() {
  return (
    <>
      <Head><title>Sports Club Demo — SportShield</title></Head>
      <div className="ap-root">
        <nav className="ap-nav">
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            <img src="/images/sportshield-logo-transparent.png" alt="SportShield" style={{ height: 30 }} />
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '1.1rem', color: '#5cc85c', letterSpacing: '0.06em' }}>SPORTSHIELD</span>
          </Link>
          <Link href="/" style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.82rem', color: 'rgba(255,255,255,0.5)', textDecoration: 'none', letterSpacing: '0.06em' }}>
            ← BACK TO DASHBOARD
          </Link>
        </nav>

        <main style={{ maxWidth: 900, margin: '0 auto', padding: '48px 24px' }}>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(26,92,26,0.15)', border: '1px solid rgba(26,92,26,0.3)', borderRadius: 20, padding: '5px 14px', marginBottom: 20 }}>
              <span style={{ color: '#4ade80', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Sports Club</span>
            </div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', color: '#fff', lineHeight: 1.1, marginBottom: 16 }}>
              Sports Club Demo
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '1rem', maxWidth: 560, margin: '0 auto', lineHeight: 1.7 }}>
              See how sports clubs, franchises, and organisations use SportShield to protect and monitor their media assets at scale.
            </p>
          </div>

          <div className="ap-card" style={{ padding: '48px 32px', textAlign: 'center', marginBottom: 32 }}>
            <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'center' }}>
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="rgba(74,222,128,0.5)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="4" y="2" width="16" height="20" rx="2" ry="2"/>
                <path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/>
                <path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/>
                <path d="M8 10h.01"/><path d="M8 14h.01"/>
              </svg>
            </div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.4rem', color: '#fff', marginBottom: 12 }}>
              Full Use Case Demo Coming Soon
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.92rem', maxWidth: 480, margin: '0 auto 28px', lineHeight: 1.7 }}>
              This page will showcase a complete use case diagram with all actors and functionalities available to sports clubs — including bulk asset management, team-wide monitoring, multi-user access, league-level analytics, and automated enforcement workflows.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, maxWidth: 600, margin: '0 auto 32px' }}>
              {[
                { title: 'Bulk Upload', desc: 'Protect entire media libraries' },
                { title: 'Team Monitoring', desc: 'Track all team assets centrally' },
                { title: 'Automated DMCA', desc: 'Auto-generate takedown notices' },
                { title: 'League Analytics', desc: 'Cross-team violation insights' },
                { title: 'Live Radar', desc: 'Real-time broadcast piracy detection' },
                { title: 'Evidence Packs', desc: 'Court-ready legal documentation' },
              ].map(f => (
                <div key={f.title} style={{ background: 'rgba(26,92,26,0.1)', border: '1px solid rgba(26,92,26,0.2)', borderRadius: 12, padding: '16px 14px', textAlign: 'left' }}>
                  <p style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '0.85rem', color: '#4ade80', marginBottom: 4 }}>{f.title}</p>
                  <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>{f.desc}</p>
                </div>
              ))}
            </div>

            <Link href="/?demo=true" className="ap-btn ap-btn-green" style={{ display: 'inline-flex', padding: '12px 28px', fontSize: '0.9rem' }}>
              Try Demo Mode →
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    </>
  );
}
