import os
import traceback
import base64
from dotenv import load_dotenv
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware

# Import models and services
from models import ScanResponse, ExpertBookingRequest, BookingResponse
from services.storage import upload_to_gcs
from services.doc_ai import analyze_document
from services.ela_vision import generate_ela_heatmap
from services.gemini_agent import generate_verdict_and_questions
from services.workspace import create_expert_interview_meet
from services.fraud_engine import analyze_metadata_layer, analyze_semantic_layer, locate_claims_in_pdf

# Load environment variables
load_dotenv()

app = FastAPI(title="ForensikGaji Backend API")

# Allow frontend to communicate with backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/api/scan-document")
async def scan_document_endpoint(file: UploadFile = File(...)):
    """The main ingestion engine for the candidate portal."""
    try:
        # 1. Read file to memory and detect type
        file_bytes = await file.read()
        mime_type = file.content_type if file.content_type else "application/pdf"

        # 2. Upload to Cloud Storage
        gcs_uri = upload_to_gcs(file_bytes, file.filename)

        # 3. Run Document AI to extract text
        extracted_text = analyze_document(gcs_uri, mime_type)

        print("Running Fraud Engine Layers 1 & 2...")
        # 4. RUN METADATA & SEMANTIC FRAUD LAYERS
        metadata_results = analyze_metadata_layer(file_bytes, mime_type)
        semantic_results = analyze_semantic_layer(extracted_text)

        print("Running Gemini Layer 3 Risk Scoring...")
        # 5. RUN THE BRAIN
        ai_analysis = generate_verdict_and_questions(
            extracted_text, 
            metadata_results, 
            semantic_results
        )

        print("Locating Claims on Document...")
        # 6. Find the exact X/Y coordinates of the flagged claims!
        ai_analysis = locate_claims_in_pdf(file_bytes, ai_analysis, mime_type)

        print("Generating ELA Heatmap...")
        try:
            # Catch BOTH perfectly stitched multi-page images
            original_b64, heatmap_b64 = generate_ela_heatmap(file_bytes, mime_type)
        except Exception as heatmap_err:
            print(f"⚠️ Heatmap skipped: {heatmap_err}")
            raw_b64 = base64.b64encode(file_bytes).decode("utf-8")
            original_b64 = f"data:{mime_type};base64,{raw_b64}"
            heatmap_b64 = None

        # 7. Inject BOTH images into the final JSON payload
        ai_analysis["original_document_base64"] = original_b64
        ai_analysis["ela_heatmap_base64"] = heatmap_b64
        
        print("✅ Analysis Complete! Sending to frontend.")
        return ai_analysis

    except Exception as e:
        print("🚨 CRITICAL BACKEND CRASH 🚨")
        traceback.print_exc()  
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/book-expert", response_model=BookingResponse)
async def book_expert_endpoint(request: ExpertBookingRequest):
    """The Expert Marketplace integration."""
    try:
        meet_link = create_expert_interview_meet(
            request.candidate_email,
            request.expert_email,
            request.interview_date,
        )
        return BookingResponse(
            meet_link=meet_link,
            status_message="Expert Interview successfully booked and calendar invites sent.",
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)