from fastapi import APIRouter, UploadFile, File, Header
from services.firebase_client import db
from services.cloudinary_client import upload_file
from services.fingerprint import compute_phash
from services.crawler import scan_asset
from config import SERPAPI_KEY
import uuid
import threading
from datetime import datetime, timezone

router = APIRouter()

def run_scan(asset_id, user_id, phash, original_url):
    try:
        db.collection("assets").document(asset_id).update({"status": "scanning"})
        matches = scan_asset(phash, original_url, SERPAPI_KEY)
        for match in matches:
            result_id = str(uuid.uuid4())
            db.collection("scan_results").document(result_id).set({
                "assetId": asset_id,
                "userId": user_id,
                "foundUrl": match["found_url"],
                "thumbnailUrl": match["thumbnail_url"],
                "confidence": match["confidence"],
                "severity": match["severity"],
                "scannedAt": datetime.now(timezone.utc),
                "status": "flagged"
            })
            alert_id = str(uuid.uuid4())
            db.collection("alerts").document(alert_id).set({
                "assetId": asset_id,
                "userId": user_id,
                "scanResultId": result_id,
                "confidence": match["confidence"],
                "foundUrl": match["found_url"],
                "severity": match["severity"],
                "isRead": False,
                "createdAt": datetime.now(timezone.utc)
            })
        db.collection("assets").document(asset_id).update({
            "status": "complete",
            "matchCount": len(matches),
            "lastScannedAt": datetime.now(timezone.utc)
        })
    except Exception as e:
        print(f"Scan error: {e}")
        db.collection("assets").document(asset_id).update({"status": "error"})


@router.post("/upload")
async def upload_media(file: UploadFile = File(...)):
    file_bytes = await file.read()
    resource_type = "video" if file.content_type and file.content_type.startswith("video") else "image"
    asset_id = str(uuid.uuid4())
    user_id = "demo_user"

    original_url = upload_file(file_bytes, asset_id, user_id, resource_type)

    phash = ""
    if resource_type == "image":
        phash = compute_phash(file_bytes)

    db.collection("assets").document(asset_id).set({
        "userId": user_id,
        "filename": file.filename,
        "originalUrl": original_url,
        "type": resource_type,
        "phash": phash,
        "uploadedAt": datetime.now(timezone.utc),
        "status": "pending",
        "scanCount": 0,
        "matchCount": 0
    })

    if resource_type == "image":
        t = threading.Thread(target=run_scan, args=(asset_id, user_id, phash, original_url))
        t.daemon = True
        t.start()

    return {"assetId": asset_id, "url": original_url, "status": "pending"}


@router.get("/assets")
async def list_assets():
    assets = db.collection("assets").where("userId", "==", "demo_user").stream()
    return [{"id": doc.id, **doc.to_dict()} for doc in assets]