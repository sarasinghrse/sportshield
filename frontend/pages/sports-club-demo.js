import Link from 'next/link';
import Head from 'next/head';
import Footer from '../components/landing/Footer';
import MobileNav from '../components/MobileNav';

const Step = ({ number, title, desc, icon, color = '#60a5fa' }) => (
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
    <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.05rem', color: '#60a5fa', marginBottom: 14 }}>{title}</h3>
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
    <div style={{ borderLeft: '2px solid rgba(96,165,250,0.2)', paddingLeft: 16, marginBottom: 16 }}>
      {steps.map((s, i) => (
        <div key={i} style={{ display: 'flex', gap: 10, marginBottom: i < steps.length - 1 ? 10 : 0 }}>
          <span style={{ color: '#60a5fa', fontWeight: 800, fontSize: '0.8rem', flexShrink: 0, marginTop: 1 }}>{i + 1}.</span>
          <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.6, margin: 0 }}>{s}</p>
        </div>
      ))}
    </div>
    <div style={{ background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.15)', borderRadius: 10, padding: '12px 16px' }}>
      <p style={{ fontSize: '0.7rem', color: '#60a5fa', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700, marginBottom: 4 }}>Outcome</p>
      <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', margin: 0, lineHeight: 1.6 }}>{outcome}</p>
    </div>
  </div>
);

const RoleCard = ({ role, icon, responsibilities }) => (
  <div className="ap-card" style={{ padding: '20px 18px' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
      <span style={{ fontSize: '1.3rem' }}>{icon}</span>
      <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '0.95rem', color: '#fff', margin: 0 }}>{role}</h3>
    </div>
    <ul style={{ margin: 0, paddingLeft: 18 }}>
      {responsibilities.map((r, i) => (
        <li key={i} style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.7, marginBottom: 4 }}>{r}</li>
      ))}
    </ul>
  </div>
);

export default function SportsClubDemo() {
  return (
    <>
      <Head><title>Sports Club Use Case &mdash; SportShield</title></Head>
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
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.25)', borderRadius: 20, padding: '5px 14px', marginBottom: 20 }}>
              <span style={{ color: '#60a5fa', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Sports Club &amp; Organization</span>
            </div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', color: '#fff', lineHeight: 1.1, marginBottom: 16 }}>
              How Sports Clubs Use SportShield
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '1rem', maxWidth: 640, margin: '0 auto', lineHeight: 1.7 }}>
              Your club produces thousands of photos, match highlights, and broadcast clips every season. Pirates stream your matches live, steal your thumbnails, and monetize your content on their platforms. SportShield gives your media team the tools to fight back at scale.
            </p>
          </div>

          {/* ── Meet the club ── */}
          <div className="ap-card" style={{ padding: '28px 24px', marginBottom: 36 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
              <div style={{ width: 56, height: 56, borderRadius: 12, background: 'linear-gradient(135deg, #1a3a6a, #0a1f3a)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', border: '2px solid rgba(96,165,250,0.3)' }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/><path d="M2 12h20"/></svg>
              </div>
              <div>
                <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.2rem', color: '#fff', margin: 0 }}>Meet Deccan FC &mdash; Professional Football Club</h2>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.82rem', margin: 0 }}>ISL franchise &bull; 2M+ social followers &bull; 34 home matches/season</p>
              </div>
            </div>
            <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.88rem', lineHeight: 1.7, marginBottom: 16 }}>
              Deccan FC&apos;s media department produces 200+ photos and 30+ video clips per match. Their broadcast partner licenses match highlights exclusively. But every matchday, illegal streams pop up on pirate sites, highlights get ripped and reuploaded to YouTube within minutes, and fan accounts monetize their content without permission.
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <span style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', fontSize: '0.75rem', fontWeight: 700, padding: '4px 12px', borderRadius: 8 }}>$120K+ lost annually to piracy</span>
              <span style={{ background: 'rgba(251,191,36,0.1)', color: '#fbbf24', fontSize: '0.75rem', fontWeight: 700, padding: '4px 12px', borderRadius: 8 }}>6,800+ media assets/season</span>
              <span style={{ background: 'rgba(96,165,250,0.1)', color: '#60a5fa', fontSize: '0.75rem', fontWeight: 700, padding: '4px 12px', borderRadius: 8 }}>3-person media team</span>
              <span style={{ background: 'rgba(167,139,250,0.1)', color: '#a78bfa', fontSize: '0.75rem', fontWeight: 700, padding: '4px 12px', borderRadius: 8 }}>1 legal counsel</span>
            </div>
          </div>

          {/* ── Team Roles ── */}
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '1.3rem', color: '#fff', marginBottom: 8 }}>Who Uses SportShield in the Club</h2>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', marginBottom: 20, lineHeight: 1.6 }}>Different people in the organization use different parts of the platform.</p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14, marginBottom: 40 }}>
            <RoleCard role="Media Manager" icon="📷" responsibilities={[
              'Bulk uploads match-day photos and highlights',
              'Sets trusted domains (official partners, licensees)',
              'Reviews weekly protection reports',
              'Downloads evidence packs for legal team',
            ]} />
            <RoleCard role="Legal / Compliance" icon="⚖️" responsibilities={[
              'Reviews high-severity alerts and DMCA recommendations',
              'Sends takedown notices to repeat offenders',
              'Escalates cases via the Enforcement Agent',
              'Archives evidence packs for litigation',
            ]} />
            <RoleCard role="Social Media Manager" icon="📱" responsibilities={[
              'Monitors fan accounts for unauthorized reposts',
              'Uses browser extension to right-click and check images',
              'Forwards suspicious WhatsApp clips to the bot',
              'Manages URL watchlist for known pirate channels',
            ]} />
            <RoleCard role="Club Admin" icon="🏢" responsibilities={[
              'Views organization-wide dashboard and analytics',
              'Runs health checks on the system',
              'Manages contact messages from external parties',
              'Monitors community crowd-sourced reports',
            ]} />
          </div>

          {/* ── The Matchday Workflow ── */}
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '1.3rem', color: '#fff', marginBottom: 8 }}>A Typical Matchday</h2>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', marginBottom: 28, lineHeight: 1.6 }}>From kickoff to takedown &mdash; here&apos;s how Deccan FC protects a single match&apos;s content.</p>

          <div style={{ marginBottom: 40 }}>
            <Step number={1} icon="📤" color="#60a5fa"
              title="Pre-match: Media team uploads reference assets"
              desc="Before kickoff, the media manager uploads the official match poster, team sheet graphic, and pre-match photos. These are fingerprinted and watermarked so any copy found later can be traced. The 'Send Email Updates' toggle is ON — the whole team gets notified as scans progress."
            />
            <Step number={2} icon="📡" color="#60a5fa"
              title="Live match: Radar monitors for illegal streams"
              desc="The Live Radar module is activated with the match event details. It monitors known pirate streaming domains (totalsportek, sportsurge, buffstreams, hesgoal) in real-time. When it detects an illegal stream, it creates a detection record with the URL, timestamp, and streaming platform."
            />
            <Step number={3} icon="📸" color="#60a5fa"
              title="During match: Photos uploaded in batches"
              desc="The photographer uploads goal celebrations, key moments, and atmosphere shots in batches of 10-15. Each batch gets fingerprinted in seconds. The AI detector also checks if any uploaded images are themselves AI-generated fakes — ensuring the club's own library is authentic."
            />
            <Step number={4} icon="🎬" color="#60a5fa"
              title="Post-match: Highlight clips registered"
              desc="The video editor uploads official highlight clips. Video fingerprinting extracts keyframes and creates temporal fingerprints. These are cross-referenced against existing assets in the database — if the video contains frames from previously registered photos, the system links them together."
            />
            <Step number={5} icon="🔍" color="#60a5fa"
              title="Automated scanning begins across the web"
              desc="Within an hour of upload, the scanner has checked Google Images, social platforms, and 50+ known pirate domains. For a typical ISL match, the scan finds 15-30 copies of the club's content — some authorized (news partners with licenses), many not."
            />
            <Step number={6} icon="🚨" color="#60a5fa"
              title="Alerts sorted: authorized vs unauthorized"
              desc="The domain classifier checks each match against the club's trusted domain list (ESPN India, ISL official site, Sony LIV, etc). Authorized uses are green-lit. Unauthorized uses trigger alerts with risk scores. The media manager sees a clear dashboard: 8 authorized, 22 unauthorized."
            />
            <Step number={7} icon="📋" color="#60a5fa"
              title="Enforcement cases created for serious violations"
              desc="The legal team reviews high-confidence matches. For a betting site using match photos to promote gambling, they create an enforcement case. SportShield tracks the case from 'open' through 'notice sent' to 'resolved' or 'escalated'. The entire chain of evidence is preserved."
            />
            <Step number={8} icon="📦" color="#60a5fa"
              title="Evidence packs ready for legal action"
              desc="For cases that need legal follow-up, the system generates a downloadable Evidence Pack: original upload timestamp, fingerprint match data, screenshot of the infringing page, confidence score, ownership certificate, and a timeline of detection. Court-ready, without hours of manual documentation."
            />
          </div>

          {/* ── Real Scenarios ── */}
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '1.3rem', color: '#fff', marginBottom: 8 }}>Real-World Scenarios</h2>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', marginBottom: 24, lineHeight: 1.6 }}>These situations happen to sports clubs every single week.</p>

          <Scenario
            title="Scenario 1: The Pirate Stream During a Live Match"
            who="Deccan FC media team + legal"
            problem="Illegal streams of the ISL semifinal appear on 4 pirate sites within 10 minutes of kickoff"
            steps={[
              'The Live Radar event is set up: "ISL Semifinal — Deccan FC vs Mumbai City". Suspect domains are pre-loaded from previous matches.',
              'Within 10 minutes, Radar flags 4 active streams on totalsportek.com, sportsurge.io, buffstreams.tv, and hesgoal.com.',
              'Each detection gets a confidence score based on page content analysis. Gemini AI confirms these are real streams, not just schedule listings.',
              'The social media manager posts the detection to the Crowd Network — the community of 200+ verified reporters gets bounty credit for confirming the streams are live.',
              'Legal sends DMCA notices to all 4 platforms simultaneously using the batch DMCA feature. The notices include the Radar detection timestamp and live stream URL.',
              'Two streams go down within 30 minutes. The other two are escalated — SportShield tracks the case and sends follow-up notices after 48 hours.',
            ]}
            outcome="2 streams killed during the match, 2 more within 3 days. The club's broadcast partner estimates this saved $15,000 in viewer revenue for a single match."
          />

          <Scenario
            title="Scenario 2: Systematic Content Theft by a Fan Account"
            who="Social media manager"
            problem="A monetized Instagram fan account with 500K followers posts every Deccan FC photo without permission — and makes ad revenue from it"
            steps={[
              'Weekly scan reports consistently show the same Instagram account appearing in unauthorized matches — 40+ photos over 2 months.',
              'The media manager opens the account\'s detection history: a clear pattern of systematic theft, always within 1 hour of official posting.',
              'An enforcement case is created with "repeat offender" priority. The Evidence Pack includes all 40+ detections with timestamps showing the pattern.',
              'Legal sends a formal cease-and-desist via email (auto-generated by SportShield), plus a direct DMCA to Instagram\'s IP reporting form.',
              'Instagram removes the infringing posts. The fan account reaches out to negotiate a licensing deal.',
            ]}
            outcome="The fan account now pays a licensing fee of $200/month for official content access. What was a revenue drain becomes a revenue stream."
          />

          <Scenario
            title="Scenario 3: Deepfake Scandal Prevention"
            who="Club admin + communications team"
            problem="AI-generated images of a star player in a rival club's jersey start circulating on Twitter during transfer window"
            steps={[
              'A reporter forwards the suspicious image to the club. The media manager uploads it to SportShield for analysis.',
              'The AI Detection module (Cloud Vision) flags it at 91% confidence as AI-generated. The Deepfake Analysis identifies face-swap artifacts.',
              'SportShield\'s CLIP search finds the original training image — a match photo from the club\'s own library, uploaded 3 months ago.',
              'The communications team downloads the analysis report: original image, deepfake, confidence scores, artifact highlights, and ownership proof.',
              'The club issues a statement with the SportShield report attached, proving the image is fabricated. The tweet is taken down within hours.',
            ]}
            outcome="A potential PR crisis is shut down with evidence within 4 hours. The AI detection report is cited by sports journalists covering the story."
          />

          <Scenario
            title="Scenario 4: End-of-Season Content Audit"
            who="Media manager + club board"
            problem="The board wants to know: how much content was stolen this season, and what's the financial impact?"
            steps={[
              'The media manager generates a comprehensive report from SportShield covering the full season — 34 matches, 6,800+ assets.',
              'The Weekly Protection Reports (52 weeks) are compiled. Total findings: 1,200+ unauthorized uses detected, 800+ DMCA notices sent, 650+ successful takedowns.',
              'The Gemini-powered narrative summary calculates the estimated revenue impact based on industry-standard licensing rates and the type of content stolen.',
              'The data shows clear patterns: 60% of piracy comes from 5 repeat-offender domains, video content is stolen 3x more than photos, and betting platforms are the worst offenders.',
              'The report is downloaded as a styled HTML file and presented to the board with recommendations: block these 5 domains, pursue licensing deals with 3 fan accounts, and increase monitoring during high-profile matches.',
            ]}
            outcome="The board approves a dedicated content protection budget for next season. The data shows SportShield recovered an estimated $45,000 in licensing revenue and prevented ~$80,000 in potential losses."
          />

          {/* ── Scale features ── */}
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '1.3rem', color: '#fff', marginBottom: 20, marginTop: 40 }}>Club-Scale Features</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14, marginBottom: 40 }}>
            {[
              { title: 'Live Event Radar', desc: 'Real-time monitoring of pirate streaming sites during live broadcasts. Detect, document, and takedown illegal streams as they happen.', color: '#f87171' },
              { title: 'Batch Upload & Fingerprinting', desc: 'Upload entire match-day photo sets at once. Every image gets pHash, PDQ, CLIP embeddings, and invisible watermarks automatically.', color: '#60a5fa' },
              { title: 'Enforcement Pipeline', desc: 'Track violations from detection through DMCA notice to resolution. Case management with escalation workflows and status tracking.', color: '#fbbf24' },
              { title: 'Evidence Pack Generator', desc: 'Court-ready documentation bundles: timestamps, fingerprint data, screenshots, ownership proof, and detection confidence — one-click download.', color: '#a78bfa' },
              { title: 'Crowd-Sourced Intelligence', desc: 'A network of verified reporters who flag pirate streams and earn reputation. Bounties incentivize the community to be your first line of defense.', color: '#4ade80' },
              { title: 'Trusted Domain Management', desc: 'Whitelist your official partners, broadcasters, and licensees. Authorized uses are auto-classified — your team only sees real violations.', color: '#34d399' },
              { title: 'AI-Powered Weekly Reports', desc: 'Gemini 2.0 Flash writes a narrative summary of your week: what happened, what got caught, what needs attention. Downloadable and email-delivered.', color: '#fb923c' },
              { title: 'URL Watchlist Monitoring', desc: 'Add known pirate domains to your watchlist. SportShield checks them every 6 hours and alerts you the moment your content appears — or confirms takedowns worked.', color: '#e879f9' },
            ].map(f => (
              <div key={f.title} className="ap-card" style={{ padding: '18px 16px' }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: f.color, marginBottom: 10 }} />
                <p style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '0.88rem', color: '#fff', marginBottom: 6 }}>{f.title}</p>
                <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.45)', lineHeight: 1.6, margin: 0 }}>{f.desc}</p>
              </div>
            ))}
          </div>

          {/* ── Google Tech ── */}
          <div className="ap-card" style={{ padding: '24px', marginBottom: 36 }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.05rem', color: '#fff', marginBottom: 16 }}>Powered by Google Cloud</h3>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', lineHeight: 1.7, marginBottom: 16 }}>
              Every feature above is built on Google&apos;s infrastructure. Here&apos;s what runs under the hood:
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
              {[
                { tech: 'Cloud Run', use: 'Backend API hosting with auto-scaling' },
                { tech: 'Cloud Storage', use: 'Media files stored in GCS buckets' },
                { tech: 'Vertex AI', use: 'Multimodal embeddings for semantic search' },
                { tech: 'Cloud Vision', use: 'AI-generated image detection' },
                { tech: 'Firebase Auth', use: 'User authentication & access control' },
                { tech: 'Firebase Firestore', use: 'Real-time database for all data' },
                { tech: 'Gemini 2.0 Flash', use: 'Piracy scanning, report narratives, chat' },
                { tech: 'Firebase App Hosting', use: 'Frontend hosting with SSR' },
                { tech: 'Gmail SMTP', use: 'Transactional email delivery' },
              ].map(t => (
                <div key={t.tech} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: '10px 12px' }}>
                  <p style={{ fontWeight: 800, fontSize: '0.82rem', color: '#60a5fa', marginBottom: 2 }}>{t.tech}</p>
                  <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', margin: 0 }}>{t.use}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ── CTA ── */}
          <div style={{ textAlign: 'center', marginBottom: 40, padding: '36px 24px', background: 'rgba(96,165,250,0.05)', border: '1px solid rgba(96,165,250,0.15)', borderRadius: 16 }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '1.4rem', color: '#fff', marginBottom: 12 }}>See It In Action</h2>
            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.9rem', marginBottom: 24, maxWidth: 480, margin: '0 auto 24px' }}>
              Try the full dashboard with sample data &mdash; live radar, enforcement cases, crowd network, and weekly reports.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href="/?demo=true" className="ap-btn ap-btn-green" style={{ padding: '12px 28px', fontSize: '0.9rem' }}>
                Try Demo Mode &rarr;
              </Link>
              <Link href="/individual-demo" className="ap-btn" style={{ padding: '12px 28px', fontSize: '0.9rem', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}>
                View Individual Use Case
              </Link>
            </div>
          </div>

        </main>
        <Footer />
      </div>
    </>
  );
}
