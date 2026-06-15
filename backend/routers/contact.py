"""
Contact form endpoint — sends email via Gmail SMTP.
Required env vars:
  GMAIL_ADDRESS      — your Gmail address
  GMAIL_APP_PASSWORD — App Password from myaccount.google.com/apppasswords
"""
from fastapi import APIRouter
from pydantic import BaseModel
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timezone
import os
from services.firebase_client import db as firestore_db

router = APIRouter()

GMAIL_ADDRESS = os.getenv("GMAIL_ADDRESS", "")
GMAIL_APP_PASSWORD = os.getenv("GMAIL_APP_PASSWORD", "")

TEAM_EMAILS = [
    "anshurajwork@gmail.com",
    "sarasingh2k27@gmail.com",
]


class ContactForm(BaseModel):
    name: str
    email: str
    subject: str = "SportShield Contact"
    message: str


def _send_gmail(to_list: list, subject: str, html: str, reply_to: str = None) -> dict:
    if not GMAIL_ADDRESS or not GMAIL_APP_PASSWORD:
        return {"ok": False, "error": "Gmail credentials not configured"}

    try:
        msg = MIMEMultipart("alternative")
        msg["From"] = f"SportShield <{GMAIL_ADDRESS}>"
        msg["To"] = ", ".join(to_list)
        msg["Subject"] = subject
        if reply_to:
            msg["Reply-To"] = reply_to
        msg.attach(MIMEText(html, "html"))

        with smtplib.SMTP("smtp.gmail.com", 587) as server:
            server.starttls()
            server.login(GMAIL_ADDRESS, GMAIL_APP_PASSWORD)
            server.send_message(msg)

        return {"ok": True}
    except Exception as e:
        print(f"[contact] Gmail send failed: {e}")
        return {"ok": False, "error": str(e)}


@router.post("/send")
async def send_contact(data: ContactForm):
    try:
        firestore_db.collection("contact_messages").add({
            "name": data.name,
            "email": data.email,
            "subject": data.subject,
            "message": data.message,
            "createdAt": datetime.now(timezone.utc),
            "read": False,
        })
    except Exception as e:
        print(f"[CONTACT] Firestore save failed: {e}")

    if not GMAIL_ADDRESS or not GMAIL_APP_PASSWORD:
        print(f"[CONTACT] {data.name} <{data.email}>: {data.message}")
        return {"ok": True, "dev": True}

    html = f"""
<div style="font-family:sans-serif;max-width:560px;margin:0 auto;">
  <div style="background:#1a5c1a;padding:20px 32px;border-radius:8px 8px 0 0;">
    <h2 style="color:#fff;margin:0;font-size:1.3rem;">SportShield Contact Form</h2>
  </div>
  <div style="background:#f8faf8;padding:28px 32px;border:1px solid #e0e7e0;border-top:none;border-radius:0 0 8px 8px;">
    <p><strong>Name:</strong> {data.name}</p>
    <p><strong>Email:</strong> <a href="mailto:{data.email}">{data.email}</a></p>
    <p><strong>Subject:</strong> {data.subject}</p>
    <hr style="border:none;border-top:1px solid #d4dbd4;margin:18px 0"/>
    <p style="white-space:pre-wrap;">{data.message}</p>
  </div>
  <p style="font-size:0.78rem;color:#8fa08f;text-align:center;margin-top:16px;">
    SportShield · Google Solutions Challenge 2026
  </p>
</div>
"""

    return _send_gmail(
        TEAM_EMAILS,
        f"[SportShield Contact] {data.subject} — from {data.name}",
        html,
        reply_to=data.email,
    )


@router.post("/report-owner")
async def report_to_owner(data: dict):
    flagged_url = data.get("url", "")
    asset_name  = data.get("asset_name", "Sports media")
    confidence  = data.get("confidence", 0)

    if not flagged_url:
        return {"ok": False, "error": "No URL provided"}

    try:
        from urllib.parse import urlparse
        domain = urlparse(flagged_url).netloc.lstrip("www.")
    except Exception:
        return {"ok": False, "error": "Invalid URL"}

    if not GMAIL_ADDRESS or not GMAIL_APP_PASSWORD:
        print(f"[REPORT-OWNER] Would notify {domain} about {flagged_url}")
        return {"ok": True, "dev": True, "domain": domain}

    owner_emails = [f"webmaster@{domain}", f"admin@{domain}"]

    html = f"""
<div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
  <div style="background:#1a5c1a;padding:20px 32px;border-radius:8px 8px 0 0;">
    <h2 style="color:#fff;margin:0;">Unauthorized Media Notice</h2>
  </div>
  <div style="background:#fff;padding:28px 32px;border:1px solid #e0e7e0;border-top:none;border-radius:0 0 8px 8px;">
    <p>Dear Site Owner / Webmaster,</p>
    <p>We are writing on behalf of the owner of <strong>{asset_name}</strong>, which has been
    detected on your site with <strong>{int(confidence * 100)}% confidence</strong> as unauthorized use.</p>
    <p><strong>Flagged URL:</strong><br/>
    <a href="{flagged_url}" style="color:#1a5c1a;">{flagged_url}</a></p>
    <p>Please remove or license this content immediately to avoid further legal action.
    This notice was generated automatically by SportShield, a sports media protection platform.</p>
    <p>If you believe this is an error, please reply to this email with proof of licensing.</p>
    <hr style="border:none;border-top:1px solid #e0e7e0;margin:20px 0"/>
    <p style="font-size:0.85rem;color:#666;">
      Sent via SportShield · Google Solutions Challenge 2026
    </p>
  </div>
</div>
"""

    result = _send_gmail(
        owner_emails + TEAM_EMAILS,
        f"DMCA Notice — Unauthorized Sports Media on {domain}",
        html,
    )
    result["domain"] = domain
    return result
