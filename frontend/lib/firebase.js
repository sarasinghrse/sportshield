import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, query, where, orderBy, onSnapshot, doc, updateDoc } from 'firebase/firestore';
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