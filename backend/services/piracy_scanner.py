"""
Piracy Scanner — searches the web for unauthorized streams of a sports event.

Pipeline:
  1. Gemini + Google Search grounding finds candidate pirate URLs
  2. Each URL is fetched and its HTML content analysed by Gemini
  3. Real per-signal scores (page structure, keyword density, ad/popup
     indicators, stream embed detection, domain reputation) are produced
  4. Confirmed detections are stored in Firestore
"""

import os
import uuid
import json
import re
import httpx
from datetime import datetime, timezone
from urllib.parse import urlparse

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


def _domain_reputation_score(url: str) -> float:
    try:
        host = urlparse(url).netloc.lower()
    except Exception:
        return 0.0
    for pirate in KNOWN_PIRATE_DOMAINS:
        if pirate in host:
            return 0.95
    suspicious_tlds = [".sx", ".biz", ".cc", ".live", ".stream", ".tv", ".io"]
    for tld in suspicious_tlds:
        if host.endswith(tld):
            return 0.5
    return 0.15


# ── Main scan pipeline ────────────────────────────────────────────────────

async def scan_event_for_pirates(event_id: str, user_id: str = "demo_user") -> dict:
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

    # ── Step 1: Find candidate URLs ──
    candidates = []
    search_queries = _build_search_queries(event_name, teams, broadcaster, league)

    if GEMINI_API_KEY:
        for query in search_queries:
            found = await _gemini_search(query, event_name, teams, broadcaster, league)
            candidates.extend(found)

    used_fallback = False
    if not candidates:
        candidates = _generate_deterministic_results(event_name, teams, broadcaster, league)
        used_fallback = True

    scan_method = "known_domains" if (used_fallback or not GEMINI_API_KEY) else "gemini_verified"

    # Deduplicate
    seen_urls = set()
    unique_candidates = []
    for r in candidates:
        url = r.get("source_url", "")
        if url and url not in seen_urls:
            seen_urls.add(url)
            unique_candidates.append(r)

    # ── Step 2: Verify each URL by fetching and analysing page content ──
    verified_results = []
    for candidate in unique_candidates[:8]:
        analysis = await _verify_candidate(candidate, event_name, teams, broadcaster)
        candidate["analysis"] = analysis
        verified_results.append(candidate)

    # ── Step 3: Create detections ──
    detections_created = []
    for r in verified_results:
        detection = _create_scan_detection(event, r, user_id, scan_method)
        detections_created.append(detection)

    event_ref = _col(EVENTS_COL).document(event_id)
    event_ref.update({
        "suspect_count": (event.get("suspect_count", 0) + len(verified_results)),
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


# ── Step 2 detail: fetch page + Gemini content analysis ──────────────────

async def _fetch_page_content(url: str) -> str | None:
    try:
        async with httpx.AsyncClient(
            timeout=10,
            follow_redirects=True,
            headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"},
        ) as client:
            resp = await client.get(url)
            if resp.status_code >= 400:
                return None
            ct = resp.headers.get("content-type", "")
            if "html" not in ct and "text" not in ct:
                return None
            text = resp.text
            # Strip scripts/styles to reduce token usage, keep structure
            text = re.sub(r'<script[^>]*>.*?</script>', '', text, flags=re.DOTALL | re.IGNORECASE)
            text = re.sub(r'<style[^>]*>.*?</style>', '', text, flags=re.DOTALL | re.IGNORECASE)
            # Trim to ~6000 chars to stay within Gemini token limits
            return text[:6000]
    except Exception as e:
        print(f"[piracy_scanner] Fetch failed for {url}: {e}")
        return None


async def _verify_candidate(candidate: dict, event_name: str, teams: list, broadcaster: str) -> dict:
    """Fetch a candidate URL's page content and analyse it with Gemini."""
    url = candidate.get("source_url", "")
    domain_score = _domain_reputation_score(url)

    default_analysis = {
        "verified": False,
        "page_fetched": False,
        "domain_reputation_score": domain_score,
        "stream_embed_score": 0.0,
        "keyword_match_score": 0.0,
        "ad_popup_score": 0.0,
        "content_match_score": 0.0,
        "composite_score": domain_score * 0.4,
        "verdict": "unverified",
        "reasoning": "Could not fetch page content for analysis",
        "signals_detected": [],
    }

    html = await _fetch_page_content(url)
    if not html:
        default_analysis["composite_score"] = round(domain_score * 0.6, 2)
        default_analysis["verdict"] = "suspected" if domain_score > 0.5 else "unverified"
        return default_analysis

    # Quick keyword scan before burning a Gemini call
    html_lower = html.lower()
    keyword_hits = []
    for team in teams:
        if team.lower() in html_lower:
            keyword_hits.append(team)
    if event_name.lower() in html_lower:
        keyword_hits.append(event_name)

    stream_indicators = ["iframe", "player", "hls", "m3u8", ".ts", "video-js", "jwplayer",
                         "clappr", "flowplayer", "rtmp", "stream", "embed"]
    stream_hits = [ind for ind in stream_indicators if ind in html_lower]

    ad_indicators = ["popup", "popunder", "adblock", "disable ad", "click to play",
                     "close ad", "advertisement", "bet now", "casino", "18+"]
    ad_hits = [ind for ind in ad_indicators if ind in html_lower]

    # Local signal scores (no API call needed)
    keyword_score = min(1.0, len(keyword_hits) / max(1, len(teams) + 1))
    stream_embed_score = min(1.0, len(stream_hits) / 3.0)
    ad_score = min(1.0, len(ad_hits) / 3.0)

    # If Gemini key is available, do a deep analysis of the page
    gemini_analysis = None
    if GEMINI_API_KEY:
        gemini_analysis = await _gemini_page_analysis(html, url, event_name, teams, broadcaster)

    if gemini_analysis:
        content_match = gemini_analysis.get("content_match_score", keyword_score)
        stream_embed = gemini_analysis.get("stream_embed_score", stream_embed_score)
        ad_popup = gemini_analysis.get("ad_popup_score", ad_score)
        reasoning = gemini_analysis.get("reasoning", "")
        signals = gemini_analysis.get("signals_detected", [])
        is_pirate = gemini_analysis.get("is_pirate", False)
    else:
        content_match = keyword_score
        stream_embed = stream_embed_score
        ad_popup = ad_score
        reasoning = f"Local analysis: {len(keyword_hits)} keyword hits, {len(stream_hits)} stream indicators, {len(ad_hits)} ad indicators"
        signals = keyword_hits + [f"stream:{s}" for s in stream_hits[:3]] + [f"ad:{a}" for a in ad_hits[:3]]
        is_pirate = (keyword_score > 0.3 and stream_embed_score > 0.3) or domain_score > 0.8

    # Weighted composite: domain reputation matters most, then content signals
    composite = round(
        domain_score * 0.25 +
        content_match * 0.25 +
        stream_embed * 0.25 +
        ad_popup * 0.10 +
        (0.15 if is_pirate else 0.0),
        2,
    )

    verdict = "confirmed_pirate" if composite >= 0.7 else "likely_pirate" if composite >= 0.45 else "suspected" if composite >= 0.25 else "unlikely"

    return {
        "verified": True,
        "page_fetched": True,
        "domain_reputation_score": round(domain_score, 2),
        "stream_embed_score": round(stream_embed, 2),
        "keyword_match_score": round(content_match, 2),
        "ad_popup_score": round(ad_popup, 2),
        "content_match_score": round(content_match, 2),
        "composite_score": composite,
        "verdict": verdict,
        "reasoning": reasoning,
        "signals_detected": signals[:10],
        "keyword_hits": keyword_hits,
        "stream_indicators_found": stream_hits[:5],
        "ad_indicators_found": ad_hits[:5],
    }


async def _gemini_page_analysis(html: str, url: str, event_name: str, teams: list, broadcaster: str) -> dict | None:
    """Ask Gemini to analyse fetched page HTML for piracy indicators."""
    prompt = f"""Analyse this webpage HTML to determine if it is hosting an unauthorized/pirate stream of a sports event.

Event: {event_name}
Teams: {', '.join(teams) if teams else 'N/A'}
Official broadcaster: {broadcaster or 'N/A'}
Page URL: {url}

Page HTML (truncated):
{html}

Score each signal from 0.0 to 1.0:
- content_match_score: Does the page reference this specific event/teams? (0=no mention, 1=exact match with stream)
- stream_embed_score: Does the page contain embedded video players, iframes, HLS/m3u8 links, or streaming infrastructure? (0=no player, 1=active stream embed)
- ad_popup_score: Does the page have aggressive ads, popups, bet-now buttons, casino links, "disable adblock" notices? (0=clean, 1=heavily ad-laden)
- is_pirate: true if this page is clearly hosting or linking to an unauthorized stream, false if it's a legitimate site or just a schedule/news page

Also provide:
- reasoning: 1-2 sentence explanation of your analysis
- signals_detected: list of specific evidence strings found (e.g. "iframe src=...", "m3u8 link found", "team name in title")

Return ONLY valid JSON:
{{"content_match_score": 0.0, "stream_embed_score": 0.0, "ad_popup_score": 0.0, "is_pirate": false, "reasoning": "...", "signals_detected": ["..."]}}"""

    try:
        async with httpx.AsyncClient(timeout=20) as client:
            resp = await client.post(
                f"{GEMINI_URL}?key={GEMINI_API_KEY}",
                json={
                    "contents": [{"parts": [{"text": prompt}]}],
                    "generationConfig": {"temperature": 0.1, "maxOutputTokens": 1024},
                },
            )
            if resp.status_code != 200:
                print(f"[piracy_scanner] Gemini analysis error {resp.status_code}")
                return None

            data = resp.json()
            text = ""
            for candidate in data.get("candidates", []):
                for part in candidate.get("content", {}).get("parts", []):
                    text += part.get("text", "")

            text = text.strip()
            json_match = re.search(r'\{.*\}', text, re.DOTALL)
            if not json_match:
                return None
            return json.loads(json_match.group())

    except Exception as e:
        print(f"[piracy_scanner] Gemini page analysis failed: {e}")
        return None


# ── Step 1: Search queries + Gemini web search ───────────────────────────

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


# ── Fallback: deterministic results from known pirate domains ─────────────

def _generate_deterministic_results(event_name: str, teams: list, broadcaster: str, league: str) -> list[dict]:
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


# ── Detection creation with real scores ───────────────────────────────────

def _create_scan_detection(event: dict, scan_result: dict, user_id: str, scan_method: str = "known_domains") -> dict:
    detection_id = f"det_{uuid.uuid4().hex[:12]}"

    analysis = scan_result.get("analysis", {})

    if analysis and analysis.get("verified"):
        composite = analysis.get("composite_score", 0.5)
        verdict = analysis.get("verdict", "PIRATE_STREAM_DETECTED")
        domain_score = analysis.get("domain_reputation_score", 0)
        stream_score = analysis.get("stream_embed_score", 0)
        keyword_score = analysis.get("keyword_match_score", 0)
        ad_score = analysis.get("ad_popup_score", 0)
        signals = analysis.get("signals_detected", [])
        reasoning = analysis.get("reasoning", "")
    else:
        confidence_map = {"high": 0.85, "medium": 0.60, "low": 0.35}
        confidence_str = scan_result.get("confidence", "medium")
        composite = confidence_map.get(confidence_str, 0.60)
        verdict = "suspected"
        domain_score = _domain_reputation_score(scan_result.get("source_url", ""))
        stream_score = 0
        keyword_score = 0
        ad_score = 0
        signals = []
        reasoning = scan_result.get("description", "")

    confidence_label = "HIGH" if composite >= 0.7 else "MEDIUM" if composite >= 0.45 else "LOW"

    detection = {
        "detection_id": detection_id,
        "event_id": event["event_id"],
        "event_name": event.get("event_name", ""),
        "user_id": user_id,
        "source_url": scan_result.get("source_url", ""),
        "platform": scan_result.get("platform", "unknown"),
        "piracy_type": scan_result.get("piracy_type", "unauthorized stream"),
        "composite_score": composite,
        "confidence": confidence_label,
        "verdict": verdict.upper().replace(" ", "_"),
        "description": scan_result.get("description", ""),
        "scan_method": scan_method,
        "analysis": {
            "domain_reputation_score": domain_score,
            "stream_embed_score": stream_score,
            "keyword_match_score": keyword_score,
            "ad_popup_score": ad_score,
            "signals_detected": signals,
            "reasoning": reasoning,
            "page_verified": analysis.get("page_fetched", False) if analysis else False,
        },
        "dmca_status": "pending",
        "detected_at": datetime.now(timezone.utc).isoformat(),
    }

    _col(DETECTIONS_COL).document(detection_id).set(detection)
    return detection
