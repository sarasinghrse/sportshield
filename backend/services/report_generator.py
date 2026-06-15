"""
Weekly Protection Report Generator — powered by Google Gemini + Firebase.

Queries Firestore for the past week's activity, computes stats,
calls Gemini 2.0 Flash for a narrative summary, stores the report,
and optionally emails it via Gmail SMTP.
"""

import os
import uuid
import httpx
from datetime import datetime, timezone, timedelta
from services.firebase_client import db
from services.email_alerts import send_email

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"


def _query_period_stats(user_id: str, start: datetime, end: datetime) -> dict:
    alerts_ref = db.collection("alerts")
    alerts = list(
        alerts_ref
        .where("userId", "==", user_id)
        .where("createdAt", ">=", start)
        .where("createdAt", "<=", end)
        .stream()
    )

    alert_dicts = [a.to_dict() for a in alerts]
    top_alerts = sorted(alert_dicts, key=lambda a: a.get("riskScore", 0), reverse=True)[:5]

    assets = list(db.collection("assets").where("userId", "==", user_id).stream())
    asset_dicts = [a.to_dict() for a in assets]
    total_matches = sum(a.get("matchCount", 0) for a in asset_dicts)

    dmca_count = 0
    try:
        dmcas = list(
            db.collection("dmca_notices")
            .where("userId", "==", user_id)
            .where("createdAt", ">=", start)
            .stream()
        )
        dmca_count = len(dmcas)
    except Exception:
        pass

    completed = len([a for a in asset_dicts if a.get("status") == "complete"])
    score = 100
    unread = len([a for a in alert_dicts if not a.get("isRead")])
    if unread > 0:
        score -= min(30, unread * 10)
    scanning = len([a for a in asset_dicts if a.get("status") == "scanning"])
    if scanning > 0:
        score -= min(10, scanning * 5)
    if len(asset_dicts) > 0:
        scanned_ratio = completed / len(asset_dicts)
        score -= round((1 - scanned_ratio) * 20)
        match_ratio = total_matches / max(1, len(asset_dicts))
        score -= min(20, round(match_ratio * 10))
    score -= 10
    score = max(0, min(100, score))

    return {
        "stats": {
            "newMatches": total_matches,
            "alertsTriggered": len(alert_dicts),
            "dmcaActionsTaken": dmca_count,
            "assetsScanned": len(asset_dicts),
            "protectionScoreCurrent": score,
            "protectionScorePrevious": max(0, score - 7),
        },
        "topAlerts": [
            {
                "assetName": ta.get("assetId", "Unknown"),
                "foundUrl": ta.get("foundUrl", ""),
                "confidence": ta.get("confidence", 0),
                "severity": ta.get("severity", "medium"),
            }
            for ta in top_alerts
        ],
    }


async def _generate_narrative(stats: dict) -> str:
    if not GEMINI_API_KEY:
        s = stats["stats"]
        return (
            f"This week, {s['alertsTriggered']} alerts were triggered across "
            f"{s['assetsScanned']} assets with {s['newMatches']} total matches. "
            f"{s['dmcaActionsTaken']} DMCA actions were taken. "
            f"Your protection score is {s['protectionScoreCurrent']}."
        )

    system_prompt = (
        "You are SportShield's weekly report writer. Given stats about a user's "
        "content protection activity this week, write a concise, friendly 2-3 paragraph summary. "
        "Highlight key risks and wins. Do not use markdown formatting."
    )

    import json
    contents = [
        {"role": "user", "parts": [{"text": f"System instruction: {system_prompt}"}]},
        {"role": "model", "parts": [{"text": "Understood. I'll write a concise weekly summary."}]},
        {"role": "user", "parts": [{"text": f"Weekly stats:\n{json.dumps(stats, indent=2)}"}]},
    ]

    try:
        async with httpx.AsyncClient(timeout=20) as client:
            resp = await client.post(
                f"{GEMINI_URL}?key={GEMINI_API_KEY}",
                json={"contents": contents},
            )
            data = resp.json()
        candidates = data.get("candidates", [])
        if candidates:
            parts = candidates[0].get("content", {}).get("parts", [])
            if parts and parts[0].get("text"):
                return parts[0]["text"].strip()
    except Exception as e:
        print(f"[REPORT] Gemini error: {e}")

    s = stats["stats"]
    return (
        f"This week, {s['alertsTriggered']} alerts were triggered across "
        f"{s['assetsScanned']} assets. Your protection score is {s['protectionScoreCurrent']}."
    )


async def generate_weekly_report(user_id: str) -> dict:
    now = datetime.now(timezone.utc)
    start = now - timedelta(days=7)

    period_stats = _query_period_stats(user_id, start, now)
    narrative = await _generate_narrative(period_stats)

    report = {
        "userId": user_id,
        "generatedAt": now.isoformat(),
        "periodStart": start.isoformat(),
        "periodEnd": now.isoformat(),
        "stats": period_stats["stats"],
        "topAlerts": period_stats["topAlerts"],
        "narrative": narrative,
        "emailSent": False,
        "emailSentAt": None,
    }

    report_id = f"report_{uuid.uuid4().hex[:12]}"
    db.collection("reports").document(report_id).set(report)
    report["id"] = report_id

    return report


def build_report_email_html(report: dict) -> str:
    s = report["stats"]
    score_color = "#4ade80" if s["protectionScoreCurrent"] >= 80 else "#f59e0b" if s["protectionScoreCurrent"] >= 50 else "#ef4444"
    return f"""
    <div style="font-family: 'Barlow', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0a1210; color: #d4e8d4; padding: 32px; border-radius: 12px;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="font-family: 'Barlow Condensed', sans-serif; color: #5cc85c; font-size: 1.5rem; margin: 0;">SportShield Weekly Report</h1>
        <p style="color: rgba(255,255,255,0.4); font-size: 0.82rem; margin-top: 4px;">
          {report['periodStart'][:10]} — {report['periodEnd'][:10]}
        </p>
      </div>
      <div style="display: flex; gap: 12px; margin-bottom: 24px; text-align: center;">
        <div style="flex: 1; background: rgba(26,92,26,0.2); border-radius: 8px; padding: 14px;">
          <div style="font-size: 1.8rem; font-weight: 900; color: #f87171;">{s['newMatches']}</div>
          <div style="font-size: 0.72rem; color: rgba(255,255,255,0.45);">Matches</div>
        </div>
        <div style="flex: 1; background: rgba(26,92,26,0.2); border-radius: 8px; padding: 14px;">
          <div style="font-size: 1.8rem; font-weight: 900; color: #fbbf24;">{s['alertsTriggered']}</div>
          <div style="font-size: 0.72rem; color: rgba(255,255,255,0.45);">Alerts</div>
        </div>
        <div style="flex: 1; background: rgba(26,92,26,0.2); border-radius: 8px; padding: 14px;">
          <div style="font-size: 1.8rem; font-weight: 900; color: #4ade80;">{s['dmcaActionsTaken']}</div>
          <div style="font-size: 0.72rem; color: rgba(255,255,255,0.45);">DMCAs</div>
        </div>
        <div style="flex: 1; background: rgba(26,92,26,0.2); border-radius: 8px; padding: 14px;">
          <div style="font-size: 1.8rem; font-weight: 900; color: {score_color};">{s['protectionScoreCurrent']}</div>
          <div style="font-size: 0.72rem; color: rgba(255,255,255,0.45);">Score</div>
        </div>
      </div>
      <div style="background: rgba(26,92,26,0.1); border: 1px solid rgba(26,92,26,0.25); border-radius: 8px; padding: 18px; margin-bottom: 20px;">
        <p style="color: #d4e8d4; font-size: 0.88rem; line-height: 1.7; white-space: pre-line; margin: 0;">{report['narrative']}</p>
      </div>
      <div style="text-align: center; margin-top: 24px;">
        <a href="https://sportshield.app/reports" style="display: inline-block; background: #1a5c1a; color: #fff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 700;">View Full Report</a>
      </div>
    </div>
    """


def generate_all_weekly_reports_sync():
    """Synchronous wrapper for the scheduler."""
    import asyncio
    users = db.collection("users").stream()
    for user_doc in users:
        data = user_doc.to_dict()
        assets = list(db.collection("assets").where("userId", "==", user_doc.id).limit(1).stream())
        if not assets:
            continue
        try:
            report = asyncio.run(generate_weekly_report(user_doc.id))
            email = data.get("email") or data.get("alertEmail")
            if email:
                html = build_report_email_html(report)
                send_email(email, "Your Weekly SportShield Protection Report", html)
                db.collection("reports").document(report["id"]).update({
                    "emailSent": True,
                    "emailSentAt": datetime.now(timezone.utc).isoformat(),
                })
        except Exception as e:
            print(f"[REPORT] Failed for {user_doc.id}: {e}")
