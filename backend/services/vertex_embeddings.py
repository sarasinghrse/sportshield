"""
Vertex AI multimodal embeddings — optional upgrade for CLIP image/text vectors.

Only used when EMBEDDINGS_BACKEND=vertex. Returns 512-dim vectors so the
existing Qdrant collection (VECTOR_DIM=512) stays compatible. The vertexai
SDK is imported lazily so this module is safe to import without GCP libs.
"""
from config import GCP_PROJECT, GCP_LOCATION

_MODEL = "multimodalembedding@001"
_initialized = False


def _ensure_init():
    global _initialized
    if not _initialized:
        import vertexai  # lazy import
        vertexai.init(project=GCP_PROJECT, location=GCP_LOCATION)
        _initialized = True


def get_image_embedding(image_bytes: bytes, dim: int = 512) -> list[float] | None:
    """Return a `dim`-length image embedding via Vertex AI, or None on failure."""
    try:
        _ensure_init()
        from vertexai.vision_models import Image as VImage, MultiModalEmbeddingModel
        model = MultiModalEmbeddingModel.from_pretrained(_MODEL)
        embeddings = model.get_embeddings(
            image=VImage(image_bytes=image_bytes),
            dimension=dim,
        )
        return list(embeddings.image_embedding)
    except Exception as e:
        print(f"[vertex] image embedding failed: {e}")
        return None


def get_text_embedding(text: str, dim: int = 512) -> list[float] | None:
    """Return a `dim`-length text embedding via Vertex AI, or None on failure."""
    try:
        _ensure_init()
        from vertexai.vision_models import MultiModalEmbeddingModel
        model = MultiModalEmbeddingModel.from_pretrained(_MODEL)
        embeddings = model.get_embeddings(
            contextual_text=text,
            dimension=dim,
        )
        return list(embeddings.text_embedding)
    except Exception as e:
        print(f"[vertex] text embedding failed: {e}")
        return None
