"""
Crowdsourced Detector Network — Phase 4.

The network-effect moat: fans and sleuths submit suspected pirate links,
the system auto-verifies via fingerprint matching, verified finds earn
reputation points and leaderboard rank.

More users → more coverage → better protection → more rights-holders pay.
Classic two-sided network.
"""
import uuid
from datetime import datetime, timezone
from collections import defaultdict


# ── In-memory stores ────────────────────────────────────────────────────

_submissions: dict[str, dict] = {}       # submission_id → submission
_contributors: dict[str, dict] = {}      # user_id → contributor profile
_leaderboard_cache: list[dict] = []
_bounties: dict[str, dict] = {}          # bounty_id → active bounty


def submit_pirate_report(
    reporter_id: str,
    suspect_url: str,
    event_name: str = "",
    platform: str = "",
    description: str = "",
) -> dict:
    """
    Submit a suspected pirate stream/link for verification.
    Anyone can submit — the system auto-verifies.
    """
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

    _submissions[submission_id] = submission

    # Ensure contributor profile exists
    if reporter_id not in _contributors:
        _contributors[reporter_id] = {
            "user_id": reporter_id,
            "display_name": reporter_id,
            "total_points": 0,
            "submissions": 0,
            "verified_finds": 0,
            "false_reports": 0,
            "rank": "scout",
            "joined_at": now.isoformat(),
            "badges": [],
        }

    _contributors[reporter_id]["submissions"] += 1

    return submission


def verify_submission(submission_id: str, is_pirate: bool, confidence: float = 0) -> dict:
    """
    Mark a submission as verified (pirate confirmed) or rejected (false positive).
    Awards points for verified finds, penalizes repeated false reports.
    """
    sub = _submissions.get(submission_id)
    if not sub:
        return {"error": "Submission not found"}

    now = datetime.now(timezone.utc)
    reporter_id = sub["reporter_id"]
    contributor = _contributors.get(reporter_id, {})

    if is_pirate:
        # Verified pirate — award points
        points = _calculate_points(confidence, sub.get("platform", ""))
        sub["status"] = "verified_pirate"
        sub["verification_result"] = "confirmed"
        sub["points_awarded"] = points
        sub["verified_at"] = now.isoformat()

        contributor["verified_finds"] = contributor.get("verified_finds", 0) + 1
        contributor["total_points"] = contributor.get("total_points", 0) + points

        # Check for rank upgrade
        _update_rank(contributor)
        # Check for badge awards
        _check_badges(contributor)
    else:
        sub["status"] = "rejected"
        sub["verification_result"] = "false_positive"
        sub["verified_at"] = now.isoformat()

        contributor["false_reports"] = contributor.get("false_reports", 0) + 1

        # Penalize serial false reporters
        if contributor.get("false_reports", 0) > 5:
            contributor["rank"] = "restricted"

    _contributors[reporter_id] = contributor
    _invalidate_leaderboard()

    return {
        "submission_id": submission_id,
        "status": sub["status"],
        "points_awarded": sub.get("points_awarded", 0),
        "contributor_rank": contributor.get("rank", "scout"),
        "total_points": contributor.get("total_points", 0),
    }


def get_leaderboard(limit: int = 20) -> list[dict]:
    """Get the top contributors by points."""
    global _leaderboard_cache

    if not _leaderboard_cache:
        _leaderboard_cache = sorted(
            [
                {
                    "user_id": c["user_id"],
                    "display_name": c.get("display_name", c["user_id"]),
                    "total_points": c.get("total_points", 0),
                    "verified_finds": c.get("verified_finds", 0),
                    "rank": c.get("rank", "scout"),
                    "badges": c.get("badges", []),
                }
                for c in _contributors.values()
                if c.get("rank") != "restricted"
            ],
            key=lambda x: x["total_points"],
            reverse=True,
        )

    return _leaderboard_cache[:limit]


def get_contributor_profile(user_id: str) -> dict | None:
    contributor = _contributors.get(user_id)
    if not contributor:
        return None

    # Add submission history
    submissions = [
        {
            "submission_id": s["submission_id"],
            "suspect_url": s["suspect_url"],
            "status": s["status"],
            "points_awarded": s.get("points_awarded", 0),
            "submitted_at": s["submitted_at"],
        }
        for s in _submissions.values()
        if s["reporter_id"] == user_id
    ]

    return {
        **contributor,
        "recent_submissions": sorted(submissions, key=lambda x: x["submitted_at"], reverse=True)[:10],
    }


def list_submissions(
    status: str = None,
    reporter_id: str = None,
    limit: int = 50,
) -> list[dict]:
    results = []
    for s in _submissions.values():
        if status and s["status"] != status:
            continue
        if reporter_id and s["reporter_id"] != reporter_id:
            continue
        results.append(s)
    return sorted(results, key=lambda x: x["submitted_at"], reverse=True)[:limit]


def get_pending_submissions() -> list[dict]:
    """Get submissions awaiting verification."""
    return list_submissions(status="pending_verification")


def create_bounty(
    event_name: str,
    description: str,
    bonus_points: int = 100,
    user_id: str = "demo_user",
) -> dict:
    """Create a bounty for finding pirate streams of a specific event."""
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
    _bounties[bounty_id] = bounty
    return bounty


def list_bounties(status: str = "active") -> list[dict]:
    return [b for b in _bounties.values() if b.get("status") == status]


def get_network_stats() -> dict:
    """Overall crowdsourced network statistics."""
    total_subs = len(_submissions)
    verified = len([s for s in _submissions.values() if s["status"] == "verified_pirate"])
    pending = len([s for s in _submissions.values() if s["status"] == "pending_verification"])

    return {
        "total_contributors": len(_contributors),
        "active_contributors": len([c for c in _contributors.values() if c.get("submissions", 0) > 0]),
        "total_submissions": total_subs,
        "verified_pirates": verified,
        "pending_verification": pending,
        "verification_rate": round(verified / max(1, total_subs) * 100, 1),
        "total_bounties": len(_bounties),
        "active_bounties": len([b for b in _bounties.values() if b["status"] == "active"]),
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
    # Higher confidence = more points
    confidence_bonus = int(confidence * 40)
    # Harder-to-find platforms get bonus
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


def _invalidate_leaderboard():
    global _leaderboard_cache
    _leaderboard_cache = []


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
