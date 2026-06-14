"""
Crowdsourced Detector Network — Phase 4.

Fans and sleuths submit suspected pirate links, the system auto-verifies
via fingerprint matching, verified finds earn reputation points and
leaderboard rank. All data persisted in Firestore.
"""
import uuid
from datetime import datetime, timezone

from services.firebase_client import db

# ── Firestore collections ──────────────────────────────────────────────

SUBMISSIONS_COL = "crowd_submissions"
CONTRIBUTORS_COL = "crowd_contributors"
BOUNTIES_COL = "crowd_bounties"

def _col(name):
    return db.collection(name)


def submit_pirate_report(
    reporter_id: str,
    suspect_url: str,
    event_name: str = "",
    platform: str = "",
    description: str = "",
) -> dict:
    submission_id = f"sub_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc)

    if not platform:
        platform = _detect_platform(suspect_url)

    submission = {
        "submission_id": submission_id,
        "reporter_id": reporter_id,
        "suspect_url": suspect_url,
        "event_name": event_name,
        "platform": platform,
        "description": description,
        "status": "pending_verification",
        "verification_result": None,
        "points_awarded": 0,
        "submitted_at": now.isoformat(),
        "verified_at": None,
    }

    _col(SUBMISSIONS_COL).document(submission_id).set(submission)

    # Ensure contributor profile exists
    contrib_ref = _col(CONTRIBUTORS_COL).document(reporter_id)
    contrib_doc = contrib_ref.get()
    if not contrib_doc.exists:
        contrib_ref.set({
            "user_id": reporter_id,
            "display_name": reporter_id,
            "total_points": 0,
            "submissions": 1,
            "verified_finds": 0,
            "false_reports": 0,
            "rank": "scout",
            "joined_at": now.isoformat(),
            "badges": [],
        })
    else:
        contrib = contrib_doc.to_dict()
        contrib_ref.update({"submissions": contrib.get("submissions", 0) + 1})

    return submission


def verify_submission(submission_id: str, is_pirate: bool, confidence: float = 0) -> dict:
    sub_ref = _col(SUBMISSIONS_COL).document(submission_id)
    sub_doc = sub_ref.get()
    if not sub_doc.exists:
        return {"error": "Submission not found"}
    sub = sub_doc.to_dict()

    now = datetime.now(timezone.utc)
    reporter_id = sub["reporter_id"]
    contrib_ref = _col(CONTRIBUTORS_COL).document(reporter_id)
    contrib_doc = contrib_ref.get()
    contributor = contrib_doc.to_dict() if contrib_doc.exists else {}

    if is_pirate:
        points = _calculate_points(confidence, sub.get("platform", ""))
        sub["status"] = "verified_pirate"
        sub["verification_result"] = "confirmed"
        sub["points_awarded"] = points
        sub["verified_at"] = now.isoformat()

        contributor["verified_finds"] = contributor.get("verified_finds", 0) + 1
        contributor["total_points"] = contributor.get("total_points", 0) + points

        _update_rank(contributor)
        _check_badges(contributor)
    else:
        sub["status"] = "rejected"
        sub["verification_result"] = "false_positive"
        sub["verified_at"] = now.isoformat()

        contributor["false_reports"] = contributor.get("false_reports", 0) + 1

        if contributor.get("false_reports", 0) > 5:
            contributor["rank"] = "restricted"

    sub_ref.set(sub)
    contrib_ref.set(contributor)

    return {
        "submission_id": submission_id,
        "status": sub["status"],
        "points_awarded": sub.get("points_awarded", 0),
        "contributor_rank": contributor.get("rank", "scout"),
        "total_points": contributor.get("total_points", 0),
    }


def get_leaderboard(limit: int = 20) -> list[dict]:
    docs = _col(CONTRIBUTORS_COL).order_by("total_points", direction="DESCENDING").limit(limit).stream()
    return [
        {
            "user_id": c.get("user_id", c.id),
            "display_name": c.get("display_name", c.get("user_id", "")),
            "total_points": c.get("total_points", 0),
            "verified_finds": c.get("verified_finds", 0),
            "rank": c.get("rank", "scout"),
            "badges": c.get("badges", []),
        }
        for doc in docs
        if (c := doc.to_dict()) and c.get("rank") != "restricted"
    ]


def get_contributor_profile(user_id: str) -> dict | None:
    doc = _col(CONTRIBUTORS_COL).document(user_id).get()
    if not doc.exists:
        return None
    contributor = doc.to_dict()

    sub_docs = _col(SUBMISSIONS_COL).where("reporter_id", "==", user_id).order_by("submitted_at", direction="DESCENDING").limit(10).stream()
    submissions = [
        {
            "submission_id": s["submission_id"],
            "suspect_url": s["suspect_url"],
            "status": s["status"],
            "points_awarded": s.get("points_awarded", 0),
            "submitted_at": s["submitted_at"],
        }
        for doc in sub_docs
        if (s := doc.to_dict())
    ]

    return {
        **contributor,
        "recent_submissions": submissions,
    }


def list_submissions(
    status: str = None,
    reporter_id: str = None,
    limit: int = 50,
) -> list[dict]:
    query = _col(SUBMISSIONS_COL)
    if status:
        query = query.where("status", "==", status)
    if reporter_id:
        query = query.where("reporter_id", "==", reporter_id)
    docs = query.limit(limit).stream()
    results = [d.to_dict() for d in docs]
    return sorted(results, key=lambda x: x.get("submitted_at", ""), reverse=True)


def get_pending_submissions() -> list[dict]:
    return list_submissions(status="pending_verification")


def create_bounty(
    event_name: str,
    description: str,
    bonus_points: int = 100,
    user_id: str = "demo_user",
) -> dict:
    bounty_id = f"bounty_{uuid.uuid4().hex[:8]}"
    bounty = {
        "bounty_id": bounty_id,
        "event_name": event_name,
        "description": description,
        "bonus_points": bonus_points,
        "created_by": user_id,
        "status": "active",
        "claims": 0,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    _col(BOUNTIES_COL).document(bounty_id).set(bounty)
    return bounty


def list_bounties(status: str = "active") -> list[dict]:
    docs = _col(BOUNTIES_COL).where("status", "==", status).stream()
    return [d.to_dict() for d in docs]


def get_network_stats() -> dict:
    subs = [d.to_dict() for d in _col(SUBMISSIONS_COL).stream()]
    contribs = [d.to_dict() for d in _col(CONTRIBUTORS_COL).stream()]
    bounties = [d.to_dict() for d in _col(BOUNTIES_COL).stream()]

    total_subs = len(subs)
    verified = len([s for s in subs if s.get("status") == "verified_pirate"])
    pending = len([s for s in subs if s.get("status") == "pending_verification"])

    return {
        "total_contributors": len(contribs),
        "active_contributors": len([c for c in contribs if c.get("submissions", 0) > 0]),
        "total_submissions": total_subs,
        "verified_pirates": verified,
        "pending_verification": pending,
        "verification_rate": round(verified / max(1, total_subs) * 100, 1),
        "total_bounties": len(bounties),
        "active_bounties": len([b for b in bounties if b.get("status") == "active"]),
        "top_contributors": get_leaderboard(5),
    }


# ── Internal helpers ────────────────────────────────────────────────────

RANK_THRESHOLDS = [
    (5000, "legend"),
    (2000, "expert"),
    (500, "veteran"),
    (100, "hunter"),
    (0, "scout"),
]


def _calculate_points(confidence: float, platform: str) -> int:
    base = 10
    confidence_bonus = int(confidence * 40)
    platform_bonus = {"telegram": 20, "kick": 15, "unknown": 25}.get(platform, 5)
    return base + confidence_bonus + platform_bonus


def _update_rank(contributor: dict):
    points = contributor.get("total_points", 0)
    for threshold, rank in RANK_THRESHOLDS:
        if points >= threshold:
            contributor["rank"] = rank
            break


def _check_badges(contributor: dict):
    badges = set(contributor.get("badges", []))
    finds = contributor.get("verified_finds", 0)

    if finds >= 1:
        badges.add("first_catch")
    if finds >= 10:
        badges.add("sharp_eye")
    if finds >= 50:
        badges.add("pirate_hunter")
    if finds >= 100:
        badges.add("legendary_detector")
    if contributor.get("total_points", 0) >= 1000:
        badges.add("points_master")

    contributor["badges"] = list(badges)


def _detect_platform(url: str) -> str:
    url_lower = url.lower()
    platforms = {
        "youtube": ["youtube.com", "youtu.be"],
        "twitch": ["twitch.tv"],
        "twitter": ["twitter.com", "x.com"],
        "facebook": ["facebook.com", "fb.watch"],
        "telegram": ["t.me", "telegram.org"],
        "tiktok": ["tiktok.com"],
        "kick": ["kick.com"],
    }
    for platform, domains in platforms.items():
        if any(d in url_lower for d in domains):
            return platform
    return "unknown"
