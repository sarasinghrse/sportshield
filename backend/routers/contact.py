"""
Contact form endpoint — sends email via Brevo transactional API.
Required env vars:
  BREVO_SMTP_KEY     — your Brevo API key
  BREVO_SENDER_EMAIL — a verified sender in your Brevo account
"""
from fastapi import APIRouter
from pydantic import BaseModel, EmailStr
import httpx
from config import BREVO_SMTP_KEY, BREVO_SENDER_EMAIL

router = APIRouter()

TEAM_EMAILS = [
    {"email": "anshurajwork@gmail.com", "name": "Anshu Raj"},
    {"email": "20singhsara@gmail.com",  "name": "Sara Singh"},
]


class ContactForm(BaseModel):
    name: str
    email: EmailStr
    subject: str = "SportShield Contact"
    message: str


@router.post("/send")
async def send_contact(data: ContactForm):
    if not BREVO_SMTP_KEY:
        # Dev fallback — just acknowledge receipt
        print(f"[CONTACT] {data.name} <{data.email}>: {data.message}")
        return {"ok": True, "dev": True}

    sender_email = BREVO_SENDER_EMAIL or "noreply@sportshield.vercel.app"

    payload = {
        "sender":  {"name": "SportShield", "email": sender_email},
        "to":      TEAM_EMAILS,
        "replyTo": {"email": data.email, "name": data.name},
        "subject": f"[SportShield Contact] {data.subject} — from {data.name}",
        "textContent": (
            f"Name:    {data.name}\n"
            f"Email:   {data.email}\n"
            f"Subject: {data.subject}\n\n"
            f"--- Message ---\n{data.message}"
        ),
        "htmlContent": f"""
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
""",
    }

    try:
        resp = httpx.post(
            "https://api.brevo.com/v3/smtp/email",
            json=payload,
            headers={"api-key": BREVO_SMTP_KEY, "Content-Type": "application/json"},
            timeout=15,
        )
        if resp.status_code in (200, 201, 202):
            return {"ok": True}
        return {"ok": False, "error": resp.text}
    except Exception as e:
        return {"ok": False, "error": str(e)}


@router.post("/report-owner")
async def report_to_owner(data: dict):
    """
    Send a DMCA-style notification to the site owner of a flagged URL.
    Tries webmaster@, admin@, contact@ on the domain.
    Also notifies our team.
    """
    flagged_url = data.get("url", "")
    asset_name  = data.get("asset_name", "Sports media")
    confidence  = data.get("confidence", 0)

    if not flagged_url:
        return {"ok": False, "error": "No URL provided"}

    # Extract domain
    try:
        from urllib.parse import urlparse
        domain = urlparse(flagged_url).netloc.lstrip("www.")
    except Exception:
        return {"ok": False, "error": "Invalid URL"}

    owner_candidates = [
        {"email": f"webmaster@{domain}", "name": f"Webmaster ({domain})"},
        {"email": f"admin@{domain}",     "name": f"Admin ({domain})"},
        {"email": f"contact@{domain}",   "name": f"Contact ({domain})"},
        {"email": f"dmca@{domain}",      "name": f"DMCA ({domain})"},
    ]

    if not BREVO_SMTP_KEY:
        print(f"[REPORT-OWNER] Would notify {domain} about {flagged_url}")
        return {"ok": True, "dev": True, "domain": domain}

    sender_email = BREVO_SENDER_EMAIL or "noreply@sportshield.vercel.app"

    payload = {
        "sender":  {"name": "SportShield", "email": sender_email},
        "to":      owner_candidates[:2],   # first two candidates
        "bcc":     TEAM_EMAILS,
        "subject": f"DMCA Notice — Unauthorized Sports Media on {domain}",
        "htmlContent": f"""
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
      Sent via <a href="https://sportshield-rouge.vercel.app" style="color:#1a5c1a;">SportShield</a>
      · Google Solutions Challenge 2026
    </p>
  </div>
</div>
""",
    }

    try:
        resp = httpx.post(
            "https://api.brevo.com/v3/smtp/email",
            json=payload,
            headers={"api-key": BREVO_SMTP_KEY, "Content-Type": "application/json"},
            timeout=15,
        )
        return {"ok": resp.status_code < 300, "domain": domain}
    except Exception as e:
        return {"ok": False, "error": str(e)}
