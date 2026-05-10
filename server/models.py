"""
ForensikGaji Backend - Pydantic Data Models

This module defines the request and response schemas used throughout the API.
These models provide automatic validation, serialization, and documentation
for the FastAPI endpoints.

Author: ForensikGaji Team
Created: May 2026
"""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime


class FlaggedClaim(BaseModel):
    """A flagged claim with location and interview data."""
    claim: str = Field(..., description="The suspicious text extracted from the document")
    hr_note: str = Field(..., description="Explanation of why this claim is suspicious")
    interview_question: Optional[str] = Field(None, description="Suggested interview question")
    x_position: Optional[float] = Field(None, description="X coordinate as percentage")
    y_position: Optional[float] = Field(None, description="Y coordinate as percentage")
    box_width: Optional[float] = Field(None, description="Width as percentage")
    box_height: Optional[float] = Field(None, description="Height as percentage")
    box_hidden: Optional[bool] = Field(False, description="Whether to hide the box in the UI")
    page_num: Optional[int] = Field(None, description="Page number where claim was found")


class FileData(BaseModel):
    """Data for a single analyzed file."""
    name: str = Field(..., description="File name")
    score: int = Field(..., description="Trust score (0-100)")
    issue: str = Field(..., description="Fraud verdict")
    flagged_claims: List[FlaggedClaim] = Field(default_factory=list, description="List of flagged claims")
    ela_heatmap_url: Optional[str] = Field(None, description="GCS URL for ELA heatmap")
    original_document_url: Optional[str] = Field(None, description="GCS URL for original document")
    heatmap: Optional[str] = Field(None, description="Base64 ELA heatmap (fallback)")
    original: Optional[str] = Field(None, description="Base64 original document (fallback)")
    investigation_status: Optional[str] = Field("Unreviewed", description="Investigation status")


class CaseData(BaseModel):
    """Data associated with a completed case."""
    score: int = Field(..., description="Average trust score")
    date: str = Field(..., description="Analysis date")
    clash_detected: bool = Field(False, description="Whether conflicts were detected")
    files: List[FileData] = Field(default_factory=list, description="List of analyzed files")


class AuditCase(BaseModel):
    """An audit case (forensic investigation)."""
    id: str = Field(..., description="Unique case identifier")
    name: str = Field(..., description="Case name")
    type: str = Field(..., description="Document types (e.g., 'Resume + Payslip')")
    status: str = Field(..., description="Status: 'waiting', 'processing', or 'completed'")
    link: str = Field(..., description="Candidate upload link")
    data: Optional[CaseData] = Field(None, description="Case data (when analysis complete)")
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat(), description="Creation timestamp")
    updated_at: str = Field(default_factory=lambda: datetime.now().isoformat(), description="Last update timestamp")


class CreateCaseRequest(BaseModel):
    """Request to create a new audit case."""
    name: str = Field(..., description="Case name")
    type: str = Field(..., description="Document types requested")


class UpdateCaseRequest(BaseModel):
    """Request to update an audit case."""
    status: Optional[str] = Field(None, description="New status")
    data: Optional[CaseData] = Field(None, description="Updated case data")
    name: Optional[str] = Field(None, description="New case name")


class AddFileRequest(BaseModel):
    """Request to add analysis results to a case."""
    files: List[FileData] = Field(..., description="List of analyzed files to add")


class ScanResponse(BaseModel):
    """
    Response model for the document scan endpoint.

    This model contains the complete forensic analysis results including
    trust scores, flagged claims, and visual heatmap data.

    Attributes:
        trust_score: Overall authenticity score (0-100, where 100 is authentic)
        status_color: Risk indicator color (Green/Yellow/Red)
        fraud_verdict: Natural language explanation of the analysis
        smart_questions: Generated behavioral interview questions
        ela_heatmap_base64: Base64-encoded ELA heatmap image (optional)
    """
    trust_score: int = Field(
        ...,
        ge=0,
        le=100,
        description="Overall trust score from 0 (complete fraud) to 100 (authentic)"
    )
    status_color: str = Field(
        ...,
        description="Risk level indicator: 'Green' (safe), 'Yellow' (caution), or 'Red' (critical)"
    )
    fraud_verdict: str = Field(
        ...,
        description="AI-generated narrative explaining the forensic findings"
    )
    smart_questions: List[str] = Field(
        default_factory=list,
        description="List of behavioral interview questions based on flagged claims"
    )
    ela_heatmap_base64: Optional[str] = Field(
        default=None,
        description="Base64-encoded ELA heatmap image data URI"
    )
    ela_heatmap_url: Optional[str] = Field(
        default=None,
        description="GCS URL for ELA heatmap (preferred over base64)"
    )
    flagged_claims: Optional[List[Dict[str, Any]]] = Field(
        default_factory=list,
        description="List of flagged claims with coordinates"
    )
    fraud_probability_score: Optional[int] = Field(
        None,
        description="Alias for trust_score (0-100, higher = more authentic)"
    )
    original_document_base64: Optional[str] = Field(
        default=None,
        description="Base64-encoded original document"
    )
    original_document_url: Optional[str] = Field(
        default=None,
        description="GCS URL for original document (preferred over base64)"
    )


class ExpertBookingRequest(BaseModel):
    """
    Request model for booking an expert interview.

    This model validates the input required to create a new expert
    interview booking with calendar integration.

    Attributes:
        candidate_email: Email address of the candidate being interviewed
        expert_email: Email address of the expert conducting the interview
        interview_date: ISO 8601 formatted date/time string for the interview
    """
    candidate_email: str = Field(
        ...,
        pattern=r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$",
        description="Candidate's email address for interview invitation"
    )
    expert_email: str = Field(
        ...,
        pattern=r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$",
        description="Expert's email address for expert invitation"
    )
    interview_date: str = Field(
        ...,
        description="Interview date and time in ISO 8601 format (e.g., 2026-05-15T10:00:00Z)"
    )


class BookingResponse(BaseModel):
    """
    Response model for successful expert booking.

    This model returns the details of a successfully created
    expert interview booking.

    Attributes:
        meet_link: Google Meet link for the scheduled interview
        status_message: Confirmation message with booking details
    """
    meet_link: str = Field(
        ...,
        description="Google Meet URL for the interview session"
    )
    status_message: str = Field(
        ...,
        description="Human-readable confirmation message"
    )
