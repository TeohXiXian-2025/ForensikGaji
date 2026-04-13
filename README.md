# 🔍 ForensikGaji: Sovereign Digital Document Defense

[![Deployed on Google Cloud Run](https://img.shields.io/badge/Deployed_on-Google_Cloud_Run-blue?logo=googlecloud)](https://forensikgaji-frontend-163354028310.asia-southeast1.run.app)
[![Powered by Gemini](https://img.shields.io/badge/Powered_by-Google_Gemini-orange?logo=google)](https://ai.google.dev/)
[![Track: Secure Digital](https://img.shields.io/badge/Track-Secure_Digital-success)](#)

**🚨 LIVE APPLICATION:** [Click here to launch the ForensikGaji Portal](https://forensikgaji-frontend-163354028310.asia-southeast1.run.app)  

ForensikGaji is an AI-powered forensic document auditing platform engineered for **Project 2030: MyAI Future Hackathon**. Designed to tackle **Track 5: Secure Digital**, this platform protects the integrity of the Malaysian digital economy by verifying professional and financial documents (payslips, medical certificates, receipts) against pixel-level manipulation and semantic fraud.

---

## ✨ Feature List

Our platform transitions document verification from manual guesswork to autonomous Agentic AI execution:

* **Pixel-Level Forensic Vision:** Utilizes Error Level Analysis (ELA) via OpenCV to generate visual heatmaps, immediately highlighting spliced or digitally altered regions of a document.
* **Autonomous Semantic Auditing:** Google Gemini 2.5 acts as the central brain, cross-referencing extracted text, dates, and mathematical totals to flag logical impossibilities.
* **Instant Risk Scoring:** Provides HR managers and financial auditors with a definitive "Trust Score" and human-readable fraud verdict in seconds.
* **Expert Marketplace Integration:** Seamlessly connect flagged cases with human forensic experts, generating automated Google Meet calendar invites via the Google Workspace API.

---

## 🏗️ Architectural Overview

ForensikGaji is built on a highly scalable, serverless microservice architecture deployed entirely within the **Google Cloud Ecosystem**.

### The Cloud Stack
1. **Frontend (Client):** A responsive, state-driven React.js single-page application built with Vite.
2. **Backend (API Gateway):** A high-performance Python FastAPI server, fully containerized via Docker.
3. **Deployment:** Both frontend and backend are deployed as independent, auto-scaling services on **Google Cloud Run**.

### The AI Pipeline (The Fraud Engine)
When a document is uploaded, it triggers a multi-stage autonomous pipeline:
1. **Ingestion:** Document is securely buffered into a **Google Cloud Storage (GCS)** bucket.
2. **Extraction:** **Google Cloud Document AI (OCR)** parses the raw text and spatial coordinates.
3. **Vision Layer:** Python/OpenCV processes the raw bytes to generate the ELA Heatmap.
4. **Agentic Layer:** **Google Gemini API** ingests the OCR data and metadata to perform reasoning, logic checks, and final scoring.

---

## ⚙️ Local Setup & Installation

To run ForensikGaji locally for development or testing, follow these steps. 

### Prerequisites
* Node.js (v20+)
* Python (3.10+)
* A Google Cloud Project with Billing Enabled (for GCS and Document AI)
* A Google Gemini API Key

### 1. Backend Setup (FastAPI)
Open your terminal and navigate to the backend directory:
```bash
cd server
```
Install the required Python dependencies:
```bash
pip install -r requirements.txt
```
Create a `.env` file in the `server` directory and add your keys:
```env
GEMINI_API_KEY=your_api_key_here
DOC_AI_PROJECT_ID=your_gcp_project_id
DOC_AI_LOCATION=us
DOC_AI_PROCESSOR_ID=your_doc_ai_processor_id
GCS_BUCKET_NAME=your_cloud_storage_bucket_name
```
Start the backend server:
```bash
uvicorn main:app --reload
```
*The backend will now be running on `http://localhost:8000`*

### 2. Frontend Setup (React)
Open a new terminal window and navigate to the frontend directory:
```bash
cd frontend
```
Install the necessary Node modules:
```bash
npm install
```
Start the Vite development server:
```bash
npm run dev
```
*The frontend will now be running on `http://localhost:5173`*

---

## 🛡️ Security & Scalability
* **Stateless Processing:** The backend container processes requests entirely in memory, ensuring zero data leakage between sessions.
* **Secret Management:** All Google Cloud credentials and API keys in production are securely injected via Google Cloud Run's native Secret Manager.
* **CORS Protection:** Strict origin headers prevent unauthorized domains from pinging the inference engine.
