# SportShield — One-Page Feature Summary

## Purpose
Protect sports media by fingerprinting assets, scanning the web for unauthorized copies, detecting AI-generated images, alerting owners, and supporting takedown/DMCA workflows.

## Architecture
- Backend: FastAPI (`backend/`) with CORS and scheduler.
- Frontend: Next.js (`frontend/`) single-page dashboard and upload UI.
- Storage & DB: Cloudinary for media, Firestore for realtime data.
- Integrations: SerpAPI (reverse image), HuggingFace (AI detection, optional), Twilio (WhatsApp bot), Brevo (transactional email).

## Backend APIs (summary)
- `POST /api/media/upload` — upload image/video, compute pHash (images), store asset, start background scan. Returns asset metadata and pHash.
- `POST /api/media/scan-url` — extract image from public social/web URL (og:image), upload, fingerprint, start scan.
- `GET  /api/media/assets` — list user's assets.
- `GET  /api/alerts` — list unread alerts for user.
- `PUT  /api/alerts/{alert_id}/read` — mark alert as read.
- `POST /api/contact/send` — contact form → sends email via Brevo (dev fallback logs message).
- `POST /api/contact/report-owner` — DMCA-style notice to likely site owner addresses; emails team (via Brevo).
- `POST /api/whatsapp/webhook` — Twilio webhook: acknowledges immediately, scans in background, and proactively replies with results.
- `GET  /health` — health check.

## Core Backend Services
- Fingerprinting: `services/fingerprint.py` — `compute_phash(image_bytes)`, `compare_hashes`.
- Reverse image search: `services/crawler.py` — SerpAPI `google_reverse_image` and `google_lens`, thumbnail pHash comparison, match scoring & severity.
- AI detection: `services/ai_detector.py` — HuggingFace inference for AI-generated image detection (graceful fallback if token missing).
- Cloudinary client: `services/cloudinary_client.py` — media upload and secure URL retrieval.
- Firestore client: `services/firebase_client.py` — server-side DB initialization from `GOOGLE_CREDENTIALS_JSON`.
- Scheduler: `services/scheduler.py` — daily rescan job that re-runs scans for existing assets.

## Frontend Features
- Dashboard (`pages/index.js`): protection score, stats (assets, matches, unread alerts, scanning), recent alerts, protected assets list.
- Upload (`pages/upload.js`): drag-and-drop file uploads, file validation, progress, pHash display; social/web URL extraction and scanning; public/private visibility toggle.
- Alerts (`pages/alerts.js`): realtime alert list, filters (all/unread/high/medium), confidence bar, takedown status dropdown, DMCA notice link.
- Realtime updates: client uses Firestore `onSnapshot` subscriptions (`frontend/lib/firebase.js`) for assets, alerts, scan_results, and public/community assets.
- Auth helper: `frontend/lib/useAuth.js` wraps Firebase Auth state and fetches user profile.

## Data Model (Firestore)
- `assets`: userId, filename, originalUrl, sourceUrl, type, phash, uploadedAt, status, scanCount, matchCount, isPublic, aiDetection, lastScannedAt, source.
- `scan_results`: assetId, userId, foundUrl, thumbnailUrl, confidence, severity, scannedAt, status.
- `alerts`: assetId, userId, scanResultId, confidence, foundUrl, thumbnailUrl, severity, isRead, createdAt, takedownStatus.

## Background & UX Flows
- Upload -> create asset record (pending) -> background thread: AI detection (optional) + reverse-image search -> create `scan_results` and `alerts` -> update asset status to `complete`.
- WhatsApp bot: immediate TwiML reply, background scan, proactive Twilio message with summary and links.
- Scheduler: daily rescan job increments `scanCount` and re-runs scans for all image assets.

## Legal/Takedown Features
- DMCA notice creation and report-to-owner flow (`/api/contact/report-owner`), attempts common owner emails and notifies team.
- Frontend takedown status tracking per alert and DMCA UI link; `jspdf` present for PDF/notice generation.

## Required environment variables (high-level)
- `SERPAPI_KEY`, `HF_TOKEN`, `CLOUDINARY_*`, `GOOGLE_CREDENTIALS_JSON`, Twilio (`TWILIO_*`), Brevo (`BREVO_SMTP_KEY`, `BREVO_SENDER_EMAIL`), `NEXT_PUBLIC_FIREBASE_*` for frontend.

## Dev notes & fallbacks
- Contact and Twilio sending log in dev mode if keys missing.
- CORS allows `*` by default (development-friendly).

## Where to look in the repo
- Backend entry and routers: `backend/main.py`, `backend/routers/*.py`.
- Core services: `backend/services/*.py`.
- Frontend pages and client: `frontend/pages/*`, `frontend/lib/*`.

---
Generated from source code inspection on 2026-06-08.
