import Link from 'next/link';

const heroCards = [
  {
    img: '/images/hero-card-1.jpg',
    timestamp: 'Uploaded 4 days ago',
    badge: null,
    recover: false,
    labelTag: 'ORIGINAL',
    labelClass: 'original',
    labelSite: 'Uploaded by you',
  },
  {
    img: '/images/hero-card-2.jpg',
    timestamp: 'Found 2 days ago',
    badge: { type: 'check', icon: '✓' },
    recover: false,
    labelTag: 'LICENSED USE',
    labelClass: 'licensed',
    labelSite: 'Found at espn.com',
  },
  {
    img: '/images/hero-card-3.jpg',
    timestamp: 'Found 5 hours ago',
    badge: { type: 'dollar', icon: '$' },
    recover: true,
    labelTag: 'UNAUTHORIZED',
    labelClass: 'unauthorized',
    labelSite: 'Found at sportstheft.co',
  },
];

export default function Hero() {
  return (
    <section className="ss-hero">
      <h1 className="ss-hero-headline">
        Find and Fight<br />Sport Theft
      </h1>
      <p className="ss-hero-sub">
        Take back control of your sports media. See where &amp; how your images and
        videos are being used online — and act on it instantly.
      </p>

      <div className="ss-hero-cards">
        {heroCards.map((card) => (
          <div className="ss-card" key={card.labelTag}>
            <div style={{ position: 'relative', overflow: 'hidden' }}>
              <img src={card.img} alt={card.labelTag} />

              <span className="ss-card-timestamp">{card.timestamp}</span>

              {card.badge && (
                <span className={`ss-card-badge ${card.badge.type}`}>
                  {card.badge.icon}
                </span>
              )}

              {card.recover && (
                <div className="ss-card-recover">RECOVER COMPENSATION $$$</div>
              )}
            </div>

            <div className="ss-card-label">
              <span className={`ss-card-label-tag ${card.labelClass}`}>
                {card.labelTag}
              </span>
              <span className="ss-card-label-site">{card.labelSite}</span>
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 48, display: 'flex', gap: 16, justifyContent: 'center' }}>
        <Link href="/signup" className="ss-btn-primary">
          Get Started Free
        </Link>
        <Link href="/dashboard" style={{
          display: 'inline-block',
          border: '2px solid var(--green-700)',
          color: 'var(--green-700)',
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          fontSize: '0.85rem',
          letterSpacing: '0.08em',
          padding: '11px 28px',
          borderRadius: '6px',
          textDecoration: 'none',
          textTransform: 'uppercase',
          transition: 'background 0.2s, color 0.2s',
        }}>
          View Dashboard
        </Link>
      </div>
    </section>
  );
}
