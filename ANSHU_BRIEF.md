# SportShield — Flutter Dev Brief for Anshu

## Current State (Web + Backend — fully deployed)

The web app and FastAPI backend are live. Everything below is working and tested.

**Live URLs:**
- Frontend: https://sportshield-rouge.vercel.app
- GitHub: https://github.com/sarasinghrse/sportshield

---

## Backend API Endpoints (use these in Flutter)

Base URL: your Render backend URL (ask Sara)

### Media
```
POST /api/media/upload
  — multipart/form-data, field: "file"
  — Returns: { id, assetId, filename, url, originalUrl, phash, status }

POST /api/media/scan-url
  — body: { url: string, label?: string }
  — Extracts og:image from any public Instagram/Twitter/web URL and scans it
  — Returns same shape as upload

GET  /api/media/assets
  — Returns all assets for demo_user
```

### Alerts
```
GET  /api/alerts            — list all alerts
POST /api/alerts/{id}/read  — mark alert as read
```

### Contact
```
POST /api/contact/send
  — body: { name, email, subject?, message }
  — Sends email to team via Brevo

POST /api/contact/report-owner
  — body: { url, confidence, asset_name }
  — Sends auto DMCA notice to the violating site's webmaster
```

### Health
```
GET /health  — returns { status: "ok" }
```

---

## Firebase Structure

**Project:** same Firebase project as web (Sara has the credentials)

```
firestore/
  assets/
    {assetId}/
      userId:        "demo_user"
      filename:      string
      originalUrl:   string        ← Cloudinary CDN URL
      sourceUrl?:    string        ← if scanned from social URL
      type:          "image" | "video"
      phash:         string        ← 64-bit perceptual hash
      status:        "pending" | "scanning" | "complete" | "error"
      scanCount:     number
      matchCount:    number
      uploadedAt:    timestamp
      lastScannedAt: timestamp
      isPublic:      bool          ← true = visible on community dashboard
      aiDetection:   {             ← populated after scan
        is_ai:       bool,
        confidence:  float,
        label:       "AI-Generated" | "Authentic" | "unknown"
      }
      source:        "upload" | "social_url"

  alerts/
    {alertId}/
      assetId:       string
      userId:        "demo_user"
      confidence:    float (0–1)
      foundUrl:      string
      thumbnailUrl:  string
      severity:      "low" | "medium" | "high"
      isRead:        bool
      createdAt:     timestamp

  scan_results/
    {resultId}/
      assetId, userId, foundUrl, thumbnailUrl,
      confidence, severity, scannedAt, status
```

---

## Key Features Built (Web)

| Feature | Status | Notes |
|---|---|---|
| Upload image/video | ✅ Live | Fingerprints with pHash, triggers background scan |
| Social URL scan | ✅ Live | Paste any Instagram/Twitter URL, extracts og:image |
| AI-generated image detection | ✅ Live | HuggingFace `Organika/sdxl-detector` — auto runs after upload |
| Reverse image search | ✅ Live | SerpAPI Google Reverse Image + Google Lens |
| DMCA notice generator | ✅ Live | `/dmca/[alertId]` page |
| Ownership certificate | ✅ Live | `/certificate/[id]` page |
| Analytics dashboard | ✅ Live | Recharts, violation trends |
| Public community dashboard | ✅ Live | `/public-dashboard` — no login needed |
| Verify URL tool | ✅ Live | `/verify` — public, checks against violations DB |
| Contact form email | ✅ Live | Sends to both team emails via Brevo |
| Auto DMCA to site owner | ✅ Live | Emails webmaster@/admin@/dmca@ of flagged domain |
| Responsive web | ✅ Live | Mobile navbar with hamburger, all grids responsive |
| Features page | ✅ Live | `/features` with anchor sections per feature |
| Resources page | ✅ Live | `/resources` — copyright guide, DMCA walkthrough, licensing |

---

## Flutter App — What to Build

The Flutter app should mirror the core web experience. Suggested screens:

### Must-have screens

1. **Splash / Onboarding** — SportShield branding, brief feature overview
2. **Login / Register** — Firebase Auth (same project as web)
3. **Dashboard** — protection score ring, stats (assets, alerts, matches), recent alerts list
4. **Upload** — pick from gallery/camera, public/private toggle, upload progress
5. **Assets list** — thumbnail grid, status badges, tap to view detail
6. **Asset detail** — pHash display, AI detection result, scan results with confidence bars, DMCA button
7. **Alerts** — list of unread alerts, dismiss/read, link to found URL
8. **Verify URL** — text input, check button, clean/flagged result + report button
9. **Community** — public dashboard feed (read-only, no auth needed)
10. **Settings** — scan threshold slider, notification prefs

### Nice-to-have

- **Social URL scan** — paste Instagram/Twitter URL, calls `/api/media/scan-url`
- **Push notifications** — new alert triggers FCM notification (Firebase Cloud Messaging)
- **Certificate viewer** — render ownership certificate with QR code
- **Share sheet** — share certificate or violation report as PDF

---

## Calling the Backend from Flutter

Simple example using `http` package:

```dart
// Upload a file
final request = http.MultipartRequest(
  'POST',
  Uri.parse('$backendUrl/api/media/upload'),
);
request.files.add(await http.MultipartFile.fromPath('file', filePath));
final response = await request.send();
final body = jsonDecode(await response.stream.bytesToString());
// body['id'] is the assetId — save to track in Firestore

// Scan a social URL
final res = await http.post(
  Uri.parse('$backendUrl/api/media/scan-url'),
  headers: {'Content-Type': 'application/json'},
  body: jsonEncode({'url': pastedUrl, 'label': 'Instagram post'}),
);

// Mark alert as read
await http.post(Uri.parse('$backendUrl/api/alerts/$alertId/read'));
```

After upload, listen to the Firestore document for real-time status updates:

```dart
FirebaseFirestore.instance
  .collection('assets')
  .doc(assetId)
  .snapshots()
  .listen((snap) {
    final status = snap['status']; // "pending" → "scanning" → "complete"
    final aiResult = snap['aiDetection']; // { is_ai, confidence, label }
  });
```

---

## Environment / Secrets Anshu Needs

Ask Sara for:
- `google-services.json` — Firebase config for Android
- `GoogleService-Info.plist` — Firebase config for iOS
- `BACKEND_URL` — the Render backend base URL

Everything else (Cloudinary, SerpAPI, Brevo, HuggingFace) is **server-side only** — Flutter never calls those services directly, only through the FastAPI backend.

---

## Auth Note

The web app currently uses `"demo_user"` hardcoded for the MVP (no real multi-user auth on backend yet). For Flutter, use Firebase Auth on the client side, but all Firestore queries will still filter by `"demo_user"` until the backend is updated to use real user IDs. For the Google Solutions Challenge demo this is completely fine.

---

## Design Tokens

| Token | Value |
|---|---|
| Primary green | `#1a5c1a` |
| Electric accent | `#4ade80` |
| Background | `#0a1210` |
| Card background | `rgba(12,24,14,0.88)` |
| Card border | `rgba(26,92,26,0.28)` |
| Muted text | `rgba(255,255,255,0.48)` |
| Error red | `#f87171` |
| Warning amber | `#fbbf24` |
| Heading font | Barlow Condensed, weight 800/900 |
| Body font | Barlow, weight 400/500 |

---

## Suggested Flutter Packages

```yaml
dependencies:
  firebase_core: latest
  firebase_auth: latest
  cloud_firestore: latest
  firebase_messaging: latest   # push notifications
  http: latest                 # API calls
  image_picker: latest         # gallery/camera upload
  cached_network_image: latest # Cloudinary thumbnails
  flutter_local_notifications: latest
  url_launcher: latest         # open foundUrl in browser
  share_plus: latest           # share certificates/reports
  google_fonts: latest         # Barlow + Barlow Condensed
```

---

*Generated: April 2026 · SportShield · Google Solutions Challenge 2026*
