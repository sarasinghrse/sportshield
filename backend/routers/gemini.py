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

PAGES (if a user asks to go somewhere, include a navigate_to field in your response):
- Dashboard → /
- Upload → /upload
- Alerts → /alerts
- Analytics → /analytics
- Reports → /reports
- War Room / Live Radar → /radar
- Community → /public-dashboard
- Settings → /settings
- Verify → /verify

Keep answers concise (2-4 sentences). Be friendly and helpful. If asked about something unrelated to SportShield, gently redirect to how you can help with the platform. Never reveal API keys or internal implementation details.

If the user asks to navigate to a page, respond naturally AND include the page path at the very end of your response in this exact format on its own line: NAVIGATE:/path
For example: "Taking you to the War Room now!" followed by a new line with NAVIGATE:/radar
"""


class ChatRequest(BaseModel):
    message: str
    history: list = []


@router.post("/chat")
async def chat(req: ChatRequest):
    if not GEMINI_API_KEY:
        return {"reply": "AI assistant is not configured yet. Please set the GEMINI_API_KEY environment variable."}

    contents = []

    contents.append({"role": "user", "parts": [{"text": "System instructions: " + SYSTEM_PROMPT}]})
    contents.append({"role": "model", "parts": [{"text": "Understood. I'm SportShield Assistant, ready to help users navigate the platform and answer questions."}]})

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
                    "contents": contents,
                    "generationConfig": {
                        "temperature": 0.7,
                        "maxOutputTokens": 300,
                    },
                },
            )
            data = resp.json()

        text = data.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")

        if not text:
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
