from fastapi import APIRouter, UploadFile, File, HTTPException, Query
from fastapi.responses import Response
from pydantic import BaseModel
from services.firebase_client import db
from services.cloudinary_client import upload_file
from services.fingerprint import compute_phash
from services.crawler import scan_asset, scrape_social_image
from services.ai_detector import detect_ai_image
from services.watermark import apply_visible_watermark
from services.risk_score import compute_risk_score
from services.domain_classifier import get_trusted_domains, classify_url
from services.propagation_tracker import build_propagation_data, extract_domain, categorize_platform
from services.deepfake_detector import detect_deepfake
from services.video_fingerprint import compute_video_fingerprint, compare_video_to_assets, extract_frames
from services.invisible_watermark import embed_watermark, extract_watermark
from services.music_detector import detect_music_from_bytes
from services.dmca_generator import generate_dmca_notice, generate_batch_notices, get_platform_info
from services.blockchain_timestamp import create_ownership_proof, verify_ownership_proof, generate_proof_certificate
from services.scheduled_scanner import schedule_asset_rescan, unschedule_asset_rescan, get_scheduled_jobs, start_scheduler
from services.licensing import create_license, check_license_status, verify_usage, LICENSE_TYPES
from services.email_alerts import send_scan_alert, send_dmca_confirmation
from config import SERPAPI_KEY, HF_TOKEN
import uuid
import threading
import httpx
from datetime import datetime, timezone

start_scheduler()

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

        matches = compare_video_to_assets(video_fp, image_assets, threshold=0.50)

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
async def upload_media(file: UploadFile = File(...)):
    file_bytes = await file.read()
    content_type = file.content_type or ""
    is_audio = content_type.startswith("audio")
    resource_type = (
        "video" if content_type.startswith("video")
        else "audio" if is_audio
        else "image"
    )
    asset_id = str(uuid.uuid4())
    user_id  = "demo_user"

    cloudinary_type = "video" if resource_type in ("video", "audio") else "image"
    original_url = upload_file(file_bytes, asset_id, user_id, cloudinary_type)

    phash = ""
    watermarked_url = ""
    invisible_wm_url = ""
    video_fingerprint = None
    music_analysis = None

    # S13: Music detection for audio and video files
    if resource_type in ("audio", "video"):
        try:
            music_analysis = detect_music_from_bytes(file_bytes, file.filename or "")
            print(f"[music] Detection: {music_analysis.get('summary', 'N/A')}")
        except Exception as e:
            print(f"[music] Detection failed: {e}")

    if resource_type == "image":
        phash = compute_phash(file_bytes)
        # Visible watermark
        try:
            wm_bytes = apply_visible_watermark(
                file_bytes,
                user_email=f"{user_id}@sportshield",
                session_id=asset_id,
                asset_id=asset_id,
            )
            watermarked_url = upload_file(wm_bytes, f"{asset_id}_wm", user_id, "image")
        except Exception as e:
            print(f"[watermark] could not generate watermarked copy: {e}")
        # S5: Invisible watermark (LSB steganography)
        try:
            inv_bytes = embed_watermark(file_bytes, user_id=user_id, asset_id=asset_id)
            invisible_wm_url = upload_file(inv_bytes, f"{asset_id}_inv", user_id, "image")
            print(f"[invisible_wm] Embedded for asset {asset_id[:8]}")
        except Exception as e:
            print(f"[invisible_wm] Failed: {e}")
    elif resource_type == "video":
        try:
            video_fingerprint = compute_video_fingerprint(file_bytes, max_frames=12)
            phash = video_fingerprint.get("primaryHash", "")
            print(f"[video] Extracted {video_fingerprint['frameCount']} frames, primary hash: {phash}")
        except Exception as e:
            print(f"[video] Fingerprinting failed: {e}")

    asset_doc = {
        "userId":           user_id,
        "filename":         file.filename,
        "originalUrl":      original_url,
        "watermarkedUrl":   watermarked_url,
        "invisibleWmUrl":   invisible_wm_url,
        "type":             resource_type,
        "phash":            phash,
        "uploadedAt":       datetime.now(timezone.utc),
        "status":         "pending",
        "scanCount":      0,
        "matchCount":     0,
        "source":         "upload",
    }
    if video_fingerprint:
        asset_doc["videoFingerprint"] = video_fingerprint
    if music_analysis:
        asset_doc["musicAnalysis"] = music_analysis

    # S11: Create ownership proof on upload
    try:
        proof = create_ownership_proof(file_bytes, asset_id, user_id, file.filename or "", phash)
        asset_doc["ownershipProof"] = proof
    except Exception as e:
        print(f"[proof] Failed: {e}")

    db.collection("assets").document(asset_id).set(asset_doc)

    if resource_type == "image":
        t = threading.Thread(
            target=run_scan,
            args=(asset_id, user_id, phash, original_url, file_bytes),
        )
        t.daemon = True
        t.start()
    elif resource_type == "video" and phash:
        t = threading.Thread(
            target=run_video_scan,
            args=(asset_id, user_id, video_fingerprint, original_url),
        )
        t.daemon = True
        t.start()

    return {
        "id":             asset_id,
        "assetId":        asset_id,
        "filename":       file.filename,
        "url":            original_url,
        "originalUrl":    original_url,
        "watermarkedUrl": watermarked_url,
        "phash":          phash,
        "status":         "pending",
    }


# ── Social / web URL scan endpoint ──────────────────────────────────────────

class SocialScanRequest(BaseModel):
    url: str
    label: str = ""   # e.g. "Instagram post", "Twitter screenshot"


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
    user_id   = "demo_user"
    filename  = req.label or f"social_{asset_id[:8]}"

    # Upload extracted image to Cloudinary
    original_url = upload_file(image_bytes, asset_id, user_id, "image")
    phash        = compute_phash(image_bytes)

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
async def list_assets():
    assets = db.collection("assets").where("userId", "==", "demo_user").stream()
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
    watermarked = apply_visible_watermark(
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

    matches = compare_video_to_assets(vf, others)
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
    inv_bytes = embed_watermark(image_bytes, user_id=user_id, asset_id=asset_id)
    inv_url = upload_file(inv_bytes, f"{asset_id}_inv", user_id, "image")

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
    result = extract_watermark(file_bytes)
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

    result = extract_watermark(resp.content)
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

    result = detect_music_from_bytes(file_bytes, asset.get("filename", ""))

    db.collection("assets").document(asset_id).update({"musicAnalysis": result})

    return result


@router.post("/music-detect-upload")
async def detect_music_upload(file: UploadFile = File(...)):
    """
    Run music detection on an uploaded file (no asset creation).
    Supports audio and video files.
    """
    file_bytes = await file.read()
    result = detect_music_from_bytes(file_bytes, file.filename or "")
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

    proof = create_ownership_proof(
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
    cert = generate_proof_certificate(proof)
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
    result = verify_ownership_proof(proof, file_bytes)
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

    result = schedule_asset_rescan(asset_id, user_id, req.intervalHours)

    db.collection("assets").document(asset_id).update({
        "monitoringEnabled": True,
        "monitoringInterval": req.intervalHours,
    })

    return result


@router.delete("/schedule/{asset_id}")
async def unschedule_scan(asset_id: str):
    """Stop scheduled re-scans for an asset."""
    result = unschedule_asset_rescan(asset_id)
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
    return {"jobs": get_scheduled_jobs()}


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

    if not phash or not original_url:
        raise HTTPException(status_code=400, detail="Asset missing phash or URL")

    if asset.get("type") == "image":
        try:
            resp = httpx.get(original_url, timeout=20, follow_redirects=True)
            resp.raise_for_status()
            image_bytes = resp.content
        except Exception:
            image_bytes = None

        t = threading.Thread(target=run_scan, args=(asset_id, user_id, phash, original_url, image_bytes))
        t.daemon = True
        t.start()
    else:
        db.collection("assets").document(asset_id).update({"status": "scanning"})

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
