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

    # We keep your exact prompt logic

    prompt = f"""

    You are the final AI Risk Scoring Layer and Forensic Reconstructor for ForensikGaji.

    
    Here is the data from the lower-level systems:

    1. Extracted Text: '{extracted_text}'

    2. Hidden Text System (Layer 1): {metadata_analysis}

    3. Term Frequency System (Layer 2): {semantic_analysis}

    

    IMPORTANT CONTEXT: The current actual date is {current_date}. Do NOT flag events from 2023, 2024, 2025, or early 2026 as "future dates".

    

    Task 1: Calculate the 'ats_relevancy_score' (0-100).

    Task 2: Determine the final 'fraud_probability_score'. 100 means perfectly authentic, 0 means critical fraud.

    Task 3: DATA RECONSTRUCTION. Reconstruct original numbers if mathematical anomalies exist.

    Task 4: EXTRACT CLAIMS. Scan the resume for specific achievements. Identify 1-2 "Outstanding" claims and 1-2 "Suspicious" claims.

    Task 5: Generate 2 hard technical interview questions.

    

    Return ONLY a valid JSON object with these exact keys:

    {{

        "ats_relevancy_score": 85,

        "fraud_probability_score": 100,

        "status_color": "Green",

        "fraud_verdict": "Explanation here",

        "reconstructed_original_data": "Explanation here",

        "flagged_claims": [

            {{

                "claim": "text",

                "category": "Outstanding",

                "hr_note": "note"

            }}

        ],

        "smart_questions": ["Q1", "Q2"]

    }}

    """

    

    try:

        # Use the stable Flash model

        model = GenerativeModel("gemini-2.5-flash")

        

        # KEY CHANGE: We tell Vertex to return RAW JSON only. 

        # This prevents the "blank screen" issue caused by markdown formatting.

        response = model.generate_content(

            prompt,

            generation_config={"response_mime_type": "application/json"}

        )

        

        # No more .replace() needed! response.text is now pure JSON.

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