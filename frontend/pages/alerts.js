import { useState, useEffect } from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import toast, { Toaster } from 'react-hot-toast';
import { db, subscribeToAlerts, markAlertRead } from '../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';

const TAKEDOWN_STATUSES = [
  { value: 'none',         label: 'No Action' },
  { value: 'sent',         label: 'Notice Sent' },
  { value: 'acknowledged', label: 'Acknowledged' },
  { value: 'removed',      label: 'Content Removed' },
  { value: 'disputed',     label: 'Disputed' },
];

function setTakedownStatus(alertId, status) {
  return updateDoc(doc(db, 'alerts', alertId), { takedownStatus: status });
}

export default function AlertsPage() {
  const [alerts,     setAlerts]     = useState([]);
  const [filter,     setFilter]     = useState('all');
  const [markingAll, setMarkingAll] = useState(false);

  useEffect(() => {
    const unsub = subscribeToAlerts(setAlerts);
    return () => unsub();
  }, []);

  const unreadCount = alerts.filter(a => !a.isRead).length;
  const filtered = alerts.filter(a => {
    if (filter === 'high')   return a.severity === 'high';
    if (filter === 'medium') return a.severity === 'medium';
    if (filter === 'unread') return !a.isRead;
    return true;
  });

  const handleMarkAllRead = async () => {
    if (markingAll) return;
    setMarkingAll(true);
    try {
      await Promise.all(alerts.filter(a => !a.isRead).map(a => markAlertRead(a.id)));
      toast.success('All alerts marked as read');
    } catch {
      toast.error('Failed to mark alerts as read');
    } finally { setMarkingAll(false); }
  };

  return (
    <div className="ap-root">
      <Toaster position="top-right" toastOptions={{ style: { background: '#0d1f10', color: '#fff', border: '1px solid rgba(26,92,26,0.4)' } }} />

      {/* Nav */}
      <nav className="ap-nav">
        <div className="ap-nav-left">
          <Link href="/" className="ap-back">← Dashboard</Link>
          <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.1)' }} />
          <Link href="/" className="ap-logo">
            <img src="/images/sportshield-logo-transparent.png" alt="SportShield" />
            <span className="ap-logo-text">SPORTSHIELD</span>
          </Link>
          <span className="ap-page-tag" style={{ marginLeft: 4 }}>/ Alerts</span>
          {unreadCount > 0 && (
            <span className="ap-badge ap-badge-new">{unreadCount} new</span>
          )}
        </div>
        <div className="ap-nav-right">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              disabled={markingAll}
              className="ap-btn ap-btn-ghost"
              style={{ fontSize: '0.78rem', padding: '7px 14px' }}
            >
              {markingAll ? 'Marking…' : 'Mark all read'}
            </button>
          )}
        </div>
      </nav>

      <main style={{ maxWidth: 820, margin: '0 auto', padding: '32px 24px' }}>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <h1 className="ap-heading">Violation Alerts</h1>
          <p className="ap-muted" style={{ marginTop: 6 }}>
            {alerts.length} total · {unreadCount} unread
          </p>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
          {[
            { key: 'all',    label: `All (${alerts.length})` },
            { key: 'unread', label: `Unread (${unreadCount})` },
            { key: 'high',   label: 'High Severity' },
            { key: 'medium', label: 'Medium' },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`ap-filter ${filter === f.key ? 'active' : ''}`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Alert list */}
        {filtered.length === 0 ? (
          <div className="ap-card" style={{ padding: 64, textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: 16 }}>🔔</div>
            <p className="ap-subheading" style={{ marginBottom: 8 }}>No alerts</p>
            <p className="ap-muted">
              {filter === 'all'
                ? 'No violations detected yet. Upload media to start monitoring.'
                : 'No alerts match this filter.'}
            </p>
          </div>
        ) : (
          <div>
            {filtered.map(alert => <AlertCard key={alert.id} alert={alert} />)}
          </div>
        )}
      </main>
    </div>
  );
}

function AlertCard({ alert }) {
  const createdAt  = alert.createdAt?.toDate?.() || new Date();
  const confidence = Math.round((alert.confidence || 0) * 100);
  const isHigh     = alert.severity === 'high';
  const barColor   = confidence >= 90 ? '#ef4444' : confidence >= 75 ? '#f59e0b' : '#4ade80';

  const handleTakedownChange = async (e) => {
    try { await setTakedownStatus(alert.id, e.target.value); }
    catch { toast?.error?.('Failed to update status'); }
  };

  return (
    <div className={`ap-alert-card ${isHigh ? '' : 'medium'}`}
      style={{ marginBottom: 12, border: `1px solid ${isHigh ? 'rgba(239,68,68,0.28)' : 'rgba(245,158,11,0.25)'}`, background: isHigh ? 'rgba(239,68,68,0.05)' : 'rgba(245,158,11,0.04)' }}>

      {/* Header row */}
      <div className="ap-alert-card-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className={`ap-badge ${isHigh ? 'ap-badge-high' : 'ap-badge-medium'}`} style={{ textTransform: 'uppercase' }}>
            {alert.severity || 'medium'}
          </span>
          {!alert.isRead && (
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '0.7rem', color: '#fca5a5', letterSpacing: '0.08em' }}>
              ● NEW
            </span>
          )}
        </div>
        <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.35)' }}>
          {formatDistanceToNow(createdAt, { addSuffix: true })}
        </span>
      </div>

      {/* Body */}
      <div className="ap-alert-card-body">
        <p style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.05rem', color: '#fff', marginBottom: 10, letterSpacing: '0.01em' }}>
          Unauthorized use detected — {confidence}% confidence
        </p>

        {/* Confidence bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <div className="ap-conf-bar-track">
            <div className="ap-conf-bar-fill" style={{ width: `${confidence}%`, background: barColor }} />
          </div>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '0.9rem', color: barColor, minWidth: 36 }}>
            {confidence}%
          </span>
        </div>

        {alert.foundUrl && (
          <a href={alert.foundUrl} target="_blank" rel="noopener noreferrer"
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', color: '#60a5fa', textDecoration: 'none', marginBottom: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            ↗ {alert.foundUrl}
          </a>
        )}

        {/* Takedown dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)', flexShrink: 0 }}>Takedown status:</span>
          <select
            value={alert.takedownStatus || 'none'}
            onChange={handleTakedownChange}
            className="ap-select"
            style={{ flex: 1 }}
          >
            {TAKEDOWN_STATUSES.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Footer */}
      <div className="ap-alert-card-footer">
        <Link href={`/dmca/${alert.id}`}
          style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', color: 'rgba(255,255,255,0.45)', textDecoration: 'none', fontWeight: 600, transition: 'color 0.2s' }}
          onMouseEnter={e => e.currentTarget.style.color = '#4ade80'}
          onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.45)'}
        >
          📄 DMCA Notice
        </Link>
        {!alert.isRead && (
          <button
            onClick={() => markAlertRead(alert.id).catch(() => toast.error('Failed'))}
            className="ap-btn ap-btn-ghost"
            style={{ padding: '5px 14px', fontSize: '0.78rem' }}
          >
            Dismiss
          </button>
        )}
      </div>
    </div>
  );
}
