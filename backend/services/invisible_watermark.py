"""
S5 — Invisible Watermarking (LSB Steganography)

Embeds a hidden identifier (user ID, asset ID, timestamp) into the
least-significant bits of image pixels. The watermark is invisible to
the human eye but can be extracted to identify the source of a leak.

Uses LSB (Least Significant Bit) steganography — no external dependencies
beyond Pillow.
"""
from PIL import Image
import io
import json
import hashlib
from datetime import datetime, timezone

# Magic bytes to mark start/end of embedded data
MAGIC_START = "<<SS_WM:"
MAGIC_END = ":SS_WM>>"


def _text_to_bits(text: str) -> list[int]:
    """Convert text string to a list of bits."""
    bits = []
    for byte in text.encode("utf-8"):
        for i in range(7, -1, -1):
            bits.append((byte >> i) & 1)
    return bits


def _bits_to_text(bits: list[int]) -> str:
    """Convert a list of bits back to text string."""
    chars = []
    for i in range(0, len(bits), 8):
        byte = 0
        for bit in bits[i:i+8]:
            byte = (byte << 1) | bit
        chars.append(byte)
    return bytes(chars).decode("utf-8", errors="replace")


def embed_watermark(
    image_bytes: bytes,
    user_id: str,
    asset_id: str,
    extra: dict | None = None,
) -> bytes:
    """
    Embed an invisible watermark into an image using LSB steganography.

    The watermark payload includes:
      - user_id: who owns or received this copy
      - asset_id: which asset this is
      - timestamp: when the watermark was applied
      - checksum: integrity verification
      - extra: any additional metadata

    Returns watermarked image as PNG bytes (lossless to preserve LSB data).
    """
    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    pixels = list(img.getdata())
    width, height = img.size

    # Build payload
    payload = {
        "uid": user_id,
        "aid": asset_id,
        "ts": datetime.now(timezone.utc).isoformat(),
        "v": 1,
    }
    if extra:
        payload["x"] = extra

    # Add checksum for integrity verification
    payload_str = json.dumps(payload, separators=(",", ":"))
    checksum = hashlib.sha256(payload_str.encode()).hexdigest()[:8]
    full_message = f"{MAGIC_START}{payload_str}|{checksum}{MAGIC_END}"

    bits = _text_to_bits(full_message)

    # Check capacity (3 bits per pixel — one per R, G, B channel)
    capacity = len(pixels) * 3
    if len(bits) > capacity:
        raise ValueError(
            f"Image too small to embed watermark. "
            f"Need {len(bits)} bits, have {capacity} capacity."
        )

    # Embed bits into LSB of each color channel
    bit_idx = 0
    new_pixels = []
    for r, g, b in pixels:
        if bit_idx < len(bits):
            r = (r & 0xFE) | bits[bit_idx]
            bit_idx += 1
        if bit_idx < len(bits):
            g = (g & 0xFE) | bits[bit_idx]
            bit_idx += 1
        if bit_idx < len(bits):
            b = (b & 0xFE) | bits[bit_idx]
            bit_idx += 1
        new_pixels.append((r, g, b))

    # Create new image with embedded data
    wm_img = Image.new("RGB", (width, height))
    wm_img.putdata(new_pixels)

    buf = io.BytesIO()
    wm_img.save(buf, format="PNG")
    return buf.getvalue()


def extract_watermark(image_bytes: bytes) -> dict:
    """
    Extract the hidden watermark from an image.

    Returns:
    {
        "found": bool,
        "payload": dict | None,   # the embedded data if found
        "checksum_valid": bool,
        "error": str | None,
    }
    """
    try:
        img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        pixels = list(img.getdata())

        # Extract all LSBs
        bits = []
        for r, g, b in pixels:
            bits.append(r & 1)
            bits.append(g & 1)
            bits.append(b & 1)

        # Convert bits to text and look for magic markers
        # Process in chunks to avoid decoding entire image
        chunk_size = 8 * 1024  # 1KB at a time
        full_text = ""
        for i in range(0, min(len(bits), 8 * 10240), chunk_size):
            chunk_bits = bits[i:i + chunk_size]
            full_text += _bits_to_text(chunk_bits)
            # Check if we found the end marker
            if MAGIC_END in full_text:
                break

        # Find watermark
        start = full_text.find(MAGIC_START)
        end = full_text.find(MAGIC_END)

        if start == -1 or end == -1 or end <= start:
            return {"found": False, "payload": None, "checksum_valid": False, "error": None}

        inner = full_text[start + len(MAGIC_START):end]

        # Split payload and checksum
        pipe_idx = inner.rfind("|")
        if pipe_idx == -1:
            return {"found": True, "payload": None, "checksum_valid": False, "error": "Malformed watermark"}

        payload_str = inner[:pipe_idx]
        checksum = inner[pipe_idx + 1:]

        # Verify checksum
        expected = hashlib.sha256(payload_str.encode()).hexdigest()[:8]
        valid = checksum == expected

        try:
            payload = json.loads(payload_str)
        except json.JSONDecodeError:
            return {"found": True, "payload": None, "checksum_valid": False, "error": "Could not parse payload"}

        return {
            "found": True,
            "payload": payload,
            "checksum_valid": valid,
            "error": None,
        }

    except Exception as e:
        return {"found": False, "payload": None, "checksum_valid": False, "error": str(e)}
