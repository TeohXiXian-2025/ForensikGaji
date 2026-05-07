import base64
import cv2
import numpy as np
import fitz  # PyMuPDF
import pywt  # DocAuth Wavelet Decomposition

def generate_ela_heatmap(file_bytes: bytes, mime_type: str) -> tuple:
    if "pdf" in mime_type.lower():
        doc = fitz.open(stream=file_bytes, filetype="pdf")
        
        cv_images = []
        output_cv_images = []
        
        for page in doc:
            # 1. Render the PDF page to a High-Res Image
            pix = page.get_pixmap(dpi=150)
            img = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.h, pix.w, pix.n)
            if pix.n == 4:
                img = cv2.cvtColor(img, cv2.COLOR_RGBA2BGR)
            elif pix.n == 3:
                img = cv2.cvtColor(img, cv2.COLOR_RGB2BGR)
            else:
                img = cv2.cvtColor(img, cv2.COLOR_GRAY2BGR)
                
            output_img = img.copy()
            gray_original = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            
            # 2. Accurately determine if this page is a Scan using Area Math
            page_area = page.rect.width * page.rect.height
            img_area = sum(rect.width * rect.height for img_info in page.get_images(full=True) for rect in page.get_image_rects(img_info[0]))
            
            is_scan = (img_area / page_area > 0.5) if page_area > 0 else False
            
            # 3. Apply Forensic Highlighting ONLY if it's a scanned document
            if is_scan:
                # --- A: DocAuth Wavelet Decomposition (Catches high-quality invisible pastes) ---
                img_float = gray_original.astype(np.float32) / 255.0
                coeffs = pywt.wavedec2(img_float, wavelet='db1', level=3)
                coeffs_detail = list(coeffs)
                coeffs_detail[0] = np.zeros_like(coeffs[0]) # Zero out normal visual data
                
                reconstructed = pywt.waverec2(coeffs_detail, wavelet='db1')
                reconstructed = reconstructed[:gray_original.shape[0], :gray_original.shape[1]]
                recon_norm = cv2.normalize(np.abs(reconstructed), None, 0, 255, cv2.NORM_MINMAX).astype(np.uint8)
                
                _, w_thresh = cv2.threshold(recon_norm, 45, 255, cv2.THRESH_BINARY)
                w_dilated = cv2.dilate(w_thresh, np.ones((5,5), np.uint8), iterations=2)
                w_contours, _ = cv2.findContours(w_dilated, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
                
                for c in w_contours:
                    area = cv2.contourArea(c)
                    if 300 < area < 10000: 
                        x, y, w, h = cv2.boundingRect(c)
                        cv2.rectangle(output_img, (x, y), (x + w, y + h), (0, 165, 255), 3) # Orange box
                        cv2.putText(output_img, "PIXEL ANOMALY", (x, y - 8), 
                                    cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 165, 255), 2)
                
                # --- B: Standard ELA (Catches dirty JPEG compression pasting) ---
                cv2.imwrite("temp_compressed.jpg", img, [cv2.IMWRITE_JPEG_QUALITY, 90])
                compressed_img = cv2.imread("temp_compressed.jpg")
                diff = cv2.absdiff(img, compressed_img)
                enhanced_diff = cv2.multiply(diff, np.array([20]))
                gray_diff = cv2.cvtColor(enhanced_diff, cv2.COLOR_BGR2GRAY)

                edges = cv2.Canny(gray_original, 50, 150)
                edge_mask = cv2.dilate(edges, np.ones((3,3), np.uint8), iterations=2)
                clean_diff = cv2.subtract(gray_diff, edge_mask)

                _, thresh = cv2.threshold(clean_diff, 50, 255, cv2.THRESH_BINARY)
                dilated = cv2.dilate(thresh, np.ones((5,5), np.uint8), iterations=2)
                contours, _ = cv2.findContours(dilated, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
                
                for c in contours:
                    area = cv2.contourArea(c)
                    if 300 < area < 10000: 
                        x, y, w, h = cv2.boundingRect(c)
                        cv2.rectangle(output_img, (x, y), (x + w, y + h), (0, 0, 255), 3) # Red box
                
                # --- C: DETERMINISTIC VECTOR INJECTION DETECTOR ---
                scale_x = pix.w / page.rect.width
                scale_y = pix.h / page.rect.height
                
                for block in page.get_text("dict")["blocks"]:
                    if block.get("type") == 0: 
                        bx0, by0, bx1, by1 = block["bbox"]
                        tx, ty = int(bx0 * scale_x), int(by0 * scale_y)
                        tw, th = int((bx1 - bx0) * scale_x), int((by1 - by0) * scale_y)
                        
                        cv2.rectangle(output_img, (tx, ty), (tx + tw, ty + th), (0, 0, 255), 3)
                        label_y = ty - 10 if ty > 20 else ty + th + 20
                        cv2.rectangle(output_img, (tx, label_y - 15), (tx + 160, label_y + 5), (0, 0, 255), -1)
                        cv2.putText(output_img, "VECTOR INJECTION", (tx + 5, label_y), 
                                    cv2.FONT_HERSHEY_SIMPLEX, 0.4, (255, 255, 255), 1)

            cv_images.append(img)
            output_cv_images.append(output_img)
            
        img = np.vstack(cv_images)
        output_img = np.vstack(output_cv_images)
        
    else:
        # Fallback for standard JPG/PNG uploads
        nparr = np.frombuffer(file_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        output_img = img.copy()
        gray_original = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        
        # --- DocAuth Wavelet Decomposition ---
        img_float = gray_original.astype(np.float32) / 255.0
        coeffs = pywt.wavedec2(img_float, wavelet='db1', level=3)
        coeffs_detail = list(coeffs)
        coeffs_detail[0] = np.zeros_like(coeffs[0])
        
        reconstructed = pywt.waverec2(coeffs_detail, wavelet='db1')
        reconstructed = reconstructed[:gray_original.shape[0], :gray_original.shape[1]]
        recon_norm = cv2.normalize(np.abs(reconstructed), None, 0, 255, cv2.NORM_MINMAX).astype(np.uint8)
        
        _, w_thresh = cv2.threshold(recon_norm, 45, 255, cv2.THRESH_BINARY)
        w_dilated = cv2.dilate(w_thresh, np.ones((5,5), np.uint8), iterations=2)
        w_contours, _ = cv2.findContours(w_dilated, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        for c in w_contours:
            area = cv2.contourArea(c)
            if 300 < area < 10000: 
                x, y, w, h = cv2.boundingRect(c)
                cv2.rectangle(output_img, (x, y), (x + w, y + h), (0, 165, 255), 3)
                cv2.putText(output_img, "PIXEL ANOMALY", (x, y - 8), 
                            cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 165, 255), 2)
        
        # --- Standard ELA ---
        cv2.imwrite("temp_compressed.jpg", img, [cv2.IMWRITE_JPEG_QUALITY, 90])
        compressed_img = cv2.imread("temp_compressed.jpg")
        diff = cv2.absdiff(img, compressed_img)
        enhanced_diff = cv2.multiply(diff, np.array([20]))
        gray_diff = cv2.cvtColor(enhanced_diff, cv2.COLOR_BGR2GRAY)
        
        edges = cv2.Canny(gray_original, 50, 150)
        edge_mask = cv2.dilate(edges, np.ones((3,3), np.uint8), iterations=2)
        clean_diff = cv2.subtract(gray_diff, edge_mask)

        _, thresh = cv2.threshold(clean_diff, 50, 255, cv2.THRESH_BINARY)
        dilated = cv2.dilate(thresh, np.ones((5,5), np.uint8), iterations=2)
        contours, _ = cv2.findContours(dilated, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        for c in contours:
            area = cv2.contourArea(c)
            if 300 < area < 10000: 
                x, y, w, h = cv2.boundingRect(c)
                cv2.rectangle(output_img, (x, y), (x + w, y + h), (0, 0, 255), 3)

    _, buffer_orig = cv2.imencode(".jpg", img)
    base64_original = f"data:image/jpeg;base64,{base64.b64encode(buffer_orig).decode('utf-8')}"

    _, buffer_heat = cv2.imencode(".jpg", output_img)
    base64_heatmap = f"data:image/jpeg;base64,{base64.b64encode(buffer_heat).decode('utf-8')}"

    return base64_original, base64_heatmap