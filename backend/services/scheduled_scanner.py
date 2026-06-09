"""
S12 — Scheduled / Real-time Monitoring

Periodically re-scans assets to detect new unauthorized copies.
Uses APScheduler for background scheduling.
"""
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger
from datetime import datetime, timezone
import threading

scheduler = BackgroundScheduler()
_started = False


def start_scheduler():
    global _started
    if not _started:
        scheduler.start()
        _started = True
        print("[scheduler] Background scheduler started")


def stop_scheduler():
    global _started
    if _started:
        scheduler.shutdown(wait=False)
        _started = False


def schedule_asset_rescan(asset_id: str, user_id: str, interval_hours: int = 24):
    job_id = f"rescan_{asset_id}"

    existing = scheduler.get_job(job_id)
    if existing:
        scheduler.reschedule_job(job_id, trigger=IntervalTrigger(hours=interval_hours))
        return {"jobId": job_id, "action": "rescheduled", "intervalHours": interval_hours}

    scheduler.add_job(
        _run_rescan,
        trigger=IntervalTrigger(hours=interval_hours),
        id=job_id,
        args=[asset_id, user_id],
        replace_existing=True,
        max_instances=1,
    )
    return {"jobId": job_id, "action": "created", "intervalHours": interval_hours}


def unschedule_asset_rescan(asset_id: str):
    job_id = f"rescan_{asset_id}"
    try:
        scheduler.remove_job(job_id)
        return {"jobId": job_id, "action": "removed"}
    except Exception:
        return {"jobId": job_id, "action": "not_found"}


def get_scheduled_jobs() -> list:
    jobs = []
    for job in scheduler.get_jobs():
        next_run = job.next_run_time
        jobs.append({
            "jobId": job.id,
            "assetId": job.id.replace("rescan_", "") if job.id.startswith("rescan_") else job.id,
            "nextRun": next_run.isoformat() if next_run else None,
            "trigger": str(job.trigger),
        })
    return jobs


def _run_rescan(asset_id: str, user_id: str):
    """Execute a re-scan for an asset. Imports at call time to avoid circular deps."""
    try:
        from services.firebase_client import db
        from services.fingerprint import compute_phash
        from services.crawler import scan_asset
        from services.risk_score import compute_risk_score
        from services.ai_detector import detect_ai_image
        from services.domain_classifier import get_trusted_domains, classify_url
        from services.propagation_tracker import extract_domain, categorize_platform
        from config import SERPAPI_KEY
        import uuid
        import httpx

        print(f"[scheduler] Re-scanning asset {asset_id[:8]}...")

        doc = db.collection("assets").document(asset_id).get()
        if not doc.exists:
            print(f"[scheduler] Asset {asset_id[:8]} not found, removing job")
            unschedule_asset_rescan(asset_id)
            return

        asset = doc.to_dict()
        phash = asset.get("phash", "")
        original_url = asset.get("originalUrl", "")

        if not phash or not original_url:
            return

        db.collection("assets").document(asset_id).update({"status": "scanning"})

        matches = scan_asset(phash, original_url, SERPAPI_KEY)
        ai_result = asset.get("aiDetection", {"is_ai": False, "confidence": 0, "label": "unknown"})
        risk = compute_risk_score(matches, ai_result)
        trusted = get_trusted_domains(user_id)

        scan_count = (asset.get("scanCount") or 0) + 1
        unauthorized_count = 0
        scan_time = datetime.now(timezone.utc)

        for idx, match in enumerate(matches):
            classification = classify_url(match["found_url"], trusted)
            if classification == "unauthorized":
                unauthorized_count += 1

            domain = extract_domain(match["found_url"])
            platform = categorize_platform(domain)

            result_id = str(uuid.uuid4())
            db.collection("scan_results").document(result_id).set({
                "assetId": asset_id,
                "userId": user_id,
                "foundUrl": match["found_url"],
                "thumbnailUrl": match["thumbnail_url"],
                "confidence": match["confidence"],
                "severity": match["severity"],
                "classification": classification,
                "scannedAt": scan_time,
                "firstSeenAt": scan_time,
                "domain": domain,
                "platformType": platform["type"],
                "platformName": platform["platform"],
                "propagationOrder": idx + 1,
                "status": "flagged" if classification == "unauthorized" else "authorized",
                "scanType": "scheduled",
            })

            if classification == "unauthorized":
                alert_id = str(uuid.uuid4())
                db.collection("alerts").document(alert_id).set({
                    "assetId": asset_id,
                    "userId": user_id,
                    "scanResultId": result_id,
                    "confidence": match["confidence"],
                    "foundUrl": match["found_url"],
                    "thumbnailUrl": match["thumbnail_url"],
                    "severity": match["severity"],
                    "riskScore": risk["score"],
                    "riskLabel": risk["label"],
                    "classification": "unauthorized",
                    "isRead": False,
                    "createdAt": scan_time,
                    "scanType": "scheduled",
                })

        db.collection("assets").document(asset_id).update({
            "status": "complete",
            "matchCount": len(matches),
            "unauthorizedCount": unauthorized_count,
            "authorizedCount": len(matches) - unauthorized_count,
            "scanCount": scan_count,
            "lastScannedAt": scan_time,
            "riskScore": risk["score"],
            "riskLabel": risk["label"],
            "riskBreakdown": risk["breakdown"],
        })

        # Send email alert if unauthorized copies found
        if unauthorized_count > 0:
            try:
                from services.email_alerts import send_scan_alert
                user_doc = db.collection("users").document(user_id).get()
                if user_doc.exists:
                    email = user_doc.to_dict().get("email", "")
                    if email:
                        send_scan_alert(email, asset.get("filename", "Unknown"), asset_id,
                                        len(matches), unauthorized_count, risk["score"], matches)
            except Exception as e:
                print(f"[scheduler] Email alert failed: {e}")

        print(f"[scheduler] Re-scan complete for {asset_id[:8]}: {len(matches)} matches, {unauthorized_count} unauthorized")

    except Exception as e:
        print(f"[scheduler] Re-scan error for {asset_id[:8]}: {e}")
        try:
            from services.firebase_client import db
            db.collection("assets").document(asset_id).update({"status": "error"})
        except Exception:
            pass
