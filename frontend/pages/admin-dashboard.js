import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import Footer from '../components/landing/Footer';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function AdminDashboard() {
  const router = useRouter();
  const [auth, setAuth] = useState(null);
  const [tab, setTab] = useState('messages');
  const [messages, setMessages] = useState([]);
  const [healthResults, setHealthResults] = useState([]);
  const [userStats, setUserStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [healthLoading, setHealthLoading] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem('adminAuth');
    if (!stored) { router.push('/login'); return; }
    const creds = JSON.parse(stored);
    fetch(`${API_URL}/api/admin/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(creds),
    }).then(r => {
      if (!r.ok) { sessionStorage.removeItem('adminAuth'); router.push('/login'); return; }
      setAuth(creds);
    }).catch(() => { router.push('/login'); });
  }, []);

  useEffect(() => {
    if (!auth) return;
    loadMessages();
    loadUserStats();
  }, [auth]);

  async function loadMessages() {
    try {
      const res = await fetch(`${API_URL}/api/admin/messages`);
      const data = await res.json();
      if (data.ok) setMessages(data.messages);
    } catch {} finally { setLoading(false); }
  }

  async function markRead(id) {
    await fetch(`${API_URL}/api/admin/messages/${id}/read`, { method: 'POST' });
    setMessages(prev => prev.map(m => m.id === id ? { ...m, read: true } : m));
  }

  async function runHealthCheck() {
    setHealthLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/health-check`);
      const data = await res.json();
      if (data.ok) setHealthResults(data.results);
    } catch {} finally { setHealthLoading(false); }
  }

  async function loadUserStats() {
    try {
      const res = await fetch(`${API_URL}/api/admin/user-stats`);
      const data = await res.json();
      if (data.ok) setUserStats(data.stats);
    } catch {}
  }

  if (!auth) return null;

  const unreadCount = messages.filter(m => !m.read).length;

  return (
    <>
      <Head><title>Admin Dashboard — SportShield</title></Head>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;800;900&family=Barlow:wght@400;500;600&display=swap');
        .adm-root {
          min-height: 100vh; background: #0a1210; color: #d4e8d4;
          font-family: 'Barlow', sans-serif;
        }
        .adm-nav {
          position: sticky; top: 0; z-index: 50;
          background: rgba(10,18,12,0.96); backdrop-filter: blur(12px);
          border-bottom: 1px solid rgba(26,92,26,0.4);
          padding: 0 24px; display: flex; align-items: center; height: 56px; gap: 20px;
        }
        .adm-nav-logo {
          display: flex; align-items: center; gap: 8px; text-decoration: none; color: #fff;
          font-family: 'Barlow Condensed', sans-serif; font-weight: 900; font-size: 1.1rem;
        }
        .adm-tab {
          background: none; border: none; color: rgba(255,255,255,0.45);
          font-family: 'Barlow', sans-serif; font-size: 0.85rem; font-weight: 600;
          cursor: pointer; padding: 8px 14px; border-radius: 8px; transition: all 0.2s;
        }
        .adm-tab:hover { color: #fff; background: rgba(26,92,26,0.2); }
        .adm-tab.active { color: #4ade80; background: rgba(26,92,26,0.3); }
        .adm-card {
          background: rgba(13,26,16,0.85); border: 1px solid rgba(26,92,26,0.35);
          border-radius: 14px; padding: 24px;
        }
        .adm-badge {
          display: inline-flex; align-items: center; justify-content: center;
          min-width: 18px; height: 18px; border-radius: 9px;
          background: #ef4444; color: #fff; font-size: 0.68rem; font-weight: 700;
          padding: 0 5px; margin-left: 6px;
        }
        .adm-msg-row {
          padding: 16px 0; border-bottom: 1px solid rgba(26,92,26,0.15);
          display: flex; gap: 16px; align-items: flex-start;
        }
        .adm-msg-row:last-child { border-bottom: none; }
        .adm-stat-card {
          background: rgba(26,92,26,0.15); border: 1px solid rgba(26,92,26,0.3);
          border-radius: 12px; padding: 24px; text-align: center;
        }
        .adm-stat-num {
          font-family: 'Barlow Condensed', sans-serif; font-weight: 900;
          font-size: 2.4rem; color: #4ade80;
        }
        .adm-health-row {
          display: flex; align-items: center; gap: 12px;
          padding: 12px 0; border-bottom: 1px solid rgba(26,92,26,0.15);
        }
        .adm-health-row:last-child { border-bottom: none; }
        .adm-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
      `}</style>

      <div className="adm-root">
        <nav className="adm-nav">
          <Link href="/landing" className="adm-nav-logo">
            <img src="/images/sportshield-logo-transparent.png" alt="" style={{ height: 28 }} />
            SPORTSHIELD
          </Link>
          <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.8rem' }}>Admin</span>
          <div style={{ flex: 1 }} />
          <button className={`adm-tab${tab === 'messages' ? ' active' : ''}`} onClick={() => setTab('messages')}>
            Messages {unreadCount > 0 && <span className="adm-badge">{unreadCount}</span>}
          </button>
          <button className={`adm-tab${tab === 'health' ? ' active' : ''}`} onClick={() => { setTab('health'); if (!healthResults.length) runHealthCheck(); }}>
            Health Check
          </button>
          <button className={`adm-tab${tab === 'stats' ? ' active' : ''}`} onClick={() => setTab('stats')}>
            User Stats
          </button>
          <button
            onClick={() => { sessionStorage.removeItem('adminAuth'); router.push('/login'); }}
            style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', borderRadius: 8, padding: '6px 14px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', fontFamily: "'Barlow', sans-serif" }}>
            Logout
          </button>
        </nav>

        <main style={{ maxWidth: 960, margin: '0 auto', padding: '32px 24px' }}>

          {/* Messages Tab */}
          {tab === 'messages' && (
            <div>
              <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: '1.6rem', color: '#fff', marginBottom: 20 }}>
                Contact Messages
                {unreadCount > 0 && <span style={{ color: '#4ade80', fontSize: '1rem', fontWeight: 600, marginLeft: 10 }}>{unreadCount} unread</span>}
              </h2>
              {loading ? (
                <p style={{ color: 'rgba(255,255,255,0.4)' }}>Loading messages...</p>
              ) : messages.length === 0 ? (
                <div className="adm-card" style={{ textAlign: 'center', padding: 48 }}>
                  <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem' }}>No messages yet.</p>
                </div>
              ) : (
                <div className="adm-card">
                  {messages.map(m => (
                    <div key={m.id} className="adm-msg-row" style={{ opacity: m.read ? 0.6 : 1 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: m.read ? 'rgba(255,255,255,0.15)' : '#4ade80', marginTop: 6, flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', gap: 12, alignItems: 'baseline', marginBottom: 4, flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 700, color: '#fff', fontSize: '0.9rem' }}>{m.name}</span>
                          <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.35)' }}>{m.email}</span>
                          <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.2)', marginLeft: 'auto' }}>
                            {m.createdAt ? new Date(m.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                          </span>
                        </div>
                        <p style={{ fontSize: '0.78rem', color: '#4ade80', fontWeight: 600, marginBottom: 4 }}>{m.subject}</p>
                        <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{m.message}</p>
                        {!m.read && (
                          <button onClick={() => markRead(m.id)}
                            style={{ marginTop: 8, background: 'rgba(26,92,26,0.2)', border: '1px solid rgba(26,92,26,0.4)', color: '#4ade80', borderRadius: 6, padding: '4px 12px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', fontFamily: "'Barlow', sans-serif" }}>
                            Mark as read
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Health Check Tab */}
          {tab === 'health' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
                <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: '1.6rem', color: '#fff' }}>
                  Endpoint Health Check
                </h2>
                <button onClick={runHealthCheck} disabled={healthLoading}
                  style={{ background: 'rgba(26,92,26,0.25)', border: '1px solid rgba(26,92,26,0.5)', color: '#4ade80', borderRadius: 8, padding: '6px 16px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', fontFamily: "'Barlow', sans-serif" }}>
                  {healthLoading ? 'Scanning...' : 'Run Scan'}
                </button>
              </div>
              {healthResults.length === 0 ? (
                <div className="adm-card" style={{ textAlign: 'center', padding: 48 }}>
                  <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem' }}>Click "Run Scan" to check endpoints.</p>
                </div>
              ) : (
                <div className="adm-card">
                  {healthResults.map(r => (
                    <div key={r.endpoint} className="adm-health-row">
                      <div className="adm-dot" style={{ background: r.ok ? '#4ade80' : '#ef4444' }} />
                      <span style={{ fontFamily: "'Courier New', monospace", fontSize: '0.85rem', color: '#fff', flex: 1 }}>{r.endpoint}</span>
                      <span style={{ fontSize: '0.78rem', color: r.ok ? '#4ade80' : '#f87171', fontWeight: 600 }}>
                        {r.ok ? `${r.status} OK` : `${r.status || 'ERR'} FAIL`}
                      </span>
                      {r.latency_ms != null && (
                        <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.3)', minWidth: 60, textAlign: 'right' }}>
                          {r.latency_ms}ms
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* User Stats Tab */}
          {tab === 'stats' && (
            <div>
              <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: '1.6rem', color: '#fff', marginBottom: 20 }}>
                User Statistics
              </h2>
              {!userStats ? (
                <p style={{ color: 'rgba(255,255,255,0.4)' }}>Loading stats...</p>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                  <div className="adm-stat-card">
                    <div className="adm-stat-num">{userStats.totalUsers}</div>
                    <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', marginTop: 6 }}>Total Users</p>
                  </div>
                  <div className="adm-stat-card">
                    <div className="adm-stat-num">{userStats.totalAssets}</div>
                    <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', marginTop: 6 }}>Protected Assets</p>
                  </div>
                  <div className="adm-stat-card">
                    <div className="adm-stat-num">{userStats.totalAlerts}</div>
                    <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', marginTop: 6 }}>Total Alerts</p>
                  </div>
                </div>
              )}
            </div>
          )}

        </main>
      </div>

      <Footer />
    </>
  );
}
