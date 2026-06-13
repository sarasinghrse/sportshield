"""
URL Checker — monitors watched URLs for availability and content changes.

Uses Google Cloud infrastructure (Firestore) for persistence and
httpx for async HTTP checks.
"""

import hashlib
from datetime import datetime, timezone
import httpx
from services.firebase_client import db


async def check_url(url: str) -> dict:
    now = datetime.now(timezone.utc)
    try:
        async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
            resp = await client.get(url, headers={"User-Agent": "SportShield-Monitor/1.0"})
            body = resp.text
            content_hash = hashlib.md5(body.encode("utf-8", errors="ignore")).hexdigest()
            return {
                "statusCode": resp.status_code,
                "contentHash": content_hash,
                "accessible": 200 <= resp.status_code < 400,
                "checkedAt": now.isoformat(),
            }
    except Exception:
        return {
            "statusCode": 0,
            "contentHash": "",
            "accessible": False,
            "checkedAt": now.isoformat(),
        }


async def check_all_user_urls(user_id: str) -> list[dict]:
    doc_ref = db.collection("users").document(user_id)
    doc = doc_ref.get()
    if not doc.exists:
        return []

    user_data = doc.to_dict()
    watched = user_data.get("watchedUrls", [])
    if not watched:
        return []

    updated = []
    for entry in watched:
        if entry.get("status") != "active":
            updated.append(entry)
            continue

        result = await check_url(entry["url"])
        prev_hash = (entry.get("lastResult") or {}).get("contentHash", "")
        result["changed"] = bool(prev_hash and prev_hash != result["contentHash"])

        entry["lastCheckedAt"] = result["checkedAt"]
        entry["lastResult"] = result
        updated.append(entry)

    doc_ref.update({"watchedUrls": updated})
    return updated


def check_all_watched_urls_sync():
    """Synchronous wrapper for the scheduler."""
    import asyncio
    users = db.collection("users").stream()
    for user_doc in users:
        data = user_doc.to_dict()
        if data.get("watchedUrls"):
            asyncio.run(check_all_user_urls(user_doc.id))
