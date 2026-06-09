from urllib.parse import urlparse
from services.firebase_client import db


def normalize_domain(url_or_domain: str) -> str:
    """Extract and normalize a domain from a URL or bare domain string."""
    s = url_or_domain.strip().lower()
    if not s.startswith(("http://", "https://")):
        s = "https://" + s
    host = urlparse(s).hostname or ""
    if host.startswith("www."):
        host = host[4:]
    return host


def get_trusted_domains(user_id: str) -> list[str]:
    """Fetch the trusted domain whitelist for a user from Firestore."""
    doc = db.collection("users").document(user_id).get()
    if doc.exists:
        return doc.to_dict().get("trustedDomains", [])
    return []


def classify_url(found_url: str, trusted_domains: list[str]) -> str:
    """Return 'authorized' if found_url's domain is in the whitelist, else 'unauthorized'."""
    domain = normalize_domain(found_url)
    if not domain:
        return "unauthorized"
    for td in trusted_domains:
        norm = normalize_domain(td)
        if domain == norm or domain.endswith("." + norm):
            return "authorized"
    return "unauthorized"
