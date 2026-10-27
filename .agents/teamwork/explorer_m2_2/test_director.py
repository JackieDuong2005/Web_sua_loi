import re
from typing import List, Dict, Any

PROSODY_STYLE_PRESETS = {
    "warm_story": {
        "noise_scale": 0.78,
        "noise_w_scale": 0.90,
        "length_multiplier": 1.05,
        "label": "Truyền cảm, ấm áp",
        "default_rate": "-15%",
    },
    "standard": {
        "noise_scale": 0.667,
        "noise_w_scale": 0.80,
        "length_multiplier": 1.00,
        "label": "Chuẩn mực sư phạm",
        "default_rate": "-15%",
    },
    "emphasis": {
        "noise_scale": 0.58,
        "noise_w_scale": 0.72,
        "length_multiplier": 1.20,
        "label": "Nhấn mạnh từ khó",
        "default_rate": "-20%",
    },
    "question": {
        "noise_scale": 0.82,
        "noise_w_scale": 0.92,
        "length_multiplier": 1.08,
        "label": "Câu hỏi nhẹ nhàng",
        "default_rate": "-15%",
    },
}

def direct_prosody_script(
    passage: str,
    difficult_words: List[str] = None,
    grade: int = 3,
    chunk_mode: str = "phrase"
) -> Dict[str, Any]:
    from test_segmentation import segment_into_pedagogical_clauses
    
    raw_clauses = segment_into_pedagogical_clauses(passage, chunk_mode=chunk_mode)
    clean_diff_words = [w.strip() for w in (difficult_words or []) if w.strip()]
    
    clauses = []
    total_words = 0
    total_duration = 0.0
    
    for idx, text in enumerate(raw_clauses):
        word_count = len(text.split())
        total_words += word_count
        
        # 1. Tìm từ khó xuất hiện trong vế câu
        matched_diff = []
        lower_text = text.lower()
        for dw in clean_diff_words:
            # So khớp theo word boundary hoặc substring không phân biệt hoa thường
            dw_norm = dw.lower()
            pattern = rf"(?:\b|^){re.escape(dw_norm)}(?:\b|$)"
            if re.search(pattern, lower_text) or dw_norm in lower_text:
                matched_diff.append(dw)
                
        # 2. Xác định base style & base pause
        clean_end = text.rstrip("\"'\u201d\u2019\)")
        if clean_end.endswith("?"):
            base_style = "question"
            base_pause = 2.5
        elif clean_end.endswith((".", "!")):
            base_style = "warm_story"
            base_pause = 2.0
        else:
            base_style = "standard"
            base_pause = 1.5
            
        # 3. Áp dụng quy tắc từ khó nếu có
        if matched_diff:
            style = "emphasis"
            pause_sec = round(base_pause + 2.5, 1)
        else:
            style = base_style
            pause_sec = base_pause
            
        preset = PROSODY_STYLE_PRESETS[style]
        style_label = preset["label"]
        rate = preset["default_rate"]
        noise_scale = preset["noise_scale"]
        noise_w = preset["noise_w_scale"]
        
        # Thời lượng nói ước tính (giây) = số từ * tốc độ đọc tiểu học
        speaking_sec = word_count * 0.55 * (1.20 if style == "emphasis" else 1.05)
        clause_duration = speaking_sec + pause_sec
        total_duration += clause_duration
        
        clauses.append({
            "index": idx,
            "text": text,
            "word_count": word_count,
            "style": style,
            "style_label": style_label,
            "rate": rate,
            "noise_scale": noise_scale,
            "noise_w": noise_w,
            "pause_sec": pause_sec,
            "matched_difficult_words": matched_diff
        })
        
    return {
        "clauses": clauses,
        "total_words": total_words,
        "estimated_duration_sec": round(total_duration, 1),
    }

if __name__ == "__main__":
    passage = "Gió mùa thu se lạnh thổi qua từng kẽ lá. Bầu trời xanh trong vắt, không một gợn mây đen. Bạn có thấy mùa thu đẹp không? Những tia nắng vàng dịu dàng trải dài trên con đường làng thân quen."
    diffs = ["se lạnh", "trong vắt", "dịu dàng"]
    
    res = direct_prosody_script(passage, diffs, grade=3)
    print(f"Total words: {res['total_words']}, Est duration: {res['estimated_duration_sec']}s")
    for c in res["clauses"]:
        print(f"[{c['index']}] ({c['style']}, pause={c['pause_sec']}s, matched={c['matched_difficult_words']}): {c['text']}")
