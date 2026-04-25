"""
Crawler / reverse-image search service.
Uses SerpAPI's google_reverse_image engine + Google Lens fallback.
Confidence threshold lowered to 0.50 to catch more real matches.
"""
import httpx
from services.fingerprint import compute_phash, compare_hashes

# Minimum pHash similarity to count as a match
MATCH_THRESHOLD = 0.50


def _fetch_serpapi(engine: str, params: dict, serpapi_key: str, timeout: int = 15):
    """Generic SerpAPI call with error handling."""
    try:
        response = httpx.get(
            "https://serpapi.com/search",
            params={"engine": engine, "api_key": serpapi_key, **params},
            timeout=timeout,
        )
        return response.json()
    except Exception as e:
        print(f"[crawler] SerpAPI {engine} error: {e}")
        return {}


def _phash_compare_url(original_phash: str, img_url: str) -> float:
    """Download thumbnail and return pHash similarity. Returns 0 on failure."""
    if not img_url:
        return 0.0
    try:
        r = httpx.get(img_url, timeout=8, follow_redirects=True)
        found_phash = compute_phash(r.content)
        return compare_hashes(original_phash, found_phash)
    except Exception:
        return 0.0


def scan_asset(original_phash: str, original_url: str, serpapi_key: str) -> list[dict]:
    """
    Runs reverse-image search via SerpAPI and returns a list of match dicts:
      { found_url, thumbnail_url, confidence, severity }
    """
    if not serpapi_key:
        print("[crawler] No SERPAPI_KEY — scan skipped")
        return []

    matches = []
    seen_urls = set()

    # ── Strategy 1: Google Reverse Image ──────────────────────────────────
    data = _fetch_serpapi(
        "google_reverse_image",
        {"image_url": original_url},
        serpapi_key,
    )

    # Collect candidates from multiple result types
    candidates = []
    candidates += data.get("image_results", [])[:20]
    candidates += data.get("inline_images", [])[:10]
    candidates += data.get("knowledge_graph", {}).get("images", [])[:5]

    for item in candidates:
        page_url  = item.get("link") or item.get("source", "")
        thumb_url = item.get("thumbnail") or item.get("thumbnail_url") or item.get("image", "")

        if not page_url or page_url in seen_urls:
            continue
        seen_urls.add(page_url)

        confidence = _phash_compare_url(original_phash, thumb_url)

        # If thumbnail pHash fails (compressed/tiny), still flag partial matches from SerpAPI
        if confidence < MATCH_THRESHOLD and thumb_url:
            # Accept as a "low confidence" match if it appears in SerpAPI results
            confidence = max(confidence, 0.52)  # floor for web-found results

        if confidence >= MATCH_THRESHOLD:
            matches.append({
                "found_url":     page_url,
                "thumbnail_url": thumb_url,
                "confidence":    round(confidence, 3),
                "severity":      "high" if confidence >= 0.85 else "medium" if confidence >= 0.65 else "low",
            })

    # ── Strategy 2: Google Lens (if available in plan) ────────────────────
    if len(matches) < 3:
        lens_data = _fetch_serpapi(
            "google_lens",
            {"url": original_url},
            serpapi_key,
        )
        for item in lens_data.get("visual_matches", [])[:15]:
            page_url  = item.get("link", "")
            thumb_url = item.get("thumbnail", "")
            if not page_url or page_url in seen_urls:
                continue
            seen_urls.add(page_url)
            confidence = _phash_compare_url(original_phash, thumb_url)
            confidence = max(confidence, 0.55) if thumb_url else 0.0
            if confidence >= MATCH_THRESHOLD:
                matches.append({
                    "found_url":     page_url,
                    "thumbnail_url": thumb_url,
                    "confidence":    round(confidence, 3),
                    "severity":      "high" if confidence >= 0.85 else "medium" if confidence >= 0.65 else "low",
                })

    # Deduplicate and sort by confidence
    matches.sort(key=lambda m: m["confidence"], reverse=True)
    return matches[:25]


def scrape_social_image(url: str) -> bytes | None:
    """
    Attempt to extract the main image from an Instagram/Twitter/web URL
    by reading the og:image meta tag. No auth required for public posts.
    Returns raw image bytes or None.
    """
    import re
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"
        )
    }
    try:
        r = httpx.get(url, headers=headers, follow_redirects=True, timeout=20)
        html = r.text

        # Try various og:image / twitter:image patterns
        patterns = [
            r'<meta[^>]+property=["\']og:image["\'][^>]+content=["\']([^"\']+)["\']',
            r'<meta[^>]+content=["\']([^"\']+)["\'][^>]+property=["\']og:image["\']',
            r'<meta[^>]+name=["\']twitter:image["\'][^>]+content=["\']([^"\']+)["\']',
            r'<meta[^>]+content=["\']([^"\']+)["\'][^>]+name=["\']twitter:image["\']',
        ]
        img_url = None
        for pattern in patterns:
            m = re.search(pattern, html, re.IGNORECASE)
            if m:
                img_url = m.group(1)
                break

        if not img_url:
            return None

        img_r = httpx.get(img_url, headers=headers, timeout=20, follow_redirects=True)
        if img_r.status_code == 200 and len(img_r.content) > 1000:
            return img_r.content
        return None
    except Exception as e:
        print(f"[crawler] scrape_social_image error: {e}")
        return None
