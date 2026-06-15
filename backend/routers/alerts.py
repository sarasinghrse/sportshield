from fastapi import APIRouter, Query
from services.firebase_client import db
from services.smart_summary import get_or_generate_summary

router = APIRouter()

@router.get("/")
def list_alerts(userId: str = Query("demo_user")):
    alerts = db.collection("alerts").where("userId", "==", userId).where("isRead", "==", False).stream()
    return [{"id": doc.id, **doc.to_dict()} for doc in alerts]

@router.put("/{alert_id}/read")
def mark_read(alert_id: str):
    db.collection("alerts").document(alert_id).update({"isRead": True})
    return {"status": "ok"}

@router.get("/{alert_id}/summary")
async def alert_summary(alert_id: str):
    summary = await get_or_generate_summary(alert_id)
    return {"summary": summary}