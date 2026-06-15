import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';

export default function MobileNav() {
  const [open, setOpen] = useState(false);
  const { pathname } = useRouter();

  const links = [
    { href: '/', label: 'Dashboard' },
    { href: '/radar', label: 'Live Radar' },
    { href: '/public-dashboard', label: 'Community' },
    { href: '/analytics', label: 'Analytics' },
    { href: '/reports', label: 'Reports' },
    { href: '/alerts', label: 'Alerts' },
    { href: '/settings', label: 'Settings' },
    { href: '/upload', label: '+ Upload Asset', cta: true },
  ];

  return (
    <>
      <button
        className="ap-hamburger"
        onClick={() => setOpen(v => !v)}
        aria-label="Menu"
      >
        {open ? '✕' : '☰'}
      </button>

      {open && (
        <div className="ap-mobile-menu">
          {links.map(l => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className={
                (l.cta ? 'ap-mobile-menu-cta' : '') +
                (pathname === l.href ? ' ap-mobile-menu-active' : '')
              }
            >
              {l.label}
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
