# ForensikGaji - Forensic Analysis Layers

This document describes the 3-layer forensic analysis pipeline used by ForensikGaji to detect document fraud and tampering.

---

## Layer 1: Metadata & Pixel Analysis

### 1.1 PDF Metadata Inspection
- Examines PDF producer/creator tools
- Detects suspicious tools: **Canva, Adobe Photoshop, Illustrator, Foxit, iLovePDF, GIMP**
- Flags when these tools are used to inject text over scanned documents

### 1.2 Document Structure Analysis
- Calculates **image coverage ratio** (scanned vs digital)
- Determines if document is primarily image-based (>60% coverage)
- Detects **vector text overlay** on scanned images

### 1.3 Copy-Move Cloning Detection
- Uses **DCT (Discrete Cosine Transform)** coefficient analysis
- Divides image into 16x16 blocks
- Compares block similarities using cosine similarity (>0.98 threshold)
- Detects duplicated/pasted regions used to hide or create content

### 1.4 ELA (Error Level Analysis)
- **For JPEG compression inconsistency detection**
- Re-compresses image at quality 90
- Calculates absolute difference between original and re-compressed
- Uses **Canny edge detection** to mask legitimate edges
- Identifies regions with different compression histories (splicing/pasting)

### 1.5 Wavelet Decomposition
- **Daubechies-1 wavelet, 3-level decomposition**
- Isolates high-frequency coefficients
- Detects **high-quality invisible pastes** that ELA might miss

### 1.6 Vector Injection Detection
- Detects text digitally added over scanned documents
- Common forgery technique (e.g., changing salary amounts)
- Highlights with red "VECTOR INJECTION" label

### 1.7 EXIF Metadata Extraction
- Extracts image metadata (Software tag)
- Identifies editing software used

---

## Layer 2: Semantic Analysis

### 2.1 Keyword Stuffing Detection
- Analyzes word frequency in extracted text
- Flags words appearing >3% of the time
- Excludes common stop words (the, and, for, with)
- Detects ATS (Applicant Tracking System) manipulation attempts

---

## Layer 3: Agentic AI Reasoning

### Uses **Google Gemini 2.5 Flash** to synthesize all previous layers:

### 3.1 Trust Score Calculation (0-100)
- 100 = perfectly authentic
- 0 = complete fraud
- Critical Layer 1 anomalies → score 10-25
- Content penalties → deduct 5-30 points

### 3.2 Risk Status Color
- **Green**: Safe/Authentic
- **Yellow**: Moderate risk
- **Red**: High fraud probability

### 3.3 Flagged Claims Localization
- Finds exact coordinates of suspicious claims
- Enables yellow box overlays in UI
- 2-3 logical contradictions or impressive skills flagged

### 3.4 Interview Question Generation
- Creates targeted verification questions for each flagged claim
- Helps HR verify candidate knowledge

### 3.5 Timeline Reconstruction
- Analyzes dates for logical consistency
- Flags gaps or anomalies

---

## Summary Table

| Layer | Technique | Detects |
|-------|-----------|---------|
| **1A** | PDF Metadata | Forgery tools used |
| **1B** | Image Coverage | Scanned vs digital |
| **1C** | DCT Cloning | Copy-move forgery |
| **1D** | ELA | JPEG compression diffs |
| **1E** | Wavelet | Invisible pastes |
| **1F** | Vector Injection | Text over scans |
| **1G** | EXIF | Editing software |
| **2** | Keyword Frequency | ATS stuffing |
| **3** | Gemini AI | Synthesis + scoring |

---

## Visual Indicators in Heatmap

| Color | Indicator | Meaning |
|-------|-----------|---------|
| Red Boxes | ELA Detection | Compression inconsistencies |
| Red Boxes + Label | Vector Injection | Digitally added text |
| Orange Boxes | Wavelet Detection | Pixel anomalies  |

---

*Generated: May 2026*
*Author: ForensikGaji Team*
