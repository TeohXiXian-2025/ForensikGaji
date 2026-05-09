"""
ForensikGaji Backend - Main FastAPI Application

This is the entry point for the ForensikGaji backend API server. It handles
HTTP requests from the frontend and coordinates the multi-layer forensic
document analysis pipeline.

Architecture Overview:
    1. Receives document upload via POST /api/scan-document
    2. Uploads to Google Cloud Storage for buffering
    3. Extracts text using Google Cloud Document AI (OCR)
    4. Runs Layer 1: Metadata & Pixel Analysis (fraud_engine.py)
    5. Runs Layer 2: Semantic Analysis (fraud_engine.py)
    6. Runs Layer 3: AI Reasoning via Gemini (gemini_agent.py)
    7. Locates exact coordinates of flagged claims (fraud_engine.py)
    8. Generates ELA heatmap visualization (ela_vision.py)
    9. Returns comprehensive forensic report to frontend

Author: ForensikGaji Team
Created: May 2026
Hackathon: Project 2030 - MyAI Future (Track 5: Secure Digital)
"""

import os
import traceback
import base64
from typing import List

from dotenv import load_dotenv
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware

# Import Pydantic models for request/response validation
from models import (
    ScanResponse, ExpertBookingRequest, BookingResponse,
    AuditCase, CreateCaseRequest, UpdateCaseRequest, AddFileRequest,
    FileData, FlaggedClaim
)

# Import forensic analysis service modules
from services.storage import upload_to_gcs
# Use Firestore storage (falls back to JSON if not configured)
from services.firestore_storage import (
    create_case, get_case, get_all_cases, update_case,
    add_files_to_case, delete_case
)
from services.doc_ai import analyze_document
from services.ela_vision import generate_ela_heatmap
from services.gemini_agent import generate_verdict_and_questions
from services.workspace import create_expert_interview_meet

# Import fraud detection engine functions
from services.fraud_engine import (
    analyze_metadata_layer,
    analyze_semantic_layer,
    locate_claims_in_pdf
)

# =============================================================================
# CONFIGURATION
# =============================================================================

# Load environment variables from .env file into the process environment
# This includes API keys, GCP project IDs, and bucket names
load_dotenv()

# Initialize the FastAPI application with metadata
app = FastAPI(
    title="ForensikGaji Backend API",
    description="AI-powered forensic document auditing platform",
    version="2.0.0"
)

# =============================================================================
# CORS MIDDLEWARE CONFIGURATION
# =============================================================================

# Configure Cross-Origin Resource Sharing (CORS) to allow the frontend
# to communicate with this backend. In production, replace "*" with
# specific allowed origins for security.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # TODO: Restrict to specific domains in production
    allow_methods=["*"],  # Allowed HTTP methods (GET, POST, etc.)
    allow_headers=["*"],  # Allowed HTTP headers
)


# =============================================================================
# API ENDPOINTS
# =============================================================================

@app.post("/api/scan-document")
async def scan_document_endpoint(file: UploadFile = File(...)):
    """
    Main document forensic analysis endpoint.

    This endpoint orchestrates the complete 5-layer forensic analysis pipeline:
    1. Document ingestion and Cloud Storage upload
    2. OCR text extraction via Document AI
    3. Metadata and pixel-level fraud detection
    4. Semantic analysis for keyword stuffing
    5. AI reasoning via Gemini for final verdict
    6. Claim localization for visual overlays
    7. ELA heatmap generation for tampering visualization

    Args:
        file: Uploaded document file (PDF, JPG, PNG)

    Returns:
        JSON response containing:
            - fraud_probability_score: Trust score (0-100, 100=authentic)
            - status_color: Risk indicator (Green/Yellow/Red)
            - fraud_verdict: AI-generated explanation
            - flagged_claims: List of suspicious items with coordinates
            - original_document_base64: Base64-encoded original
            - ela_heatmap_base64: Base64-encoded heatmap

    Raises:
        HTTPException: If any step in the pipeline fails
    """
    try:
        # =========================================================================
        # STEP 1: Read and classify the uploaded file
        # =========================================================================
        # Read the entire file into memory for processing
        file_bytes = await file.read()

        # Detect MIME type from the upload metadata, default to PDF if not specified
        mime_type = file.content_type if file.content_type else "application/pdf"

        # =========================================================================
        # STEP 2: Upload to Google Cloud Storage for buffering
        # =========================================================================
        # This provides a persistent location for Document AI to access the file
        gcs_uri = upload_to_gcs(file_bytes, file.filename)

        # =========================================================================
        # STEP 3: Extract text using Google Cloud Document AI (OCR)
        # =========================================================================
        # Document AI performs OCR and returns structured text with spatial data
        extracted_text = analyze_document(gcs_uri, mime_type)

        # =========================================================================
        # STEP 4: Run Layer 1 & 2 - Metadata and Semantic Fraud Detection
        # =========================================================================
        print("Running Fraud Engine Layers 1 & 2...")

        # Layer 1: Analyze PDF metadata, EXIF data, and detect manipulation tools
        metadata_results = analyze_metadata_layer(file_bytes, mime_type)

        # Layer 2: Analyze text for keyword stuffing and semantic anomalies
        semantic_results = analyze_semantic_layer(extracted_text)

        # =========================================================================
        # STEP 5: Run Layer 3 - AI Reasoning with Gemini 2.5 Flash
        # =========================================================================
        print("Running Gemini Layer 3 Risk Scoring...")

        # Synthesize all previous layers and generate the final forensic verdict
        ai_analysis = generate_verdict_and_questions(
            extracted_text,
            metadata_results,
            semantic_results
        )

        # =========================================================================
        # STEP 6: Locate exact coordinates of flagged claims in the PDF
        # =========================================================================
        print("Locating Claims on Document...")

        # This enables the frontend to draw yellow boxes around suspicious text
        ai_analysis = locate_claims_in_pdf(file_bytes, ai_analysis, mime_type)

        # =========================================================================
        # STEP 7: Generate ELA Heatmap for tampering visualization
        # =========================================================================
        print("Generating ELA Heatmap...")

        try:
            # Generate both original and heatmap images as base64 data URIs
            # The heatmap highlights areas with JPEG compression inconsistencies
            original_b64, heatmap_b64 = generate_ela_heatmap(file_bytes, mime_type)
        except Exception as heatmap_err:
            # If heatmap generation fails, continue without it
            print(f"⚠️ Heatmap skipped: {heatmap_err}")

            # Fallback: Encode the original document for display
            raw_b64 = base64.b64encode(file_bytes).decode("utf-8")
            original_b64 = f"data:{mime_type};base64,{raw_b64}"
            heatmap_b64 = None

        # =========================================================================
        # STEP 8: Assemble and return the complete forensic report
        # =========================================================================
        # Inject the base64-encoded images into the response
        ai_analysis["original_document_base64"] = original_b64
        ai_analysis["ela_heatmap_base64"] = heatmap_b64

        # Ensure response has both fraud_probability_score and trust_score for compatibility
        if "fraud_probability_score" not in ai_analysis and "trust_score" in ai_analysis:
            ai_analysis["fraud_probability_score"] = ai_analysis["trust_score"]

        print("✅ Analysis Complete! Sending to frontend.")
        return ai_analysis

    except Exception as e:
        # =========================================================================
        # ERROR HANDLING: Log detailed error information for debugging
        # =========================================================================
        print("🚨 CRITICAL BACKEND CRASH 🚨")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/book-expert", response_model=BookingResponse)
async def book_expert_endpoint(request: ExpertBookingRequest):
    """
    Expert marketplace booking endpoint.

    This endpoint creates a new expert interview booking and generates
    a Google Meet link for the session. Currently simulates Google
    Workspace Calendar API integration (full OAuth2 required for production).

    Args:
        request: Booking request with candidate email, expert email, and date

    Returns:
        BookingResponse containing the generated Meet link and confirmation message

    Raises:
        HTTPException: If booking creation fails
    """
    try:
        # Generate the Google Meet link (simulated for hackathon)
        meet_link = create_expert_interview_meet(
            request.candidate_email,
            request.expert_email,
            request.interview_date,
        )

        # Return the booking confirmation
        return BookingResponse(
            meet_link=meet_link,
            status_message="Expert Interview successfully booked and calendar invites sent.",
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# =============================================================================
# CASE MANAGEMENT API ENDPOINTS
# =============================================================================

@app.post("/api/cases", response_model=AuditCase)
async def create_audit_case(request: CreateCaseRequest):
    """
    Create a new audit case.

    This endpoint creates a new forensic audit case and generates
    a unique upload link for candidates.

    Args:
        request: Case creation request with name and document types

    Returns:
        AuditCase: The newly created case with its upload link
    """
    try:
        # Get the base URL from the request or use default
        from fastapi import Request
        # We'll pass the base URL from the frontend, or use a default
        base_url = "https://forensikgaji-frontend-381516681695.asia-southeast1.run.app"

        # Parse document types from the type string
        doc_types = [t.strip() for t in request.type.split('+') if t.strip()]

        # Create the case
        new_case = create_case(request.name, doc_types, base_url)

        return new_case
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/cases", response_model=List[AuditCase])
async def get_all_audit_cases():
    """
    Get all audit cases.

    Returns a list of all audit cases in the system.

    Returns:
        List of all AuditCase objects
    """
    try:
        return get_all_cases()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/cases/{case_id}", response_model=AuditCase)
async def get_audit_case(case_id: str):
    """
    Get a specific audit case by ID.

    Args:
        case_id: Unique case identifier

    Returns:
        AuditCase: The requested case

    Raises:
        HTTPException: If case not found
    """
    try:
        case = get_case(case_id)
        if not case:
            raise HTTPException(status_code=404, detail=f"Case {case_id} not found")
        return case
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/api/cases/{case_id}", response_model=AuditCase)
async def update_audit_case(case_id: str, request: UpdateCaseRequest):
    """
    Update an audit case.

    Args:
        case_id: Unique case identifier
        request: Update request with fields to update

    Returns:
        AuditCase: The updated case

    Raises:
        HTTPException: If case not found
    """
    try:
        # Build updates dict
        updates = {}
        if request.status is not None:
            updates['status'] = request.status
        if request.name is not None:
            updates['name'] = request.name
        if request.data is not None:
            updates['data'] = request.data.model_dump()

        updated_case = update_case(case_id, **updates)
        if not updated_case:
            raise HTTPException(status_code=404, detail=f"Case {case_id} not found")

        return updated_case
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/cases/{case_id}")
async def delete_audit_case(case_id: str):
    """
    Delete an audit case.

    Args:
        case_id: Unique case identifier

    Returns:
        Success message

    Raises:
        HTTPException: If case not found
    """
    try:
        success = delete_case(case_id)
        if not success:
            raise HTTPException(status_code=404, detail=f"Case {case_id} not found")
        return {"message": f"Case {case_id} deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/cases/{case_id}/files", response_model=AuditCase)
async def add_files_to_case_endpoint(case_id: str, request: AddFileRequest):
    """
    Add analyzed files to an audit case.

    This endpoint is called by the candidate portal after documents
    are analyzed to add the results to the case.

    Args:
        case_id: Unique case identifier
        request: AddFileRequest with list of analyzed files

    Returns:
        AuditCase: The updated case with new files

    Raises:
        HTTPException: If case not found
    """
    try:
        # Convert Pydantic models to dicts if needed
        files_data = [f.model_dump() if isinstance(f, FileData) else f for f in request.files]

        # Convert to FileData objects if they're dicts
        file_objects = []
        for f in files_data:
            if isinstance(f, dict):
                # Handle flagged_claims
                if 'flagged_claims' in f and isinstance(f['flagged_claims'], list):
                    f['flagged_claims'] = [
                        FlaggedClaim(**claim) if isinstance(claim, dict) else claim
                        for claim in f['flagged_claims']
                    ]
                file_objects.append(FileData(**f))
            else:
                file_objects.append(f)

        updated_case = add_files_to_case(case_id, file_objects)
        if not updated_case:
            raise HTTPException(status_code=404, detail=f"Case {case_id} not found")

        return updated_case
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# =============================================================================
# APPLICATION ENTRY POINT
# =============================================================================

if __name__ == "__main__":
    """
    Development server entry point.

    This block only runs when the script is executed directly (not when imported).
    It starts the Uvicorn ASGI server for local development.

    Note: In production, use 'gunicorn' or 'uvicorn' directly with proper
    worker configuration for better performance.
    """
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
