// components/landing/Navbar.jsx
import Link from 'next/link';
import { useState } from 'react';

/* ── Inline SVG icons (no emoji) ─────────────────────────────── */
const IconGlobe     = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>;
const IconBolt      = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>;
const IconDoc       = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>;
const IconMedal     = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/></svg>;
const IconChart     = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>;
const IconRobot     = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4"/><line x1="8" y1="16" x2="8" y2="16"/><line x1="16" y1="16" x2="16" y2="16"/></svg>;
const IconPhone     = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>;
const IconNewspaper = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a4 4 0 0 1-4 4zm0 0a4 4 0 0 1-4-4V6a2 2 0 0 1 2-2h2"/><line x1="16" y1="8" x2="10" y2="8"/><line x1="16" y1="12" x2="10" y2="12"/></svg>;
const IconShield    = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
const IconMegaphone = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11l19-9-9 19-2-8-8-2z"/></svg>;
const IconScale     = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="3" x2="12" y2="20"/><path d="M5 6.5h14M8 20h8"/></svg>;
const IconSearch    = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;
const IconStar      = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>;
const HamburgerIcon = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>;
const CloseIcon     = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;

const featuresMenu = [
  { Icon: IconGlobe,  bg: '#237523', label: 'Monitor',      desc: 'Track where your media is used',    href: '/features#monitor'   },
  { Icon: IconBolt,   bg: '#b45309', label: 'Detect',       desc: 'AI-powered violation detection',    href: '/features#detect'    },
  { Icon: IconDoc,    bg: '#dc2626', label: 'DMCA Notice',  desc: 'Issue takedown notices globally',   href: '/features#dmca'      },
  { Icon: IconMedal,  bg: '#7c3aed', label: 'Certificate',  desc: 'Prove your media ownership',        href: '/features#cert'      },
  { Icon: IconChart,  bg: '#0369a1', label: 'Analytics',    desc: 'Deep violation insights & trends',  href: '/features#analytics' },
  { Icon: IconRobot,  bg: '#6d28d9', label: 'AI Detection', desc: 'Spot AI-generated images instantly',href: '/features#ai-detect' },
  { Icon: IconPhone,  bg: '#0891b2', label: 'Social Scan',  desc: 'Scan Instagram & Twitter posts',    href: '/features#social'    },
];

const resourcesMenu = [
  { Icon: IconNewspaper, label: 'All Articles',    desc: 'Tips, guides & sports IP news',     href: '/resources#articles'  },
  { Icon: IconDoc,       label: 'Copyright Guide', desc: 'Sports copyright made easy',         href: '/resources#copyright' },
  { Icon: IconShield,    label: 'IP Protection',   desc: 'How to protect your sports media',   href: '/resources#ip'        },
  { Icon: IconMegaphone, label: 'Takedown Guides', desc: 'Step-by-step DMCA walkthrough',      href: '/resources#takedown'  },
  { Icon: IconScale,     label: 'Image Licensing', desc: 'Licensing 101 — from legal to tips', href: '/resources#licensing' },
  { Icon: IconSearch,    label: 'Verify a URL',    desc: 'Check if a URL hosts stolen media',  href: '/verify'              },
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
            <Link href="/features">Features ▾</Link>
            <div className="ss-dropdown">
              {featuresMenu.map(item => (
                <Link key={item.label} href={item.href} className="ss-dropdown-item">
                  <div className="ss-dropdown-icon" style={{ background: item.bg, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <item.Icon />
                  </div>
                  <div>
                    <div className="ss-dropdown-label">{item.label}</div>
                    <div className="ss-dropdown-desc">{item.desc}</div>
                  </div>
                </Link>
              ))}
              <Link href="/features" className="ss-dropdown-item" style={{ borderTop: '1px solid rgba(26,92,26,0.2)', marginTop: 8 }}>
                <div className="ss-dropdown-icon" style={{ background: '#166534', color: '#4ade80', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <IconStar />
                </div>
                <div>
                  <div className="ss-dropdown-label">All Features →</div>
                  <div className="ss-dropdown-desc">See everything SportShield can do</div>
                </div>
              </Link>
            </div>
          </li>

          <li>
            <Link href="/resources">Resources ▾</Link>
            <div className="ss-dropdown">
              {resourcesMenu.map(item => (
                <Link key={item.label} href={item.href} className="ss-dropdown-item">
                  <div className="ss-dropdown-icon" style={{ background: '#2d3748', color: '#9ca3af', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <item.Icon />
                  </div>
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
          {mobileOpen ? <CloseIcon /> : <HamburgerIcon />}
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
