from apscheduler.schedulers.background import BackgroundScheduler
from services.firebase_client import db
import logging

logger = logging.getLogger(__name__)

def rescan_all_assets():
    """Re-scan every image asset that isn't currently scanning."""
    logger.info("Scheduler: starting daily rescan of all assets")
    try:
        assets = db.collection("assets").stream()
        count = 0
        for doc in assets:
            asset = doc.to_dict()
            if asset.get("type") != "image":
                continue
            if asset.get("status") == "scanning":
                continue
            phash       = asset.get("phash", "")
            original_url = asset.get("originalUrl", "")
            user_id     = asset.get("userId", "demo_user")
            if not phash or not original_url:
                continue
            # Update scanCount
            db.collection("assets").document(doc.id).update({
                "scanCount": (asset.get("scanCount") or 0) + 1
            })
            from routers.media import run_scan
            run_scan(doc.id, user_id, phash, original_url)
            count += 1
        logger.info(f"Scheduler: rescan complete — {count} asset(s) rescanned")
    except Exception as e:
        logger.error(f"Scheduler: rescan failed — {e}")


_scheduler = None

def _run_url_checks():
    logger.info("Scheduler: starting URL watchlist checks")
    try:
        from services.url_checker import check_all_watched_urls_sync
        check_all_watched_urls_sync()
        logger.info("Scheduler: URL watchlist checks complete")
    except Exception as e:
        logger.error(f"Scheduler: URL checks failed — {e}")


def _run_weekly_reports():
    logger.info("Scheduler: generating weekly reports")
    try:
        from services.report_generator import generate_all_weekly_reports_sync
        generate_all_weekly_reports_sync()
        logger.info("Scheduler: weekly reports complete")
    except Exception as e:
        logger.error(f"Scheduler: weekly reports failed — {e}")


def start_scheduler():
    global _scheduler
    if _scheduler is not None:
        return
    _scheduler = BackgroundScheduler()
    _scheduler.add_job(rescan_all_assets, "interval", hours=24, id="daily_rescan")
    _scheduler.add_job(_run_url_checks, "interval", hours=6, id="url_watchlist_check")
    _scheduler.add_job(_run_weekly_reports, "cron", day_of_week="mon", hour=8, id="weekly_reports")
    _scheduler.start()
    logger.info("Scheduler: started — daily rescan, 6h URL checks, weekly reports (Mon 8am UTC)")
