import os
from pathlib import Path

import firebase_admin
from dotenv import load_dotenv
from firebase_admin import credentials, firestore

load_dotenv()


def _credential_path() -> str:
    configured_path = os.getenv("FIREBASE_KEY_PATH")
    if configured_path:
        return configured_path
    backend_dir = Path(__file__).resolve().parents[1]
    default_path = backend_dir / "serviceAccountKey.json"
    if default_path.exists():
        return str(default_path)
    matches = list(backend_dir.glob("*firebase-adminsdk*.json"))
    if matches:
        return str(matches[0])
    return str(default_path)


def get_db():
    if not firebase_admin._apps:
        cred = credentials.Certificate(_credential_path())
        firebase_admin.initialize_app(cred)
    return firestore.client()
