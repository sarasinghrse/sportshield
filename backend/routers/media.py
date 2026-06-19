from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Query
from fastapi.responses import Response
from pydantic import BaseModel
from services.firebase_client import db
from config import SERPAPI_KEY, HF_TOKEN
import uuid
import threading
import httpx
import importlib
from datetime import datetime, timezone


# ── Lazy imports to keep memory under 512MB on Render free tier ──────────
# Heavy services (PIL, numpy, qdrant, av, opencv, langchain) are only
# loaded when their endpoints are actually called, not at startup.
_import_cache = {}

def _get(module_path, attr_name):
    """Lazily import and cache a single attribute from a module."""
    key = f"{module_path}.{attr_name}"
    if key not in _import_cache:
        mod = importlib.import_module(module_path)
        _import_cache[key] = getattr(mod, attr_name)
    return _import_cache[key]


# Lightweight services — safe to import eagerly (only use httpx/Firestore)
from services.dmca_generator import generate_dmca_notice, generate_batch_notices, get_platform_info
from services.domain_classifier import get_trusted_domains, classify_url
from services.risk_score import compute_risk_score
from services.propagation_tracker import build_propagation_data, extract_domain, categorize_platform
from services.email_alerts import send_scan_alert, send_dmca_confirmation
from services.licensing import create_license, check_license_status, verify_usage, LICENSE_TYPES
from services.ai_detector import detect_ai_image
from services.deepfake_detector import detect_deepfake
from services.crawler import scan_asset, scrape_social_image
from services.enforcement_agent import (
    create_enforcement_case,
    file_dmca as enforcement_file_dmca,
    escalate_case,
    resolve_case,
    get_case,
    list_cases,
    get_enforcement_stats,
    get_cases_needing_escalation,
)
from services.crowd_network import (
    submit_pirate_report,
    verify_submission,
    get_leaderboard,
    get_contributor_profile,
    list_submissions,
    get_pending_submissions,
    create_bounty,
    list_bounties,
    get_network_stats,
)
from services.piracy_scanner import scan_event_for_pirates


# Heavy services — loaded lazily via _get() at call sites:
#   services.cloudinary_client  -> upload_file
#   services.fingerprint        -> compute_phash
#   services.pdq_hasher         -> compute_pdq, compare_pdq
#   services.clip_search        -> index_asset, search_similar, text_search, get_collection_stats
#   services.forensic_watermark -> embed_forensic_watermark, extract_forensic_watermark
#   services.c2pa_credentials   -> sign_asset, verify_asset, get_credential_summary
#   services.watermark          -> apply_visible_watermark
#   services.invisible_watermark-> embed_watermark, extract_watermark
#   services.video_fingerprint  -> compute_video_fingerprint, compare_video_to_assets, extract_frames
#   services.music_detector     -> detect_music_from_bytes
#   services.blockchain_timestamp -> create_ownership_proof, verify_ownership_proof, generate_proof_certificate
#   services.radar_engine       -> create_event, get_event, list_events, etc.
#   services.evidence_pack      -> generate_evidence_pack
#   services.scheduled_scanner  -> schedule_asset_rescan, etc.


def _start_scheduler():
    try:
        from services.scheduled_scanner import start_scheduler
        start_scheduler()
    except Exception as e:
        print(f"[scheduler] Skipped: {e}")

_start_scheduler()

router = APIRouter()


# ── Background scan task ────────────────────────────────────────────────────

def run_scan(asset_id, user_id, phash, original_url, image_bytes=None):
    try:
        db.collection("assets").document(asset_id).update({"status": "scanning"})

        # AI detection (runs in background alongside web scan)
        ai_result = {"is_ai": False, "confidence": 0, "label": "unknown"}
        deepfake_result = {"isDeepfake": False, "confidence": 0, "label": "unknown", "riskLevel": "unknown"}
        if image_bytes and HF_TOKEN:
            ai_result = detect_ai_image(image_bytes, HF_TOKEN)
            deepfake_result = detect_deepfake(image_bytes, HF_TOKEN)
            db.collection("assets").document(asset_id).update({
                "aiDetection": ai_result,
                "deepfakeAnalysis": deepfake_result,
            })

        # Reverse image / web scan
        matches = scan_asset(phash, original_url, SERPAPI_KEY)

        risk = compute_risk_score(matches, ai_result)
        trusted = get_trusted_domains(user_id)

        unauthorized_count = 0
        scan_time = datetime.now(timezone.utc)
        for idx, match in enumerate(matches):
            classification = classify_url(match["found_url"], trusted)
            if classification == "unauthorized":
                unauthorized_count += 1

            domain = extract_domain(match["found_url"])
            platform = categorize_platform(domain)

            result_id = str(uuid.uuid4())
            db.collection("scan_results").document(result_id).set({
                "assetId":            asset_id,
                "userId":             user_id,
                "foundUrl":           match["found_url"],
                "thumbnailUrl":       match["thumbnail_url"],
                "confidence":         match["confidence"],
                "severity":           match["severity"],
                "classification":     classification,
                "scannedAt":          scan_time,
                "firstSeenAt":        scan_time,
                "domain":             domain,
                "platformType":       platform["type"],
                "platformName":       platform["platform"],
                "propagationOrder":   idx + 1,
                "status":             "flagged" if classification == "unauthorized" else "authorized",
            })
            if classification == "unauthorized":
                alert_id = str(uuid.uuid4())
                db.collection("alerts").document(alert_id).set({
                    "assetId":       asset_id,
                    "userId":        user_id,
                    "scanResultId":  result_id,
                    "confidence":    match["confidence"],
                    "foundUrl":      match["found_url"],
                    "thumbnailUrl":  match["thumbnail_url"],
                    "severity":      match["severity"],
                    "riskScore":     risk["score"],
                    "riskLabel":     risk["label"],
                    "classification": "unauthorized",
                    "isRead":        False,
                    "createdAt":     datetime.now(timezone.utc),
                })

        db.collection("assets").document(asset_id).update({
            "status":             "complete",
            "matchCount":         len(matches),
            "unauthorizedCount":  unauthorized_count,
            "authorizedCount":    len(matches) - unauthorized_count,
            "scanCount":          1,
            "lastScannedAt":      datetime.now(timezone.utc),
            "aiDetection":        ai_result,
            "deepfakeAnalysis":   deepfake_result,
            "riskScore":     risk["score"],
            "riskLabel":     risk["label"],
            "riskBreakdown": risk["breakdown"],
        })
        # S16: Send email alert if unauthorized copies found
        if unauthorized_count > 0:
            try:
                user_doc = db.collection("users").document(user_id).get()
                if user_doc.exists:
                    udata = user_doc.to_dict()
                    alert_email = udata.get("alertEmail", "")
                    if alert_email and udata.get("alertsEnabled", False):
                        send_scan_alert(alert_email, "Asset scan", asset_id,
                                        len(matches), unauthorized_count, risk["score"], matches)
            except Exception as e:
                print(f"[email_alert] Failed: {e}")

    except Exception as e:
        print(f"[run_scan] error: {e}")
        db.collection("assets").document(asset_id).update({"status": "error"})


# ── Background video scan task (S4) ─────────────────────────────────────────

def run_video_scan(asset_id, user_id, video_fp, original_url):
    """Compare video frames against all existing image assets in the DB."""
    try:
        db.collection("assets").document(asset_id).update({"status": "scanning"})

        # Fetch all image assets to compare against
        all_assets = db.collection("assets").where("userId", "==", user_id).stream()
        image_assets = []
        for doc in all_assets:
            a = doc.to_dict()
            a["id"] = doc.id
            if doc.id == asset_id:
                continue
            if a.get("phash"):
                image_assets.append(a)

        matches = _get('services.video_fingerprint', 'compare_video_to_assets')(video_fp, image_assets, threshold=0.50)

        scan_time = datetime.now(timezone.utc)
        trusted = get_trusted_domains(user_id)
        unauthorized_count = 0

        for idx, match in enumerate(matches):
            result_id = str(uuid.uuid4())
            db.collection("scan_results").document(result_id).set({
                "assetId":          asset_id,
                "userId":           user_id,
                "foundUrl":         "",
                "matchedAssetId":   match["assetId"],
                "matchedFilename":  match["filename"],
                "thumbnailUrl":     "",
                "confidence":       match["bestSimilarity"],
                "severity":         "high" if match["bestSimilarity"] >= 0.85 else "medium",
                "classification":   "unauthorized",
                "matchType":        match["matchType"],
                "matchingFrames":   match["matchingFrames"],
                "scannedAt":        scan_time,
                "firstSeenAt":      scan_time,
                "domain":           "internal",
                "platformType":     "database",
                "platformName":     "SportShield DB",
                "propagationOrder": idx + 1,
                "status":           "flagged",
            })
            unauthorized_count += 1

        db.collection("assets").document(asset_id).update({
            "status":            "complete",
            "matchCount":        len(matches),
            "unauthorizedCount": unauthorized_count,
            "authorizedCount":   0,
            "scanCount":         1,
            "lastScannedAt":     scan_time,
        })
    except Exception as e:
        print(f"[run_video_scan] error: {e}")
        db.collection("assets").document(asset_id).update({"status": "error"})


# ── Upload endpoint ──────────────────────────────────────────────────────────

@router.post("/upload")
async def upload_media(
    file: UploadFile = File(...),
    userId: str = Form("demo_user"),
    sendEmailUpdates: str = Form("false"),
):
    file_bytes = await file.read()
    content_type = file.content_type or ""
    is_audio = content_type.startswith("audio")
    resource_type = (
        "video" if content_type.startswith("video")
        else "audio" if is_audio
        else "image"
    )
    asset_id = str(uuid.uuid4())
    user_id  = userId

    # Step 1: Upload to Cloudinary (essential — must succeed)
    cloudinary_type = "video" if resource_type in ("video", "audio") else "image"
    try:
        original_url = _get('services.cloudinary_client', 'upload_file')(file_bytes, asset_id, user_id, cloudinary_type)
    except Exception as e:
        print(f"[upload] Cloudinary upload failed for {resource_type}: {e}")
        raise HTTPException(
            status_code=502,
            detail=f"Upload to media storage failed: {e}",
        )

    # Step 2: Basic fingerprint only (lightweight)
    phash = ""
    if resource_type == "image":
        try:
            phash = _get('services.fingerprint', 'compute_phash')(file_bytes)
        except Exception as e:
            print(f"[phash] Failed: {e}")
    elif resource_type == "video":
        try:
            vfp = _get('services.video_fingerprint', 'compute_video_fingerprint')(file_bytes, max_frames=12)
            phash = vfp.get("primaryHash", "")
            print(f"[video] Extracted {vfp['frameCount']} frames")
        except Exception as e:
            print(f"[video] Fingerprinting failed: {e}")
            vfp = None

    # Step 3: Save to Firestore immediately so asset appears in dashboard
    asset_doc = {
        "userId":           user_id,
        "filename":         file.filename,
        "originalUrl":      original_url,
        "watermarkedUrl":   "",
        "invisibleWmUrl":   "",
        "forensicWmUrl":    "",
        "type":             resource_type,
        "phash":            phash,
        "uploadedAt":       datetime.now(timezone.utc),
        "status":           "processing",
        "scanCount":        0,
        "matchCount":       0,
        "source":           "upload",
    }
    if resource_type == "video" and phash:
        asset_doc["videoFingerprint"] = vfp

    try:
        proof = _get('services.blockchain_timestamp', 'create_ownership_proof')(file_bytes, asset_id, user_id, file.filename or "", phash)
        asset_doc["ownershipProof"] = proof
    except Exception as e:
        print(f"[proof] Failed: {e}")

    db.collection("assets").document(asset_id).set(asset_doc)

    # Send upload confirmation email if user opted in
    wants_email = sendEmailUpdates.lower() == "true"
    if wants_email:
        try:
            user_doc = db.collection("users").document(user_id).get()
            if user_doc.exists:
                user_email = user_doc.to_dict().get("email") or user_doc.to_dict().get("alertEmail", "")
                if user_email:
                    from services.email_alerts import send_email
                    send_email(
                        user_email,
                        f"Your asset \"{file.filename}\" was uploaded successfully",
                        f"""
                        <div style="background:#0a1f0a;padding:0;margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
                          <div style="max-width:560px;margin:0 auto;padding:32px 24px;">
                            <div style="text-align:center;margin-bottom:24px;">
                              <h1 style="color:#4ade80;font-size:22px;font-weight:900;letter-spacing:0.08em;margin:0;">SPORTSHIELD</h1>
                            </div>
                            <div style="background:#0d2a0d;border:1px solid rgba(26,92,26,0.4);border-radius:12px;padding:24px;">
                              <h2 style="color:#fff;font-size:16px;margin:0 0 12px;">Asset Uploaded Successfully</h2>
                              <p style="color:rgba(255,255,255,0.6);font-size:14px;line-height:1.6;">
                                Your asset <strong style="color:#fff;">{file.filename}</strong> has been uploaded
                                and is now being processed. We'll scan it for unauthorized copies automatically.
                              </p>
                              <div style="text-align:center;margin-top:20px;">
                                <a href="{os.getenv('FRONTEND_URL', 'https://sportshield--sportshield-app.us-central1.hosted.app')}/assets/{asset_id}"
                                   style="display:inline-block;background:#1a5c1a;color:#4ade80;font-weight:700;font-size:13px;text-decoration:none;padding:10px 28px;border-radius:8px;border:1px solid rgba(74,222,128,0.3);">
                                  View Asset
                                </a>
                              </div>
                            </div>
                          </div>
                        </div>
                        """,
                    )
        except Exception as e:
            print(f"[upload_email] Failed to send upload confirmation: {e}")

    # Step 4: Offload heavy processing to background thread
    # (watermarks, PDQ, CLIP, C2PA, music detection, scanning)
    t = threading.Thread(
        target=_post_upload_processing,
        args=(asset_id, user_id, file_bytes, resource_type, phash, original_url, file.filename or "", content_type, wants_email),
        daemon=True,
    )
    t.start()

    return {
        "id":             asset_id,
        "assetId":        asset_id,
        "filename":       file.filename,
        "url":            original_url,
        "originalUrl":    original_url,
        "watermarkedUrl": "",
        "phash":          phash,
        "status":         "processing",
    }


def _post_upload_processing(asset_id, user_id, file_bytes, resource_type, phash, original_url, filename, content_type, wants_email=False):
    """Heavy processing that runs in a background thread after upload returns."""
    import gc
    updates = {}

    try:
        if resource_type in ("audio", "video"):
            try:
                music_analysis = _get('services.music_detector', 'detect_music_from_bytes')(file_bytes, filename)
                updates["musicAnalysis"] = music_analysis
                print(f"[music] Detection: {music_analysis.get('summary', 'N/A')}")
            except Exception as e:
                print(f"[music] Detection failed: {e}")

        if resource_type == "image":
            # PDQ hash
            try:
                pdq_data = _get('services.pdq_hasher', 'compute_pdq')(file_bytes)
                updates["pdqHash"] = pdq_data
                print(f"[pdq] Hash: {pdq_data['hash'][:16]}... quality={pdq_data['quality']}")
            except Exception as e:
                print(f"[pdq] Failed: {e}")
            gc.collect()

            # Visible watermark
            try:
                wm_bytes = _get('services.watermark', 'apply_visible_watermark')(
                    file_bytes, user_email=f"{user_id}@sportshield",
                    session_id=asset_id, asset_id=asset_id,
                )
                wm_url = _get('services.cloudinary_client', 'upload_file')(wm_bytes, f"{asset_id}_wm", user_id, "image")
                updates["watermarkedUrl"] = wm_url
                del wm_bytes
            except Exception as e:
                print(f"[watermark] Failed: {e}")
            gc.collect()

            # Invisible watermark
            try:
                inv_bytes = _get('services.invisible_watermark', 'embed_watermark')(file_bytes, user_id=user_id, asset_id=asset_id)
                inv_url = _get('services.cloudinary_client', 'upload_file')(inv_bytes, f"{asset_id}_inv", user_id, "image")
                updates["invisibleWmUrl"] = inv_url
                del inv_bytes
                print(f"[invisible_wm] LSB embedded for asset {asset_id[:8]}")
            except Exception as e:
                print(f"[invisible_wm] Failed: {e}")
            gc.collect()

            # Forensic watermark
            try:
                fw_result = _get('services.forensic_watermark', 'embed_forensic_watermark')(
                    file_bytes, user_id=user_id, asset_id=asset_id, session_id=asset_id,
                )
                fw_bytes = fw_result.pop("watermarked_bytes")
                fw_url = _get('services.cloudinary_client', 'upload_file')(fw_bytes, f"{asset_id}_fwm", user_id, "image")
                updates["forensicWmUrl"] = fw_url
                updates["forensicWatermark"] = fw_result
                del fw_bytes
                print(f"[forensic_wm] DCT embedded: {fw_result['bits_embedded']} bits")
            except Exception as e:
                print(f"[forensic_wm] Failed: {e}")
            gc.collect()

            # CLIP indexing
            try:
                clip_data = _get('services.clip_search', 'index_asset')(asset_id, user_id, file_bytes, filename)
                if clip_data.get("indexed"):
                    updates["clipIndex"] = clip_data
                    print(f"[clip] Indexed {clip_data['dimensions']}-dim vector")
            except Exception as e:
                print(f"[clip] Indexing failed: {e}")
            gc.collect()

            # C2PA signing
            try:
                c2pa_result = _get('services.c2pa_credentials', 'sign_asset')(
                    file_bytes, user_id, asset_id, filename, content_type or "image/png",
                )
                if c2pa_result.get("signed"):
                    c2pa_signed_bytes = c2pa_result.pop("manifest_bytes")
                    c2pa_url = _get('services.cloudinary_client', 'upload_file')(c2pa_signed_bytes, f"{asset_id}_c2pa", user_id, "image")
                    updates["c2pa"] = {
                        "signed": True, "c2paUrl": c2pa_url,
                        "claimGenerator": c2pa_result.get("claim_generator"),
                        "signedAt": c2pa_result.get("signed_at"),
                        "algorithm": c2pa_result.get("algorithm"),
                        "standard": c2pa_result.get("standard"),
                    }
                    del c2pa_signed_bytes
                    print(f"[c2pa] Content Credential signed")
            except Exception as e:
                print(f"[c2pa] Failed: {e}")
            gc.collect()

        # Update Firestore with all processed data
        updates["status"] = "pending"
        if wants_email:
            updates["emailUpdates"] = True
        db.collection("assets").document(asset_id).update(updates)
        print(f"[upload] Background processing complete for {asset_id[:8]}")

        # Start scan
        if resource_type == "image" and phash:
            run_scan(asset_id, user_id, phash, original_url, file_bytes)
        elif resource_type == "video":
            vfp_doc = db.collection("assets").document(asset_id).get().to_dict().get("videoFingerprint")
            if vfp_doc and vfp_doc.get("frameHashes"):
                run_video_scan(asset_id, user_id, vfp_doc, original_url)
            else:
                db.collection("assets").document(asset_id).update({"status": "complete"})

    except Exception as e:
        print(f"[upload] Background processing error: {e}")
        try:
            db.collection("assets").document(asset_id).update({"status": "pending"})
        except Exception:
            pass


# ── Social / web URL scan endpoint ──────────────────────────────────────────

class SocialScanRequest(BaseModel):
    url: str
    label: str = ""   # e.g. "Instagram post", "Twitter screenshot"
    userId: str = "demo_user"


@router.post("/scan-url")
async def scan_social_url(req: SocialScanRequest):
    """
    Extract the main image from any public web/social URL and scan it.
    Works for Instagram, Twitter/X, any page with og:image.
    """
    image_bytes = scrape_social_image(req.url)
    if not image_bytes:
        raise HTTPException(
            status_code=422,
            detail="Could not extract an image from that URL. Make sure the post is public.",
        )

    asset_id  = str(uuid.uuid4())
    user_id   = req.userId
    filename  = req.label or f"social_{asset_id[:8]}"

    # Upload extracted image to Cloudinary
    original_url = _get('services.cloudinary_client', 'upload_file')(image_bytes, asset_id, user_id, "image")
    phash        = _get('services.fingerprint', 'compute_phash')(image_bytes)

    db.collection("assets").document(asset_id).set({
        "userId":      user_id,
        "filename":    filename,
        "originalUrl": original_url,
        "sourceUrl":   req.url,        # the social/web page it came from
        "type":        "image",
        "phash":       phash,
        "uploadedAt":  datetime.now(timezone.utc),
        "status":      "pending",
        "scanCount":   0,
        "matchCount":  0,
        "source":      "social_url",
    })

    t = threading.Thread(
        target=run_scan,
        args=(asset_id, user_id, phash, original_url, image_bytes),
    )
    t.daemon = True
    t.start()

    return {
        "id":          asset_id,
        "assetId":     asset_id,
        "filename":    filename,
        "url":         original_url,
        "originalUrl": original_url,
        "phash":       phash,
        "status":      "pending",
        "sourceUrl":   req.url,
    }


# ── List assets endpoint ─────────────────────────────────────────────────────

@router.get("/assets")
async def list_assets(userId: str = Query("demo_user")):
    assets = db.collection("assets").where("userId", "==", userId).stream()
    return [{"id": doc.id, **doc.to_dict()} for doc in assets]


# ── On-demand watermark endpoint ─────────────────────────────────────────────
#
# GET /api/media/watermarked/{asset_id}?email=user@example.com&session=sess_123
#
# Fetches the original asset image, burns in the caller's identifying info,
# and returns the watermarked JPEG directly.  Every download is unique and
# traceable — screenshotting it still carries the recipient's details.

@router.get("/watermarked/{asset_id}")
async def get_watermarked(
    asset_id: str,
    email:   str = Query(default="", description="Recipient email address"),
    session: str = Query(default="", description="Session or download token"),
):
    # Fetch asset record
    doc = db.collection("assets").document(asset_id).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Asset not found")

    asset = doc.to_dict()
    if asset.get("type") != "image":
        raise HTTPException(status_code=400, detail="Watermarking is only supported for images")

    original_url = asset.get("originalUrl", "")
    if not original_url:
        raise HTTPException(status_code=404, detail="Original image URL not found")

    # Download original image
    try:
        resp = httpx.get(original_url, timeout=20, follow_redirects=True)
        resp.raise_for_status()
        image_bytes = resp.content
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Could not fetch original image: {e}")

    # Apply watermark with caller-supplied identity
    watermarked = _get('services.watermark', 'apply_visible_watermark')(
        image_bytes,
        user_email=email or asset.get("userId", "unknown"),
        session_id=session or asset_id,
        asset_id=asset_id,
    )

    # Log the watermarked download in Firestore for audit trail
    try:
        db.collection("watermark_downloads").add({
            "assetId":   asset_id,
            "userId":    asset.get("userId", ""),
            "email":     email,
            "sessionId": session,
            "downloadedAt": datetime.now(timezone.utc),
        })
    except Exception:
        pass  # non-fatal

    return Response(
        content=watermarked,
        media_type="image/jpeg",
        headers={
            "Content-Disposition": f'inline; filename="protected_{asset_id[:8]}.jpg"',
            "Cache-Control": "no-store",   # prevent browser caching of personalised copy
        },
    )


# ── Content Propagation Tracking (S8) ───────────────────────────────────────

@router.get("/propagation/{asset_id}")
async def get_propagation(asset_id: str):
    """
    Returns the content propagation timeline and spread graph for an asset.
    Shows how the content has spread across the web — domains, platforms,
    detection order, and classification.
    """
    doc = db.collection("assets").document(asset_id).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Asset not found")
    return build_propagation_data(asset_id)


# ── Deepfake Detection (S10) ────────────────────────────────────────────────

@router.post("/deepfake-check/{asset_id}")
async def check_deepfake(asset_id: str):
    """
    Run deepfake analysis on an existing asset.
    Downloads the original image and runs it through the deepfake detector.
    Stores the result on the asset document.
    """
    asset_doc = db.collection("assets").document(asset_id).get()
    if not asset_doc.exists:
        raise HTTPException(status_code=404, detail="Asset not found")

    asset = asset_doc.to_dict()
    if asset.get("type") != "image":
        raise HTTPException(status_code=400, detail="Deepfake detection is only supported for images")

    original_url = asset.get("originalUrl", "")
    if not original_url:
        raise HTTPException(status_code=404, detail="Original image URL not found")

    if not HF_TOKEN:
        raise HTTPException(status_code=503, detail="HuggingFace token not configured")

    # Download original image
    try:
        resp = httpx.get(original_url, timeout=20, follow_redirects=True)
        resp.raise_for_status()
        image_bytes = resp.content
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Could not fetch original image: {e}")

    result = detect_deepfake(image_bytes, HF_TOKEN)

    # Store result on asset
    try:
        db.collection("assets").document(asset_id).update({
            "deepfakeAnalysis": result,
        })
    except Exception:
        pass  # non-fatal

    return result


@router.post("/deepfake-check-upload")
async def check_deepfake_upload(file: UploadFile = File(...)):
    """
    Run deepfake analysis on an uploaded image (no asset creation).
    Useful for quick one-off checks.
    """
    if not HF_TOKEN:
        raise HTTPException(status_code=503, detail="HuggingFace token not configured")

    file_bytes = await file.read()
    if not file.content_type or not file.content_type.startswith("image"):
        raise HTTPException(status_code=400, detail="Only image files are supported")

    result = detect_deepfake(file_bytes, HF_TOKEN)
    return result


# ── Video Fingerprinting (S4) ───────────────────────────────────────────────

@router.get("/video-fingerprint/{asset_id}")
async def get_video_fingerprint(asset_id: str):
    """Return the video fingerprint (frame hashes) for a video asset."""
    doc = db.collection("assets").document(asset_id).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Asset not found")
    asset = doc.to_dict()
    if asset.get("type") != "video":
        raise HTTPException(status_code=400, detail="Not a video asset")
    vf = asset.get("videoFingerprint")
    if not vf:
        raise HTTPException(status_code=404, detail="No fingerprint — re-upload to generate")
    return vf


@router.post("/video-compare/{asset_id}")
async def compare_video(asset_id: str):
    """
    Compare a video asset's frames against all other assets in the database.
    Useful for finding if any frames from this video match existing images/videos.
    """
    doc = db.collection("assets").document(asset_id).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Asset not found")
    asset = doc.to_dict()
    vf = asset.get("videoFingerprint")
    if not vf or not vf.get("frameHashes"):
        raise HTTPException(status_code=400, detail="No video fingerprint available")

    all_assets = db.collection("assets").where("userId", "==", asset.get("userId", "demo_user")).stream()
    others = []
    for d in all_assets:
        a = d.to_dict()
        a["id"] = d.id
        if d.id != asset_id and a.get("phash"):
            others.append(a)

    matches = _get('services.video_fingerprint', 'compare_video_to_assets')(vf, others)
    return {"assetId": asset_id, "matches": matches, "comparedAgainst": len(others)}


# ── Invisible Watermarking (S5) ─────────────────────────────────────────────

@router.post("/invisible-watermark/{asset_id}")
async def apply_invisible_wm(asset_id: str):
    """
    Embed an invisible watermark into an existing asset's image.
    Downloads the original, embeds user/asset ID via LSB steganography,
    uploads the result, and stores the URL on the asset doc.
    """
    doc = db.collection("assets").document(asset_id).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Asset not found")
    asset = doc.to_dict()
    if asset.get("type") != "image":
        raise HTTPException(status_code=400, detail="Only images support invisible watermarking")

    original_url = asset.get("originalUrl", "")
    if not original_url:
        raise HTTPException(status_code=404, detail="No original image URL")

    try:
        resp = httpx.get(original_url, timeout=20, follow_redirects=True)
        resp.raise_for_status()
        image_bytes = resp.content
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Could not fetch image: {e}")

    user_id = asset.get("userId", "demo_user")
    inv_bytes = _get('services.invisible_watermark', 'embed_watermark')(image_bytes, user_id=user_id, asset_id=asset_id)
    inv_url = _get('services.cloudinary_client', 'upload_file')(inv_bytes, f"{asset_id}_inv", user_id, "image")

    db.collection("assets").document(asset_id).update({"invisibleWmUrl": inv_url})

    return {
        "assetId": asset_id,
        "invisibleWmUrl": inv_url,
        "message": "Invisible watermark embedded successfully",
    }


@router.post("/extract-watermark")
async def extract_hidden_watermark(file: UploadFile = File(...)):
    """
    Extract hidden watermark from an uploaded image.
    Use this to identify the source/leaker of a watermarked image.
    Returns the embedded payload (user ID, asset ID, timestamp) if found.
    """
    file_bytes = await file.read()
    result = _get('services.invisible_watermark', 'extract_watermark')(file_bytes)
    return result


@router.get("/extract-watermark/{asset_id}")
async def extract_watermark_from_asset(asset_id: str):
    """
    Extract hidden watermark from an asset's invisible-watermarked copy.
    Verifies the watermark is intact and readable.
    """
    doc = db.collection("assets").document(asset_id).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Asset not found")
    asset = doc.to_dict()
    inv_url = asset.get("invisibleWmUrl", "")
    if not inv_url:
        raise HTTPException(status_code=404, detail="No invisible watermark exists for this asset")

    try:
        resp = httpx.get(inv_url, timeout=20, follow_redirects=True)
        resp.raise_for_status()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Could not fetch watermarked image: {e}")

    result = _get('services.invisible_watermark', 'extract_watermark')(resp.content)
    return result


# ── Music / Audio Detection (S13) ──────────────────────────────────────────

@router.post("/music-detect/{asset_id}")
async def detect_music_in_asset(asset_id: str):
    """
    Run music detection on an existing asset (audio or video).
    Downloads the file and runs audio fingerprinting to identify
    copyrighted music tracks.
    """
    doc = db.collection("assets").document(asset_id).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Asset not found")
    asset = doc.to_dict()

    if asset.get("type") not in ("audio", "video"):
        raise HTTPException(status_code=400, detail="Music detection requires audio or video files")

    original_url = asset.get("originalUrl", "")
    if not original_url:
        raise HTTPException(status_code=404, detail="No original file URL")

    try:
        resp = httpx.get(original_url, timeout=30, follow_redirects=True)
        resp.raise_for_status()
        file_bytes = resp.content
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Could not fetch file: {e}")

    result = _get('services.music_detector', 'detect_music_from_bytes')(file_bytes, asset.get("filename", ""))

    db.collection("assets").document(asset_id).update({"musicAnalysis": result})

    return result


@router.post("/music-detect-upload")
async def detect_music_upload(file: UploadFile = File(...)):
    """
    Run music detection on an uploaded file (no asset creation).
    Supports audio and video files.
    """
    file_bytes = await file.read()
    result = _get('services.music_detector', 'detect_music_from_bytes')(file_bytes, file.filename or "")
    return result


@router.get("/music-analysis/{asset_id}")
async def get_music_analysis(asset_id: str):
    """Get stored music analysis results for an asset."""
    doc = db.collection("assets").document(asset_id).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Asset not found")
    asset = doc.to_dict()
    analysis = asset.get("musicAnalysis")
    if not analysis:
        raise HTTPException(status_code=404, detail="No music analysis — run detection first")
    return analysis


# ── DMCA Takedown Notices (S7) ─────────────────────────────────────────────

class DMCARequest(BaseModel):
    ownerName: str
    ownerEmail: str
    infringingUrl: str = ""
    additionalInfo: str = ""


@router.post("/dmca/{asset_id}")
async def generate_dmca(asset_id: str, req: DMCARequest):
    """Generate a DMCA takedown notice for a specific infringing URL."""
    doc = db.collection("assets").document(asset_id).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Asset not found")
    asset = doc.to_dict()

    if not req.infringingUrl:
        raise HTTPException(status_code=400, detail="infringingUrl is required")

    try:
        from urllib.parse import urlparse
        parsed = urlparse(req.infringingUrl if "://" in req.infringingUrl else f"https://{req.infringingUrl}")
        domain = (parsed.hostname or "").replace("www.", "")
    except Exception:
        domain = ""

    notice = generate_dmca_notice(
        owner_name=req.ownerName,
        owner_email=req.ownerEmail,
        asset_name=asset.get("filename", "Unknown"),
        asset_id=asset_id,
        original_url=asset.get("originalUrl", ""),
        infringing_url=req.infringingUrl,
        domain=domain,
        additional_info=req.additionalInfo,
    )

    db.collection("dmca_notices").document(notice["dmcaId"]).set(notice)

    try:
        send_dmca_confirmation(req.ownerEmail, asset.get("filename", ""), domain, notice["dmcaId"])
    except Exception:
        pass

    return notice


@router.post("/dmca-batch/{asset_id}")
async def generate_batch_dmca(asset_id: str, req: DMCARequest):
    """Generate DMCA notices for all unauthorized scan results of an asset."""
    doc = db.collection("assets").document(asset_id).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Asset not found")
    asset = doc.to_dict()

    results = db.collection("scan_results").where("assetId", "==", asset_id).stream()
    scan_results = [r.to_dict() for r in results]

    notices = generate_batch_notices(
        owner_name=req.ownerName,
        owner_email=req.ownerEmail,
        asset_name=asset.get("filename", "Unknown"),
        asset_id=asset_id,
        original_url=asset.get("originalUrl", ""),
        scan_results=scan_results,
    )

    for notice in notices:
        db.collection("dmca_notices").document(notice["dmcaId"]).set(notice)

    db.collection("assets").document(asset_id).update({
        "dmcaCount": len(notices),
        "lastDmcaAt": datetime.now(timezone.utc),
    })

    return {"assetId": asset_id, "noticesGenerated": len(notices), "notices": notices}


@router.get("/dmca/{asset_id}")
async def list_dmca_notices(asset_id: str):
    """List all DMCA notices for an asset."""
    docs = db.collection("dmca_notices").where("assetId", "==", asset_id).stream()
    notices = []
    for d in docs:
        n = d.to_dict()
        if n.get("createdAt") and hasattr(n["createdAt"], "isoformat"):
            n["createdAt"] = n["createdAt"].isoformat()
        notices.append(n)
    notices.sort(key=lambda x: x.get("createdAt", ""), reverse=True)
    return {"assetId": asset_id, "notices": notices}


@router.patch("/dmca-status/{dmca_id}")
async def update_dmca_status(dmca_id: str, status: str = Query(...)):
    """Update status of a DMCA notice (draft, sent, acknowledged, resolved, rejected)."""
    valid = ["draft", "sent", "acknowledged", "resolved", "rejected"]
    if status not in valid:
        raise HTTPException(status_code=400, detail=f"Status must be one of: {', '.join(valid)}")
    doc = db.collection("dmca_notices").document(dmca_id).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="DMCA notice not found")
    db.collection("dmca_notices").document(dmca_id).update({
        "status": status,
        "updatedAt": datetime.now(timezone.utc),
    })
    return {"dmcaId": dmca_id, "status": status}


# ── Blockchain Timestamping / Proof of Ownership (S11) ────────────────────

@router.get("/proof/{asset_id}")
async def get_ownership_proof(asset_id: str):
    """Get the ownership proof for an asset."""
    doc = db.collection("assets").document(asset_id).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Asset not found")
    asset = doc.to_dict()
    proof = asset.get("ownershipProof")
    if not proof:
        raise HTTPException(status_code=404, detail="No ownership proof — re-upload to generate")
    if proof.get("createdAt") and hasattr(proof["createdAt"], "isoformat"):
        proof["createdAt"] = proof["createdAt"].isoformat()
    return proof


@router.post("/proof/{asset_id}")
async def create_proof(asset_id: str):
    """Generate ownership proof for an existing asset (if not already created)."""
    doc = db.collection("assets").document(asset_id).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Asset not found")
    asset = doc.to_dict()

    original_url = asset.get("originalUrl", "")
    if not original_url:
        raise HTTPException(status_code=404, detail="No original file URL")

    try:
        resp = httpx.get(original_url, timeout=20, follow_redirects=True)
        resp.raise_for_status()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Could not fetch file: {e}")

    proof = _get('services.blockchain_timestamp', 'create_ownership_proof')(
        resp.content, asset_id, asset.get("userId", "demo_user"),
        asset.get("filename", ""), asset.get("phash", ""),
    )
    db.collection("assets").document(asset_id).update({"ownershipProof": proof})
    return proof


@router.get("/proof-certificate/{asset_id}")
async def get_proof_certificate(asset_id: str):
    """Get a text-based proof certificate for download."""
    doc = db.collection("assets").document(asset_id).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Asset not found")
    proof = doc.to_dict().get("ownershipProof")
    if not proof:
        raise HTTPException(status_code=404, detail="No proof exists")
    cert = _get('services.blockchain_timestamp', 'generate_proof_certificate')(proof)
    return Response(
        content=cert,
        media_type="text/plain",
        headers={"Content-Disposition": f'attachment; filename="proof_{asset_id[:8]}.txt"'},
    )


@router.post("/verify-proof/{asset_id}")
async def verify_proof(asset_id: str, file: UploadFile = File(...)):
    """Verify an ownership proof by re-hashing the uploaded file."""
    doc = db.collection("assets").document(asset_id).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Asset not found")
    proof = doc.to_dict().get("ownershipProof")
    if not proof:
        raise HTTPException(status_code=404, detail="No proof exists for this asset")
    file_bytes = await file.read()
    result = _get('services.blockchain_timestamp', 'verify_ownership_proof')(proof, file_bytes)
    return result


# ── Scheduled Scans / Real-time Monitoring (S12) ──────────────────────────

class ScheduleRequest(BaseModel):
    intervalHours: int = 24


@router.post("/schedule/{asset_id}")
async def schedule_scan(asset_id: str, req: ScheduleRequest = ScheduleRequest()):
    """Schedule periodic re-scans for an asset."""
    doc = db.collection("assets").document(asset_id).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Asset not found")
    asset = doc.to_dict()
    user_id = asset.get("userId", "demo_user")

    result = _get('services.scheduled_scanner', 'schedule_asset_rescan')(asset_id, user_id, req.intervalHours)

    db.collection("assets").document(asset_id).update({
        "monitoringEnabled": True,
        "monitoringInterval": req.intervalHours,
    })

    return result


@router.delete("/schedule/{asset_id}")
async def unschedule_scan(asset_id: str):
    """Stop scheduled re-scans for an asset."""
    result = _get('services.scheduled_scanner', 'unschedule_asset_rescan')(asset_id)
    try:
        db.collection("assets").document(asset_id).update({
            "monitoringEnabled": False,
        })
    except Exception:
        pass
    return result


@router.get("/schedules")
async def list_schedules():
    """List all scheduled scan jobs."""
    return {"jobs": _get('services.scheduled_scanner', 'get_scheduled_jobs')()}


@router.post("/rescan/{asset_id}")
async def trigger_rescan(asset_id: str):
    """Manually trigger an immediate re-scan."""
    doc = db.collection("assets").document(asset_id).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Asset not found")
    asset = doc.to_dict()
    user_id = asset.get("userId", "demo_user")
    phash = asset.get("phash", "")
    original_url = asset.get("originalUrl", "")

    if not original_url:
        raise HTTPException(status_code=400, detail="Asset missing URL")

    if asset.get("type") == "image" and phash:
        try:
            resp = httpx.get(original_url, timeout=20, follow_redirects=True)
            resp.raise_for_status()
            image_bytes = resp.content
        except Exception:
            image_bytes = None

        t = threading.Thread(target=run_scan, args=(asset_id, user_id, phash, original_url, image_bytes))
        t.daemon = True
        t.start()
    elif asset.get("type") == "video":
        vfp = asset.get("videoFingerprint")
        if vfp and vfp.get("frameHashes"):
            t = threading.Thread(target=run_video_scan, args=(asset_id, user_id, vfp, original_url))
            t.daemon = True
            t.start()
        else:
            db.collection("assets").document(asset_id).update({"status": "complete"})
    else:
        db.collection("assets").document(asset_id).update({"status": "complete"})

    return {"assetId": asset_id, "status": "rescan_started"}


# ── Content Licensing (S14) ────────────────────────────────────────────────

class LicenseRequest(BaseModel):
    licenseeName: str
    licenseeEmail: str
    licenseType: str = "non_exclusive"
    terms: str = ""
    price: float = 0
    currency: str = "USD"
    durationDays: int = 365
    allowedPlatforms: list = []
    territory: str = "worldwide"


@router.post("/license/{asset_id}")
async def create_asset_license(asset_id: str, req: LicenseRequest):
    """Create a new license for an asset."""
    doc = db.collection("assets").document(asset_id).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Asset not found")
    asset = doc.to_dict()

    try:
        license_doc = create_license(
            asset_id=asset_id,
            owner_id=asset.get("userId", "demo_user"),
            licensee_name=req.licenseeName,
            licensee_email=req.licenseeEmail,
            license_type=req.licenseType,
            terms=req.terms,
            price=req.price,
            currency=req.currency,
            duration_days=req.durationDays,
            allowed_platforms=req.allowedPlatforms,
            territory=req.territory,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    db.collection("licenses").document(license_doc["licenseId"]).set(license_doc)

    return license_doc


@router.get("/licenses/{asset_id}")
async def list_licenses(asset_id: str):
    """List all licenses for an asset."""
    docs = db.collection("licenses").where("assetId", "==", asset_id).stream()
    licenses = []
    for d in docs:
        lic = d.to_dict()
        status = check_license_status(lic)
        lic["currentStatus"] = status
        if lic.get("createdAt") and hasattr(lic["createdAt"], "isoformat"):
            lic["createdAt"] = lic["createdAt"].isoformat()
        if lic.get("expiresAt") and hasattr(lic["expiresAt"], "isoformat"):
            lic["expiresAt"] = lic["expiresAt"].isoformat()
        licenses.append(lic)
    return {"assetId": asset_id, "licenses": licenses, "types": LICENSE_TYPES}


@router.patch("/license/{license_id}/revoke")
async def revoke_license(license_id: str):
    """Revoke an active license."""
    doc = db.collection("licenses").document(license_id).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="License not found")
    db.collection("licenses").document(license_id).update({
        "status": "revoked",
        "revokedAt": datetime.now(timezone.utc),
    })
    return {"licenseId": license_id, "status": "revoked"}


@router.get("/license-types")
async def get_license_types():
    """List available license types."""
    return LICENSE_TYPES


# ── Email Alert Notifications (S16) ───────────────────────────────────────

class AlertSettingsRequest(BaseModel):
    email: str
    enabled: bool = True
    threshold: int = 0  # minimum unauthorized count to trigger alert


@router.post("/alert-settings")
async def update_alert_settings(req: AlertSettingsRequest, user_id: str = "demo_user"):
    """Configure email alert preferences."""
    db.collection("users").document(user_id).set({
        "alertEmail": req.email,
        "alertsEnabled": req.enabled,
        "alertThreshold": req.threshold,
    }, merge=True)
    return {"email": req.email, "enabled": req.enabled, "threshold": req.threshold}


@router.get("/alert-settings")
async def get_alert_settings(user_id: str = "demo_user"):
    """Get current alert settings."""
    doc = db.collection("users").document(user_id).get()
    if not doc.exists:
        return {"email": "", "enabled": False, "threshold": 0}
    data = doc.to_dict()
    return {
        "email": data.get("alertEmail", ""),
        "enabled": data.get("alertsEnabled", False),
        "threshold": data.get("alertThreshold", 0),
    }


@router.post("/send-test-alert")
async def send_test_alert(user_id: str = "demo_user"):
    """Send a test email alert to verify configuration."""
    doc = db.collection("users").document(user_id).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="User not found")
    email = doc.to_dict().get("alertEmail", "")
    if not email:
        raise HTTPException(status_code=400, detail="No alert email configured")

    result = send_scan_alert(
        to_email=email,
        asset_name="Test Asset",
        asset_id="test-000",
        match_count=3,
        unauthorized_count=2,
        risk_score=65,
    )
    return result


# ═══════════════════════════════════════════════════════════════════════════
# PHASE 1 — PRODUCTION-GRADE UPGRADES
# ═══════════════════════════════════════════════════════════════════════════


# ── Meta PDQ Hashing ──────────────────────────────────────────────────────

@router.get("/pdq/{asset_id}")
async def get_pdq_hash(asset_id: str):
    """Get the Meta PDQ hash for an asset."""
    doc = db.collection("assets").document(asset_id).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Asset not found")
    asset = doc.to_dict()
    pdq = asset.get("pdqHash")
    if not pdq:
        raise HTTPException(status_code=404, detail="No PDQ hash — re-upload to generate")
    return pdq


@router.post("/pdq-compare/{asset_id}")
async def compare_pdq_hashes(asset_id: str, file: UploadFile = File(...)):
    """
    Compare an uploaded image against an asset's PDQ hash.
    Uses Meta's production thresholds: ≤31 = near-duplicate, ≤63 = similar.
    """
    doc = db.collection("assets").document(asset_id).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Asset not found")
    asset = doc.to_dict()
    pdq = asset.get("pdqHash")
    if not pdq or not pdq.get("hash"):
        raise HTTPException(status_code=404, detail="No PDQ hash on this asset")

    file_bytes = await file.read()
    try:
        uploaded_pdq = _get('services.pdq_hasher', 'compute_pdq')(file_bytes)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not hash uploaded image: {e}")

    result = _get('services.pdq_hasher', 'compare_pdq')(pdq["hash"], uploaded_pdq["hash"])
    result["asset_hash"] = pdq["hash"]
    result["uploaded_hash"] = uploaded_pdq["hash"]
    return result


# ── CLIP Semantic Vector Search ──────────────────────────────────────────

@router.post("/clip-search")
async def search_by_image(file: UploadFile = File(...), top_k: int = Query(10)):
    """
    Semantic image search using CLIP embeddings.
    Upload an image → find visually similar assets (catches crops, recolors,
    memes, AI-upscaled copies that pHash/PDQ miss).
    """
    file_bytes = await file.read()
    results = _get('services.clip_search', 'search_similar')(file_bytes, user_id="demo_user", top_k=top_k)
    return {"matches": results, "count": len(results), "engine": "CLIP+Qdrant"}


class TextSearchRequest(BaseModel):
    query: str
    top_k: int = 10


@router.post("/clip-text-search")
async def search_by_text(req: TextSearchRequest):
    """
    Text-to-image search using CLIP's multimodal capability.
    E.g. "player celebrating goal" → finds matching images.
    """
    results = _get('services.clip_search', 'text_search')(req.query, user_id="demo_user", top_k=req.top_k)
    return {"query": req.query, "matches": results, "count": len(results)}


@router.get("/clip-stats")
async def get_clip_stats():
    """Get CLIP vector index statistics."""
    return _get('services.clip_search', 'get_collection_stats')()


# ── Forensic Watermark (DCT/DWT) ────────────────────────────────────────

@router.post("/forensic-watermark/{asset_id}")
async def apply_forensic_wm(asset_id: str):
    """
    Embed a forensic (DCT/DWT-SVD) watermark into an asset.
    Unlike LSB, this survives JPEG re-compression, screenshots,
    and social media re-encoding. Encodes user + session + timestamp.
    """
    doc = db.collection("assets").document(asset_id).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Asset not found")
    asset = doc.to_dict()
    if asset.get("type") != "image":
        raise HTTPException(status_code=400, detail="Only images support forensic watermarking")

    original_url = asset.get("originalUrl", "")
    if not original_url:
        raise HTTPException(status_code=404, detail="No original image URL")

    try:
        resp = httpx.get(original_url, timeout=20, follow_redirects=True)
        resp.raise_for_status()
        image_bytes = resp.content
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Could not fetch image: {e}")

    user_id = asset.get("userId", "demo_user")
    fw_result = _get('services.forensic_watermark', 'embed_forensic_watermark')(image_bytes, user_id=user_id, asset_id=asset_id, session_id=asset_id)
    fw_bytes = fw_result.pop("watermarked_bytes")
    fw_url = _get('services.cloudinary_client', 'upload_file')(fw_bytes, f"{asset_id}_fwm", user_id, "image")

    db.collection("assets").document(asset_id).update({
        "forensicWmUrl": fw_url,
        "forensicWatermark": fw_result,
    })

    return {
        "assetId": asset_id,
        "forensicWmUrl": fw_url,
        "algorithm": fw_result["algorithm"],
        "bitsEmbedded": fw_result["bits_embedded"],
        "sessionId": fw_result["session_id"],
        "message": "DCT forensic watermark embedded — survives re-compression & screenshots",
    }


@router.post("/extract-forensic-watermark")
async def extract_forensic_wm(file: UploadFile = File(...), expected_bits: int = Query(0)):
    """
    Extract forensic watermark from an uploaded image.
    Identifies the exact leaker/session even from a screenshot or re-compressed copy.
    Pass expected_bits (from asset metadata) for best accuracy.
    """
    file_bytes = await file.read()
    result = _get('services.forensic_watermark', 'extract_forensic_watermark')(file_bytes, expected_bits=expected_bits)
    return result


@router.get("/extract-forensic-watermark/{asset_id}")
async def extract_forensic_wm_from_asset(asset_id: str):
    """
    Extract forensic watermark from an asset's watermarked copy.
    Verifies the watermark is intact and readable.
    """
    doc = db.collection("assets").document(asset_id).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Asset not found")
    asset = doc.to_dict()
    fw_url = asset.get("forensicWmUrl", "")
    if not fw_url:
        raise HTTPException(status_code=404, detail="No forensic watermark exists for this asset")

    try:
        resp = httpx.get(fw_url, timeout=20, follow_redirects=True)
        resp.raise_for_status()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Could not fetch watermarked image: {e}")

    expected_bits = asset.get("forensicWatermark", {}).get("bits_embedded", 0)
    result = _get('services.forensic_watermark', 'extract_forensic_watermark')(resp.content, expected_bits=expected_bits)
    return result


# ── C2PA Content Credentials ────────────────────────────────────────────

@router.get("/c2pa/{asset_id}")
async def get_c2pa_credential(asset_id: str):
    """Get C2PA Content Credential info for an asset."""
    doc = db.collection("assets").document(asset_id).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Asset not found")
    asset = doc.to_dict()
    c2pa = asset.get("c2pa")
    if not c2pa:
        raise HTTPException(status_code=404, detail="No C2PA credential — re-upload to generate")
    return c2pa


@router.post("/c2pa-sign/{asset_id}")
async def sign_with_c2pa(asset_id: str):
    """
    Sign an existing asset with C2PA Content Credentials.
    Creates a cryptographically signed manifest (same standard used by
    Adobe, BBC, Sony, Leica) that proves ownership and provenance.
    """
    doc = db.collection("assets").document(asset_id).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Asset not found")
    asset = doc.to_dict()
    if asset.get("type") != "image":
        raise HTTPException(status_code=400, detail="C2PA signing currently supports images only")

    original_url = asset.get("originalUrl", "")
    if not original_url:
        raise HTTPException(status_code=404, detail="No original image URL")

    try:
        resp = httpx.get(original_url, timeout=20, follow_redirects=True)
        resp.raise_for_status()
        image_bytes = resp.content
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Could not fetch image: {e}")

    user_id = asset.get("userId", "demo_user")
    result = _get('services.c2pa_credentials', 'sign_asset')(image_bytes, user_id, asset_id, asset.get("filename", ""), "image/png")

    if not result.get("signed"):
        raise HTTPException(status_code=500, detail=f"C2PA signing failed: {result.get('error')}")

    signed_bytes = result.pop("manifest_bytes")
    c2pa_url = _get('services.cloudinary_client', 'upload_file')(signed_bytes, f"{asset_id}_c2pa", user_id, "image")

    c2pa_data = {
        "signed": True,
        "c2paUrl": c2pa_url,
        "claimGenerator": result.get("claim_generator"),
        "signedAt": result.get("signed_at"),
        "algorithm": result.get("algorithm"),
        "standard": result.get("standard"),
    }
    db.collection("assets").document(asset_id).update({"c2pa": c2pa_data})

    return {
        **c2pa_data,
        "message": "C2PA Content Credential signed — verifiable at contentcredentials.org/verify",
    }


@router.post("/c2pa-verify")
async def verify_c2pa(file: UploadFile = File(...)):
    """
    Verify C2PA Content Credentials in an uploaded file.
    Returns provenance info: who signed it, when, integrity status.
    Anyone can verify — this is the open standard used by 6,000+ organizations.
    """
    file_bytes = await file.read()
    result = _get('services.c2pa_credentials', 'verify_asset')(file_bytes, file.filename or "image.png")
    summary = _get('services.c2pa_credentials', 'get_credential_summary')(result)
    return {**result, "summary": summary}


@router.get("/c2pa-verify/{asset_id}")
async def verify_c2pa_asset(asset_id: str):
    """Verify C2PA credentials on an asset's signed copy."""
    doc = db.collection("assets").document(asset_id).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Asset not found")
    asset = doc.to_dict()
    c2pa_url = asset.get("c2pa", {}).get("c2paUrl", "")
    if not c2pa_url:
        raise HTTPException(status_code=404, detail="No C2PA signed copy exists")

    try:
        resp = httpx.get(c2pa_url, timeout=20, follow_redirects=True)
        resp.raise_for_status()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Could not fetch C2PA signed file: {e}")

    result = _get('services.c2pa_credentials', 'verify_asset')(resp.content, asset.get("filename", "image.png"))
    summary = _get('services.c2pa_credentials', 'get_credential_summary')(result)
    return {**result, "summary": summary}


# ── Phase 1 Info Endpoint ────────────────────────────────────────────────

@router.get("/protection-stack")
async def get_protection_stack():
    """
    Returns the full protection technology stack.
    Useful for the frontend to show what technologies are active.
    """
    return {
        "version": "2.0",
        "stack": [
            {
                "name": "Meta PDQ",
                "category": "hashing",
                "description": "Production-grade perceptual hash (256-bit) used by Meta at billion-scale",
                "replaces": "imagehash pHash",
                "robustness": "re-compression, resize, crop, brightness/contrast",
            },
            {
                "name": "CLIP + Qdrant",
                "category": "vector_search",
                "description": "Semantic similarity search using 512-dim CLIP embeddings",
                "replaces": "SerpAPI-only reverse search",
                "robustness": "crop, recolor, meme overlay, AI upscale, mirror",
            },
            {
                "name": "DCT Forensic Watermark",
                "category": "watermarking",
                "description": "Frequency-domain (DWT-DCT-SVD) invisible watermark with per-session payload",
                "replaces": "LSB steganography",
                "robustness": "JPEG re-compression, screenshots, social media re-encoding, moderate crop",
            },
            {
                "name": "C2PA Content Credentials",
                "category": "provenance",
                "description": "Industry-standard cryptographic provenance (Adobe, BBC, Sony, 6000+ orgs)",
                "replaces": "SHA-256+HMAC blockchain proof",
                "robustness": "Tamper-evident, court-admissible, verifiable at contentcredentials.org",
            },
        ],
    }


# ═══════════════════════════════════════════════════════════════════════════
# PHASE 2 — LIVE STREAM PIRACY RADAR
# ═══════════════════════════════════════════════════════════════════════════


# ── Radar Event Management ─────────────────────────────────────────────────

class CreateEventRequest(BaseModel):
    eventName: str
    teams: list[str] = []
    broadcaster: str = ""
    league: str = ""
    dateTime: str = ""
    knownPirateSites: list[str] = []


@router.post("/radar/events")
async def create_radar_event(req: CreateEventRequest, user_id: str = "demo_user"):
    """
    Create a monitored sports event.
    This is the anchor — submit reference clips and suspect streams against it.
    """
    event = _get('services.radar_engine', 'create_event')(
        event_name=req.eventName,
        teams=req.teams,
        broadcaster=req.broadcaster,
        league=req.league,
        user_id=user_id,
    )
    return event


@router.post("/radar/events/{event_id}/scan")
async def scan_for_pirates(event_id: str, user_id: str = "demo_user"):
    """
    Search the web for unauthorized streams/clips of a monitored event.
    Uses Gemini with Google Search grounding to find pirate sites.
    """
    result = await scan_event_for_pirates(event_id, user_id)
    if result.get("error"):
        raise HTTPException(status_code=404, detail=result["error"])
    return result


@router.get("/radar/events")
async def list_radar_events(user_id: str = "demo_user"):
    """List all monitored events for the user."""
    events = _get('services.radar_engine', 'list_events')(user_id)
    return {"events": events, "count": len(events)}


@router.get("/radar/events/{event_id}")
async def get_radar_event(event_id: str):
    """Get details of a specific monitored event."""
    event = _get('services.radar_engine', 'get_event')(event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    # Strip large fields for API response
    resp = {k: v for k, v in event.items() if k not in ("reference_fingerprints", "reference_frame_hashes")}
    resp["reference_clips"] = len(event.get("reference_fingerprints", []))
    resp["reference_frames"] = len(event.get("reference_frame_hashes", []))
    return resp


@router.post("/radar/events/{event_id}/stop")
async def stop_radar_event(event_id: str):
    """Stop monitoring an event."""
    result = _get('services.radar_engine', 'stop_event')(event_id)
    if result.get("error"):
        raise HTTPException(status_code=404, detail=result["error"])
    return result


# ── Reference Ingestion ────────────────────────────────────────────────────

@router.post("/radar/events/{event_id}/reference")
async def ingest_reference_clip(event_id: str, file: UploadFile = File(...)):
    """
    Upload a reference clip from the official broadcast.
    Extracts audio fingerprint + visual frame hashes as the matching baseline.
    """
    file_bytes = await file.read()
    result = _get('services.radar_engine', 'ingest_reference')(event_id, file_bytes, file.filename or "")
    if result.get("error"):
        raise HTTPException(status_code=404, detail=result["error"])
    return result


# ── Suspect Analysis ───────────────────────────────────────────────────────

class AnalyzeSuspectRequest(BaseModel):
    sourceUrl: str = ""


@router.post("/radar/events/{event_id}/suspect")
async def submit_suspect_stream(
    event_id: str,
    file: UploadFile = File(...),
    source_url: str = Query(""),
):
    """
    Submit a suspect stream/clip for analysis against the event's reference material.

    Runs the full piracy detection pipeline:
      1. Audio fingerprint matching (catches re-streams even with visual overlay)
      2. Visual frame comparison (PDQ hash match)
      3. Multimodal confirmation (scoreboard OCR + logo detection + commentary transcription)
      4. Composite scoring → piracy verdict
    """
    file_bytes = await file.read()
    result = _get('services.radar_engine', 'analyze_suspect')(
        event_id=event_id,
        file_bytes=file_bytes,
        source_url=source_url,
        filename=file.filename or "",
    )
    if result.get("error"):
        raise HTTPException(status_code=404, detail=result["error"])
    return result


@router.get("/radar/suspects/{suspect_id}")
async def get_suspect_analysis(suspect_id: str):
    """Get full analysis result for a specific suspect."""
    result = _get('services.radar_engine', 'get_suspect')(suspect_id)
    if not result:
        raise HTTPException(status_code=404, detail="Suspect not found")
    return result


# ── Detections ─────────────────────────────────────────────────────────────

@router.get("/radar/detections")
async def list_detections(event_id: str = Query(None), user_id: str = "demo_user"):
    """List all confirmed pirate stream detections."""
    detections = _get('services.radar_engine', 'get_detections')(event_id=event_id, user_id=user_id)
    return {"detections": detections, "count": len(detections)}


# ── Radar Stats (Dashboard) ───────────────────────────────────────────────

@router.get("/radar/stats")
async def get_radar_dashboard_stats(user_id: str = "demo_user"):
    """
    Get radar dashboard statistics.
    Shows active events, total suspects analyzed, pirate streams found,
    and which detection capabilities are available.
    """
    return _get('services.radar_engine', 'get_radar_stats')(user_id)


# ═══════════════════════════════════════════════════════════════════════════
# PHASE 3 — AUTONOMOUS ENFORCEMENT AGENT
# ═══════════════════════════════════════════════════════════════════════════


@router.post("/enforce/cases")
async def create_case(detection_id: str = Query(...), user_id: str = "demo_user"):
    """
    Create an enforcement case from a pirate detection.
    Auto-gathers evidence and generates platform-specific DMCA.
    """
    detections = _get('services.radar_engine', 'get_detections')(user_id=user_id)
    detection = next((d for d in detections if d.get("detection_id") == detection_id), None)
    if not detection:
        raise HTTPException(status_code=404, detail="Detection not found")
    case = create_enforcement_case(detection, user_id)
    return case


@router.get("/enforce/cases")
async def list_enforcement_cases(
    status: str = Query(None),
    user_id: str = "demo_user",
):
    """List all enforcement cases, optionally filtered by status."""
    return {"cases": list_cases(user_id, status), "count": len(list_cases(user_id, status))}


@router.get("/enforce/cases/{case_id}")
async def get_enforcement_case(case_id: str):
    """Get full details of an enforcement case including timeline."""
    case = get_case(case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    return case


@router.post("/enforce/cases/{case_id}/file")
async def file_case_dmca(case_id: str):
    """
    File the DMCA takedown for this case.
    Targets the detected platform with the correct format and method.
    """
    result = enforcement_file_dmca(case_id)
    if result.get("error"):
        raise HTTPException(status_code=404, detail=result["error"])
    return result


@router.post("/enforce/cases/{case_id}/escalate")
async def escalate_enforcement(case_id: str):
    """
    Escalate a case to the next level.
    L1: Re-file urgent DMCA | L2: Notify host/registrar | L3: Legal package
    """
    result = escalate_case(case_id)
    if result.get("error"):
        raise HTTPException(status_code=404, detail=result["error"])
    return result


@router.post("/enforce/cases/{case_id}/resolve")
async def resolve_enforcement(case_id: str, resolution: str = Query("content_removed")):
    """Mark a case as resolved (pirate stream taken down)."""
    result = resolve_case(case_id, resolution)
    if result.get("error"):
        raise HTTPException(status_code=404, detail=result["error"])
    return result


@router.get("/enforce/stats")
async def enforcement_stats(user_id: str = "demo_user"):
    """
    Enforcement dashboard metrics: resolution times, escalation breakdown,
    under-30-minute rate (the killer metric that beats 97.3% of the industry).
    """
    return get_enforcement_stats(user_id)


@router.get("/enforce/escalation-queue")
async def escalation_queue(user_id: str = "demo_user"):
    """Get cases that are past their escalation deadline and need attention."""
    return {"cases": get_cases_needing_escalation(user_id)}


# ── Evidence Pack ──────────────────────────────────────────────────────────

@router.get("/enforce/cases/{case_id}/evidence-pack")
async def get_evidence_pack(case_id: str):
    """
    Generate a court-ready evidence pack for a case.
    Includes: forensic evidence, detection analysis, enforcement timeline,
    DMCA details — all cryptographically hashed.
    """
    case = get_case(case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    pack = _get('services.evidence_pack', 'generate_evidence_pack')(case)
    return pack


@router.get("/enforce/cases/{case_id}/evidence-pack/download")
async def download_evidence_pack(case_id: str):
    """Download the evidence pack as a text file."""
    case = get_case(case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    pack = _get('services.evidence_pack', 'generate_evidence_pack')(case)
    return Response(
        content=pack["report_text"],
        media_type="text/plain",
        headers={"Content-Disposition": f'attachment; filename="evidence_{case_id}.txt"'},
    )


# ═══════════════════════════════════════════════════════════════════════════
# PHASE 4 — CROWDSOURCED DETECTOR NETWORK
# ═══════════════════════════════════════════════════════════════════════════


class PirateReportRequest(BaseModel):
    suspectUrl: str
    eventName: str = ""
    platform: str = ""
    description: str = ""


@router.post("/crowd/submit")
async def submit_crowd_report(req: PirateReportRequest, reporter_id: str = "demo_user"):
    """
    Submit a suspected pirate stream/link to the crowd network.
    Anyone can submit — the system auto-verifies via fingerprint matching.
    Verified finds earn reputation points.
    """
    sub = submit_pirate_report(
        reporter_id=reporter_id,
        suspect_url=req.suspectUrl,
        event_name=req.eventName,
        platform=req.platform,
        description=req.description,
    )
    return sub


@router.post("/crowd/verify/{submission_id}")
async def verify_crowd_submission(
    submission_id: str,
    is_pirate: bool = Query(...),
    confidence: float = Query(0.0),
):
    """Verify a crowd submission (auto or manual). Awards points if confirmed."""
    result = verify_submission(submission_id, is_pirate, confidence)
    if result.get("error"):
        raise HTTPException(status_code=404, detail=result["error"])
    return result


@router.get("/crowd/submissions")
async def list_crowd_submissions(
    status: str = Query(None),
    reporter_id: str = Query(None),
    limit: int = Query(50),
):
    """List crowd submissions with optional filters."""
    subs = list_submissions(status=status, reporter_id=reporter_id, limit=limit)
    return {"submissions": subs, "count": len(subs)}


@router.get("/crowd/pending")
async def get_pending_crowd_submissions():
    """Get submissions awaiting verification."""
    pending = get_pending_submissions()
    return {"submissions": pending, "count": len(pending)}


@router.get("/crowd/leaderboard")
async def get_crowd_leaderboard(limit: int = Query(20)):
    """
    Top contributors by pirate detection points.
    Ranks: Scout → Hunter → Veteran → Expert → Legend.
    """
    return {"leaderboard": get_leaderboard(limit)}


@router.get("/crowd/contributors/{user_id}")
async def get_crowd_contributor(user_id: str):
    """Get a contributor's profile with badges and submission history."""
    profile = get_contributor_profile(user_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Contributor not found")
    return profile


class BountyRequest(BaseModel):
    eventName: str
    description: str = ""
    bonusPoints: int = 100


@router.post("/crowd/bounties")
async def create_crowd_bounty(req: BountyRequest, user_id: str = "demo_user"):
    """
    Create a bounty for finding pirate streams of a specific event.
    Higher bonus points attract more contributors to hunt for pirates.
    """
    bounty = create_bounty(
        event_name=req.eventName,
        description=req.description,
        bonus_points=req.bonusPoints,
        user_id=user_id,
    )
    return bounty


@router.get("/crowd/bounties")
async def list_crowd_bounties(status: str = Query("active")):
    """List active bounties."""
    return {"bounties": list_bounties(status)}


@router.get("/crowd/stats")
async def crowd_network_stats():
    """
    Crowdsourced network statistics: contributors, submissions,
    verification rate, top detectors, active bounties.
    """
    return get_network_stats()


# ═══════════════════════════════════════════════════════════════════════════
# PHASE 4 — PUBLIC API INFO
# ═══════════════════════════════════════════════════════════════════════════


@router.get("/public-api/info")
async def public_api_info():
    """
    Public API documentation endpoint.
    Lists available endpoints for rights-holders to integrate.
    """
    return {
        "name": "SportShield Public API",
        "version": "2.0",
        "description": "End-to-end sports content protection: Protect → Detect → Trace → Enforce → Prove",
        "endpoints": {
            "protect": {
                "POST /upload": "Upload and protect media (PDQ hash + CLIP index + watermark + C2PA sign)",
                "POST /c2pa-verify": "Verify C2PA Content Credentials",
                "POST /clip-search": "Semantic image search using CLIP embeddings",
                "POST /clip-text-search": "Text-to-image search",
            },
            "detect": {
                "POST /radar/events": "Create a monitored event",
                "POST /radar/events/{id}/reference": "Upload reference broadcast clip",
                "POST /radar/events/{id}/suspect": "Submit suspect stream for analysis",
                "GET /radar/detections": "List confirmed pirate detections",
            },
            "enforce": {
                "POST /enforce/cases": "Create enforcement case from detection",
                "POST /enforce/cases/{id}/file": "File DMCA takedown",
                "POST /enforce/cases/{id}/escalate": "Escalate unresponsive case",
                "GET /enforce/cases/{id}/evidence-pack": "Generate court-ready evidence",
            },
            "crowdsource": {
                "POST /crowd/submit": "Submit suspected pirate link",
                "GET /crowd/leaderboard": "Top contributors",
                "POST /crowd/bounties": "Create detection bounty",
            },
        },
        "auth": "Bearer token (Firebase Auth)",
        "rate_limit": "100 requests/minute (free tier)",
    }


# ═══════════════════════════════════════════════════════════════════════════
# SEED — populate Firestore with realistic war room data for demos
# ═══════════════════════════════════════════════════════════════════════════

@router.post("/seed-warroom")
async def seed_warroom(user_id: str = Query("demo_user")):
    """
    Seed Firestore with realistic war room data for a user.
    Creates events, detections, enforcement cases, crowd contributors,
    and leaderboard entries so the War Room looks fully operational.
    """
    from datetime import datetime, timezone, timedelta
    now = datetime.now(timezone.utc)

    def ts(hours_ago=0):
        return (now - timedelta(hours=hours_ago)).isoformat()

    # ── 1. Radar Events ──
    events = [
        {
            "event_id": f"evt_seed_001_{user_id[:8]}",
            "event_name": "India vs Australia — T20 World Cup Semi-Final",
            "teams": ["India", "Australia"],
            "broadcaster": "Star Sports",
            "league": "ICC T20 World Cup 2026",
            "user_id": user_id,
            "status": "monitoring",
            "reference_fingerprints": [],
            "reference_frame_hashes": [],
            "suspect_count": 14,
            "detection_count": 6,
            "created_at": ts(48),
            "updated_at": ts(1),
        },
        {
            "event_id": f"evt_seed_002_{user_id[:8]}",
            "event_name": "Arsenal vs Chelsea — Premier League GW34",
            "teams": ["Arsenal", "Chelsea"],
            "broadcaster": "Sky Sports",
            "league": "Premier League",
            "user_id": user_id,
            "status": "monitoring",
            "reference_fingerprints": [],
            "reference_frame_hashes": [],
            "suspect_count": 9,
            "detection_count": 3,
            "created_at": ts(72),
            "updated_at": ts(6),
        },
        {
            "event_id": f"evt_seed_003_{user_id[:8]}",
            "event_name": "Real Madrid vs Barcelona — La Liga Clásico",
            "teams": ["Real Madrid", "Barcelona"],
            "broadcaster": "DAZN",
            "league": "La Liga",
            "user_id": user_id,
            "status": "completed",
            "reference_fingerprints": [],
            "reference_frame_hashes": [],
            "suspect_count": 24,
            "detection_count": 9,
            "created_at": ts(120),
            "updated_at": ts(96),
        },
    ]

    for e in events:
        db.collection("radar_events").document(e["event_id"]).set(e)

    # ── 2. Pirate Detections ──
    detections = [
        {"detection_id": f"det_seed_001_{user_id[:8]}", "event_id": events[0]["event_id"], "event_name": events[0]["event_name"], "user_id": user_id, "source_url": "https://pirate-stream.live/cricket-free", "composite_score": 0.94, "confidence": "HIGH", "verdict": "PIRATE_STREAM_DETECTED", "audio_score": 0.92, "visual_score": 0.88, "multimodal_signals": 4, "dmca_status": "filed", "detected_at": ts(2)},
        {"detection_id": f"det_seed_002_{user_id[:8]}", "event_id": events[0]["event_id"], "event_name": events[0]["event_name"], "user_id": user_id, "source_url": "https://free-sports.tv/ind-v-aus", "composite_score": 0.87, "confidence": "HIGH", "verdict": "PIRATE_STREAM_DETECTED", "audio_score": 0.85, "visual_score": 0.80, "multimodal_signals": 3, "dmca_status": "resolved", "detected_at": ts(4)},
        {"detection_id": f"det_seed_003_{user_id[:8]}", "event_id": events[1]["event_id"], "event_name": events[1]["event_name"], "user_id": user_id, "source_url": "https://soccer-streams.net/epl-live", "composite_score": 0.91, "confidence": "HIGH", "verdict": "PIRATE_STREAM_DETECTED", "audio_score": 0.89, "visual_score": 0.85, "multimodal_signals": 4, "dmca_status": "filed", "detected_at": ts(8)},
        {"detection_id": f"det_seed_004_{user_id[:8]}", "event_id": events[2]["event_id"], "event_name": events[2]["event_name"], "user_id": user_id, "source_url": "https://futbol-gratis.io/clasico", "composite_score": 0.78, "confidence": "MEDIUM", "verdict": "PIRATE_STREAM_DETECTED", "audio_score": 0.72, "visual_score": 0.68, "multimodal_signals": 2, "dmca_status": "escalated", "detected_at": ts(100)},
        {"detection_id": f"det_seed_005_{user_id[:8]}", "event_id": events[0]["event_id"], "event_name": events[0]["event_name"], "user_id": user_id, "source_url": "https://stream247.cc/live-cricket", "composite_score": 0.82, "confidence": "HIGH", "verdict": "PIRATE_STREAM_DETECTED", "audio_score": 0.79, "visual_score": 0.75, "multimodal_signals": 3, "dmca_status": "filed", "detected_at": ts(3)},
    ]

    for d in detections:
        db.collection("radar_detections").document(d["detection_id"]).set(d)

    # ── 3. Enforcement Cases ──
    cases = [
        {
            "case_id": f"case_seed_001_{user_id[:8]}", "detection_id": detections[0]["detection_id"],
            "event_id": events[0]["event_id"], "event_name": "India vs Australia — T20 WC",
            "user_id": user_id, "source_url": "https://pirate-stream.live/cricket-free",
            "platform": "unknown", "status": "dmca_filed", "priority": "critical",
            "composite_score": 0.94, "confidence": "HIGH",
            "evidence": {"items": [{"type": "audio_fingerprint_match", "score": 0.92, "description": "Audio fingerprint match: 92% similarity"}, {"type": "visual_frame_match", "score": 0.88, "description": "Visual frame match: 88% similarity"}], "item_count": 2, "collected_at": ts(2)},
            "dmca": {"subject": "DMCA Takedown: Unauthorized stream of India vs Australia — T20 WC", "body": "Unauthorized re-stream detected", "platform": "unknown", "auto_generated": True, "filed_at": ts(1.5)},
            "timeline": [
                {"action": "case_created", "timestamp": ts(2), "detail": "Enforcement case created from pirate detection"},
                {"action": "dmca_generated", "timestamp": ts(2), "detail": "DMCA generated for unknown platform"},
                {"action": "dmca_filed", "timestamp": ts(1.5), "detail": "DMCA takedown filed"},
            ],
            "escalation_level": 0, "created_at": ts(2), "updated_at": ts(1.5), "resolved_at": None,
        },
        {
            "case_id": f"case_seed_002_{user_id[:8]}", "detection_id": detections[2]["detection_id"],
            "event_id": events[1]["event_id"], "event_name": "Arsenal vs Chelsea — PL",
            "user_id": user_id, "source_url": "https://soccer-streams.net/epl-live",
            "platform": "unknown", "status": "dmca_generated", "priority": "high",
            "composite_score": 0.91, "confidence": "HIGH",
            "evidence": {"items": [{"type": "audio_fingerprint_match", "score": 0.89, "description": "Audio fingerprint match: 89% similarity"}], "item_count": 1, "collected_at": ts(8)},
            "dmca": {"subject": "DMCA Takedown: Unauthorized stream of Arsenal vs Chelsea", "body": "Unauthorized re-stream detected", "platform": "unknown", "auto_generated": True},
            "timeline": [
                {"action": "case_created", "timestamp": ts(8), "detail": "Enforcement case created"},
                {"action": "dmca_generated", "timestamp": ts(8), "detail": "DMCA generated"},
            ],
            "escalation_level": 0, "created_at": ts(8), "updated_at": ts(8), "resolved_at": None,
        },
        {
            "case_id": f"case_seed_003_{user_id[:8]}", "detection_id": detections[3]["detection_id"],
            "event_id": events[2]["event_id"], "event_name": "Real Madrid vs Barcelona",
            "user_id": user_id, "source_url": "https://futbol-gratis.io/clasico",
            "platform": "unknown", "status": "escalated_host_notified", "priority": "critical",
            "composite_score": 0.78, "confidence": "MEDIUM",
            "evidence": {"items": [{"type": "audio_fingerprint_match", "score": 0.72, "description": "Audio fingerprint match: 72% similarity"}], "item_count": 1, "collected_at": ts(100)},
            "dmca": {"subject": "DMCA Takedown: Unauthorized stream of El Clásico", "body": "Unauthorized re-stream detected", "platform": "unknown", "auto_generated": True, "filed_at": ts(98)},
            "timeline": [
                {"action": "case_created", "timestamp": ts(100), "detail": "Enforcement case created"},
                {"action": "dmca_filed", "timestamp": ts(98), "detail": "DMCA takedown filed"},
                {"action": "escalated_level_1", "timestamp": ts(96), "detail": "Re-filed DMCA with URGENT priority"},
                {"action": "escalated_level_2", "timestamp": ts(72), "detail": "Notified hosting provider and domain registrar"},
            ],
            "escalation_level": 2, "created_at": ts(100), "updated_at": ts(72), "resolved_at": None,
        },
        {
            "case_id": f"case_seed_004_{user_id[:8]}", "detection_id": detections[1]["detection_id"],
            "event_id": events[0]["event_id"], "event_name": "India vs Australia — T20 WC",
            "user_id": user_id, "source_url": "https://free-sports.tv/ind-v-aus",
            "platform": "unknown", "status": "resolved", "priority": "high",
            "composite_score": 0.87, "confidence": "HIGH",
            "evidence": {"items": [{"type": "audio_fingerprint_match", "score": 0.85, "description": "Audio fingerprint match: 85% similarity"}], "item_count": 1, "collected_at": ts(4)},
            "dmca": {"subject": "DMCA Takedown", "body": "Unauthorized re-stream detected", "platform": "unknown", "auto_generated": True, "filed_at": ts(3.5)},
            "timeline": [
                {"action": "case_created", "timestamp": ts(4), "detail": "Enforcement case created"},
                {"action": "dmca_filed", "timestamp": ts(3.5), "detail": "DMCA takedown filed"},
                {"action": "resolved", "timestamp": ts(3), "detail": "Case resolved: content_removed (took 1h 0m)"},
            ],
            "escalation_level": 0, "resolution": "content_removed",
            "resolution_time_sec": 3600, "resolution_time_human": "1h 0m",
            "created_at": ts(4), "updated_at": ts(3), "resolved_at": ts(3),
        },
        {
            "case_id": f"case_seed_005_{user_id[:8]}", "detection_id": detections[4]["detection_id"],
            "event_id": events[0]["event_id"], "event_name": "India vs Australia — T20 WC",
            "user_id": user_id, "source_url": "https://stream247.cc/live-cricket",
            "platform": "unknown", "status": "dmca_filed", "priority": "high",
            "composite_score": 0.82, "confidence": "HIGH",
            "evidence": {"items": [{"type": "audio_fingerprint_match", "score": 0.79, "description": "Audio fingerprint match: 79% similarity"}], "item_count": 1, "collected_at": ts(3)},
            "dmca": {"subject": "DMCA Takedown", "body": "Unauthorized re-stream detected", "platform": "unknown", "auto_generated": True, "filed_at": ts(2.5)},
            "timeline": [
                {"action": "case_created", "timestamp": ts(3), "detail": "Enforcement case created"},
                {"action": "dmca_filed", "timestamp": ts(2.5), "detail": "DMCA takedown filed"},
                {"action": "escalated_level_1", "timestamp": ts(2), "detail": "Re-filed DMCA with URGENT priority"},
            ],
            "escalation_level": 1, "created_at": ts(3), "updated_at": ts(2), "resolved_at": None,
        },
    ]

    for c in cases:
        db.collection("enforcement_cases").document(c["case_id"]).set(c)

    # ── 4. Crowd Contributors & Leaderboard ──
    contributors = [
        {"user_id": "piracyhunter_in", "display_name": "PiracyHunter_IN", "total_points": 4820, "submissions": 63, "verified_finds": 47, "false_reports": 2, "rank": "legend", "joined_at": ts(720), "badges": ["first_catch", "sharp_eye", "pirate_hunter", "points_master"]},
        {"user_id": "streamwatch_uk", "display_name": "StreamWatch_UK", "total_points": 3150, "submissions": 44, "verified_finds": 31, "false_reports": 1, "rank": "expert", "joined_at": ts(600), "badges": ["first_catch", "sharp_eye", "pirate_hunter", "points_master"]},
        {"user_id": "sportguard", "display_name": "SportGuard", "total_points": 2740, "submissions": 38, "verified_finds": 26, "false_reports": 3, "rank": "expert", "joined_at": ts(500), "badges": ["first_catch", "sharp_eye", "pirate_hunter", "points_master"]},
        {"user_id": "cricketshield", "display_name": "CricketShield", "total_points": 1890, "submissions": 25, "verified_finds": 18, "false_reports": 0, "rank": "veteran", "joined_at": ts(480), "badges": ["first_catch", "sharp_eye", "points_master"]},
        {"user_id": "footballpatrol", "display_name": "FootballPatrol", "total_points": 1420, "submissions": 20, "verified_finds": 14, "false_reports": 1, "rank": "veteran", "joined_at": ts(400), "badges": ["first_catch", "sharp_eye", "points_master"]},
        {"user_id": "antipirate_sa", "display_name": "AntiPirate_SA", "total_points": 960, "submissions": 14, "verified_finds": 9, "false_reports": 0, "rank": "hunter", "joined_at": ts(300), "badges": ["first_catch"]},
        {"user_id": "streamdetective", "display_name": "StreamDetective", "total_points": 710, "submissions": 11, "verified_finds": 7, "false_reports": 1, "rank": "hunter", "joined_at": ts(240), "badges": ["first_catch"]},
        {"user_id": "mediawatch", "display_name": "MediaWatch", "total_points": 340, "submissions": 6, "verified_finds": 3, "false_reports": 0, "rank": "hunter", "joined_at": ts(120), "badges": ["first_catch"]},
    ]

    for c in contributors:
        db.collection("crowd_contributors").document(c["user_id"]).set(c)

    # ── 5. Sample Crowd Submissions ──
    submissions = [
        {"submission_id": f"sub_seed_001", "reporter_id": "piracyhunter_in", "suspect_url": "https://pirate-stream.live/cricket-free", "event_name": "India vs Australia — T20 WC", "platform": "unknown", "description": "Pirate re-stream with 30s delay", "status": "verified_pirate", "verification_result": "confirmed", "points_awarded": 45, "submitted_at": ts(3), "verified_at": ts(2.5)},
        {"submission_id": f"sub_seed_002", "reporter_id": "streamwatch_uk", "suspect_url": "https://soccer-streams.net/epl-live", "event_name": "Arsenal vs Chelsea — PL GW34", "platform": "unknown", "description": "Full match pirate stream", "status": "verified_pirate", "verification_result": "confirmed", "points_awarded": 40, "submitted_at": ts(10), "verified_at": ts(9)},
        {"submission_id": f"sub_seed_003", "reporter_id": "footballpatrol", "suspect_url": "https://futbol-gratis.io/clasico", "event_name": "Real Madrid vs Barcelona", "platform": "unknown", "description": "El Clásico pirate stream found on Telegram-linked site", "status": "verified_pirate", "verification_result": "confirmed", "points_awarded": 55, "submitted_at": ts(100), "verified_at": ts(99)},
    ]

    for s in submissions:
        db.collection("crowd_submissions").document(s["submission_id"]).set(s)

    return {
        "seeded": True,
        "user_id": user_id,
        "events": len(events),
        "detections": len(detections),
        "cases": len(cases),
        "contributors": len(contributors),
        "submissions": len(submissions),
    }
