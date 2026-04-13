import fitz  # PyMuPDF
from collections import Counter
import re

def analyze_metadata_layer(file_bytes: bytes, mime_type: str) -> dict:
    """LAYER 1: Detects white text (#FFFFFF) and 1-pixel hidden text."""
    if "pdf" not in mime_type.lower():
        return {"hidden_text_detected": False, "hidden_content": "None"}
        
    doc = fitz.open(stream=file_bytes, filetype="pdf")
    hidden_text_found = False
    hidden_words = []

    for page in doc:
        blocks = page.get_text("dict")["blocks"]
        for b in blocks:
            if "lines" in b:
                for l in b["lines"]:
                    for s in l["spans"]:
                        if s["size"] < 3 or s["color"] == 16777215:
                            hidden_text_found = True
                            hidden_words.append(s["text"].strip())

    return {
        "hidden_text_detected": hidden_text_found,
        "hidden_content": " ".join(hidden_words) if hidden_text_found else "None"
    }

def analyze_semantic_layer(text: str) -> dict:
    """LAYER 2: Term Frequency (TF) to mathematically catch keyword stuffing."""
    words = re.findall(r'\b[a-zA-Z]{3,}\b', text.lower())
    if not words:
        return {"stuffing_detected": False, "stuffed_keywords": []}
        
    total_words = len(words)
    word_counts = Counter(words)
    
    stuffed_words = []
    for word, count in word_counts.items():
        frequency_percentage = (count / total_words) * 100
        if frequency_percentage > 3.0 and word not in ["the", "and", "for", "with", "this", "that", "from", "your", "have"]:
            stuffed_words.append(word)

    return {
        "stuffing_detected": len(stuffed_words) > 0,
        "stuffed_keywords": stuffed_words
    }

def locate_claims_in_pdf(file_bytes: bytes, ai_analysis: dict, mime_type: str) -> dict:
    """Searches the PDF for claims and calculates CSS % coordinates across stitched height."""
    if "pdf" not in mime_type.lower():
        return ai_analysis

    try:
        doc = fitz.open(stream=file_bytes, filetype="pdf")
        total_height = sum(page.rect.height for page in doc)

        for claim_obj in ai_analysis.get("flagged_claims", []):
            claim_text = claim_obj.get("claim", "")
            if claim_text:
                words = claim_text.split()
                
                search_terms = [
                    claim_text,
                    " ".join(words[:5]) if len(words) >= 5 else "",
                    " ".join(words[:3]) if len(words) >= 3 else "",
                    words[0] if words else ""
                ]
                
                rect_found = None
                accumulated_y = 0
                page_found = -1
                page_width = 0
                
                for term in search_terms:
                    if not term or rect_found: continue
                    
                    curr_y = 0
                    for page_num in range(len(doc)):
                        page = doc[page_num]
                        rects = page.search_for(term)
                        
                        if rects:
                            rect_found = rects[0]
                            page_found = page_num
                            accumulated_y = curr_y
                            page_width = page.rect.width
                            break 
                        
                        curr_y += page.rect.height

                if rect_found:
                    claim_obj["page_num"] = page_found + 1
                    claim_obj["x_position"] = max(0, (rect_found.x0 / page_width) * 100 - 2)
                    
                    global_y = accumulated_y + rect_found.y0
                    claim_obj["y_position"] = max(0, (global_y / total_height) * 100 - 0.5)
                    
                    # 🟢 BOX SIZE FIX: Stretch to the right margin, and expand height based on sentence length!
                    claim_obj["box_width"] = min(95, 95 - claim_obj["x_position"]) 
                    estimated_lines = max(1, len(claim_text) // 70)
                    base_height = ((rect_found.y1 - rect_found.y0) / total_height) * 100
                    claim_obj["box_height"] = base_height + (1.5 * estimated_lines)
                    
    except Exception as e:
        print(f"⚠️ Could not locate claims: {e}")
        
    return ai_analysis