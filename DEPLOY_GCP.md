# Deploying SportShield on Google Cloud

This migrates hosting to GCP and enables the optional GCP services. Everything
is **additive and flag-gated** — until you set the flags and deploy, the app
behaves exactly as it does on Render + Vercel + Cloudinary.

Project: `sportshield-app` · Region used below: `us-central1`

---

## 0. One-time setup

```bash
gcloud config set project sportshield-app
gcloud services enable \
  run.googleapis.com \
  aiplatform.googleapis.com \
  vision.googleapis.com \
  storage.googleapis.com \
  firebase.googleapis.com
```

Grant the Cloud Run runtime service account the roles the GCP features need:

```bash
PROJECT_NUMBER=$(gcloud projects describe sportshield-app --format='value(projectNumber)')
SA="$PROJECT_NUMBER-compute@developer.gserviceaccount.com"
gcloud projects add-iam-policy-binding sportshield-app --member="serviceAccount:$SA" --role=roles/aiplatform.user
gcloud projects add-iam-policy-binding sportshield-app --member="serviceAccount:$SA" --role=roles/storage.objectAdmin
```

---

## 1. Backend → Cloud Run

Cloud Run builds from `backend/Dockerfile` automatically.

```bash
cd backend
gcloud run deploy sportshield-api \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 1Gi \
  --set-env-vars "GEMINI_API_KEY=...,SERPAPI_KEY=...,HF_TOKEN=...,\
CLOUDINARY_CLOUD_NAME=...,CLOUDINARY_API_KEY=...,CLOUDINARY_API_SECRET=...,\
BREVO_SMTP_KEY=...,BREVO_SENDER_EMAIL=...,FIREBASE_PROJECT_ID=sportshield-app,\
QDRANT_URL=...,QDRANT_API_KEY=...,\
GCP_PROJECT=sportshield-app,GCP_LOCATION=us-central1"
```

`GOOGLE_CREDENTIALS_JSON` is large — store it in Secret Manager and mount it:

```bash
gcloud secrets create google-credentials --data-file=backend/.env.googlecreds.json
gcloud run services update sportshield-api --region us-central1 \
  --set-secrets "GOOGLE_CREDENTIALS_JSON=google-credentials:latest"
```

The command prints a service URL like `https://sportshield-api-xxxx.run.app`.
**Copy it** — the frontend needs it as `NEXT_PUBLIC_API_URL`.

---

## 2. Cloud Storage (replace Cloudinary)  — flag: `STORAGE_BACKEND=gcs`

```bash
gsutil mb -l us-central1 gs://sportshield-app-media
gcloud storage buckets add-iam-policy-binding gs://sportshield-app-media \
  --member=allUsers --role=roles/storage.objectViewer
```

Turn it on:

```bash
gcloud run services update sportshield-api --region us-central1 \
  --update-env-vars "STORAGE_BACKEND=gcs,GCS_BUCKET=sportshield-app-media"
```

Uploads now go to GCS. If a GCS upload fails, the code auto-falls back to Cloudinary.

---

## 3. Vertex AI embeddings  — flag: `EMBEDDINGS_BACKEND=vertex`

```bash
gcloud run services update sportshield-api --region us-central1 \
  --update-env-vars "EMBEDDINGS_BACKEND=vertex"
```

Uses `multimodalembedding@001` at 512-dim (compatible with the existing Qdrant
collection). Falls back to HuggingFace CLIP on any failure.

---

## 4. Cloud Vision  — flag: `AI_DETECTOR_BACKEND=vision`

```bash
gcloud run services update sportshield-api --region us-central1 \
  --update-env-vars "AI_DETECTOR_BACKEND=vision"
```

Image authenticity analysis runs through Cloud Vision; falls back to HuggingFace on error.

---

## 5. Frontend → Firebase App Hosting (Hosting + Cloud Run)

App Hosting builds the Next.js app and serves SSR on Cloud Run behind Firebase Hosting.

1. In the Firebase console → **Build → App Hosting → Get started**.
2. Connect this GitHub repo, branch `main`, and set the **app root to `frontend`**.
3. App Hosting reads `frontend/apphosting.yaml`. Fill its `NEXT_PUBLIC_*` values
   (from `frontend/.env.local`) and set `NEXT_PUBLIC_API_URL` to the Cloud Run
   URL from step 1.
4. Roll out. App Hosting gives you a `*.web.app` URL; add your custom domain there.

CLI alternative:

```bash
firebase experiments:enable webframeworks
firebase apphosting:backends:create --project sportshield-app
```

---

## Rollback

Each piece is independent. Pick the smallest revert that fixes the problem.

### Fastest — flip the flag (no code change, ~30s redeploy)
| Feature | Revert env change |
|---|---|
| Cloud Storage | `STORAGE_BACKEND=cloudinary` |
| Vertex embeddings | `EMBEDDINGS_BACKEND=clip` |
| Cloud Vision | `AI_DETECTOR_BACKEND=huggingface` |

```bash
gcloud run services update sportshield-api --region us-central1 \
  --update-env-vars "STORAGE_BACKEND=cloudinary,EMBEDDINGS_BACKEND=clip,AI_DETECTOR_BACKEND=huggingface"
```

### Revert the code commit
Each feature is its own commit:

| Feature | Commit |
|---|---|
| Cloud Storage adapter | `4740a4b` |
| Vertex embeddings | `0be183f` |
| Cloud Vision | `0311ba5` |
| Cloud Run Dockerfile | `381b2c2` |
| Firebase App Hosting | `6561efe` |

```bash
git revert <commit>      # e.g. git revert 0be183f
git push origin main
```

### Full rollback to the old stack
Render and Vercel are untouched and still running. To return entirely:
- Keep serving from Render (backend) and Vercel (frontend).
- Set the frontend's `NEXT_PUBLIC_API_URL` back to the Render URL
  (`https://sportshield-13rj.onrender.com`).
- Leave all GCP flags at their defaults.
