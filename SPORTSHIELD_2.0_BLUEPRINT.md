# SportShield 2.0 — The Genius Build
### A research-backed blueprint to win any global competition in the sports anti-piracy space

> **Thesis:** The current SportShield protects *static images* (reverse image search + watermark + 16 helper features). That's a solid "top 100" product. But the **$28 billion/year** problem the entire industry is actually fighting is **live sports stream piracy** — and almost no hackathon team ever touches it because it's "too hard." We're going to touch it. We reposition SportShield from an image-theft tool into a **real-time, AI-powered, end-to-end content protection platform that closes the loop**: Protect → Detect → Trace → Enforce → Prove. Every piece is buildable with free/open-source, industry-grade tech.

---

## 0. The numbers that make judges lean forward (use these in the pitch)

| Fact | Source |
|------|--------|
| Sports industry loses **up to $28B/year** to piracy | GlobalData |
| **10.8M** unauthorized retransmissions detected in 2024; **81% never suspended**; only **2.7%** addressed in first 30 min | Grant Thornton 2025 |
| Spanish clubs alone lose **€600–700M/year** | LALIGA |
| Streameast (largest pirate network) had **1.6 billion visits** in one year | ACE |
| **84%+ of sports fans in India** pirate live events at least monthly | Industry survey 2025 |
| Sportian's Piracy Guard blocks **4,500 illegal streams/week** for Serie A | Sportian/Globant |

**The gap = our opportunity:** 97.3% of pirate streams survive the critical first 30 minutes. Faster automated detection + enforcement is the entire ballgame. That's what we build.

---

## 1. The Core Insight — what the industry actually does

Every serious player (Friend MTS, Irdeto, Sportian, Fastly+LALIGA, Redflag AI) runs the **same closed loop**:

```
   FINGERPRINT + MONITOR  ──locates──►  illegal streams
   FORENSIC WATERMARK     ──traces───►  the exact leaker/source
   AUTOMATED ENFORCEMENT  ──kills────►  the stream inside the live window
```

> *"Fingerprinting and monitoring locate the illegal streams while watermarking identifies their origin; deployed in tandem, they create a closed loop to detect, trace, and enforce — all within the live broadcast window."* — Friend MTS

**No hackathon project implements this loop.** We will — using free tools that are literally the same algorithms Meta, AcoustID, and Adobe use in production.

---

## 2. The Five Pillars (and the flagship that wins)

```
┌────────────────────────────────────────────────────────────────────────┐
│                        SPORTSHIELD 2.0                                   │
│                                                                          │
│  ① PROTECT      ② DETECT          ③ TRACE        ④ ENFORCE    ⑤ PROVE   │
│  ─────────      ─────────         ────────       ─────────    ───────    │
│  C2PA creds     LIVE RADAR ★      forensic       autonomous   C2PA       │
│  forensic WM    (audio+video      watermark      DMCA agent   verifier   │
│  invisible WM   fingerprint)      extraction     + escalation court-     │
│  pHash/PDQ      multimodal AI     → leaker ID     multi-      ready       │
│                 CLIP vector       session map     platform    evidence   │
│                 scoreboard OCR                    APIs        pack        │
└────────────────────────────────────────────────────────────────────────┘
                              ★ = the flagship that nobody else builds
```

---

## 3. ★ FLAGSHIP FEATURE: Live Stream Piracy Radar

This is the single feature that takes us from top-100 to top-3. **Real-time detection of illegal live re-streams of a protected broadcast.**

### How it works (all free tech)
1. **Reference ingestion** — The legit broadcast (or a short clip / the user's own stream) is ingested. We compute a **rolling fingerprint** every few seconds:
   - **Audio fingerprint** via **Chromaprint** (the AcoustID engine, MIT license, <100ms per 2-min clip, 2.5KB signature). Commentary + crowd noise is a *brutally hard-to-strip* signal — pirates can crop video, but the audio track survives.
   - **Visual fingerprint** via **Meta's vPDQ / TMK+PDQF** (the actual open-source algorithm Meta uses for video matching). Robust to re-encoding, blurring, resizing, watermark overlays.
2. **Suspect harvesting** — A crawler sweeps the usual pirate surfaces (YouTube/Twitch live search, Telegram public channels, X/Twitter, known IPTV portal patterns) for streams tagged with the event (team names, match keywords).
3. **Real-time match** — Each suspect stream is sampled; its rolling audio+video fingerprint is compared to the reference. A match above threshold = confirmed pirate stream, **scored and surfaced within minutes**.
4. **Multimodal confirmation (the AI wow)** — To eliminate false positives we cross-check three independent signals the industry literally lists:
   - **Scoreboard OCR** (Tesseract / PaddleOCR, free) — does the on-screen score/clock match the live game state?
   - **Logo detection** (YOLO-tiny or CLIP zero-shot) — is the broadcaster/league logo present?
   - **Commentary audio match** (Whisper transcript similarity) — same commentary words at the same timestamp?
   Three-of-three = near-zero false positives.

### Demo that stuns the room
Play a real match clip on one laptop ("the pirate"). SportShield, watching independently, flags it as an unauthorized re-stream **live, on stage, in under 60 seconds**, shows the confidence breakdown (audio 0.97 / visual 0.91 / scoreboard ✓ / logo ✓), and auto-drafts the takedown. Judges have never seen a student team do this.

---

## 4. The Other "Aha" Technologies (each one is a free, real, production-grade standard)

### A. C2PA Content Credentials — *replaces our fake "blockchain proof" with the real industry standard*
- **C2PA** (Coalition for Content Provenance & Authenticity — Adobe, Microsoft, BBC, Sony, 6,000+ orgs) is the open standard for cryptographically signed, tamper-evident media provenance. Open-source Rust SDK (`c2pa-rs`) + CLI (`c2patool`), royalty-free.
- On upload we **sign a Content Credential manifest** into the asset: who created it, when, the hash, the edit history. Anyone, anywhere, can verify it at contentcredentials.org/verify — **court-admissible, cross-platform proof of ownership.**
- This is the *correct* answer to "prove you own it" AND to deepfakes. Our current SHA-256+HMAC "blockchain" is a toy; C2PA is what Leica cameras and the BBC ship. Swapping it in is a massive credibility jump for ~zero cost.

### B. CLIP + Qdrant Semantic Vector Search — *catches what perceptual hashing misses*
- Perceptual hash (pHash/PDQ) only catches near-duplicates. Pirates crop, recolor, meme-ify, mirror, and AI-upscale. **CLIP embeddings** (512-dim semantic vectors) catch *conceptually identical* images even after heavy edits.
- Store every asset's CLIP vector in **Qdrant** (open-source vector DB, free self-host / free cloud tier). A reverse search becomes a sub-50ms vector similarity query at million-scale. This is genuinely 10x better recall than the current SerpAPI-only approach.
- Bonus: text-to-image search ("find any image of *my* player celebrating") because CLIP is multimodal.

### C. Robust DCT-domain Forensic Watermark — *upgrade from toy LSB to industry-grade*
- Current invisible watermark is **LSB steganography** — destroyed by a single re-compression. The industry uses **frequency-domain (DCT/DWT) watermarking** that survives screenshots, re-encoding, and cropping (recoverable from *"just a few seconds of video"* per Friend MTS).
- We embed a **per-session / per-subscriber payload** so any leaked frame extracts back to the *exact* account that leaked it — "subscriber watermarking." Implementable with `blind-watermark` (free Python lib, DWT-DCT-SVD).

### D. Autonomous Enforcement Agent — *closes the loop the industry can't*
- An LLM-driven agent that, on a confirmed match: gathers evidence (screenshots, fingerprintmatch score, timestamps), auto-generates the correct platform-specific DMCA/takedown, files it via the platform's API or webform, then **escalates** if unactioned (re-files, notifies the registrar/host, logs to the case file).
- Target: action within the **first 30 minutes** — beating the industry's 2.7%. That single metric is a winning slide.

### E. Crowdsourced "Detector Network" — *the network-effect moat*
- A public bounty mode: individual sleuths and fans submit suspected pirate links; the system auto-verifies via fingerprint; verified finds earn **reputation points / leaderboard rank / micro-rewards**. Turns the 84% of fans into a distributed immune system.
- This is the *commercial moat*: more users → more coverage → better protection → more rights-holders pay. Classic two-sided network.

---

## 5. FULL FEATURE LIST (everything, organized by pillar)

### ① PROTECT
1. C2PA Content Credential signing on upload (cryptographic provenance) ★new
2. Robust DCT/DWT forensic watermark, per-session payload ★upgrade
3. Visible watermark (existing S2)
4. Invisible LSB watermark (existing S5 — kept as fallback)
5. Perceptual hashing: **Meta PDQ** for images, **vPDQ/TMK** for video ★upgrade from imagehash
6. CLIP embedding generation + Qdrant indexing ★new

### ② DETECT
7. **★ Live Stream Piracy Radar** (audio Chromaprint + visual vPDQ rolling match) — flagship
8. Multimodal confirmation: scoreboard OCR + logo detection + commentary (Whisper) ★new
9. Reverse image search (existing S1, now backed by CLIP+Qdrant + SerpAPI)
10. Video source detection (existing S4, upgraded to vPDQ)
11. AI-generated / deepfake detection (existing S3, S10)
12. Music/audio detection (existing S13, now via Chromaprint)
13. Content propagation map (existing S8)
14. Continuous scheduled monitoring (existing S12)
15. Crowdsourced detector submissions + auto-verification ★new

### ③ TRACE
16. Forensic watermark extraction → exact leaker/session ID ★upgrade
17. Leak-source map (which subscriber/partner/region leaked) ★new
18. Authorized vs unauthorized classification (existing S15)

### ④ ENFORCE
19. **★ Autonomous Enforcement Agent** (auto-file + escalate) ★new
20. Platform-specific DMCA generator (existing S7, now agent-driven)
21. Multi-platform takedown via APIs + webform automation ★new
22. Escalation engine (re-file, notify host/registrar) ★new
23. Email/SMS/WhatsApp alerts (existing S16 + Twilio)

### ⑤ PROVE
24. C2PA public verifier page (anyone validates ownership) ★new
25. Court-ready evidence pack (PDF: fingerprints, timestamps, screenshots, chain) ★new
26. Ownership certificate (existing, now C2PA-backed)
27. Composite risk score (existing S9)
28. Content licensing management (existing S14)

### Platform / Product
29. Real-time dashboard with live event "war room" view ★new
30. Analytics: detection latency, takedown success rate, $ saved estimate ★new
31. Browser extension (right-click protect / report pirate) — the earlier ask
32. Public API + webhooks for rights-holders to integrate ★new (commercial)

---

## 6. HIGH-LEVEL SYSTEM DESIGN (HLD)

```
                         ┌──────────────────────────────────────┐
                         │            CLIENTS                    │
                         │  Web App  │ Browser Ext │ Public API  │
                         └─────┬──────────┬─────────────┬────────┘
                               │          │             │
                         ┌─────▼──────────▼─────────────▼────────┐
                         │      API GATEWAY (FastAPI)            │
                         │   auth · rate-limit · routing         │
                         └─────┬───────────────────────┬────────┘
                               │                       │
            ┌──────────────────▼────┐      ┌───────────▼─────────────┐
            │   SYNC SERVICES       │      │   ASYNC WORKERS         │
            │  (request/response)   │      │  (queue-driven)         │
            │  • upload + C2PA sign │      │  • Live Radar engine    │
            │  • watermark embed    │      │  • crawler swarm        │
            │  • vector search      │      │  • fingerprint match    │
            │  • verify credential  │      │  • enforcement agent    │
            └───────┬───────────────┘      └─────┬───────────────────┘
                    │                            │
        ┌───────────┼──────────────┬─────────────┼─────────────┐
        ▼           ▼              ▼             ▼             ▼
   ┌─────────┐ ┌─────────┐  ┌────────────┐ ┌──────────┐ ┌──────────┐
   │Firestore│ │ Qdrant  │  │ Object     │ │ Redis /  │ │ Fingerpr.│
   │(meta,   │ │(CLIP    │  │ Store      │ │ Queue    │ │  Index   │
   │ alerts) │ │ vectors)│  │(Cloudinary)│ │(jobs)    │ │(pHash/   │
   └─────────┘ └─────────┘  └────────────┘ └──────────┘ │ audio)   │
                                                         └──────────┘
        EXTERNAL: HuggingFace (CLIP/Whisper/deepfake) · SerpAPI ·
                  Platform APIs (YouTube/X/Telegram) · Brevo · Twilio
```

### Data-flow narratives

**Protect flow (upload):**
`Client → Gateway → Upload service → [compute PDQ + CLIP + audio fp] → embed DCT watermark → sign C2PA manifest → store {Firestore meta, Qdrant vector, Object store file, Fingerprint index} → enqueue baseline scan`

**Detect flow (live event):**
`Schedule/Trigger → Crawler swarm finds suspect streams → enqueue → Worker samples each stream → rolling audio+visual fingerprint → match vs reference → if score>τ → multimodal confirm (OCR+logo+Whisper) → create Detection → alert + enqueue Enforcement`

**Enforce flow:**
`Detection → Enforcement Agent: build evidence pack → pick platform template → file via API/webform → poll status → if not actioned in N min → escalate → update case file → notify owner`

**Prove flow:**
`Anyone → Verifier → fetch C2PA manifest → validate signature + hash chain → render provenance + ownership → optional evidence-pack PDF`

---

## 7. LOW-LEVEL SYSTEM DESIGN (LLD)

### 7.1 Service breakdown (microservice-ish, but deployable as a modular monolith first)

| Service | Responsibility | Key libs (all free) |
|---------|----------------|---------------------|
| `gateway` | auth, routing, rate-limit | FastAPI, Firebase Admin |
| `ingest` | upload, transcode sample, PDQ+CLIP+audio fp, C2PA sign, watermark | c2patool, blind-watermark, pdqhash, open-clip, chromaprint |
| `radar` | live stream rolling fingerprint + match | vpdq, pyacoustid, numpy |
| `crawler` | harvest suspect streams/links per event | httpx, yt-dlp (metadata), platform APIs |
| `confirm` | multimodal verification | PaddleOCR/Tesseract, YOLO-tiny/CLIP, faster-whisper |
| `vectorsearch`| CLIP reverse + text search | Qdrant client |
| `enforce` | DMCA gen, file, escalate | LLM (HF/free), platform APIs |
| `notify` | email/SMS/WhatsApp | Brevo, Twilio |
| `prove` | C2PA verify, evidence PDF | c2pa-rs, reportlab/jsPDF |

### 7.2 Core data models (Firestore + Qdrant)

```jsonc
// assets/{assetId}
{
  "userId": "...", "type": "image|video|stream",
  "filename": "...", "originalUrl": "...",
  "pdqHash": "256-bit hex",                // Meta PDQ (images)
  "vpdqSignature": "ref to blob",          // Meta vPDQ (video)
  "audioFingerprint": "chromaprint b64",   // Chromaprint
  "clipVectorId": "qdrant point id",       // CLIP embedding handle
  "c2pa": { "manifestUrl": "...", "signedAt": "...", "signer": "..." },
  "watermark": { "scheme": "dwt-dct-svd", "payloadTemplate": "uid:{}:sess:{}" },
  "protectionScore": 92, "status": "protected|monitoring"
}

// detections/{detectionId}
{
  "assetId": "...", "suspectUrl": "...", "platform": "youtube|x|telegram|iptv",
  "type": "live_stream|static_copy",
  "scores": { "audio": 0.97, "visual": 0.91, "scoreboard": true, "logo": true,
              "commentary": 0.88, "composite": 0.95 },
  "detectedAt": "...", "latencySec": 47,    // time from broadcast to detection
  "evidence": { "screenshots": [...], "fpMatchFrames": [...] },
  "enforcement": { "status": "drafted|filed|escalated|removed",
                   "filedAt": "...", "removedAt": "...", "caseId": "..." }
}

// Qdrant collection "assets_clip": 512-dim vectors, payload {assetId,userId}
// Fingerprint index: in-memory/Redis for hot events, persisted to Firestore
```

### 7.3 The Live Radar matching algorithm (pseudocode)

```python
def radar_match(reference_fp_window, suspect_stream):
    # reference_fp_window: rolling list of (t, audio_fp, vpdq_frame_hashes)
    sample = sample_stream(suspect_stream, seconds=10)      # yt-dlp / ffmpeg
    a = chromaprint(sample.audio)
    v = vpdq(sample.frames)

    audio_score  = max(chroma_sim(a, ref.audio) for ref in window)   # 0..1
    visual_score = vpdq_match(v, [ref.vpdq for ref in window])       # shared-frame %

    if audio_score < 0.6 and visual_score < 0.6:
        return None                                          # cheap reject

    # expensive confirmation only on candidates
    score_ok = scoreboard_matches(sample, live_game_state())  # OCR
    logo_ok  = detect_logo(sample.frames)                     # YOLO/CLIP
    comm_sim = whisper_sim(sample.audio, ref.commentary)      # transcript

    composite = weighted([audio_score, visual_score, comm_sim,
                          1.0 if score_ok else 0, 1.0 if logo_ok else 0])
    if composite >= TAU:
        return Detection(scores=..., latency=now()-broadcast_start)
```

### 7.4 Robustness ladder (why we beat naive solutions)

| Pirate evasion | Naive tool | SportShield 2.0 |
|----------------|-----------|------------------|
| Re-encode / re-compress | LSB WM dies | DCT watermark survives |
| Crop / resize video | exact hash fails | PDQ/vPDQ invariant |
| Recolor / meme / AI-upscale | pHash misses | CLIP semantic catches |
| Strip video, keep audio | visual-only fails | Chromaprint audio catches |
| Mute audio, keep video | audio-only fails | vPDQ + scoreboard OCR catch |
| Mirror / rotate | many hashes fail | PDQ handles + CLIP backup |
| Claim "it's mine" | no proof | C2PA cryptographic credential |

Multiple independent signals = no single evasion defeats the system. **This table alone wins the Q&A.**

---

## 8. TECH STACK — all free / open-source / free-tier

| Layer | Choice | Cost |
|-------|--------|------|
| Backend | FastAPI (Python) | free |
| Frontend | Next.js (existing) | free |
| DB | Firebase Firestore | free tier |
| Vector DB | **Qdrant** (self-host Docker / free cloud) | free |
| Object store | Cloudinary | free tier |
| Image hash | **Meta PDQ** (`pdqhash`) | OSS |
| Video hash | **Meta vPDQ/TMK** (`vpdq`) | OSS |
| Audio fingerprint | **Chromaprint / pyacoustid** | MIT |
| Provenance | **C2PA** (`c2patool`, `c2pa-rs`) | royalty-free |
| Watermark | `blind-watermark` (DWT-DCT-SVD) | OSS |
| Embeddings | **OpenCLIP** (via HF free inference or local) | OSS |
| Speech→text | **faster-whisper / whisper.cpp** | OSS |
| OCR | **PaddleOCR / Tesseract** | OSS |
| Object/logo | **YOLO-tiny / Ultralytics** or CLIP zero-shot | OSS |
| Stream sampling | **ffmpeg / yt-dlp** | OSS |
| Queue | Redis (free tier) or in-proc for demo | free |
| Email/SMS | Brevo / Twilio sandbox | free tier |
| Enforcement LLM | HuggingFace free inference / local small model | free |
| Deploy | Render / Railway / Fly.io free + Vercel | free tier |

### Cost ceiling check (≤ ₹1000)
- Domain name (optional, for the verifier page): **~₹800/yr**
- Everything else: **₹0** (free tiers + self-host + open source)
- **Net: well under ₹1000.** If you skip the domain, it's literally **₹0**.

---

## 9. SCALABILITY & DEPLOYMENT

- **Start as a modular monolith** (one FastAPI app, the services as modules) — fast to build, easy to demo. The HLD above is already drawn so you can **split workers into separate containers when you scale** without rewrites.
- **Horizontal scale points:** crawler swarm (stateless, scale by event load), radar workers (one per concurrent live event), Qdrant (sharded). Hot fingerprint index lives in Redis during an event, persists after.
- **Latency budget** for the winning metric: crawl→sample→match→confirm→alert in **<60s**, enforcement filed in **<30min**.
- **Deploy:** Docker Compose for local/demo; Render/Fly.io for the API + Qdrant; Vercel for the Next.js front end; Cloudflare in front for caching the public verifier.

---

## 10. COMMERCIAL / GO-TO-MARKET (the "this is a real business" slide)

- **Two-sided marketplace.** Rights-holders (pay) ⟷ detector crowd (earn). Network effects = moat.
- **Tiered SaaS:**
  - *Creator* (free) — individuals protect personal media, C2PA credentials, basic monitoring.
  - *Pro* (₹ low monthly) — continuous monitoring, auto-DMCA, analytics.
  - *Enterprise* (rights-holders/leagues) — Live Radar war-room, per-event SLAs, API, forensic subscriber watermarking, evidence packs.
- **Wedge:** start with **individual creators & small leagues** (cricket academies, regional football, esports orgs) who can't afford Friend MTS's enterprise pricing — *democratize* anti-piracy. Land-and-expand to bigger rights-holders.
- **TAM:** $28B/yr in losses → even 1% recovered protection value is a $280M market.
- **Defensible:** crowd network + accumulated fingerprint database + C2PA-signed provenance graph.

---

## 11. BUILD ROADMAP (phased, demo-first)

**Phase 1 — Credibility upgrades (fast, high ROI):**
- Swap fake "blockchain proof" → **C2PA** signing + public verifier.
- Swap `imagehash` → **Meta PDQ**; add **CLIP + Qdrant** reverse search.
- Swap LSB → **DCT forensic watermark** with per-session payload.

**Phase 2 — The flagship:**
- Build **Live Stream Piracy Radar** (Chromaprint audio + vPDQ visual rolling match) with a controlled demo (reference clip vs "pirate" laptop).
- Add **multimodal confirmation** (scoreboard OCR + logo + Whisper).

**Phase 3 — Close the loop:**
- **Autonomous Enforcement Agent** (auto-DMCA + escalation + case file).
- **War-room dashboard** with live detection latency + takedown success metrics.

**Phase 4 — Moat & polish:**
- **Crowdsourced detector network** + leaderboard.
- Browser extension, public API, evidence-pack PDF.

---

## 12. THE 3-MINUTE DEMO SCRIPT (how we leave judges stunned)

1. **(0:00) Hook** — "Sports piracy is a $28B problem. 97% of illegal streams survive the first 30 minutes. Watch us kill one in 60 seconds."
2. **(0:20) Protect** — Upload a clip. Show the **C2PA credential** being signed; open contentcredentials.org-style verifier → cryptographically proven ownership. Show the invisible forensic watermark carrying a session ID.
3. **(1:00) Detect** — On a second laptop, play the same match clip ("the pirate stream"). SportShield's **Live Radar**, watching independently, flags it **live on stage** — composite 0.95 (audio 0.97 / visual 0.91 / scoreboard ✓ / logo ✓).
4. **(1:50) Trace** — Extract the watermark from a *screenshot* of the pirate stream → it resolves to the exact leaking session. "We don't just find the leak. We name the leaker."
5. **(2:20) Enforce** — The agent auto-drafts and files the platform-correct DMCA, shows the case file + escalation timer. "Filed in under 30 minutes — beating 97% of the industry."
6. **(2:50) Close** — Dashboard: detection latency, takedown success, **$ saved**. "Free to run, built on the same algorithms Meta and Adobe use, ready to scale to any league on earth."

---

## 13. Why this wins (one-paragraph summary for you)

We stop competing on "reverse image search with extra features" (where 100 teams look similar) and instead **own the actual industry problem — live stream piracy — with the actual industry loop (fingerprint → watermark → enforce), built entirely on free, production-grade open standards** (Meta PDQ/vPDQ, Chromaprint, C2PA, CLIP/Qdrant, Whisper). It's technically deep (multimodal real-time matching), genuinely novel for a competition (nobody does live), credible (real standards, not toy crypto), commercial (two-sided SaaS against a $28B TAM), and demoable in a way that produces an audible reaction. That's a top-3 build.

---

### Sources
- [Friend MTS — forensic watermarking in live sports](https://www.friendmts.com/blog/what-we-discovered-using-forensic-watermarking-in-live-sports) · [How live sports piracy can be stopped](https://www.friendmts.com/blog/how-live-sports-piracy-can-be-stopped-today)
- [Sportian Piracy Guard](https://www.sportian.com/products/piracy-guard) · [Serie A AI blocks 4,500 streams/wk](https://insidersport.com/2025/08/27/serie-as-ai-answer-to-football-piracy/)
- [Fastly + LALIGA anti-piracy AI](https://securitybrief.com.au/story/fastly-laliga-launch-anti-piracy-push-on-streams)
- [SVG Op-Ed — automation is the only scalable defense](https://www.sportsvideo.org/2025/11/13/op-ed-the-automation-imperative-why-ai-is-the-only-scalable-defense-against-live-sports-piracy/)
- [C2PA / Content Authenticity open-source SDK](https://opensource.contentauthenticity.org/docs/getting-started/) · [c2pa-rs](https://github.com/contentauth/c2pa-rs)
- [Meta ThreatExchange — PDQ & vPDQ/TMK](https://github.com/facebook/ThreatExchange/tree/main/vpdq)
- [Chromaprint / AcoustID](https://github.com/acoustid/chromaprint) · [pyacoustid](https://pypi.org/project/pyacoustid/)
- [CLIP + Qdrant similarity search](https://qdrant.tech/cloud-inference/)
- [GlobalData — piracy costs leagues](https://www.globaldata.com/media/sport/piracy-threatens-sports-industry-revenue-growth-with-illegal-streaming-costing-leagues-millions-annually-reveals-globaldata/) · [Grant Thornton / industrial-scale piracy](https://www.techdigest.tv/2025/05/sports-piracy-at-industrial-scale-report-claims.html)
