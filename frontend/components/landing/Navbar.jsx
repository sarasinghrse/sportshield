// components/landing/Navbar.jsx
import Link from 'next/link';
import { useState } from 'react';

const featuresMenu = [
  { icon: '🌐', bg: '#237523', label: 'Monitor',      desc: 'Track where your media is used',    href: '/features#monitor'   },
  { icon: '⚡', bg: '#b45309', label: 'Detect',       desc: 'AI-powered violation detection',    href: '/features#detect'    },
  { icon: '📄', bg: '#dc2626', label: 'DMCA Notice',  desc: 'Issue takedown notices globally',   href: '/features#dmca'      },
  { icon: '🏅', bg: '#7c3aed', label: 'Certificate',  desc: 'Prove your media ownership',        href: '/features#cert'      },
  { icon: '📊', bg: '#0369a1', label: 'Analytics',    desc: 'Deep violation insights & trends',  href: '/features#analytics' },
  { icon: '🤖', bg: '#6d28d9', label: 'AI Detection', desc: 'Spot AI-generated images instantly',href: '/features#ai-detect' },
  { icon: '📱', bg: '#0891b2', label: 'Social Scan',  desc: 'Scan Instagram & Twitter posts',    href: '/features#social'    },
];

const resourcesMenu = [
  { icon: '📰', label: 'All Articles',     desc: 'Tips, guides & sports IP news',     href: '/resources#articles'  },
  { icon: '©️',  label: 'Copyright Guide', desc: 'Sports copyright made easy',         href: '/resources#copyright' },
  { icon: '🛡️', label: 'IP Protection',   desc: 'How to protect your sports media',   href: '/resources#ip'        },
  { icon: '📢', label: 'Takedown Guides', desc: 'Step-by-step DMCA walkthrough',      href: '/resources#takedown'  },
  { icon: '⚖️', label: 'Image Licensing', desc: 'Licensing 101 — from legal to tips', href: '/resources#licensing' },
  { icon: '🔍', label: 'Verify a URL',    desc: 'Check if a URL hosts stolen media',  href: '/verify'              },
];

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <nav className="ss-nav">
        {/* Logo */}
        <Link href="/landing" className="ss-nav-logo">
          <img src="/images/sportshield-logo-transparent.png" alt="SportShield" style={{ height: 36, width: 'auto' }} />
          <span className="ss-nav-logo-text">SPORTSHIELD</span>
        </Link>

        {/* Desktop Nav Links */}
        <ul className="ss-nav-links">
          <li>
            <button type="button">Features ▾</button>
            <div className="ss-dropdown">
              {featuresMenu.map(item => (
                <Link key={item.label} href={item.href} className="ss-dropdown-item">
                  <div className="ss-dropdown-icon" style={{ background: item.bg }}>{item.icon}</div>
                  <div>
                    <div className="ss-dropdown-label">{item.label}</div>
                    <div className="ss-dropdown-desc">{item.desc}</div>
                  </div>
                </Link>
              ))}
              <Link href="/features" className="ss-dropdown-item" style={{ borderTop: '1px solid rgba(26,92,26,0.2)', marginTop: 8 }}>
                <div className="ss-dropdown-icon" style={{ background: '#166534' }}>✦</div>
                <div>
                  <div className="ss-dropdown-label">All Features →</div>
                  <div className="ss-dropdown-desc">See everything SportShield can do</div>
                </div>
              </Link>
            </div>
          </li>

          <li>
            <button type="button">Resources ▾</button>
            <div className="ss-dropdown">
              {resourcesMenu.map(item => (
                <Link key={item.label} href={item.href} className="ss-dropdown-item">
                  <div className="ss-dropdown-icon" style={{ background: '#2d3748' }}>{item.icon}</div>
                  <div>
                    <div className="ss-dropdown-label">{item.label}</div>
                    <div className="ss-dropdown-desc">{item.desc}</div>
                  </div>
                </Link>
              ))}
            </div>
          </li>

          <li><Link href="/public-dashboard">Community</Link></li>
          <li><Link href="/about">About</Link></li>
          <li><Link href="/contact">Contact</Link></li>
        </ul>

        {/* Desktop CTA */}
        <div className="ss-nav-actions">
          <Link href="/login"  className="ss-btn-login">Login</Link>
          <Link href="/signup" className="ss-btn-signup">Sign Up</Link>
        </div>

        {/* Mobile hamburger */}
        <button
          className="ss-nav-hamburger"
          onClick={() => setMobileOpen(o => !o)}
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
        >
          {mobileOpen ? '✕' : '☰'}
        </button>
      </nav>

      {/* Mobile overlay menu */}
      <div className={`ss-nav-mobile${mobileOpen ? ' open' : ''}`}>
        <Link href="/features"         onClick={() => setMobileOpen(false)}>Features</Link>
        <Link href="/resources"        onClick={() => setMobileOpen(false)}>Resources</Link>
        <Link href="/public-dashboard" onClick={() => setMobileOpen(false)}>Community</Link>
        <Link href="/verify"           onClick={() => setMobileOpen(false)}>Verify URL</Link>
        <Link href="/about"            onClick={() => setMobileOpen(false)}>About</Link>
        <Link href="/contact"          onClick={() => setMobileOpen(false)}>Contact</Link>
        <Link href="/login"            onClick={() => setMobileOpen(false)}>Login</Link>
        <Link href="/signup" className="mobile-cta" onClick={() => setMobileOpen(false)}>Sign Up Free</Link>
      </div>
    </>
  );
}
