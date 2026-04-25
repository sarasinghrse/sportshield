import httpx
from services.fingerprint import compute_phash, compare_hashes

def scan_asset(original_phash, original_url, serpapi_key):
    try:
        params = {
            "engine": "google_reverse_image",
            "image_url": original_url,
            "api_key": serpapi_key
        }
        response = httpx.get("https://serpapi.com/search", params=params, timeout=10)
        data = response.json()
        candidates = data.get("image_results", [])[:10]
    except Exception:
        return []

    matches = []
    for candidate in candidates:
        thumbnail_url = candidate.get("thumbnail", "")
        if not thumbnail_url:
            continue
        try:
            thumb_response = httpx.get(thumbnail_url, timeout=5)
            found_phash = compute_phash(thumb_response.content)
            confidence = compare_hashes(original_phash, found_phash)
            if confidence >= 0.75:
                matches.append({
                    "found_url": candidate.get("link", ""),
                    "thumbnail_url": thumbnail_url,
                    "confidence": confidence,
                    "severity": "high" if confidence >= 0.9 else "medium"
                })
        except Exception:
            continue

    return matches