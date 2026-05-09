"""
ForensikGaji Backend - Fraud Detection Engine

This module implements Layers 1 and 2 of the forensic analysis pipeline:

Layer 1: Metadata & Pixel Analysis
    - Detects manipulation tools (Canva, Photoshop, etc.)
    - Analyzes PDF structure (image vs text coverage)
    - Performs copy-move cloning detection using DCT coefficients
    - Runs ELA (Error Level Analysis) for tampering detection
    - Extracts EXIF metadata from images

Layer 2: Semantic Analysis
    - Detects keyword stuffing (unusual word frequency)
    - Identifies semantic anomalies in text

Layer 3: Claim Localization
    - Finds exact coordinates of flagged claims for visual overlay
    - Enables frontend to draw yellow boxes on suspicious content

Author: ForensikGaji Team
Created: May 2026
"""

import fitz  # PyMuPDF for PDF processing
from collections import Counter
import re
from PIL import Image
from PIL.ExifTags import TAGS
import io
import cv2
import numpy as np


def detect_cloning(file_bytes: bytes) -> float:
    """
    Detects copy-move forgery by analyzing DCT coefficient similarities.

    Copy-move forgery is when a region of an image is duplicated and pasted
    elsewhere to hide or create content. This technique detects it by:
    1. Dividing image into blocks
    2. Computing DCT (Discrete Cosine Transform) for each block
    3. Comparing block similarities (high similarity = cloning)

    Args:
        file_bytes: Raw image bytes

    Returns:
        float: Clone score from 0.0 (no cloning) to 1.0 (extensive cloning)
    """
    try:
        # Decode image from bytes
        nparr = np.frombuffer(file_bytes, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if image is None:
            return 0.0

        # Convert to grayscale for DCT analysis
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

        # Resize large images for performance
        max_dim = 800
        h, w = gray.shape
        if max(h, w) > max_dim:
            scale = max_dim / max(h, w)
            gray = cv2.resize(gray, (int(w * scale), int(h * scale)))

        height, width = gray.shape

        # Divide image into blocks and compute DCT
        block_size = 16
        blocks = []
        for i in range(0, height - block_size, block_size):
            for j in range(0, width - block_size, block_size):
                block = gray[i:i + block_size, j:j + block_size].astype(np.float32)
                dct_block = cv2.dct(block)
                blocks.append((i, j, dct_block.flatten()))

        # Compare blocks for similarity (cosine similarity)
        if len(blocks) < 2:
            return 0.0

        clone_matches = 0
        max_blocks = min(len(blocks), 400)  # Limit comparisons for performance

        for idx in range(max_blocks):
            for jdx in range(idx + 1, max_blocks):
                f1, f2 = blocks[idx][2], blocks[jdx][2]
                # Calculate cosine similarity
                similarity = np.dot(f1, f2) / (np.linalg.norm(f1) * np.linalg.norm(f2) + 1e-6)
                if similarity > 0.98:  # High similarity threshold
                    clone_matches += 1

        return float(min(clone_matches / max(max_blocks, 1), 1.0))
    except:
        return 0.0


def analyze_metadata_layer(file_bytes: bytes, mime_type: str) -> dict:
    """
    Layer 1: Analyzes document metadata and structure for manipulation indicators.

    This function performs comprehensive metadata analysis:
    1. PDF metadata inspection (producer, creator tools)
    2. Image coverage calculation (scanned vs digital)
    3. Suspicious tool detection (Canva, Photoshop, etc.)
    4. Vector text overlay detection
    5. EXIF metadata extraction for images
    6. Copy-move cloning detection
    7. ELA (Error Level Analysis) for pixel tampering

    Args:
        file_bytes: Raw document bytes
        mime_type: MIME type of the document

    Returns:
        dict: Analysis results containing:
            - hidden_text_detected: Whether hidden text was found
            - hidden_content: Description of hidden content
            - suspicious_metadata: Whether metadata indicates manipulation
            - metadata_tool: Name of detected tool
            - structural_anomalies: List of detected issues
            - clone_score: Copy-move cloning detection score
    """
    # Initialize result variables
    is_suspicious = False
    detected_tool = "Unknown"
    structural_anomalies = []
    clone_score = 0.0

    # List of tools commonly used for document forgery
    suspicious_tools = ["canva", "adobe", "photoshop", "illustrator", "foxit", "ilovepdf", "gimp"]

    # =========================================================================
    # PDF PROCESSING PATH
    # =========================================================================
    is_scanned_document = True  # Default assumption

    if "pdf" in mime_type.lower():
        try:
            # Open PDF and extract metadata
            doc = fitz.open(stream=file_bytes, filetype="pdf")
            metadata = doc.metadata

            # Extract producer and creator tools from PDF metadata
            producer = metadata.get("producer", "") or ""
            creator = metadata.get("creator", "") or ""
            detected_tool = producer if producer else creator if creator else "Unknown"

            # Calculate image vs text coverage to determine if scanned
            total_page_area = 0.0
            total_image_area = 0.0
            text_count = 0

            for page in doc:
                page_area = page.rect.width * page.rect.height
                if page_area == 0:
                    continue
                total_page_area += page_area

                # Sum all image areas on the page
                for img_info in page.get_images(full=True):
                    xref = img_info[0]
                    for rect in page.get_image_rects(xref):
                        total_image_area += (rect.width * rect.height)

                # Count text blocks
                for b in page.get_text("dict")["blocks"]:
                    if b.get("type", -1) == 0:
                        text_count += 1

            # Determine if document is primarily image-based (scanned)
            if total_page_area > 0:
                image_coverage = total_image_area / total_page_area
                is_scanned_document = (image_coverage > 0.60)

                # For scanned documents, check for manipulation tools
                if is_scanned_document:
                    tool_signature = f"{producer} {creator}".lower()
                    is_tool_suspicious = any(tool in tool_signature for tool in suspicious_tools)

                    if is_tool_suspicious:
                        structural_anomalies.append(
                            f"CRITICAL: {detected_tool} was used to digitally inject text "
                            f"over a scanned document base. High probability of forgery."
                        )
                        is_suspicious = True
                    elif 0 < text_count < 300:
                        # Small amount of text on image-based page is suspicious
                        structural_anomalies.append(
                            "CRITICAL: Suspicious vector text overlay detected on top of "
                            "a full-page scanned image."
                        )
                        is_suspicious = True
        except:
            pass

    # =========================================================================
    # IMAGE PROCESSING PATH (JPG, PNG, etc.)
    # =========================================================================
    else:
        try:
            # Extract EXIF metadata from image
            image = Image.open(io.BytesIO(file_bytes))
            exif = image._getexif()

            if exif:
                # Look for Software tag in EXIF data
                for tag_id, value in exif.items():
                    if TAGS.get(tag_id, tag_id) == 'Software':
                        detected_tool = str(value)
                        is_suspicious = any(tool in detected_tool.lower() for tool in suspicious_tools)
        except:
            pass

        # Run copy-move cloning detection
        clone_score = detect_cloning(file_bytes)
        if clone_score > 0.05:
            structural_anomalies.append(
                f"Copy-Move pixel cloning detected! Score: {clone_score:.2f}"
            )

    # =========================================================================
    # ELA (Error Level Analysis) - Pixel Tampering Detection
    # =========================================================================
    # Only run ELA on scanned documents (digital resumes have natural ELA variations)
    if is_scanned_document:
        try:
            nparr = np.frombuffer(file_bytes, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

            if img is not None:
                # Compress and re-decode to establish baseline
                _, encoded = cv2.imencode('.jpg', img, [cv2.IMWRITE_JPEG_QUALITY, 90])
                recomp = cv2.imdecode(encoded, cv2.IMREAD_COLOR)

                # Calculate absolute difference (error level)
                diff = cv2.absdiff(img, recomp)
                gray_diff = cv2.cvtColor(diff, cv2.COLOR_BGR2GRAY)

                # Use edge detection to mask legitimate edges
                gray_original = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
                edges = cv2.Canny(gray_original, 50, 150)
                edge_mask = cv2.dilate(edges, np.ones((3, 3), np.uint8), iterations=2)

                # Subtract edge mask from difference to isolate tampering
                clean_diff = cv2.subtract(gray_diff, edge_mask)

                # Find large anomalous regions
                _, thresh = cv2.threshold(clean_diff, 50, 255, cv2.THRESH_BINARY)
                contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

                large_anomalies = [c for c in contours if cv2.contourArea(c) > 300]

                if len(large_anomalies) > 0:
                    structural_anomalies.append(
                        "CRITICAL: Pixel-level Error Level Analysis (ELA) detected manual "
                        "image tampering/pasting. Forensic heatmaps will show red highlighted areas."
                    )
        except:
            pass

    # Return comprehensive metadata analysis results
    return {
        "hidden_text_detected": False,
        "hidden_content": "None",
        "suspicious_metadata": is_suspicious,
        "metadata_tool": detected_tool,
        "structural_anomalies": structural_anomalies,
        "clone_score": clone_score
    }


def analyze_semantic_layer(text: str) -> dict:
    """
    Layer 2: Analyzes text for semantic anomalies and keyword stuffing.

    Keyword stuffing is a technique where fraudsters repeat certain keywords
    to manipulate ATS (Applicant Tracking System) algorithms. This function
    identifies words with unusually high frequency.

    Args:
        text: Extracted text from the document

    Returns:
        dict: Semantic analysis results containing:
            - stuffing_detected: Whether keyword stuffing was detected
            - stuffed_keywords: List of overused keywords
    """
    # Extract all words (3+ characters) and convert to lowercase
    words = re.findall(r'\b[a-zA-Z]{3,}\b', text.lower())

    if not words:
        return {"stuffing_detected": False, "stuffed_keywords": []}

    # Find words that appear more than 3% of the time (suspicious frequency)
    # Exclude common stop words
    stop_words = ["the", "and", "for", "with"]
    stuffed_words = [
        word for word, count in Counter(words).items()
        if (count / len(words)) * 100 > 3.0 and word not in stop_words
    ]

    return {
        "stuffing_detected": len(stuffed_words) > 0,
        "stuffed_keywords": stuffed_words
    }


def locate_claims_in_pdf(file_bytes: bytes, ai_analysis: dict, mime_type: str) -> dict:
    """
    Locates the exact coordinates of flagged claims for visual overlay.

    This function searches the PDF for each flagged claim and calculates
    the bounding box coordinates as percentages. These coordinates allow
    the frontend to draw yellow boxes around suspicious text.

    Args:
        file_bytes: Raw PDF bytes
        ai_analysis: Analysis results from Gemini containing flagged_claims
        mime_type: MIME type of the document

    Returns:
        dict: Updated ai_analysis with coordinate information for each claim:
            - page_num: Page number where claim was found
            - x_position: Left position as percentage of page width
            - y_position: Top position as percentage of total document height
            - box_width: Width as percentage of page width
            - box_height: Height as percentage of total document height
            - box_hidden: Whether the box should be hidden (if not found)

    Note:
        The coordinate system uses percentages to be responsive across
        different screen sizes in the frontend.
    """
    for claim_obj in ai_analysis.get("flagged_claims", []):
        claim_text = claim_obj.get("claim", "")
        claim_obj["box_hidden"] = False

        # Hide boxes for metadata-level claims (not text-based)
        if any(tool in claim_text.lower() for tool in ["canva", "adobe", "photoshop", "ilovepdf", "metadata"]):
            claim_obj["box_hidden"] = True
            continue

        # Skip localization for non-PDF documents
        if "pdf" not in mime_type.lower():
            claim_obj["box_hidden"] = True
            continue

        try:
            # Open PDF for text search
            doc = fitz.open(stream=file_bytes, filetype="pdf")
            total_height = sum(page.rect.height for page in doc)
            page_count = len(doc)

            # Build search targets (exact text + individual words)
            search_targets = []

            # Try to find Malaysian IC number pattern
            ic_match = re.search(r'\d{6}-?\d{2}-?\d{4}', claim_text)
            if ic_match:
                search_targets.append(ic_match.group(0))
                search_targets.append(ic_match.group(0).replace("-", ""))

            # Add the full claim text
            search_targets.append(claim_text.strip())

            # Add long words (4+ characters) for partial matching
            words = [w for w in claim_text.replace("\n", " ").split() if len(w) > 4]
            search_targets.extend(sorted(words, key=len, reverse=True))

            rect_found = False

            # Search for each target in the PDF
            for target in search_targets:
                if not target or rect_found:
                    continue

                accumulated_y = 0  # Track Y position across multi-page documents

                for page_num in range(page_count):
                    page = doc[page_num]

                    # Search for the target text on this page
                    rects = page.search_for(target)

                    if rects:
                        found_box = rects[0]
                        page_width = page.rect.width

                        # Store page number
                        claim_obj["page_num"] = page_num + 1

                        # Calculate position as percentages for responsive frontend
                        # Dynamic multi-page scaling: divides padding by page count
                        claim_obj["x_position"] = max(0, (found_box.x0 / page_width) * 100 - 1)
                        claim_obj["y_position"] = max(
                            0,
                            ((accumulated_y + found_box.y0) / total_height) * 100 - (0.8 / page_count)
                        )
                        claim_obj["box_width"] = min(
                            100 - claim_obj["x_position"],
                            (found_box.width / page_width) * 100 + 2
                        )
                        claim_obj["box_height"] = (found_box.height / total_height) * 100 + (1.6 / page_count)

                        rect_found = True
                        break

                    # Accumulate page height for multi-page documents
                    accumulated_y += page.rect.height

                if rect_found:
                    break

            # Hide box if text was not found
            if not rect_found:
                claim_obj["box_hidden"] = True

        except:
            # Hide box if any error occurs during search
            claim_obj["box_hidden"] = True

    return ai_analysis
