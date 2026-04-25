import { initializeApp, getApps } from 'firebase/app';
import {
  getFirestore, collection, query, where, orderBy,
  onSnapshot, doc, updateDoc, getDocs, limit,
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const db   = getFirestore(app);
export const auth = getAuth(app);

const DEMO_USER = 'demo_user';

/* ── Private: demo_user's own assets & alerts ── */

export function subscribeToAssets(callback) {
  const q = query(
    collection(db, 'assets'),
    where('userId', '==', DEMO_USER),
    orderBy('uploadedAt', 'desc')
  );
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
}

export function subscribeToAlerts(callback) {
  const q = query(
    collection(db, 'alerts'),
    where('userId', '==', DEMO_USER),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
}

export function subscribeToScanResults(assetId, callback) {
  const q = query(
    collection(db, 'scan_results'),
    where('assetId', '==', assetId),
    orderBy('confidence', 'desc')
  );
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
}

export function markAlertRead(alertId) {
  return updateDoc(doc(db, 'alerts', alertId), { isRead: true });
}

/* ── Visibility control ── */

/**
 * Set an asset as public or private.
 * isPublic: true  → appears on the community dashboard
 * isPublic: false → private, only owner sees it
 */
export function setAssetVisibility(assetId, isPublic) {
  return updateDoc(doc(db, 'assets', assetId), { isPublic });
}

/* ── Public community dashboard ── */

/**
 * Subscribe to all assets visible on the public dashboard.
 * Includes:
 *  - assets where isPublic === true
 *  - assets where isPublic field is absent (legacy, treated as public)
 * We use two queries and merge, since Firestore doesn't support OR on missing fields.
 */
export function subscribeToPublicAssets(callback) {
  let publicAssets = [];
  let legacyAssets = [];

  const merge = () => {
    const seen = new Set();
    const merged = [];
    for (const a of [...publicAssets, ...legacyAssets]) {
      if (!seen.has(a.id)) { seen.add(a.id); merged.push(a); }
    }
    // Sort by uploadedAt desc
    merged.sort((a, b) => {
      const ta = a.uploadedAt?.toDate?.()?.getTime?.() || 0;
      const tb = b.uploadedAt?.toDate?.()?.getTime?.() || 0;
      return tb - ta;
    });
    callback(merged);
  };

  // Query 1: explicitly public
  const q1 = query(
    collection(db, 'assets'),
    where('isPublic', '==', true),
    orderBy('uploadedAt', 'desc'),
    limit(100)
  );
  const unsub1 = onSnapshot(q1, snap => {
    publicAssets = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    merge();
  });

  // Query 2: legacy assets (demo_user, no isPublic field means they predate the feature)
  const q2 = query(
    collection(db, 'assets'),
    where('userId', '==', DEMO_USER),
    orderBy('uploadedAt', 'desc'),
    limit(100)
  );
  const unsub2 = onSnapshot(q2, snap => {
    // Only include those where isPublic is not explicitly false
    legacyAssets = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(a => a.isPublic !== false);
    merge();
  });

  return () => { unsub1(); unsub2(); };
}

/**
 * Subscribe to alerts for all public assets (for the community violation counter).
 */
export function subscribeToPublicAlerts(callback) {
  const q = query(
    collection(db, 'alerts'),
    where('userId', '==', DEMO_USER),
    orderBy('createdAt', 'desc'),
    limit(200)
  );
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
}
