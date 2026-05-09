"""
ForensikGaji Backend - Pydantic Data Models

This module defines the request and response schemas used throughout the API.
These models provide automatic validation, serialization, and documentation
for the FastAPI endpoints.

Author: ForensikGaji Team
Created: May 2026
"""

from typing import List, Optional
from pydantic import BaseModel, Field


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
        description="Expert's email address for interview invitation"
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
