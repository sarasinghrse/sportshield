"""
Reports Router — weekly protection report generation and retrieval.

Uses Google Cloud Firestore for storage and Gemini for AI narratives.
"""

import logging
from fastapi import APIRouter
from pydantic import BaseModel
from services.firebase_client import db
from services.report_generator import generate_weekly_report

router = APIRouter()
logger = logging.getLogger(__name__)


def _serialize_report(doc) -> dict:
    data = doc.to_dict()
    data["id"] = doc.id
    for key in ("generatedAt", "emailSentAt"):
        val = data.get(key)
        if hasattr(val, "isoformat"):
            data[key] = val.isoformat()
    return data


class GenerateRequest(BaseModel):
    user_id: str


@router.post("/generate")
async def generate_report(req: GenerateRequest):
    try:
        report = await generate_weekly_report(req.user_id)
        return report
    except Exception as e:
        logger.error(f"[REPORTS] Generate failed for {req.user_id}: {e}")
        return {"error": str(e)}


@router.get("/latest")
async def latest_report(user_id: str):
    try:
        docs = list(
            db.collection("reports")
            .where("userId", "==", user_id)
            .stream()
        )
        if not docs:
            return None
        serialized = [_serialize_report(d) for d in docs]
        serialized.sort(key=lambda r: r.get("generatedAt", ""), reverse=True)
        return serialized[0]
    except Exception as e:
        logger.error(f"[REPORTS] Latest query failed: {e}")
    return None


@router.get("/history")
async def report_history(user_id: str):
    try:
        docs = list(
            db.collection("reports")
            .where("userId", "==", user_id)
            .stream()
        )
        serialized = [_serialize_report(d) for d in docs]
        serialized.sort(key=lambda r: r.get("generatedAt", ""), reverse=True)
        return serialized[:12]
    except Exception as e:
        logger.error(f"[REPORTS] History query failed: {e}")
        return []
