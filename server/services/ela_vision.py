import base64
import cv2
import numpy as np
import os
from pdf2image import convert_from_bytes
from PIL import Image, ImageChops, ImageEnhance
from io import BytesIO

def generate_ela_heatmap(file_bytes: bytes, mime_type: str) -> tuple:
    """Runs Error Level Analysis to detect tampered pixels and returns 2 Base64 images."""
    
    if "pdf" in mime_type.lower():
        # 🟢 SMART FIX: Check if we are on Windows (local) or Linux (Cloud Run)
        if os.name == 'nt': 
            images = convert_from_bytes(file_bytes, poppler_path=r"C:\poppler-25.12.0\Library\bin")
        else:
            # On Linux/Cloud Run, poppler is installed globally, so no path is needed!
            images = convert_from_bytes(file_bytes)
            
        cv_images = [cv2.cvtColor(np.array(i), cv2.COLOR_RGB2BGR) for i in images]
        img = np.vstack(cv_images)
    else:
        # 🟢 CRITICAL RESTORE: Direct Image Handling for JPG/PNG!
        nparr = np.frombuffer(file_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    output_img = img.copy()

    cv2.imwrite("temp_compressed.jpg", img, [cv2.IMWRITE_JPEG_QUALITY, 90])
    compressed_img = cv2.imread("temp_compressed.jpg")

    diff = cv2.absdiff(img, compressed_img)
    scale = 15
    enhanced_diff = cv2.multiply(diff, np.array([scale]))
    
    gray_diff = cv2.cvtColor(enhanced_diff, cv2.COLOR_BGR2GRAY)
    _, thresh = cv2.threshold(gray_diff, 40, 255, cv2.THRESH_BINARY)
    
    kernel = np.ones((5,5), np.uint8)
    dilated = cv2.dilate(thresh, kernel, iterations=2)
    contours, _ = cv2.findContours(dilated, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    for c in contours:
        area = cv2.contourArea(c)
        if area > 100: 
            x, y, w, h = cv2.boundingRect(c)
            cv2.rectangle(output_img, (x, y), (x + w, y + h), (0, 0, 255), 3)
            cv2.putText(output_img, "TAMPERED", (x, y - 10), 
                        cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)

    # Encode BOTH the Original Stitched Image and the Heatmap Stitched Image
    _, buffer_orig = cv2.imencode(".jpg", img)
    base64_original = f"data:image/jpeg;base64,{base64.b64encode(buffer_orig).decode('utf-8')}"

    _, buffer_heat = cv2.imencode(".jpg", output_img)
    base64_heatmap = f"data:image/jpeg;base64,{base64.b64encode(buffer_heat).decode('utf-8')}"

    return base64_original, base64_heatmap