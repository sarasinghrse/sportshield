import { useState } from 'react';
import Link from 'next/link';

const testimonials = [
  [
    {
      quote: "SportShield lets me take advantage of IP expertise I don't have and gives me real support when dealing with unauthorized use of my sports photography around the globe. Found 14 violations in the first week.",
      name: 'Alex Rivera',
      loc:  'Los Angeles, USA',
      avatar: '/images/avatar-1.jpg',
    },
    {
      quote: "My experience with SportShield has been genuinely rewarding. Easy to use, and the DMCA generator saved me hours. If you value your sports media rights, you should be using this platform.",
      name: 'Jordan Kim',
      loc:  'Melbourne, Australia',
      avatar: '/images/avatar-2.jpg',
    },
  ],
  [
    {
      quote: "As a sports broadcaster covering regional leagues, protecting our highlight clips was a nightmare. SportShield automated everything — we recovered licensing fees we'd never have found ourselves.",
      name: 'Priya Sharma',
      loc:  'Mumbai, India',
      avatar: '/images/avatar-1.jpg',
    },
    {
      quote: "The pHash fingerprinting is incredible. Even heavily cropped or recolored versions of our match photos get flagged. The certificate feature is a bonus for proving ownership in disputes.",
      name: 'Marcus Webb',
      loc:  'London, UK',
      avatar: '/images/avatar-2.jpg',
    },
  ],
];

export default function Community() {
  const [page, setPage] = useState(0);
  const current = testimonials[page] || testimonials[0];

  return (
    <section className="ss-section ss-community">
      <div className="ss-max">
        <div className="ss-community-header">
          <div>
            <h2 className="ss-community-title">Growing Community</h2>
            <p className="ss-community-subtitle">
              Over 10,000 sports creators from 60+ countries trust SportShield
            </p>
          </div>
          <div className="ss-community-nav">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              aria-label="Previous">‹</button>
            <button
              onClick={() => setPage(p => Math.min(testimonials.length - 1, p + 1))}
              aria-label="Next">›</button>
          </div>
        </div>

        <div className="ss-testimonials">
          {current.map((t) => (
            <div className="ss-testimonial" key={t.name}>
              <blockquote>"{t.quote}"</blockquote>
              <div className="ss-testimonial-author">
                <img src={t.avatar} alt={t.name} className="ss-testimonial-avatar" />
                <div>
                  <div className="ss-testimonial-name">{t.name}</div>
                  <div className="ss-testimonial-loc">{t.loc}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="ss-community-cta">
          <Link href="/signup">Read More from Our Community</Link>
        </div>
      </div>
    </section>
  );
}
