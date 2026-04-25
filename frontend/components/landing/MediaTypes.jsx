import { useState } from 'react';
import Link from 'next/link';

const types = [
  { label: 'Photos',       desc: 'Action shots, portraits, match photography' },
  { label: 'Videos',       desc: 'Highlights, broadcasts, reels' },
  { label: 'Broadcasts',   desc: 'Live feeds, VOD, streaming clips' },
  { label: 'Designs',      desc: 'Logos, branding, creative assets' },
  { label: 'Art',          desc: 'Sports illustrations, digital art, NFTs' },
];

export default function MediaTypes() {
  const [active, setActive] = useState(0);

  return (
    <section className="ss-section ss-media-types">
      <div className="ss-max">
        <div style={{ display: 'flex', gap: 80, alignItems: 'flex-start' }}>
          {/* Left: type list */}
          <div style={{ flex: 1 }}>
            <div className="ss-media-list">
              {types.map((t, i) => (
                <span
                  key={t.label}
                  className={`ss-media-item ${i === active ? 'active' : ''}`}
                  onMouseEnter={() => setActive(i)}
                >
                  {t.label}
                </span>
              ))}
            </div>
            <Link href="/signup" style={{
              display: 'inline-block',
              marginTop: 32,
              background: 'var(--green-700)',
              color: '#fff',
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: '0.85rem',
              letterSpacing: '0.08em',
              padding: '13px 28px',
              borderRadius: '6px',
              textDecoration: 'none',
              textTransform: 'uppercase',
              transition: 'background 0.2s',
            }}>
              Learn More
            </Link>
          </div>

          {/* Right: active description */}
          <div style={{ flex: 1, paddingTop: 24 }}>
            <div style={{
              background: 'rgba(26,92,26,0.15)',
              border: '1px solid rgba(26,92,26,0.4)',
              borderRadius: 16,
              padding: '48px 40px',
              minHeight: 280,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
            }}>
              <div style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 900,
                fontSize: '3.5rem',
                color: 'var(--green-700)',
                marginBottom: 16,
                lineHeight: 1,
              }}>
                {types[active].label}
              </div>
              <p style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.65)', lineHeight: 1.7, maxWidth: 360 }}>
                SportShield protects your <strong>{types[active].label.toLowerCase()}</strong> from
                unauthorized use across the web. Our pHash fingerprinting technology works across
                all media types — even when content has been recompressed, cropped, or reposted.
              </p>
              <div style={{ marginTop: 24 }}>
                <Link href="/signup" style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  fontFamily: 'var(--font-display)',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  letterSpacing: '0.08em',
                  color: 'var(--green-700)',
                  textDecoration: 'none',
                  textTransform: 'uppercase',
                }}>
                  Protect my {types[active].label.toLowerCase()} →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
