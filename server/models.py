from typing import List, Optional

from pydantic import BaseModel


class ScanResponse(BaseModel):
    trust_score: int
    status_color: str  # Green, Yellow, Red
    fraud_verdict: str
    smart_questions: List[str]
    ela_heatmap_base64: Optional[str] = None


class ExpertBookingRequest(BaseModel):
    candidate_email: str
    expert_email: str
    interview_date: str  # ISO format


class BookingResponse(BaseModel):
    meet_link: str
    status_message: str
