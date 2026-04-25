import Head from 'next/head';
import Link from 'next/link';
import Navbar from '../components/landing/Navbar';
import Footer from '../components/landing/Footer';

const SECTIONS = [
  {
    id: 'articles',
    icon: '📰',
    title: 'Sports IP in the News',
    subtitle: 'Why this matters right now',
    articles: [
      { tag: 'TREND', title: 'AI-Generated Sports Imagery Is Flooding Social Media', desc: 'From fake match highlights to synthetic player portraits, AI-generated images are making it harder than ever to tell real sports moments from fabricated ones.' },
      { tag: 'CASE STUDY', title: 'Photographer Wins £40K After Getty Scrapes Their Work', desc: 'A UK sports photographer successfully sued after discovering 200+ of their competition shots had been scraped, resized, and sold without a licence.' },
      { tag: 'GUIDE', title: 'How Sports Clubs Are Losing Revenue to Unlicensed Merch', desc: 'Unofficial merchandise using stolen club photography is estimated to cost English football clubs over £100M annually. Here\'s how detection tools are fighting back.' },
      { tag: 'EXPLAINER', title: 'What Happened When the NFL Went After Social Highlights', desc: 'In 2023 the NFL sent mass DMCA takedowns to over 10,000 accounts. Learn what they did, what worked, and what creators can replicate on a smaller scale.' },
    ],
  },
  {
    id: 'copyright',
    icon: '©️',
    title: 'Sports Copyright Guide',
    subtitle: 'What you own and how to protect it',
    content: [
      { q: 'Do I automatically own copyright to my sports photos?', a: 'Yes. In most countries (US, UK, EU, India), copyright is automatic the moment you press the shutter. You don\'t need to register — but registration strengthens your legal position if you sue.' },
      { q: 'Who owns footage shot at a sports event?', a: 'The person who presses record owns the copyright to the footage, unless they signed a "work for hire" contract transferring rights to an employer or the event organiser. Always read accreditation agreements carefully.' },
      { q: 'Can I copyright a score or scoreline?', a: 'No — factual data like scores and statistics is not copyrightable. However, the creative expression of that data (a well-composed infographic, article, or broadcast) is.' },
      { q: 'What is "fair use" in sports media?', a: 'Fair use allows limited use without permission for commentary, criticism, news reporting, and education. A 10-second clip in a news report is likely fair use; a 3-minute highlight reel on a monetised channel is almost certainly not.' },
      { q: 'Can I watermark my images to prove ownership?', a: 'Watermarks help but are not legally required. Metadata (EXIF data), upload timestamps, and certificates from SportShield provide stronger, tamper-evident proof.' },
    ],
  },
  {
    id: 'ip',
    icon: '🛡️',
    title: 'Protecting Your Sports Media',
    subtitle: 'A practical checklist for creators',
    steps: [
      { n: '01', title: 'Register your work', desc: 'In the US, register with the Copyright Office (copyright.gov) before publishing for maximum legal protection. In the UK/EU, Tineye and pHash tools serve as strong evidence of prior art.' },
      { n: '02', title: 'Embed metadata', desc: 'Use Adobe Bridge, Lightroom, or ExifTool to embed your name, contact email, and copyright year directly into every file\'s EXIF/IPTC data. This persists even after sharing.' },
      { n: '03', title: 'Upload to SportShield', desc: 'Fingerprint every asset the moment you export it. Our pHash is robust to transformations — even if your image is cropped and recoloured, we can still find it.' },
      { n: '04', title: 'Set up Google Alerts', desc: 'Create Google Alerts for your name + "sports" and for your team/event names. Free and effective for catching textual mentions of your work.' },
      { n: '05', title: 'Act fast on violations', desc: 'Send DMCA notices within 90 days of discovering a violation for maximum legal effect. SportShield generates and sends these in seconds.' },
      { n: '06', title: 'License your work', desc: 'Offer licensing options (via email or a simple licence page) — some sites will gladly pay rather than risk DMCA action. Getty Images and Shutterstock can distribute for you.' },
    ],
  },
  {
    id: 'takedown',
    icon: '📢',
    title: 'DMCA Takedown Walkthrough',
    subtitle: 'Step-by-step: from violation to removal',
    steps: [
      { n: '01', title: 'Document the violation', desc: 'Screenshot the infringing page, note the full URL, and record when you found it. SportShield does this automatically for every detected match.' },
      { n: '02', title: 'Confirm you hold the rights', desc: 'You must be the copyright owner (or authorised agent) to file a DMCA notice. Submitting false notices carries legal liability.' },
      { n: '03', title: 'Identify the hosting platform', desc: 'Find who hosts the infringing site using whois.domaintools.com. Large platforms (Google, Meta, Twitter) have dedicated DMCA portals.' },
      { n: '04', title: 'Send the notice', desc: 'SportShield auto-generates a §512-compliant notice. Key fields: your contact details, a description of the original work, the infringing URL, and your signed statement of good faith.' },
      { n: '05', title: 'Wait for the 14-day response window', desc: 'Platforms typically respond within 2–14 business days. If they ignore the notice, you can escalate to their hosting provider or pursue legal action.' },
      { n: '06', title: 'Follow up if ignored', desc: 'Re-send to the hosting provider\'s abuse email (abuse@hostingprovider.com). If content stays up, consult an IP lawyer about a §512(c)(3) formal notification.' },
    ],
  },
  {
    id: 'licensing',
    icon: '⚖️',
    title: 'Image Licensing 101',
    subtitle: 'Turn your photography into income',
    content: [
      { q: 'What licence types exist for sports media?', a: 'Royalty-Free (RF): one-time fee, unlimited use. Rights-Managed (RM): fee depends on usage, duration, and geography — typically higher value. Editorial: for news use only, cannot be used in advertising.' },
      { q: 'How much should I charge?', a: 'Editorial web use: $25–$150. Print editorial: $150–$500+. Commercial advertising: $500–$10,000+ depending on reach. Use Getty\'s or Shutterstock\'s calculator as a baseline.' },
      { q: 'Can I licence the same image multiple times?', a: 'Yes, with Royalty-Free licences. Rights-Managed licences may include exclusivity clauses — read carefully before signing.' },
      { q: 'What\'s the difference between watermarking and licensing?', a: 'Watermarks deter theft but don\'t grant rights. A licence is a legal contract that specifies exactly what the licensee can and cannot do with your image.' },
      { q: 'Do I need a contract?', a: 'For commercial use, always have a written licence agreement. SportShield\'s Ownership Certificate can serve as an exhibit (proof of prior ownership) in any licence dispute.' },
    ],
  },
];

export default function ResourcesPage() {
  return (
    <>
      <Head><title>Resources — SportShield</title></Head>
      <Navbar />

      <div className="ap-root" style={{ paddingTop: 64 }}>

        {/* ── Hero ── */}
        <section style={{ background: 'linear-gradient(135deg,#0a1710,#0d2010)', padding: 'clamp(56px,7vw,96px) 24px', textAlign: 'center', borderBottom: '1px solid rgba(26,92,26,0.2)' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(26,92,26,0.18)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: 20, padding: '4px 14px', marginBottom: 20 }}>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.78rem', color: '#4ade80', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              Free knowledge base
            </span>
          </div>
          <h1 className="ap-heading" style={{ fontSize: 'clamp(2.4rem,6vw,4rem)', marginBottom: 18 }}>
            Sports IP <span style={{ color: '#4ade80' }}>Resources</span>
          </h1>
          <p className="ap-muted" style={{ maxWidth: 540, margin: '0 auto 36px', fontSize: '1.05rem', lineHeight: 1.75 }}>
            Everything you need to understand, protect, and licence your sports media — from copyright basics to step-by-step DMCA walkthroughs.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
            {SECTIONS.map(s => (
              <a key={s.id} href={`#${s.id}`}
                style={{ background: 'rgba(26,92,26,0.2)', border: '1px solid rgba(26,92,26,0.4)', borderRadius: 20, padding: '6px 14px', fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', textDecoration: 'none' }}>
                {s.icon} {s.title}
              </a>
            ))}
          </div>
        </section>

        {/* ── Sections ── */}
        {SECTIONS.map((s, i) => (
          <section key={s.id} id={s.id}
            style={{ padding: 'clamp(56px,6vw,88px) 24px', borderBottom: '1px solid rgba(26,92,26,0.15)', background: i % 2 ? 'rgba(10,23,12,0.5)' : 'transparent', scrollMarginTop: 80 }}>
            <div style={{ maxWidth: 880, margin: '0 auto' }}>
              {/* Header */}
              <div style={{ marginBottom: 36 }}>
                <span style={{ fontSize: '2rem', display: 'block', marginBottom: 12 }}>{s.icon}</span>
                <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 'clamp(1.8rem,4vw,2.6rem)', color: '#fff', marginBottom: 8, lineHeight: 1.1 }}>{s.title}</h2>
                <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem', color: '#4ade80' }}>{s.subtitle}</p>
              </div>

              {/* Articles */}
              {s.articles && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 16 }}>
                  {s.articles.map((a, ai) => (
                    <div key={ai} className="ap-card" style={{ padding: 24 }}>
                      <span style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.1em', color: '#4ade80', textTransform: 'uppercase', marginBottom: 10, display: 'block' }}>{a.tag}</span>
                      <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1rem', color: '#fff', marginBottom: 10, lineHeight: 1.3 }}>{a.title}</h3>
                      <p className="ap-muted" style={{ fontSize: '0.85rem', lineHeight: 1.7 }}>{a.desc}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* FAQ-style content */}
              {s.content && s.content.map((item, ci) => (
                <div key={ci} style={{ padding: '20px 0', borderBottom: '1px solid rgba(26,92,26,0.18)' }}>
                  <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem', color: '#fff', marginBottom: 10 }}>{item.q}</p>
                  <p className="ap-muted" style={{ lineHeight: 1.75, fontSize: '0.92rem' }}>{item.a}</p>
                </div>
              ))}

              {/* Step-by-step */}
              {s.steps && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 16 }}>
                  {s.steps.map((step, si) => (
                    <div key={si} className="ap-card" style={{ padding: 24 }}>
                      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '2rem', color: 'rgba(74,222,128,0.25)', marginBottom: 8 }}>{step.n}</div>
                      <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1rem', color: '#fff', marginBottom: 8 }}>{step.title}</h3>
                      <p className="ap-muted" style={{ fontSize: '0.85rem', lineHeight: 1.7 }}>{step.desc}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        ))}

        {/* ── CTA ── */}
        <section style={{ textAlign: 'center', padding: 'clamp(56px,7vw,96px) 24px' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 'clamp(2rem,5vw,2.8rem)', color: '#fff', marginBottom: 18 }}>
            Put this knowledge to work
          </h2>
          <p className="ap-muted" style={{ marginBottom: 32, maxWidth: 420, margin: '0 auto 32px' }}>
            Upload your sports media now and let SportShield handle the monitoring, detection, and DMCA notices.
          </p>
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/signup" className="ap-btn ap-btn-green" style={{ fontSize: '0.95rem', padding: '14px 32px' }}>Get Started Free →</Link>
            <Link href="/verify"  className="ap-btn ap-btn-ghost" style={{ fontSize: '0.95rem', padding: '14px 32px' }}>Verify a URL</Link>
          </div>
        </section>
      </div>

      <Footer />
    </>
  );
}
