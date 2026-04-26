"""
SportShield WhatsApp Bot — Twilio Sandbox (free tier)
======================================================
Flow:
  1. User joins sandbox → sends photo to Twilio WhatsApp number
  2. Twilio POSTs to POST /api/whatsapp/webhook
  3. We immediately reply "Scanning…" (TwiML)
  4. Background thread runs pHash + SerpAPI scan
  5. When done, we proactively message the result back via Twilio REST API

Required env vars (add to Render):
  TWILIO_ACCOUNT_SID   — from console.twilio.com → Account Info
  TWILIO_AUTH_TOKEN    — from console.twilio.com → Account Info
  TWILIO_WHATSAPP_FROM — "whatsapp:+14155238886"  (sandbox number, always this)

NO billing account needed — the free trial sandbox works as-is.
"""

import threading, uuid, httpx
from datetime import datetime, timezone
from fastapi import APIRouter, Form, Request, Response
from fastapi.responses import PlainTextResponse

from config import (
    SERPAPI_KEY, HF_TOKEN,
    TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM,
    CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET,
)
from services.firebase_client import db
from services.cloudinary_client import upload_file
from services.fingerprint import compute_phash
from services.crawler import scan_asset
from services.ai_detector import detect_ai_image

router = APIRouter()


# ── TwiML helper ────────────────────────────────────────────────────────────

def twiml(message: str) -> Response:
    """Return a valid TwiML XML response Twilio can parse."""
    body = f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>{message}</Message>
</Response>"""
    return Response(content=body, media_type="application/xml")


# ── Send proactive message via Twilio REST API ───────────────────────────────

def send_whatsapp(to: str, body: str):
    """Send a message to `to` (e.g. 'whatsapp:+919876543210') via Twilio API."""
    if not TWILIO_ACCOUNT_SID or not TWILIO_AUTH_TOKEN:
        print(f"[WHATSAPP] Would send to {to}:\n{body}")
        return
    try:
        httpx.post(
            f"https://api.twilio.com/2010-04-01/Accounts/{TWILIO_ACCOUNT_SID}/Messages.json",
            auth=(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN),
            data={
                "From": TWILIO_WHATSAPP_FROM,
                "To":   to,
                "Body": body,
            },
            timeout=20,
        )
    except Exception as e:
        print(f"[WHATSAPP] Send error: {e}")


# ── Background scan + reply ──────────────────────────────────────────────────

def scan_and_reply(to: str, image_url: str, image_bytes: bytes):
    """
    Full scan pipeline — runs in a background thread.
    Downloads the image, fingerprints it, scans the web, sends results back.
    """
    asset_id = str(uuid.uuid4())
    user_id  = "whatsapp_bot"

    try:
        # 1. Upload to Cloudinary for a stable CDN URL
        cdn_url = upload_file(image_bytes, asset_id=asset_id, user_id=user_id, resource_type="image")

        # 2. Compute pHash fingerprint
        phash = compute_phash(image_bytes)

        # 3. AI detection (runs quickly)
        ai_result = {"is_ai": False, "confidence": 0, "label": "unknown"}
        if HF_TOKEN:
            ai_result = detect_ai_image(image_bytes, HF_TOKEN)

        # 4. Store asset record in Firestore
        db.collection("assets").document(asset_id).set({
            "userId":       user_id,
            "source":       "whatsapp",
            "originalUrl":  cdn_url,
            "phash":        phash,
            "status":       "scanning",
            "scanCount":    0,
            "matchCount":   0,
            "isPublic":     False,
            "aiDetection":  ai_result,
            "uploadedAt":   datetime.now(timezone.utc),
        })

        # 5. Web scan via SerpAPI
        matches = scan_asset(phash, cdn_url, SERPAPI_KEY)

        # 6. Save matches to Firestore
        for m in matches:
            db.collection("alerts").document(str(uuid.uuid4())).set({
                "assetId":    asset_id,
                "userId":     user_id,
                "foundUrl":   m["found_url"],
                "confidence": m["confidence"],
                "severity":   m["severity"],
                "isRead":     False,
                "createdAt":  datetime.now(timezone.utc),
            })

        db.collection("assets").document(asset_id).update({
            "status":     "complete",
            "matchCount": len(matches),
            "scanCount":  1,
            "lastScannedAt": datetime.now(timezone.utc),
        })

        # 7. Build reply message
        ai_line = ""
        if ai_result["label"] != "unknown":
            emoji = "🤖" if ai_result["is_ai"] else "✅"
            pct   = int(ai_result["confidence"] * 100)
            ai_line = f"\n{emoji} AI Detection: {ai_result['label']} ({pct}% confidence)"

        if matches:
            high   = [m for m in matches if m["severity"] == "high"]
            medium = [m for m in matches if m["severity"] == "medium"]
            reply  = (
                f"🔍 *SportShield Scan Results*\n\n"
                f"Found *{len(matches)} potential match(es)*{ai_line}\n\n"
            )
            for i, m in enumerate(matches[:3], 1):
                pct = int(m["confidence"] * 100)
                sev_emoji = {"high": "🔴", "medium": "🟡", "low": "🟢"}.get(m["severity"], "⚪")
                reply += f"{i}. {sev_emoji} {pct}% confidence\n   {m['found_url']}\n\n"
            if len(matches) > 3:
                reply += f"...and {len(matches) - 3} more match(es)\n\n"
            reply += (
                "To generate a DMCA notice or view all results:\n"
                "👉 sportshield-rouge.vercel.app/alerts"
            )
        else:
            reply = (
                f"✅ *SportShield Scan Complete*{ai_line}\n\n"
                "No unauthorized copies found across Google Images and Google Lens.\n\n"
                "Your asset has been registered with a pHash fingerprint.\n"
                "👉 sportshield-rouge.vercel.app"
            )

        send_whatsapp(to, reply)

    except Exception as e:
        print(f"[WHATSAPP] Scan error: {e}")
        send_whatsapp(
            to,
            "⚠️ SportShield encountered an error scanning your image. "
            "Please try again or upload at sportshield-rouge.vercel.app"
        )


# ── Webhook endpoint ─────────────────────────────────────────────────────────

@router.post("/webhook")
async def whatsapp_webhook(
    request: Request,
    From:        str = Form(default=""),
    Body:        str = Form(default=""),
    NumMedia:    str = Form(default="0"),
    MediaUrl0:   str = Form(default=""),
    MediaContentType0: str = Form(default=""),
):
    """
    Twilio calls this URL when a WhatsApp message arrives.
    We immediately return a TwiML acknowledgement, then scan in background.
    """
    sender = From  # e.g. "whatsapp:+919876543210"
    num_media = int(NumMedia or 0)

    # ── No image sent ──
    if num_media == 0 or not MediaUrl0:
        # Check if it's a text message — give friendly instructions
        if Body.strip():
            return twiml(
                "👋 Hi! I'm the SportShield bot.\n\n"
                "Send me a photo and I'll scan the web for unauthorized copies "
                "using reverse image search + AI detection.\n\n"
                "Just attach any image and send it to this number."
            )
        return twiml("Send me a photo to scan for copyright violations!")

    # ── Image received — download it ──
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            # Twilio requires auth to download media from their servers
            if TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN:
                r = await client.get(
                    MediaUrl0,
                    auth=(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN),
                    follow_redirects=True,
                )
            else:
                r = await client.get(MediaUrl0, follow_redirects=True)
            image_bytes = r.content
    except Exception as e:
        print(f"[WHATSAPP] Download error: {e}")
        return twiml("⚠️ Couldn't download your image. Please try again.")

    # ── Launch background scan ──
    thread = threading.Thread(
        target=scan_and_reply,
        args=(sender, MediaUrl0, image_bytes),
        daemon=True,
    )
    thread.start()

    # ── Immediate acknowledgement ──
    return twiml(
        "🔍 *Scanning your image...*\n\n"
        "Checking Google Images, Google Lens, and running AI detection. "
        "Results in ~30 seconds."
    )
