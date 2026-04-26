import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Navbar from '../components/landing/Navbar';
import Footer from '../components/landing/Footer';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const TEAM_CONTACTS = [
  { icon: <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><path d='M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z'/><polyline points='22,6 12,13 2,6'/></svg>, label: 'General',  value: 'anshurajwork@gmail.com',     href: 'mailto:anshurajwork@gmail.com' },
  { icon: <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><circle cx='12' cy='12' r='10'/><line x1='2' y1='12' x2='22' y2='12'/><path d='M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z'/></svg>, label: 'Website',  value: 'sportshield-rouge.vercel.app', href: 'https://sportshield-rouge.vercel.app' },
  { icon: <svg width='16' height='16' viewBox='0 0 24 24' fill='currentColor'><path d='M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z'/></svg>, label: 'GitHub',   value: 'sarasinghrse/sportshield',    href: 'https://github.com/sarasinghrse/sportshield' },
  { icon: <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><path d='M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z'/><circle cx='12' cy='10' r='3'/></svg>, label: 'Built for', value: 'Google Solutions Challenge 2026', href: null },
];

export default function ContactPage() {
  const [sent,    setSent]    = useState(false);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [form,    setForm]    = useState({ name: '', email: '', subject: 'General Enquiry', message: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/api/contact/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.ok) {
        setSent(true);
      } else {
        setError(data.error || 'Failed to send message. Please try emailing us directly.');
      }
    } catch {
      setError('Network error — please email us directly at anshurajwork@gmail.com');
    } finally {
      setLoading(false);
    }
  };

  const field = (key) => (e) => setForm(p => ({ ...p, [key]: e.target.value }));

  return (
    <>
      <Head><title>Contact — SportShield</title></Head>
      <Navbar />

      <div className="ap-root" style={{ paddingTop: 64 }}>

        {/* ── Hero ── */}
        <section style={{ background: 'linear-gradient(135deg,#0a1710,#0d2010)', padding: 'clamp(56px,7vw,88px) 24px', textAlign: 'center', borderBottom: '1px solid rgba(26,92,26,0.2)' }}>
          <h1 className="ap-heading" style={{ fontSize: 'clamp(2rem,5vw,3.2rem)', marginBottom: 14 }}>
            Get in <span style={{ color: '#4ade80' }}>Touch</span>
          </h1>
          <p className="ap-muted" style={{ maxWidth: 480, margin: '0 auto', fontSize: '1rem', lineHeight: 1.75 }}>
            Got a question about SportShield, a partnership idea, or want to report an issue? We'd love to hear from you.
          </p>
        </section>

        {/* ── Contact grid ── */}
        <section style={{ maxWidth: 960, margin: '0 auto', padding: 'clamp(48px,6vw,80px) 24px' }}>
          <div className="info-grid-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: 48, alignItems: 'start' }}>

            {/* ── Left: contact info ── */}
            <div>
              <p style={{ fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.14em', color: 'rgba(74,222,128,0.7)', textTransform: 'uppercase', marginBottom: 24 }}>CONTACT INFO</p>

              {TEAM_CONTACTS.map(item => (
                <div key={item.label} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 24 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 8, background: 'rgba(26,92,26,0.25)', border: '1px solid rgba(26,92,26,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', flexShrink: 0 }}>
                    {item.icon}
                  </div>
                  <div>
                    <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3 }}>{item.label}</p>
                    {item.href ? (
                      <a href={item.href} target={item.href.startsWith('http') ? '_blank' : undefined} rel="noreferrer"
                        style={{ fontSize: '0.9rem', color: '#4ade80', textDecoration: 'none', fontWeight: 500 }}>
                        {item.value}
                      </a>
                    ) : (
                      <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.75)', fontWeight: 500 }}>{item.value}</p>
                    )}
                  </div>
                </div>
              ))}

              {/* Social links */}
              <div style={{ marginTop: 8 }}>
                <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>TEAM LINKEDIN</p>
                {[
                  { name: 'Sara Singh',  href: 'https://www.linkedin.com/in/sara-singh-574673267/'  },
                  { name: 'Anshu Raj',   href: 'https://www.linkedin.com/in/anshu-raj-142b55253/'   },
                  { name: 'Amit Singh',  href: 'https://www.linkedin.com/in/amit-singh-58101928a/'  },
                ].map(m => (
                  <a key={m.name} href={m.href} target="_blank" rel="noreferrer"
                    style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, color: '#60a5fa', fontSize: '0.85rem', textDecoration: 'none' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                    {m.name} ↗
                  </a>
                ))}
              </div>
            </div>

            {/* ── Right: form ── */}
            <div className="ap-card" style={{ padding: 'clamp(24px,4vw,40px)' }}>
              {sent ? (
                <div style={{ textAlign: 'center', padding: '32px 0' }}>
                  <div style={{ marginBottom: 16, display:"flex", justifyContent:"center" }}><svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></div>
                  <h3 className="ap-subheading" style={{ marginBottom: 10 }}>Message sent!</h3>
                  <p className="ap-muted">We'll get back to you at <strong style={{ color: '#fff' }}>{form.email}</strong> soon.</p>
                  <button onClick={() => { setSent(false); setForm({ name: '', email: '', subject: 'General Enquiry', message: '' }); }}
                    className="ap-btn ap-btn-ghost" style={{ marginTop: 24 }}>Send another</button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                  <h3 className="ap-section-title" style={{ marginBottom: 4 }}>Send us a message</h3>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Name</label>
                      <input type="text" required placeholder="Your name" value={form.name}
                        onChange={field('name')} className="ap-input" />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Email</label>
                      <input type="email" required placeholder="you@example.com" value={form.email}
                        onChange={field('email')} className="ap-input" />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Subject</label>
                    <select value={form.subject} onChange={field('subject')} className="ap-select" style={{ width: '100%', padding: '12px 16px' }}>
                      <option>General Enquiry</option>
                      <option>Report a Bug</option>
                      <option>Partnership / Collaboration</option>
                      <option>DMCA / Legal</option>
                      <option>Feature Request</option>
                      <option>Other</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Message</label>
                    <textarea required rows={5} placeholder="How can we help?" value={form.message}
                      onChange={field('message')} className="ap-input" style={{ resize: 'vertical', minHeight: 120 }} />
                  </div>

                  {error && (
                    <p style={{ fontSize: '0.82rem', color: '#f87171', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '10px 14px' }}>
                      {error}
                    </p>
                  )}

                  <button type="submit" disabled={loading} className="ap-btn ap-btn-green"
                    style={{ justifyContent: 'center', padding: '13px', fontSize: '0.9rem' }}>
                    {loading ? 'Sending…' : 'Send Message →'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </section>

        {/* ── FAQ mini ── */}
        <section style={{ background: 'rgba(10,23,12,0.6)', borderTop: '1px solid rgba(26,92,26,0.2)', padding: 'clamp(40px,5vw,64px) 24px' }}>
          <div style={{ maxWidth: 680, margin: '0 auto' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.6rem', color: '#fff', textAlign: 'center', marginBottom: 32 }}>
              Common questions
            </h2>
            {[
              { q: 'Is SportShield free?', a: 'Yes — SportShield is free for the Google Solutions Challenge 2026 demo. Paid tiers will be introduced when we scale.' },
              { q: 'How accurate is the image matching?', a: 'We use perceptual hashing (pHash) combined with Google reverse-image search. Results depend on the SerpAPI plan, but the system catches even cropped/resized copies.' },
              { q: 'Can I send DMCA notices?', a: 'Yes. After a violation is detected, head to the alert detail page and click "Send DMCA Notice". We generate the notice automatically.' },
              { q: 'Does it work for videos?', a: 'Video upload and storage works. Frame-level video fingerprinting is on our roadmap for v2.' },
            ].map(item => (
              <div key={item.q} style={{ padding: '18px 0', borderBottom: '1px solid rgba(26,92,26,0.18)' }}>
                <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem', color: '#fff', marginBottom: 8 }}>{item.q}</p>
                <p className="ap-muted" style={{ lineHeight: 1.7 }}>{item.a}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <Footer />
    </>
  );
}
