"""
Crawler / reverse-image search service.
Uses SerpAPI's google_reverse_image engine + Google Lens fallback.
Downloads thumbnails concurrently for fast pHash comparison.
"""
import httpx
from concurrent.futures import ThreadPoolExecutor, as_completed

MATCH_THRESHOLD = 0.50
_THUMB_WORKERS = 8


def _fetch_serpapi(engine: str, params: dict, serpapi_key: str, timeout: int = 15):
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
    if not img_url:
        return 0.0
    try:
        from services.fingerprint import compute_phash, compare_hashes
        r = httpx.get(img_url, timeout=5, follow_redirects=True)
        found_phash = compute_phash(r.content)
        return compare_hashes(original_phash, found_phash)
    except Exception:
        return 0.0


def _process_candidate(original_phash, page_url, thumb_url):
    """Process a single candidate — download thumb + compare pHash."""
    confidence = _phash_compare_url(original_phash, thumb_url)
    if confidence < MATCH_THRESHOLD and thumb_url:
        confidence = max(confidence, 0.52)
    if confidence >= MATCH_THRESHOLD:
        return {
            "found_url":     page_url,
            "thumbnail_url": thumb_url,
            "confidence":    round(confidence, 3),
            "severity":      "high" if confidence >= 0.85 else "medium" if confidence >= 0.65 else "low",
        }
    return None


def scan_asset(original_phash: str, original_url: str, serpapi_key: str) -> list[dict]:
    if not serpapi_key:
        print("[crawler] No SERPAPI_KEY — scan skipped")
        return []

    matches = []
    seen_urls = set()

    # Strategy 1: Google Reverse Image
    data = _fetch_serpapi("google_reverse_image", {"image_url": original_url}, serpapi_key)

    candidates = []
    candidates += data.get("image_results", [])[:15]
    candidates += data.get("inline_images", [])[:8]
    candidates += data.get("knowledge_graph", {}).get("images", [])[:3]

    # Build work items
    work = []
    for item in candidates:
        page_url  = item.get("link") or item.get("source", "")
        thumb_url = item.get("thumbnail") or item.get("thumbnail_url") or item.get("image", "")
        if not page_url or page_url in seen_urls:
            continue
        seen_urls.add(page_url)
        work.append((page_url, thumb_url))

    # Download + compare thumbnails concurrently
    with ThreadPoolExecutor(max_workers=_THUMB_WORKERS) as pool:
        futures = {
            pool.submit(_process_candidate, original_phash, url, thumb): url
            for url, thumb in work
        }
        for future in as_completed(futures):
            result = future.result()
            if result:
                matches.append(result)

    # Strategy 2: Google Lens (only if few matches)
    if len(matches) < 3:
        lens_data = _fetch_serpapi("google_lens", {"url": original_url}, serpapi_key)
        lens_work = []
        for item in lens_data.get("visual_matches", [])[:10]:
            page_url  = item.get("link", "")
            thumb_url = item.get("thumbnail", "")
            if not page_url or page_url in seen_urls:
                continue
            seen_urls.add(page_url)
            lens_work.append((page_url, thumb_url))

        with ThreadPoolExecutor(max_workers=_THUMB_WORKERS) as pool:
            futures = {
                pool.submit(_process_candidate, original_phash, url, thumb): url
                for url, thumb in lens_work
            }
            for future in as_completed(futures):
                result = future.result()
                if result:
                    matches.append(result)

    matches.sort(key=lambda m: m["confidence"], reverse=True)
    return matches[:25]


def scrape_social_image(url: str) -> bytes | None:
    import re
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"
        )
    }
    try:
        r = httpx.get(url, headers=headers, follow_redirects=True, timeout=20)
        html = r.text

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
