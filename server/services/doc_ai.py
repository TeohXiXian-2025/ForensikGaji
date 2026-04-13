import os

from google.cloud import documentai_v1 as documentai


def analyze_document(gcs_uri: str, mime_type: str = "application/pdf") -> str:
    """Processes document from GCS using Document AI and returns extracted text."""

    location = os.getenv("DOC_AI_LOCATION")

    # NEW LOGIC: Tell the client exactly which regional server to hit
    client_options = {}
    if location != "us":
        client_options = {"api_endpoint": f"{location}-documentai.googleapis.com"}

    client = documentai.DocumentProcessorServiceClient(client_options=client_options)

    name = client.processor_path(
        os.getenv("DOC_AI_PROJECT_ID"),
        location,
        os.getenv("DOC_AI_PROCESSOR_ID"),
    )

    gcs_document = documentai.GcsDocument(gcs_uri=gcs_uri, mime_type=mime_type)
    request = documentai.ProcessRequest(name=name, gcs_document=gcs_document)

    result = client.process_document(request=request)
    document = result.document

    # Return the raw extracted text for Gemini to analyze
    return document.text
