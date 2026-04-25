import Link from 'next/link';

const features = [
  {
    icon: '🔍',
    title: 'Recover compensation',
    desc: 'SportShield works hard to recover licensing fees and damages for the unauthorized use of your sports media.',
    link: '#',
  },
  {
    icon: '⚡',
    title: 'Issue Takedowns globally',
    desc: 'Instantly send legally-binding DMCA takedown notices worldwide, matching the local law and language. Fast, effective, and free.',
    link: '#',
  },
  {
    icon: '🏅',
    title: 'Prove ownership with Certificates',
    desc: 'Generate official SportShield ownership certificates for any asset, embedding your pHash fingerprint and scan history.',
    link: '#',
  },
];

export default function TakeAction() {
  return (
    <section className="ss-section" style={{ background: 'var(--gray-50)' }}>
      <div className="ss-action ss-max">
        {/* Visual: 2×2 image collage */}
        <div className="ss-action-visual">
          <div className="ss-action-img tall">
            <img src="/images/sports-action-1.jpg" alt="Sports photography 1" />
          </div>
          <div className="ss-action-img">
            <img src="/images/sports-action-2.jpg" alt="Sports photography 2" />
          </div>
          <div className="ss-action-img" style={{ position: 'relative' }}>
            <img src="/images/sports-action-3.jpg" alt="Sports photography 3" />
            <div className="ss-action-takedown">ISSUE TAKEDOWN</div>
          </div>
        </div>

        {/* Content */}
        <div className="ss-action-content">
          <div className="ss-action-icon">⚡</div>
          <h2 className="ss-action-heading">Take Action</h2>
          <p className="ss-action-count">
            Over <strong>200,000</strong> infringement cases managed
          </p>

          {features.map(f => (
            <div className="ss-action-feature" key={f.title}>
              <h3><span>{f.icon}</span> {f.title}</h3>
              <p>{f.desc}</p>
              <Link href={f.link} className="ss-action-learn">
                Learn more ›
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
