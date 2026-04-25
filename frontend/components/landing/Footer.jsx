// components/landing/Footer.jsx
import Link from 'next/link';

const TEAM = [
  {
    name:     'Sara Singh',
    email:    '20singhsara@gmail.com',
    linkedin: 'https://www.linkedin.com/in/sara-singh-574673267/',
  },
  {
    name:     'Anshu Raj',
    email:    'anshurajwork@gmail.com',
    linkedin: 'https://www.linkedin.com/in/anshu-raj-142b55253/',
  },
  {
    name:     'Amit Singh',
    email:    'amitksingh3022@gmail.com',
    linkedin: 'https://www.linkedin.com/in/amit-singh-58101928a/',
  },
];

const GITHUB = 'https://github.com/sarasinghrse/sportshield';

const LinkedInIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
  </svg>
);

const GitHubIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
  </svg>
);

const featLinks = [
  { label: 'Monitor',     href: '/dashboard' },
  { label: 'Detect',      href: '/dashboard' },
  { label: 'DMCA Notice', href: '/dashboard' },
  { label: 'Certificate', href: '/dashboard' },
  { label: 'Analytics',   href: '/analytics' },
  { label: 'Verify URL',  href: '/verify'    },
  { label: 'Community',   href: '/public-dashboard' },
];

const aboutLinks = [
  { label: 'About Us',   href: '/about'   },
  { label: 'Contact',    href: '/contact' },
];

export default function Footer() {
  return (
    <footer className="ss-footer">
      <div className="ss-footer-grid">

        {/* Brand */}
        <div className="ss-footer-brand">
          <Link href="/landing" className="ss-footer-logo">
            <img src="/images/sportshield-logo-transparent.png" alt="SportShield" />
            <span className="ss-footer-logo-text">SPORTSHIELD</span>
          </Link>
          <p className="ss-footer-tagline">
            Find and fight sport theft. Take control of where and how your sports
            media is used with SportShield's AI-powered scanning and legal tools.
          </p>

          {/* Social icons — LinkedIn × 3 + GitHub */}
          <div className="ss-footer-social">
            {TEAM.map(m => (
              <a key={m.name} href={m.linkedin} target="_blank" rel="noreferrer" title={`${m.name} on LinkedIn`}>
                <LinkedInIcon />
              </a>
            ))}
            <a href={GITHUB} target="_blank" rel="noreferrer" title="SportShield on GitHub">
              <GitHubIcon />
            </a>
          </div>

          <div className="ss-footer-btns">
            <Link href="/signup" className="ss-footer-btn-signup">Sign Up</Link>
            <Link href="/login"  className="ss-footer-btn-login">Login</Link>
          </div>
        </div>

        {/* Features */}
        <div className="ss-footer-col">
          <h4>Features</h4>
          {featLinks.map(l => (
            <Link href={l.href} key={l.label}>{l.label}</Link>
          ))}
        </div>

        {/* About */}
        <div className="ss-footer-col">
          <h4>Project</h4>
          {aboutLinks.map(l => (
            <Link href={l.href} key={l.label}>{l.label}</Link>
          ))}
          <a href={GITHUB} target="_blank" rel="noreferrer">GitHub ↗</a>
          <a href="https://developers.google.com/community/gdsc" target="_blank" rel="noreferrer">
            Google Solutions Challenge ↗
          </a>
        </div>

        {/* Team */}
        <div className="ss-footer-col">
          <h4>Team</h4>
          {TEAM.map(m => (
            <div key={m.name} style={{ marginBottom: 16 }}>
              <div style={{ color: 'rgba(255,255,255,0.82)', fontWeight: 600, fontSize: '0.85rem', marginBottom: 4 }}>
                {m.name}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <a href={`mailto:${m.email}`} className="ss-footer-col a"
                  style={{ fontSize: '0.8rem' }}>
                  {m.email}
                </a>
                <a href={m.linkedin} target="_blank" rel="noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.8rem' }}>
                  <LinkedInIcon /> LinkedIn ↗
                </a>
              </div>
            </div>
          ))}
        </div>

      </div>

      <div className="ss-footer-bottom">
        <span>© {new Date().getFullYear()} SportShield — Google Solutions Challenge 2026</span>
        <a href={GITHUB} target="_blank" rel="noreferrer"
          style={{ color: 'inherit', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
          <GitHubIcon /> sarasinghrse/sportshield
        </a>
      </div>
    </footer>
  );
}
