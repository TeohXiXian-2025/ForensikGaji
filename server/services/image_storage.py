"""
ForensikGaji Backend - Image Storage Service

This module handles uploading analysis artifacts (ELA heatmaps, processed PDFs)
to Google Cloud Storage for persistent storage and frontend access.

Author: ForensikGaji Team
Created: May 2026
"""

import os
import json
import uuid
import base64
from datetime import timedelta

from google.cloud import storage
from google.oauth2 import service_account


def _get_storage_client():
    """Get a storage client with appropriate credentials for signing."""
    # Check if service account JSON is provided
    service_account_json = os.getenv("GCS_SERVICE_ACCOUNT_JSON")

    if service_account_json:
        try:
            # Parse the JSON and create credentials
            info = json.loads(service_account_json)
            credentials = service_account.Credentials.from_service_account_info(info)
            return storage.Client(credentials=credentials)
        except Exception as e:
            print(f"[WARN] Failed to create service account credentials: {e}")

    # Fall back to default credentials (works for upload but not signing)
    return storage.Client()


def upload_base64_to_gcs(base64_data: str, filename: str, content_type: str = "image/jpeg") -> str:
    """
    Uploads a base64-encoded file to Google Cloud Storage and returns a signed URL.

    Args:
        base64_data: Base64-encoded data (with or without data URI prefix)
        filename: Name for the file in GCS
        content_type: MIME type of the file

    Returns:
        str: Signed URL (7 days) or direct URL if signing unavailable
             None: If upload fails
    """
    bucket_name = os.getenv("GCS_BUCKET_NAME")
    if not bucket_name:
        print("[WARN] GCS_BUCKET_NAME not set, skipping GCS upload")
        return None

    try:
        client = _get_storage_client()
        bucket = client.bucket(bucket_name)

        # Generate unique filename
        safe_filename = f"{uuid.uuid4()}_{filename}"
        blob = bucket.blob(safe_filename)

        # Decode base64 data
        if base64_data and base64_data.startswith("data:"):
            base64_data = base64_data.split(",", 1)[1]

        if not base64_data:
            return None

        file_bytes = base64.b64decode(base64_data)

        # Upload to GCS
        blob.upload_from_string(file_bytes, content_type=content_type)

        # Try to generate signed URL (requires service account)
        try:
            signed_url = blob.generate_signed_url(
                expiration=timedelta(days=7),
                method="GET",
                version="v4"
            )
            return signed_url
        except Exception as sign_err:
            print(f"[WARN] Cannot generate signed URL: {sign_err}")
            print("[INFO] Set GCS_SERVICE_ACCOUNT_JSON environment variable for signed URLs")
            # Return direct URL as fallback
            return f"https://storage.googleapis.com/{bucket_name}/{safe_filename}"

    except Exception as e:
        print(f"[WARN] Failed to upload to GCS: {e}")
        return None
