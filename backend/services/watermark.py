"""
Dynamic Visible Watermarking — SportShield
==========================================
Overlays user-identifying text (email, timestamp, session/asset ID) onto an
image so that any screenshot or download is traceable back to its recipient.

Usage
-----
from services.watermark import apply_visible_watermark

watermarked_bytes = apply_visible_watermark(
    image_bytes,
    user_email="john@example.com",
    session_id="sess_abc123",
    asset_id="uuid-here",          # optional extra tag
)

Design choices
--------------
- Two layers: a semi-transparent diagonal tile across the full image, plus a
  solid footer bar at the bottom with the same info — survives heavy cropping.
- Text is white with a dark shadow so it's readable on any background colour.
- Opacity is kept low enough to not ruin the content but high enough to survive
  JPEG re-compression and light editing (Instagram filters, etc.).
"""

from PIL import Image, ImageDraw, ImageFont
import io
import math
from datetime import datetime, timezone


# ── Constants ──────────────────────────────────────────────────────────────────

TILE_OPACITY   = 55    # 0-255; diagonal tile layer (subtle)
FOOTER_OPACITY = 180   # footer bar (more visible, harder to crop away)
FONT_SIZE_TILE = None  # computed dynamically from image size
FONT_SIZE_FOOT = None  # computed dynamically from image size


def _load_font(size: int):
    """Try to load a clean sans-serif font; fall back to Pillow default."""
    font_candidates = [
        "DejaVuSans-Bold.ttf",
        "Arial.ttf",
        "LiberationSans-Bold.ttf",
        "FreeSansBold.ttf",
    ]
    for name in font_candidates:
        try:
            return ImageFont.truetype(name, size)
        except (IOError, OSError):
            continue
    # Pillow built-in bitmap font — always available
    return ImageFont.load_default()


def _draw_text_with_shadow(draw: ImageDraw, x: float, y: float, text: str,
                            font, fill=(255, 255, 255, 220),
                            shadow=(0, 0, 0, 160), offset=2):
    """Draw text with a drop-shadow for readability on any background."""
    draw.text((x + offset, y + offset), text, font=font, fill=shadow)
    draw.text((x, y), text, font=font, fill=fill)


def apply_visible_watermark(
    image_bytes: bytes,
    user_email: str = "",
    session_id: str = "",
    asset_id: str = "",
) -> bytes:
    """
    Apply a dynamic visible watermark to *image_bytes* and return the result
    as JPEG bytes.

    Parameters
    ----------
    image_bytes : raw image bytes (any PIL-readable format)
    user_email  : recipient email address
    session_id  : session or download-token identifier
    asset_id    : original asset UUID for additional traceability

    Returns
    -------
    bytes : watermarked JPEG image
    """
    # ── Open and normalise image ───────────────────────────────────────────────
    img = Image.open(io.BytesIO(image_bytes)).convert("RGBA")
    w, h = img.size

    # ── Build watermark text lines ─────────────────────────────────────────────
    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    lines = []
    if user_email:
        lines.append(user_email)
    lines.append(timestamp)
    if session_id:
        lines.append(f"Session: {session_id[:16]}")
    if asset_id:
        lines.append(f"Asset: {asset_id[:8]}")

    label = "  |  ".join(lines)          # single-line for footer
    tile_text = "\n".join(lines)         # multi-line for diagonal tile

    # ── Font sizes relative to image dimensions ────────────────────────────────
    tile_font_size = max(12, min(w, h) // 35)
    foot_font_size = max(12, min(w, h) // 45)
    tile_font = _load_font(tile_font_size)
    foot_font = _load_font(foot_font_size)

    # ── Layer 1: diagonal tiled overlay ───────────────────────────────────────
    tile_layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    tile_draw  = ImageDraw.Draw(tile_layer)

    # Measure tile block size
    bbox = tile_draw.multiline_textbbox((0, 0), tile_text, font=tile_font,
                                        spacing=6)
    tile_w = bbox[2] - bbox[0] + 40
    tile_h = bbox[3] - bbox[1] + 40

    # Tile across entire image at 45° using an oversized rotated canvas
    diag = int(math.ceil(math.sqrt(w * w + h * h)))
    rot_canvas = Image.new("RGBA", (diag * 2, diag * 2), (0, 0, 0, 0))
    rot_draw   = ImageDraw.Draw(rot_canvas)

    for row in range(-1, diag * 2 // tile_h + 2):
        for col in range(-1, diag * 2 // tile_w + 2):
            x_pos = col * tile_w
            y_pos = row * tile_h
            rot_draw.multiline_text(
                (x_pos, y_pos), tile_text, font=tile_font,
                fill=(255, 255, 255, TILE_OPACITY), spacing=6,
            )
            # subtle shadow
            rot_draw.multiline_text(
                (x_pos + 1, y_pos + 1), tile_text, font=tile_font,
                fill=(0, 0, 0, TILE_OPACITY // 2), spacing=6,
            )

    rot_canvas = rot_canvas.rotate(30, resample=Image.BICUBIC, expand=False)
    # Crop centre to match image size
    cx = (rot_canvas.width  - w) // 2
    cy = (rot_canvas.height - h) // 2
    tile_layer = rot_canvas.crop((cx, cy, cx + w, cy + h))

    img = Image.alpha_composite(img, tile_layer)

    # ── Layer 2: footer bar ────────────────────────────────────────────────────
    footer_h = foot_font_size + 16
    footer   = Image.new("RGBA", (w, footer_h), (0, 0, 0, FOOTER_OPACITY))
    fd       = ImageDraw.Draw(footer)

    # Measure text width to centre it
    fb = fd.textbbox((0, 0), label, font=foot_font)
    text_w = fb[2] - fb[0]
    tx = max(8, (w - text_w) // 2)
    ty = (footer_h - (fb[3] - fb[1])) // 2

    _draw_text_with_shadow(fd, tx, ty, label, foot_font,
                           fill=(255, 255, 255, 230),
                           shadow=(0, 0, 0, 180))

    # Paste footer at bottom of image
    img.paste(footer, (0, h - footer_h), footer)

    # ── Convert back to JPEG bytes ─────────────────────────────────────────────
    out = io.BytesIO()
    img.convert("RGB").save(out, format="JPEG", quality=90)
    return out.getvalue()
