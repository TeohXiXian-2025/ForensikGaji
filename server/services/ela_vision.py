import base64
import cv2
import numpy as np
import os
from pdf2image import convert_from_bytes

def generate_ela_heatmap(file_bytes: bytes, mime_type: str) -> tuple:
    if "pdf" in mime_type.lower():
        if os.name == 'nt': 
            images = convert_from_bytes(file_bytes, poppler_path=r"C:\poppler-25.12.0\Library\bin")
        else:
            images = convert_from_bytes(file_bytes)
        cv_images = [cv2.cvtColor(np.array(i), cv2.COLOR_RGB2BGR) for i in images]
        img = np.vstack(cv_images)
    else:
        nparr = np.frombuffer(file_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    output_img = img.copy()
    gray_original = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # ---------------------------------------------------------
    # 1. Standard ELA (Catches dirty pixel pasting)
    # ---------------------------------------------------------
    cv2.imwrite("temp_compressed.jpg", img, [cv2.IMWRITE_JPEG_QUALITY, 90])
    compressed_img = cv2.imread("temp_compressed.jpg")
    diff = cv2.absdiff(img, compressed_img)
    enhanced_diff = cv2.multiply(diff, np.array([15]))
    gray_diff = cv2.cvtColor(enhanced_diff, cv2.COLOR_BGR2GRAY)

    edges = cv2.Canny(gray_original, 50, 150)
    edge_mask = cv2.dilate(edges, np.ones((3,3), np.uint8), iterations=2)
    clean_diff = cv2.subtract(gray_diff, edge_mask)

    _, thresh = cv2.threshold(clean_diff, 40, 255, cv2.THRESH_BINARY)
    dilated = cv2.dilate(thresh, np.ones((5,5), np.uint8), iterations=2)
    contours, _ = cv2.findContours(dilated, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    for c in contours:
        if cv2.contourArea(c) > 300: 
            x, y, w, h = cv2.boundingRect(c)
            cv2.rectangle(output_img, (x, y), (x + w, y + h), (0, 0, 255), 3)

    # ---------------------------------------------------------
    # 2. Digital Sharpness Detector (Catches Canva text inserts)
    # ---------------------------------------------------------
    _, binary = cv2.threshold(gray_original, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
    # Use a wider kernel to group whole numbers/words together
    kernel_h = cv2.getStructuringElement(cv2.MORPH_RECT, (25, 3))
    dilated_text = cv2.dilate(binary, kernel_h, iterations=2)
    text_contours, _ = cv2.findContours(dilated_text, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    h_img, w_img = gray_original.shape
    laplacians = []
    valid_boxes = []

    # Step A: Filter out headers and find the median document sharpness
    for c in text_contours:
        x, y, w, h = cv2.boundingRect(c)
        # ONLY look at normal-sized body text (ignores massive headers and tiny specks)
        if w_img * 0.05 < w < w_img * 0.4 and 8 < h < h_img * 0.03:
            roi = gray_original[y:y+h, x:x+w]
            sharpness = cv2.Laplacian(roi, cv2.CV_64F).var()
            laplacians.append(sharpness)
            valid_boxes.append((x, y, w, h, sharpness))

    # Step B: Highlight the unnaturally sharp Canva text
    if laplacians:
        median_sharpness = np.median(laplacians)
        
        for (tx, ty, tw, th, sharpness) in valid_boxes:
            # If this specific text block is >2.5x sharper than the rest of the document
            if sharpness > median_sharpness * 2.5:
                cv2.rectangle(output_img, (tx, ty), (tx + tw, ty + th), (0, 0, 255), 3)
                cv2.rectangle(output_img, (tx, ty - 25), (tx + 180, ty), (0, 0, 255), -1)
                cv2.putText(output_img, "DIGITAL INSERTION", (tx + 5, ty - 8), 
                            cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 2)

    # ---------------------------------------------------------
    # Encode & Return
    # ---------------------------------------------------------
    _, buffer_orig = cv2.imencode(".jpg", img)
    base64_original = f"data:image/jpeg;base64,{base64.b64encode(buffer_orig).decode('utf-8')}"

    _, buffer_heat = cv2.imencode(".jpg", output_img)
    base64_heatmap = f"data:image/jpeg;base64,{base64.b64encode(buffer_heat).decode('utf-8')}"

    return base64_original, base64_heatmap