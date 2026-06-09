from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.firebase_client import db
from services.domain_classifier import normalize_domain

router = APIRouter()


class TrustedDomainRequest(BaseModel):
    domain: str


@router.get("/trusted-domains")
async def get_trusted_domains(user_id: str = "demo_user"):
    doc = db.collection("users").document(user_id).get()
    domains = doc.to_dict().get("trustedDomains", []) if doc.exists else []
    return {"domains": domains}


@router.post("/trusted-domains")
async def add_trusted_domain(req: TrustedDomainRequest, user_id: str = "demo_user"):
    domain = normalize_domain(req.domain)
    if not domain:
        raise HTTPException(status_code=400, detail="Invalid domain")

    doc = db.collection("users").document(user_id).get()
    domains = doc.to_dict().get("trustedDomains", []) if doc.exists else []

    if domain in domains:
        return {"domains": domains, "message": "Already trusted"}

    domains.append(domain)
    db.collection("users").document(user_id).set(
        {"trustedDomains": domains}, merge=True
    )
    return {"domains": domains, "message": f"Added {domain}"}


@router.delete("/trusted-domains")
async def remove_trusted_domain(req: TrustedDomainRequest, user_id: str = "demo_user"):
    domain = normalize_domain(req.domain)
    doc = db.collection("users").document(user_id).get()
    domains = doc.to_dict().get("trustedDomains", []) if doc.exists else []

    domains = [d for d in domains if normalize_domain(d) != domain]
    db.collection("users").document(user_id).set(
        {"trustedDomains": domains}, merge=True
    )
    return {"domains": domains, "message": f"Removed {domain}"}
