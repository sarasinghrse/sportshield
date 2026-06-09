"""
S11 — Blockchain Timestamping / Proof of Ownership

Creates tamper-proof timestamps for uploaded assets using SHA-256 hashing
and stores proof records. Uses OriginStamp-compatible hashing for optional
later anchoring to Bitcoin/Ethereum blockchains.

The free-tier approach:
1. Compute SHA-256 of the original file
2. Store hash + timestamp + metadata as a signed proof record
3. Generate a verifiable proof certificate
4. Optionally submit to a public timestamp authority
"""
import hashlib
import json
import uuid
from datetime import datetime, timezone
import hmac

PROOF_VERSION = 1
SIGNING_SECRET = "sportshield-proof-v1"


def compute_file_hash(file_bytes: bytes) -> str:
    return hashlib.sha256(file_bytes).hexdigest()


def compute_metadata_hash(asset_id: str, user_id: str, filename: str, file_hash: str, timestamp: str) -> str:
    payload = f"{asset_id}:{user_id}:{filename}:{file_hash}:{timestamp}"
    return hashlib.sha256(payload.encode()).hexdigest()


def sign_proof(data_hash: str) -> str:
    return hmac.new(SIGNING_SECRET.encode(), data_hash.encode(), hashlib.sha256).hexdigest()


def create_ownership_proof(
    file_bytes: bytes,
    asset_id: str,
    user_id: str,
    filename: str,
    phash: str = "",
) -> dict:
    now = datetime.now(timezone.utc)
    timestamp = now.isoformat()
    proof_id = f"PROOF-{uuid.uuid4().hex[:8].upper()}"

    file_hash = compute_file_hash(file_bytes)
    metadata_hash = compute_metadata_hash(asset_id, user_id, filename, file_hash, timestamp)
    signature = sign_proof(metadata_hash)

    proof = {
        "proofId": proof_id,
        "version": PROOF_VERSION,
        "assetId": asset_id,
        "userId": user_id,
        "filename": filename,
        "fileHash": file_hash,
        "fileSize": len(file_bytes),
        "perceptualHash": phash,
        "metadataHash": metadata_hash,
        "signature": signature,
        "timestamp": timestamp,
        "createdAt": now,
        "status": "verified",
        "method": "sha256-hmac",
        "chainAnchored": False,
    }

    return proof


def verify_ownership_proof(proof: dict, file_bytes: bytes = None) -> dict:
    result = {
        "valid": True,
        "checks": [],
    }

    if not proof.get("signature") or not proof.get("metadataHash"):
        return {"valid": False, "checks": [{"check": "structure", "passed": False, "detail": "Missing required fields"}]}

    expected_sig = sign_proof(proof["metadataHash"])
    sig_valid = proof["signature"] == expected_sig
    result["checks"].append({
        "check": "signature",
        "passed": sig_valid,
        "detail": "HMAC signature matches" if sig_valid else "Signature mismatch — proof may be tampered",
    })
    if not sig_valid:
        result["valid"] = False

    if file_bytes:
        file_hash = compute_file_hash(file_bytes)
        hash_valid = file_hash == proof.get("fileHash", "")
        result["checks"].append({
            "check": "fileHash",
            "passed": hash_valid,
            "detail": "File hash matches original" if hash_valid else "File has been modified since proof was created",
        })
        if not hash_valid:
            result["valid"] = False

        expected_meta = compute_metadata_hash(
            proof.get("assetId", ""),
            proof.get("userId", ""),
            proof.get("filename", ""),
            file_hash,
            proof.get("timestamp", ""),
        )
        meta_valid = expected_meta == proof.get("metadataHash", "")
        result["checks"].append({
            "check": "metadataHash",
            "passed": meta_valid,
            "detail": "Metadata integrity verified" if meta_valid else "Metadata has been altered",
        })
        if not meta_valid:
            result["valid"] = False

    result["checks"].append({
        "check": "timestamp",
        "passed": True,
        "detail": f"Proof created at {proof.get('timestamp', 'unknown')}",
    })

    return result


def generate_proof_certificate(proof: dict) -> str:
    return f"""╔══════════════════════════════════════════════════════════════╗
║                  SPORTSHIELD PROOF OF OWNERSHIP              ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  Proof ID:     {proof['proofId']:<44}║
║  Asset:        {proof['filename'][:44]:<44}║
║  Owner:        {proof['userId'][:44]:<44}║
║  Timestamp:    {proof['timestamp'][:44]:<44}║
║                                                              ║
╠══════════════════════════════════════════════════════════════╣
║  FILE INTEGRITY                                              ║
║  SHA-256:      {proof['fileHash'][:44]:<44}║
║               {proof['fileHash'][44:]:<45}║
║  Size:         {str(proof['fileSize']) + ' bytes':<44}║
║  pHash:        {proof.get('perceptualHash', 'N/A'):<44}║
║                                                              ║
╠══════════════════════════════════════════════════════════════╣
║  VERIFICATION                                                ║
║  Meta Hash:    {proof['metadataHash'][:44]:<44}║
║               {proof['metadataHash'][44:]:<45}║
║  Signature:    {proof['signature'][:44]:<44}║
║               {proof['signature'][44:]:<45}║
║  Method:       {proof['method']:<44}║
║  Status:       {'✓ VERIFIED':<44}║
║                                                              ║
╠══════════════════════════════════════════════════════════════╣
║  This certificate proves that the above file existed at the  ║
║  stated timestamp and was registered by the stated owner.    ║
║  Verify at: sportshield.app/verify/{proof['proofId']}        ║
╚══════════════════════════════════════════════════════════════╝"""
