import { useState } from 'react';
import { useRouter } from 'next/router';
import { auth, db } from '../lib/firebase';
import {
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import toast, { Toaster } from 'react-hot-toast';

async function redirectAfterLogin(uid, router) {
  const snap = await getDoc(doc(db, 'users', uid));
  router.push(snap.exists() ? '/' : '/onboarding');
}

export default function SignUpPage() {
  const router = useRouter();
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);

  const handleGoogle = async () => {
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, new GoogleAuthProvider());
      await redirectAfterLogin(result.user.uid, router);
    } catch {
      toast.error('Google sign-in failed.');
    } finally { setLoading(false); }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      await redirectAfterLogin(result.user.uid, router);
    } catch (err) {
      const msgs = {
        'auth/email-already-in-use': 'Email already registered. Try signing in.',
        'auth/weak-password':        'Password must be 6+ characters.',
        'auth/invalid-email':        'Invalid email address.',
      };
      toast.error(msgs[err.code] || 'Sign-up failed. Try again.');
    } finally { setLoading(false); }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;800;900&family=Barlow:wght@400;500;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { margin: 0; }
        .su-root {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          font-family: 'Barlow', sans-serif;
          padding: 24px;
        }
        .su-bg {
          position: fixed; inset: 0; z-index: 0;
          background-image: url('/images/signup-page-bg.jpg');
          background-size: cover;
          background-position: center;
        }
        .su-overlay {
          position: fixed; inset: 0; z-index: 1;
          background: linear-gradient(135deg, rgba(2,8,18,0.80) 0%, rgba(15,5,10,0.72) 100%);
        }
        .su-card {
          position: relative; z-index: 2;
          width: 100%; max-width: 460px;
          background: rgba(8, 10, 18, 0.80);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border: 1px solid rgba(255,255,255,0.10);
          border-radius: 20px;
          padding: 44px 40px 36px;
          box-shadow: 0 32px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04);
        }
        .su-logo-row {
          display: flex; align-items: center; justify-content: center;
          gap: 10px; margin-bottom: 28px;
        }
        .su-logo-img { height: 38px; width: auto; }
        .su-logo-text {
          font-family: 'Barlow Condensed', sans-serif;
          font-weight: 900; font-size: 1.6rem;
          color: #fff; letter-spacing: 0.06em;
        }
        .su-heading {
          font-family: 'Barlow Condensed', sans-serif;
          font-weight: 800; font-size: 2rem;
          color: #fff; text-align: center;
          margin-bottom: 4px; line-height: 1.1;
        }
        .su-subheading {
          text-align: center; color: rgba(255,255,255,0.42);
          font-size: 0.88rem; margin-bottom: 24px; font-weight: 400;
        }
        .su-features {
          display: flex; flex-wrap: wrap; gap: 8px;
          margin-bottom: 24px; justify-content: center;
        }
        .su-feature-pill {
          background: rgba(220,38,38,0.15); border: 1px solid rgba(220,38,38,0.25);
          color: rgba(255,255,255,0.75); border-radius: 20px;
          padding: 4px 12px; font-size: 0.75rem; font-weight: 500;
        }
        .su-google-btn {
          width: 100%; display: flex; align-items: center; justify-content: center;
          gap: 12px; background: #fff; color: #111; border: none; border-radius: 12px;
          padding: 13px 20px; font-size: 0.92rem; font-weight: 600;
          cursor: pointer; margin-bottom: 16px; font-family: 'Barlow', sans-serif;
          transition: background 0.2s, box-shadow 0.2s;
          box-shadow: 0 2px 12px rgba(0,0,0,0.15);
        }
        .su-google-btn:hover { background: #f1f1f1; box-shadow: 0 4px 16px rgba(0,0,0,0.2); }
        .su-google-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .su-divider {
          display: flex; align-items: center; gap: 12px; margin-bottom: 16px;
        }
        .su-divider-line { flex: 1; height: 1px; background: rgba(255,255,255,0.10); }
        .su-divider-text { color: rgba(255,255,255,0.3); font-size: 0.78rem; }
        .su-label {
          display: block; color: rgba(255,255,255,0.5); font-size: 0.78rem;
          margin-bottom: 7px; font-weight: 500; letter-spacing: 0.04em; text-transform: uppercase;
        }
        .su-input {
          width: 100%; background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.11);
          border-radius: 12px; padding: 12px 16px;
          color: #fff; font-size: 0.95rem; outline: none;
          font-family: 'Barlow', sans-serif;
          transition: border-color 0.2s, background 0.2s;
        }
        .su-input:focus { border-color: rgba(220,38,38,0.6); background: rgba(255,255,255,0.09); }
        .su-input::placeholder { color: rgba(255,255,255,0.22); }
        .su-submit-btn {
          width: 100%; background: #dc2626; color: #fff; border: none;
          border-radius: 12px; padding: 13px 20px; font-size: 1rem;
          font-family: 'Barlow Condensed', sans-serif;
          font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase;
          cursor: pointer; margin-top: 6px;
          transition: background 0.2s, transform 0.15s;
          box-shadow: 0 4px 20px rgba(220,38,38,0.35);
        }
        .su-submit-btn:hover { background: #b91c1c; transform: translateY(-1px); }
        .su-submit-btn:disabled { opacity: 0.65; cursor: not-allowed; transform: none; }
        .su-switch {
          text-align: center; color: rgba(255,255,255,0.32);
          font-size: 0.84rem; margin-top: 18px;
        }
        .su-switch a { color: #f87171; font-weight: 600; text-decoration: none; }
        .su-switch a:hover { color: #fca5a5; }
        .su-footer {
          text-align: center; margin-top: 28px;
          color: rgba(255,255,255,0.16); font-size: 0.72rem;
        }
      `}</style>

      <Toaster position="top-right" toastOptions={{ style: { background: '#1f2937', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' } }} />

      <div className="su-root">
        <div className="su-bg" />
        <div className="su-overlay" />

        <div className="su-card">
          {/* Logo */}
          <div className="su-logo-row">
            <img src="/images/sportshield-logo-transparent.png" alt="SportShield" className="su-logo-img" />
            <span className="su-logo-text">SPORTSHIELD</span>
          </div>

          <h1 className="su-heading">Nice to Meet You!</h1>
          <p className="su-subheading">Protect your sports media. Free, forever.</p>

          {/* Feature pills */}
          <div className="su-features">
            {['🔍 Web Scanning', '📄 DMCA Notices', '🏅 Certificates', '📊 Analytics'].map(f => (
              <span key={f} className="su-feature-pill">{f}</span>
            ))}
          </div>

          {/* Google */}
          <button className="su-google-btn" onClick={handleGoogle} disabled={loading}>
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>

          <div className="su-divider">
            <div className="su-divider-line" />
            <span className="su-divider-text">or continue with email</span>
            <div className="su-divider-line" />
          </div>

          <form onSubmit={handleSignUp} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label className="su-label">Email address</label>
              <input className="su-input" type="email" value={email}
                onChange={e => setEmail(e.target.value)} required placeholder="you@sportsteam.com" />
            </div>
            <div>
              <label className="su-label">Password</label>
              <input className="su-input" type="password" value={password}
                onChange={e => setPassword(e.target.value)} required placeholder="6+ characters" minLength={6} />
            </div>
            <button className="su-submit-btn" type="submit" disabled={loading}>
              {loading ? 'Creating account…' : 'Create Free Account'}
            </button>
          </form>

          <p className="su-switch">
            Already have an account? <a href="/login">Sign in</a>
          </p>

          <p className="su-footer">© 2026 SportShield · Google Solutions Challenge</p>
        </div>
      </div>
    </>
  );
}
