import { useState, useEffect, useRef } from 'react';
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

function toDate(val) {
  if (!val) return new Date();
  if (val.seconds) return new Date(val.seconds * 1000);
  if (val.toDate) return val.toDate();
  return new Date(val);
}

export default function ReportsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const isDemo = router.query.demo === 'true';

  const [report, setReport] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const fetched = useRef(false);

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
    if (!user || fetched.current) return;
    fetched.current = true;
    Promise.all([
      fetch(`${API}/api/reports/latest?user_id=${user.uid}`).then(r => r.ok ? r.json() : null),
      fetch(`${API}/api/reports/history?user_id=${user.uid}`).then(r => r.ok ? r.json() : []),
    ]).then(([latest, hist]) => {
      if (latest) setReport(latest);
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

  const handleDownload = async () => {
    if (!report) return;
    try {
      const { jsPDF } = await import('jspdf');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const W = 210;
      const periodStartStr = format(new Date(toDate(report.periodStart)), 'MMM d, yyyy');
      const periodEndStr = format(new Date(toDate(report.periodEnd)), 'MMM d, yyyy');
      const sc = s?.protectionScoreCurrent || 0;
      const diff = s ? s.protectionScoreCurrent - s.protectionScorePrevious : 0;

      // Green header band
      pdf.setFillColor(26, 92, 26);
      pdf.rect(0, 0, W, 42, 'F');

      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(74, 222, 128);
      pdf.text('SPORTSHIELD', 14, 14);

      pdf.setFontSize(20);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(255, 255, 255);
      pdf.text('Weekly Protection Report', 14, 26);

      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(180, 220, 180);
      pdf.text(`${periodStartStr}  —  ${periodEndStr}`, 14, 36);

      let y = 54;

      // Stats row
      const stats = [
        { label: 'MATCHES', value: String(s?.newMatches || 0), r: 248, g: 113, b: 113 },
        { label: 'ALERTS', value: String(s?.alertsTriggered || 0), r: 251, g: 191, b: 36 },
        { label: 'DMCA ACTIONS', value: String(s?.dmcaActionsTaken || 0), r: 74, g: 222, b: 128 },
        { label: 'ASSETS SCANNED', value: String(s?.assetsScanned || 0), r: 52, g: 211, b: 153 },
      ];
      const boxW = (W - 28 - 12) / 4;
      stats.forEach((st, i) => {
        const x = 14 + i * (boxW + 4);
        pdf.setFillColor(12, 24, 14);
        pdf.roundedRect(x, y, boxW, 22, 2, 2, 'F');
        pdf.setFontSize(18);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(st.r, st.g, st.b);
        pdf.text(st.value, x + boxW / 2, y + 12, { align: 'center' });
        pdf.setFontSize(6);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(160, 160, 160);
        pdf.text(st.label, x + boxW / 2, y + 19, { align: 'center' });
      });
      y += 30;

      // Protection score
      pdf.setFillColor(12, 24, 14);
      pdf.roundedRect(14, y, W - 28, 18, 2, 2, 'F');
      const scR = sc >= 80 ? 74 : sc >= 50 ? 245 : 239;
      const scG = sc >= 80 ? 222 : sc >= 50 ? 158 : 68;
      const scB = sc >= 80 ? 128 : sc >= 50 ? 11 : 68;
      pdf.setFontSize(20);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(scR, scG, scB);
      pdf.text(String(sc), 22, y + 13);
      pdf.setFontSize(9);
      pdf.setTextColor(160, 160, 160);
      pdf.text('/ 100', 38, y + 13);
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(255, 255, 255);
      pdf.text('Protection Score', 60, y + 10);
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(diff >= 0 ? 74 : 248, diff >= 0 ? 222 : 113, diff >= 0 ? 128 : 113);
      pdf.text(`${diff >= 0 ? '+' : ''}${diff} from last week (${s?.protectionScorePrevious || 0})`, 60, y + 16);
      y += 26;

      // AI Summary
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(255, 255, 255);
      pdf.text('AI Summary', 14, y);
      y += 6;
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(180, 180, 180);
      const narrativeLines = pdf.splitTextToSize(report.narrative || 'No summary available.', W - 28);
      pdf.text(narrativeLines, 14, y);
      y += narrativeLines.length * 4.5 + 8;

      // Top Alerts table
      const alerts = report.topAlerts || [];
      if (alerts.length > 0) {
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(255, 255, 255);
        pdf.text('Top Alerts This Week', 14, y);
        y += 7;

        // Table header
        pdf.setFillColor(12, 24, 14);
        pdf.rect(14, y, W - 28, 8, 'F');
        pdf.setFontSize(7);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(160, 160, 160);
        pdf.text('ASSET', 16, y + 5.5);
        pdf.text('SEVERITY', 70, y + 5.5);
        pdf.text('FOUND URL', 100, y + 5.5);
        pdf.text('CONF', 180, y + 5.5);
        y += 10;

        alerts.forEach(ta => {
          if (y > 270) { pdf.addPage(); y = 20; }
          pdf.setFontSize(8);
          pdf.setFont('helvetica', 'normal');
          pdf.setTextColor(220, 220, 220);
          pdf.text((ta.assetName || 'Unknown').substring(0, 30), 16, y);
          const sevColor = ta.severity === 'high' ? [239, 68, 68] : [251, 191, 36];
          pdf.setTextColor(...sevColor);
          pdf.setFont('helvetica', 'bold');
          pdf.text((ta.severity || 'medium').toUpperCase(), 70, y);
          pdf.setFont('helvetica', 'normal');
          pdf.setTextColor(96, 165, 250);
          pdf.text((ta.foundUrl || '').substring(0, 45), 100, y);
          const conf = Math.round((ta.confidence || 0) * 100);
          pdf.setTextColor(conf >= 80 ? 239 : 251, conf >= 80 ? 68 : 191, conf >= 80 ? 68 : 36);
          pdf.setFont('helvetica', 'bold');
          pdf.text(`${conf}%`, 182, y);
          y += 7;
        });
        y += 4;
      }

      // Footer
      pdf.setDrawColor(26, 58, 26);
      pdf.setLineWidth(0.3);
      pdf.line(14, 280, W - 14, 280);
      pdf.setFontSize(7);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(130, 130, 130);
      pdf.text('Generated by SportShield — AI-Powered Sports Media Protection', W / 2, 286, { align: 'center' });
      pdf.text(`Downloaded on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, W / 2, 291, { align: 'center' });

      pdf.save(`SportShield-Report-${format(new Date(toDate(report.periodEnd)), 'yyyy-MM-dd')}.pdf`);
    } catch (err) {
      console.error('PDF generation failed:', err);
      alert('Failed to generate PDF. Please try again.');
    }
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
              <img src="/images/sportshield-logo-transparent.png" alt="SportShield" />
              <span className="ap-logo-text">SPORTSHIELD</span>
            </Link>
            <span className="ap-page-tag" style={{ marginLeft: 4 }}>/ Reports</span>
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
                  {format(new Date(toDate(report.periodStart)), 'MMM d')} — {format(new Date(toDate(report.periodEnd)), 'MMM d, yyyy')}
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
                          {format(new Date(toDate(r.periodStart)), 'MMM d')} — {format(new Date(toDate(r.periodEnd)), 'MMM d, yyyy')}
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
