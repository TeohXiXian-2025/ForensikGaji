"""
ForensikGaji Backend - Image Storage Service

This module handles uploading analysis artifacts (ELA heatmaps, processed PDFs)
to Google Cloud Storage for persistent storage and frontend access.

Author: ForensikGaji Team
Created: May 2026
"""

import os
import uuid
import base64
from datetime import timedelta

from google.cloud import storage


def upload_base64_to_gcs(base64_data: str, filename: str, content_type: str = "image/jpeg") -> str:
    """
    Uploads a base64-encoded file to Google Cloud Storage and returns a signed URL.

    This function is used to upload analysis artifacts like ELA heatmaps
    and processed documents that need to be persisted and displayed in the frontend.
    Uses signed URLs to work with uniform bucket-level access enabled.

    Args:
        base64_data: Base64-encoded data (with or without data URI prefix)
        filename: Name for the file in GCS
        content_type: MIME type of the file

    Returns:
        str: Signed URL to access the uploaded file (valid for 7 days)
             Example: "https://storage.googleapis.com/bucket-name/uuid-filename?signature=..."
             None: If upload fails or base64_data is empty

    Raises:
        GoogleCloudError: If upload fails
    """
    bucket_name = os.getenv("GCS_BUCKET_NAME")
    if not bucket_name:
        print("[WARN] GCS_BUCKET_NAME not set, skipping GCS upload")
        return None

    try:
        client = storage.Client()
        bucket = client.bucket(bucket_name)

        # Generate unique filename
        safe_filename = f"{uuid.uuid4()}_{filename}"
        blob = bucket.blob(safe_filename)

        # Decode base64 data
        if base64_data and base64_data.startswith("data:"):
            # Remove data URI prefix (e.g., "data:image/jpeg;base64,")
            base64_data = base64_data.split(",", 1)[1]

        if not base64_data:
            return None

        file_bytes = base64.b64decode(base64_data)

        # Upload to GCS
        blob.upload_from_string(file_bytes, content_type=content_type)

        # Generate a signed URL valid for 7 days (GCS maximum limit)
        # This works with uniform bucket-level access enabled
        signed_url = blob.generate_signed_url(
            expiration=timedelta(days=7),
            method="GET",
            version="v4"
        )

        return signed_url

    except Exception as e:
        print(f"[WARN] Failed to upload to GCS: {e}")
        return None
