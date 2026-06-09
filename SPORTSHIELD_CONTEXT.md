# SportShield — Full Project Context

## Overview

**SportShield** is a sports media protection platform that detects unauthorized use of protected images and videos across the web. Athletes, sports media companies, and content creators upload their assets, and SportShield monitors the web for unauthorized copies, generates DMCA takedowns, applies watermarks, and verifies ownership.

**Tagline**: "Protect your sports media. Detect unauthorized use. Prove ownership."

---

## Tech Stack

### Backend (`backend/`)
- **Framework**: FastAPI (Python 3.12)
- **Database**: Firebase Firestore
- **Storage**: Cloudinary (images/videos)
- **Auth**: Firebase Admin SDK (service account)
- **AI Models**: HuggingFace Inference API (free tier)
- **Search**: SerpAPI (Google reverse image)
- **Email**: Brevo SMTP
- **WhatsApp**: Twilio Sandbox
- **Scheduling**: APScheduler (background jobs)
- **Video**: OpenCV (frame extraction)
- **Music**: AudD API (audio fingerprinting)

### Frontend (`frontend/`)
- **Framework**: Next.js 16 (Pages Router — NOT App Router)
- **UI**: React 19 + inline styles + `ap-*` CSS classes (NOT Tailwind for app pages; landing uses Tailwind)
- **Auth**: Firebase Auth (email/password + Google sign-in)
- **State**: Firestore real-time listeners (`onSnapshot`)
- **Charts**: Recharts
- **Toasts**: react-hot-toast
- **PDF**: jsPDF

---

## Environment Variables

### `backend/.env`
```
CLOUDINARY_CLOUD_NAME=<your-cloudinary-cloud-name>
CLOUDINARY_API_KEY=<your-cloudinary-api-key>
CLOUDINARY_API_SECRET=<your-cloudinary-api-secret>
SERPAPI_KEY=<your-serpapi-key>
BREVO_SMTP_KEY=<your-brevo-smtp-key>
FIREBASE_PROJECT_ID=<your-firebase-project-id>
GOOGLE_CREDENTIALS_JSON={...service account JSON...}
HF_TOKEN=<your-huggingface-token>
```

### `frontend/.env.local`
```
NEXT_PUBLIC_FIREBASE_API_KEY=<your-firebase-web-api-key>
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=<project>.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=<project-id>
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=<project>.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=<sender-id>
NEXT_PUBLIC_FIREBASE_APP_ID=<app-id>
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## Backend Architecture

### Entry Point: `backend/main.py`
Mounts 5 routers under `/api/`:
- `/api/media` — uploads, scans, watermarks, all S1-S16 features
- `/api/alerts` — alert management (read/dismiss)
- `/api/contact` — contact form
- `/api/whatsapp` — WhatsApp notifications via Twilio
- `/api/settings` — trusted domains, user prefs

### Services (`backend/services/`)
| File | Feature | Description |
|------|---------|-------------|
| `firebase_client.py` | — | Firestore client init with `load_dotenv()` |
| `cloudinary_client.py` | — | Cloudinary upload helper |
| `fingerprint.py` | S6 | pHash via `imagehash` library |
| `crawler.py` | S1 | SerpAPI reverse image search + URL scraping |
| `watermark.py` | S2 | Visible watermark (email/session burned in) |
| `ai_detector.py` | S3 | AI-generated image detection (HuggingFace) |
| `video_fingerprint.py` | S4 | OpenCV frame extraction + pHash per frame |
| `invisible_watermark.py` | S5 | LSB steganography (hidden payload in pixels) |
| `dmca_generator.py` | S7 | DMCA notice templates per platform |
| `propagation_tracker.py` | S8 | Build timeline + spread map from scan results |
| `risk_score.py` | S9 | Composite risk score 0-100 |
| `deepfake_detector.py` | S10 | Dual-model deepfake detection (HF) |
| `blockchain_timestamp.py` | S11 | SHA-256 + HMAC ownership proof |
| `scheduled_scanner.py` | S12 | APScheduler periodic re-scans |
| `music_detector.py` | S13 | AudD API music recognition |
| `licensing.py` | S14 | License creation/verification |
| `domain_classifier.py` | S15 | Trusted-domain → authorized/unauthorized |
| `email_alerts.py` | S16 | Brevo SMTP HTML email alerts |
| `scheduler.py` | — | Legacy APScheduler init |

### Key Endpoints in `routers/media.py`
- `POST /upload` — handles image/video/audio, runs all detection in parallel threads
- `POST /scan-url` — scrape an Instagram/Twitter URL, extract image, scan
- `GET /assets` — list user's assets
- `GET /watermarked/{id}` — on-demand watermarked copy
- `GET /propagation/{id}` — spread map
- `POST /deepfake-check/{id}` — run deepfake on existing asset
- `POST /invisible-watermark/{id}` — embed LSB watermark
- `POST /extract-watermark` — read LSB watermark from uploaded file
- `POST /video-compare/{id}` — match video frames vs other assets
- `POST /music-detect/{id}` — identify music in audio/video
- `POST /dmca-batch/{id}` — generate DMCAs for all unauthorized matches
- `GET /proof/{id}` / `GET /proof-certificate/{id}` — ownership proof
- `POST /schedule/{id}` — enable scheduled re-scans (hourly interval)
- `POST /license/{id}` — create license
- `POST /alert-settings` — configure email alerts

---

## Frontend Pages

| Page | Path | Purpose |
|------|------|---------|
| Landing | `/landing` (Tailwind) | Marketing page with Hero, Sections, Footer |
| Dashboard | `/` (index.js) | Main authenticated home — assets table, alerts, stats |
| Asset Detail | `/assets/[id]` | All 16 feature cards per asset |
| Alerts | `/alerts` | Alert feed with risk badges |
| Analytics | `/analytics` | Charts of scan activity, risk trends |
| Upload | `/upload` | Drag-drop upload UI |
| Settings | `/settings` | Profile, email alerts (S16), trusted domains, sensitivity |
| Onboarding | `/onboarding` | First-login flow |
| Login / Signup | `/login`, `/signup` | Firebase Auth |
| Certificate | `/certificate/[id]` | Printable ownership certificate |
| DMCA | `/dmca/[alertId]` | DMCA notice composer |
| Public Dashboard | `/public-dashboard` | Community-visible assets |
| About / Features / Contact / Resources | static info pages |

### Components (`frontend/components/`)
- `ProfileAvatar.jsx` — top-nav user menu
- `landing/Hero.jsx`, `Sections.jsx`, `Footer.jsx`, `Navbar.jsx`, etc. — landing page sections

### Lib (`frontend/lib/`)
- `firebase.js` — Firebase init, Firestore helpers (`subscribeToAssets`, `subscribeToAlerts`, etc.)
- `useAuth.js` — auth hook

---

## The 16 Solution Features (all DONE)

| ID | Feature | Status |
|----|---------|--------|
| S1 | Reverse Image Search (SerpAPI) | ✅ |
| S2 | Visible Watermarking (PIL text overlay) | ✅ |
| S3 | AI-Generated Image Detection (HF) | ✅ |
| S4 | Video Source Detection (OpenCV frames) | ✅ |
| S5 | Invisible Watermarking (LSB steganography) | ✅ |
| S6 | Perceptual Hashing (pHash) | ✅ |
| S7 | DMCA Takedown Notice Generator | ✅ |
| S8 | Content Propagation Tracking (timeline + graph) | ✅ |
| S9 | Composite Risk Score (volume + confidence + severity + AI) | ✅ |
| S10 | Deepfake Detection (dual-model HF) | ✅ |
| S11 | Blockchain Timestamping / Proof of Ownership (SHA-256 + HMAC) | ✅ |
| S12 | Scheduled Re-scanning (APScheduler) | ✅ |
| S13 | Music / Audio Detection (AudD API) | ✅ |
| S14 | Content Licensing Management | ✅ |
| S15 | Authorized vs Unauthorized Classification (trusted domains) | ✅ |
| S16 | Email Alert Notifications (Brevo SMTP) | ✅ |

---

## Firestore Collections

- **`users/{userId}`** — profile, settings, trusted domains, alert email
- **`assets/{assetId}`** — uploaded media: `userId`, `filename`, `originalUrl`, `watermarkedUrl`, `invisibleWmUrl`, `type` (image/video/audio), `phash`, `videoFingerprint`, `musicAnalysis`, `aiDetection`, `deepfakeAnalysis`, `ownershipProof`, `riskScore`, `riskBreakdown`, `matchCount`, `unauthorizedCount`, `monitoringEnabled`, `status`, `dmcaCount`, `isPublic`
- **`scan_results/{resultId}`** — each match: `assetId`, `foundUrl`, `thumbnailUrl`, `confidence`, `classification` (authorized/unauthorized), `domain`, `platformType`, `propagationOrder`
- **`alerts/{alertId}`** — unauthorized detections: `confidence`, `riskScore`, `severity`, `isRead`
- **`dmca_notices/{dmcaId}`** — generated takedown notices with status workflow
- **`licenses/{licenseId}`** — content licenses
- **`watermark_downloads`** — audit log

---

## Running Locally

### Backend
```bash
cd backend
pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev   # http://localhost:3000
```

### `.claude/launch.json` (preview servers configured)
- `backend` (port 8000)
- `frontend` (port 3000)

---

## Deployment

- **Backend**: Render (`https://sportshield-13rj.onrender.com`)
- **Frontend**: typically Vercel (when prod)
- Set `NEXT_PUBLIC_API_URL` to backend URL for prod builds

---

## Known Quirks / Gotchas

1. **HuggingFace cold starts** — Free-tier models take ~30s on first request; deepfake card has retry UI
2. **Firestore composite indexes** — Some compound queries (e.g. `assetId + scannedAt`) need index creation in Firebase Console
3. **OpenCV optional** — Video fingerprint falls back to GIF-only mode if `opencv-python-headless` not installed
4. **Next.js 16 Pages Router** — NOT App Router; per project AGENTS.md, check `node_modules/next/dist/docs/` before relying on training data
5. **`load_dotenv()` in `firebase_client.py`** — needed because it loads before `config.py`
6. **Inline styles + `ap-*` classes** — App pages do NOT use Tailwind; only landing page does
7. **Demo user** — All uploads currently default to `user_id="demo_user"` (single-user demo mode)

---

## Current Session Status

- All 16 features done
- Both servers running locally
- Asset detail page has cards for: pHash, Deepfake, Risk Score, Invisible Watermark, Video Fingerprint (video), Music Detection (audio/video), Propagation Map, Proof of Ownership, Monitoring, DMCA Takedown, Content Licensing, Scan Results
- Settings page has Email Alert Notifications card (S16)
- Last user request: build a browser extension — discussed but not yet started
- Most recent ask: add an "Add Extension to Browser" button on dashboard + landing page (UI only, no functionality)

---

## File Tree (key files)

```
sportshield/
├── CLAUDE.md                        # project instructions (graphify rules)
├── .claude/launch.json              # preview server configs
├── graphify-out/                    # knowledge graph (if generated)
├── backend/
│   ├── main.py                      # FastAPI app, mounts 5 routers
│   ├── config.py                    # env var loader
│   ├── requirements.txt
│   ├── .env                         # secrets (Cloudinary, Firebase, etc.)
│   ├── routers/
│   │   ├── media.py                 # HUGE — all S1-S16 endpoints
│   │   ├── alerts.py
│   │   ├── contact.py
│   │   ├── whatsapp.py
│   │   └── settings.py
│   └── services/                    # 17 service modules (one per feature + helpers)
└── frontend/
    ├── package.json                 # Next 16, React 19, Firebase, recharts, jspdf
    ├── .env.local                   # Firebase + API_URL
    ├── pages/
    │   ├── index.js                 # Dashboard
    │   ├── landing.jsx              # Marketing landing
    │   ├── assets/[id].js           # Asset detail — all feature cards
    │   ├── settings.js              # Profile + email alerts
    │   ├── alerts.js, analytics.js, upload.js, ...
    ├── components/
    │   ├── ProfileAvatar.jsx
    │   └── landing/                 # Hero, Sections, Footer, etc.
    └── lib/
        ├── firebase.js              # Firestore subscriptions
        └── useAuth.js
```
