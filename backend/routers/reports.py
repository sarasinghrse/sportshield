"""
Reports Router — weekly protection report generation and retrieval.

Uses Google Cloud Firestore for storage and Gemini for AI narratives.
"""

from fastapi import APIRouter
from pydantic import BaseModel
from services.firebase_client import db
from services.report_generator import generate_weekly_report

router = APIRouter()


class GenerateRequest(BaseModel):
    user_id: str


@router.post("/generate")
async def generate_report(req: GenerateRequest):
    report = await generate_weekly_report(req.user_id)
    return report


@router.get("/latest")
async def latest_report(user_id: str):
    reports = (
        db.collection("reports")
        .where("userId", "==", user_id)
        .order_by("generatedAt", direction="DESCENDING")
        .limit(1)
        .stream()
    )
    for doc in reports:
        return {"id": doc.id, **doc.to_dict()}
    return None


@router.get("/history")
async def report_history(user_id: str):
    reports = (
        db.collection("reports")
        .where("userId", "==", user_id)
        .order_by("generatedAt", direction="DESCENDING")
        .limit(12)
        .stream()
    )
    return [{"id": doc.id, **doc.to_dict()} for doc in reports]
