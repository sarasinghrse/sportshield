import os
from dotenv import load_dotenv

load_dotenv()

CLOUDINARY_CLOUD_NAME = os.getenv("CLOUDINARY_CLOUD_NAME")
CLOUDINARY_API_KEY = os.getenv("CLOUDINARY_API_KEY")
CLOUDINARY_API_SECRET = os.getenv("CLOUDINARY_API_SECRET")
SERPAPI_KEY = os.getenv("SERPAPI_KEY")
BREVO_SMTP_KEY = os.getenv("BREVO_SMTP_KEY")
FIREBASE_PROJECT_ID = os.getenv("FIREBASE_PROJECT_ID")