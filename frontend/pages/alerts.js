import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Bell, ArrowLeft, ExternalLink, CheckCheck, FileText } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
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

  const filtered = alerts.filter(a => {
    if (filter === 'high')   return a.severity === 'high';
    if (filter === 'medium') return a.severity === 'medium';
    if (filter === 'unread') return !a.isRead;
    return true;
  });

  const unreadCount = alerts.filter(a => !a.isRead).length;

  const handleMarkAllRead = async () => {
    if (markingAll) return;
    setMarkingAll(true);
    try {
      await Promise.all(alerts.filter(a => !a.isRead).map(a => markAlertRead(a.id)));
      toast.success('All alerts marked as read');
    } catch {
      toast.error('Failed to mark alerts as read');
    } finally {
      setMarkingAll(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Toaster position="top-right" />
      <nav className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-gray-400 hover:text-white transition-colors"><ArrowLeft size={20} /></Link>
          <Bell className="text-red-500" size={20} />
          <span className="font-bold text-white">Alerts</span>
          {unreadCount > 0 && (
            <span className="bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">{unreadCount} new</span>
          )}
        </div>
        {unreadCount > 0 && (
          <button onClick={handleMarkAllRead} disabled={markingAll}
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 px-4 py-2 rounded-lg transition-colors disabled:opacity-50">
            <CheckCheck size={14} />
            {markingAll ? 'Marking…' : 'Mark all read'}
          </button>
        )}
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-8">
        <div className="flex gap-2 mb-6 flex-wrap">
          {[
            { key: 'all',    label: `All (${alerts.length})` },
            { key: 'unread', label: `Unread (${unreadCount})` },
            { key: 'high',   label: 'High' },
            { key: 'medium', label: 'Medium' },
          ].map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === f.key ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}>
              {f.label}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <Bell size={48} className="text-gray-700 mx-auto mb-4" />
            <h3 className="text-gray-400 font-medium mb-2">No alerts</h3>
            <p className="text-gray-600 text-sm">
              {filter === 'all' ? 'No violations detected yet. Upload media to start monitoring.' : 'No alerts match this filter.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
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
  const severityConfig = {
    high:   { border: 'border-red-500/50',    bg: 'bg-red-500/5',    badge: 'bg-red-500/20 text-red-400',       icon: '🚨' },
    medium: { border: 'border-yellow-500/50', bg: 'bg-yellow-500/5', badge: 'bg-yellow-500/20 text-yellow-400', icon: '⚠️' },
    low:    { border: 'border-gray-700',      bg: 'bg-gray-800/50',  badge: 'bg-gray-500/20 text-gray-400',    icon: 'ℹ️' },
  };
  const cfg        = severityConfig[alert.severity] || severityConfig.medium;
  const barColor   = confidence >= 90 ? 'bg-red-500'    : confidence >= 75 ? 'bg-yellow-500' : 'bg-green-500';
  const textColor  = confidence >= 90 ? 'text-red-400'  : confidence >= 75 ? 'text-yellow-400' : 'text-green-400';

  const currentStatus = alert.takedownStatus || 'none';
  const statusLabel   = TAKEDOWN_STATUSES.find(s => s.value === currentStatus)?.label || 'No Action';

  const handleTakedownChange = async (e) => {
    try {
      await setTakedownStatus(alert.id, e.target.value);
    } catch {
      toast?.error?.('Failed to update status');
    }
  };

  return (
    <div className={`border rounded-xl overflow-hidden ${cfg.border} ${cfg.bg} ${!alert.isRead ? 'ring-1 ring-red-500/30' : ''}`}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800/50">
        <div className="flex items-center gap-2">
          <span>{cfg.icon}</span>
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full capitalize ${cfg.badge}`}>{alert.severity}</span>
          {!alert.isRead && <span className="text-xs text-red-400 font-bold">● NEW</span>}
        </div>
        <span className="text-xs text-gray-500">{formatDistanceToNow(createdAt, { addSuffix: true })}</span>
      </div>

      <div className="px-4 py-3">
        <p className="text-sm font-semibold text-white mb-2">Unauthorized use detected — {confidence}% confidence</p>
        <div className="flex items-center gap-2 mb-3">
          <div className="flex-1 bg-gray-800 rounded-full h-1.5 overflow-hidden">
            <div className={`h-full rounded-full ${barColor}`} style={{ width: `${confidence}%` }} />
          </div>
          <span className={`text-xs font-bold tabular-nums ${textColor}`}>{confidence}%</span>
        </div>
        {alert.foundUrl && (
          <a href={alert.foundUrl} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 truncate mb-3">
            <ExternalLink size={11} />{alert.foundUrl}
          </a>
        )}

        {/* Takedown status */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 flex-shrink-0">Takedown:</span>
          <select
            value={currentStatus}
            onChange={handleTakedownChange}
            className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-xs text-gray-300 focus:outline-none focus:border-red-500 transition-colors"
          >
            {TAKEDOWN_STATUSES.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 px-4 py-2 border-t border-gray-800/50">
        {/* DMCA Notice link */}
        <Link href={`/dmca/${alert.id}`}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors">
          <FileText size={12} /> DMCA Notice
        </Link>

        {!alert.isRead && (
          <button onClick={() => markAlertRead(alert.id).catch(() => toast.error('Failed'))}
            className="text-xs text-white bg-gray-700 hover:bg-gray-600 px-3 py-1.5 rounded-lg transition-colors">
            Dismiss
          </button>
        )}
      </div>
    </div>
  );
}
