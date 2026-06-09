"""
Forensic Watermarking — DCT/DWT-domain invisible watermark.

Uses blind-watermark (DWT-DCT-SVD algorithm) which embeds data into the
frequency domain of the image. This is the same class of algorithm used by
Friend MTS, Irdeto, and other industry leaders for subscriber watermarking.

Why this beats LSB steganography:
  - Survives JPEG re-compression (LSB dies immediately)
  - Survives screenshots (the payload persists through screen capture)
  - Survives moderate cropping and resizing
  - Survives social media re-encoding (Instagram, Twitter compression)
  - Can embed ~200 bits reliably → enough for user + session + timestamp

Use case: embed a per-session payload into every copy of a protected asset.
When a leak surfaces, extract the watermark from even a screenshot →
identify the exact subscriber/session that leaked it.
"""
from blind_watermark import WaterMark
from PIL import Image
import numpy as np
import io
import json
import hashlib
import tempfile
import os
from datetime import datetime, timezone


def embed_forensic_watermark(
    image_bytes: bytes,
    user_id: str,
    asset_id: str,
    session_id: str = "",
    extra: dict | None = None,
) -> dict:
    """
    Embed a forensic watermark into an image using DWT-DCT-SVD.

    The payload includes user_id, asset_id, session_id, and timestamp,
    encoded as a compact bit string.

    Returns:
        {
            "watermarked_bytes": bytes (PNG),
            "payload_hash": str,
            "bits_embedded": int,
            "algorithm": "dwt-dct-svd",
            "session_id": str,
        }
    """
    # Build compact payload
    ts = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
    payload = {
        "u": user_id[:20],
        "a": asset_id[:12],
        "s": session_id[:12] if session_id else asset_id[:12],
        "t": ts,
    }
    if extra:
        payload["x"] = extra

    payload_str = json.dumps(payload, separators=(",", ":"))
    # Hash for verification
    payload_hash = hashlib.sha256(payload_str.encode()).hexdigest()[:16]
    # Prepend hash for integrity check on extraction
    full_payload = f"SS:{payload_hash}:{payload_str}"

    # Convert to bit array for blind_watermark
    wm_bits = _text_to_bits(full_payload)

    # Use temp files (blind_watermark works with file paths)
    tmp_in = tempfile.NamedTemporaryFile(suffix=".png", delete=False)
    tmp_out = tempfile.NamedTemporaryFile(suffix=".png", delete=False)
    try:
        # Save input image
        img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        # Ensure minimum size for watermark embedding
        min_size = 256
        if img.width < min_size or img.height < min_size:
            ratio = max(min_size / img.width, min_size / img.height)
            img = img.resize(
                (max(min_size, int(img.width * ratio)),
                 max(min_size, int(img.height * ratio))),
                Image.LANCZOS
            )
        img.save(tmp_in.name, format="PNG")
        tmp_in.close()
        tmp_out.close()

        # Embed watermark
        bwm = WaterMark(password_img=1, password_wm=1)
        bwm.read_img(tmp_in.name)
        bwm.read_wm(np.array(wm_bits), mode='bit')
        bwm.embed(tmp_out.name)

        # Read result
        with open(tmp_out.name, "rb") as f:
            watermarked_bytes = f.read()

        return {
            "watermarked_bytes": watermarked_bytes,
            "payload_hash": payload_hash,
            "bits_embedded": len(wm_bits),
            "payload_length": len(full_payload),
            "algorithm": "dwt-dct-svd",
            "session_id": session_id or asset_id[:12],
            "timestamp": ts,
        }

    finally:
        # Clean up temp files
        try:
            os.unlink(tmp_in.name)
        except OSError:
            pass
        try:
            os.unlink(tmp_out.name)
        except OSError:
            pass


def extract_forensic_watermark(
    image_bytes: bytes,
    expected_bits: int = 0,
    wm_shape: int = 0,
) -> dict:
    """
    Extract a forensic watermark from a (possibly re-compressed) image.

    Args:
        image_bytes: the suspect image
        expected_bits: number of bits that were embedded (stored in asset metadata)
        wm_shape: alias for expected_bits (backward compat)

    Returns:
        {
            "found": bool,
            "payload": dict | None,
            "payload_hash": str,
            "integrity_valid": bool,
            "algorithm": "dwt-dct-svd",
            "raw_text": str,
        }
    """
    num_bits = expected_bits or wm_shape
    if num_bits <= 0:
        # Default guess — enough for a typical payload
        num_bits = 800

    tmp_in = tempfile.NamedTemporaryFile(suffix=".png", delete=False)
    try:
        img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        img.save(tmp_in.name, format="PNG")
        tmp_in.close()

        bwm = WaterMark(password_img=1, password_wm=1)
        wm_extracted = bwm.extract(tmp_in.name, wm_shape=num_bits, mode='bit')

        # Convert bits back to text
        raw_text = _bits_to_text(wm_extracted)

        # Look for our marker
        if "SS:" not in raw_text:
            return {
                "found": False,
                "payload": None,
                "payload_hash": "",
                "integrity_valid": False,
                "algorithm": "dwt-dct-svd",
                "raw_text": raw_text[:100],
            }

        # Parse: SS:<hash>:<json>
        ss_start = raw_text.find("SS:")
        inner = raw_text[ss_start + 3:]

        colon1 = inner.find(":")
        if colon1 == -1:
            return {
                "found": True,
                "payload": None,
                "payload_hash": "",
                "integrity_valid": False,
                "algorithm": "dwt-dct-svd",
                "raw_text": raw_text[:200],
            }

        stored_hash = inner[:colon1]
        json_part = inner[colon1 + 1:]

        # Try to parse JSON (may have trailing garbage)
        payload = None
        integrity_valid = False
        try:
            # Find the end of JSON
            brace_count = 0
            end_idx = 0
            for i, ch in enumerate(json_part):
                if ch == '{':
                    brace_count += 1
                elif ch == '}':
                    brace_count -= 1
                    if brace_count == 0:
                        end_idx = i + 1
                        break

            clean_json = json_part[:end_idx] if end_idx > 0 else json_part
            payload = json.loads(clean_json)

            # Verify integrity
            check_hash = hashlib.sha256(clean_json.encode()).hexdigest()[:16]
            integrity_valid = (check_hash == stored_hash)

        except (json.JSONDecodeError, Exception):
            pass

        return {
            "found": True,
            "payload": payload,
            "payload_hash": stored_hash,
            "integrity_valid": integrity_valid,
            "algorithm": "dwt-dct-svd",
            "raw_text": raw_text[:200],
            "leaker_id": payload.get("u", "") if payload else "",
            "session_id": payload.get("s", "") if payload else "",
            "embed_time": payload.get("t", "") if payload else "",
        }

    except Exception as e:
        return {
            "found": False,
            "payload": None,
            "payload_hash": "",
            "integrity_valid": False,
            "algorithm": "dwt-dct-svd",
            "error": str(e),
        }
    finally:
        try:
            os.unlink(tmp_in.name)
        except OSError:
            pass


# ── Bit helpers ──────────────────────────────────────────────────────────────

def _text_to_bits(text: str) -> list[int]:
    """Convert text to list of 0/1 bits."""
    bits = []
    for byte in text.encode("utf-8"):
        for i in range(7, -1, -1):
            bits.append((byte >> i) & 1)
    return bits


def _bits_to_text(bits) -> str:
    """Convert bit array back to text."""
    bits = [int(b) for b in bits]  # numpy bool → int (no round())
    chars = []
    for i in range(0, len(bits) - 7, 8):
        byte = 0
        for bit in bits[i:i+8]:
            byte = (byte << 1) | (1 if bit else 0)
        if 32 <= byte <= 126 or byte in (10, 13):  # printable ASCII
            chars.append(chr(byte))
        elif byte == 0:
            break
    return "".join(chars)
