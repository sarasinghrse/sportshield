"""
Live Stream Piracy Radar — the core orchestrator.

This is the brain of Phase 2. It coordinates:
  1. Reference ingestion (official broadcast fingerprint + metadata)
  2. Suspect stream sampling (extract frames + audio from suspect URLs/files)
  3. Rolling audio fingerprint matching (detect pirate re-streams)
  4. Visual frame comparison (PDQ hash + CLIP similarity)
  5. Multimodal confirmation (OCR + logo + commentary)
  6. Detection creation (Firestore alerts with full evidence chain)
"""
import io
import os
import hashlib
import uuid
from datetime import datetime, timezone
from PIL import Image

from services.audio_fingerprint import fingerprint_audio, compare_fingerprints, extract_audio_bytes
from services.multimodal_confirm import confirm_match
from services.firebase_client import db

# Optional imports for visual matching
try:
    from services.pdq_hasher import compute_pdq_from_pil, compare_pdq
    HAS_PDQ = True
except ImportError:
    HAS_PDQ = False

try:
    from services.clip_search import get_clip_embedding
    HAS_CLIP = True
except ImportError:
    HAS_CLIP = False


# ── Firestore collections ──────────────────────────────────────────────

EVENTS_COL = "radar_events"
DETECTIONS_COL = "radar_detections"
SUSPECTS_COL = "radar_suspects"


def _col(name):
    return db.collection(name)


def create_event(
    event_name: str,
    teams: list[str],
    broadcaster: str = "",
    league: str = "",
    user_id: str = "demo_user",
) -> dict:
    event_id = f"evt_{uuid.uuid4().hex[:12]}"

    event = {
        "event_id": event_id,
        "event_name": event_name,
        "teams": teams,
        "broadcaster": broadcaster,
        "league": league,
        "user_id": user_id,
        "status": "monitoring",
        "reference_fingerprints": [],
        "reference_frame_hashes": [],
        "suspect_count": 0,
        "detection_count": 0,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }

    _col(EVENTS_COL).document(event_id).set(event)
    return event


def get_event(event_id: str) -> dict | None:
    doc = _col(EVENTS_COL).document(event_id).get()
    return doc.to_dict() if doc.exists else None


def list_events(user_id: str = "demo_user") -> list[dict]:
    docs = _col(EVENTS_COL).where("user_id", "==", user_id).stream()
    return [
        {k: v for k, v in d.to_dict().items() if k not in ("reference_fingerprints", "reference_frame_hashes")}
        for d in docs
    ]


def ingest_reference(event_id: str, file_bytes: bytes, filename: str = "") -> dict:
    event = get_event(event_id)
    if not event:
        return {"error": f"Event {event_id} not found"}

    result = {"event_id": event_id, "filename": filename}

    # ── Audio fingerprint ──
    audio_fp = fingerprint_audio(file_bytes, filename)
    if audio_fp.get("fingerprint"):
        event["reference_fingerprints"].append(audio_fp)
        result["audio"] = {
            "fingerprint": audio_fp["fingerprint"][:16] + "...",
            "duration": audio_fp.get("duration", 0),
            "segments": audio_fp.get("segment_count", 0),
        }

    # ── Visual frame hashes ──
    frames = _extract_frames(file_bytes)
    frame_hashes = []
    for i, frame_bytes in enumerate(frames[:10]):
        try:
            img = Image.open(io.BytesIO(frame_bytes))
            if HAS_PDQ:
                pdq_result = compute_pdq_from_pil(img)
                if pdq_result.get("hash"):
                    frame_hashes.append({
                        "frame_index": i,
                        "pdq_hash": pdq_result["hash"],
                        "quality": pdq_result.get("quality", 0),
                    })
        except Exception:
            continue

    if frame_hashes:
        event["reference_frame_hashes"].extend(frame_hashes)
        result["frames"] = {
            "extracted": len(frames),
            "hashed": len(frame_hashes),
        }

    event["updated_at"] = datetime.now(timezone.utc).isoformat()
    _col(EVENTS_COL).document(event_id).set(event)

    result["status"] = "ingested"
    return result


def analyze_suspect(
    event_id: str,
    file_bytes: bytes,
    source_url: str = "",
    filename: str = "",
) -> dict:
    event = get_event(event_id)
    if not event:
        return {"error": f"Event {event_id} not found"}

    suspect_id = f"sus_{uuid.uuid4().hex[:12]}"

    result = {
        "suspect_id": suspect_id,
        "event_id": event_id,
        "source_url": source_url,
        "filename": filename,
        "analyzed_at": datetime.now(timezone.utc).isoformat(),
    }

    # ── 1. Audio Fingerprint Match ──
    audio_match = {"match": False, "score": 0}
    suspect_audio_fp = fingerprint_audio(file_bytes, filename)

    if suspect_audio_fp.get("fingerprint"):
        result["audio_fingerprint"] = suspect_audio_fp["fingerprint"][:16] + "..."

        best_audio = {"match": False, "score": 0}
        for ref_fp in event.get("reference_fingerprints", []):
            comparison = compare_fingerprints(ref_fp, suspect_audio_fp)
            if comparison.get("score", 0) > best_audio.get("score", 0):
                best_audio = comparison

        audio_match = best_audio
        result["audio_match"] = {
            "match": audio_match.get("match", False),
            "score": audio_match.get("score", 0),
            "verdict": audio_match.get("verdict", "no-match"),
            "time_offset_sec": audio_match.get("time_offset_sec", 0),
        }

    # ── 2. Visual Frame Match ──
    visual_match = {"match": False, "score": 0}
    suspect_frames = _extract_frames(file_bytes)

    if suspect_frames and event.get("reference_frame_hashes"):
        matched_frames = 0
        total_compared = 0

        for frame_bytes_item in suspect_frames[:5]:
            try:
                img = Image.open(io.BytesIO(frame_bytes_item))
                if HAS_PDQ:
                    suspect_pdq = compute_pdq_from_pil(img)
                    if suspect_pdq.get("hash"):
                        for ref_hash in event["reference_frame_hashes"]:
                            cmp = compare_pdq(suspect_pdq["hash"], ref_hash["pdq_hash"])
                            total_compared += 1
                            if cmp.get("distance", 999) < 64:
                                matched_frames += 1
                                break
            except Exception:
                continue

        if total_compared > 0:
            vs = matched_frames / min(len(suspect_frames[:5]), len(event["reference_frame_hashes"]))
            visual_match = {
                "match": vs > 0.3,
                "score": round(vs, 4),
                "matched_frames": matched_frames,
                "total_compared": total_compared,
            }

        result["visual_match"] = visual_match

    # ── 3. Multimodal Confirmation ──
    should_confirm = (
        audio_match.get("score", 0) > 0.3 or
        visual_match.get("score", 0) > 0.2
    )

    if should_confirm:
        audio_wav = extract_audio_bytes(file_bytes, max_seconds=30)

        reference_info = {
            "event_name": event["event_name"],
            "teams": event.get("teams", []),
            "broadcaster": event.get("broadcaster", ""),
            "league_logo_keywords": [event.get("league", ""), event.get("broadcaster", "")],
        }

        confirmation = confirm_match(
            suspect_frames=suspect_frames[:5],
            suspect_audio_bytes=audio_wav,
            reference_info=reference_info,
        )
        result["multimodal"] = confirmation
    else:
        result["multimodal"] = {"confirmed": False, "signals": 0, "skipped": True}

    # ── 4. Aggregate Score & Create Detection ──
    audio_score = audio_match.get("score", 0)
    visual_score = visual_match.get("score", 0)
    multimodal_score = result["multimodal"].get("composite_score", 0)

    composite = (audio_score * 0.5) + (visual_score * 0.3) + (multimodal_score * 0.2)

    is_pirate = (
        composite > 0.5 or
        (audio_match.get("match") and result["multimodal"].get("confirmed")) or
        (audio_score > 0.7) or
        (visual_score > 0.6 and result["multimodal"].get("confirmed"))
    )

    result["composite_score"] = round(composite, 4)
    result["is_pirate"] = is_pirate

    if is_pirate:
        result["verdict"] = "PIRATE_STREAM_DETECTED"
        result["confidence"] = "high" if composite > 0.7 else "medium"
    elif composite > 0.3:
        result["verdict"] = "SUSPICIOUS"
        result["confidence"] = "low"
    else:
        result["verdict"] = "CLEAN"
        result["confidence"] = "none"

    # Store suspect in Firestore
    _col(SUSPECTS_COL).document(suspect_id).set(result)

    # Update event counters
    event["suspect_count"] = event.get("suspect_count", 0) + 1

    if is_pirate:
        detection = _create_detection(event, result, source_url)
        result["detection_id"] = detection["detection_id"]
        event["detection_count"] = event.get("detection_count", 0) + 1

    event["updated_at"] = datetime.now(timezone.utc).isoformat()
    _col(EVENTS_COL).document(event_id).set(event)

    return result


def get_detections(event_id: str = None, user_id: str = "demo_user") -> list[dict]:
    query = _col(DETECTIONS_COL).where("user_id", "==", user_id)
    if event_id:
        query = query.where("event_id", "==", event_id)
    docs = query.stream()
    results = [d.to_dict() for d in docs]
    return sorted(results, key=lambda x: x.get("detected_at", ""), reverse=True)


def get_suspect(suspect_id: str) -> dict | None:
    doc = _col(SUSPECTS_COL).document(suspect_id).get()
    return doc.to_dict() if doc.exists else None


def get_radar_stats(user_id: str = "demo_user") -> dict:
    events = list(_col(EVENTS_COL).where("user_id", "==", user_id).stream())
    event_dicts = [e.to_dict() for e in events]
    detections = list(_col(DETECTIONS_COL).where("user_id", "==", user_id).stream())
    det_dicts = [d.to_dict() for d in detections]

    return {
        "active_events": len([e for e in event_dicts if e.get("status") == "monitoring"]),
        "total_events": len(event_dicts),
        "total_suspects_analyzed": sum(e.get("suspect_count", 0) for e in event_dicts),
        "total_detections": len(det_dicts),
        "pirate_streams_found": len([d for d in det_dicts if d.get("verdict", "").upper() in ("PIRATE_STREAM_DETECTED", "CONFIRMED_PIRATE", "LIKELY_PIRATE")]),
        "engine_status": "active",
        "capabilities": {
            "audio_fingerprint": True,
            "visual_pdq": HAS_PDQ,
            "clip_semantic": HAS_CLIP,
            "ocr_scoreboard": True,
            "whisper_commentary": True,
            "logo_detection": True,
        },
    }


def stop_event(event_id: str) -> dict:
    event = get_event(event_id)
    if not event:
        return {"error": f"Event {event_id} not found"}
    _col(EVENTS_COL).document(event_id).update({
        "status": "stopped",
        "updated_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"event_id": event_id, "status": "stopped"}


# ── Internal helpers ────────────────────────────────────────────────────

def _create_detection(event: dict, suspect_result: dict, source_url: str) -> dict:
    detection_id = f"det_{uuid.uuid4().hex[:12]}"

    detection = {
        "detection_id": detection_id,
        "event_id": event["event_id"],
        "event_name": event["event_name"],
        "user_id": event["user_id"],
        "source_url": source_url,
        "suspect_id": suspect_result.get("suspect_id"),
        "composite_score": suspect_result.get("composite_score", 0),
        "confidence": suspect_result.get("confidence", "unknown"),
        "verdict": suspect_result.get("verdict"),
        "audio_score": suspect_result.get("audio_match", {}).get("score", 0),
        "visual_score": suspect_result.get("visual_match", {}).get("score", 0),
        "multimodal_signals": suspect_result.get("multimodal", {}).get("signals", 0),
        "time_offset_sec": suspect_result.get("audio_match", {}).get("time_offset_sec", 0),
        "dmca_status": "pending",
        "detected_at": datetime.now(timezone.utc).isoformat(),
    }

    _col(DETECTIONS_COL).document(detection_id).set(detection)
    return detection


def _extract_frames(file_bytes: bytes, max_frames: int = 10) -> list[bytes]:
    try:
        import av

        container = av.open(io.BytesIO(file_bytes))
        video_stream = None
        for stream in container.streams:
            if stream.type == 'video':
                video_stream = stream
                break

        if video_stream is None:
            try:
                img = Image.open(io.BytesIO(file_bytes))
                buf = io.BytesIO()
                img.save(buf, format="PNG")
                return [buf.getvalue()]
            except Exception:
                return []

        frames = []
        total_frames = video_stream.frames or 100
        interval = max(1, total_frames // max_frames)

        for i, frame in enumerate(container.decode(video=0)):
            if i % interval == 0:
                img = frame.to_image()
                buf = io.BytesIO()
                img.save(buf, format="PNG")
                frames.append(buf.getvalue())
                if len(frames) >= max_frames:
                    break

        container.close()
        return frames

    except Exception:
        try:
            img = Image.open(io.BytesIO(file_bytes))
            buf = io.BytesIO()
            img.save(buf, format="PNG")
            return [buf.getvalue()]
        except Exception:
            return []
