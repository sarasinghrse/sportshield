"""
PDQ Hashing — Meta's production-grade perceptual hash.

PDQ (Perceptual Distance Quantizer) is the algorithm Meta uses in production
to detect near-duplicate images across Facebook/Instagram at billion-scale.
It's far more robust than pHash against common piracy evasions:
  - Survives JPEG re-compression, resizing, mild cropping
  - Handles brightness/contrast changes, slight rotations
  - 256-bit hash → finer-grained similarity than 64-bit pHash

Replaces the imagehash pHash implementation from v1.
"""
import pdqhash
import numpy as np
from PIL import Image
import io


def compute_pdq(image_bytes: bytes) -> dict:
    """
    Compute Meta PDQ hash for an image.

    Returns:
        {
            "hash": "hex string (64 chars = 256 bits)",
            "quality": int (0-100, PDQ's internal quality score),
            "algorithm": "meta-pdq-256"
        }
    """
    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    img_array = np.array(img)

    # pdqhash returns (hash_vector, quality)
    hash_vector, quality = pdqhash.compute(img_array)

    # Convert boolean array to hex string
    hash_hex = _bits_to_hex(hash_vector)

    return {
        "hash": hash_hex,
        "quality": int(quality),
        "algorithm": "meta-pdq-256",
    }


def compare_pdq(hash1: str, hash2: str) -> dict:
    """
    Compare two PDQ hashes. Returns Hamming distance and similarity.

    PDQ uses 256 bits, so distance ranges 0-256.
    Thresholds (from Meta's documentation):
      - distance ≤ 31  → "near-duplicate" (same image, minor edits)
      - distance ≤ 63  → "similar" (heavier edits, crops, memes)
      - distance > 63  → "different"
    """
    bits1 = _hex_to_bits(hash1)
    bits2 = _hex_to_bits(hash2)

    distance = int(np.sum(bits1 != bits2))
    similarity = 1.0 - (distance / 256.0)

    if distance <= 31:
        verdict = "near-duplicate"
    elif distance <= 63:
        verdict = "similar"
    else:
        verdict = "different"

    return {
        "distance": distance,
        "similarity": round(similarity, 4),
        "verdict": verdict,
        "threshold_used": {"near_duplicate": 31, "similar": 63},
    }


def compute_pdq_from_pil(img: Image.Image) -> str:
    """Compute PDQ hash from a PIL Image. Returns hex string."""
    img_rgb = img.convert("RGB")
    img_array = np.array(img_rgb)
    hash_vector, _ = pdqhash.compute(img_array)
    return _bits_to_hex(hash_vector)


# ── Helpers ──────────────────────────────────────────────────────────────────

def _bits_to_hex(bit_array) -> str:
    """Convert a boolean/int bit array to hex string."""
    # pdqhash returns a numpy array of booleans (256 elements)
    bits = np.asarray(bit_array, dtype=np.uint8)
    # Pack 8 bits into each byte
    byte_array = np.packbits(bits)
    return byte_array.tobytes().hex()


def _hex_to_bits(hex_str: str) -> np.ndarray:
    """Convert hex string back to bit array."""
    byte_arr = bytes.fromhex(hex_str)
    return np.unpackbits(np.frombuffer(byte_arr, dtype=np.uint8))
