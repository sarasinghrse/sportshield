"""
Google Cloud Storage adapter — drop-in replacement for the Cloudinary uploader.

Only used when STORAGE_BACKEND=gcs. The google-cloud-storage library is
imported lazily so the module is safe to import even on environments where
the GCP libraries are not installed (e.g. the Render free tier).
"""
from config import GCS_BUCKET

_EXT = {"video": ".mp4", "audio": ".mp3", "image": ".jpg"}
_CONTENT_TYPE = {
    "video": "video/mp4",
    "audio": "audio/mpeg",
    "image": "image/jpeg",
}

_client = None


def _bucket():
    global _client
    from google.cloud import storage  # lazy import
    if _client is None:
        _client = storage.Client()
    return _client.bucket(GCS_BUCKET)


def upload_file(file_bytes, asset_id, user_id, resource_type="image"):
    """Upload bytes to the GCS bucket and return a public URL.

    Mirrors services.cloudinary_client.upload_file's signature/return so it
    can be swapped in transparently.
    """
    if not GCS_BUCKET:
        raise RuntimeError("STORAGE_BACKEND=gcs but GCS_BUCKET is not set")

    blob_name = f"sportshield/{user_id}/{asset_id}{_EXT.get(resource_type, '')}"
    blob = _bucket().blob(blob_name)
    blob.upload_from_string(
        file_bytes,
        content_type=_CONTENT_TYPE.get(resource_type, "application/octet-stream"),
    )

    # Works when the bucket uses fine-grained ACLs. With uniform bucket-level
    # access this is a no-op — grant allUsers:objectViewer on the bucket once
    # instead (see DEPLOY_GCP.md), and the constructed URL below still serves.
    try:
        blob.make_public()
    except Exception:
        pass

    return getattr(blob, "public_url", None) or f"https://storage.googleapis.com/{GCS_BUCKET}/{blob_name}"
