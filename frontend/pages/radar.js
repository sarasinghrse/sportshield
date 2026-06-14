import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { useAuth } from '../lib/useAuth';
import ProfileAvatar from '../components/ProfileAvatar';
import Footer from '../components/landing/Footer';
import {
  DEMO_RADAR_STATS, DEMO_RADAR_EVENTS, DEMO_DETECTIONS,
  DEMO_ENFORCEMENT_STATS, DEMO_CASES,
  DEMO_CROWD_STATS, DEMO_LEADERBOARD,
} from '../lib/demoData';

const C = {
  bg:        '#0a1210',
  card:      'rgba(13,26,16,0.85)',
  cardBorder:'rgba(26,92,26,0.35)',
  navBg:     'rgba(10,18,12,0.96)',
  navBorder: 'rgba(26,92,26,0.4)',
  green:     '#1a5c1a',
  greenLight:'#3caa3c',
  text:      '#d4e8d4',
  muted:     'rgba(255,255,255,0.45)',
  heading:   '#ffffff',
  red:       '#ef4444',
  orange:    '#f59e0b',
  blue:      '#60a5fa',
  purple:    '#a78bfa',
};

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function RadarPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const isDemo = router.query.demo === 'true';

  const [tab, setTab] = useState('radar');
  const [stats, setStats] = useState(null);
  const [enforcementStats, setEnforcementStats] = useState(null);
  const [crowdStats, setCrowdStats] = useState(null);
  const [events, setEvents] = useState([]);
  const [detections, setDetections] = useState([]);
  const [cases, setCases] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [eventForm, setEventForm] = useState({ eventName: '', teams: '', broadcaster: '', league: '' });
  const [creating, setCreating] = useState(false);

  const [showSubmitSuspect, setShowSubmitSuspect] = useState(false);
  const [suspectFile, setSuspectFile] = useState(null);
  const [suspectEventId, setSuspectEventId] = useState('');
  const [suspectUrl, setSuspectUrl] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);

  const [showCrowdSubmit, setShowCrowdSubmit] = useState(false);
  const [crowdForm, setCrowdForm] = useState({ suspectUrl: '', eventName: '', description: '' });

  useEffect(() => {
    if (!router.isReady) return;
    if (isDemo) return;
    if (!authLoading && !user) router.replace('/landing');
  }, [user, authLoading, isDemo, router.isReady]);

  const fetchData = useCallback(async () => {
    if (isDemo) {
      setStats(DEMO_RADAR_STATS);
      setEvents(DEMO_RADAR_EVENTS);
      setDetections(DEMO_DETECTIONS);
      setEnforcementStats(DEMO_ENFORCEMENT_STATS);
      setCases(DEMO_CASES);
      setCrowdStats(DEMO_CROWD_STATS);
      setLeaderboard(DEMO_LEADERBOARD);
      setLoading(false);
      return;
    }
    let useDemo = false;
    try {
      const [statsRes, eventsRes, detectionsRes, enfRes, crowdRes, lbRes, casesRes] = await Promise.all([
        fetch(`${API}/api/media/radar/stats`).then(r => r.ok ? r.json() : null).catch(() => null),
        fetch(`${API}/api/media/radar/events`).then(r => r.ok ? r.json() : { events: [] }).catch(() => ({ events: [] })),
        fetch(`${API}/api/media/radar/detections`).then(r => r.ok ? r.json() : { detections: [] }).catch(() => ({ detections: [] })),
        fetch(`${API}/api/media/enforce/stats`).then(r => r.ok ? r.json() : null).catch(() => null),
        fetch(`${API}/api/media/crowd/stats`).then(r => r.ok ? r.json() : null).catch(() => null),
        fetch(`${API}/api/media/crowd/leaderboard?limit=10`).then(r => r.ok ? r.json() : { leaderboard: [] }).catch(() => ({ leaderboard: [] })),
        fetch(`${API}/api/media/enforce/cases`).then(r => r.ok ? r.json() : { cases: [] }).catch(() => ({ cases: [] })),
      ]);
      const liveEvents = eventsRes.events || [];
      const liveDet = detectionsRes.detections || [];
      const liveCases = casesRes.cases || [];
      const liveLb = lbRes.leaderboard || [];
      const isEmpty = !statsRes && liveEvents.length === 0 && liveDet.length === 0;
      if (isEmpty) {
        useDemo = true;
      } else {
        setStats(statsRes || DEMO_RADAR_STATS);
        setEvents(liveEvents.length > 0 ? liveEvents : DEMO_RADAR_EVENTS);
        setDetections(liveDet.length > 0 ? liveDet : DEMO_DETECTIONS);
        setEnforcementStats(enfRes || DEMO_ENFORCEMENT_STATS);
        setCrowdStats(crowdRes || DEMO_CROWD_STATS);
        setLeaderboard(liveLb.length > 0 ? liveLb : DEMO_LEADERBOARD);
        setCases(liveCases.length > 0 ? liveCases : DEMO_CASES);
      }
    } catch (e) {
      console.error(e);
      useDemo = true;
    }
    if (useDemo) {
      setStats(DEMO_RADAR_STATS);
      setEvents(DEMO_RADAR_EVENTS);
      setDetections(DEMO_DETECTIONS);
      setEnforcementStats(DEMO_ENFORCEMENT_STATS);
      setCases(DEMO_CASES);
      setCrowdStats(DEMO_CROWD_STATS);
      setLeaderboard(DEMO_LEADERBOARD);
    }
    setLoading(false);
  }, [isDemo]);

  useEffect(() => {
    if (!router.isReady) return;
    if (!isDemo && !user) return;
    fetchData();
  }, [fetchData, user, isDemo, router.isReady]);

  const createEvent = async () => {
    if (isDemo) {
      const newEvt = {
        event_id: `evt_demo_${Date.now()}`,
        event_name: eventForm.eventName,
        teams: eventForm.teams.split(',').map(t => t.trim()).filter(Boolean),
        broadcaster: eventForm.broadcaster,
        league: eventForm.league,
        status: 'monitoring',
        suspect_count: 0,
        detection_count: 0,
      };
      setEvents(prev => [newEvt, ...prev]);
      setStats(prev => prev ? { ...prev, active_events: (prev.active_events || 0) + 1 } : prev);
      setShowCreateEvent(false);
      setEventForm({ eventName: '', teams: '', broadcaster: '', league: '' });
      return;
    }
    setCreating(true);
    try {
      const res = await fetch(`${API}/api/media/radar/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventName: eventForm.eventName,
          teams: eventForm.teams.split(',').map(t => t.trim()).filter(Boolean),
          broadcaster: eventForm.broadcaster,
          league: eventForm.league,
        }),
      });
      if (res.ok) {
        setShowCreateEvent(false);
        setEventForm({ eventName: '', teams: '', broadcaster: '', league: '' });
        fetchData();
      }
    } catch (e) { console.error(e); }
    setCreating(false);
  };

  const submitSuspect = async () => {
    if (!suspectFile || !suspectEventId) return;
    if (isDemo) {
      setAnalysisResult({
        is_pirate: true,
        verdict: 'PIRATE_STREAM_DETECTED',
        composite_score: 0.89,
        audio_match: { score: 0.92 },
        visual_match: { score: 0.85 },
        multimodal: { signals: 4, total_signals: 5, skipped: false },
      });
      return;
    }
    setAnalyzing(true);
    setAnalysisResult(null);
    try {
      const fd = new FormData();
      fd.append('file', suspectFile);
      const url = `${API}/api/media/radar/events/${suspectEventId}/suspect?source_url=${encodeURIComponent(suspectUrl)}`;
      const res = await fetch(url, { method: 'POST', body: fd });
      const data = await res.json();
      setAnalysisResult(data);
      fetchData();
    } catch (e) { console.error(e); }
    setAnalyzing(false);
  };

  const fileDmca = async (caseId) => {
    if (isDemo) {
      setCases(prev => prev.map(c => c.case_id === caseId ? { ...c, status: 'dmca_filed' } : c));
      return;
    }
    await fetch(`${API}/api/media/enforce/cases/${caseId}/file`, { method: 'POST' });
    fetchData();
  };

  const escalateCase = async (caseId) => {
    if (isDemo) {
      setCases(prev => prev.map(c => c.case_id === caseId ? { ...c, status: 'escalated_isp', escalation_level: (c.escalation_level || 0) + 1 } : c));
      return;
    }
    await fetch(`${API}/api/media/enforce/cases/${caseId}/escalate`, { method: 'POST' });
    fetchData();
  };

  const submitCrowdReport = async () => {
    if (isDemo) {
      setShowCrowdSubmit(false);
      setCrowdForm({ suspectUrl: '', eventName: '', description: '' });
      setCrowdStats(prev => prev ? { ...prev, total_submissions: (prev.total_submissions || 0) + 1 } : prev);
      return;
    }
    try {
      await fetch(`${API}/api/media/crowd/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(crowdForm),
      });
      setShowCrowdSubmit(false);
      setCrowdForm({ suspectUrl: '', eventName: '', description: '' });
      fetchData();
    } catch (e) { console.error(e); }
  };

  if (!router.isReady || (authLoading && !isDemo)) return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: C.muted, fontFamily: 'Barlow, sans-serif' }}>Loading…</p>
    </div>
  );

  const tabs = [
    { id: 'radar',   label: 'Live Radar',   icon: '📡' },
    { id: 'enforce', label: 'Enforcement',  icon: '⚖️' },
    { id: 'crowd',   label: 'Crowd Network',icon: '👥' },
    { id: 'api',     label: 'Public API',   icon: '🔌' },
  ];

  return (
    <>
      <Head><title>War Room — SportShield</title></Head>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;800;900&family=Barlow:wght@400;500;600&display=swap');
        * { box-sizing: border-box; }
        body { margin: 0; background: ${C.bg}; }
        .wr-card { background: ${C.card}; border: 1px solid ${C.cardBorder}; border-radius: 12px; }
        .wr-stat-val { font-family: 'Barlow Condensed', sans-serif; font-weight: 900; font-size: 2.4rem; line-height: 1; }
        .wr-stat-label { font-family: 'Barlow', sans-serif; font-size: 0.72rem; color: ${C.muted}; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.06em; }
        .wr-section-title { font-family: 'Barlow Condensed', sans-serif; font-weight: 800; font-size: 1.15rem; color: ${C.heading}; }
        .wr-btn { font-family: 'Barlow Condensed', sans-serif; font-weight: 800; font-size: 0.82rem; letter-spacing: 0.04em; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; transition: opacity 0.2s; }
        .wr-btn:hover { opacity: 0.85; }
        .wr-btn-ghost { background: transparent; color: ${C.muted}; border: 1px solid ${C.cardBorder}; font-family: 'Barlow', sans-serif; font-weight: 600; font-size: 0.82rem; padding: 10px 20px; border-radius: 8px; cursor: pointer; }
        .wr-input { background: rgba(10,18,16,0.6); border: 1px solid rgba(26,92,26,0.35); border-radius: 8px; padding: 10px 14px; color: #d4e8d4; font-size: 0.85rem; outline: none; font-family: 'Barlow', sans-serif; width: 100%; }
        .wr-input:focus { border-color: rgba(60,170,60,0.6); }
        .wr-tab { font-family: 'Barlow Condensed', sans-serif; font-weight: 700; font-size: 0.88rem; letter-spacing: 0.03em; border: none; padding: 10px 22px; border-radius: 8px 8px 0 0; cursor: pointer; transition: all 0.2s; }
        .wr-badge { display: inline-flex; align-items: center; padding: 3px 10px; border-radius: 20px; font-size: 0.7rem; font-weight: 700; font-family: 'Barlow', sans-serif; text-transform: uppercase; letter-spacing: 0.04em; }
        .wr-nav { position: sticky; top: 0; z-index: 100; background: ${C.navBg}; backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border-bottom: 1px solid ${C.navBorder}; display: flex; align-items: center; justify-content: space-between; padding: 0 32px; height: 62px; }
        .wr-nav-link { font-family: 'Barlow', sans-serif; font-size: 0.87rem; font-weight: 500; color: rgba(255,255,255,0.65); text-decoration: none; padding: 7px 14px; border-radius: 6px; transition: color 0.2s, background 0.2s; }
        .wr-nav-link:hover { color: #5cc85c; background: rgba(26,92,26,0.15); }
        .wr-nav-link-active { color: #5cc85c !important; }
        .wr-logo { display: flex; align-items: center; gap: 10px; text-decoration: none; }
        .wr-logo img { height: 32px; }
        .wr-logo-text { font-family: 'Barlow Condensed', sans-serif; font-weight: 900; font-size: 1.3rem; color: #5cc85c; letter-spacing: 0.06em; }
      `}</style>

      <div style={{ minHeight: '100vh', background: C.bg, fontFamily: 'Barlow, sans-serif' }}>
        {/* ── Nav ── */}
        <nav className="wr-nav">
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Link href="/" className="wr-logo">
              <img src="/images/sportshield-logo-transparent.png" alt="SportShield" />
              <span className="wr-logo-text">SPORTSHIELD</span>
            </Link>
            <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.08)', margin: '0 10px' }} />
            <Link href="/" className="wr-nav-link">Dashboard</Link>
            <Link href="/radar" className="wr-nav-link wr-nav-link-active">Live Radar</Link>
            <Link href="/analytics" className="wr-nav-link">Analytics</Link>
            <Link href="/reports" className="wr-nav-link">Reports</Link>
            <Link href="/settings" className="wr-nav-link">Settings</Link>
          </div>
          <ProfileAvatar />
        </nav>

        <main style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 24px' }}>
          {/* Demo Banner */}
          {isDemo && (
            <div style={{ background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.3)', borderRadius: 10, padding: '10px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: '0.78rem', color: '#4ade80', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Demo Mode</span>
                <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)' }}>— Sample war room data</span>
              </div>
              <Link href="/radar" style={{ fontSize: '0.78rem', color: '#4ade80', fontWeight: 700, textDecoration: 'none' }}>Exit Demo ×</Link>
            </div>
          )}

          {/* ── Header ── */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <div>
              <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: '1.8rem', color: C.heading, margin: 0 }}>War Room</h1>
              <p style={{ color: C.muted, margin: '4px 0 0', fontSize: '0.85rem' }}>Live stream piracy radar, enforcement & crowd network</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.25)', color: '#4ade80', padding: '6px 14px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 700 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#4ade80', display: 'inline-block', animation: 'pulse 2s infinite' }} />
                Engine Active
              </span>
            </div>
          </div>

          {/* ── Tabs ── */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: `1px solid ${C.cardBorder}` }}>
            {tabs.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} className="wr-tab" style={{
                background: tab === t.id ? C.green : 'transparent',
                color: tab === t.id ? '#fff' : C.muted,
              }}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="wr-card" style={{ padding: 56, textAlign: 'center', color: C.muted }}>Loading war room data…</div>
          ) : (
            <>
              {/* ═══ TAB: LIVE RADAR ═══ */}
              {tab === 'radar' && (
                <div>
                  {/* Stats */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
                    {[
                      { label: 'Active Events',     value: stats?.active_events || 0,           color: C.greenLight },
                      { label: 'Suspects Analyzed',  value: stats?.total_suspects_analyzed || 0, color: C.blue },
                      { label: 'Pirates Found',      value: stats?.pirate_streams_found || 0,    color: C.red },
                      { label: 'Total Detections',   value: stats?.total_detections || 0,        color: C.orange },
                    ].map((s, i) => (
                      <div key={i} className="wr-card" style={{ padding: '18px 20px' }}>
                        <div className="wr-stat-val" style={{ color: s.color }}>{s.value}</div>
                        <div className="wr-stat-label">{s.label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
                    <button onClick={() => setShowCreateEvent(true)} className="wr-btn" style={{ background: C.green, color: '#fff' }}>+ New Event</button>
                    <button onClick={() => setShowSubmitSuspect(true)} className="wr-btn" style={{ background: 'rgba(239,68,68,0.15)', color: C.red, border: `1px solid rgba(239,68,68,0.3)` }}>Submit Suspect</button>
                  </div>

                  {/* Create Event Form */}
                  {showCreateEvent && (
                    <div className="wr-card" style={{ padding: 24, marginBottom: 20, border: `1px solid rgba(60,170,60,0.3)` }}>
                      <h3 className="wr-section-title" style={{ marginBottom: 16 }}>Create Monitored Event</h3>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        <input className="wr-input" placeholder="Event name (e.g. Arsenal vs Chelsea)" value={eventForm.eventName} onChange={e => setEventForm({ ...eventForm, eventName: e.target.value })} />
                        <input className="wr-input" placeholder="Teams (comma separated)" value={eventForm.teams} onChange={e => setEventForm({ ...eventForm, teams: e.target.value })} />
                        <input className="wr-input" placeholder="Broadcaster (e.g. Sky Sports)" value={eventForm.broadcaster} onChange={e => setEventForm({ ...eventForm, broadcaster: e.target.value })} />
                        <input className="wr-input" placeholder="League (e.g. Premier League)" value={eventForm.league} onChange={e => setEventForm({ ...eventForm, league: e.target.value })} />
                      </div>
                      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                        <button onClick={createEvent} disabled={creating || !eventForm.eventName} className="wr-btn" style={{ background: C.green, color: '#fff', opacity: creating || !eventForm.eventName ? 0.5 : 1 }}>{creating ? 'Creating...' : 'Create Event'}</button>
                        <button onClick={() => setShowCreateEvent(false)} className="wr-btn-ghost">Cancel</button>
                      </div>
                    </div>
                  )}

                  {/* Submit Suspect Form */}
                  {showSubmitSuspect && (
                    <div className="wr-card" style={{ padding: 24, marginBottom: 20, border: `1px solid rgba(239,68,68,0.3)` }}>
                      <h3 className="wr-section-title" style={{ marginBottom: 16 }}>Analyze Suspect Stream</h3>
                      <div style={{ display: 'grid', gap: 10 }}>
                        <select className="wr-input" value={suspectEventId} onChange={e => setSuspectEventId(e.target.value)}>
                          <option value="">Select event...</option>
                          {events.map(ev => <option key={ev.event_id} value={ev.event_id}>{ev.event_name}</option>)}
                        </select>
                        <input className="wr-input" type="file" accept="video/*,audio/*,image/*" onChange={e => setSuspectFile(e.target.files[0])} />
                        <input className="wr-input" placeholder="Source URL (optional)" value={suspectUrl} onChange={e => setSuspectUrl(e.target.value)} />
                      </div>
                      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                        <button onClick={submitSuspect} disabled={analyzing || !suspectFile || !suspectEventId} className="wr-btn" style={{ background: C.red, color: '#fff', opacity: analyzing || !suspectFile || !suspectEventId ? 0.5 : 1 }}>{analyzing ? 'Analyzing...' : 'Analyze Suspect'}</button>
                        <button onClick={() => { setShowSubmitSuspect(false); setAnalysisResult(null); }} className="wr-btn-ghost">Cancel</button>
                      </div>
                      {analysisResult && (
                        <div style={{ marginTop: 16, padding: 18, background: analysisResult.is_pirate ? 'rgba(239,68,68,0.08)' : 'rgba(74,222,128,0.08)', borderRadius: 10, border: `1px solid ${analysisResult.is_pirate ? 'rgba(239,68,68,0.3)' : 'rgba(74,222,128,0.3)'}` }}>
                          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: '1.1rem', color: analysisResult.is_pirate ? C.red : C.greenLight, marginBottom: 10 }}>
                            {analysisResult.verdict === 'PIRATE_STREAM_DETECTED' ? 'PIRATE DETECTED' : analysisResult.verdict === 'SUSPICIOUS' ? 'SUSPICIOUS' : 'CLEAN'}
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                            <div className="wr-card" style={{ padding: '10px 14px', textAlign: 'center' }}>
                              <div style={{ fontSize: '0.7rem', color: C.muted, marginBottom: 2 }}>Composite</div>
                              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: '1.3rem', color: C.orange }}>{(analysisResult.composite_score * 100).toFixed(1)}%</div>
                            </div>
                            <div className="wr-card" style={{ padding: '10px 14px', textAlign: 'center' }}>
                              <div style={{ fontSize: '0.7rem', color: C.muted, marginBottom: 2 }}>Audio Match</div>
                              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: '1.3rem', color: C.blue }}>{((analysisResult.audio_match?.score || 0) * 100).toFixed(1)}%</div>
                            </div>
                            <div className="wr-card" style={{ padding: '10px 14px', textAlign: 'center' }}>
                              <div style={{ fontSize: '0.7rem', color: C.muted, marginBottom: 2 }}>Visual Match</div>
                              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: '1.3rem', color: C.purple }}>{((analysisResult.visual_match?.score || 0) * 100).toFixed(1)}%</div>
                            </div>
                          </div>
                          {analysisResult.multimodal && !analysisResult.multimodal.skipped && (
                            <div style={{ marginTop: 10, fontSize: '0.78rem', color: C.muted }}>
                              Multimodal confirmation: {analysisResult.multimodal.signals}/{analysisResult.multimodal.total_signals} signals confirmed
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Events List */}
                  <h3 className="wr-section-title" style={{ marginBottom: 14 }}>Monitored Events</h3>
                  {events.length === 0 ? (
                    <div className="wr-card" style={{ padding: 48, textAlign: 'center', color: C.muted }}>No events yet. Create one to start monitoring.</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
                      {events.map(ev => (
                        <div key={ev.event_id} className="wr-card" style={{ padding: '18px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: '1rem', color: C.heading }}>{ev.event_name}</div>
                            <div style={{ color: C.muted, fontSize: '0.78rem', marginTop: 3 }}>
                              {ev.teams?.join(' vs ') || 'No teams'} {ev.broadcaster ? `· ${ev.broadcaster}` : ''} {ev.league ? `· ${ev.league}` : ''}
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: 18, alignItems: 'center' }}>
                            <div style={{ textAlign: 'center' }}>
                              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: '1.3rem', color: C.blue }}>{ev.suspect_count || 0}</div>
                              <div style={{ fontSize: '0.65rem', color: C.muted, textTransform: 'uppercase' }}>Suspects</div>
                            </div>
                            <div style={{ textAlign: 'center' }}>
                              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: '1.3rem', color: C.red }}>{ev.detection_count || 0}</div>
                              <div style={{ fontSize: '0.65rem', color: C.muted, textTransform: 'uppercase' }}>Pirates</div>
                            </div>
                            <span className="wr-badge" style={{ background: ev.status === 'monitoring' ? 'rgba(74,222,128,0.1)' : 'rgba(148,163,184,0.1)', color: ev.status === 'monitoring' ? '#4ade80' : '#94a3b8', border: `1px solid ${ev.status === 'monitoring' ? 'rgba(74,222,128,0.2)' : 'rgba(148,163,184,0.15)'}` }}>
                              {ev.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Detections */}
                  {detections.length > 0 && (
                    <>
                      <h3 className="wr-section-title" style={{ marginBottom: 14 }}>Pirate Detections</h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {detections.map(d => (
                          <div key={d.detection_id} style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: '0.92rem', color: C.red }}>{d.event_name}</div>
                              <div style={{ color: C.muted, fontSize: '0.75rem', marginTop: 2 }}>
                                {d.source_url || 'Unknown source'} · Score: {(d.composite_score * 100).toFixed(0)}%
                              </div>
                            </div>
                            <span className="wr-badge" style={{ background: d.confidence === 'HIGH' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)', color: d.confidence === 'HIGH' ? C.red : C.orange, border: `1px solid ${d.confidence === 'HIGH' ? 'rgba(239,68,68,0.3)' : 'rgba(245,158,11,0.3)'}` }}>
                              {d.confidence}
                            </span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* ═══ TAB: ENFORCEMENT ═══ */}
              {tab === 'enforce' && (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
                    {[
                      { label: 'Total Cases',  value: enforcementStats?.total_cases || 0,    color: C.blue },
                      { label: 'Active',        value: enforcementStats?.active_cases || 0,   color: C.orange },
                      { label: 'Resolved',      value: enforcementStats?.resolved_cases || 0, color: C.greenLight },
                      { label: 'Under 30min',   value: `${enforcementStats?.under_30_min_rate || 0}%`, color: C.purple },
                    ].map((s, i) => (
                      <div key={i} className="wr-card" style={{ padding: '18px 20px' }}>
                        <div className="wr-stat-val" style={{ color: s.color }}>{s.value}</div>
                        <div className="wr-stat-label">{s.label}</div>
                      </div>
                    ))}
                  </div>

                  <h3 className="wr-section-title" style={{ marginBottom: 14 }}>Enforcement Cases</h3>
                  {cases.length === 0 ? (
                    <div className="wr-card" style={{ padding: 48, textAlign: 'center', color: C.muted }}>No enforcement cases yet.</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {cases.map(c => (
                        <div key={c.case_id} className="wr-card" style={{ padding: '16px 20px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: '0.95rem', color: C.heading }}>{c.event_name || c.case_id}</div>
                              <div style={{ color: C.muted, fontSize: '0.75rem', marginTop: 2 }}>{c.platform} · {c.source_url || 'N/A'}</div>
                            </div>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                              <span className="wr-badge" style={{ background: statusColor(c.status) + '18', color: statusColor(c.status), border: `1px solid ${statusColor(c.status)}33` }}>
                                {c.status.replace(/_/g, ' ')}
                              </span>
                              {c.status === 'dmca_generated' && (
                                <button onClick={() => fileDmca(c.case_id)} className="wr-btn" style={{ background: C.blue, color: '#fff', padding: '6px 14px', fontSize: '0.72rem' }}>File DMCA</button>
                              )}
                              {c.status.includes('filed') && (
                                <button onClick={() => escalateCase(c.case_id)} className="wr-btn" style={{ background: C.orange, color: '#fff', padding: '6px 14px', fontSize: '0.72rem' }}>Escalate</button>
                              )}
                            </div>
                          </div>
                          {c.escalation_level > 0 && (
                            <div style={{ marginTop: 8, color: C.orange, fontSize: '0.75rem', fontWeight: 600 }}>Escalation Level: {c.escalation_level}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ═══ TAB: CROWD NETWORK ═══ */}
              {tab === 'crowd' && (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
                    {[
                      { label: 'Contributors',    value: crowdStats?.total_contributors || 0, color: C.purple },
                      { label: 'Submissions',      value: crowdStats?.total_submissions || 0,  color: C.blue },
                      { label: 'Verified Pirates', value: crowdStats?.verified_pirates || 0,   color: C.red },
                      { label: 'Verification Rate',value: `${crowdStats?.verification_rate || 0}%`, color: C.greenLight },
                    ].map((s, i) => (
                      <div key={i} className="wr-card" style={{ padding: '18px 20px' }}>
                        <div className="wr-stat-val" style={{ color: s.color }}>{s.value}</div>
                        <div className="wr-stat-label">{s.label}</div>
                      </div>
                    ))}
                  </div>

                  <div style={{ marginBottom: 24 }}>
                    <button onClick={() => setShowCrowdSubmit(true)} className="wr-btn" style={{ background: C.purple, color: '#fff' }}>Report Pirate Stream</button>
                  </div>

                  {showCrowdSubmit && (
                    <div className="wr-card" style={{ padding: 24, marginBottom: 20, border: `1px solid rgba(167,139,250,0.3)` }}>
                      <h3 className="wr-section-title" style={{ marginBottom: 16 }}>Report a Pirate Stream</h3>
                      <div style={{ display: 'grid', gap: 10 }}>
                        <input className="wr-input" placeholder="Suspect URL *" value={crowdForm.suspectUrl} onChange={e => setCrowdForm({ ...crowdForm, suspectUrl: e.target.value })} />
                        <input className="wr-input" placeholder="Event name (optional)" value={crowdForm.eventName} onChange={e => setCrowdForm({ ...crowdForm, eventName: e.target.value })} />
                        <input className="wr-input" placeholder="Description (optional)" value={crowdForm.description} onChange={e => setCrowdForm({ ...crowdForm, description: e.target.value })} />
                      </div>
                      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                        <button onClick={submitCrowdReport} disabled={!crowdForm.suspectUrl} className="wr-btn" style={{ background: C.purple, color: '#fff', opacity: !crowdForm.suspectUrl ? 0.5 : 1 }}>Submit Report</button>
                        <button onClick={() => setShowCrowdSubmit(false)} className="wr-btn-ghost">Cancel</button>
                      </div>
                    </div>
                  )}

                  <h3 className="wr-section-title" style={{ marginBottom: 14 }}>Leaderboard</h3>
                  {leaderboard.length === 0 ? (
                    <div className="wr-card" style={{ padding: 48, textAlign: 'center', color: C.muted }}>No contributors yet. Be the first!</div>
                  ) : (
                    <div className="wr-card" style={{ overflow: 'hidden' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ borderBottom: `1px solid ${C.cardBorder}` }}>
                            {['#', 'Contributor', 'Rank', 'Points', 'Verified Finds'].map(h => (
                              <th key={h} style={{ textAlign: 'left', padding: '12px 16px', color: C.muted, fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: "'Barlow', sans-serif" }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {leaderboard.map((c, i) => (
                            <tr key={c.user_id} style={{ borderBottom: `1px solid rgba(26,92,26,0.1)` }}>
                              <td style={{ padding: '10px 16px', fontSize: '0.85rem', color: C.text, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800 }}>{i + 1}</td>
                              <td style={{ padding: '10px 16px', fontSize: '0.85rem', color: C.heading, fontWeight: 600 }}>{c.display_name}</td>
                              <td style={{ padding: '10px 16px' }}>
                                <span className="wr-badge" style={{ background: rankColor(c.rank) + '18', color: rankColor(c.rank), border: `1px solid ${rankColor(c.rank)}33`, textTransform: 'capitalize' }}>{c.rank}</span>
                              </td>
                              <td style={{ padding: '10px 16px', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: '1rem', color: C.orange }}>{c.total_points}</td>
                              <td style={{ padding: '10px 16px', fontSize: '0.85rem', color: C.text }}>{c.verified_finds}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* ═══ TAB: PUBLIC API ═══ */}
              {tab === 'api' && (
                <div>
                  <div className="wr-card" style={{ padding: 24 }}>
                    <h3 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: '1.2rem', color: C.heading, marginBottom: 6 }}>SportShield Public API v2.0</h3>
                    <p style={{ color: C.muted, fontSize: '0.85rem', marginBottom: 24 }}>End-to-end sports content protection for rights-holders to integrate.</p>

                    {[
                      { title: 'Protect', color: C.greenLight, endpoints: [
                        'POST /api/media/upload — Upload and protect media',
                        'POST /api/media/c2pa-verify — Verify C2PA credentials',
                        'POST /api/media/clip-search — Semantic image search',
                      ]},
                      { title: 'Detect', color: C.red, endpoints: [
                        'POST /api/media/radar/events — Create monitored event',
                        'POST /api/media/radar/events/{id}/reference — Upload reference clip',
                        'POST /api/media/radar/events/{id}/suspect — Submit suspect stream',
                        'GET /api/media/radar/detections — List pirate detections',
                      ]},
                      { title: 'Enforce', color: C.orange, endpoints: [
                        'POST /api/media/enforce/cases — Create enforcement case',
                        'POST /api/media/enforce/cases/{id}/file — File DMCA',
                        'POST /api/media/enforce/cases/{id}/escalate — Escalate case',
                        'GET /api/media/enforce/cases/{id}/evidence-pack — Evidence pack',
                      ]},
                      { title: 'Crowdsource', color: C.purple, endpoints: [
                        'POST /api/media/crowd/submit — Report pirate stream',
                        'GET /api/media/crowd/leaderboard — Top contributors',
                        'POST /api/media/crowd/bounties — Create bounty',
                      ]},
                    ].map(section => (
                      <div key={section.title} style={{ marginBottom: 20 }}>
                        <h4 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, color: section.color, margin: '0 0 8px', fontSize: '0.9rem', letterSpacing: '0.03em' }}>{section.title}</h4>
                        {section.endpoints.map((ep, i) => (
                          <div key={i} style={{ background: 'rgba(10,18,16,0.5)', padding: '8px 14px', borderRadius: 6, marginBottom: 4, fontSize: '0.78rem', fontFamily: 'monospace', color: C.text, border: '1px solid rgba(26,92,26,0.15)' }}>
                            {ep}
                          </div>
                        ))}
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

function statusColor(status) {
  if (status.includes('resolved')) return '#4ade80';
  if (status.includes('escalated')) return '#f59e0b';
  if (status.includes('filed')) return '#60a5fa';
  if (status.includes('generated')) return '#a78bfa';
  return '#94a3b8';
}

function rankColor(rank) {
  const colors = { legend: '#f59e0b', expert: '#a78bfa', veteran: '#60a5fa', hunter: '#4ade80', scout: '#94a3b8' };
  return colors[rank] || '#94a3b8';
}
