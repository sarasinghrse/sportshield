const platforms = [
  { icon: '📸', label: 'Instagram' },
  { icon: '☁️', label: 'Dropbox'   },
  { icon: '🟡', label: 'Google Drive' },
  { icon: '🏟️', label: 'Getty'     },
  { icon: '📡', label: 'ESPN'      },
  { icon: '🗄️', label: 'Shutterstock' },
];

// positions (top%, left%) for floating badges around the main image
const badgePositions = [
  { top: '2%',  left: '0%'  },
  { top: '2%',  left: '30%' },
  { top: '35%', left: '0%'  },
  { top: '35%', left: '30%' },
  { top: '68%', left: '0%'  },
  { top: '68%', left: '30%' },
];

const features = [
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
        className="ss-import-feature-icon">
        <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1M8 12l4 4 4-4M12 4v12" />
      </svg>
    ),
    title: 'Import instantly from popular platforms',
    desc:  'One-click connection from media platforms to sync your assets and start monitoring for matches online.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
        className="ss-import-feature-icon">
        <path d="M4 4v5h.582M20 20v-5h-.581M5.404 9A7.5 7.5 0 0118.5 13.5M18.5 9a7.5 7.5 0 01-13.096 4.5" />
      </svg>
    ),
    title: 'New assets synced automatically',
    desc:  'Add new images by simply refreshing your connection to your chosen source, ensuring you are always protected.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
        className="ss-import-feature-icon">
        <path d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414A1 1 0 0120 9.414V19a2 2 0 01-2 2z" />
      </svg>
    ),
    title: 'Bulk upload from your device',
    desc:  'As well as syncing with a supported platform, you can upload media manually from your computer or via our API.',
  },
];

export default function ImportSection() {
  return (
    <section className="ss-section" style={{ background: 'var(--gray-50)' }}>
      <div className="ss-import ss-max">
        {/* Visual */}
        <div className="ss-import-visual">
          {platforms.map((p, i) => (
            <div
              key={p.label}
              className="ss-platform-badge"
              style={{
                top:  badgePositions[i].top,
                left: badgePositions[i].left,
                zIndex: 3,
              }}
            >
              <span className="platform-icon">{p.icon}</span>
              {p.label}
            </div>
          ))}
          <img
            src="/images/hero-card-1.jpg"
            alt="Sports media management"
            className="ss-import-main-img"
          />
        </div>

        {/* Content */}
        <div className="ss-import-content">
          <div className="ss-import-num">
            <span>🗄️ </span>Import
          </div>
          <p style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '1.5rem', color: '#ffffff', marginBottom: 28 }}>
            Over <strong style={{ color: 'var(--green-700)' }}>150,000+</strong> sports assets monitored daily!
          </p>

          {features.map(f => (
            <div className="ss-import-feature" key={f.title}>
              {f.icon}
              <div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
