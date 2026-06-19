# SportShield

**AI-Powered Sports Content Protection Platform**

Protect your sports media. Detect unauthorized use. Prove ownership.

[![Live Demo](https://img.shields.io/badge/Live-sportshield--app-4ade80?style=flat-square)](https://sportshield--sportshield-app.us-central1.hosted.app)
[![Backend API](https://img.shields.io/badge/API-Cloud%20Run-blue?style=flat-square)](https://sportshield-api-117814433634.us-central1.run.app)

---

## What It Does

SportShield helps athletes, sports media companies, and content creators protect their digital assets. Upload images, videos, or audio — SportShield fingerprints them, monitors the web for unauthorized copies, generates DMCA takedowns, applies watermarks, and verifies ownership with cryptographic proof.

### Key Features

- **Perceptual Fingerprinting** — pHash + Meta PDQ for images, frame-level hashing for video, Chromaprint for audio
- **AI-Powered Web Scanning** — Reverse image search via SerpAPI + CLIP semantic vector search via Qdrant
- **Unauthorized Use Detection** — Real-time alerts with confidence scores and risk assessment
- **DMCA Takedown Generator** — Platform-specific takedown notices with batch filing
- **Visible & Invisible Watermarking** — PIL text overlay + LSB steganography + DWT-DCT-SVD forensic watermarks
- **AI-Generated Image Detection** — HuggingFace models for synthetic content identification
- **Deepfake Detection** — Dual-model analysis for manipulated media
- **C2PA Content Credentials** — Industry-standard cryptographic provenance signing
- **Ownership Certificates** — PDF certificates with perceptual fingerprint proof
- **Weekly Protection Reports** — Gemini AI-generated narrative summaries with PDF export
- **Content Licensing** — Create and manage usage licenses for your assets
- **Scheduled Monitoring** — APScheduler-driven periodic re-scans
- **Email & WhatsApp Alerts** — Real-time notifications via Gmail SMTP and Twilio
- **Browser Extension** — Chrome/Brave extension (Manifest V3) for right-click protect and monitoring
- **Analytics Dashboard** — Scan activity, risk trends, protection score tracking
- **Demo Mode** — Full walkthrough with sample data at `/?demo=true`

---

## Google Technologies

Built for the **Google Solutions Challenge** — 9 Google technologies integrated:

| # | Technology | Usage |
|---|-----------|-------|
| 1 | **Google Cloud Run** | Hosts the FastAPI backend with auto-scaling |
| 2 | **Google Cloud Storage** | Stores uploaded media assets (GCS bucket) |
| 3 | **Firebase Authentication** | Email/password + Google sign-in for users |
| 4 | **Cloud Firestore** | Real-time NoSQL database for all app data |
| 5 | **Firebase App Hosting** | Hosts the Next.js SSR frontend |
| 6 | **Gemini 2.0 Flash** | AI chatbot + weekly report narrative generation |
| 7 | **Vertex AI** | Multimodal embeddings for semantic content search |
| 8 | **Cloud Vision API** | Image authenticity and AI-generated content analysis |
| 9 | **Gmail SMTP** | Email alert notifications and DMCA delivery |

---

## Tech Stack

### Backend (`backend/`)

| Layer | Technology |
|-------|-----------|
| Framework | FastAPI (Python 3.12) |
| Database | Cloud Firestore |
| Storage | Google Cloud Storage (fallback: Cloudinary) |
| Auth | Firebase Admin SDK |
| AI/ML | Gemini 2.0 Flash, Vertex AI, Cloud Vision, HuggingFace |
| Search | SerpAPI (reverse image), Qdrant Cloud (vector search) |
| Email | Gmail SMTP (App Password) |
| WhatsApp | Twilio Sandbox |
| Scheduling | APScheduler |
| Video | OpenCV (frame extraction) |
| Audio | Chromaprint (fingerprinting) |

### Frontend (`frontend/`)

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (Pages Router) |
| UI | React 19 + inline styles + `ap-*` CSS classes |
| Auth | Firebase Auth (client SDK) |
| State | Firestore real-time listeners (`onSnapshot`) |
| Charts | Recharts |
| PDF | jsPDF |
| Notifications | react-hot-toast |

### Browser Extension (`extension/`)

| Layer | Technology |
|-------|-----------|
| Manifest | Chrome Manifest V3 |
| Features | Right-click protect, monitoring dashboard, badge alerts |

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    CLIENTS                           │
│  Next.js Web App  │  Browser Extension  │  WhatsApp │
└────────┬──────────────────┬──────────────────┬──────┘
         │                  │                  │
┌────────▼──────────────────▼──────────────────▼──────┐
│              FastAPI Backend (Cloud Run)             │
│   /api/media · /api/alerts · /api/reports           │
│   /api/gemini · /api/url-monitor · /api/settings    │
│   /api/contact · /api/whatsapp · /api/admin         │
└──┬──────┬──────┬──────┬──────┬──────┬───────────────┘
   │      │      │      │      │      │
   ▼      ▼      ▼      ▼      ▼      ▼
Firestore  GCS   Gemini  Vertex  Vision  Qdrant
           │      AI      AI     API    Cloud
           │
      Gmail SMTP / Twilio
```

---

## Getting Started

### Prerequisites

- Python 3.12+
- Node.js 18+
- Firebase project with Firestore + Auth enabled
- Google Cloud project with APIs enabled

### Backend Setup

```bash
cd backend
pip install -r requirements.txt

# Create .env with your credentials (see Environment Variables below)
python -m uvicorn main:app --reload --port 8000
```

### Frontend Setup

```bash
cd frontend
npm install

# Create .env.local with your Firebase config (see Environment Variables below)
npm run dev   # http://localhost:3000
```

---

## Environment Variables

### `backend/.env`

```env
# Firebase / GCP
FIREBASE_PROJECT_ID=your-project-id
GOOGLE_CREDENTIALS_JSON={"type":"service_account",...}
GCP_PROJECT=your-project-id
GCP_LOCATION=us-central1

# Storage
STORAGE_BACKEND=gcs
GCS_BUCKET=your-bucket-name
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...

# AI
GEMINI_API_KEY=...
EMBEDDINGS_BACKEND=vertex
AI_DETECTOR_BACKEND=vision
HF_TOKEN=...

# Search
SERPAPI_KEY=...

# Notifications
GMAIL_ADDRESS=...
GMAIL_APP_PASSWORD=...
```

### `frontend/.env.local`

```env
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## Deployment (Google Cloud)

### Backend → Cloud Run

```bash
cd backend
gcloud run deploy sportshield-api \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 1Gi
```

Set env vars via Cloud Run console or `--set-env-vars`.

### Frontend → Firebase App Hosting

1. Firebase Console → Build → App Hosting → connect GitHub repo
2. Set app root to `frontend`, branch `main`
3. Configure `NEXT_PUBLIC_*` env vars in `apphosting.yaml`
4. Deploy — gives you a `*.hosted.app` URL

### Cloud Storage

```bash
gsutil mb -l us-central1 gs://your-bucket-name
```

### Enable GCP APIs

```bash
gcloud services enable \
  run.googleapis.com \
  aiplatform.googleapis.com \
  vision.googleapis.com \
  storage.googleapis.com \
  firebase.googleapis.com \
  generativelanguage.googleapis.com
```

---

## Firestore Collections

| Collection | Purpose |
|-----------|---------|
| `users` | Profile, settings, trusted domains, alert preferences |
| `assets` | Uploaded media with fingerprints, scores, and status |
| `scan_results` | Individual match results from web scans |
| `alerts` | Unauthorized use detections with severity and confidence |
| `dmca_notices` | Generated takedown notices with status tracking |
| `licenses` | Content usage licenses |
| `reports` | Weekly protection reports with AI narratives |

---

## Project Structure

```
sportshield/
├── backend/
│   ├── main.py                 # FastAPI app, mounts 9 routers
│   ├── config.py               # Environment variable loader
│   ├── Dockerfile              # Cloud Run deployment
│   ├── requirements.txt
│   ├── routers/
│   │   ├── media.py            # Upload, scan, watermark, DMCA endpoints
│   │   ├── alerts.py           # Alert management
│   │   ├── reports.py          # Weekly protection reports
│   │   ├── gemini.py           # AI chatbot
│   │   ├── url_monitor.py      # Manual URL monitoring
│   │   ├── settings.py         # User preferences
│   │   ├── contact.py          # Contact form
│   │   ├── whatsapp.py         # Twilio WhatsApp bot
│   │   └── admin.py            # Admin operations
│   └── services/
│       ├── fingerprint.py      # pHash computation
│       ├── pdq_hasher.py       # Meta PDQ 256-bit hashing
│       ├── crawler.py          # SerpAPI reverse image search
│       ├── clip_search.py      # CLIP + Qdrant vector search
│       ├── watermark.py        # Visible watermarking
│       ├── invisible_watermark.py  # LSB steganography
│       ├── forensic_watermark.py   # DWT-DCT-SVD forensic watermark
│       ├── c2pa_credentials.py # C2PA content credentials
│       ├── ai_detector.py      # AI-generated image detection
│       ├── deepfake_detector.py # Deepfake analysis
│       ├── video_fingerprint.py # OpenCV frame extraction
│       ├── music_detector.py   # Audio fingerprinting
│       ├── dmca_generator.py   # DMCA notice templates
│       ├── risk_score.py       # Composite risk scoring
│       ├── report_generator.py # Weekly report generation
│       ├── email_alerts.py     # Gmail SMTP notifications
│       ├── domain_classifier.py # Trusted domain classification
│       ├── licensing.py        # License management
│       ├── scheduler.py        # APScheduler background jobs
│       └── firebase_client.py  # Firestore client init
├── frontend/
│   ├── pages/
│   │   ├── index.js            # Dashboard
│   │   ├── landing.jsx         # Public marketing page
│   │   ├── upload.js           # Asset upload
│   │   ├── assets/[id].js      # Asset detail with all feature cards
│   │   ├── alerts.js           # Alert feed
│   │   ├── analytics.js        # Charts and trends
│   │   ├── reports.js          # Weekly protection reports
│   │   ├── settings.js         # User preferences
│   │   ├── certificate/[id].js # Ownership certificate PDF
│   │   ├── dmca/[alertId].js   # DMCA notice composer
│   │   └── ...                 # Login, signup, onboarding, etc.
│   ├── components/
│   │   ├── ChatWidget.jsx      # AI chatbot (demo mode)
│   │   ├── ProfileAvatar.jsx   # User nav menu
│   │   └── landing/            # Hero, Sections, Footer, Navbar
│   └── lib/
│       ├── firebase.js         # Firebase init + Firestore subscriptions
│       ├── useAuth.js          # Auth hook
│       └── demoData.js         # Demo mode sample data
└── extension/
    ├── manifest.json           # Chrome Manifest V3
    ├── popup.html/js           # Extension popup UI
    ├── background.js           # Service worker
    └── content.js              # Content script
```

---

## Team

**DesiCodingClub** — Google Solutions Challenge 2025

---

## License

This project is built for the Google Solutions Challenge hackathon.
