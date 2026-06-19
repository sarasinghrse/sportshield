"""
S10 — Deepfake Detection

Uses HuggingFace Inference API with a deepfake-vs-real classifier.
Primary model: dima806/deepfake_vs_real_image_detection
Fallback model: umm-maybe/AI-image-detector (broader but less deepfake-specific)

Returns a structured result with deepfake probability, confidence, and
forensic analysis indicators.
"""
import httpx

PRIMARY_MODEL = "https://api-inference.huggingface.co/models/dima806/deepfake_vs_real_image_detection"
FALLBACK_MODEL = "https://api-inference.huggingface.co/models/umm-maybe/AI-image-detector"


def _query_model(model_url: str, image_bytes: bytes, hf_token: str) -> list | None:
    """Send image to a HuggingFace model and return raw results. One retry on 503."""
    import time
    headers = {"Authorization": f"Bearer {hf_token}"}
    for attempt in range(2):
        try:
            resp = httpx.post(
                model_url,
                content=image_bytes,
                headers=headers,
                timeout=15,
            )
            if resp.status_code == 503:
                if attempt == 0:
                    wait = min(resp.json().get("estimated_time", 10), 10)
                    print(f"[deepfake] Model loading, waiting {wait:.0f}s")
                    time.sleep(wait)
                    continue
                return None
            if resp.status_code != 200:
                print(f"[deepfake] API returned {resp.status_code}")
                return None
            data = resp.json()
            if isinstance(data, list):
                return data
            elif isinstance(data, dict) and "error" in data:
                print(f"[deepfake] API error: {data['error']}")
                return None
            return None
        except Exception as e:
            print(f"[deepfake] Request error (attempt {attempt+1}): {e}")
            if attempt == 0:
                time.sleep(2)
    return None


def detect_deepfake(image_bytes: bytes, hf_token: str) -> dict:
    """
    Analyse an image for deepfake manipulation.

    Returns:
    {
        "isDeepfake":    bool,
        "confidence":    float (0-1),
        "label":         str   ("Deepfake Detected" / "Authentic" / "Inconclusive"),
        "riskLevel":     str   ("critical" / "high" / "medium" / "low" / "none"),
        "model":         str   (which model produced the result),
        "forensics": {
            "faceManipulation":  float | None,
            "generativeAI":     float | None,
            "naturalImage":     float | None,
        },
        "error":         str | None,
    }
    """
    if not hf_token:
        return _empty_result("No HF_TOKEN configured")

    # Try primary deepfake model
    results = _query_model(PRIMARY_MODEL, image_bytes, hf_token)
    if results:
        parsed = _parse_deepfake_results(results, "dima806/deepfake_vs_real_image_detection")
        if parsed["label"] != "unknown":
            return parsed

    # Fallback to broader AI image detector
    results = _query_model(FALLBACK_MODEL, image_bytes, hf_token)
    if results:
        parsed = _parse_ai_detector_results(results, "umm-maybe/AI-image-detector")
        if parsed["label"] != "unknown":
            return parsed

    return _empty_result("Both models unavailable — try again in ~30s (cold start)")


def _parse_deepfake_results(results: list, model_name: str) -> dict:
    """Parse results from deepfake-specific classifier."""
    fake_score = 0.0
    real_score = 0.0

    for item in results:
        lbl = (item.get("label") or "").lower()
        score = float(item.get("score", 0))
        if lbl in ("fake", "deepfake", "manipulated", "synthetic"):
            fake_score = score
        elif lbl in ("real", "authentic", "natural", "original"):
            real_score = score

    # If neither label matched, try positional (some models return [label1, label2])
    if fake_score == 0 and real_score == 0 and len(results) >= 2:
        # Convention: first is dominant class
        top = results[0]
        lbl = (top.get("label") or "").lower()
        score = float(top.get("score", 0))
        if "fake" in lbl or "deep" in lbl:
            fake_score = score
            real_score = 1 - score
        else:
            real_score = score
            fake_score = 1 - score

    if fake_score == 0 and real_score == 0:
        return _empty_result(None)

    is_deepfake = fake_score > real_score
    confidence = max(fake_score, real_score)

    if is_deepfake:
        if confidence >= 0.9:
            risk = "critical"
        elif confidence >= 0.75:
            risk = "high"
        elif confidence >= 0.6:
            risk = "medium"
        else:
            risk = "low"
        label = "Deepfake Detected"
    else:
        risk = "none"
        label = "Authentic"

    return {
        "isDeepfake": is_deepfake,
        "confidence": round(confidence, 4),
        "label": label,
        "riskLevel": risk,
        "model": model_name,
        "forensics": {
            "faceManipulation": round(fake_score, 4) if is_deepfake else None,
            "generativeAI": None,
            "naturalImage": round(real_score, 4),
        },
        "error": None,
    }


def _parse_ai_detector_results(results: list, model_name: str) -> dict:
    """Parse results from the broader AI-image-detector as a deepfake fallback."""
    ai_score = 0.0
    human_score = 0.0

    for item in results:
        lbl = (item.get("label") or "").lower()
        score = float(item.get("score", 0))
        if lbl in ("artificial", "ai", "ai-generated", "fake"):
            ai_score = score
        elif lbl in ("human", "real", "natural"):
            human_score = score

    if ai_score == 0 and human_score == 0 and len(results) >= 2:
        top = results[0]
        lbl = (top.get("label") or "").lower()
        score = float(top.get("score", 0))
        if "artificial" in lbl or "ai" in lbl:
            ai_score = score
            human_score = 1 - score
        else:
            human_score = score
            ai_score = 1 - score

    if ai_score == 0 and human_score == 0:
        return _empty_result(None)

    is_ai = ai_score > human_score
    confidence = max(ai_score, human_score)

    if is_ai:
        risk = "high" if confidence >= 0.8 else "medium" if confidence >= 0.6 else "low"
        label = "Deepfake Detected" if confidence >= 0.75 else "Possibly Manipulated"
    else:
        risk = "none"
        label = "Authentic"

    return {
        "isDeepfake": is_ai and confidence >= 0.6,
        "confidence": round(confidence, 4),
        "label": label,
        "riskLevel": risk,
        "model": model_name,
        "forensics": {
            "faceManipulation": None,
            "generativeAI": round(ai_score, 4) if is_ai else None,
            "naturalImage": round(human_score, 4),
        },
        "error": None,
    }


def _empty_result(error: str | None) -> dict:
    return {
        "isDeepfake": False,
        "confidence": 0.0,
        "label": "unknown" if error else "Inconclusive",
        "riskLevel": "unknown",
        "model": None,
        "forensics": {
            "faceManipulation": None,
            "generativeAI": None,
            "naturalImage": None,
        },
        "error": error,
    }
