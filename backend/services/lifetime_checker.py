"""
Asset lifetime expiry checker.

Runs periodically via the scheduler. When an asset's protection period
has elapsed (based on uploadedAt + assetLifetime), marks it expired and
sends an email prompting the user to re-upload if they opted into email updates.
"""
import os
from datetime import datetime, timezone, timedelta
from services.firebase_client import db
from services.email_alerts import send_email

FRONTEND_URL = os.getenv("FRONTEND_URL", "https://sportshield--sportshield-app.us-central1.hosted.app")

LIFETIME_DELTAS = {
    "once": timedelta(0),
    "1day": timedelta(days=1),
    "1week": timedelta(weeks=1),
    "1month": timedelta(days=30),
    "1year": timedelta(days=365),
}


def check_expired_assets():
    now = datetime.now(timezone.utc)
    assets = db.collection("assets").stream()

    expired_count = 0
    for doc in assets:
        asset = doc.to_dict()

        if asset.get("expired") or asset.get("assetLifetime") in (None, "", "permanent"):
            continue

        uploaded_at = asset.get("uploadedAt")
        if not uploaded_at or not hasattr(uploaded_at, "timestamp"):
            continue

        upload_time = datetime.fromtimestamp(uploaded_at.timestamp(), tz=timezone.utc)
        delta = LIFETIME_DELTAS.get(asset.get("assetLifetime"))
        if delta is None:
            continue

        expires_at = upload_time + delta
        if now < expires_at:
            continue

        db.collection("assets").document(doc.id).update({
            "expired": True,
            "expiredAt": now,
            "status": "expired",
        })
        expired_count += 1

        if not asset.get("emailUpdates"):
            continue

        user_id = asset.get("userId", "")
        if not user_id:
            continue

        try:
            user_doc = db.collection("users").document(user_id).get()
            if not user_doc.exists:
                continue
            user_email = user_doc.to_dict().get("email") or user_doc.to_dict().get("alertEmail", "")
            if not user_email:
                continue

            filename = asset.get("filename", "your asset")
            send_email(
                user_email,
                f"Protection expired for \"{filename}\" — re-upload to continue",
                f"""
                <div style="background:#0a1f0a;padding:0;margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
                  <div style="max-width:560px;margin:0 auto;padding:32px 24px;">
                    <div style="text-align:center;margin-bottom:24px;">
                      <h1 style="color:#4ade80;font-size:22px;font-weight:900;letter-spacing:0.08em;margin:0;">SPORTSHIELD</h1>
                    </div>
                    <div style="background:#0d2a0d;border:1px solid rgba(26,92,26,0.4);border-radius:12px;padding:24px;">
                      <h2 style="color:#fff;font-size:16px;margin:0 0 12px;">Protection Period Expired</h2>
                      <p style="color:rgba(255,255,255,0.6);font-size:14px;line-height:1.6;">
                        The protection period for <strong style="color:#fff;">{filename}</strong> has ended.
                        During its active period, we detected <strong style="color:#f87171;">{asset.get('unauthorizedCount', 0)} unauthorized uses</strong>
                        across {asset.get('matchCount', 0)} total matches.
                      </p>
                      <p style="color:rgba(255,255,255,0.6);font-size:14px;line-height:1.6;margin-top:12px;">
                        To continue monitoring and protecting this asset, simply re-upload it on SportShield.
                        Your previous scan history will help us catch new violations faster.
                      </p>
                      <div style="text-align:center;margin-top:20px;">
                        <a href="{FRONTEND_URL}/upload"
                           style="display:inline-block;background:#1a5c1a;color:#4ade80;font-weight:700;font-size:13px;text-decoration:none;padding:10px 28px;border-radius:8px;border:1px solid rgba(74,222,128,0.3);">
                          Re-Upload Asset
                        </a>
                      </div>
                    </div>
                    <p style="color:rgba(255,255,255,0.2);font-size:11px;text-align:center;margin-top:16px;">
                      You're receiving this because you enabled email updates for this asset.
                    </p>
                  </div>
                </div>
                """,
            )
        except Exception as e:
            print(f"[lifetime] Failed to send expiry email for {doc.id}: {e}")

    if expired_count:
        print(f"[lifetime] Marked {expired_count} asset(s) as expired")
