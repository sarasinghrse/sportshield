import { useState } from 'react';
import Link from 'next/link';
import Head from 'next/head';

export default function ContactPage() {
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', message: '' });

  const handleSubmit = (e) => {
    e.preventDefault();
    // In a real app this would POST to an API — for now just show success
    setSent(true);
  };

  return (
    <>
      <Head><title>Contact — SportShield</title></Head>
      <div style={{ fontFamily: 'var(--font-body, sans-serif)', background: 'var(--white, #fff)', minHeight: '100vh' }}>
        {/* Nav */}
        <nav style={{ borderBottom: '2px solid #1a5c1a', padding: '0 40px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/" style={{ fontFamily: 'var(--font-display, sans-serif)', fontWeight: 800, fontSize: '1.4rem', color: '#1a5c1a', textDecoration: 'none', letterSpacing: '0.04em' }}>
            SPORTSHIELD
          </Link>
          <Link href="/signup" style={{ background: '#1a5c1a', color: '#fff', fontWeight: 700, fontSize: '0.85rem', padding: '9px 20px', borderRadius: 6, textDecoration: 'none' }}>
            Get Started Free
          </Link>
        </nav>

        {/* Hero */}
        <section style={{ background: '#c8e6c8', padding: '60px 40px', textAlign: 'center' }}>
          <h1 style={{ fontFamily: 'var(--font-display, sans-serif)', fontWeight: 900, fontSize: 'clamp(2rem, 5vw, 3.5rem)', color: '#111a11', marginBottom: 16 }}>
            Contact Us
          </h1>
          <p style={{ fontSize: '1.05rem', color: '#4a5c4a', maxWidth: 480, margin: '0 auto' }}>
            Got a question about SportShield? We'd love to hear from you.
          </p>
        </section>

        {/* Form + info */}
        <section style={{ maxWidth: 900, margin: '0 auto', padding: '80px 40px', display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 64, alignItems: 'start' }}>
          {/* Info */}
          <div>
            <p style={{ fontSize: '0.85rem', fontWeight: 700, letterSpacing: '0.14em', color: '#8fa08f', textTransform: 'uppercase', marginBottom: 24 }}>GET IN TOUCH</p>
            {[
              { icon: '📧', label: 'Email', value: 'anshurajwork@gmail.com' },
              { icon: '🌐', label: 'Website', value: 'sportshield-rouge.vercel.app' },
              { icon: '📍', label: 'Built for', value: 'Google Solutions Challenge 2026' },
            ].map(item => (
              <div key={item.label} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 28 }}>
                <span style={{ fontSize: '1.4rem', marginTop: 2 }}>{item.icon}</span>
                <div>
                  <p style={{ fontWeight: 700, fontSize: '0.9rem', color: '#111a11', marginBottom: 2 }}>{item.label}</p>
                  <p style={{ fontSize: '0.85rem', color: '#4a5c4a' }}>{item.value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Form */}
          <div style={{ background: '#f8faf8', borderRadius: 16, padding: 40, border: '1px solid #d4dbd4' }}>
            {sent ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ fontSize: '3rem', marginBottom: 16 }}>✅</div>
                <h3 style={{ fontWeight: 700, fontSize: '1.1rem', color: '#111a11', marginBottom: 8 }}>Message sent!</h3>
                <p style={{ fontSize: '0.9rem', color: '#4a5c4a' }}>We'll get back to you soon.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {[
                  { label: 'Your name', key: 'name', type: 'text', placeholder: 'John Smith' },
                  { label: 'Email address', key: 'email', type: 'email', placeholder: 'john@example.com' },
                ].map(f => (
                  <div key={f.key}>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#4a5c4a', marginBottom: 6 }}>{f.label}</label>
                    <input
                      type={f.type}
                      required
                      placeholder={f.placeholder}
                      value={form[f.key]}
                      onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                      style={{ width: '100%', background: '#fff', border: '1.5px solid #d4dbd4', borderRadius: 8, padding: '10px 14px', fontSize: '0.9rem', color: '#111a11', outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>
                ))}
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#4a5c4a', marginBottom: 6 }}>Message</label>
                  <textarea
                    required
                    rows={5}
                    placeholder="How can we help?"
                    value={form.message}
                    onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
                    style={{ width: '100%', background: '#fff', border: '1.5px solid #d4dbd4', borderRadius: 8, padding: '10px 14px', fontSize: '0.9rem', color: '#111a11', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
                <button type="submit" style={{ background: '#1a5c1a', color: '#fff', fontWeight: 700, fontSize: '0.9rem', padding: '12px 28px', borderRadius: 8, border: 'none', cursor: 'pointer' }}>
                  Send Message
                </button>
              </form>
            )}
          </div>
        </section>

        {/* Footer */}
        <footer style={{ background: '#111a11', padding: '24px 40px', textAlign: 'center' }}>
          <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.3)' }}>
            © 2026 SportShield · <Link href="/" style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>Home</Link> · <Link href="/about" style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>About</Link>
          </p>
        </footer>
      </div>
    </>
  );
}
