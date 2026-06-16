"""
SportShield AI Helper — powered by Google Gemini 2.0 Flash.
Uses direct HTTP calls (same pattern as piracy_scanner, report_generator).
"""

import os
import httpx
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"

SYSTEM_PROMPT = (
    "You are SportShield Assistant, a helpful AI navigator for the SportShield platform "
    "— a sports media protection tool built for the Google Solutions Challenge.\n\n"
    "CORE FEATURES:\n"
    "- Upload & Protect: Users upload sports images/videos, which get fingerprinted and monitored\n"
    "- Web Scanning: Automated reverse image search finds unauthorized copies\n"
    "- AI Detection: Detects AI-generated/manipulated images\n"
    "- DMCA Notices: One-click generation of legal takedown notices\n"
    "- CLIP Search: AI-powered visual similarity search across the asset library\n\n"
    "ADVANCED FEATURES:\n"
    "- Live Stream Piracy Radar (War Room): Real-time detection of pirated sports broadcasts\n"
    "- Autonomous Enforcement Agent: Auto-files DMCA notices, escalates cases\n"
    "- Browser Extension: Flag pirate sites, quick dashboard access\n"
    "- WhatsApp Alerts: Get piracy notifications on your phone\n\n"
    "PAGES — if user asks to go somewhere, add NAVIGATE:/path on its own line at the end:\n"
    "Dashboard → / | Upload → /upload | Alerts → /alerts | Analytics → /analytics\n"
    "Reports → /reports | War Room → /radar | Community → /public-dashboard\n"
    "Settings → /settings | Verify → /verify\n\n"
    "Keep answers concise (2-4 sentences). Be friendly. Never reveal API keys."
)


class ChatRequest(BaseModel):
    message: str
    history: list = []


@router.get("/debug-status")
async def debug_status():
    """Temporary debug endpoint to check Gemini config."""
    key = GEMINI_API_KEY
    if not key:
        return {"status": "NO_KEY", "detail": "GEMINI_API_KEY env var is empty"}
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(
                f"{GEMINI_URL}?key={key}",
                json={"contents": [{"role": "user", "parts": [{"text": "hi"}]}]},
            )
            data = resp.json()
            if "error" in data:
                return {"status": "API_ERROR", "error": data["error"]}
            return {"status": "OK", "model": "gemini-2.0-flash"}
    except Exception as e:
        return {"status": "EXCEPTION", "detail": str(e)}


@router.post("/chat")
async def chat(req: ChatRequest):
    if not GEMINI_API_KEY:
        return {"reply": "AI assistant is not configured yet. Please set the GEMINI_API_KEY environment variable."}

    contents = []

    for msg in req.history[-10:]:
        role = "model" if msg.get("role") == "model" else "user"
        text = msg.get("text", "")
        if text:
            contents.append({"role": role, "parts": [{"text": text}]})

    contents.append({"role": "user", "parts": [{"text": req.message}]})

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(
                f"{GEMINI_URL}?key={GEMINI_API_KEY}",
                json={
                    "system_instruction": {
                        "parts": [{"text": SYSTEM_PROMPT}]
                    },
                    "contents": contents,
                    "generationConfig": {
                        "temperature": 0.7,
                        "maxOutputTokens": 300,
                    },
                },
            )
            data = resp.json()

        if "error" in data:
            print(f"[GEMINI CHAT] API error: {data['error']}")
            return {"reply": "Sorry, I'm having trouble right now. Please try again in a moment."}

        text = data.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")

        if not text:
            print(f"[GEMINI CHAT] Empty response: {data}")
            return {"reply": "I couldn't process that. Could you rephrase?"}

        navigate_to = None
        reply_lines = []
        for line in text.strip().split("\n"):
            if line.strip().startswith("NAVIGATE:"):
                navigate_to = line.strip().replace("NAVIGATE:", "").strip()
            else:
                reply_lines.append(line)

        response = {"reply": "\n".join(reply_lines).strip() or text.strip()}
        if navigate_to:
            response["navigate_to"] = navigate_to

        return response

    except Exception as e:
        print(f"[GEMINI CHAT] Error: {e}")
        return {"reply": "Sorry, I'm having trouble connecting right now. Please try again in a moment."}
