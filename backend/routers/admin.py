from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.firebase_client import db as firestore_db
import httpx
from datetime import datetime, timezone, timedelta

router = APIRouter()

ADMIN_EMAIL = "DesiCodingClub@hack2skill.com"
ADMIN_CODE = "SaraAnshuAmit"


class AdminLogin(BaseModel):
    email: str
    code: str


def _credentials_ok(email: str, code: str) -> bool:
    # Email is case-insensitive and whitespace-tolerant (autofill often adds
    # trailing spaces or lowercases). The code stays exact, but trimmed.
    return (
        (email or "").strip().lower() == ADMIN_EMAIL.lower()
        and (code or "").strip() == ADMIN_CODE
    )


@router.post("/login")
async def admin_login(data: AdminLogin):
    if _credentials_ok(data.email, data.code):
        return {"ok": True}
    raise HTTPException(status_code=401, detail="Invalid credentials")


@router.post("/verify")
async def admin_verify(data: AdminLogin):
    if _credentials_ok(data.email, data.code):
        return {"ok": True}
    raise HTTPException(status_code=401, detail="Invalid credentials")


@router.get("/messages")
async def get_messages():
    docs = firestore_db.collection("contact_messages").order_by(
        "createdAt", direction="DESCENDING"
    ).stream()
    messages = []
    for doc in docs:
        d = doc.to_dict()
        d["id"] = doc.id
        if d.get("createdAt"):
            d["createdAt"] = d["createdAt"].isoformat()
        messages.append(d)
    return {"ok": True, "messages": messages}


@router.post("/messages/{message_id}/read")
async def mark_message_read(message_id: str):
    firestore_db.collection("contact_messages").document(message_id).update({"read": True})
    return {"ok": True}


@router.get("/health-check")
async def health_check():
    api_url = "https://sportshield-13rj.onrender.com"
    endpoints = [
        {"path": "/health", "method": "GET"},
        {"path": "/api/media/list", "method": "GET"},
        {"path": "/api/alerts/list", "method": "GET"},
        {"path": "/api/gemini/chat", "method": "POST", "body": {"message": "ping"}},
        {"path": "/api/settings/trusted-domains", "method": "GET"},
        {"path": "/api/admin/user-stats", "method": "GET"},
    ]
    results = []
    for ep in endpoints:
        try:
            kwargs = {"timeout": 10}
            if ep.get("body"):
                kwargs["json"] = ep["body"]
                kwargs["headers"] = {"Content-Type": "application/json"}
            resp = httpx.request(ep["method"], f"{api_url}{ep['path']}", **kwargs)
            results.append({
                "endpoint": f"{ep['method']} {ep['path']}",
                "status": resp.status_code,
                "ok": resp.status_code < 400,
                "latency_ms": int(resp.elapsed.total_seconds() * 1000),
            })
        except Exception as e:
            results.append({
                "endpoint": f"{ep['method']} {ep['path']}",
                "status": 0,
                "ok": False,
                "error": str(e),
            })
    return {"ok": True, "results": results}


@router.get("/user-stats")
async def user_stats():
    users_docs = list(firestore_db.collection("users").stream())
    assets_docs = list(firestore_db.collection("assets").stream())
    alerts_docs = list(firestore_db.collection("alerts").stream())

    now = datetime.now(timezone.utc)
    week_ago = now - timedelta(days=7)

    assets_data = [d.to_dict() for d in assets_docs]
    alerts_data = [d.to_dict() for d in alerts_docs]

    scanning_count = sum(1 for a in assets_data if a.get("status") == "scanning")
    complete_count = sum(1 for a in assets_data if a.get("status") == "complete")
    error_count = sum(1 for a in assets_data if a.get("status") == "error")
    public_count = sum(1 for a in assets_data if a.get("isPublic", True))
    private_count = len(assets_data) - public_count

    unread_alerts = sum(1 for a in alerts_data if not a.get("isRead"))
    high_severity = sum(1 for a in alerts_data if a.get("severity") == "high")

    new_users_week = 0
    new_assets_week = 0
    for u in users_docs:
        d = u.to_dict()
        created = d.get("createdAt")
        if created and hasattr(created, "timestamp"):
            if datetime.fromtimestamp(created.timestamp(), tz=timezone.utc) > week_ago:
                new_users_week += 1
    for a in assets_data:
        uploaded = a.get("uploadedAt")
        if uploaded and hasattr(uploaded, "timestamp"):
            if datetime.fromtimestamp(uploaded.timestamp(), tz=timezone.utc) > week_ago:
                new_assets_week += 1

    total_scans = sum(a.get("scanCount", 0) for a in assets_data)
    total_matches = sum(a.get("matchCount", 0) for a in assets_data)

    return {
        "ok": True,
        "stats": {
            "totalUsers": len(users_docs),
            "totalAssets": len(assets_data),
            "totalAlerts": len(alerts_data),
            "scanningNow": scanning_count,
            "completedScans": complete_count,
            "erroredScans": error_count,
            "publicAssets": public_count,
            "privateAssets": private_count,
            "unreadAlerts": unread_alerts,
            "highSeverityAlerts": high_severity,
            "newUsersThisWeek": new_users_week,
            "newAssetsThisWeek": new_assets_week,
            "totalScansRun": total_scans,
            "totalMatchesFound": total_matches,
        },
    }


@router.get("/all-assets")
async def all_assets():
    docs = firestore_db.collection("assets").order_by(
        "uploadedAt", direction="DESCENDING"
    ).stream()
    assets = []
    for d in docs:
        data = d.to_dict()
        data["id"] = d.id
        if data.get("uploadedAt") and hasattr(data["uploadedAt"], "isoformat"):
            data["uploadedAt"] = data["uploadedAt"].isoformat()
        assets.append(data)
    return {"ok": True, "assets": assets}


@router.post("/assets/{asset_id}/flag")
async def flag_asset(asset_id: str):
    firestore_db.collection("assets").document(asset_id).update({
        "adminFlagged": True,
        "isPublic": False,
    })
    return {"ok": True}


@router.post("/assets/{asset_id}/unflag")
async def unflag_asset(asset_id: str):
    firestore_db.collection("assets").document(asset_id).update({
        "adminFlagged": False,
        "isPublic": True,
    })
    return {"ok": True}


@router.delete("/assets/{asset_id}")
async def delete_asset(asset_id: str):
    firestore_db.collection("assets").document(asset_id).delete()
    return {"ok": True}


@router.get("/all-alerts")
async def all_alerts():
    docs = firestore_db.collection("alerts").order_by(
        "createdAt", direction="DESCENDING"
    ).stream()
    alerts = []
    for d in docs:
        data = d.to_dict()
        data["id"] = d.id
        if data.get("createdAt") and hasattr(data["createdAt"], "isoformat"):
            data["createdAt"] = data["createdAt"].isoformat()
        alerts.append(data)
    return {"ok": True, "alerts": alerts}
