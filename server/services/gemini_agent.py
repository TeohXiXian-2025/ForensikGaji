import os
import json
from datetime import datetime
import vertexai
from vertexai.generative_models import GenerativeModel

def generate_verdict_and_questions(extracted_text: str, metadata_analysis: dict, semantic_analysis: dict) -> dict:
    """LAYER 3: Synthesizes metadata, math, and NLP context using Vertex AI Enterprise."""
    
    current_date = datetime.now().strftime("%B %Y")
    
    # 1. Initialize Vertex AI
    vertexai.init(
        project=os.getenv("DOC_AI_PROJECT_ID"), 
        location="asia-southeast1"
    )
    
    prompt = f"""
    You are an Expert Technical Recruiter and Lead Forensic Document Examiner for the ForensikGaji HR platform. 
    Your job is to read between the lines of a candidate's document to assess their reliability, pinpoint logical inconsistencies, detect "sugar-coated" claims, and evaluate forensic integrity.

    INPUT DATA:
    1. Extracted Text: '{extracted_text}'
    2. Layer 1 (Metadata & Pixel Analysis): {metadata_analysis}
    3. Layer 2 (Semantic Analysis): {semantic_analysis}

    IMPORTANT CONTEXT: The current actual date is {current_date}. Do NOT flag events from 2023, 2024, 2025, or early 2026 as "future dates".

    CRITICAL INSTRUCTIONS & GUARDRAILS:
    1. NEVER INVENT VISUAL EVIDENCE: Do not mention "Error Level Analysis", "ELA", "Heatmaps", or "Red Boxes" in your fraud_verdict UNLESS the Layer 1 input data explicitly states that visual tampering was detected. 
    2. CITE REAL REASONS: If the fraud score is low because of Canva metadata, script generation tools, or keyword stuffing, state exactly that in the verdict. Do not make up visual pixel tampering.
    3. SCORE ENFORCEMENT: If Layer 1 detects Canva, Photoshop, or any suspicious software metadata, you MUST force the 'fraud_probability_score' to be strictly between 10 and 25. Do not output a high score if fabrication is detected.
    4. HR ANALYSIS & DOCUMENT TYPE CONTEXT: 
       - If the Extracted Text appears to be a RESUME/CV: The 'fraud_verdict' must focus on analyzing the candidate's key strengths, potential exaggerations, and timeline overlaps. Frame suspicious text as "Areas to verify during the interview".
       - If the Extracted Text appears to be an OFFICIAL DOCUMENT (Receipt, Certificate, ID): The 'fraud_verdict' must focus strictly on forensic integrity, manipulation, and mathematical/logical discrepancies.

    🔥 STRICT RULE FOR 'claim' FIELD:
    The "claim" string MUST be EXACTLY 1 TO 3 WORDS. Extract the exact short target (e.g., "060502-06-0978", "A+", "tertinggi"). Do NOT write full sentences here, or the UI locator will fail.

    TASKS:
    Task 1: Calculate 'ats_relevancy_score' (0-100) based on how well skills match industry profiles.
    Task 2: Determine 'fraud_probability_score' (0-100). Obey Rule 3 strictly.
    Task 3: Note any timeline gaps or anomalies in 'reconstructed_original_data'.
    Task 4: Identify 1 "Outstanding" claim (a strength) and 1-2 "Areas for Clarification" (exaggerated or forensically flagged claims).
    Task 5: For every flagged claim, generate a specific, hard behavioral or technical interview question designed to verify it.

    Return ONLY a valid JSON object with these exact keys:
    {{
        "ats_relevancy_score": 85,
        "fraud_probability_score": 15,
        "status_color": "Red",
        "fraud_verdict": "Executive summary based on the Document Type Context rule (Resume strengths vs. Document forensics).",
        "reconstructed_original_data": "Explanation of any timeline gaps/overlaps, or 'None'.",
        "flagged_claims": [
            {{
                "claim": "EXACT_SHORT_TARGET", 
                "category": "Outstanding or Clarification Needed",
                "hr_note": "A note explaining why this is a strength or why it seems sugar-coated/tampered.",
                "interview_question": "A specific follow-up question the recruiter should ask to verify this exact claim."
            }}
        ]
    }}
    """
    try:
        # Use the stable Flash model
        model = GenerativeModel("gemini-2.5-flash")
        
        # KEY CHANGE: Tell Vertex to return RAW JSON only.
        response = model.generate_content(
            prompt,
            generation_config={"response_mime_type": "application/json"}
        )
        
        return json.loads(response.text)
        
    except Exception as e:
        print("--- VERTEX AI CRASH REPORT ---")
        print(f"Error: {e}")
        return {
            "ats_relevancy_score": 0,
            "fraud_probability_score": 50,
            "status_color": "Yellow",
            "fraud_verdict": f"AI Analysis failed. Error: {str(e)}",
            "reconstructed_original_data": "None",
            "flagged_claims": [],
            "smart_questions": []
        }