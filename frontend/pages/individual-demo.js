import Link from 'next/link';
import Head from 'next/head';
import Footer from '../components/landing/Footer';
import MobileNav from '../components/MobileNav';

const Step = ({ number, title, desc, icon, color = '#4ade80' }) => (
  <div style={{ display: 'flex', gap: 18, marginBottom: 28 }}>
    <div style={{ flexShrink: 0, width: 48, height: 48, borderRadius: '50%', background: `${color}15`, border: `2px solid ${color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '1.1rem', color }}>
      {number}
    </div>
    <div style={{ flex: 1, paddingTop: 4 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <span style={{ fontSize: '1.1rem' }}>{icon}</span>
        <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1rem', color: '#fff', margin: 0 }}>{title}</h3>
      </div>
      <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.88rem', lineHeight: 1.7, margin: 0 }}>{desc}</p>
    </div>
  </div>
);

const Scenario = ({ title, who, problem, steps, outcome }) => (
  <div className="ap-card" style={{ padding: '28px 24px', marginBottom: 20 }}>
    <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.05rem', color: '#4ade80', marginBottom: 14 }}>{title}</h3>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
      <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: '12px 14px' }}>
        <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700, marginBottom: 4 }}>Who</p>
        <p style={{ fontSize: '0.85rem', color: '#fff', margin: 0 }}>{who}</p>
      </div>
      <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: '12px 14px' }}>
        <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700, marginBottom: 4 }}>Problem</p>
        <p style={{ fontSize: '0.85rem', color: '#f87171', margin: 0 }}>{problem}</p>
      </div>
    </div>
    <div style={{ borderLeft: '2px solid rgba(74,222,128,0.2)', paddingLeft: 16, marginBottom: 16 }}>
      {steps.map((s, i) => (
        <div key={i} style={{ display: 'flex', gap: 10, marginBottom: i < steps.length - 1 ? 10 : 0 }}>
          <span style={{ color: '#4ade80', fontWeight: 800, fontSize: '0.8rem', flexShrink: 0, marginTop: 1 }}>{i + 1}.</span>
          <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.6, margin: 0 }}>{s}</p>
        </div>
      ))}
    </div>
    <div style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.15)', borderRadius: 10, padding: '12px 16px' }}>
      <p style={{ fontSize: '0.7rem', color: '#4ade80', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700, marginBottom: 4 }}>Outcome</p>
      <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', margin: 0, lineHeight: 1.6 }}>{outcome}</p>
    </div>
  </div>
);

export default function IndividualDemo() {
  return (
    <>
      <Head><title>Individual Athlete Use Case — SportShield</title></Head>
      <div className="ap-root">
        <nav className="ap-nav">
          <div className="ap-nav-left">
            <Link href="/" className="ap-back">&larr; Dashboard</Link>
            <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.1)' }} />
            <Link href="/" className="ap-logo">
              <img src="/images/sportshield-logo-transparent.png" alt="SportShield" />
              <span className="ap-logo-text">SPORTSHIELD</span>
            </Link>
          </div>
          <div className="ap-nav-right">
            <MobileNav />
          </div>
        </nav>

        <main style={{ maxWidth: 900, margin: '0 auto', padding: '48px 24px' }}>

          {/* ── Hero ── */}
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(26,92,26,0.15)', border: '1px solid rgba(26,92,26,0.3)', borderRadius: 20, padding: '5px 14px', marginBottom: 20 }}>
              <span style={{ color: '#4ade80', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Individual Athlete &amp; Creator</span>
            </div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', color: '#fff', lineHeight: 1.1, marginBottom: 16 }}>
              How Individual Athletes Use SportShield
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '1rem', maxWidth: 620, margin: '0 auto', lineHeight: 1.7 }}>
              You train hard, capture the moment, and post it online. But within hours, your photos and clips show up on pirate sites, fan accounts, and betting platforms &mdash; without your permission, without credit, without payment. Here&apos;s how SportShield fights back for you.
            </p>
          </div>

          {/* ── Meet the user ── */}
          <div className="ap-card" style={{ padding: '28px 24px', marginBottom: 36, display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <img src="/images/demo-messi.jpg" alt="Athlete" style={{ width: 100, height: 100, borderRadius: 12, objectFit: 'cover', border: '2px solid rgba(74,222,128,0.2)' }} />
            <div style={{ flex: 1, minWidth: 240 }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.2rem', color: '#fff', marginBottom: 8 }}>Meet Priya &mdash; Professional Football Photographer</h2>
              <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.88rem', lineHeight: 1.7, marginBottom: 12 }}>
                Priya is a freelance sports photographer who covers ISL and I-League matches across India. She sells her match-day photos to news outlets and licenses them to clubs for social media. Her livelihood depends on controlling where her work appears.
              </p>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <span style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', fontSize: '0.75rem', fontWeight: 700, padding: '4px 12px', borderRadius: 8 }}>Lost ~$2,400/year to piracy</span>
                <span style={{ background: 'rgba(251,191,36,0.1)', color: '#fbbf24', fontSize: '0.75rem', fontWeight: 700, padding: '4px 12px', borderRadius: 8 }}>500+ photos per season</span>
                <span style={{ background: 'rgba(74,222,128,0.1)', color: '#4ade80', fontSize: '0.75rem', fontWeight: 700, padding: '4px 12px', borderRadius: 8 }}>Works alone, no legal team</span>
              </div>
            </div>
          </div>

          {/* ── The Journey ── */}
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '1.3rem', color: '#fff', marginBottom: 8 }}>Priya&apos;s Journey with SportShield</h2>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', marginBottom: 28, lineHeight: 1.6 }}>From the moment she takes a photo to the moment a pirate site takes it down &mdash; step by step.</p>

          <div style={{ marginBottom: 40 }}>
            <Step number={1} icon="📸"
              title="She uploads her best match-day shots"
              desc="After the ISL final, Priya uploads 12 of her best photos to SportShield. Each one gets a unique digital fingerprint (pHash + PDQ hash) — like a DNA profile for the image. She also gets a blockchain-backed ownership certificate with a timestamp proving she created it first."
            />
            <Step number={2} icon="🛡️"
              title="Invisible watermark gets embedded"
              desc="SportShield silently embeds an invisible watermark into every photo — invisible to the human eye, but traceable by our system. Even if someone screenshots, crops, or recolors the image, the watermark survives. It's her hidden signature."
            />
            <Step number={3} icon="🔍"
              title="AI scans the entire internet for copies"
              desc="Within minutes, SportShield's crawler searches Google Images, social platforms, fan sites, and betting platforms for visual matches. It uses perceptual hashing (catches crops and resizes) and CLIP embeddings (catches edits, filters, overlays) to find even cleverly disguised copies."
            />
            <Step number={4} icon="🚨"
              title="She gets an alert: 3 unauthorized uses found"
              desc="Priya opens her dashboard and sees red: a betting site in Europe is using her goal celebration photo as a thumbnail. A fan account reposted it without credit. A news blog embedded it directly. Each match shows confidence percentage, risk score, and the exact URL."
            />
            <Step number={5} icon="⚖️"
              title="One-click DMCA takedown notice"
              desc="Priya clicks 'Send Takedown' on the betting site. SportShield auto-generates a legally formatted DMCA notice with her ownership proof, the original upload timestamp, and the infringing URL — then emails it directly to the site's webmaster and abuse contact."
            />
            <Step number={6} icon="📧"
              title="Email keeps her updated without logging in"
              desc="She gets email alerts when scans complete, when new violations appear, and when her asset's protection period is about to expire. If it expires, she gets a reminder to re-upload and continue monitoring — no violations slip through the cracks."
            />
            <Step number={7} icon="📊"
              title="Weekly protection report lands in her inbox"
              desc="Every Monday, Priya gets a report summarizing the week: how many scans ran, new matches found, DMCA actions taken, and a protection score. The report narrative is written by Gemini AI — clear, friendly, actionable. She can download it as a styled HTML file for her records."
            />
          </div>

          {/* ── Real Scenarios ── */}
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '1.3rem', color: '#fff', marginBottom: 8 }}>Real-World Scenarios</h2>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', marginBottom: 24, lineHeight: 1.6 }}>These are the situations individual athletes and creators face every day.</p>

          <Scenario
            title="Scenario 1: The Viral Goal Photo"
            who="Priya, freelance photographer"
            problem="Her ISL final goal photo goes viral — but nobody credits or pays her"
            steps={[
              'Priya uploads the original high-res photo to SportShield immediately after the match.',
              'Within 2 hours, the scanner finds 8 copies across Instagram fan pages, Twitter accounts, and two sports blogs.',
              'She marks her official licensees (ESPN India, ISL official) as "trusted" — those are authorized.',
              'For the 5 unauthorized uses, she sends DMCA notices with one click each.',
              'Three sites remove the image within 48 hours. For the remaining two, she downloads the Evidence Pack — complete with timestamps, confidence scores, and ownership proof — and forwards it to her lawyer.',
            ]}
            outcome="3 out of 5 sites comply. The evidence pack helps her lawyer negotiate a licensing fee from the other two. Total recovered: $800 for a single photo."
          />

          <Scenario
            title="Scenario 2: The WhatsApp Forward"
            who="Rahul, semi-pro cricketer"
            problem="His batting highlights clip is circulating on WhatsApp groups and Telegram channels"
            steps={[
              'Rahul\'s friend sends him a WhatsApp message: "Bro, your clip is everywhere." He forwards it to SportShield\'s WhatsApp bot.',
              'The bot extracts keyframes from the video, runs fingerprint matching, and finds the original source — a pirate Telegram channel with 50K subscribers.',
              'SportShield generates a DMCA notice addressed to Telegram\'s abuse team with the channel link and proof of ownership.',
              'Rahul also enables the "URL Watchlist" and adds the Telegram channel URL — SportShield checks it every 6 hours to see if the content was removed.',
              'Two days later, the URL check shows the content is gone. Rahul gets a notification: "Content removed from t.me/cricket_clips."',
            ]}
            outcome="The pirate channel removes the clip. Rahul's URL watchlist continues monitoring in case it gets re-uploaded."
          />

          <Scenario
            title="Scenario 3: AI-Generated Fake"
            who="Ananya, professional athlete"
            problem="Someone created an AI-generated image using her likeness in a fake endorsement"
            steps={[
              'Ananya uploads the suspicious image she found on a betting ad to SportShield.',
              'The AI Detection module (powered by Google Cloud Vision) flags it: 87% confidence it\'s AI-generated.',
              'The Deepfake Analysis confirms: the face has been swapped onto a different body using generative AI.',
              'SportShield generates a special DMCA + Right of Publicity notice — this isn\'t just copyright, it\'s identity theft.',
              'She downloads the full analysis report including AI detection scores, deepfake confidence, and side-by-side comparison.',
            ]}
            outcome="Armed with AI-backed evidence, Ananya's legal team sends a cease-and-desist. The betting platform removes the ad within 24 hours."
          />

          {/* ── What You Get ── */}
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '1.3rem', color: '#fff', marginBottom: 20, marginTop: 40 }}>Everything You Get as an Individual</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14, marginBottom: 40 }}>
            {[
              { title: 'Digital Fingerprinting', desc: 'pHash, PDQ hash, and CLIP embeddings create a unique identity for every image and video. Even heavily edited copies get caught.', color: '#4ade80' },
              { title: 'Invisible Watermarking', desc: 'Hidden marks embedded in your media survive screenshots, crops, compression, and social media re-encoding.', color: '#60a5fa' },
              { title: 'AI Detection & Deepfake Analysis', desc: 'Cloud Vision and ML models identify AI-generated fakes and deepfakes using your likeness.', color: '#f59e0b' },
              { title: 'Ownership Proof Certificate', desc: 'Blockchain-timestamped proof that you uploaded first. Downloadable, verifiable, legally admissible.', color: '#a78bfa' },
              { title: 'Automated DMCA Takedowns', desc: 'Legally formatted notices sent directly to site owners and platform abuse teams. No lawyer needed for standard cases.', color: '#f87171' },
              { title: 'WhatsApp & Browser Extension', desc: 'Scan suspicious content from your phone via WhatsApp or right-click any image on the web to check it.', color: '#34d399' },
              { title: 'Email & Push Alerts', desc: 'Get notified the moment your content appears somewhere unauthorized. Weekly reports keep you informed.', color: '#fb923c' },
              { title: 'Community Network', desc: 'Join other athletes reporting pirate streams. Earn reputation by verifying reports. The crowd is the first line of defense.', color: '#e879f9' },
            ].map(f => (
              <div key={f.title} className="ap-card" style={{ padding: '18px 16px' }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: f.color, marginBottom: 10 }} />
                <p style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '0.88rem', color: '#fff', marginBottom: 6 }}>{f.title}</p>
                <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.45)', lineHeight: 1.6, margin: 0 }}>{f.desc}</p>
              </div>
            ))}
          </div>

          {/* ── CTA ── */}
          <div style={{ textAlign: 'center', marginBottom: 40, padding: '36px 24px', background: 'rgba(26,92,26,0.08)', border: '1px solid rgba(26,92,26,0.2)', borderRadius: 16 }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '1.4rem', color: '#fff', marginBottom: 12 }}>See It In Action</h2>
            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.9rem', marginBottom: 24, maxWidth: 480, margin: '0 auto 24px' }}>
              Try the full dashboard with sample data &mdash; upload detection, alerts, DMCA workflow, and weekly reports.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href="/?demo=true" className="ap-btn ap-btn-green" style={{ padding: '12px 28px', fontSize: '0.9rem' }}>
                Try Demo Mode &rarr;
              </Link>
              <Link href="/sports-club-demo" className="ap-btn" style={{ padding: '12px 28px', fontSize: '0.9rem', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}>
                View Sports Club Use Case
              </Link>
            </div>
          </div>

        </main>
        <Footer />
      </div>
    </>
  );
}
