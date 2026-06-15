"""
S16 — Email Alert Notifications

Sends email alerts when unauthorized copies are detected, scans complete,
or risk levels change. Uses Brevo (Sendinblue) SMTP API.
"""
import smtplib
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dotenv import load_dotenv

load_dotenv()

GMAIL_ADDRESS = os.getenv("GMAIL_ADDRESS", "")
GMAIL_APP_PASSWORD = os.getenv("GMAIL_APP_PASSWORD", "")
SENDER_NAME = "SportShield Alerts"


def send_email(to_email: str, subject: str, html_body: str) -> dict:
    if not GMAIL_ADDRESS or not GMAIL_APP_PASSWORD:
        return {"sent": False, "error": "Gmail credentials not configured"}

    try:
        msg = MIMEMultipart("alternative")
        msg["From"] = f"{SENDER_NAME} <{GMAIL_ADDRESS}>"
        msg["To"] = to_email
        msg["Subject"] = subject
        msg.attach(MIMEText(html_body, "html"))

        with smtplib.SMTP("smtp.gmail.com", 587) as server:
            server.starttls()
            server.login(GMAIL_ADDRESS, GMAIL_APP_PASSWORD)
            server.send_message(msg)

        return {"sent": True, "to": to_email, "subject": subject}
    except Exception as e:
        print(f"[email_alerts] Send failed: {e}")
        return {"sent": False, "error": str(e)}


def build_alert_email(asset_name: str, match_count: int, unauthorized_count: int,
                      risk_score: int, asset_id: str, matches: list = None) -> str:
    risk_color = "#ef4444" if risk_score >= 75 else "#f59e0b" if risk_score >= 50 else "#3b82f6" if risk_score >= 25 else "#4ade80"
    risk_label = "Critical" if risk_score >= 75 else "High" if risk_score >= 50 else "Medium" if risk_score >= 25 else "Low"

    match_rows = ""
    if matches:
        for m in matches[:5]:
            conf = round((m.get("confidence", 0)) * 100)
            url = m.get("found_url", m.get("foundUrl", ""))
            match_rows += f"""
            <tr>
              <td style="padding:8px 12px;border-bottom:1px solid #1a3a1a;color:#ccc;font-size:13px;max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
                <a href="{url}" style="color:#60a5fa;text-decoration:none;">{url}</a>
              </td>
              <td style="padding:8px 12px;border-bottom:1px solid #1a3a1a;color:{risk_color};font-weight:bold;text-align:center;">{conf}%</td>
            </tr>"""

    matches_table = ""
    if match_rows:
        matches_table = f"""
        <table style="width:100%;border-collapse:collapse;margin:16px 0;">
          <tr>
            <th style="padding:8px 12px;border-bottom:2px solid #1a5c1a;color:#4ade80;font-size:11px;text-transform:uppercase;text-align:left;">Found URL</th>
            <th style="padding:8px 12px;border-bottom:2px solid #1a5c1a;color:#4ade80;font-size:11px;text-transform:uppercase;text-align:center;">Confidence</th>
          </tr>
          {match_rows}
        </table>"""

    return f"""
    <div style="background:#0a1f0a;padding:0;margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
      <div style="max-width:560px;margin:0 auto;padding:32px 24px;">
        <div style="text-align:center;margin-bottom:24px;">
          <h1 style="color:#4ade80;font-size:22px;font-weight:900;letter-spacing:0.08em;margin:0;">SPORTSHIELD</h1>
          <p style="color:rgba(255,255,255,0.3);font-size:11px;margin:4px 0 0;">Content Protection Alert</p>
        </div>

        <div style="background:#0d2a0d;border:1px solid rgba(26,92,26,0.4);border-radius:12px;padding:24px;margin-bottom:16px;">
          <h2 style="color:#fff;font-size:16px;margin:0 0 12px;">Unauthorized Copies Detected</h2>
          <p style="color:rgba(255,255,255,0.5);font-size:13px;margin:0 0 16px;">
            We found <strong style="color:#f87171;">{unauthorized_count} unauthorized</strong> use(s) of your asset
            <strong style="color:#fff;">{asset_name}</strong> across {match_count} total matches.
          </p>

          <div style="display:flex;gap:12px;margin-bottom:16px;">
            <div style="flex:1;text-align:center;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:8px;padding:12px;">
              <div style="font-size:24px;font-weight:900;color:{risk_color};">{risk_score}</div>
              <div style="font-size:10px;color:rgba(255,255,255,0.35);text-transform:uppercase;">Risk Score</div>
            </div>
            <div style="flex:1;text-align:center;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:8px;padding:12px;">
              <div style="font-size:24px;font-weight:900;color:#f87171;">{unauthorized_count}</div>
              <div style="font-size:10px;color:rgba(255,255,255,0.35);text-transform:uppercase;">Unauthorized</div>
            </div>
            <div style="flex:1;text-align:center;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:8px;padding:12px;">
              <div style="font-size:24px;font-weight:900;color:{risk_color};">{risk_label}</div>
              <div style="font-size:10px;color:rgba(255,255,255,0.35);text-transform:uppercase;">Risk Level</div>
            </div>
          </div>

          {matches_table}

          <div style="text-align:center;margin-top:20px;">
            <a href="{os.getenv('FRONTEND_URL', 'https://sportshield--sportshield-app.us-central1.hosted.app')}/assets/{asset_id}" style="display:inline-block;background:#1a5c1a;color:#4ade80;font-weight:700;font-size:13px;text-decoration:none;padding:10px 28px;border-radius:8px;border:1px solid rgba(74,222,128,0.3);">
              View Asset Details
            </a>
          </div>
        </div>

        <p style="color:rgba(255,255,255,0.2);font-size:11px;text-align:center;margin:0;">
          You're receiving this because you have alert notifications enabled on SportShield.
        </p>
      </div>
    </div>
    """


def send_scan_alert(to_email: str, asset_name: str, asset_id: str,
                    match_count: int, unauthorized_count: int,
                    risk_score: int, matches: list = None) -> dict:
    if unauthorized_count == 0:
        return {"sent": False, "reason": "No unauthorized copies — no alert needed"}

    subject = f"⚠️ {unauthorized_count} unauthorized use(s) of {asset_name} detected"
    html = build_alert_email(asset_name, match_count, unauthorized_count, risk_score, asset_id, matches)
    return send_email(to_email, subject, html)


def send_dmca_confirmation(to_email: str, asset_name: str, platform: str, dmca_id: str) -> dict:
    html = f"""
    <div style="background:#0a1f0a;padding:0;margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
      <div style="max-width:560px;margin:0 auto;padding:32px 24px;">
        <div style="text-align:center;margin-bottom:24px;">
          <h1 style="color:#4ade80;font-size:22px;font-weight:900;letter-spacing:0.08em;margin:0;">SPORTSHIELD</h1>
        </div>
        <div style="background:#0d2a0d;border:1px solid rgba(26,92,26,0.4);border-radius:12px;padding:24px;">
          <h2 style="color:#fff;font-size:16px;margin:0 0 12px;">DMCA Takedown Submitted</h2>
          <p style="color:rgba(255,255,255,0.5);font-size:13px;">
            A DMCA takedown notice has been generated for <strong style="color:#fff;">{asset_name}</strong>
            targeting <strong style="color:#f87171;">{platform}</strong>.
          </p>
          <p style="color:rgba(255,255,255,0.35);font-size:12px;">Reference: {dmca_id}</p>
        </div>
      </div>
    </div>
    """
    return send_email(to_email, f"DMCA Takedown Submitted — {asset_name}", html)
