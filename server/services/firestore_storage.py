"""
ForensikGaji Backend - Firestore Storage Service

This module handles persistent storage of audit cases using Firebase Firestore.
Falls back to JSON file storage if Firestore credentials are not available.

Author: ForensikGaji Team
Created: May 2026
"""

import json
import os
from typing import List, Optional
from datetime import datetime
from models import AuditCase, CaseData, FileData

# Try to import Firebase Admin SDK
try:
    import firebase_admin
    from firebase_admin import credentials, firestore
    FIREBASE_AVAILABLE = True
except ImportError:
    FIREBASE_AVAILABLE = False

# Fallback to JSON file storage
CASES_FILE = "cases.json"

# Global Firestore client
_db = None
_firestore_enabled = False


def initialize_firestore():
    """Initialize Firebase Firestore from environment variables."""
    global _db, _firestore_enabled

    if not FIREBASE_AVAILABLE:
        print("[INFO] Firebase Admin SDK not installed. Using JSON file storage.")
        return False

    # Check for Firebase credentials
    firebase_json = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON")
    project_id = os.getenv("FIREBASE_PROJECT_ID")
    credentials_path = os.getenv("FIREBASE_CREDENTIALS_PATH")

    if firebase_json:
        # Use JSON string from environment variable
        try:
            cred_dict = json.loads(firebase_json)
            cred = credentials.Certificate(cred_dict)
            firebase_admin.initialize_app(cred)
            _db = firestore.client()
            _firestore_enabled = True
            print("[OK] Firestore initialized from environment variable")
            return True
        except Exception as e:
            print(f"[WARN] Failed to initialize Firestore from env: {e}")

    elif credentials_path and os.path.exists(credentials_path):
        # Use credentials file path
        try:
            cred = credentials.Certificate(credentials_path)
            firebase_admin.initialize_app(cred)
            _db = firestore.client()
            _firestore_enabled = True
            print(f"[OK] Firestore initialized from {credentials_path}")
            return True
        except Exception as e:
            print(f"[WARN] Failed to initialize Firestore from file: {e}")

    elif project_id:
        # Use Application Default Credentials (works in Cloud Run)
        try:
            firebase_admin.initialize_app(options={"projectId": project_id})
            _db = firestore.client()
            _firestore_enabled = True
            print(f"[OK] Firestore initialized with ADC for project {project_id}")
            return True
        except Exception as e:
            print(f"[WARN] Failed to initialize Firestore with ADC: {e}")

    print("[INFO] Firestore credentials not found. Using JSON file storage.")
    return False


def load_cases() -> List[AuditCase]:
    """Load all cases from Firestore or JSON file."""
    if _firestore_enabled and _db:
        try:
            cases_ref = _db.collection("cases")
            docs = cases_ref.stream()
            cases = []
            for doc in docs:
                case_dict = doc.to_dict()
                case_dict["id"] = doc.id
                cases.append(AuditCase(**case_dict))
            return cases
        except Exception as e:
            print(f"[WARN] Firestore error, falling back to JSON: {e}")

    # Fallback to JSON file
    if not os.path.exists(CASES_FILE):
        return []

    try:
        with open(CASES_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
            return [AuditCase(**case) for case in data if case]
    except Exception as e:
        print(f"Error loading cases: {e}")
        return []


def save_cases(cases: List[AuditCase]) -> bool:
    """Save all cases to Firestore or JSON file."""
    if _firestore_enabled and _db:
        try:
            batch = _db.batch()
            cases_ref = _db.collection("cases")

            # Delete existing documents (not ideal but works for now)
            for doc in cases_ref.stream():
                batch.delete(doc.reference)

            # Add all cases
            for case in cases:
                case_dict = case.model_dump(exclude={"id"})
                doc_ref = cases_ref.document(case.id)
                batch.set(doc_ref, case_dict)

            batch.commit()
            return True
        except Exception as e:
            print(f"[WARN] Firestore error, falling back to JSON: {e}")

    # Fallback to JSON file
    try:
        with open(CASES_FILE, 'w', encoding='utf-8') as f:
            json.dump([case.model_dump() for case in cases], f, indent=2, default=str)
        return True
    except Exception as e:
        print(f"Error saving cases: {e}")
        return False


def create_case(name: str, doc_types: List[str], base_url: str) -> AuditCase:
    """Create a new audit case."""
    import random

    case_id = f"req-{random.randint(1000, 9999)}"

    new_case = AuditCase(
        id=case_id,
        name=name,
        type=" + ".join(doc_types),
        status="waiting",
        link=f"{base_url}?upload={case_id}"
    )

    cases = load_cases()
    cases.insert(0, new_case)
    save_cases(cases)

    return new_case


def get_case(case_id: str) -> Optional[AuditCase]:
    """Get a specific case by ID."""
    if _firestore_enabled and _db:
        try:
            doc_ref = _db.collection("cases").document(case_id)
            doc = doc_ref.get()
            if doc.exists:
                case_dict = doc.to_dict()
                case_dict["id"] = doc.id
                return AuditCase(**case_dict)
        except Exception as e:
            print(f"[WARN] Firestore error: {e}")

    # Fallback to JSON file
    cases = load_cases()
    for case in cases:
        if case.id == case_id:
            return case
    return None


def get_all_cases() -> List[AuditCase]:
    """Get all cases."""
    return load_cases()


def update_case(case_id: str, **updates) -> Optional[AuditCase]:
    """Update a case with new data."""
    if _firestore_enabled and _db:
        try:
            doc_ref = _db.collection("cases").document(case_id)
            if updates.get("data") and hasattr(updates["data"], "model_dump"):
                updates["data"] = updates["data"].model_dump()

            doc_ref.update(updates)
            return get_case(case_id)
        except Exception as e:
            print(f"[WARN] Firestore error: {e}")

    # Fallback to JSON file
    cases = load_cases()
    for i, case in enumerate(cases):
        if case.id == case_id:
            case_dict = case.model_dump()
            case_dict.update(updates)
            case_dict['updated_at'] = datetime.now().isoformat()

            updated_case = AuditCase(**case_dict)
            cases[i] = updated_case
            save_cases(cases)
            return updated_case
    return None


def add_files_to_case(case_id: str, files: List[FileData]) -> Optional[AuditCase]:
    """Add analyzed files to a case."""
    case = get_case(case_id)
    if not case:
        return None

    if case.data:
        existing_files = case.data.files or []
        existing_names = {f.name for f in existing_files}
        for new_file in files:
            if new_file.name not in existing_names:
                existing_files.append(new_file)

        avg_score = int(sum(f.score for f in existing_files) / len(existing_files)) if existing_files else 0

        case_data = CaseData(
            score=avg_score,
            date=case.data.date or datetime.now().isoformat(),
            clash_detected=case.data.clash_detected,
            files=existing_files
        )
    else:
        avg_score = int(sum(f.score for f in files) / len(files)) if files else 0

        case_data = CaseData(
            score=avg_score,
            date=datetime.now().isoformat(),
            clash_detected=False,
            files=files
        )

    # Remove large base64 fields to avoid Firestore 1MB limit
    # Only keep metadata and analysis results
    for file_item in case_data.files:
        if hasattr(file_item, 'heatmap'):
            file_item.heatmap = None
        if hasattr(file_item, 'original'):
            file_item.original = None
        if isinstance(file_item, dict):
            file_item.pop('heatmap', None)
            file_item.pop('original', None)

    return update_case(case_id, data=case_data, status="completed")


def delete_case(case_id: str) -> bool:
    """Delete a case by ID."""
    if _firestore_enabled and _db:
        try:
            _db.collection("cases").document(case_id).delete()
            return True
        except Exception as e:
            print(f"[WARN] Firestore error: {e}")

    # Fallback to JSON file
    cases = load_cases()
    original_length = len(cases)
    cases = [c for c in cases if c.id != case_id]

    if len(cases) < original_length:
        save_cases(cases)
        return True
    return False


# Initialize Firestore on module import
initialize_firestore()
