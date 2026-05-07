import fitz  # PyMuPDF
from collections import Counter
import re
from PIL import Image
from PIL.ExifTags import TAGS
import io
import cv2
import numpy as np

def detect_cloning(file_bytes: bytes) -> float:
    try:
        nparr = np.frombuffer(file_bytes, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if image is None: return 0.0
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        max_dim = 800
        h, w = gray.shape
        if max(h, w) > max_dim:
            scale = max_dim / max(h, w)
            gray = cv2.resize(gray, (int(w * scale), int(h * scale)))
        height, width = gray.shape
        block_size = 16 
        blocks = []
        for i in range(0, height - block_size, block_size):
            for j in range(0, width - block_size, block_size):
                block = gray[i:i+block_size, j:j+block_size].astype(np.float32)
                dct_block = cv2.dct(block)
                blocks.append((i, j, dct_block.flatten()))
        if len(blocks) < 2: return 0.0
        clone_matches = 0
        max_blocks = min(len(blocks), 400) 
        for idx in range(max_blocks):
            for jdx in range(idx + 1, max_blocks):
                f1, f2 = blocks[idx][2], blocks[jdx][2]
                if np.dot(f1, f2) / (np.linalg.norm(f1) * np.linalg.norm(f2) + 1e-6) > 0.98:
                    clone_matches += 1
        return float(min(clone_matches / max(max_blocks, 1), 1.0))
    except: return 0.0

def analyze_metadata_layer(file_bytes: bytes, mime_type: str) -> dict:
    is_suspicious, detected_tool, structural_anomalies, clone_score = False, "Unknown", [], 0.0
    suspicious_tools = ["canva", "adobe", "photoshop", "illustrator", "foxit", "ilovepdf", "gimp"]

    # 1. Base PDF metrics (Determine if this is a Resume or a Scanned Cert FIRST)
    is_scanned_document = True # Default to True for raw image uploads
    
    if "pdf" in mime_type.lower():
        try:
            doc = fitz.open(stream=file_bytes, filetype="pdf")
            metadata = doc.metadata
            producer = metadata.get("producer", "") or ""
            creator = metadata.get("creator", "") or ""
            detected_tool = producer if producer else creator if creator else "Unknown"
            
            total_page_area = 0.0
            total_image_area = 0.0
            text_count = 0
            
            for page in doc:
                page_area = page.rect.width * page.rect.height
                if page_area == 0: continue
                total_page_area += page_area
                
                for img_info in page.get_images(full=True):
                    xref = img_info[0]
                    for rect in page.get_image_rects(xref):
                        total_image_area += (rect.width * rect.height)
                        
                for b in page.get_text("dict")["blocks"]:
                    if b.get("type", -1) == 0:
                        text_count += 1
            
            if total_page_area > 0:
                image_coverage = total_image_area / total_page_area
                is_scanned_document = (image_coverage > 0.60)
                
                # If it's a scanned cert, run the Canva Vector Checks!
                if is_scanned_document:
                    is_tool_suspicious = any(tool in f"{producer} {creator}".lower() for tool in suspicious_tools)
                    if is_tool_suspicious:
                        structural_anomalies.append(f"CRITICAL: {detected_tool} was used to digitally inject text over a scanned document base. High probability of forgery.")
                        is_suspicious = True
                    elif 0 < text_count < 300:
                        structural_anomalies.append("CRITICAL: Suspicious vector text overlay detected on top of a full-page scanned image.")
                        is_suspicious = True
        except: pass
        
    else:
        # It's a raw image, run Exif cloning checks
        try:
            image = Image.open(io.BytesIO(file_bytes))
            exif = image._getexif()
            if exif:
                for tag_id, value in exif.items():
                    if TAGS.get(tag_id, tag_id) == 'Software':
                        detected_tool = str(value)
                        is_suspicious = any(tool in detected_tool.lower() for tool in suspicious_tools)
        except: pass
        clone_score = detect_cloning(file_bytes)
        if clone_score > 0.05: structural_anomalies.append(f"Copy-Move pixel cloning detected! Score: {clone_score:.2f}")

    # 2. Pixel Tampering Check (ELA)
    # ONLY run ELA if it's a Scanned Document! Pure digital Resumes will naturally have ELA spikes.
    if is_scanned_document:
        try:
            nparr = np.frombuffer(file_bytes, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            if img is not None:
                _, encoded = cv2.imencode('.jpg', img, [cv2.IMWRITE_JPEG_QUALITY, 90])
                recomp = cv2.imdecode(encoded, cv2.IMREAD_COLOR)
                diff = cv2.absdiff(img, recomp)
                gray_diff = cv2.cvtColor(diff, cv2.COLOR_BGR2GRAY)
                
                gray_original = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
                edges = cv2.Canny(gray_original, 50, 150)
                edge_mask = cv2.dilate(edges, np.ones((3,3), np.uint8), iterations=2)
                
                clean_diff = cv2.subtract(gray_diff, edge_mask)
                
                # Check for large pasted pixel anomalies
                _, thresh = cv2.threshold(clean_diff, 50, 255, cv2.THRESH_BINARY)
                contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
                
                large_anomalies = [c for c in contours if cv2.contourArea(c) > 300]
                if len(large_anomalies) > 0:
                    structural_anomalies.append("CRITICAL: Pixel-level Error Level Analysis (ELA) detected manual image tampering/pasting. Forensic heatmaps will show red highlighted areas.")
        except: pass

    return {"hidden_text_detected": False, "hidden_content": "None", "suspicious_metadata": is_suspicious, "metadata_tool": detected_tool, "structural_anomalies": structural_anomalies, "clone_score": clone_score}

def analyze_semantic_layer(text: str) -> dict:
    words = re.findall(r'\b[a-zA-Z]{3,}\b', text.lower())
    if not words: return {"stuffing_detected": False, "stuffed_keywords": []}
    stuffed_words = [word for word, count in Counter(words).items() if (count / len(words)) * 100 > 3.0 and word not in ["the", "and", "for", "with"]]
    return {"stuffing_detected": len(stuffed_words) > 0, "stuffed_keywords": stuffed_words}

def locate_claims_in_pdf(file_bytes: bytes, ai_analysis: dict, mime_type: str) -> dict:
    for claim_obj in ai_analysis.get("flagged_claims", []):
        claim_text = claim_obj.get("claim", "")
        claim_obj["box_hidden"] = False
        
        if any(tool in claim_text.lower() for tool in ["canva", "adobe", "photoshop", "ilovepdf", "metadata"]):
            claim_obj["box_hidden"] = True
            continue

        if "pdf" not in mime_type.lower():
            claim_obj["box_hidden"] = True 
            continue

        try:
            doc = fitz.open(stream=file_bytes, filetype="pdf")
            total_height = sum(page.rect.height for page in doc)
            page_count = len(doc)
            
            search_targets = []
            
            ic_match = re.search(r'\d{6}-?\d{2}-?\d{4}', claim_text)
            if ic_match:
                search_targets.append(ic_match.group(0))
                search_targets.append(ic_match.group(0).replace("-", ""))
                
            search_targets.append(claim_text.strip())
            
            words = [w for w in claim_text.replace("\n", " ").split() if len(w) > 4]
            search_targets.extend(sorted(words, key=len, reverse=True))
            
            rect_found = False
            for target in search_targets:
                if not target or rect_found: continue
                accumulated_y = 0
                for page_num in range(page_count):
                    page = doc[page_num]
                    
                    rects = page.search_for(target)
                    
                    if rects:
                        found_box = rects[0]
                        page_width = page.rect.width
                        claim_obj["page_num"] = page_num + 1
                        
                        # Dynamic Multi-page scaling! Divides padding by page count to prevent drift on long PDFs.
                        claim_obj["x_position"] = max(0, (found_box.x0 / page_width) * 100 - 1)
                        claim_obj["y_position"] = max(0, ((accumulated_y + found_box.y0) / total_height) * 100 - (0.8 / page_count))
                        claim_obj["box_width"] = min(100 - claim_obj["x_position"], (found_box.width / page_width) * 100 + 2)
                        claim_obj["box_height"] = (found_box.height / total_height) * 100 + (1.6 / page_count)
                        
                        rect_found = True
                        break
                    
                    # THE MISSING FIX: This adds the height of the current page to the accumulator before looping to the next page!
                    accumulated_y += page.rect.height
                
                if rect_found: break

            if not rect_found: 
                claim_obj["box_hidden"] = True
        except:
            claim_obj["box_hidden"] = True
            
    return ai_analysis