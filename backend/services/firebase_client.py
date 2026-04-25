import firebase_admin
from firebase_admin import credentials, firestore
import json
import os

cred_json = os.getenv("GOOGLE_CREDENTIALS_JSON")
cred_dict = json.loads(cred_json)
cred = credentials.Certificate(cred_dict)
firebase_admin.initialize_app(cred)

db = firestore.client()