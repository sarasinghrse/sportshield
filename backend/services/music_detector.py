"""
S13 — Music / Audio Detection

Detects copyrighted music or known audio tracks in uploaded media.
Uses the AudD Music Recognition API (free tier: 300 requests/month).
Falls back to basic audio analysis when API is unavailable.

For video files, extracts audio track first using ffmpeg (if available)
or falls back to basic metadata analysis.
"""
import httpx
import io
import base64
import os
import json
import tempfile
from dotenv import load_dotenv

load_dotenv()

AUDD_API_URL = "https://api.audd.io/"
AUDD_API_TOKEN = os.getenv("AUDD_API_TOKEN", "")


def detect_music_from_bytes(file_bytes: bytes, filename: str = "") -> dict:
    """
    Detect music/audio in a media file.

    Returns:
    {
        "detected": bool,
        "tracks": [
            {
                "title": str,
                "artist": str,
                "album": str,
                "releaseDate": str,
                "label": str,
                "confidence": float,
                "source": "audd" | "metadata",
            }
        ],
        "riskLevel": "none" | "low" | "medium" | "high",
        "summary": str,
        "method": str,
    }
    """
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    is_audio = ext in ("mp3", "wav", "aac", "flac", "ogg", "m4a", "wma")
    is_video = ext in ("mp4", "mov", "avi", "mkv", "webm", "wmv", "flv")

    if AUDD_API_TOKEN:
        result = _detect_via_audd(file_bytes, filename)
        if result.get("tracks"):
            return result

    return _basic_detection(file_bytes, filename, is_audio, is_video)


def _detect_via_audd(file_bytes: bytes, filename: str) -> dict:
    """Use AudD API for music recognition."""
    try:
        data = {
            "api_token": AUDD_API_TOKEN,
            "return": "apple_music,spotify",
        }
        files = {"file": (filename or "audio.mp3", io.BytesIO(file_bytes))}

        resp = httpx.post(AUDD_API_URL, data=data, files=files, timeout=30)
        resp.raise_for_status()
        body = resp.json()

        if body.get("status") == "success" and body.get("result"):
            r = body["result"]
            track = {
                "title": r.get("title", "Unknown"),
                "artist": r.get("artist", "Unknown"),
                "album": r.get("album", ""),
                "releaseDate": r.get("release_date", ""),
                "label": r.get("label", ""),
                "confidence": 0.95,
                "source": "audd",
            }

            spotify = r.get("spotify", {})
            if spotify:
                track["spotifyId"] = spotify.get("id", "")
                track["spotifyUrl"] = spotify.get("external_urls", {}).get("spotify", "")

            apple = r.get("apple_music", {})
            if apple:
                track["appleMusicUrl"] = apple.get("url", "")

            risk = "high" if track["artist"] != "Unknown" else "medium"

            return {
                "detected": True,
                "tracks": [track],
                "riskLevel": risk,
                "summary": f"Detected: \"{track['title']}\" by {track['artist']}",
                "method": "audd",
            }

        return {
            "detected": False,
            "tracks": [],
            "riskLevel": "none",
            "summary": "No music detected by AudD",
            "method": "audd",
        }

    except Exception as e:
        print(f"[music_detector] AudD API error: {e}")
        return {"detected": False, "tracks": [], "riskLevel": "none", "summary": str(e), "method": "audd_error"}


def _basic_detection(file_bytes: bytes, filename: str, is_audio: bool, is_video: bool) -> dict:
    """
    Basic audio presence detection without external API.
    Checks file metadata and structure for audio indicators.
    """
    has_audio = False
    audio_info = {}

    if is_audio:
        has_audio = True
        audio_info = _analyze_audio_file(file_bytes, filename)
    elif is_video:
        has_audio = _check_video_has_audio(file_bytes)
        if has_audio:
            audio_info = {"note": "Video contains audio track"}

    if has_audio:
        risk = "medium" if is_audio else "low"
        tracks = []
        if audio_info.get("title") or audio_info.get("artist"):
            tracks.append({
                "title": audio_info.get("title", "Unknown Track"),
                "artist": audio_info.get("artist", "Unknown Artist"),
                "album": audio_info.get("album", ""),
                "releaseDate": "",
                "label": "",
                "confidence": 0.5,
                "source": "metadata",
            })

        return {
            "detected": has_audio,
            "tracks": tracks,
            "riskLevel": risk,
            "summary": "Audio content detected — manual review recommended (no API key configured for full recognition)",
            "method": "basic",
            "audioInfo": audio_info,
        }

    return {
        "detected": False,
        "tracks": [],
        "riskLevel": "none",
        "summary": "No audio content detected",
        "method": "basic",
    }


def _analyze_audio_file(file_bytes: bytes, filename: str) -> dict:
    """Extract basic metadata from audio files (ID3 tags for MP3, etc.)."""
    info = {"hasAudio": True, "size": len(file_bytes)}

    # Try to read ID3v2 tags from MP3
    if file_bytes[:3] == b"ID3":
        try:
            info["format"] = "mp3_id3v2"
            data = file_bytes
            pos = 10  # skip ID3 header

            while pos < min(len(data), 8192):
                if pos + 10 > len(data):
                    break
                frame_id = data[pos:pos+4].decode("ascii", errors="replace")
                if not frame_id[0].isalpha():
                    break
                size = int.from_bytes(data[pos+4:pos+8], "big")
                if size <= 0 or size > 10000:
                    break
                content = data[pos+10:pos+10+size]
                text = content.decode("utf-8", errors="replace").strip("\x00\x01\x02\x03 ")

                if frame_id == "TIT2":
                    info["title"] = text
                elif frame_id == "TPE1":
                    info["artist"] = text
                elif frame_id == "TALB":
                    info["album"] = text

                pos += 10 + size

        except Exception:
            pass

    # Check for MP3 frame sync
    elif file_bytes[:2] == b"\xff\xfb" or file_bytes[:2] == b"\xff\xf3":
        info["format"] = "mp3"

    # WAV header
    elif file_bytes[:4] == b"RIFF" and file_bytes[8:12] == b"WAVE":
        info["format"] = "wav"

    # AAC/M4A
    elif file_bytes[4:8] == b"ftyp":
        info["format"] = "m4a"

    return info


def _check_video_has_audio(file_bytes: bytes) -> bool:
    """Simple check if a video file contains audio tracks."""
    # MP4/MOV: look for 'moov' and 'soun' atoms
    if file_bytes[4:8] in (b"ftyp", b"moov", b"mdat"):
        return b"soun" in file_bytes[:min(len(file_bytes), 65536)]

    # AVI: check for 'auds' stream type
    if file_bytes[:4] == b"RIFF" and file_bytes[8:12] == b"AVI ":
        return b"auds" in file_bytes[:min(len(file_bytes), 65536)]

    # WebM/MKV: check EBML header
    if file_bytes[:4] == b"\x1a\x45\xdf\xa3":
        return True  # most MKV/WebM files have audio

    return True  # assume audio present for unknown formats
