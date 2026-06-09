"""
S8 — Content Propagation Tracking

Analyses scan results to build a spread-path timeline for each asset.
Shows how content propagates across the web: which domains picked it up,
when it was first detected, and how quickly it spread.
"""
from urllib.parse import urlparse
from datetime import datetime, timezone
from services.firebase_client import db


def extract_domain(url: str) -> str:
    """Return the clean domain from a URL."""
    try:
        parsed = urlparse(url if "://" in url else f"https://{url}")
        host = parsed.hostname or ""
        return host.removeprefix("www.")
    except Exception:
        return url


def categorize_platform(domain: str) -> dict:
    """Categorize a domain into platform type and return metadata."""
    social = {
        "instagram.com": {"type": "social", "platform": "Instagram", "icon": "instagram"},
        "twitter.com":   {"type": "social", "platform": "Twitter/X", "icon": "twitter"},
        "x.com":         {"type": "social", "platform": "Twitter/X", "icon": "twitter"},
        "facebook.com":  {"type": "social", "platform": "Facebook",  "icon": "facebook"},
        "tiktok.com":    {"type": "social", "platform": "TikTok",    "icon": "tiktok"},
        "youtube.com":   {"type": "video",  "platform": "YouTube",   "icon": "youtube"},
        "reddit.com":    {"type": "forum",  "platform": "Reddit",    "icon": "reddit"},
        "pinterest.com": {"type": "social", "platform": "Pinterest", "icon": "pinterest"},
        "tumblr.com":    {"type": "social", "platform": "Tumblr",    "icon": "tumblr"},
        "linkedin.com":  {"type": "social", "platform": "LinkedIn",  "icon": "linkedin"},
        "flickr.com":    {"type": "media",  "platform": "Flickr",    "icon": "flickr"},
    }

    news = ["espn.com", "bbc.com", "bbc.co.uk", "cnn.com", "reuters.com",
            "skysports.com", "goal.com", "bleacherreport.com", "marca.com",
            "theguardian.com", "nytimes.com", "washingtonpost.com"]

    ecommerce = ["ebay.com", "amazon.com", "etsy.com", "alibaba.com",
                 "redbubble.com", "teespring.com", "shopify.com"]

    for key, meta in social.items():
        if domain.endswith(key):
            return meta

    for d in news:
        if domain.endswith(d):
            return {"type": "news", "platform": domain.split(".")[0].title(), "icon": "news"}

    for d in ecommerce:
        if domain.endswith(d):
            return {"type": "ecommerce", "platform": domain.split(".")[0].title(), "icon": "shop"}

    return {"type": "website", "platform": domain, "icon": "globe"}


def build_propagation_data(asset_id: str) -> dict:
    """
    Build propagation timeline from scan results for an asset.

    Returns:
    {
      "assetId": str,
      "totalNodes": int,
      "uniqueDomains": int,
      "platformBreakdown": { "social": 2, "news": 1, ... },
      "timeline": [
        {
          "id": str,
          "domain": str,
          "url": str,
          "platform": { type, platform, icon },
          "confidence": float,
          "classification": str,
          "firstSeenAt": str (ISO),
          "severity": str,
          "order": int,   # detection order
        }, ...
      ],
      "spreadSpeed": str,       # "rapid" / "moderate" / "slow" / "none"
      "domainGraph": [          # edges for a simple domain-to-domain graph
        { "from": "original", "to": "domain1" },
        { "from": "domain1",  "to": "domain2" }, ...
      ]
    }
    """

    # Fetch all scan results for this asset
    results_ref = (
        db.collection("scan_results")
        .where("assetId", "==", asset_id)
        .order_by("scannedAt")
    )
    docs = list(results_ref.stream())

    if not docs:
        return {
            "assetId": asset_id,
            "totalNodes": 0,
            "uniqueDomains": 0,
            "platformBreakdown": {},
            "timeline": [],
            "spreadSpeed": "none",
            "domainGraph": [],
        }

    timeline = []
    domain_set = set()
    platform_counts = {}

    for i, doc in enumerate(docs):
        data = doc.to_dict()
        url = data.get("foundUrl", "")
        domain = data.get("domain") or extract_domain(url)
        platform = categorize_platform(domain)

        scanned = data.get("firstSeenAt") or data.get("scannedAt")
        if hasattr(scanned, "isoformat"):
            ts = scanned.isoformat()
        elif hasattr(scanned, "timestamp"):
            # Firestore DatetimeWithNanoseconds
            ts = scanned.isoformat() if hasattr(scanned, "isoformat") else str(scanned)
        else:
            ts = datetime.now(timezone.utc).isoformat()

        domain_set.add(domain)
        ptype = platform["type"]
        platform_counts[ptype] = platform_counts.get(ptype, 0) + 1

        timeline.append({
            "id": doc.id,
            "domain": domain,
            "url": url,
            "platform": platform,
            "confidence": data.get("confidence", 0),
            "classification": data.get("classification", "unknown"),
            "firstSeenAt": ts,
            "severity": data.get("severity", "low"),
            "order": i + 1,
        })

    # Determine spread speed based on number of unique domains
    n = len(domain_set)
    if n >= 5:
        speed = "rapid"
    elif n >= 3:
        speed = "moderate"
    elif n >= 1:
        speed = "slow"
    else:
        speed = "none"

    # Build domain-to-domain graph (simple chain by detection order)
    seen_domains_ordered = []
    for node in timeline:
        if node["domain"] not in [d for d in seen_domains_ordered]:
            seen_domains_ordered.append(node["domain"])

    graph_edges = []
    if seen_domains_ordered:
        graph_edges.append({"from": "original", "to": seen_domains_ordered[0]})
        for i in range(1, len(seen_domains_ordered)):
            graph_edges.append({
                "from": seen_domains_ordered[i - 1],
                "to": seen_domains_ordered[i],
            })

    return {
        "assetId": asset_id,
        "totalNodes": len(timeline),
        "uniqueDomains": len(domain_set),
        "platformBreakdown": platform_counts,
        "timeline": timeline,
        "spreadSpeed": speed,
        "domainGraph": graph_edges,
    }
