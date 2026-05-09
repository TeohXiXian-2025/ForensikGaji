"""
ForensikGaji Backend - ELA (Error Level Analysis) Vision Service

This module generates forensic heatmaps that highlight pixel-level manipulation
in documents. It implements multiple computer vision techniques:

1. Error Level Analysis (ELA): Detects JPEG compression inconsistencies
2. Wavelet Decomposition: Catches high-quality invisible pastes
3. Vector Injection Detection: Identifies digitally added text over scans

Theory:
    When an image is re-saved as JPEG, uniformly compressed regions show similar
    error levels. Spliced/pasted content from different sources exhibits different
    compression artifacts, which ELA highlights as anomalies.

Author: ForensikGaji Team
Created: May 2026
"""

import base64
import cv2
import numpy as np
import fitz  # PyMuPDF for PDF processing
import pywt  # PyWavelets for wavelet decomposition


def generate_ela_heatmap(file_bytes: bytes, mime_type: str) -> tuple:
    """
    Generates an ELA heatmap highlighting pixel-level manipulation in documents.

    This function processes both PDF and image files, applying three detection
    methods to identify tampering:
    1. Wavelet decomposition (DocAuth method) - for invisible pastes
    2. Standard ELA - for JPEG compression artifact detection
    3. Vector injection detection - for text added over scans

    Args:
        file_bytes: Raw binary content of the document
        mime_type: MIME type indicating if it's PDF or image

    Returns:
        tuple: (original_image_b64, heatmap_image_b64)
            - original_image_b64: Data URI of the original document as image
            - heatmap_image_b64: Data URI of the heatmap with annotations

    Output Visual Indicators:
        - Orange boxes: Wavelet-detected pixel anomalies
        - Red boxes: ELA-detected compression inconsistencies
        - Red boxes + "VECTOR INJECTION" label: Detected vector text overlay

    Example:
        >>> file = open("document.pdf", "rb").read()
        >>> orig, heatmap = generate_ela_heatmap(file, "application/pdf")
        >>> print(f"Original: {orig[:50]}...")
        >>> print(f"Heatmap: {heatmap[:50]}...")
    """
    # =========================================================================
    # PDF PROCESSING PATH
    # =========================================================================
    if "pdf" in mime_type.lower():
        # Open the PDF document using PyMuPDF (fitz)
        doc = fitz.open(stream=file_bytes, filetype="pdf")

        # Lists to hold processed page images (stacked vertically for output)
        cv_images = []          # Original page images
        output_cv_images = []   # Annotated heatmap images

        # Process each page in the PDF
        for page in doc:
            # ------------------------------------------------------------
            # STEP 1: Render PDF page to high-resolution image
            # ------------------------------------------------------------
            # DPI 150 provides good balance between detail and performance
            pix = page.get_pixmap(dpi=150)

            # Convert raw pixel data to NumPy array for OpenCV processing
            img = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.h, pix.w, pix.n)

            # Handle different color channels (RGBA, RGB, Grayscale)
            if pix.n == 4:
                img = cv2.cvtColor(img, cv2.COLOR_RGBA2BGR)
            elif pix.n == 3:
                img = cv2.cvtColor(img, cv2.COLOR_RGB2BGR)
            else:
                img = cv2.cvtColor(img, cv2.COLOR_GRAY2BGR)

            # Create a copy for annotation (heatmap output)
            output_img = img.copy()

            # Convert to grayscale for analysis
            gray_original = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

            # ------------------------------------------------------------
            # STEP 2: Determine if page is a scanned document or native digital
            # ------------------------------------------------------------
            # Calculate the ratio of image area to total page area
            # Scanned documents are mostly images; digital docs have vector text
            page_area = page.rect.width * page.rect.height
            img_area = sum(
                rect.width * rect.height
                for img_info in page.get_images(full=True)
                for rect in page.get_image_rects(img_info[0])
            )

            # Page is considered a scan if >50% is image-based
            is_scan = (img_area / page_area > 0.5) if page_area > 0 else False

            # ------------------------------------------------------------
            # STEP 3: Apply forensic highlighting ONLY for scanned documents
            # ------------------------------------------------------------
            # Native digital documents naturally have ELA variations, so we
            # only run forensic analysis on documents that appear to be scans
            if is_scan:
                # =========================================================
                # A: WAVELET DECOMPOSITION (DocAuth Method)
                # =========================================================
                # Catches high-quality invisible pastes that ELA might miss
                # by analyzing frequency domain artifacts

                # Convert to float for wavelet processing
                img_float = gray_original.astype(np.float32) / 255.0

                # Apply 3-level Daubechies-1 wavelet decomposition
                coeffs = pywt.wavedec2(img_float, wavelet='db1', level=3)
                coeffs_detail = list(coeffs)

                # Zero out approximation coefficients (normal visual data)
                # This isolates only the detail/high-frequency coefficients
                coeffs_detail[0] = np.zeros_like(coeffs[0])

                # Reconstruct from detail coefficients only
                reconstructed = pywt.waverec2(coeffs_detail, wavelet='db1')
                reconstructed = reconstructed[:gray_original.shape[0], :gray_original.shape[1]]

                # Normalize and threshold the reconstruction
                recon_norm = cv2.normalize(np.abs(reconstructed), None, 0, 255, cv2.NORM_MINMAX).astype(np.uint8)
                _, w_thresh = cv2.threshold(recon_norm, 45, 255, cv2.THRESH_BINARY)

                # Dilate to merge nearby detections
                w_dilated = cv2.dilate(w_thresh, np.ones((5, 5), np.uint8), iterations=2)
                w_contours, _ = cv2.findContours(w_dilated, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

                # Draw orange boxes around wavelet-detected anomalies
                for c in w_contours:
                    area = cv2.contourArea(c)
                    # Filter by area to ignore noise and very large regions
                    if 300 < area < 10000:
                        x, y, w, h = cv2.boundingRect(c)
                        cv2.rectangle(output_img, (x, y), (x + w, y + h), (0, 165, 255), 3)  # Orange
                        cv2.putText(output_img, "PIXEL ANOMALY", (x, y - 8),
                                    cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 165, 255), 2)

                # =========================================================
                # B: STANDARD ELA (JPEG Compression Artifact Detection)
                # =========================================================
                # Detects regions with different compression histories
                # indicating splicing or pasting

                # Save and re-compress at quality 90 to establish baseline
                cv2.imwrite("temp_compressed.jpg", img, [cv2.IMWRITE_JPEG_QUALITY, 90])
                compressed_img = cv2.imread("temp_compressed.jpg")

                # Calculate absolute difference between original and re-compressed
                diff = cv2.absdiff(img, compressed_img)

                # Enhance differences for better visibility
                enhanced_diff = cv2.multiply(diff, np.array([20]))
                gray_diff = cv2.cvtColor(enhanced_diff, cv2.COLOR_BGR2GRAY)

                # Use edge detection to mask legitimate edges (not tampering)
                edges = cv2.Canny(gray_original, 50, 150)
                edge_mask = cv2.dilate(edges, np.ones((3, 3), np.uint8), iterations=2)
                clean_diff = cv2.subtract(gray_diff, edge_mask)

                # Threshold and find contours of anomalous regions
                _, thresh = cv2.threshold(clean_diff, 50, 255, cv2.THRESH_BINARY)
                dilated = cv2.dilate(thresh, np.ones((5, 5), np.uint8), iterations=2)
                contours, _ = cv2.findContours(dilated, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

                # Draw red boxes around ELA-detected anomalies
                for c in contours:
                    area = cv2.contourArea(c)
                    if 300 < area < 10000:
                        x, y, w, h = cv2.boundingRect(c)
                        cv2.rectangle(output_img, (x, y), (x + w, y + h), (0, 0, 255), 3)  # Red

                # =========================================================
                # C: VECTOR INJECTION DETECTOR
                # =========================================================
                # Detects text that was digitally added over a scanned document
                # This is a common forgery technique (e.g., changing salary amounts)

                # Calculate scaling factor from PDF page coordinates to image pixels
                scale_x = pix.w / page.rect.width
                scale_y = pix.h / page.rect.height

                # Iterate through all text blocks in the PDF
                for block in page.get_text("dict")["blocks"]:
                    if block.get("type") == 0:  # Type 0 = text block
                        # Get bounding box from PDF coordinates
                        bx0, by0, bx1, by1 = block["bbox"]

                        # Convert PDF coordinates to image pixel coordinates
                        tx, ty = int(bx0 * scale_x), int(by0 * scale_y)
                        tw, th = int((bx1 - bx0) * scale_x), int((by1 - by0) * scale_y)

                        # Draw red box around vector text
                        cv2.rectangle(output_img, (tx, ty), (tx + tw, ty + th), (0, 0, 255), 3)

                        # Add label background
                        label_y = ty - 10 if ty > 20 else ty + th + 20
                        cv2.rectangle(output_img, (tx, label_y - 15), (tx + 160, label_y + 5), (0, 0, 255), -1)
                        cv2.putText(output_img, "VECTOR INJECTION", (tx + 5, label_y),
                                    cv2.FONT_HERSHEY_SIMPLEX, 0.4, (255, 255, 255), 1)

            # Add processed images to their respective lists
            cv_images.append(img)
            output_cv_images.append(output_img)

        # Stack all pages vertically for multi-page display
        img = np.vstack(cv_images)
        output_img = np.vstack(output_cv_images)

    # =========================================================================
    # IMAGE PROCESSING PATH (JPG, PNG, etc.)
    # =========================================================================
    else:
        # Decode image from bytes using OpenCV
        nparr = np.frombuffer(file_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        output_img = img.copy()

        # Convert to grayscale for analysis
        gray_original = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

        # ------------------------------------------------------------
        # WAVELET DECOMPOSITION (same as PDF path)
        # ------------------------------------------------------------
        img_float = gray_original.astype(np.float32) / 255.0
        coeffs = pywt.wavedec2(img_float, wavelet='db1', level=3)
        coeffs_detail = list(coeffs)
        coeffs_detail[0] = np.zeros_like(coeffs[0])

        reconstructed = pywt.waverec2(coeffs_detail, wavelet='db1')
        reconstructed = reconstructed[:gray_original.shape[0], :gray_original.shape[1]]
        recon_norm = cv2.normalize(np.abs(reconstructed), None, 0, 255, cv2.NORM_MINMAX).astype(np.uint8)

        _, w_thresh = cv2.threshold(recon_norm, 45, 255, cv2.THRESH_BINARY)
        w_dilated = cv2.dilate(w_thresh, np.ones((5, 5), np.uint8), iterations=2)
        w_contours, _ = cv2.findContours(w_dilated, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        for c in w_contours:
            area = cv2.contourArea(c)
            if 300 < area < 10000:
                x, y, w, h = cv2.boundingRect(c)
                cv2.rectangle(output_img, (x, y), (x + w, y + h), (0, 165, 255), 3)
                cv2.putText(output_img, "PIXEL ANOMALY", (x, y - 8),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 165, 255), 2)

        # ------------------------------------------------------------
        # STANDARD ELA (same as PDF path)
        # ------------------------------------------------------------
        cv2.imwrite("temp_compressed.jpg", img, [cv2.IMWRITE_JPEG_QUALITY, 90])
        compressed_img = cv2.imread("temp_compressed.jpg")
        diff = cv2.absdiff(img, compressed_img)
        enhanced_diff = cv2.multiply(diff, np.array([20]))
        gray_diff = cv2.cvtColor(enhanced_diff, cv2.COLOR_BGR2GRAY)

        edges = cv2.Canny(gray_original, 50, 150)
        edge_mask = cv2.dilate(edges, np.ones((3, 3), np.uint8), iterations=2)
        clean_diff = cv2.subtract(gray_diff, edge_mask)

        _, thresh = cv2.threshold(clean_diff, 50, 255, cv2.THRESH_BINARY)
        dilated = cv2.dilate(thresh, np.ones((5, 5), np.uint8), iterations=2)
        contours, _ = cv2.findContours(dilated, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        for c in contours:
            area = cv2.contourArea(c)
            if 300 < area < 10000:
                x, y, w, h = cv2.boundingRect(c)
                cv2.rectangle(output_img, (x, y), (x + w, y + h), (0, 0, 255), 3)

    # =========================================================================
    # ENCODE AND RETURN AS BASE64 DATA URIS
    # =========================================================================
    # Convert images to JPEG bytes and encode as base64 for JSON transmission
    _, buffer_orig = cv2.imencode(".jpg", img)
    base64_original = f"data:image/jpeg;base64,{base64.b64encode(buffer_orig).decode('utf-8')}"

    _, buffer_heat = cv2.imencode(".jpg", output_img)
    base64_heatmap = f"data:image/jpeg;base64,{base64.b64encode(buffer_heat).decode('utf-8')}"

    return base64_original, base64_heatmap
