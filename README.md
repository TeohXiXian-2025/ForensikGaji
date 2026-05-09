# ForensikGaji

## Sovereign Digital Document Defense & Forensic Auditing Platform

[![Deployed on Google Cloud Run](https://img.shields.io/badge/Deployed_on-Google_Cloud_Run-blue?logo=googlecloud)](https://forensikgaji-frontend-381516681695.asia-southeast1.run.app)
[![Powered by Gemini 2.0](https://img.shields.io/badge/Powered_by-Google_Gemini_2.5_Flash-orange?logo=google)](https://ai.google.dev/)
[![Track: Secure Digital](https://img.shields.io/badge/Track-Secure_Digital-success)](#)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

**Live Application:** [https://forensikgaji-frontend-381516681695.asia-southeast1.run.app](https://forensikgaji-frontend-381516681695.asia-southeast1.run.app)

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Technology Stack](#technology-stack)
- [Installation & Setup](#installation--setup)
- [Environment Variables](#environment-variables)
- [API Documentation](#api-documentation)
- [Development](#development)
- [Deployment](#deployment)
- [Security & Scalability](#security--scalability)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

**ForensikGaji** is an enterprise-grade AI-powered forensic document auditing platform engineered for the **Project 2030: MyAI Future Hackathon**. Designed for **Track 5: Secure Digital**, this solution safeguards the integrity of the Malaysian digital economy by verifying professional and financial documents—including payslips, medical certificates, receipts, and resumes—against pixel-level manipulation and semantic fraud.

### Problem Statement

In today's digital landscape, document forgery has become increasingly sophisticated. Traditional verification methods are manual, error-prone, and cannot detect:
- Pixel-level manipulation and splicing
- Vector text injection over scanned documents
- Semantic inconsistencies and logical contradictions
- AI-generated fraudulent content

### Our Solution

ForensikGaji leverages multi-layered forensic analysis combining computer vision, metadata inspection, and agentic AI reasoning to provide autonomous, scalable document verification with precision matching human forensic experts.

---

## Features

### Core Capabilities

| Feature | Description |
|---------|-------------|
| **Multi-Layer Forensic Vision** | Error Level Analysis (ELA) and Digital Sharpness Detection via OpenCV to generate heatmaps highlighting spliced text and digital insertions |
| **Agentic Reasoning Layer** | Powered by **Gemini 2.5 Flash**—identifies "Outstanding Claims" vs. "Areas for Clarification" with narrative forensic verdicts |
| **Behavioral Interview Synthesis** | AI-generated specific, hard-hitting behavioral interview questions for each flagged anomaly |
| **Executive Risk Dashboard** | Real-time analytics showing risk distribution (Authentic vs. Critical) across talent pipeline |
| **Hybrid Ingestion Methods** | Secure "Audit Links" for candidates + "Direct HR Uploads" for immediate batch processing |
| **Expert Marketplace Integration** | Vetted ecosystem of technical leads—book experts directly from high-risk audit cases |

### User Interface

- **Premium Minimalist Glass Design** — Modern, accessible interface with glassmorphism tokens
- **Real-time Document Overlay** — Visual annotation of flagged claims directly on documents
- **Multi-tab SPA Architecture** — Dashboard, Marketplace, Registration, and Candidate Portal
- **Cross-tab State Synchronization** — BroadcastChannel for seamless multi-window workflows

---

## Architecture

### System Overview

```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│   Frontend      │      │    Backend      │      │   Google Cloud  │
│   (React/Vite)  │◄────►│   (FastAPI)     │◄────►│   Services      │
│   Cloud Run     │      │   Cloud Run     │      │   (GCS, DocAI)  │
└─────────────────┘      └─────────────────┘      └─────────────────┘
                                │
                                ▼
                        ┌─────────────────┐
                        │   Gemini 2.5    │
                        │   Flash AI      │
                        └─────────────────┘
```

### The AI Pipeline (Fraud Engine)

When a document is uploaded, it triggers a **5-stage autonomous forensic pipeline**:

```
1. INGESTION
   ├─ Document uploaded to Google Cloud Storage (GCS)
   └─ Secure buffering with UUID-based naming

2. EXTRACTION (Google Cloud Document AI - OCR)
   ├─ Parse raw text and spatial coordinates
   └─ Return structured text for analysis

3. LAYER 1: Metadata & Pixel Analysis
   ├─ Detect manipulation tools (Canva, Photoshop, etc.)
   ├─ PDF structure analysis (image/text coverage ratios)
   ├─ Copy-move cloning detection via DCT coefficients
   └─ Exif data inspection

4. LAYER 2: Semantic Analysis
   ├─ Keyword stuffing detection
   ├─ Frequency analysis
   └─ Pattern anomaly detection

5. LAYER 3: Agentic AI Reasoning (Gemini 2.5 Flash)
   ├─ Synthesize all previous layers
   ├─ Generate trust score (0-100, where 100 = authentic)
   ├─ Create behavioral interview questions
   └─ Provide narrative forensic verdict

6. LAYER 4: ELA Heatmap Generation
   ├─ Error Level Analysis (JPEG compression artifacts)
   ├─ Wavelet decomposition for invisible pastes
   └─ Vector injection detection with visual overlays
```

---

## Project Structure

```
ForensikGaji/
├── frontend/                    # React + Vite Frontend Application
│   ├── src/
│   │   ├── App.jsx              # Main SPA with routing & state management
│   │   ├── constants.js         # Expert marketplace mock data
│   │   ├── main.jsx             # React entry point
│   │   ├── index.css            # Global styles & Tailwind config
│   │   └── App.css              # Component-specific styles
│   ├── Dockerfile               # Frontend container build config
│   ├── package.json             # Node dependencies
│   └── vite.config.js           # Vite build configuration
│
├── server/                      # FastAPI Backend Application
│   ├── main.py                  # API entry point & endpoints
│   ├── models.py                # Pydantic request/response models
│   ├── requirements.txt         # Python dependencies
│   ├── services/                # Business logic layer
│   │   ├── doc_ai.py            # Google Cloud Document AI integration
│   │   ├── ela_vision.py        # ELA heatmap generation
│   │   ├── fraud_engine.py      # Metadata & semantic analysis
│   │   ├── gemini_agent.py      # Gemini AI reasoning layer
│   │   ├── storage.py           # GCS upload logic
│   │   └── workspace.py         # Google Workspace integration (mock)
│   └── Dockerfile               # Backend container build config
│
├── README.md                    # This file
└── requirements.txt             # Root Python requirements (legacy)
```

---

## Technology Stack

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| React | 19.2.4 | UI Framework |
| Vite | 8.0.4 | Build Tool & Dev Server |
| Tailwind CSS | 4.2.2 | Utility-First CSS |
| Lucide React | 1.7.0 | Icon Library |
| Nginx | stable-alpine | Production Web Server |

### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| Python | 3.10+ | Runtime Environment |
| FastAPI | 0.135.3 | Web Framework |
| Uvicorn | 0.44.0 | ASGI Server |
| PyMuPDF | 1.27.2.2 | PDF Processing |
| OpenCV | 4.13.0 | Computer Vision |
| PyWavelets | 1.4.1+ | Wavelet Decomposition |

### Google Cloud Services
| Service | Purpose |
|---------|---------|
| Cloud Run | Serverless Container Deployment |
| Cloud Storage | Document Buffering & Storage |
| Document AI | OCR Text Extraction |
| Vertex AI | Gemini 2.5 Flash Integration |
| Secret Manager | Secure Credential Management (Production) |

---

## Installation & Setup

### Prerequisites

- **Node.js** (v20 or higher)
- **Python** (3.10 or higher)
- **Docker** (for containerized deployment)
- **Google Cloud Project** with billing enabled
- **Google Gemini API Key**

---

### Backend Setup

1. **Navigate to the backend directory:**
   ```bash
   cd server
   ```

2. **Install Python dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure environment variables:**
   Create a `.env` file in the `server` directory:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   DOC_AI_PROJECT_ID=your_gcp_project_id
   DOC_AI_LOCATION=asia-southeast1
   DOC_AI_PROCESSOR_ID=your_doc_ai_processor_id
   GCS_BUCKET_NAME=your_cloud_storage_bucket_name
   ```

4. **Start the development server:**
   ```bash
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```
   > The backend will be available at `http://localhost:8000`
   > API Documentation: `http://localhost:8000/docs`

---

### Frontend Setup

1. **Navigate to the frontend directory:**
   ```bash
   cd frontend
   ```

2. **Install Node dependencies:**
   ```bash
   npm install
   ```

3. **Start the Vite development server:**
   ```bash
   npm run dev
   ```
   > The frontend will be available at `http://localhost:5173`

---

## Environment Variables

### Backend (.env)

| Variable | Description | Example |
|----------|-------------|---------|
| `GEMINI_API_KEY` | Google Gemini API key for AI reasoning | `AIzaSy...` |
| `DOC_AI_PROJECT_ID` | Google Cloud Project ID | `my-project-123` |
| `DOC_AI_LOCATION` | Document AI processor region | `asia-southeast1` |
| `DOC_AI_PROCESSOR_ID` | Document AI processor ID | `abc-123-def-456` |
| `GCS_BUCKET_NAME` | Cloud Storage bucket name | `forensikgaji-uploads` |

---

## API Documentation

### Endpoints

#### 1. Scan Document

**Endpoint:** `POST /api/scan-document`

**Description:** Main ingestion endpoint for document forensic analysis.

**Request:**
- Content-Type: `multipart/form-data`
- Body: `file` (UploadFile)

**Response:**
```json
{
  "ats_relevancy_score": 85,
  "fraud_probability_score": 100,
  "status_color": "Green",
  "fraud_verdict": "Document appears authentic...",
  "reconstructed_original_data": "Timeline analysis...",
  "flagged_claims": [
    {
      "claim": "EXACT_QUOTE",
      "category": "Clarification Needed",
      "hr_note": "Explanation...",
      "interview_question": "Specific question...",
      "box_hidden": false,
      "x_position": 45.2,
      "y_position": 23.8,
      "box_width": 10.5,
      "box_height": 2.1
    }
  ],
  "original_document_base64": "data:image/jpeg;base64,...",
  "ela_heatmap_base64": "data:image/jpeg;base64,..."
}
```

#### 2. Book Expert

**Endpoint:** `POST /api/book-expert`

**Description:** Create an expert interview booking1.

**Request:**
```json
{
  "candidate_email": "candidate@example.com",
  "expert_email": "expert@example.com",
  "interview_date": "2026-05-15T10:00:00Z"
}
```

**Response:**
```json
{
  "meet_link": "https://meet.google.com/abc123xyz",
  "status_message": "Expert Interview successfully booked..."
}
```

---

## Development

### Running Tests

```bash
# Backend tests (when implemented)
cd server
pytest

# Frontend linting
cd frontend
npm run lint
```

### Building for Production

```bash
# Frontend
cd frontend
npm run build

# Backend
cd server
# No build step required for Python
```

---

## Deployment

### Google Cloud Run Deployment

**Frontend:**
```bash
cd frontend
gcloud run deploy forensikgaji-frontend --source .
```

**Backend:**
```bash
cd server
gcloud run deploy forensikgaji-backend --source .
```

### Live URLs
- **Frontend:** https://forensikgaji-frontend-381516681695.asia-southeast1.run.app
- **Backend:** https://forensikgaji-backend-381516681695.asia-southeast1.run.app

---

## Security & Scalability

### Security Measures

| Aspect | Implementation |
|--------|----------------|
| **Stateless Processing** | Zero data leakage between sessions; in-memory processing only |
| **Secret Management** | Production credentials injected via Google Secret Manager |
| **CORS Protection** | Strict origin headers prevent unauthorized access |
| **Input Validation** | Pydantic models validate all request payloads |
| **File Isolation** | UUID-based file naming prevents collisions and overwrites |

### Scalability Features

| Feature | Benefit |
|---------|---------|
| **Serverless Architecture** | Auto-scales from 0 to N instances based on traffic |
| **Containerized Deployment** | Consistent environments across dev/staging/prod |
| **Asynchronous Processing** | Non-blocking I/O for high-throughput scenarios |
| **Cloud-Native Services** | Leverages GCP's global infrastructure |

---

## Contributing

We welcome contributions! Please follow these guidelines:

1. **Fork the repository**
2. **Create a feature branch:** `git checkout -b feature/amazing-feature`
3. **Commit your changes:** `git commit -m 'Add amazing feature'`
4. **Push to the branch:** `git push origin feature/amazing-feature`
5. **Open a Pull Request**

### Code Style

- **Python:** Follow PEP 8 guidelines
- **JavaScript/React:** Follow Airbnb Style Guide
- **Commit Messages:** Use conventional commit format

---

## Hackathon Submission

**Competition:** Project 2030: MyAI Future Hackathon 2026
**Track:** Track 5 - Secure Digital
**Team:** Whatever Team
**Date:** May 2026

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## Acknowledgments

- **Google Cloud** - Cloud Platform credits and support
- **Gemini AI Team** - For the powerful 2.5 Flash model
- **OpenCV Community** - Computer vision tools and documentation
- **FastAPI Contributors** - Excellent web framework

---

## Contact

For questions or support, please open an issue on GitHub or contact the development team.

**Built with ❤️ for a Secure Digital Malaysia**
