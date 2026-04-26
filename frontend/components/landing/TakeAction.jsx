import Link from 'next/link';

const BoltIcon  = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>;
const SearchIcon= () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;
const MedalIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/></svg>;

const features = [
  { Icon: SearchIcon, title: 'Recover compensation',        desc: 'SportShield works hard to recover licensing fees and damages for the unauthorized use of your sports media.', link: '#' },
  { Icon: BoltIcon,   title: 'Issue Takedowns globally',    desc: 'Instantly send legally-binding DMCA takedown notices worldwide, matching the local law and language. Fast, effective, and free.', link: '#' },
  { Icon: MedalIcon,  title: 'Prove ownership with Certificates', desc: 'Generate official SportShield ownership certificates for any asset, embedding your pHash fingerprint and scan history.', link: '#' },
];

export default function TakeAction() {
  return (
    <section className="ss-section" style={{ background: 'var(--gray-50)' }}>
      <div className="ss-action ss-max">
        {/* Visual */}
        <div className="ss-action-visual">
          <div className="ss-action-img tall"><img src="/images/sports-action-1.jpg" alt="Sports photography 1" /></div>
          <div className="ss-action-img"><img src="/images/sports-action-2.jpg" alt="Sports photography 2" /></div>
          <div className="ss-action-img" style={{ position: 'relative' }}>
            <img src="/images/sports-action-3.jpg" alt="Sports photography 3" />
            <div className="ss-action-takedown">ISSUE TAKEDOWN</div>
          </div>
        </div>

        {/* Content */}
        <div className="ss-action-content">
          <div className="ss-action-icon">
            <BoltIcon />
          </div>
          <h2 className="ss-action-heading">Take Action</h2>
          <p className="ss-action-count">Over <strong>200,000</strong> infringement cases managed</p>

          {features.map(f => (
            <div className="ss-action-feature" key={f.title}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: 'var(--green-400)', flexShrink: 0 }}><f.Icon /></span>
                {f.title}
              </h3>
              <p>{f.desc}</p>
              <Link href={f.link} className="ss-action-learn">Learn more ›</Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
