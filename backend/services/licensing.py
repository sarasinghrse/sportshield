"""
S14 — Content Licensing Management

Manages licenses for protected assets. Allows owners to define
licensing terms, track licensees, and verify license status.
"""
import uuid
from datetime import datetime, timezone

LICENSE_TYPES = {
    "exclusive": {
        "label": "Exclusive License",
        "description": "Only the licensee may use this content",
        "maxLicensees": 1,
    },
    "non_exclusive": {
        "label": "Non-Exclusive License",
        "description": "Multiple parties may license this content",
        "maxLicensees": None,
    },
    "editorial": {
        "label": "Editorial Use Only",
        "description": "May only be used in editorial (non-commercial) contexts",
        "maxLicensees": None,
    },
    "commercial": {
        "label": "Commercial License",
        "description": "Licensed for commercial use including advertising and merchandise",
        "maxLicensees": None,
    },
    "personal": {
        "label": "Personal Use Only",
        "description": "For personal, non-commercial use only",
        "maxLicensees": None,
    },
}


def create_license(
    asset_id: str,
    owner_id: str,
    licensee_name: str,
    licensee_email: str,
    license_type: str = "non_exclusive",
    terms: str = "",
    price: float = 0,
    currency: str = "USD",
    duration_days: int = 365,
    allowed_platforms: list = None,
    territory: str = "worldwide",
) -> dict:
    if license_type not in LICENSE_TYPES:
        raise ValueError(f"Invalid license type. Must be one of: {', '.join(LICENSE_TYPES.keys())}")

    license_id = f"LIC-{uuid.uuid4().hex[:8].upper()}"
    now = datetime.now(timezone.utc)

    from datetime import timedelta
    expires_at = now + timedelta(days=duration_days)

    return {
        "licenseId": license_id,
        "assetId": asset_id,
        "ownerId": owner_id,
        "licensee": {
            "name": licensee_name,
            "email": licensee_email,
        },
        "type": license_type,
        "typeInfo": LICENSE_TYPES[license_type],
        "terms": terms,
        "price": price,
        "currency": currency,
        "territory": territory,
        "allowedPlatforms": allowed_platforms or [],
        "durationDays": duration_days,
        "status": "active",
        "createdAt": now,
        "expiresAt": expires_at,
    }


def check_license_status(license_doc: dict) -> dict:
    now = datetime.now(timezone.utc)
    expires_at = license_doc.get("expiresAt")

    if license_doc.get("status") == "revoked":
        return {"valid": False, "reason": "License has been revoked"}

    if expires_at:
        if hasattr(expires_at, 'timestamp'):
            exp_dt = expires_at
        else:
            try:
                exp_dt = datetime.fromisoformat(str(expires_at).replace('Z', '+00:00'))
            except Exception:
                exp_dt = now

        if now > exp_dt:
            return {"valid": False, "reason": "License has expired"}

        days_left = (exp_dt - now).days
        return {"valid": True, "daysRemaining": days_left, "status": "active"}

    return {"valid": True, "status": "active", "daysRemaining": None}


def verify_usage(license_doc: dict, platform: str = "", use_type: str = "") -> dict:
    status = check_license_status(license_doc)
    if not status["valid"]:
        return {"authorized": False, "reason": status["reason"]}

    allowed = license_doc.get("allowedPlatforms", [])
    if allowed and platform:
        if platform.lower() not in [p.lower() for p in allowed]:
            return {"authorized": False, "reason": f"Platform '{platform}' is not in allowed platforms"}

    lt = license_doc.get("type", "")
    if lt == "editorial" and use_type == "commercial":
        return {"authorized": False, "reason": "Editorial license does not permit commercial use"}
    if lt == "personal" and use_type in ("commercial", "editorial"):
        return {"authorized": False, "reason": "Personal license restricts to personal use only"}

    return {"authorized": True, "licenseType": lt, "status": "valid"}
