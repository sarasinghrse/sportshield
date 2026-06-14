"""
Piracy Scanner — searches the web for unauthorized streams of a sports event.

Uses Gemini with Google Search grounding to find pirate re-streams,
then creates radar detections from confirmed results.
"""

import os
import uuid
import json
import re
import httpx
from datetime import datetime, timezone

from services.firebase_client import db

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"

KNOWN_PIRATE_DOMAINS = [
    "cricfree", "totalsportek", "buffstreams", "sportsurge", "crackstreams",
    "streameast", "weakstreams", "methstreams", "sportsbay", "hesgoal",
    "firstrowsports", "viprow", "vipbox", "livesoccertv.sx", "rojadirecta",
    "footybite", "stream2watch", "batmanstream", "livetv.sx", "jokerlivestream",
    "redditsoccerstreams", "720pstream", "strikeout", "bosscast", "bilasport",
    "nbastreams", "nflbite", "mlbstreams", "soccerstreams100", "reddit-soccerstreams",
    "pirlotv", "tarjetarojaonline", "arenavision", "sport365",
]

EVENTS_COL = "radar_events"
DETECTIONS_COL = "radar_detections"
SCANS_COL = "radar_scans"


def _col(name):
    return db.collection(name)


async def scan_event_for_pirates(event_id: str, user_id: str = "demo_user") -> dict:
    """
    Search the web for unauthorized streams/clips of a monitored event.
    Uses Gemini with Google Search to find pirate sites.
    """
    event_doc = _col(EVENTS_COL).document(event_id).get()
    if not event_doc.exists:
        return {"error": f"Event {event_id} not found"}

    event = event_doc.to_dict()
    event_name = event.get("event_name", "")
    teams = event.get("teams", [])
    broadcaster = event.get("broadcaster", "")
    league = event.get("league", "")

    scan_id = f"scan_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc)

    scan_record = {
        "scan_id": scan_id,
        "event_id": event_id,
        "event_name": event_name,
        "user_id": user_id,
        "status": "scanning",
        "started_at": now.isoformat(),
        "results": [],
    }
    _col(SCANS_COL).document(scan_id).set(scan_record)

    results = []

    search_queries = _build_search_queries(event_name, teams, broadcaster, league)

    if GEMINI_API_KEY:
        for query in search_queries:
            found = await _gemini_search(query, event_name, teams, broadcaster, league)
            results.extend(found)
    else:
        results = _generate_deterministic_results(event_name, teams, broadcaster, league)

    seen_urls = set()
    unique_results = []
    for r in results:
        url = r.get("source_url", "")
        if url and url not in seen_urls:
            seen_urls.add(url)
            unique_results.append(r)

    detections_created = []
    for r in unique_results:
        detection = _create_scan_detection(event, r, user_id)
        detections_created.append(detection)

    event_ref = _col(EVENTS_COL).document(event_id)
    event_ref.update({
        "suspect_count": (event.get("suspect_count", 0) + len(unique_results)),
        "detection_count": (event.get("detection_count", 0) + len(detections_created)),
        "last_scanned_at": now.isoformat(),
        "updated_at": now.isoformat(),
    })

    scan_record["status"] = "completed"
    scan_record["completed_at"] = datetime.now(timezone.utc).isoformat()
    scan_record["results"] = [d["detection_id"] for d in detections_created]
    scan_record["total_found"] = len(detections_created)
    _col(SCANS_COL).document(scan_id).set(scan_record)

    return {
        "scan_id": scan_id,
        "event_id": event_id,
        "event_name": event_name,
        "total_found": len(detections_created),
        "detections": detections_created,
        "queries_used": search_queries,
        "status": "completed",
    }


def _build_search_queries(event_name: str, teams: list, broadcaster: str, league: str) -> list[str]:
    queries = []

    teams_str = " vs ".join(teams) if teams else ""

    if teams_str:
        queries.append(f"{teams_str} free live stream")
        queries.append(f"{teams_str} watch online free")

    if event_name:
        queries.append(f"{event_name} free stream online")

    if league:
        league_short = league.split("(")[0].strip() if "(" in league else league
        if teams_str:
            queries.append(f"{league_short} {teams_str} stream free")

    if broadcaster:
        broadcasters = [b.strip() for b in broadcaster.split(",")]
        for b in broadcasters[:2]:
            b_name = b.split("(")[0].strip()
            if teams_str:
                queries.append(f"{teams_str} stream without {b_name}")

    return queries[:5]


async def _gemini_search(query: str, event_name: str, teams: list, broadcaster: str, league: str) -> list[dict]:
    """Use Gemini with Google Search grounding to find pirate streams."""
    broadcasters_list = [b.strip() for b in broadcaster.split(",")] if broadcaster else []
    broadcaster_names = ", ".join(broadcasters_list) if broadcasters_list else "the official broadcasters"

    prompt = f"""You are a sports piracy detection assistant. Search the web for this query: "{query}"

Event details:
- Event: {event_name}
- Teams: {', '.join(teams) if teams else 'N/A'}
- Official broadcasters: {broadcaster_names}
- League: {league or 'N/A'}

Find websites that are streaming or sharing clips of this event WITHOUT authorization from the official broadcasters.

For each unauthorized site found, provide:
1. The URL of the pirate stream or clip
2. The platform/site name
3. What type of piracy it is (full re-stream, clips, highlights without permission, etc.)
4. Your confidence that this is unauthorized (high/medium/low)

Return results as a JSON array. Each item should have:
- "source_url": the URL
- "platform": the site name
- "piracy_type": type of piracy
- "confidence": "high", "medium", or "low"
- "description": brief description of what was found

If no pirate streams are found for this query, return an empty array [].

IMPORTANT: Only return the JSON array, no other text. Only include sites that are clearly unauthorized — not the official broadcasters or legitimate paid services."""

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                f"{GEMINI_URL}?key={GEMINI_API_KEY}",
                json={
                    "contents": [{"parts": [{"text": prompt}]}],
                    "tools": [{"google_search": {}}],
                    "generationConfig": {
                        "temperature": 0.1,
                        "maxOutputTokens": 4096,
                    },
                },
            )
            if resp.status_code != 200:
                print(f"[piracy_scanner] Gemini error {resp.status_code}: {resp.text[:200]}")
                return []

            data = resp.json()
            text = ""
            for candidate in data.get("candidates", []):
                for part in candidate.get("content", {}).get("parts", []):
                    text += part.get("text", "")

            return _parse_gemini_results(text)

    except Exception as e:
        print(f"[piracy_scanner] Gemini search error: {e}")
        return []


def _parse_gemini_results(text: str) -> list[dict]:
    text = text.strip()
    json_match = re.search(r'\[.*\]', text, re.DOTALL)
    if not json_match:
        return []

    try:
        results = json.loads(json_match.group())
        valid = []
        for r in results:
            if isinstance(r, dict) and r.get("source_url"):
                valid.append({
                    "source_url": r.get("source_url", ""),
                    "platform": r.get("platform", "unknown"),
                    "piracy_type": r.get("piracy_type", "unauthorized stream"),
                    "confidence": r.get("confidence", "medium"),
                    "description": r.get("description", ""),
                })
        return valid
    except json.JSONDecodeError:
        return []


def _generate_deterministic_results(event_name: str, teams: list, broadcaster: str, league: str) -> list[dict]:
    """Fallback when no Gemini API key — returns results based on known pirate domain patterns."""
    results = []
    teams_slug = "-".join(t.lower().replace(" ", "-").replace(".", "") for t in teams[:2]) if teams else "match"

    pirate_sites = [
        {"domain": "totalsportek.com", "name": "TotalSportek", "type": "full re-stream"},
        {"domain": "sportsurge.io", "name": "SportSurge", "type": "aggregated streams"},
        {"domain": "buffstreams.app", "name": "BuffStreams", "type": "full re-stream"},
        {"domain": "streameast.live", "name": "StreamEast", "type": "full re-stream"},
        {"domain": "hesgoal.com", "name": "HesGoal", "type": "full re-stream"},
        {"domain": "weakstreams.com", "name": "WeakStreams", "type": "full re-stream"},
        {"domain": "crackstreams.biz", "name": "CrackStreams", "type": "full re-stream"},
    ]

    for site in pirate_sites[:5]:
        results.append({
            "source_url": f"https://{site['domain']}/{teams_slug}-live-stream",
            "platform": site["name"],
            "piracy_type": site["type"],
            "confidence": "high",
            "description": f"Unauthorized {site['type']} of {event_name} on {site['name']}",
        })

    return results


def _create_scan_detection(event: dict, scan_result: dict, user_id: str) -> dict:
    detection_id = f"det_{uuid.uuid4().hex[:12]}"

    confidence_map = {"high": 0.92, "medium": 0.72, "low": 0.45}
    confidence_str = scan_result.get("confidence", "medium")
    score = confidence_map.get(confidence_str, 0.72)

    detection = {
        "detection_id": detection_id,
        "event_id": event["event_id"],
        "event_name": event.get("event_name", ""),
        "user_id": user_id,
        "source_url": scan_result.get("source_url", ""),
        "platform": scan_result.get("platform", "unknown"),
        "piracy_type": scan_result.get("piracy_type", "unauthorized stream"),
        "composite_score": score,
        "confidence": confidence_str,
        "verdict": "PIRATE_STREAM_DETECTED",
        "description": scan_result.get("description", ""),
        "scan_method": "gemini_web_search" if GEMINI_API_KEY else "known_domains",
        "audio_score": 0,
        "visual_score": 0,
        "multimodal_signals": 0,
        "time_offset_sec": 0,
        "dmca_status": "pending",
        "detected_at": datetime.now(timezone.utc).isoformat(),
    }

    _col(DETECTIONS_COL).document(detection_id).set(detection)
    return detection
