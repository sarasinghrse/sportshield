import os
import tempfile
import cloudinary
import cloudinary.uploader
from config import CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET

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


def upload_file(file_bytes, asset_id, user_id, resource_type="image"):
    public_id = f"sportshield/{user_id}/{asset_id}"

    if resource_type in ("video", "audio") or len(file_bytes) > _LARGE_THRESHOLD:
        # upload_large is most reliable with a real file path, so stage the
        # bytes to a temp file and chunk-upload from there.
        tmp = tempfile.NamedTemporaryFile(suffix=_SUFFIX.get(resource_type, ""), delete=False)
        try:
            tmp.write(file_bytes)
            tmp.flush()
            tmp.close()
            result = cloudinary.uploader.upload_large(
                tmp.name,
                public_id=public_id,
                resource_type=resource_type,
                chunk_size=6_000_000,
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