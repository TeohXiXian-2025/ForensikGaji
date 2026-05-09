"""
ForensikGaji Backend - Google Cloud Document AI Service

This module handles text extraction from documents using Google Cloud Document AI.
Document AI (formerly Document Understanding AI) provides OCR capabilities with
spatial coordinate awareness, allowing us to know where text appears on the page.

Workflow:
    1. Receive GCS URI of uploaded document
    2. Configure Document AI client for the specified region
    3. Submit document to Document AI processor
    4. Extract and return full text content

Author: ForensikGaji Team
Created: May 2026
"""

import os

from google.cloud import documentai_v1 as documentai


def analyze_document(gcs_uri: str, mime_type: str = "application/pdf") -> str:
    """
    Processes a document from GCS using Document AI and returns extracted text.

    This function connects to Google Cloud Document AI, submits the document
    for OCR processing, and extracts all readable text. The extracted text
    includes spatial information (bounding boxes) which is used later for
    claim localization.

    Args:
        gcs_uri: Google Cloud Storage URI (e.g., "gs://bucket/file.pdf")
        mime_type: MIME type of the document (default: "application/pdf")

    Returns:
        str: Full extracted text from the document

    Raises:
        GoogleApiError: If Document API call fails

    Environment Variables Required:
        DOC_AI_PROJECT_ID: GCP project ID containing the Document AI processor
        DOC_AI_LOCATION: Region of the Document AI processor (e.g., "us", "asia-southeast1")
        DOC_AI_PROCESSOR_ID: ID of the Document AI processor resource

    Note:
        The Document AI processor must be created in the GCP console before use.
        Supported regions: us, eu, asia-southeast1, etc.
    """
    # Get the Document AI processor location from environment
    location = os.getenv("DOC_AI_LOCATION")

    # =========================================================================
    # CLIENT CONFIGURATION FOR REGIONAL ENDPOINTS
    # =========================================================================
    # Document AI uses regional endpoints. The default is "us", but we need
    # to configure the client options for other regions (e.g., asia-southeast1).
    client_options = {}
    if location != "us":
        # For non-US regions, specify the regional API endpoint
        client_options = {"api_endpoint": f"{location}-documentai.googleapis.com"}

    # Initialize the Document AI client with regional configuration
    client = documentai.DocumentProcessorServiceClient(client_options=client_options)

    # =========================================================================
    # BUILD THE PROCESSOR RESOURCE PATH
    # =========================================================================
    # The full resource path follows this format:
    # projects/{project}/locations/{location}/processors/{processor}
    name = client.processor_path(
        os.getenv("DOC_AI_PROJECT_ID"),
        location,
        os.getenv("DOC_AI_PROCESSOR_ID"),
    )

    # =========================================================================
    # SUBMIT DOCUMENT FOR PROCESSING
    # =========================================================================
    # Create the GCS document object for the API request
    gcs_document = documentai.GcsDocument(gcs_uri=gcs_uri, mime_type=mime_type)

    # Create the process request and send to Document AI
    request = documentai.ProcessRequest(name=name, gcs_document=gcs_document)
    result = client.process_document(request=request)

    # =========================================================================
    # EXTRACT TEXT FROM RESPONSE
    # =========================================================================
    document = result.document

    # Return the raw extracted text for Gemini to analyze
    # The .text property contains all text concatenated with newlines
    return document.text
