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

    # AI Intel Warning - SYNCED WITH ELA_VISION EDGE MASKING
    try:
        nparr = np.frombuffer(file_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is not None:
            _, encoded = cv2.imencode('.jpg', img, [cv2.IMWRITE_JPEG_QUALITY, 90])
            recomp = cv2.imdecode(encoded, cv2.IMREAD_COLOR)
            diff = cv2.absdiff(img, recomp)
            gray_diff = cv2.cvtColor(diff, cv2.COLOR_BGR2GRAY)
            
            # Apply the exact same Edge Mask used in the visual layer
            gray_original = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            edges = cv2.Canny(gray_original, 50, 150)
            edge_mask = cv2.dilate(edges, np.ones((3,3), np.uint8), iterations=2)
            
            # Subtract edges from the diff before checking max error
            clean_diff = cv2.subtract(gray_diff, edge_mask)
            ela_enhanced = cv2.convertScaleAbs(clean_diff, alpha=15.0, beta=0)
            
            # Now it only triggers if actual pasted blocks remain
            if np.max(ela_enhanced) > 50:
                structural_anomalies.append("CRITICAL: Pixel-level Error Level Analysis (ELA) detected manual image tampering/pasting. Forensic heatmaps will show red highlighted areas.")
    except: pass

    if "pdf" not in mime_type.lower():
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
        return {"hidden_text_detected": False, "hidden_content": "None", "suspicious_metadata": is_suspicious, "metadata_tool": detected_tool, "structural_anomalies": structural_anomalies, "clone_score": clone_score}
        
    doc = fitz.open(stream=file_bytes, filetype="pdf")
    hidden_text_found, hidden_words = False, []
    metadata = doc.metadata
    producer, creator = metadata.get("producer", "") or "", metadata.get("creator", "") or ""
    is_suspicious = any(tool in f"{producer} {creator}".lower() for tool in suspicious_tools)
    detected_tool = producer if producer else creator if creator else "Unknown"

    for page in doc:
        for b in page.get_text("dict")["blocks"]:
            if "lines" in b:
                for l in b["lines"]:
                    spans = l.get("spans", [])
                    if len(spans) > 1:
                        base_size, base_font = round(spans[0]["size"], 1), spans[0]["font"]
                        for s in spans[1:]:
                            text_chunk = s["text"].strip()
                            if not text_chunk: continue 
                            curr_size, curr_font = round(s["size"], 1), s["font"]
                            if abs(curr_size - base_size) > 0.2 or curr_font != base_font:
                                structural_anomalies.append(f"Font mismatch on '{text_chunk}'. {base_font} to {curr_font}.")

    return {"hidden_text_detected": hidden_text_found, "hidden_content": " ".join(hidden_words) if hidden_text_found else "None", "suspicious_metadata": is_suspicious, "metadata_tool": detected_tool, "structural_anomalies": structural_anomalies, "clone_score": 0.0}

def analyze_semantic_layer(text: str) -> dict:
    words = re.findall(r'\b[a-zA-Z]{3,}\b', text.lower())
    if not words: return {"stuffing_detected": False, "stuffed_keywords": []}
    stuffed_words = [word for word, count in Counter(words).items() if (count / len(words)) * 100 > 3.0 and word not in ["the", "and", "for", "with"]]
    return {"stuffing_detected": len(stuffed_words) > 0, "stuffed_keywords": stuffed_words}

def locate_claims_in_pdf(file_bytes: bytes, ai_analysis: dict, mime_type: str) -> dict:
    for claim_obj in ai_analysis.get("flagged_claims", []):
        claim_text = claim_obj.get("claim", "")
        claim_obj["box_hidden"] = False
        
        # Hide ONLY if the claim is explicitly a software tool name
        if any(tool in claim_text.lower() for tool in ["canva", "adobe", "photoshop", "ilovepdf", "metadata"]):
            claim_obj["box_hidden"] = True
            continue

        if "pdf" not in mime_type.lower():
            claim_obj["box_hidden"] = True 
            continue

        try:
            doc = fitz.open(stream=file_bytes, filetype="pdf")
            total_height = sum(page.rect.height for page in doc)
            clean_claim = claim_text.replace("\n", " ").strip()
            
            # The clean_no_dash trick for IC numbers
            clean_no_dash = clean_claim.replace("-", "")
            words = [w for w in clean_claim.replace("-", " ").split() if len(w) > 3]
            search_targets = [clean_claim, clean_no_dash] + sorted(words, key=len, reverse=True)
            
            rect_found = False
            for target in search_targets:
                if not target or rect_found: continue
                accumulated_y = 0
                for page_num in range(len(doc)):
                    page = doc[page_num]
                    
                    # 1. Standard Search
                    rects = page.search_for(target)
                    
                    # 2. Fuzzy Word Search
                    if not rects:
                        all_words = page.get_text("words")
                        for w_info in all_words:
                            if target.lower() in w_info[4].lower():
                                rects = [fitz.Rect(w_info[:4])]
                                break

                    if rects:
                        found_box = rects[0]
                        page_width = page.rect.width
                        claim_obj["page_num"] = page_num + 1
                        claim_obj["x_position"] = max(0, (found_box.x0 / page_width) * 100 - 2)
                        global_y = accumulated_y + found_box.y0
                        claim_obj["y_position"] = max(0, (global_y / total_height) * 100 - 1)
                        claim_obj["box_width"] = min(98 - claim_obj["x_position"], (found_box.width / page_width) * 100 + 4)
                        claim_obj["box_height"] = (found_box.height / total_height) * 100 + 2.0
                        rect_found = True
                        break
                    accumulated_y += page.rect.height

            # If NOT found, hide the box so we don't show a fake location
            if not rect_found: 
                claim_obj["box_hidden"] = True
        except:
            claim_obj["box_hidden"] = True
            
    return ai_analysis