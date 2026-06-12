from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.firebase_client import db as firestore_db
import httpx

router = APIRouter()

ADMIN_EMAIL = "DesiCodingClub@hack2skill.com"
ADMIN_CODE = "SaraAnshuAmit"


class AdminLogin(BaseModel):
    email: str
    code: str


@router.post("/login")
async def admin_login(data: AdminLogin):
    if data.email == ADMIN_EMAIL and data.code == ADMIN_CODE:
        return {"ok": True}
    raise HTTPException(status_code=401, detail="Invalid credentials")


@router.post("/verify")
async def admin_verify(data: AdminLogin):
    if data.email == ADMIN_EMAIL and data.code == ADMIN_CODE:
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
    api_url = "https://sportshield-backend.onrender.com"
    endpoints = [
        {"path": "/health", "method": "GET"},
        {"path": "/api/media/list", "method": "GET"},
        {"path": "/api/alerts/list", "method": "GET"},
    ]
    results = []
    for ep in endpoints:
        try:
            resp = httpx.request(ep["method"], f"{api_url}{ep['path']}", timeout=10)
            results.append({
                "endpoint": ep["path"],
                "status": resp.status_code,
                "ok": resp.status_code < 400,
                "latency_ms": int(resp.elapsed.total_seconds() * 1000),
            })
        except Exception as e:
            results.append({
                "endpoint": ep["path"],
                "status": 0,
                "ok": False,
                "error": str(e),
            })
    return {"ok": True, "results": results}


@router.get("/user-stats")
async def user_stats():
    users = list(firestore_db.collection("users").stream())
    assets = list(firestore_db.collection("assets").stream())
    alerts = list(firestore_db.collection("alerts").stream())
    return {
        "ok": True,
        "stats": {
            "totalUsers": len(users),
            "totalAssets": len(assets),
            "totalAlerts": len(alerts),
        },
    }
