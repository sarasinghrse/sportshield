const features = [
  {
    icon: '🔍',
    title: 'See where your sports media is used',
    desc: 'SportShield actively monitors the public internet to see where and how your images, videos, and broadcasts are being used online.',
  },
  {
    icon: '⚙️',
    title: 'Filter and search your results',
    desc: 'Our filters and advanced AI automatically group matches so you can quickly find what\'s important — by platform, region, or severity.',
  },
  {
    icon: '🔔',
    title: 'Get alerted to new matches',
    desc: 'SportShield never stops scanning — we automatically alert you in real-time when new media matches are detected.',
  },
];

export default function MonitorSection() {
  return (
    <section className="ss-section" style={{ background: '#0a1710' }}>
      <div className="ss-monitor ss-max">
        {/* Content */}
        <div className="ss-monitor-content">
          <div style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 900,
            fontSize: '2.4rem',
            color: 'var(--green-700)',
            lineHeight: 1.05,
            marginBottom: 8,
          }}>
            🌐 Monitor
          </div>

          <p className="ss-monitor-num">
            We found over <span style={{ color: 'var(--green-700)', fontWeight: 900 }}>350,000+</span> matches online!
          </p>

          {features.map(f => (
            <div className="ss-monitor-feature" key={f.title}>
              <span className="ss-monitor-feature-icon">{f.icon}</span>
              <div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Visual */}
        <div className="ss-monitor-visual">
          <img src="/images/hero-card-2.jpg" alt="SportShield monitoring dashboard" />
          {/* Overlay panel */}
          <div style={{
            position: 'absolute',
            bottom: 20, right: 20,
            background: 'rgba(10,26,14,0.95)',
            border: '1px solid rgba(26,92,26,0.4)',
            borderRadius: 10,
            padding: '16px 20px',
            boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
            minWidth: 160,
          }}>
            <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.45)', fontWeight: 700, letterSpacing: '0.08em', marginBottom: 6 }}>
              MATCHES FOUND
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '2.2rem', color: 'var(--green-400)', lineHeight: 1 }}>
              48
            </div>
            <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>across 12 platforms</div>
          </div>
        </div>
      </div>
    </section>
  );
}
