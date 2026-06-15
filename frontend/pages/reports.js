import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';
import { format } from 'date-fns';
import { useAuth } from '../lib/useAuth';
import ProfileAvatar from '../components/ProfileAvatar';
import MobileNav from '../components/MobileNav';
import Footer from '../components/landing/Footer';
import { DEMO_REPORT } from '../lib/demoData';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function ReportsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const isDemo = router.query.demo === 'true';

  const [report, setReport] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (!isDemo && !authLoading && !user) router.replace('/login');
  }, [user, authLoading, isDemo]);

  useEffect(() => {
    if (isDemo) {
      setReport(DEMO_REPORT);
      setHistory([DEMO_REPORT]);
      setLoading(false);
      return;
    }
    if (!user) return;
    Promise.all([
      fetch(`${API}/api/reports/latest?user_id=${user.uid}`).then(r => r.ok ? r.json() : null),
      fetch(`${API}/api/reports/history?user_id=${user.uid}`).then(r => r.ok ? r.json() : []),
    ]).then(([latest, hist]) => {
      setReport(latest);
      setHistory(hist || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [user, isDemo]);

  const handleGenerate = async () => {
    if (generating || isDemo) return;
    setGenerating(true);
    try {
      const res = await fetch(`${API}/api/reports/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.uid }),
      });
      if (res.ok) {
        const newReport = await res.json();
        setReport(newReport);
        setHistory(prev => [newReport, ...prev]);
      }
    } catch {} finally { setGenerating(false); }
  };

  const s = report?.stats;
  const scoreColor = s?.protectionScoreCurrent >= 80 ? '#4ade80' : s?.protectionScoreCurrent >= 50 ? '#f59e0b' : '#ef4444';
  const scoreDiff = s ? s.protectionScoreCurrent - s.protectionScorePrevious : 0;

  const handleDownload = () => {
    if (!report) return;
    const periodStartStr = format(new Date(report.periodStart?.seconds ? report.periodStart.toDate() : report.periodStart), 'MMM d, yyyy');
    const periodEndStr = format(new Date(report.periodEnd?.seconds ? report.periodEnd.toDate() : report.periodEnd), 'MMM d, yyyy');
    const sc = s?.protectionScoreCurrent || 0;
    const scColor = sc >= 80 ? '#4ade80' : sc >= 50 ? '#f59e0b' : '#ef4444';
    const diff = s ? s.protectionScoreCurrent - s.protectionScorePrevious : 0;
    const alertRows = (report.topAlerts || []).map(ta => `
      <tr>
        <td style="padding:10px 14px;border-bottom:1px solid #1a3a1a;">${ta.assetName}</td>
        <td style="padding:10px 14px;border-bottom:1px solid #1a3a1a;">
          <span style="display:inline-block;padding:3px 10px;border-radius:6px;font-size:0.75rem;font-weight:700;text-transform:uppercase;
            background:${ta.severity === 'high' ? 'rgba(239,68,68,0.15)' : 'rgba(251,191,36,0.15)'};
            color:${ta.severity === 'high' ? '#ef4444' : '#f59e0b'};">${ta.severity}</span>
        </td>
        <td style="padding:10px 14px;border-bottom:1px solid #1a3a1a;color:#60a5fa;word-break:break-all;">${ta.foundUrl}</td>
        <td style="padding:10px 14px;border-bottom:1px solid #1a3a1a;font-weight:700;color:${Math.round(ta.confidence * 100) >= 80 ? '#ef4444' : '#f59e0b'};">${Math.round(ta.confidence * 100)}%</td>
      </tr>`).join('');

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>SportShield Protection Report - ${periodEndStr}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #080f09; color: #e0e0e0; padding: 40px 24px; }
  .container { max-width: 800px; margin: 0 auto; }
  .header { text-align: center; margin-bottom: 36px; padding-bottom: 24px; border-bottom: 1px solid #1a3a1a; }
  .header h1 { font-size: 1.8rem; color: #fff; margin-bottom: 4px; }
  .header .period { font-size: 0.9rem; color: rgba(255,255,255,0.5); }
  .header .brand { font-size: 0.75rem; color: #4ade80; text-transform: uppercase; letter-spacing: 0.12em; margin-bottom: 8px; }
  .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 28px; }
  .stat-card { background: rgba(12,24,14,0.7); border: 1px solid #1a3a1a; border-radius: 12px; padding: 18px 14px; text-align: center; }
  .stat-value { font-size: 2rem; font-weight: 900; line-height: 1; margin-bottom: 4px; }
  .stat-label { font-size: 0.72rem; color: rgba(255,255,255,0.4); text-transform: uppercase; letter-spacing: 0.06em; font-weight: 600; }
  .score-card { background: rgba(12,24,14,0.7); border: 1px solid #1a3a1a; border-radius: 12px; padding: 22px 24px; margin-bottom: 28px; display: flex; align-items: center; gap: 20px; }
  .score-value { font-size: 2.4rem; font-weight: 900; }
  .score-max { font-size: 0.85rem; color: rgba(255,255,255,0.4); }
  .section { background: rgba(12,24,14,0.7); border: 1px solid #1a3a1a; border-radius: 12px; padding: 24px; margin-bottom: 28px; }
  .section h3 { font-size: 1.05rem; color: #fff; margin-bottom: 14px; font-weight: 800; }
  .narrative { color: rgba(255,255,255,0.7); font-size: 0.9rem; line-height: 1.75; white-space: pre-line; }
  table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
  th { text-align: left; padding: 10px 14px; color: rgba(255,255,255,0.4); font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.06em; border-bottom: 1px solid #1a3a1a; }
  .footer { text-align: center; margin-top: 36px; padding-top: 20px; border-top: 1px solid #1a3a1a; font-size: 0.78rem; color: rgba(255,255,255,0.3); }
  @media (max-width: 600px) { .stats-grid { grid-template-columns: repeat(2, 1fr); } }
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <div class="brand">SportShield</div>
    <h1>Weekly Protection Report</h1>
    <p class="period">${periodStartStr} &mdash; ${periodEndStr}</p>
  </div>
  <div class="stats-grid">
    <div class="stat-card"><div class="stat-value" style="color:#f87171;">${s?.newMatches || 0}</div><div class="stat-label">Matches Found</div></div>
    <div class="stat-card"><div class="stat-value" style="color:#fbbf24;">${s?.alertsTriggered || 0}</div><div class="stat-label">Alerts Triggered</div></div>
    <div class="stat-card"><div class="stat-value" style="color:#4ade80;">${s?.dmcaActionsTaken || 0}</div><div class="stat-label">DMCA Actions</div></div>
    <div class="stat-card"><div class="stat-value" style="color:#34d399;">${s?.assetsScanned || 0}</div><div class="stat-label">Assets Scanned</div></div>
  </div>
  <div class="score-card">
    <div><span class="score-value" style="color:${scColor};">${sc}</span> <span class="score-max">/ 100</span></div>
    <div>
      <p style="font-weight:800;color:#fff;margin-bottom:2px;">Protection Score</p>
      <p style="font-size:0.82rem;color:${diff >= 0 ? '#4ade80' : '#f87171'};">${diff >= 0 ? '&#8593;' : '&#8595;'} ${Math.abs(diff)} from last week (${s?.protectionScorePrevious || 0})</p>
    </div>
  </div>
  <div class="section">
    <h3>AI Summary</h3>
    <p class="narrative">${(report.narrative || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
  </div>
  ${alertRows ? `<div class="section">
    <h3>Top Alerts This Week</h3>
    <table><thead><tr><th>Asset</th><th>Severity</th><th>Found URL</th><th>Confidence</th></tr></thead><tbody>${alertRows}</tbody></table>
  </div>` : ''}
  <div class="footer">
    <p>Generated by SportShield &mdash; AI-Powered Sports Media Protection</p>
    <p style="margin-top:4px;">Report downloaded on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
  </div>
</div>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sportshield-report-${format(new Date(report.periodEnd?.seconds ? report.periodEnd.toDate() : report.periodEnd), 'yyyy-MM-dd')}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <Head><title>Reports — SportShield</title></Head>
      <div className="ap-root">
        <nav className="ap-nav">
          <div className="ap-nav-left">
            <Link href="/" className="ap-back">← Dashboard</Link>
            <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.1)' }} />
            <Link href="/" className="ap-logo">
              <img src="/images/sportshield-logo-transparent.png" alt="" style={{ height: 28 }} />
              <span>SPORTSHIELD</span>
            </Link>
          </div>
          <div className="ap-nav-right">
            <ProfileAvatar />
            <MobileNav />
          </div>
        </nav>

        <main style={{ maxWidth: 900, margin: '0 auto', padding: '40px 24px' }}>
          {isDemo && (
            <div style={{ background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.3)', borderRadius: 10, padding: '10px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '0.78rem', color: '#4ade80', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Demo Mode</span>
                <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)' }}>— Sample report data</span>
              </div>
              <Link href="/reports" style={{ fontSize: '0.78rem', color: '#4ade80', fontWeight: 700, textDecoration: 'none' }}>Exit Demo ×</Link>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
            <div>
              <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '1.8rem', color: '#fff', marginBottom: 4 }}>
                Weekly Protection Report
              </h1>
              {report && (
                <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.4)' }}>
                  {format(new Date(report.periodStart?.seconds ? report.periodStart.toDate() : report.periodStart), 'MMM d')} — {format(new Date(report.periodEnd?.seconds ? report.periodEnd.toDate() : report.periodEnd), 'MMM d, yyyy')}
                </p>
              )}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              {report && (
                <button onClick={handleDownload} className="ap-btn ap-btn-ghost" style={{ padding: '10px 20px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  Download Report
                </button>
              )}
              <button onClick={handleGenerate} disabled={generating || isDemo} className="ap-btn ap-btn-green" style={{ padding: '10px 20px', fontSize: '0.85rem', opacity: generating || isDemo ? 0.5 : 1 }}>
                {generating ? 'Generating...' : 'Generate New Report'}
              </button>
            </div>
          </div>

          {loading ? (
            <div className="ap-card" style={{ padding: 48, textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>Loading...</div>
          ) : !report ? (
            <div className="ap-card" style={{ padding: 56, textAlign: 'center' }}>
              <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'center' }}>
                <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="rgba(74,222,128,0.4)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
                </svg>
              </div>
              <p style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.2rem', color: '#fff', marginBottom: 8 }}>No reports yet</p>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.88rem', marginBottom: 24 }}>Generate your first weekly protection report to see insights about your assets.</p>
              <button onClick={handleGenerate} disabled={generating} className="ap-btn ap-btn-green" style={{ padding: '12px 28px' }}>
                {generating ? 'Generating...' : 'Generate First Report'}
              </button>
            </div>
          ) : (
            <>
              {/* Stats Grid */}
              <div className="grid-4" style={{ gap: 14, marginBottom: 24 }}>
                {[
                  { label: 'Matches Found', value: s.newMatches, color: '#f87171' },
                  { label: 'Alerts Triggered', value: s.alertsTriggered, color: '#fbbf24' },
                  { label: 'DMCA Actions', value: s.dmcaActionsTaken, color: '#4ade80' },
                  { label: 'Assets Scanned', value: s.assetsScanned, color: '#34d399' },
                ].map(item => (
                  <div key={item.label} className="ap-card" style={{ padding: '18px 16px', textAlign: 'center' }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '2.2rem', color: item.color, lineHeight: 1, marginBottom: 4 }}>
                      {item.value}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{item.label}</div>
                  </div>
                ))}
              </div>

              {/* Protection Score */}
              <div className="ap-card" style={{ padding: '20px 24px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 20 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '2.4rem', color: scoreColor }}>{s.protectionScoreCurrent}</span>
                  <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.4)' }}>/ 100</span>
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1rem', color: '#fff', marginBottom: 2 }}>Protection Score</p>
                  <p style={{ fontSize: '0.82rem', color: scoreDiff >= 0 ? '#4ade80' : '#f87171' }}>
                    {scoreDiff >= 0 ? '↑' : '↓'} {Math.abs(scoreDiff)} from last week ({s.protectionScorePrevious})
                  </p>
                </div>
              </div>

              {/* Narrative */}
              <div className="ap-card" style={{ padding: '24px', marginBottom: 24 }}>
                <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.05rem', color: '#fff', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                  AI Summary
                  <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', fontWeight: 500, fontFamily: 'var(--font-body)' }}>Powered by Google Gemini</span>
                </h3>
                <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', lineHeight: 1.75, whiteSpace: 'pre-line' }}>
                  {report.narrative}
                </p>
              </div>

              {/* Top Alerts */}
              {report.topAlerts?.length > 0 && (
                <div className="ap-card" style={{ padding: '20px 24px', marginBottom: 24 }}>
                  <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.05rem', color: '#fff', marginBottom: 14 }}>Top Alerts This Week</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {report.topAlerts.map((ta, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'rgba(26,92,26,0.08)', borderRadius: 8, border: '1px solid rgba(26,92,26,0.15)' }}>
                        <span className={`ap-badge ${ta.severity === 'high' ? 'ap-badge-high' : 'ap-badge-medium'}`} style={{ textTransform: 'uppercase', flexShrink: 0 }}>{ta.severity}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: '0.82rem', color: '#fff', fontWeight: 600, marginBottom: 2 }}>{ta.assetName}</p>
                          <p style={{ fontSize: '0.75rem', color: '#60a5fa', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ta.foundUrl}</p>
                        </div>
                        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '0.85rem', color: Math.round(ta.confidence * 100) >= 80 ? '#ef4444' : '#f59e0b' }}>
                          {Math.round(ta.confidence * 100)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* History */}
              {history.length > 1 && (
                <div className="ap-card" style={{ padding: '20px 24px' }}>
                  <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.05rem', color: '#fff', marginBottom: 14 }}>Past Reports</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {history.slice(1).map((r, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'rgba(26,92,26,0.06)', borderRadius: 8 }}>
                        <span style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.6)' }}>
                          {format(new Date(r.periodStart?.seconds ? r.periodStart.toDate() : r.periodStart), 'MMM d')} — {format(new Date(r.periodEnd?.seconds ? r.periodEnd.toDate() : r.periodEnd), 'MMM d, yyyy')}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: '0.78rem' }}>
                          <span style={{ color: 'rgba(255,255,255,0.35)' }}>{r.stats?.alertsTriggered || 0} alerts</span>
                          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, color: r.stats?.protectionScoreCurrent >= 80 ? '#4ade80' : r.stats?.protectionScoreCurrent >= 50 ? '#f59e0b' : '#ef4444' }}>
                            Score: {r.stats?.protectionScoreCurrent || 0}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </main>
        <Footer />
      </div>
    </>
  );
}
