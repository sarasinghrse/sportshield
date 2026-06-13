"""
Smart Alert Summary — Gemini-powered explanations for piracy alerts.

Gathers deterministic facts (domain trust, licenses, confidence, risk)
then calls Gemini 2.0 Flash to produce a human-readable summary.
Caches the result on the alert document to avoid repeated API calls.
"""

import os
import httpx
from urllib.parse import urlparse
from services.firebase_client import db
from services.domain_classifier import get_trusted_domains

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"


def _extract_domain(url: str) -> str:
    try:
        return urlparse(url).netloc or url
    except Exception:
        return url


def _build_facts(alert: dict, user_id: str) -> list[str]:
    facts = []

    domain = _extract_domain(alert.get("foundUrl", ""))
    facts.append(f"Infringing URL: {alert.get('foundUrl', 'unknown')}")
    facts.append(f"Domain: {domain}")

    trusted = get_trusted_domains(user_id)
    is_trusted = any(domain.endswith(td) for td in trusted)
    facts.append(f"Domain trusted: {'Yes' if is_trusted else 'No'}")

    confidence = alert.get("confidence", 0)
    facts.append(f"Match confidence: {round(confidence * 100)}%")

    severity = alert.get("severity", "unknown")
    facts.append(f"Severity: {severity}")

    risk_score = alert.get("riskScore", 0)
    risk_label = alert.get("riskLabel", "unknown")
    facts.append(f"Risk score: {risk_score} ({risk_label})")

    asset_id = alert.get("assetId", "")
    if asset_id:
        licenses = list(
            db.collection("licenses")
            .where("assetId", "==", asset_id)
            .limit(5)
            .stream()
        )
        active = [l for l in licenses if l.to_dict().get("status") == "active"]
        facts.append(f"Active licenses: {len(active)}")
    else:
        facts.append("Active licenses: unknown")

    return facts


def _deterministic_fallback(alert: dict, domain: str) -> str:
    conf = round(alert.get("confidence", 0) * 100)
    risk = alert.get("riskLabel", "unknown")
    sev = alert.get("severity", "medium")
    return (
        f"{'High' if sev == 'high' else 'Medium'}-risk unauthorized use found on {domain}. "
        f"{conf}% match confidence, risk level: {risk}."
    )


async def generate_alert_summary(alert: dict, user_id: str) -> str:
    domain = _extract_domain(alert.get("foundUrl", ""))
    facts = _build_facts(alert, user_id)

    if not GEMINI_API_KEY:
        return _deterministic_fallback(alert, domain)

    system_prompt = (
        "You are a concise alert summarizer for SportShield, a sports media protection platform. "
        "Given facts about an unauthorized use detection, write a 2-3 sentence human-readable summary. "
        "Be direct and factual. Explain WHY this alert matters. Do not use markdown."
    )

    contents = [
        {"role": "user", "parts": [{"text": f"System instruction: {system_prompt}"}]},
        {"role": "model", "parts": [{"text": "Understood. I will summarize the alert concisely."}]},
        {"role": "user", "parts": [{"text": "Summarize this alert:\n" + "\n".join(f"- {f}" for f in facts)}]},
    ]

    try:
        async with httpx.AsyncClient(timeout=15) as client:
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
        print(f"[SMART_SUMMARY] Gemini error: {e}")

    return _deterministic_fallback(alert, domain)


async def get_or_generate_summary(alert_id: str) -> str:
    doc_ref = db.collection("alerts").document(alert_id)
    doc = doc_ref.get()
    if not doc.exists:
        return "Alert not found."

    alert = doc.to_dict()

    if alert.get("smartSummary"):
        return alert["smartSummary"]

    user_id = alert.get("userId", "demo_user")
    summary = await generate_alert_summary(alert, user_id)

    try:
        doc_ref.update({"smartSummary": summary})
    except Exception:
        pass

    return summary
