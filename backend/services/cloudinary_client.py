import os
import tempfile
import cloudinary
import cloudinary.uploader
from config import (
    CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET,
    STORAGE_BACKEND,
)

cloudinary.config(
    cloud_name=CLOUDINARY_CLOUD_NAME,
    api_key=CLOUDINARY_API_KEY,
    api_secret=CLOUDINARY_API_SECRET
)

# Cloudinary's synchronous upload() caps the request body at ~10 MB.
# Videos/audio (and large images) routinely exceed that, so anything over
# this threshold must go through the chunked upload_large() endpoint.
_LARGE_THRESHOLD = 10_000_000  # 10 MB

_SUFFIX = {"video": ".mp4", "audio": ".mp3"}


def upload_file(file_bytes, asset_id, user_id, resource_type="image", content_type=None):
    # Optional Google Cloud Storage backend (STORAGE_BACKEND=gcs). Falls back
    # to Cloudinary automatically if GCS upload fails, so a bad GCS config
    # never breaks uploads.
    if STORAGE_BACKEND == "gcs":
        try:
            from services.gcs_client import upload_file as gcs_upload
            return gcs_upload(file_bytes, asset_id, user_id, resource_type, content_type=content_type)
        except Exception as e:
            print(f"[storage] GCS upload failed, falling back to Cloudinary: {e}")

    public_id = f"sportshield/{user_id}/{asset_id}"

    if resource_type in ("video", "audio") or len(file_bytes) > _LARGE_THRESHOLD:
        # upload_large is most reliable with a real file path, so stage the
        # bytes to a temp file and chunk-upload from there.  On Cloud Run the
        # writable filesystem is limited to /tmp, so we force the temp dir.
        tmp_dir = "/tmp" if os.path.isdir("/tmp") else None
        try:
            tmp = tempfile.NamedTemporaryFile(
                suffix=_SUFFIX.get(resource_type, ""),
                dir=tmp_dir,
                delete=False,
            )
            tmp.write(file_bytes)
            tmp.flush()
            tmp.close()
            result = cloudinary.uploader.upload_large(
                tmp.name,
                public_id=public_id,
                resource_type=resource_type,
                chunk_size=6_000_000,
            )
        except OSError:
            # Temp file creation failed (read-only FS) — fall back to
            # in-memory upload which works for files under ~100 MB.
            result = cloudinary.uploader.upload(
                file_bytes,
                public_id=public_id,
                resource_type=resource_type,
            )
        finally:
            try:
                os.unlink(tmp.name)
            except Exception:
                pass
    else:
        result = cloudinary.uploader.upload(
            file_bytes,
            public_id=public_id,
            resource_type=resource_type,
        )
    return result["secure_url"]