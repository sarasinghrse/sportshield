import Head from 'next/head';
import Link from 'next/link';
import Navbar from '../components/landing/Navbar';
import Footer from '../components/landing/Footer';

export default function DMCANoticePage() {
  return (
    <>
      <Head><title>DMCA Takedown — SportShield</title></Head>
      <Navbar />

      <div className="ap-root" style={{ paddingTop: 64 }}>
        <section style={{ background: 'linear-gradient(135deg,#0a1710,#0d2010)', padding: 'clamp(56px,7vw,88px) 24px', textAlign: 'center', borderBottom: '1px solid rgba(26,92,26,0.2)' }}>
          <h1 className="ap-heading" style={{ fontSize: 'clamp(2rem,5vw,3.2rem)', marginBottom: 14 }}>
            DMCA <span style={{ color: '#f87171' }}>Takedown</span> Notices
          </h1>
          <p className="ap-muted" style={{ maxWidth: 520, margin: '0 auto', fontSize: '1rem', lineHeight: 1.75 }}>
            SportShield generates DMCA takedown notices automatically when unauthorized copies of your sports media are detected.
          </p>
        </section>

        <section style={{ maxWidth: 760, margin: '0 auto', padding: 'clamp(48px,6vw,80px) 24px' }}>
          <div className="ap-card" style={{ padding: '36px 32px', marginBottom: 28 }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '1.4rem', color: '#fff', marginBottom: 12 }}>
              How It Works
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {[
                { step: '1', title: 'Violation Detected', desc: 'Our AI scanning finds an unauthorized copy of your media on the web.' },
                { step: '2', title: 'Alert Generated', desc: 'You receive an alert on your dashboard with the infringing URL, confidence score, and evidence.' },
                { step: '3', title: 'DMCA Notice Created', desc: 'SportShield auto-generates a DMCA takedown notice pre-filled with your asset details, the infringing URL, and the relevant legal clause (DMCA §512).' },
                { step: '4', title: 'Notice Sent', desc: 'Send the notice directly to the hosting platform\'s webmaster, or download it as a PDF for your records.' },
                { step: '5', title: 'Track Status', desc: 'Monitor takedown status — pending, sent, acknowledged, content removed, or disputed.' },
              ].map(s => (
                <div key={s.step} style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                  <span style={{
                    minWidth: 36, height: 36, borderRadius: '50%',
                    background: 'rgba(248,113,113,0.15)', color: '#f87171',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '0.9rem',
                    border: '1px solid rgba(248,113,113,0.25)', flexShrink: 0,
                  }}>{s.step}</span>
                  <div>
                    <p style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1rem', color: '#fff', marginBottom: 4 }}>{s.title}</p>
                    <p className="ap-muted" style={{ fontSize: '0.88rem', lineHeight: 1.7 }}>{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="ap-card" style={{ padding: '28px 32px', marginBottom: 28 }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.1rem', color: '#fff', marginBottom: 12 }}>
              What&apos;s Included in the Notice
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                'Your name & contact info',
                'Asset details & pHash fingerprint',
                'Infringing URL with screenshot',
                'Confidence score & evidence',
                'DMCA §512 legal clause',
                'Takedown demand & deadline',
              ].map(item => (
                <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div style={{ textAlign: 'center' }}>
            <p className="ap-muted" style={{ marginBottom: 20, fontSize: '0.95rem' }}>
              Ready to protect your sports media?
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href="/signup" className="ap-btn ap-btn-green" style={{ padding: '13px 28px' }}>Get Started Free</Link>
              <Link href="/features" className="ap-btn ap-btn-ghost" style={{ padding: '13px 28px' }}>← All Features</Link>
            </div>
          </div>
        </section>
      </div>

      <Footer />
    </>
  );
}
