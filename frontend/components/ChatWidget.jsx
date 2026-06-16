import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/router';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function ChatWidget() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const DEMO_QUESTION = "Hey, tell me about SportShield!";
  const DEMO_ANSWER = "SportShield is an AI-powered sports content protection platform built for the Google Solutions Challenge. It helps sports photographers, videographers, and broadcasters protect their media from unauthorized use.\n\nHere's what it does:\n\n• Upload & Protect — upload your sports images/videos, and we fingerprint and monitor them across the web.\n• Web Scanning — automated reverse image search finds unauthorized copies on pirate sites.\n• AI Detection — detects AI-generated or manipulated images using Cloud Vision.\n• DMCA Notices — one-click generation of legal takedown notices.\n• War Room — real-time piracy radar for live sports broadcasts.\n• Browser Extension — flag pirate sites and access your dashboard instantly.\n• WhatsApp Bot — send a photo and get a full scan back in 30 seconds.\n\nAgent coming up soon!";

  const [messages, setMessages] = useState([
    { role: 'model', text: "Hi! I'm the SportShield Assistant. Ask me anything about the platform — features, how to protect your media, or how to get started." },
  ]);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  const send = () => {
    if (sent || loading) return;
    setMessages(prev => [...prev, { role: 'user', text: DEMO_QUESTION }]);
    setLoading(true);
    setTimeout(() => {
      setMessages(prev => [...prev, { role: 'model', text: DEMO_ANSWER }]);
      setLoading(false);
      setSent(true);
    }, 1500);
  };

  return (
    <>
      <style>{`
        .cw-fab {
          position: fixed; bottom: 24px; right: 24px; z-index: 99999;
          width: 56px; height: 56px; border-radius: 50%;
          background: linear-gradient(135deg, #1a5c1a 0%, #237523 100%);
          border: 2px solid rgba(74,222,128,0.3);
          box-shadow: 0 4px 24px rgba(26,92,26,0.5), 0 0 0 0 rgba(74,222,128,0.4);
          cursor: pointer; display: flex; align-items: center; justify-content: center;
          transition: transform 0.2s, box-shadow 0.2s;
          animation: cw-pulse 2s infinite;
        }
        .cw-fab:hover { transform: scale(1.08); box-shadow: 0 6px 32px rgba(26,92,26,0.6); }
        @keyframes cw-pulse {
          0%, 100% { box-shadow: 0 4px 24px rgba(26,92,26,0.5), 0 0 0 0 rgba(74,222,128,0.4); }
          50% { box-shadow: 0 4px 24px rgba(26,92,26,0.5), 0 0 0 8px rgba(74,222,128,0); }
        }
        .cw-panel {
          position: fixed; bottom: 92px; right: 24px; z-index: 99999;
          width: 380px; max-height: 520px;
          background: #0a1210;
          border: 1px solid rgba(26,92,26,0.35);
          border-radius: 16px;
          box-shadow: 0 16px 64px rgba(0,0,0,0.6);
          display: flex; flex-direction: column;
          overflow: hidden;
          font-family: 'Barlow', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }
        .cw-header {
          padding: 16px 18px;
          background: linear-gradient(135deg, #0d1a10 0%, #122a14 100%);
          border-bottom: 1px solid rgba(26,92,26,0.3);
          display: flex; align-items: center; gap: 10px;
        }
        .cw-header-icon {
          width: 34px; height: 34px; border-radius: 10px;
          background: rgba(26,92,26,0.4);
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .cw-header-title {
          font-family: 'Barlow Condensed', sans-serif;
          font-weight: 800; font-size: 1rem; color: #fff;
        }
        .cw-header-sub { font-size: 0.7rem; color: rgba(255,255,255,0.4); }
        .cw-close {
          margin-left: auto; background: none; border: none;
          color: rgba(255,255,255,0.35); cursor: pointer; font-size: 18px; padding: 4px;
        }
        .cw-close:hover { color: #fff; }
        .cw-messages {
          flex: 1; overflow-y: auto; padding: 16px;
          display: flex; flex-direction: column; gap: 10px;
          min-height: 280px; max-height: 360px;
        }
        .cw-messages::-webkit-scrollbar { width: 4px; }
        .cw-messages::-webkit-scrollbar-thumb { background: rgba(26,92,26,0.3); border-radius: 4px; }
        .cw-msg {
          max-width: 85%; padding: 10px 14px; border-radius: 12px;
          font-size: 0.82rem; line-height: 1.5; word-wrap: break-word;
        }
        .cw-msg-user {
          align-self: flex-end;
          background: #1a5c1a; color: #d4e8d4;
          border-bottom-right-radius: 4px;
        }
        .cw-msg-bot {
          align-self: flex-start;
          background: rgba(13,26,16,0.8); color: rgba(255,255,255,0.8);
          border: 1px solid rgba(26,92,26,0.2);
          border-bottom-left-radius: 4px;
        }
        .cw-typing {
          align-self: flex-start;
          padding: 10px 14px;
          background: rgba(13,26,16,0.8);
          border: 1px solid rgba(26,92,26,0.2);
          border-radius: 12px; border-bottom-left-radius: 4px;
          display: flex; gap: 4px; align-items: center;
        }
        .cw-dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: #4ade80; opacity: 0.4;
          animation: cw-bounce 1.2s infinite;
        }
        .cw-dot:nth-child(2) { animation-delay: 0.2s; }
        .cw-dot:nth-child(3) { animation-delay: 0.4s; }
        @keyframes cw-bounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-6px); opacity: 1; }
        }
        .cw-input-row {
          padding: 12px 14px;
          border-top: 1px solid rgba(26,92,26,0.25);
          display: flex; gap: 8px;
          background: rgba(10,18,16,0.6);
        }
        .cw-input {
          flex: 1; background: rgba(255,255,255,0.06);
          border: 1px solid rgba(26,92,26,0.3);
          border-radius: 10px; padding: 10px 14px;
          color: #d4e8d4; font-size: 0.82rem; outline: none;
          font-family: 'Barlow', sans-serif;
        }
        .cw-input:focus { border-color: rgba(74,222,128,0.4); }
        .cw-input::placeholder { color: rgba(255,255,255,0.2); }
        .cw-send {
          width: 40px; height: 40px; border-radius: 10px;
          background: #1a5c1a; border: none; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: background 0.2s; flex-shrink: 0;
        }
        .cw-send:hover { background: #237523; }
        .cw-send:disabled { opacity: 0.4; cursor: not-allowed; }
        .cw-powered {
          text-align: center; padding: 6px; font-size: 0.62rem;
          color: rgba(255,255,255,0.2);
          border-top: 1px solid rgba(26,92,26,0.12);
        }
        @media (max-width: 480px) {
          .cw-panel { width: calc(100vw - 32px); right: 16px; bottom: 84px; }
          .cw-fab { bottom: 16px; right: 16px; }
        }
      `}</style>

      {open && (
        <div className="cw-panel">
          <div className="cw-header">
            <div className="cw-header-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
            </div>
            <div>
              <div className="cw-header-title">SportShield Assistant</div>
              <div className="cw-header-sub">Powered by Gemini</div>
            </div>
            <button className="cw-close" onClick={() => setOpen(false)}>✕</button>
          </div>

          <div className="cw-messages">
            {messages.map((m, i) => (
              <div key={i} className={`cw-msg ${m.role === 'user' ? 'cw-msg-user' : 'cw-msg-bot'}`}>
                {m.text}
              </div>
            ))}
            {loading && (
              <div className="cw-typing">
                <div className="cw-dot" /><div className="cw-dot" /><div className="cw-dot" />
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="cw-input-row">
            <input
              className="cw-input"
              value={sent ? 'Agent coming up soon!' : DEMO_QUESTION}
              readOnly
              onClick={() => !sent && send()}
              style={sent ? { opacity: 0.5, cursor: 'default' } : { cursor: 'pointer' }}
            />
            <button className="cw-send" onClick={send} disabled={sent || loading}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            </button>
          </div>

          <div className="cw-powered">Powered by Google Gemini</div>
        </div>
      )}

      <button className="cw-fab" onClick={() => setOpen(!open)} title="SportShield Assistant">
        {open ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
          </svg>
        )}
      </button>
    </>
  );
}
