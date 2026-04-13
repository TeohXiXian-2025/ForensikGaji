import os
import uuid

from google.cloud import storage


def upload_to_gcs(file_bytes: bytes, filename: str) -> str:
    """Uploads a file to Google Cloud Storage and returns the GCS URI."""
    client = storage.Client()
    bucket_name = os.getenv("GCS_BUCKET_NAME")
    bucket = client.bucket(bucket_name)

    # Create a unique filename to prevent overwrites
    safe_filename = f"{uuid.uuid4()}_{filename}"
    blob = bucket.blob(safe_filename)

    blob.upload_from_string(file_bytes, content_type="application/pdf")
    return f"gs://{bucket_name}/{safe_filename}"
