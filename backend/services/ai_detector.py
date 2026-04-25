"""
AI-generated image detection using HuggingFace Inference API (free tier).
Model: Organika/sdxl-detector — classifies images as 'artificial' or 'natural'.
Requires HF_TOKEN env var (free at huggingface.co).
"""
import httpx

HF_MODEL_URL = "https://api-inference.huggingface.co/models/Organika/sdxl-detector"


def detect_ai_image(image_bytes: bytes, hf_token: str) -> dict:
    """
    Returns {is_ai: bool, confidence: float, label: str}
    Falls back gracefully if API is unavailable or token is missing.
    """
    if not hf_token:
        return {"is_ai": False, "confidence": 0.0, "label": "unknown", "error": "No HF_TOKEN set"}

    try:
        headers = {"Authorization": f"Bearer {hf_token}"}
        response = httpx.post(
            HF_MODEL_URL,
            content=image_bytes,
            headers=headers,
            timeout=30,
        )
        if response.status_code == 503:
            # Model is loading (cold start) — return unknown
            return {"is_ai": False, "confidence": 0.0, "label": "loading", "error": "Model warming up"}
        if response.status_code != 200:
            return {"is_ai": False, "confidence": 0.0, "label": "unknown", "error": f"API {response.status_code}"}

        results = response.json()
        if isinstance(results, list):
            for item in results:
                if item.get("label", "").lower() in ("artificial", "ai-generated", "fake"):
                    conf = float(item.get("score", 0))
                    return {"is_ai": conf >= 0.5, "confidence": round(conf, 3), "label": "AI-Generated"}
            # If we reach here, top label is 'natural'
            for item in results:
                if item.get("label", "").lower() in ("natural", "real"):
                    conf = float(item.get("score", 0))
                    return {"is_ai": False, "confidence": round(conf, 3), "label": "Authentic"}
        return {"is_ai": False, "confidence": 0.0, "label": "unknown"}
    except Exception as e:
        return {"is_ai": False, "confidence": 0.0, "label": "unknown", "error": str(e)}
