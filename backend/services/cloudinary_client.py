import cloudinary
import cloudinary.uploader
from config import CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET

cloudinary.config(
    cloud_name=CLOUDINARY_CLOUD_NAME,
    api_key=CLOUDINARY_API_KEY,
    api_secret=CLOUDINARY_API_SECRET
)

def upload_file(file_bytes, asset_id, user_id, resource_type="image"):
    result = cloudinary.uploader.upload(
        file_bytes,
        public_id=f"sportshield/{user_id}/{asset_id}",
        resource_type=resource_type
    )
    return result["secure_url"]