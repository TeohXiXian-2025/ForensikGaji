"""
ForensikGaji Backend - Gemini AI Agent Service

This module implements Layer 3 of the forensic analysis pipeline: Agentic AI Reasoning.
It uses Google Gemini 2.5 Flash to synthesize all previous analysis layers and generate:
1. Final trust score (0-100, where 100 = authentic)
2. Risk status color (Green/Yellow/Red)
3. Narrative forensic verdict
4. Flagged claims with interview questions
5. Timeline reconstruction

Author: ForensikGaji Team
Created: May 2026
"""

import os
import json
from datetime import datetime
import vertexai
from vertexai.generative_models import GenerativeModel


def generate_verdict_and_questions(extracted_text: str, metadata_analysis: dict, semantic_analysis: dict) -> dict:
    """
    Layer 3: Synthesizes metadata, semantic, and context using Gemini AI.

    This function constructs a detailed prompt with all previous analysis results
    and sends it to Gemini 2.5 Flash for reasoning. The AI evaluates the document
    for authenticity, identifies suspicious claims, and generates targeted
    interview questions.

    Scoring Logic (IMPORTANT - Reverse Score):
        - 100 = PERFECTLY SAFE / AUTHENTIC
        - 0 = COMPLETE FRAUD
        - Start at 100, deduct for issues
        - CRITICAL anomalies in Layer 1 → score 10-25
        - Content penalties → deduct 5-30 points

    Args:
        extracted_text: Raw text extracted from document by Document AI
        metadata_analysis: Results from Layer 1 (metadata, ELA, cloning)
        semantic_analysis: Results from Layer 2 (keyword stuffing)

    Returns:
        dict: Complete forensic analysis containing:
            - ats_relevancy_score: ATS matching score (0-100)
            - fraud_probability_score: Trust score (0-100, 100=authentic)
            - status_color: Risk indicator (Green/Yellow/Red)
            - fraud_verdict: AI-generated explanation
            - reconstructed_original_data: Timeline analysis
            - flagged_claims: List of suspicious claims with interview questions

    Example:
        >>> result = generate_verdict_and_questions(
        ...     "John Doe - Senior Software Engineer...",
        ...     {"suspicious_metadata": False, ...},
        ...     {"stuffing_detected": True, ...}
        ... )
        >>> print(result["status_color"])
        'Yellow'
    """
    # Get current date for timeline validation
    current_date = datetime.now().strftime("%B %Y")

    # =========================================================================
    # VERTEX AI INITIALIZATION
    # =========================================================================
    # Initialize Vertex AI with project and location from environment
    vertexai.init(
        project=os.getenv("DOC_AI_PROJECT_ID"),
        location="asia-southeast1"  # Use Singapore region for low latency
    )

    # =========================================================================
    # PROMPT ENGINEERING
    # =========================================================================
    # Construct a detailed prompt that guides Gemini's reasoning process
    prompt = f"""
    You are ForensikGaji, a strict HR Document Forensic AI.

    INPUT DATA:
    1. Extracted Text: '{extracted_text}'
    2. Layer 1 (Metadata & Pixel Analysis): {metadata_analysis}
    3. Layer 2 (Semantic Analysis): {semantic_analysis}

    IMPORTANT CONTEXT: The current actual date is {current_date}.
    Do NOT flag events from 2023, 2024, 2025, or early 2026 as "future dates".

    RULES FOR THE SCORE (0-100):
    1. VARIABLE NAME FIX: The key you must output is named 'fraud_probability_score',
       BUT it is displayed to the user as a "TRUST SCORE".
    2. Therefore, 100 = PERFECTLY SAFE / AUTHENTIC. 0 = COMPLETE FRAUD.
    3. Start every document at 100.
    4. ABSOLUTE OVERRIDE: If the Layer 1 'structural_anomalies' array contains ANY
       "CRITICAL" warnings, you MUST set the score between 10 and 25.
    5. CONTENT PENALTIES: If Layer 1 is structurally clean, DO NOT automatically
       give a 100. You MUST deduct 5 to 30 points if you detect logical contradictions,
       highly exaggerated claims, impossible dates, or if Layer 2 detects "keyword stuffing".
       A normal, honest resume scores 95-100. A highly exaggerated or illogical resume
       should drop to 70-85.

    RULES FOR FLAGGED CLAIMS (Yellow Boxes):
    1. DIVISION OF LABOR: The system's ELA Heatmap (Red Boxes) already handles all
       visual tampering. DO NOT create Yellow Boxes for Canva, metadata, or pixel tampering.
    2. THE INTERVIEWER'S TOOL: Yellow Boxes are ONLY for the HR Interviewer.
       Flag 2-3 logical contradictions, timeline anomalies, OR impressive skills.
    3. The "claim" field MUST BE AN EXACT, WORD-FOR-WORD QUOTE from the document.
       Keep it exactly 1 to 3 words. Do not summarize or the UI box will fail to target it.
    4. In the "interview_question" field, generate a highly specific, hard question
       to verify the candidate's knowledge or logic regarding this specific yellow-boxed claim.

    TASKS:
    Task 1: Calculate 'ats_relevancy_score' (0-100).
    Task 2: Determine 'fraud_probability_score' (0-100). Obey the 100=Safe and
            Content Penalty rules strictly.
    Task 3: Note any timeline gaps or anomalies in 'reconstructed_original_data'.
    Task 4: Identify 2-3 logical claims or skills for the interviewer to focus on.
    Task 5: Generate specific interview questions for those flagged claims.

    Return ONLY a valid JSON object matching this exact structure:
    {{
        "ats_relevancy_score": 85,
        "fraud_probability_score": 100,
        "status_color": "Green",
        "fraud_verdict": "Executive summary explaining why the document is safe or why points were deducted for content.",
        "reconstructed_original_data": "Timeline notes",
        "flagged_claims": [
            {{
                "claim": "EXACT_SHORT_TARGET",
                "category": "Clarification Needed",
                "hr_note": "Why this logical claim is impressive or needs verbal verification.",
                "interview_question": "A specific interview question."
            }}
        ]
    }}
    """

    try:
        # =====================================================================
        # GEMINI API CALL
        # =====================================================================
        # Initialize the Gemini 2.5 Flash model
        model = GenerativeModel("gemini-2.5-flash")

        # Generate content with JSON response format
        response = model.generate_content(
            prompt,
            generation_config={"response_mime_type": "application/json"}
        )

        # Parse and return the JSON response
        return json.loads(response.text)

    except Exception as e:
        # =====================================================================
        # ERROR HANDLING: Return safe fallback response
        # =====================================================================
        print("--- VERTEX AI CRASH REPORT ---")
        print(f"Error: {e}")

        # Return neutral response if AI fails
        return {
            "ats_relevancy_score": 0,
            "fraud_probability_score": 50,
            "status_color": "Yellow",
            "fraud_verdict": f"AI Analysis failed. Error: {str(e)}",
            "reconstructed_original_data": "None",
            "flagged_claims": []
        }
