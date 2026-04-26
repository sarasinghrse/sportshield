// components/landing/WhatsAppBot.jsx
const JOIN_LINK = 'https://wa.me/14155238886?text=join%20breath-familiar';
const WA_NUMBER = '+1 415 523 8886';
const JOIN_WORD  = 'join breath-familiar';

const WhatsAppIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

const CameraIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
    <circle cx="12" cy="13" r="4"/>
  </svg>
);

const ScanIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);

export default function WhatsAppBot() {
  return (
    <section style={{
      background: 'linear-gradient(135deg, #0a1210 0%, #0d1f10 60%, #0a1a0d 100%)',
      borderTop: '1px solid rgba(26,92,26,0.25)',
      borderBottom: '1px solid rgba(26,92,26,0.25)',
      padding: 'clamp(48px,8vw,72px) 24px',
    }}>
      <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 56, flexWrap: 'wrap' }}>

        {/* Left — text */}
        <div style={{ flex: '1 1 300px', minWidth: 0 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(37,211,102,0.1)', border: '1px solid rgba(37,211,102,0.25)', borderRadius: 20, padding: '5px 14px', marginBottom: 20 }}>
            <span style={{ color: '#25d366', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>New — WhatsApp Bot</span>
          </div>

          <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', color: '#ffffff', lineHeight: 1.1, marginBottom: 16 }}>
            Scan from WhatsApp.<br />
            <span style={{ color: '#25d366' }}>No app needed.</span>
          </h2>

          <p style={{ color: 'rgba(255,255,255,0.62)', fontSize: '1rem', lineHeight: 1.7, marginBottom: 28, maxWidth: 420 }}>
            Send any sports photo directly to our WhatsApp bot and get back a full copyright scan in under 30 seconds — match URLs, confidence scores, and AI detection, all in chat.
          </p>

          {/* Steps */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
            {[
              ['1', 'Tap the button below to open WhatsApp'],
              ['2', 'Send the pre-filled message to join the bot'],
              ['3', 'Send any photo — results arrive in ~30 sec'],
            ].map(([n, text]) => (
              <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ width: 26, height: 26, borderRadius: '50%', flexShrink: 0, background: 'rgba(37,211,102,0.15)', border: '1px solid rgba(37,211,102,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: '0.82rem', color: '#25d366' }}>
                  {n}
                </span>
                <span style={{ color: 'rgba(255,255,255,0.72)', fontSize: '0.9rem' }}>{text}</span>
              </div>
            ))}
          </div>

          {/* CTA button */}
          <a
            href={JOIN_LINK}
            target="_blank"
            rel="noreferrer"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: '#25d366', color: '#fff', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: '1.05rem', letterSpacing: '0.04em', padding: '13px 28px', borderRadius: 10, textDecoration: 'none', boxShadow: '0 4px 24px rgba(37,211,102,0.35)', transition: 'transform 0.15s, box-shadow 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(37,211,102,0.45)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 24px rgba(37,211,102,0.35)'; }}
          >
            <WhatsAppIcon />
            Try the WhatsApp Bot
          </a>

          <p style={{ marginTop: 12, fontSize: '0.75rem', color: 'rgba(255,255,255,0.32)' }}>
            Free · No signup · Works on any WhatsApp
          </p>
        </div>

        {/* Right — mock chat bubble card */}
        <div style={{ flex: '1 1 260px', display: 'flex', justifyContent: 'center', minWidth: 0 }}>
          <div style={{ background: 'rgba(13,26,16,0.9)', border: '1px solid rgba(26,92,26,0.4)', borderRadius: 18, padding: 24, width: '100%', maxWidth: 300, boxShadow: '0 12px 48px rgba(0,0,0,0.4)' }}>
            {/* Chat header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, paddingBottom: 14, borderBottom: '1px solid rgba(26,92,26,0.25)' }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#25d366', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <WhatsAppIcon />
              </div>
              <div>
                <p style={{ color: '#fff', fontWeight: 700, fontSize: '0.88rem', margin: 0 }}>SportShield Bot</p>
                <p style={{ color: '#25d366', fontSize: '0.72rem', margin: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#25d366', display: 'inline-block' }} />
                  Online
                </p>
              </div>
            </div>

            {/* Messages */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {/* User sends photo */}
              <div style={{ alignSelf: 'flex-end', background: '#005c4b', borderRadius: '10px 10px 2px 10px', padding: '8px 12px', maxWidth: '80%' }}>
                <p style={{ color: '#fff', fontSize: '0.78rem', margin: 0, display: 'flex', alignItems: 'center', gap: 5 }}>
                  <CameraIcon /> sports photo
                </p>
                <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.64rem', margin: '4px 0 0', textAlign: 'right' }}>2:27 pm ✓✓</p>
              </div>

              {/* Bot scanning reply */}
              <div style={{ alignSelf: 'flex-start', background: 'rgba(26,92,26,0.35)', borderRadius: '10px 10px 10px 2px', padding: '8px 12px', maxWidth: '85%' }}>
                <p style={{ color: '#fff', fontSize: '0.78rem', margin: 0, display: 'flex', alignItems: 'center', gap: 5 }}>
                  <ScanIcon /> <strong>Scanning your image...</strong>
                </p>
                <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem', margin: '3px 0 0' }}>Results in ~30 seconds.</p>
                <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.64rem', margin: '4px 0 0' }}>2:27 pm</p>
              </div>

              {/* Bot result */}
              <div style={{ alignSelf: 'flex-start', background: 'rgba(26,92,26,0.35)', borderRadius: '10px 10px 10px 2px', padding: '8px 12px', maxWidth: '85%' }}>
                <p style={{ color: '#fff', fontSize: '0.78rem', margin: 0, lineHeight: 1.7 }}>
                  <strong>Scan Results</strong><br/>
                  Found <strong>3 match(es)</strong><br/>
                  <span style={{ color: '#f87171' }}>&#9679;</span> 91% — site1.com<br/>
                  <span style={{ color: '#fbbf24' }}>&#9679;</span> 74% — site2.net<br/>
                  <span style={{ color: '#4ade80' }}>&#10003;</span> Authentic image
                </p>
                <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.64rem', margin: '4px 0 0' }}>2:28 pm</p>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Manual instructions */}
      <div style={{ maxWidth: 900, margin: '32px auto 0', textAlign: 'center' }}>
        <p style={{ color: 'rgba(255,255,255,0.28)', fontSize: '0.78rem' }}>
          Or open WhatsApp manually → add <strong style={{ color: 'rgba(255,255,255,0.45)' }}>{WA_NUMBER}</strong> as a contact → send{' '}
          <code style={{ background: 'rgba(37,211,102,0.1)', color: '#25d366', padding: '2px 7px', borderRadius: 4 }}>{JOIN_WORD}</code>
        </p>
      </div>
    </section>
  );
}
