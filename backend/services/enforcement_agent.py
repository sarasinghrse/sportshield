"""
Autonomous Enforcement Agent — Phase 3.

Detection → Evidence → DMCA → Escalation, persisted in Firestore.
"""
import uuid
import json
from datetime import datetime, timezone, timedelta

from services.dmca_generator import generate_dmca_notice, get_platform_info
from services.firebase_client import db

# ── Firestore collections ──────────────────────────────────────────────

CASES_COL = "enforcement_cases"
LOG_COL = "enforcement_log"

def _col(name):
    return db.collection(name)

# Escalation thresholds
INITIAL_RESPONSE_MINUTES = 30
ESCALATION_1_MINUTES = 60
ESCALATION_2_MINUTES = 120
FINAL_ESCALATION_MINUTES = 240


def create_enforcement_case(
    detection: dict,
    user_id: str = "demo_user",
) -> dict:
    case_id = f"case_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc)

    source_url = detection.get("source_url", "")
    platform = _detect_platform(source_url)

    evidence = _build_evidence(detection)
    dmca = _generate_dmca(detection, platform, evidence, user_id)

    case = {
        "case_id": case_id,
        "detection_id": detection.get("detection_id", ""),
        "event_id": detection.get("event_id", ""),
        "event_name": detection.get("event_name", ""),
        "user_id": user_id,
        "source_url": source_url,
        "platform": platform,
        "status": "dmca_generated",
        "priority": _compute_priority(detection),
        "composite_score": detection.get("composite_score", 0),
        "confidence": detection.get("confidence", "unknown"),
        "evidence": evidence,
        "dmca": dmca,
        "timeline": [
            {
                "action": "case_created",
                "timestamp": now.isoformat(),
                "detail": "Enforcement case created from pirate detection",
            },
            {
                "action": "evidence_gathered",
                "timestamp": now.isoformat(),
                "detail": f"Evidence package built: {len(evidence.get('items', []))} items",
            },
            {
                "action": "dmca_generated",
                "timestamp": now.isoformat(),
                "detail": f"Platform-specific DMCA generated for {platform}",
            },
        ],
        "escalation_level": 0,
        "next_escalation_at": (now + timedelta(minutes=INITIAL_RESPONSE_MINUTES)).isoformat(),
        "created_at": now.isoformat(),
        "updated_at": now.isoformat(),
        "resolved_at": None,
    }

    _col(CASES_COL).document(case_id).set(case)

    _col(LOG_COL).add({
        "action": "case_created",
        "case_id": case_id,
        "platform": platform,
        "timestamp": now.isoformat(),
    })

    return case


def file_dmca(case_id: str) -> dict:
    doc = _col(CASES_COL).document(case_id).get()
    if not doc.exists:
        return {"error": f"Case {case_id} not found"}
    case = doc.to_dict()

    now = datetime.now(timezone.utc)
    platform = case.get("platform", "unknown")
    platform_info = get_platform_info(platform)

    case["status"] = "dmca_filed"
    case["dmca"]["filed_at"] = now.isoformat()
    case["dmca"]["filing_method"] = platform_info.get("method", "manual")
    case["dmca"]["estimated_response"] = platform_info.get("estimated_response", "24-48 hours")
    case["next_escalation_at"] = (now + timedelta(minutes=ESCALATION_1_MINUTES)).isoformat()

    case["timeline"].append({
        "action": "dmca_filed",
        "timestamp": now.isoformat(),
        "detail": f"DMCA takedown filed via {platform_info.get('method', 'webform')} for {platform}",
    })
    case["updated_at"] = now.isoformat()

    _col(CASES_COL).document(case_id).set(case)

    _col(LOG_COL).add({
        "action": "dmca_filed",
        "case_id": case_id,
        "platform": platform,
        "timestamp": now.isoformat(),
    })

    return {
        "case_id": case_id,
        "status": "dmca_filed",
        "platform": platform,
        "filing_method": platform_info.get("method", "manual"),
        "estimated_response": platform_info.get("estimated_response", "24-48 hours"),
        "filed_at": now.isoformat(),
    }


def escalate_case(case_id: str) -> dict:
    doc = _col(CASES_COL).document(case_id).get()
    if not doc.exists:
        return {"error": f"Case {case_id} not found"}
    case = doc.to_dict()

    now = datetime.now(timezone.utc)
    current_level = case.get("escalation_level", 0)
    new_level = current_level + 1

    escalation_actions = {
        1: {
            "action": "Re-filed DMCA with URGENT priority",
            "status": "escalated_refiled",
            "next_minutes": ESCALATION_2_MINUTES,
        },
        2: {
            "action": "Notified hosting provider and domain registrar",
            "status": "escalated_host_notified",
            "next_minutes": FINAL_ESCALATION_MINUTES,
        },
        3: {
            "action": "Legal notice package prepared for formal proceedings",
            "status": "escalated_legal",
            "next_minutes": 0,
        },
    }

    esc = escalation_actions.get(new_level, escalation_actions[3])

    case["escalation_level"] = new_level
    case["status"] = esc["status"]
    case["priority"] = "critical" if new_level >= 2 else "high"

    if esc["next_minutes"]:
        case["next_escalation_at"] = (now + timedelta(minutes=esc["next_minutes"])).isoformat()
    else:
        case["next_escalation_at"] = None

    case["timeline"].append({
        "action": f"escalated_level_{new_level}",
        "timestamp": now.isoformat(),
        "detail": esc["action"],
    })
    case["updated_at"] = now.isoformat()

    _col(CASES_COL).document(case_id).set(case)

    _col(LOG_COL).add({
        "action": f"escalated_level_{new_level}",
        "case_id": case_id,
        "timestamp": now.isoformat(),
    })

    return {
        "case_id": case_id,
        "escalation_level": new_level,
        "status": esc["status"],
        "action_taken": esc["action"],
        "priority": case["priority"],
    }


def resolve_case(case_id: str, resolution: str = "content_removed") -> dict:
    doc = _col(CASES_COL).document(case_id).get()
    if not doc.exists:
        return {"error": f"Case {case_id} not found"}
    case = doc.to_dict()

    now = datetime.now(timezone.utc)
    created = datetime.fromisoformat(case["created_at"])
    resolution_time = (now - created).total_seconds()

    case["status"] = "resolved"
    case["resolved_at"] = now.isoformat()
    case["resolution"] = resolution
    case["resolution_time_sec"] = round(resolution_time)
    case["resolution_time_human"] = _format_duration(resolution_time)

    case["timeline"].append({
        "action": "resolved",
        "timestamp": now.isoformat(),
        "detail": f"Case resolved: {resolution} (took {case['resolution_time_human']})",
    })
    case["updated_at"] = now.isoformat()

    _col(CASES_COL).document(case_id).set(case)

    _col(LOG_COL).add({
        "action": "resolved",
        "case_id": case_id,
        "resolution": resolution,
        "resolution_time_sec": round(resolution_time),
        "timestamp": now.isoformat(),
    })

    return {
        "case_id": case_id,
        "status": "resolved",
        "resolution": resolution,
        "resolution_time": case["resolution_time_human"],
    }


def get_case(case_id: str) -> dict | None:
    doc = _col(CASES_COL).document(case_id).get()
    return doc.to_dict() if doc.exists else None


def list_cases(user_id: str = "demo_user", status: str = None) -> list[dict]:
    query = _col(CASES_COL).where("user_id", "==", user_id)
    if status:
        query = query.where("status", "==", status)
    docs = query.stream()
    results = []
    for d in docs:
        c = d.to_dict()
        results.append({
            "case_id": c["case_id"],
            "event_name": c.get("event_name", ""),
            "source_url": c.get("source_url", ""),
            "platform": c.get("platform", ""),
            "status": c["status"],
            "priority": c.get("priority", "medium"),
            "escalation_level": c.get("escalation_level", 0),
            "composite_score": c.get("composite_score", 0),
            "created_at": c["created_at"],
            "resolved_at": c.get("resolved_at"),
        })
    return sorted(results, key=lambda x: x["created_at"], reverse=True)


def get_enforcement_stats(user_id: str = "demo_user") -> dict:
    docs = list(_col(CASES_COL).where("user_id", "==", user_id).stream())
    user_cases = [d.to_dict() for d in docs]
    resolved = [c for c in user_cases if c.get("status") == "resolved"]
    active = [c for c in user_cases if c.get("status") != "resolved"]

    avg_resolution = 0
    if resolved:
        times = [c.get("resolution_time_sec", 0) for c in resolved]
        avg_resolution = sum(times) / len(times)

    under_30_min = len([c for c in resolved if c.get("resolution_time_sec", 9999) < 1800])

    return {
        "total_cases": len(user_cases),
        "active_cases": len(active),
        "resolved_cases": len(resolved),
        "avg_resolution_sec": round(avg_resolution),
        "avg_resolution_human": _format_duration(avg_resolution) if avg_resolution else "N/A",
        "under_30_min_rate": round(under_30_min / max(1, len(resolved)) * 100, 1),
        "escalation_breakdown": {
            "level_0": len([c for c in user_cases if c.get("escalation_level", 0) == 0]),
            "level_1": len([c for c in user_cases if c.get("escalation_level", 0) == 1]),
            "level_2": len([c for c in user_cases if c.get("escalation_level", 0) == 2]),
            "level_3": len([c for c in user_cases if c.get("escalation_level", 0) >= 3]),
        },
        "platform_breakdown": _platform_breakdown(user_cases),
    }


def get_cases_needing_escalation(user_id: str = "demo_user") -> list[dict]:
    now = datetime.now(timezone.utc)
    docs = _col(CASES_COL).where("user_id", "==", user_id).stream()
    results = []
    for d in docs:
        c = d.to_dict()
        if c.get("status") == "resolved":
            continue
        next_esc = c.get("next_escalation_at")
        if next_esc and datetime.fromisoformat(next_esc) <= now:
            results.append({
                "case_id": c["case_id"],
                "event_name": c.get("event_name", ""),
                "platform": c.get("platform", ""),
                "current_level": c.get("escalation_level", 0),
                "overdue_since": next_esc,
            })
    return results


# ── Internal helpers ────────────────────────────────────────────────────

def _build_evidence(detection: dict) -> dict:
    items = []

    if detection.get("audio_score"):
        items.append({
            "type": "audio_fingerprint_match",
            "score": detection["audio_score"],
            "description": f"Audio fingerprint match: {detection['audio_score']:.0%} similarity",
        })

    if detection.get("visual_score"):
        items.append({
            "type": "visual_frame_match",
            "score": detection["visual_score"],
            "description": f"Visual frame match: {detection['visual_score']:.0%} similarity",
        })

    if detection.get("multimodal_signals", 0) > 0:
        items.append({
            "type": "multimodal_confirmation",
            "signals": detection["multimodal_signals"],
            "description": f"Multimodal confirmation: {detection['multimodal_signals']} independent signals verified",
        })

    if detection.get("time_offset_sec"):
        items.append({
            "type": "time_offset",
            "offset": detection["time_offset_sec"],
            "description": f"Stream delay: {detection['time_offset_sec']}s behind original broadcast",
        })

    items.append({
        "type": "composite_score",
        "score": detection.get("composite_score", 0),
        "description": f"Composite piracy score: {detection.get('composite_score', 0):.0%}",
    })

    return {
        "items": items,
        "item_count": len(items),
        "collected_at": datetime.now(timezone.utc).isoformat(),
    }


def _generate_dmca(detection: dict, platform: str, evidence: dict, user_id: str) -> dict:
    source_url = detection.get("source_url", "")
    event_name = detection.get("event_name", "Protected sports broadcast")

    try:
        notice = generate_dmca_notice(
            owner_name=user_id,
            owner_email=f"{user_id}@sportshield.app",
            content_description=f"Unauthorized re-stream of: {event_name}",
            original_url="https://sportshield.app/protected",
            infringing_url=source_url,
            platform_type=platform,
        )
    except Exception:
        notice = {
            "subject": f"DMCA Takedown: Unauthorized stream of {event_name}",
            "body": f"Unauthorized re-stream detected at {source_url}",
            "platform": platform,
        }

    notice["auto_generated"] = True
    notice["evidence_summary"] = [item["description"] for item in evidence.get("items", [])]

    return notice


def _detect_platform(url: str) -> str:
    url_lower = url.lower()
    platforms = {
        "youtube": ["youtube.com", "youtu.be"],
        "twitch": ["twitch.tv"],
        "twitter": ["twitter.com", "x.com"],
        "facebook": ["facebook.com", "fb.watch"],
        "instagram": ["instagram.com"],
        "telegram": ["t.me", "telegram.org"],
        "tiktok": ["tiktok.com"],
        "dailymotion": ["dailymotion.com"],
        "kick": ["kick.com"],
    }
    for platform, domains in platforms.items():
        if any(d in url_lower for d in domains):
            return platform
    return "unknown"


def _compute_priority(detection: dict) -> str:
    score = detection.get("composite_score", 0)
    if score >= 0.8:
        return "critical"
    elif score >= 0.6:
        return "high"
    elif score >= 0.4:
        return "medium"
    return "low"


def _format_duration(seconds: float) -> str:
    if seconds < 60:
        return f"{int(seconds)}s"
    elif seconds < 3600:
        return f"{int(seconds // 60)}m {int(seconds % 60)}s"
    else:
        h = int(seconds // 3600)
        m = int((seconds % 3600) // 60)
        return f"{h}h {m}m"


def _platform_breakdown(cases: list[dict]) -> dict:
    breakdown = {}
    for c in cases:
        p = c.get("platform", "unknown")
        breakdown[p] = breakdown.get(p, 0) + 1
    return breakdown
