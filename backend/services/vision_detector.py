"""
Google Cloud Vision image analysis — optional backend for image authenticity.

Only used when AI_DETECTOR_BACKEND=vision. Cloud Vision is not a dedicated
"AI-generated" classifier, so we derive a synthetic-vs-authentic signal from
label detection (cartoon/illustration/render/cgi cues) plus SafeSearch's
"spoof" likelihood, and return the same dict shape as ai_detector.detect_ai_image.

The google-cloud-vision library is imported lazily so this module is safe to
import without the GCP libs installed.
"""

_SYNTHETIC_TERMS = (
    "cartoon", "illustration", "cgi", "animation", "anime", "drawing",
    "render", "rendering", "digital art", "graphics", "3d", "painting",
)


def detect_ai_image(image_bytes: bytes) -> dict:
    """Return {is_ai, confidence, label, ...} using Cloud Vision."""
    try:
        from google.cloud import vision  # lazy import
        client = vision.ImageAnnotatorClient()
        image = vision.Image(content=image_bytes)
        response = client.annotate_image({
            "image": image,
            "features": [
                {"type_": vision.Feature.Type.LABEL_DETECTION, "max_results": 12},
                {"type_": vision.Feature.Type.SAFE_SEARCH_DETECTION},
            ],
        })

        labels = [l.description.lower() for l in response.label_annotations]
        synthetic_hits = [l for l in labels if any(t in l for t in _SYNTHETIC_TERMS)]

        ss = response.safe_search_annotation
        spoof_name = vision.Likelihood(ss.spoof).name if ss else "UNKNOWN"
        spoofed = spoof_name in ("LIKELY", "VERY_LIKELY")

        is_ai = bool(synthetic_hits) or spoofed
        confidence = 0.85 if is_ai else 0.2

        return {
            "is_ai": is_ai,
            "confidence": round(confidence, 3),
            "label": "Likely synthetic" if is_ai else "Likely authentic",
            "labels": labels[:10],
            "spoof": spoof_name,
            "provider": "google_cloud_vision",
        }
    except Exception as e:
        return {"is_ai": False, "confidence": 0.0, "label": "unknown", "error": str(e)}
