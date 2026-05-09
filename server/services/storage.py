"""
ForensikGaji Backend - Google Cloud Storage Service

This module handles the secure upload of document files to Google Cloud Storage (GCS).
GCS acts as a buffering layer between the upload endpoint and Document AI processing.

Workflow:
    1. Receive file bytes from main.py endpoint
    2. Generate unique filename using UUID to prevent collisions
    3. Upload to configured GCS bucket
    4. Return GCS URI for Document AI to process

Author: ForensikGaji Team
Created: May 2026
"""

import os
import uuid

from google.cloud import storage


def upload_to_gcs(file_bytes: bytes, filename: str) -> str:
    """
    Uploads a file to Google Cloud Storage and returns the GCS URI.

    This function creates a unique filename by prepending a UUID to the
    original filename. This prevents file collisions and provides traceability.

    Args:
        file_bytes: Raw binary content of the uploaded file
        filename: Original filename from the upload (e.g., "resume.pdf")

    Returns:
        str: GCS URI in format "gs://bucket-name/uuid-filename"
             Example: "gs://forensikgaji-uploads/a1b2c3d4-resume.pdf"

    Raises:
        GoogleCloudError: If upload fails due to authentication or permissions

    Environment Variables Required:
        GCS_BUCKET_NAME: Name of the GCS bucket to upload to

    Example:
        >>> file_data = b'%PDF-1.4...'
        >>> uri = upload_to_gcs(file_data, "candidate_resume.pdf")
        >>> print(uri)
        'gs://my-bucket/123e4567-e89b-12d3-a456-426614174000-candidate_resume.pdf'
    """
    # Initialize the Google Cloud Storage client
    # The client automatically uses Application Default Credentials (ADC)
    client = storage.Client()

    # Get the bucket name from environment variables
    bucket_name = os.getenv("GCS_BUCKET_NAME")
    bucket = client.bucket(bucket_name)

    # Generate a unique filename by prefixing with UUID
    # This prevents overwriting files with the same name
    safe_filename = f"{uuid.uuid4()}_{filename}"
    blob = bucket.blob(safe_filename)

    # Upload the file bytes to GCS
    # Content type is set to application/pdf by default
    blob.upload_from_string(file_bytes, content_type="application/pdf")

    # Return the GCS URI for Document AI to use
    return f"gs://{bucket_name}/{safe_filename}"
