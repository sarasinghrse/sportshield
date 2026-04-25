from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel
from services.firebase_client import db
from services.cloudinary_client import upload_file
from services.fingerprint import compute_phash
from services.crawler import scan_asset, scrape_social_image
from services.ai_detector import detect_ai_image
from config import SERPAPI_KEY, HF_TOKEN
import uuid
import threading
from datetime import datetime, timezone

router = APIRouter()


# ── Background scan task ────────────────────────────────────────────────────

def run_scan(asset_id, user_id, phash, original_url, image_bytes=None):
    try:
        db.collection("assets").document(asset_id).update({"status": "scanning"})

        # AI detection (runs in background alongside web scan)
        ai_result = {"is_ai": False, "confidence": 0, "label": "unknown"}
        if image_bytes and HF_TOKEN:
            ai_result = detect_ai_image(image_bytes, HF_TOKEN)
            db.collection("assets").document(asset_id).update({
                "aiDetection": ai_result
            })

        # Reverse image / web scan
        matches = scan_asset(phash, original_url, SERPAPI_KEY)

        for match in matches:
            result_id = str(uuid.uuid4())
            db.collection("scan_results").document(result_id).set({
                "assetId":      asset_id,
                "userId":       user_id,
                "foundUrl":     match["found_url"],
                "thumbnailUrl": match["thumbnail_url"],
                "confidence":   match["confidence"],
                "severity":     match["severity"],
                "scannedAt":    datetime.now(timezone.utc),
                "status":       "flagged",
            })
            alert_id = str(uuid.uuid4())
            db.collection("alerts").document(alert_id).set({
                "assetId":       asset_id,
                "userId":        user_id,
                "scanResultId":  result_id,
                "confidence":    match["confidence"],
                "foundUrl":      match["found_url"],
                "thumbnailUrl":  match["thumbnail_url"],
                "severity":      match["severity"],
                "isRead":        False,
                "createdAt":     datetime.now(timezone.utc),
            })

        db.collection("assets").document(asset_id).update({
            "status":        "complete",
            "matchCount":    len(matches),
            "scanCount":     1,
            "lastScannedAt": datetime.now(timezone.utc),
            "aiDetection":   ai_result,
        })
    except Exception as e:
        print(f"[run_scan] error: {e}")
        db.collection("assets").document(asset_id).update({"status": "error"})


# ── Upload endpoint ──────────────────────────────────────────────────────────

@router.post("/upload")
async def upload_media(file: UploadFile = File(...)):
    file_bytes = await file.read()
    resource_type = (
        "video" if file.content_type and file.content_type.startswith("video")
        else "image"
    )
    asset_id = str(uuid.uuid4())
    user_id  = "demo_user"

    original_url = upload_file(file_bytes, asset_id, user_id, resource_type)

    phash = ""
    if resource_type == "image":
        phash = compute_phash(file_bytes)

    db.collection("assets").document(asset_id).set({
        "userId":      user_id,
        "filename":    file.filename,
        "originalUrl": original_url,
        "type":        resource_type,
        "phash":       phash,
        "uploadedAt":  datetime.now(timezone.utc),
        "status":      "pending",
        "scanCount":   0,
        "matchCount":  0,
        "source":      "upload",
    })

    if resource_type == "image":
        t = threading.Thread(
            target=run_scan,
            args=(asset_id, user_id, phash, original_url, file_bytes),
        )
        t.daemon = True
        t.start()

    return {
        "id":          asset_id,
        "assetId":     asset_id,
        "filename":    file.filename,
        "url":         original_url,
        "originalUrl": original_url,
        "phash":       phash,
        "status":      "pending",
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
