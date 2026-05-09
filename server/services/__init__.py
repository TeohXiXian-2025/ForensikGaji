"""
ForensikGaji Backend - Services Package

This package contains the core business logic modules for the forensic
document analysis pipeline. Each service handles a specific aspect of
the multi-layer fraud detection system.

Modules:
    doc_ai: Google Cloud Document AI integration for OCR text extraction
    ela_vision: Error Level Analysis and heatmap generation
    fraud_engine: Metadata analysis and semantic fraud detection
    gemini_agent: AI reasoning layer using Gemini 2.5 Flash
    storage: Google Cloud Storage upload functionality
    workspace: Google Workspace Calendar integration (simulated)

Author: ForensikGaji Team
Created: May 2026
Hackathon: Project 2030 - MyAI Future (Track 5: Secure Digital)
"""

# Export main functions for easier importing
from .doc_ai import analyze_document
from .ela_vision import generate_ela_heatmap
from .fraud_engine import analyze_metadata_layer, analyze_semantic_layer, locate_claims_in_pdf
from .gemini_agent import generate_verdict_and_questions
from .storage import upload_to_gcs
from .workspace import create_expert_interview_meet

__all__ = [
    "analyze_document",
    "generate_ela_heatmap",
    "analyze_metadata_layer",
    "analyze_semantic_layer",
    "locate_claims_in_pdf",
    "generate_verdict_and_questions",
    "upload_to_gcs",
    "create_expert_interview_meet",
]
