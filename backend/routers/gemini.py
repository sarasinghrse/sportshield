"""
SportShield AI Helper — powered by Google Gemini
"""

import os
import httpx
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

SYSTEM_PROMPT = """You are SportShield Assistant, a helpful AI navigator for the SportShield platform — a sports media protection tool built for the Google Solutions Challenge.

You help users understand and use SportShield's features:

CORE FEATURES:
- Upload & Protect: Users upload sports images/videos, which get fingerprinted (pHash) and monitored
- Web Scanning: Automated reverse image search finds unauthorized copies across the internet
- AI Detection: Detects AI-generated/manipulated images
- DMCA Notices: One-click generation of legal takedown notices
- C2PA Credentials: Content authenticity verification with tamper-proof metadata
- Forensic Watermarking: Invisible watermarks embedded in media for ownership proof
- CLIP Search: AI-powered visual similarity search across the asset library

ADVANCED FEATURES:
- Live Stream Piracy Radar: Real-time detection of pirated sports broadcasts using audio fingerprinting + multimodal AI
- Autonomous Enforcement Agent: Auto-files DMCA notices, escalates cases, tracks resolution
- Crowdsourced Detector Network: Community of pirate hunters earning points, ranks, and bounties
- Browser Extension: Right-click to protect images, scan pages, report pirates
- WhatsApp Alerts: Get piracy notifications on your phone
- War Room Dashboard: Live monitoring of all detection and enforcement activity

PAGES:
- Dashboard (/) — overview of protected assets, alerts, risk scores
- Community (/community) — public assets, leaderboard
- War Room (/radar) — live radar, enforcement, crowd network, public API docs
- Settings (/settings) — account preferences

Keep answers concise (2-4 sentences). Be friendly and helpful. If asked about something unrelated to SportShield, gently redirect to how you can help with the platform. Never reveal API keys or internal implementation details."""


class ChatRequest(BaseModel):
    message: str
    history: list = []


@router.post("/chat")
async def chat(req: ChatRequest):
    if not GEMINI_API_KEY:
        return {"reply": "AI assistant is not configured yet. Please set the GEMINI_API_KEY environment variable."}

    contents = []

    contents.append({
        "role": "user",
        "parts": [{"text": "System instruction: " + SYSTEM_PROMPT}]
    })
    contents.append({
        "role": "model",
        "parts": [{"text": "Understood. I'm SportShield Assistant, ready to help users navigate the platform."}]
    })

    for msg in req.history[-10:]:
        contents.append({
            "role": msg.get("role", "user"),
            "parts": [{"text": msg.get("text", "")}]
        })

    contents.append({
        "role": "user",
        "parts": [{"text": req.message}]
    })

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={GEMINI_API_KEY}",
                json={"contents": contents},
            )
            data = resp.json()

        candidates = data.get("candidates", [])
        if candidates:
            parts = candidates[0].get("content", {}).get("parts", [])
            reply = parts[0].get("text", "Sorry, I couldn't generate a response.") if parts else "Sorry, I couldn't generate a response."
        else:
            reply = "Sorry, I couldn't generate a response. Please try again."

        return {"reply": reply}

    except Exception as e:
        print(f"[GEMINI] Error: {e}")
        return {"reply": "Sorry, I'm having trouble connecting right now. Please try again in a moment."}
