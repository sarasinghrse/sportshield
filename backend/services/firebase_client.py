import firebase_admin
from firebase_admin import credentials, firestore
import json
import os
from dotenv import load_dotenv

load_dotenv()

from unittest.mock import MagicMock

cred_json = os.getenv("GOOGLE_CREDENTIALS_JSON")
if cred_json:
    cred_dict = json.loads(cred_json)
    cred = credentials.Certificate(cred_dict)
    firebase_admin.initialize_app(cred)
    db = firestore.client()
else:
    print("WARNING: GOOGLE_CREDENTIALS_JSON is not set. Firestore will be mocked.")
    db = MagicMock()