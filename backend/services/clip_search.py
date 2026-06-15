"""
CLIP + Qdrant Semantic Vector Search

Uses OpenAI's CLIP model (via HuggingFace Inference API — free) to generate
512-dim embedding vectors for images, then stores/searches them in Qdrant
(open-source vector DB, free cloud tier).

Why this matters:
  - pHash/PDQ only catch near-duplicates
  - CLIP catches *conceptually identical* images even after heavy edits:
    crop, recolor, meme overlay, AI upscale, mirror, text addition
  - Also enables text-to-image search ("find my player celebrating")
  - Sub-50ms queries at million-scale

Architecture:
  - Embeddings: HuggingFace Inference API (openai/clip-vit-base-patch32)
  - Storage: Qdrant Cloud free tier (1GB, 1M vectors)
  - Fallback: in-memory Qdrant if cloud unavailable
"""
import io
import base64
import os
import httpx
from PIL import Image
from qdrant_client import QdrantClient
from qdrant_client.models import (
    Distance, VectorParams, PointStruct, Filter, FieldCondition, MatchValue
)

# ── Config ───────────────────────────────────────────────────────────────────

HF_TOKEN = os.getenv("HF_TOKEN", "")
EMBEDDINGS_BACKEND = os.getenv("EMBEDDINGS_BACKEND", "clip")  # clip | vertex
CLIP_MODEL = "openai/clip-vit-base-patch32"
HF_FEATURE_URL = f"https://api-inference.huggingface.co/pipeline/feature-extraction/{CLIP_MODEL}"
VECTOR_DIM = 512
COLLECTION_NAME = "sportshield_assets"

# Qdrant: try cloud first, fall back to in-memory
QDRANT_URL = os.getenv("QDRANT_URL", "")
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY", "")

_client = None


def _get_qdrant() -> QdrantClient:
    """Lazy-init Qdrant client. Cloud if configured, else in-memory."""
    global _client
    if _client is not None:
        return _client

    if QDRANT_URL and QDRANT_API_KEY:
        _client = QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY)
        print(f"[clip] Connected to Qdrant Cloud: {QDRANT_URL}")
    else:
        # In-memory mode — great for demos, data resets on restart
        _client = QdrantClient(":memory:")
        print("[clip] Using in-memory Qdrant (demo mode)")

    # Ensure collection exists
    collections = [c.name for c in _client.get_collections().collections]
    if COLLECTION_NAME not in collections:
        _client.create_collection(
            collection_name=COLLECTION_NAME,
            vectors_config=VectorParams(size=VECTOR_DIM, distance=Distance.COSINE),
        )
        print(f"[clip] Created collection '{COLLECTION_NAME}'")

    return _client


def get_clip_embedding(image_bytes: bytes) -> list[float] | None:
    """
    Get CLIP embedding vector for an image via HuggingFace Inference API.

    Returns 512-dim float vector, or None if API fails.
    """
    # Optional Vertex AI backend (EMBEDDINGS_BACKEND=vertex). Returns a 512-dim
    # vector to stay compatible with the existing Qdrant collection. Falls back
    # to HuggingFace CLIP if Vertex fails.
    if EMBEDDINGS_BACKEND == "vertex":
        from services.vertex_embeddings import get_image_embedding
        vec = get_image_embedding(image_bytes, dim=VECTOR_DIM)
        if vec:
            return vec[:VECTOR_DIM]
        print("[clip] Vertex embedding failed, falling back to HuggingFace")

    if not HF_TOKEN:
        print("[clip] No HF_TOKEN set, skipping embedding")
        return None

    try:
        # Resize to 224x224 for CLIP (reduces upload size + matches model input)
        img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        img = img.resize((224, 224), Image.LANCZOS)

        buf = io.BytesIO()
        img.save(buf, format="PNG")
        img_b64 = base64.b64encode(buf.getvalue()).decode()

        headers = {"Authorization": f"Bearer {HF_TOKEN}"}

        # Use the feature extraction pipeline
        resp = httpx.post(
            HF_FEATURE_URL,
            headers=headers,
            json={"inputs": [{"image": img_b64}]},
            timeout=30.0,
        )

        if resp.status_code == 200:
            data = resp.json()
            # HF returns nested arrays — extract the embedding
            if isinstance(data, list):
                embedding = data[0] if isinstance(data[0], list) else data
                # Flatten if needed and take first VECTOR_DIM elements
                flat = _flatten(embedding)
                if len(flat) >= VECTOR_DIM:
                    return flat[:VECTOR_DIM]
                return flat
            return None
        else:
            # Fallback: use the simpler image-feature-extraction endpoint
            resp2 = httpx.post(
                f"https://api-inference.huggingface.co/models/{CLIP_MODEL}",
                headers=headers,
                content=buf.getvalue(),
                timeout=30.0,
            )
            if resp2.status_code == 200:
                data = resp2.json()
                flat = _flatten(data)
                if len(flat) >= VECTOR_DIM:
                    return flat[:VECTOR_DIM]
            print(f"[clip] HF API error: {resp.status_code} / {resp2.status_code}")
            return None

    except Exception as e:
        print(f"[clip] Embedding failed: {e}")
        return None


def index_asset(asset_id: str, user_id: str, image_bytes: bytes,
                filename: str = "") -> dict:
    """
    Compute CLIP embedding and store in Qdrant.

    Returns: {"indexed": bool, "vector_id": str, "dimensions": int}
    """
    embedding = get_clip_embedding(image_bytes)
    if embedding is None:
        return {"indexed": False, "vector_id": None, "dimensions": 0}

    client = _get_qdrant()

    # Use asset_id hash as numeric point ID
    point_id = abs(hash(asset_id)) % (2**63)

    client.upsert(
        collection_name=COLLECTION_NAME,
        points=[
            PointStruct(
                id=point_id,
                vector=embedding,
                payload={
                    "asset_id": asset_id,
                    "user_id": user_id,
                    "filename": filename,
                },
            )
        ],
    )

    return {
        "indexed": True,
        "vector_id": str(point_id),
        "dimensions": len(embedding),
    }


def search_similar(image_bytes: bytes, user_id: str = None,
                   top_k: int = 10, threshold: float = 0.75) -> list[dict]:
    """
    Search for visually similar assets using CLIP semantic similarity.

    Args:
        image_bytes: query image
        user_id: optional filter to search only one user's assets
        top_k: max results
        threshold: minimum cosine similarity (0-1)

    Returns list of:
        {"asset_id", "filename", "score", "verdict"}
    """
    embedding = get_clip_embedding(image_bytes)
    if embedding is None:
        return []

    client = _get_qdrant()

    query_filter = None
    if user_id:
        query_filter = Filter(
            must=[FieldCondition(key="user_id", match=MatchValue(value=user_id))]
        )

    results = client.query_points(
        collection_name=COLLECTION_NAME,
        query=embedding,
        query_filter=query_filter,
        limit=top_k,
        score_threshold=threshold,
    )

    matches = []
    for hit in results.points:
        score = hit.score
        if score < threshold:
            continue

        verdict = "exact-match" if score >= 0.95 else (
            "near-duplicate" if score >= 0.85 else (
                "similar" if score >= 0.75 else "weak-match"
            )
        )

        matches.append({
            "asset_id": hit.payload.get("asset_id", ""),
            "filename": hit.payload.get("filename", ""),
            "score": round(score, 4),
            "verdict": verdict,
        })

    return matches


def text_search(query: str, user_id: str = None,
                top_k: int = 10) -> list[dict]:
    """
    Text-to-image search using CLIP's multimodal capability.
    E.g. "player celebrating goal" → finds matching images.
    """
    # Vertex text embedding path (shares the 512-dim image space).
    if EMBEDDINGS_BACKEND == "vertex":
        from services.vertex_embeddings import get_text_embedding
        vec = get_text_embedding(query, dim=VECTOR_DIM)
        if vec:
            client = _get_qdrant()
            query_filter = None
            if user_id:
                query_filter = Filter(
                    must=[FieldCondition(key="user_id", match=MatchValue(value=user_id))]
                )
            results = client.query_points(
                collection_name=COLLECTION_NAME,
                query=vec[:VECTOR_DIM],
                query_filter=query_filter,
                limit=top_k,
            )
            return [
                {
                    "asset_id": hit.payload.get("asset_id", ""),
                    "filename": hit.payload.get("filename", ""),
                    "score": round(hit.score, 4),
                }
                for hit in results.points
            ]

    if not HF_TOKEN:
        return []

    try:
        # Get text embedding from CLIP
        headers = {"Authorization": f"Bearer {HF_TOKEN}"}
        resp = httpx.post(
            HF_FEATURE_URL,
            headers=headers,
            json={"inputs": query},
            timeout=30.0,
        )

        if resp.status_code != 200:
            return []

        data = resp.json()
        embedding = _flatten(data)
        if len(embedding) < VECTOR_DIM:
            return []
        embedding = embedding[:VECTOR_DIM]

        client = _get_qdrant()

        query_filter = None
        if user_id:
            query_filter = Filter(
                must=[FieldCondition(key="user_id", match=MatchValue(value=user_id))]
            )

        results = client.query_points(
            collection_name=COLLECTION_NAME,
            query=embedding,
            query_filter=query_filter,
            limit=top_k,
        )

        return [
            {
                "asset_id": hit.payload.get("asset_id", ""),
                "filename": hit.payload.get("filename", ""),
                "score": round(hit.score, 4),
            }
            for hit in results.points
        ]

    except Exception as e:
        print(f"[clip] Text search failed: {e}")
        return []


def get_collection_stats() -> dict:
    """Get Qdrant collection stats."""
    try:
        client = _get_qdrant()
        info = client.get_collection(COLLECTION_NAME)
        return {
            "vectors_count": info.vectors_count,
            "points_count": info.points_count,
            "status": str(info.status),
        }
    except Exception as e:
        return {"error": str(e)}


# ── Helpers ──────────────────────────────────────────────────────────────────

def _flatten(data) -> list[float]:
    """Recursively flatten nested lists/arrays to a 1D float list."""
    if isinstance(data, (int, float)):
        return [float(data)]
    if isinstance(data, list):
        result = []
        for item in data:
            result.extend(_flatten(item))
        return result
    return []
