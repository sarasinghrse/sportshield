from apscheduler.schedulers.background import BackgroundScheduler
from services.firebase_client import db
from routers.media import run_scan
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
            run_scan(doc.id, user_id, phash, original_url)
            count += 1
        logger.info(f"Scheduler: rescan complete — {count} asset(s) rescanned")
    except Exception as e:
        logger.error(f"Scheduler: rescan failed — {e}")


_scheduler = None

def start_scheduler():
    global _scheduler
    if _scheduler is not None:
        return
    _scheduler = BackgroundScheduler()
    _scheduler.add_job(rescan_all_assets, "interval", hours=24, id="daily_rescan")
    _scheduler.start()
    logger.info("Scheduler: started — daily rescan every 24 hours")
