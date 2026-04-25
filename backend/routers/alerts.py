from fastapi import APIRouter
from services.firebase_client import db

router = APIRouter()

@router.get("/")
def list_alerts():
    alerts = db.collection("alerts").where("userId", "==", "demo_user").where("isRead", "==", False).stream()
    return [{"id": doc.id, **doc.to_dict()} for doc in alerts]

@router.put("/{alert_id}/read")
def mark_read(alert_id: str):
    db.collection("alerts").document(alert_id).update({"isRead": True})
    return {"status": "ok"}