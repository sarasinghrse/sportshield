import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../lib/useAuth';
import ProfileAvatar from '../components/ProfileAvatar';
import Footer from '../components/landing/Footer';

const C = {
  bg:        '#0a1210',
  card:      'rgba(13,26,16,0.85)',
  cardBorder:'rgba(26,92,26,0.35)',
  navBg:     'rgba(10,18,12,0.96)',
  navBorder: 'rgba(26,92,26,0.4)',
  green:     '#1a5c1a',
  greenLight:'#3caa3c',
  greenGlow: 'rgba(26,92,26,0.25)',
  text:      '#d4e8d4',
  muted:     'rgba(255,255,255,0.45)',
  heading:   '#ffffff',
  red:       '#ef4444',
  orange:    '#f59e0b',
  blue:      '#60a5fa',
  purple:    '#a78bfa',
  pink:      '#f472b6',
};

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function RadarPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [tab, setTab] = useState('radar');
  const [stats, setStats] = useState(null);
  const [enforcementStats, setEnforcementStats] = useState(null);
  const [crowdStats, setCrowdStats] = useState(null);
  const [events, setEvents] = useState([]);
  const [detections, setDetections] = useState([]);
  const [cases, setCases] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

  // Create event form
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [eventForm, setEventForm] = useState({ eventName: '', teams: '', broadcaster: '', league: '' });
  const [creating, setCreating] = useState(false);

  // Submit suspect form
  const [showSubmitSuspect, setShowSubmitSuspect] = useState(false);
  const [suspectFile, setSuspectFile] = useState(null);
  const [suspectEventId, setSuspectEventId] = useState('');
  const [suspectUrl, setSuspectUrl] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);

  // Crowd submit form
  const [showCrowdSubmit, setShowCrowdSubmit] = useState(false);
  const [crowdForm, setCrowdForm] = useState({ suspectUrl: '', eventName: '', description: '' });

  useEffect(() => {
    if (!authLoading && !user) router.replace('/landing');
  }, [user, authLoading]);

  const fetchData = useCallback(async () => {
    try {
      const [statsRes, eventsRes, detectionsRes, enfRes, crowdRes, lbRes, casesRes] = await Promise.all([
        fetch(`${API}/api/media/radar/stats`).then(r => r.json()).catch(() => null),
        fetch(`${API}/api/media/radar/events`).then(r => r.json()).catch(() => ({ events: [] })),
        fetch(`${API}/api/media/radar/detections`).then(r => r.json()).catch(() => ({ detections: [] })),
        fetch(`${API}/api/media/enforce/stats`).then(r => r.json()).catch(() => null),
        fetch(`${API}/api/media/crowd/stats`).then(r => r.json()).catch(() => null),
        fetch(`${API}/api/media/crowd/leaderboard?limit=10`).then(r => r.json()).catch(() => ({ leaderboard: [] })),
        fetch(`${API}/api/media/enforce/cases`).then(r => r.json()).catch(() => ({ cases: [] })),
      ]);
      setStats(statsRes);
      setEvents(eventsRes.events || []);
      setDetections(detectionsRes.detections || []);
      setEnforcementStats(enfRes);
      setCrowdStats(crowdRes);
      setLeaderboard(lbRes.leaderboard || []);
      setCases(casesRes.cases || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const createEvent = async () => {
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
    await fetch(`${API}/api/media/enforce/cases/${caseId}/file`, { method: 'POST' });
    fetchData();
  };

  const escalateCase = async (caseId) => {
    await fetch(`${API}/api/media/enforce/cases/${caseId}/escalate`, { method: 'POST' });
    fetchData();
  };

  const submitCrowdReport = async () => {
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

  if (authLoading) return null;
  if (!user) return null;

  const navLinks = [
    { href: '/',         label: 'Dashboard' },
    { href: '/radar',    label: 'Live Radar', active: true },
    { href: '/upload',   label: 'Upload' },
    { href: '/alerts',   label: 'Alerts' },
    { href: '/analytics',label: 'Analytics' },
    { href: '/settings', label: 'Settings' },
  ];

  const tabs = [
    { id: 'radar',      label: 'Live Radar',   icon: '📡' },
    { id: 'enforce',    label: 'Enforcement',   icon: '⚖️' },
    { id: 'crowd',      label: 'Crowd Network', icon: '👥' },
    { id: 'api',        label: 'Public API',    icon: '🔌' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text }}>
      {/* ── Nav ── */}
      <nav style={{ background: C.navBg, borderBottom: `1px solid ${C.navBorder}`, padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100, backdropFilter: 'blur(12px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
          <Link href="/" style={{ color: C.greenLight, fontWeight: 800, fontSize: 20, textDecoration: 'none' }}>SportShield</Link>
          {navLinks.map(l => (
            <Link key={l.href} href={l.href} style={{ color: l.active ? C.greenLight : C.muted, textDecoration: 'none', fontSize: 14, fontWeight: l.active ? 600 : 400 }}>{l.label}</Link>
          ))}
        </div>
        <ProfileAvatar />
      </nav>

      <div style={{ maxWidth: 1300, margin: '0 auto', padding: '24px 20px' }}>
        {/* ── Header ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h1 style={{ color: C.heading, fontSize: 28, fontWeight: 800, margin: 0 }}>War Room</h1>
            <p style={{ color: C.muted, margin: '4px 0 0', fontSize: 14 }}>Live stream piracy radar, enforcement, and crowd network</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <span style={{ background: '#16a34a22', color: '#4ade80', padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600 }}>Engine Active</span>
          </div>
        </div>

        {/* ── Tabs ── */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: `1px solid ${C.cardBorder}`, paddingBottom: 0 }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              background: tab === t.id ? C.green : 'transparent',
              color: tab === t.id ? '#fff' : C.muted,
              border: 'none', padding: '10px 20px', borderRadius: '8px 8px 0 0',
              cursor: 'pointer', fontSize: 14, fontWeight: 600,
              transition: 'all 0.2s',
            }}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* ═══ TAB: LIVE RADAR ═══ */}
        {tab === 'radar' && (
          <div>
            {/* Stats row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
              {[
                { label: 'Active Events', value: stats?.active_events || 0, color: C.greenLight },
                { label: 'Suspects Analyzed', value: stats?.total_suspects_analyzed || 0, color: C.blue },
                { label: 'Pirates Found', value: stats?.pirate_streams_found || 0, color: C.red },
                { label: 'Total Detections', value: stats?.total_detections || 0, color: C.orange },
              ].map((s, i) => (
                <div key={i} style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 12, padding: 20 }}>
                  <div style={{ color: C.muted, fontSize: 12, marginBottom: 4 }}>{s.label}</div>
                  <div style={{ color: s.color, fontSize: 32, fontWeight: 800 }}>{s.value}</div>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
              <button onClick={() => setShowCreateEvent(true)} style={{ background: C.green, color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>+ New Event</button>
              <button onClick={() => setShowSubmitSuspect(true)} style={{ background: '#dc262622', color: C.red, border: `1px solid ${C.red}44`, padding: '10px 20px', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>Submit Suspect</button>
            </div>

            {/* Create Event Modal */}
            {showCreateEvent && (
              <div style={{ background: C.card, border: `1px solid ${C.greenLight}44`, borderRadius: 12, padding: 24, marginBottom: 20 }}>
                <h3 style={{ color: C.heading, margin: '0 0 16px' }}>Create Monitored Event</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <input placeholder="Event name (e.g. Arsenal vs Chelsea)" value={eventForm.eventName} onChange={e => setEventForm({ ...eventForm, eventName: e.target.value })} style={inputStyle} />
                  <input placeholder="Teams (comma separated)" value={eventForm.teams} onChange={e => setEventForm({ ...eventForm, teams: e.target.value })} style={inputStyle} />
                  <input placeholder="Broadcaster (e.g. Sky Sports)" value={eventForm.broadcaster} onChange={e => setEventForm({ ...eventForm, broadcaster: e.target.value })} style={inputStyle} />
                  <input placeholder="League (e.g. Premier League)" value={eventForm.league} onChange={e => setEventForm({ ...eventForm, league: e.target.value })} style={inputStyle} />
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                  <button onClick={createEvent} disabled={creating || !eventForm.eventName} style={{ ...btnGreen, opacity: creating || !eventForm.eventName ? 0.5 : 1 }}>{creating ? 'Creating...' : 'Create Event'}</button>
                  <button onClick={() => setShowCreateEvent(false)} style={btnGhost}>Cancel</button>
                </div>
              </div>
            )}

            {/* Submit Suspect Modal */}
            {showSubmitSuspect && (
              <div style={{ background: C.card, border: `1px solid ${C.red}44`, borderRadius: 12, padding: 24, marginBottom: 20 }}>
                <h3 style={{ color: C.heading, margin: '0 0 16px' }}>Analyze Suspect Stream</h3>
                <div style={{ display: 'grid', gap: 12 }}>
                  <select value={suspectEventId} onChange={e => setSuspectEventId(e.target.value)} style={inputStyle}>
                    <option value="">Select event...</option>
                    {events.map(ev => <option key={ev.event_id} value={ev.event_id}>{ev.event_name}</option>)}
                  </select>
                  <input type="file" accept="video/*,audio/*,image/*" onChange={e => setSuspectFile(e.target.files[0])} style={inputStyle} />
                  <input placeholder="Source URL (optional)" value={suspectUrl} onChange={e => setSuspectUrl(e.target.value)} style={inputStyle} />
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                  <button onClick={submitSuspect} disabled={analyzing || !suspectFile || !suspectEventId} style={{ ...btnGreen, background: C.red, opacity: analyzing || !suspectFile || !suspectEventId ? 0.5 : 1 }}>{analyzing ? 'Analyzing...' : 'Analyze Suspect'}</button>
                  <button onClick={() => { setShowSubmitSuspect(false); setAnalysisResult(null); }} style={btnGhost}>Cancel</button>
                </div>
                {analysisResult && (
                  <div style={{ marginTop: 16, padding: 16, background: analysisResult.is_pirate ? '#dc262622' : '#16a34a22', borderRadius: 8, border: `1px solid ${analysisResult.is_pirate ? C.red : C.greenLight}44` }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: analysisResult.is_pirate ? C.red : C.greenLight, marginBottom: 8 }}>
                      {analysisResult.verdict === 'PIRATE_STREAM_DETECTED' ? 'PIRATE DETECTED' : analysisResult.verdict === 'SUSPICIOUS' ? 'SUSPICIOUS' : 'CLEAN'}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, fontSize: 13 }}>
                      <div><span style={{ color: C.muted }}>Composite:</span> <b>{(analysisResult.composite_score * 100).toFixed(1)}%</b></div>
                      <div><span style={{ color: C.muted }}>Audio:</span> <b>{((analysisResult.audio_match?.score || 0) * 100).toFixed(1)}%</b></div>
                      <div><span style={{ color: C.muted }}>Visual:</span> <b>{((analysisResult.visual_match?.score || 0) * 100).toFixed(1)}%</b></div>
                    </div>
                    {analysisResult.multimodal && !analysisResult.multimodal.skipped && (
                      <div style={{ marginTop: 8, fontSize: 13, color: C.muted }}>
                        Multimodal: {analysisResult.multimodal.signals}/{analysisResult.multimodal.total_signals} signals confirmed
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Events List */}
            <h3 style={{ color: C.heading, marginBottom: 12 }}>Monitored Events</h3>
            {events.length === 0 ? (
              <div style={{ color: C.muted, textAlign: 'center', padding: 40 }}>No events yet. Create one to start monitoring.</div>
            ) : (
              <div style={{ display: 'grid', gap: 12 }}>
                {events.map(ev => (
                  <div key={ev.event_id} style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 12, padding: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ color: C.heading, fontWeight: 700, fontSize: 16 }}>{ev.event_name}</div>
                      <div style={{ color: C.muted, fontSize: 13, marginTop: 4 }}>
                        {ev.teams?.join(' vs ') || 'No teams'} {ev.broadcaster ? `• ${ev.broadcaster}` : ''} {ev.league ? `• ${ev.league}` : ''}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ color: C.blue, fontWeight: 700, fontSize: 20 }}>{ev.suspect_count || 0}</div>
                        <div style={{ color: C.muted, fontSize: 11 }}>Suspects</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ color: C.red, fontWeight: 700, fontSize: 20 }}>{ev.detection_count || 0}</div>
                        <div style={{ color: C.muted, fontSize: 11 }}>Pirates</div>
                      </div>
                      <span style={{ background: ev.status === 'monitoring' ? '#16a34a22' : '#64748b22', color: ev.status === 'monitoring' ? '#4ade80' : '#94a3b8', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>{ev.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Detections */}
            {detections.length > 0 && (
              <>
                <h3 style={{ color: C.heading, marginTop: 32, marginBottom: 12 }}>Pirate Detections</h3>
                <div style={{ display: 'grid', gap: 10 }}>
                  {detections.map(d => (
                    <div key={d.detection_id} style={{ background: '#dc262611', border: `1px solid ${C.red}33`, borderRadius: 10, padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ color: C.red, fontWeight: 700 }}>{d.event_name}</div>
                        <div style={{ color: C.muted, fontSize: 12 }}>{d.source_url || 'Unknown source'} • Score: {(d.composite_score * 100).toFixed(0)}%</div>
                      </div>
                      <span style={{ color: C.red, fontWeight: 700, fontSize: 13 }}>{d.confidence?.toUpperCase()}</span>
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
              {[
                { label: 'Total Cases', value: enforcementStats?.total_cases || 0, color: C.blue },
                { label: 'Active', value: enforcementStats?.active_cases || 0, color: C.orange },
                { label: 'Resolved', value: enforcementStats?.resolved_cases || 0, color: C.greenLight },
                { label: 'Under 30min Rate', value: `${enforcementStats?.under_30_min_rate || 0}%`, color: C.purple },
              ].map((s, i) => (
                <div key={i} style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 12, padding: 20 }}>
                  <div style={{ color: C.muted, fontSize: 12, marginBottom: 4 }}>{s.label}</div>
                  <div style={{ color: s.color, fontSize: 32, fontWeight: 800 }}>{s.value}</div>
                </div>
              ))}
            </div>

            <h3 style={{ color: C.heading, marginBottom: 12 }}>Enforcement Cases</h3>
            {cases.length === 0 ? (
              <div style={{ color: C.muted, textAlign: 'center', padding: 40 }}>No enforcement cases yet. Detect a pirate stream first.</div>
            ) : (
              <div style={{ display: 'grid', gap: 10 }}>
                {cases.map(c => (
                  <div key={c.case_id} style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 10, padding: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ color: C.heading, fontWeight: 700 }}>{c.event_name || c.case_id}</div>
                        <div style={{ color: C.muted, fontSize: 12 }}>{c.platform} • {c.source_url || 'N/A'}</div>
                      </div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <span style={{ background: statusColor(c.status) + '22', color: statusColor(c.status), padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>{c.status.replace(/_/g, ' ')}</span>
                        {c.status === 'dmca_generated' && (
                          <button onClick={() => fileDmca(c.case_id)} style={{ ...btnSmall, background: C.blue }}>File DMCA</button>
                        )}
                        {c.status.includes('filed') && (
                          <button onClick={() => escalateCase(c.case_id)} style={{ ...btnSmall, background: C.orange }}>Escalate</button>
                        )}
                      </div>
                    </div>
                    {c.escalation_level > 0 && (
                      <div style={{ marginTop: 8, color: C.orange, fontSize: 12 }}>Escalation Level: {c.escalation_level}</div>
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
              {[
                { label: 'Contributors', value: crowdStats?.total_contributors || 0, color: C.purple },
                { label: 'Submissions', value: crowdStats?.total_submissions || 0, color: C.blue },
                { label: 'Verified Pirates', value: crowdStats?.verified_pirates || 0, color: C.red },
                { label: 'Verification Rate', value: `${crowdStats?.verification_rate || 0}%`, color: C.greenLight },
              ].map((s, i) => (
                <div key={i} style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 12, padding: 20 }}>
                  <div style={{ color: C.muted, fontSize: 12, marginBottom: 4 }}>{s.label}</div>
                  <div style={{ color: s.color, fontSize: 32, fontWeight: 800 }}>{s.value}</div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
              <button onClick={() => setShowCrowdSubmit(true)} style={{ background: C.purple, color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>Report Pirate Stream</button>
            </div>

            {showCrowdSubmit && (
              <div style={{ background: C.card, border: `1px solid ${C.purple}44`, borderRadius: 12, padding: 24, marginBottom: 20 }}>
                <h3 style={{ color: C.heading, margin: '0 0 16px' }}>Report a Pirate Stream</h3>
                <div style={{ display: 'grid', gap: 12 }}>
                  <input placeholder="Suspect URL *" value={crowdForm.suspectUrl} onChange={e => setCrowdForm({ ...crowdForm, suspectUrl: e.target.value })} style={inputStyle} />
                  <input placeholder="Event name (optional)" value={crowdForm.eventName} onChange={e => setCrowdForm({ ...crowdForm, eventName: e.target.value })} style={inputStyle} />
                  <input placeholder="Description (optional)" value={crowdForm.description} onChange={e => setCrowdForm({ ...crowdForm, description: e.target.value })} style={inputStyle} />
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                  <button onClick={submitCrowdReport} disabled={!crowdForm.suspectUrl} style={{ ...btnGreen, background: C.purple, opacity: !crowdForm.suspectUrl ? 0.5 : 1 }}>Submit Report</button>
                  <button onClick={() => setShowCrowdSubmit(false)} style={btnGhost}>Cancel</button>
                </div>
              </div>
            )}

            {/* Leaderboard */}
            <h3 style={{ color: C.heading, marginBottom: 12 }}>Leaderboard</h3>
            {leaderboard.length === 0 ? (
              <div style={{ color: C.muted, textAlign: 'center', padding: 40 }}>No contributors yet. Be the first to report a pirate stream!</div>
            ) : (
              <div style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 12, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${C.cardBorder}` }}>
                      <th style={thStyle}>#</th>
                      <th style={thStyle}>Contributor</th>
                      <th style={thStyle}>Rank</th>
                      <th style={thStyle}>Points</th>
                      <th style={thStyle}>Verified Finds</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.map((c, i) => (
                      <tr key={c.user_id} style={{ borderBottom: `1px solid ${C.cardBorder}22` }}>
                        <td style={tdStyle}>{i + 1}</td>
                        <td style={tdStyle}>{c.display_name}</td>
                        <td style={tdStyle}><span style={{ color: rankColor(c.rank), fontWeight: 600, textTransform: 'capitalize' }}>{c.rank}</span></td>
                        <td style={{ ...tdStyle, color: C.orange, fontWeight: 700 }}>{c.total_points}</td>
                        <td style={tdStyle}>{c.verified_finds}</td>
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
            <div style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 12, padding: 24, marginBottom: 24 }}>
              <h3 style={{ color: C.heading, margin: '0 0 16px' }}>SportShield Public API v2.0</h3>
              <p style={{ color: C.muted, fontSize: 14, marginBottom: 20 }}>End-to-end sports content protection for rights-holders to integrate.</p>

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
                  <h4 style={{ color: section.color, margin: '0 0 8px', fontSize: 14, fontWeight: 700 }}>{section.title}</h4>
                  {section.endpoints.map((ep, i) => (
                    <div key={i} style={{ background: '#0a121044', padding: '8px 14px', borderRadius: 6, marginBottom: 4, fontSize: 13, fontFamily: 'monospace', color: C.text }}>
                      {ep}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}

// ── Styles ──

const inputStyle = {
  background: 'rgba(10,18,16,0.6)',
  border: '1px solid rgba(26,92,26,0.35)',
  borderRadius: 8,
  padding: '10px 14px',
  color: '#d4e8d4',
  fontSize: 14,
  outline: 'none',
};

const btnGreen = {
  background: '#1a5c1a',
  color: '#fff',
  border: 'none',
  padding: '10px 20px',
  borderRadius: 8,
  cursor: 'pointer',
  fontWeight: 600,
  fontSize: 14,
};

const btnGhost = {
  background: 'transparent',
  color: 'rgba(255,255,255,0.45)',
  border: '1px solid rgba(26,92,26,0.35)',
  padding: '10px 20px',
  borderRadius: 8,
  cursor: 'pointer',
  fontWeight: 600,
  fontSize: 14,
};

const btnSmall = {
  color: '#fff',
  border: 'none',
  padding: '5px 12px',
  borderRadius: 6,
  cursor: 'pointer',
  fontWeight: 600,
  fontSize: 12,
};

const thStyle = {
  textAlign: 'left',
  padding: '12px 16px',
  color: 'rgba(255,255,255,0.45)',
  fontSize: 12,
  fontWeight: 600,
  textTransform: 'uppercase',
};

const tdStyle = {
  padding: '10px 16px',
  fontSize: 14,
  color: '#d4e8d4',
};

function statusColor(status) {
  if (status.includes('resolved')) return '#4ade80';
  if (status.includes('escalated')) return '#f59e0b';
  if (status.includes('filed')) return '#60a5fa';
  return '#94a3b8';
}

function rankColor(rank) {
  const colors = { legend: '#f59e0b', expert: '#a78bfa', veteran: '#60a5fa', hunter: '#4ade80', scout: '#94a3b8' };
  return colors[rank] || '#94a3b8';
}
