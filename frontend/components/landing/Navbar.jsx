// components/landing/Navbar.jsx
import Link from 'next/link';
import { useState } from 'react';

const featuresMenu = [
  { icon: '🌐', bg: '#237523', label: 'Monitor',     desc: 'Track where your media is used',    href: '/dashboard' },
  { icon: '⚡', bg: '#b45309', label: 'Detect',      desc: 'AI-powered violation detection',     href: '/dashboard' },
  { icon: '📄', bg: '#dc2626', label: 'DMCA Notice', desc: 'Issue takedown notices globally',    href: '/dashboard' },
  { icon: '🏅', bg: '#7c3aed', label: 'Certificate', desc: 'Prove your media ownership',         href: '/dashboard' },
  { icon: '📊', bg: '#0369a1', label: 'Analytics',   desc: 'Deep violation insights & trends',   href: '/analytics' },
];

const resourcesMenu = [
  { icon: '📰', label: 'All Articles',     desc: 'Tips, guides & sports IP news',     href: '#' },
  { icon: '©️',  label: 'Copyright Guide', desc: 'Sports copyright made easy',         href: '#' },
  { icon: '🛡️', label: 'IP Protection',   desc: 'How to protect your sports media',   href: '#' },
  { icon: '📢', label: 'Takedown Guides', desc: 'Step-by-step DMCA walkthrough',      href: '#' },
  { icon: '⚖️', label: 'Image Licensing', desc: 'Licensing 101 — from legal to tips', href: '#' },
];

export default function Navbar() {
  // mobileOpen kept for future mobile menu — not yet wired to UI
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="ss-nav">
      {/* Logo */}
      <Link href="/" className="ss-nav-logo">
        <img src="/images/sportshield-logo.png" alt="SportShield" style={{ height: 36, width: 'auto' }} />
        <span className="ss-nav-logo-text">SPORTSHIELD</span>
      </Link>

      {/* Nav Links */}
      <ul className="ss-nav-links">
        {/* Features dropdown */}
        <li>
          <button type="button">Features ▾</button>
          <div className="ss-dropdown">
            {featuresMenu.map(item => (
              <Link key={item.label} href={item.href} className="ss-dropdown-item">
                <div className="ss-dropdown-icon" style={{ background: item.bg }}>
                  {item.icon}
                </div>
                <div>
                  <div className="ss-dropdown-label">{item.label}</div>
                  <div className="ss-dropdown-desc">{item.desc}</div>
                </div>
              </Link>
            ))}
          </div>
        </li>

        {/* Resources dropdown */}
        <li>
          <button type="button">Resources ▾</button>
          <div className="ss-dropdown">
            {resourcesMenu.map(item => (
              <Link key={item.label} href={item.href} className="ss-dropdown-item">
                <div className="ss-dropdown-icon" style={{ background: '#2d3748' }}>
                  {item.icon}
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

      {/* CTA Buttons — FIXED: removed wrong className="ss-nav-links" from Login link */}
      <div className="ss-nav-actions">
        <Link href="/login" className="ss-btn-login">Login</Link>
        <Link href="/signup" className="ss-btn-signup">Sign Up</Link>
      </div>
    </nav>
  );
}