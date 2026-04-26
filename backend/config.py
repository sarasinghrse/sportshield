import os
from dotenv import load_dotenv

load_dotenv()

CLOUDINARY_CLOUD_NAME = os.getenv("CLOUDINARY_CLOUD_NAME")
CLOUDINARY_API_KEY = os.getenv("CLOUDINARY_API_KEY")
CLOUDINARY_API_SECRET = os.getenv("CLOUDINARY_API_SECRET")
SERPAPI_KEY = os.getenv("SERPAPI_KEY")
BREVO_SMTP_KEY = os.getenv("BREVO_SMTP_KEY")
FIREBASE_PROJECT_ID = os.getenv("FIREBASE_PROJECT_ID")
HF_TOKEN           = os.getenv("HF_TOKEN", "")          # HuggingFace token — free at huggingface.co
BREVO_SENDER_EMAIL = os.getenv("BREVO_SENDER_EMAIL", "") # verified sender in your Brevo account

# Twilio WhatsApp Sandbox — free trial, no billing needed
# Get these from console.twilio.com → Account Info
TWILIO_ACCOUNT_SID    = os.getenv("TWILIO_ACCOUNT_SID", "")
TWILIO_AUTH_TOKEN     = os.getenv("TWILIO_AUTH_TOKEN", "")
TWILIO_WHATSAPP_FROM  = os.getenv("TWILIO_WHATSAPP_FROM", "whatsapp:+14155238886")  # sandbox number (fixed)