"""
URL Monitor Router — CRUD for user URL watchlists.

Stores watched URLs in the user's Firestore document (watchedUrls array).
Uses Google Cloud Firestore for persistence.
"""

from datetime import datetime, timezone
from fastapi import APIRouter
from pydantic import BaseModel
from services.firebase_client import db
from services.url_checker import check_all_user_urls

router = APIRouter()


class AddUrlRequest(BaseModel):
    url: str
    label: str = "Untitled"
    user_id: str


class RemoveUrlRequest(BaseModel):
    url: str
    user_id: str


class ToggleUrlRequest(BaseModel):
    url: str
    user_id: str


def _get_watched(user_id: str) -> list[dict]:
    doc = db.collection("users").document(user_id).get()
    if not doc.exists:
        return []
    return doc.to_dict().get("watchedUrls", [])


@router.post("/add")
async def add_url(req: AddUrlRequest):
    watched = _get_watched(req.user_id)
    if any(w["url"] == req.url for w in watched):
        return {"urls": watched, "message": "URL already in watchlist"}

    watched.append({
        "url": req.url,
        "label": req.label,
        "addedAt": datetime.now(timezone.utc).isoformat(),
        "lastCheckedAt": None,
        "status": "active",
        "lastResult": None,
    })
    db.collection("users").document(req.user_id).set(
        {"watchedUrls": watched}, merge=True
    )
    return {"urls": watched}


@router.delete("/remove")
async def remove_url(req: RemoveUrlRequest):
    watched = _get_watched(req.user_id)
    watched = [w for w in watched if w["url"] != req.url]
    db.collection("users").document(req.user_id).set(
        {"watchedUrls": watched}, merge=True
    )
    return {"urls": watched}


@router.get("/list")
async def list_urls(user_id: str):
    return {"urls": _get_watched(user_id)}


@router.post("/check/{user_id}")
async def check_urls(user_id: str):
    updated = await check_all_user_urls(user_id)
    return {"urls": updated, "checked": len([u for u in updated if u.get("status") == "active"])}


@router.post("/pause")
async def pause_url(req: ToggleUrlRequest):
    watched = _get_watched(req.user_id)
    for w in watched:
        if w["url"] == req.url:
            w["status"] = "paused"
    db.collection("users").document(req.user_id).set(
        {"watchedUrls": watched}, merge=True
    )
    return {"urls": watched}


@router.post("/resume")
async def resume_url(req: ToggleUrlRequest):
    watched = _get_watched(req.user_id)
    for w in watched:
        if w["url"] == req.url:
            w["status"] = "active"
    db.collection("users").document(req.user_id).set(
        {"watchedUrls": watched}, merge=True
    )
    return {"urls": watched}
