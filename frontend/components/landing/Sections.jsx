import Link from 'next/link';
import { useState } from 'react';

/* ── CTA Banner ─────────────────────────────────────── */
export function CTABanner() {
  return (
    <div className="ss-cta-banner">
      <img
        src="/images/cta-banner.jpg"
        alt="Sports stadium"
        className="ss-cta-banner-bg"
      />
      <div className="ss-cta-banner-content">
        <h2>
          Start protecting your sports media in{' '}
          <span>less than 5 minutes</span>
        </h2>
        <Link href="/signup" className="ss-cta-btn">
          Get Started For Free
        </Link>
      </div>
    </div>
  );
}

/* ── Mission ─────────────────────────────────────────── */
export function Mission() {
  return (
    <section className="ss-mission">
      <div className="ss-max" style={{ maxWidth: 780 }}>
        <h2>Our Mission</h2>
        <p className="ss-mission-tagline">
          We <strong>fight</strong> for the rights of sports creators!
        </p>
        <p>
          Our mission is to empower sports photographers, videographers, broadcasters,
          and media companies to take control of how, where, and when their work is used.
          We provide a suite of tools and services to find, manage, and resolve cases of
          unauthorized use. SportShield ensures easy, low-risk access to legal support
          and fair compensation. We take complicated copyright and intellectual property
          law and make it easy and accessible to everyone.
        </p>
        <Link href="/about" className="ss-mission-btn">About Us</Link>
      </div>
    </section>
  );
}

/* ── More Info ──────────────────────────────────────── */
const moreItems = [
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="ss-more-icon">
        <path d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10l6 6v8a2 2 0 01-2 2z" />
        <polyline points="17 21 17 13 7 13 7 21" />
        <polyline points="7 3 7 8 15 8" />
      </svg>
    ),
    title: 'SportShield News',
    desc:  'Keep up-to-date with the latest features, updates, announcements and press releases from the SportShield team.',
    link:  '#',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="ss-more-icon">
        <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
      </svg>
    ),
    title: 'Resources',
    desc:  'Sports photography, video IP, copyright law, and DMCA guides. Our blog covers news, tutorials, and stories from our community.',
    link:  '#',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="ss-more-icon">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0110 0v4" />
      </svg>
    ),
    title: 'Protected by SportShield',
    desc:  'Mark your site, portfolio, or gallery to let potential users know your media is actively protected with advanced scanning.',
    link:  '#',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="ss-more-icon">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
        <polyline points="22,6 12,13 2,6" />
      </svg>
    ),
    title: 'Contact Us',
    desc:  'Need to know more? Our team of experts are available to answer any enquiry about your media protection needs.',
    link:  '/contact',
  },
];

export function MoreInfo() {
  return (
    <section className="ss-section ss-more-info">
      <div className="ss-max">
        <h2>More Information</h2>
        <div className="ss-more-grid">
          {moreItems.map(item => (
            <div className="ss-more-item" key={item.title}>
              {item.icon}
              <h3>{item.title}</h3>
              <p>{item.desc}</p>
              <Link href={item.link} className="ss-more-link">
                Learn More ›
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── FAQ ────────────────────────────────────────────── */
const faqs = [
  {
    q: 'How much does it cost?',
    a: 'You can monitor up to 50 assets for free, forever! To monitor more, choose a monthly plan. Submitting a case for resolution is free — we only charge a 30% fee if we successfully recover compensation for you.',
  },
  {
    q: 'Is SportShield a law firm?',
    a: 'No. SportShield is a software and media licensing company. When you submit a case to SportShield, you authorize us as your licensing agent. We have a network of copyright attorneys who will represent you when needed.',
  },
  {
    q: 'How do I get started?',
    a: 'Simply sign up for a free account, upload your first sports image or video, and SportShield will begin scanning the web for matches within minutes. No credit card required.',
  },
  {
    q: 'Who uses SportShield?',
    a: 'Sports photographers, videographers, news agencies, sports broadcasters, clubs, federations, and individual athletes who want to protect their visual media IP.',
  },
  {
    q: 'Who is SportShield?',
    a: 'SportShield was built as a Google Solutions Challenge 2026 project by Sara and Anshu — two developers passionate about protecting the rights of sports creators worldwide. Est. 2026.',
  },
  {
    q: 'Why is SportShield better than other services?',
    a: 'We are built specifically for sports media — understanding the unique distribution patterns of sports content across social platforms, news sites, and live streams. Our pHash technology handles even heavily modified copies.',
  },
];

export function FAQ() {
  const [open, setOpen] = useState({});
  const toggle = (i) => setOpen(p => ({ ...p, [i]: !p[i] }));

  return (
    <section className="ss-section ss-faq">
      <div className="ss-max">
        <span className="ss-faq-tag ss-section-tag">FAQS</span>
        <h2>Frequently Asked Questions</h2>
        <p className="ss-faq-sub">
          Learn more about how SportShield can help monitor &amp; protect your sports media,
          and enforce your copyrights worldwide.
        </p>

        <div className="ss-faq-grid">
          {faqs.map((faq, i) => (
            <div className="ss-faq-item" key={i}>
              <div
                className="ss-faq-question"
                onClick={() => toggle(i)}
                role="button"
                tabIndex={0}
                onKeyDown={e => e.key === 'Enter' && toggle(i)}
              >
                {faq.q}
                <span className="ss-faq-toggle">{open[i] ? '×' : '+'}</span>
              </div>
              {open[i] && (
                <p className="ss-faq-answer">{faq.a}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
