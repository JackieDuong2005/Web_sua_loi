import re
import hashlib
import time
import threading
from collections import OrderedDict
from typing import List, Dict, Tuple, Optional, Any

_PROSODY_CACHE_MAX_ENTRIES = 128
_prosody_script_cache: OrderedDict[str, dict] = OrderedDict()
_prosody_cache_lock = threading.Lock()

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

def compute_prosody_cache_key(passage: str, grade: int, chunk_mode: str, difficult_words: list) -> str:
    norm_passage = (passage or "").strip().lower()
    norm_words = ",".join(sorted(w.strip().lower() for w in (difficult_words or [])))
    key_str = f"{norm_passage}|grade={grade}|mode={chunk_mode}|diff={norm_words}"
    return hashlib.sha256(key_str.encode("utf-8")).hexdigest()

def get_cached_prosody_script(key: str) -> Optional[dict]:
    with _prosody_cache_lock:
        if key in _prosody_script_cache:
            _prosody_script_cache.move_to_end(key)
            return _prosody_script_cache[key]
    return None

def set_cached_prosody_script(key: str, data: dict):
    with _prosody_cache_lock:
        if key in _prosody_script_cache:
            _prosody_script_cache.move_to_end(key)
        _prosody_script_cache[key] = data
        if len(_prosody_script_cache) > _PROSODY_CACHE_MAX_ENTRIES:
            _prosody_script_cache.popitem(last=False)

def clean_raw_sgk_text(raw_text: str) -> Tuple[str, str]:
    if not raw_text:
        return "", ""

    text = raw_text.replace("\r\n", "\n").replace("\r", "\n")
    lines = text.split("\n")

    header_patterns = [
        re.compile(r"^(?:tiếng\s*việt|tập\s*đọc|chính\s*tả)\s*\d*(?:\s*[-–]\s*tập\s*\d*)?.*$", re.IGNORECASE),
        re.compile(r"^tuần\s*\d+.*$", re.IGNORECASE),
        re.compile(r"^bài\s*(?:đọc|học)?\s*\d+:?.*$", re.IGNORECASE),
        re.compile(r"^(?:trang|tr\.?)\s*\d+\b.*$", re.IGNORECASE),
        re.compile(r"^\s*\d+\s*(?:/\s*\d+)?\s*$"),
    ]

    exercise_cutoff = re.compile(
        r"^\s*(?:câu\s*\d+|câu\s*hỏi(?:\s*và\s*bài\s*tập)?|bài\s*tập(?:\s*\d+)?|luyện\s*từ\s*và\s*câu|tập\s*làm\s*văn|\*?\s*ghi\s*nhớ|\d+\.\s*(?:em\s+hãy|tìm|hãy|đặt\s+câu|chọn|đọc\s+lại)).*",
        re.IGNORECASE
    )

    valid_lines: List[str] = []
    for line in lines:
        stripped = line.strip()
        if not stripped:
            continue
        if exercise_cutoff.match(stripped):
            break
        if any(p.match(stripped) for p in header_patterns):
            continue
        cleaned_line = re.sub(r"\(?\b(?:trang|tr\.?)\s*\d+\b\)?", "", stripped, flags=re.IGNORECASE).strip()
        if cleaned_line:
            valid_lines.append(cleaned_line)

    if not valid_lines:
        return "", ""

    first_line = valid_lines[0]
    words_first = first_line.split()
    if len(words_first) <= 10 and not first_line.endswith((".", "!", "?")):
        title = first_line
        content_lines = valid_lines[1:]
    else:
        title = " ".join(words_first[:5])
        content_lines = valid_lines

    clean_content = "\n".join(content_lines).strip()
    if not clean_content and title:
        clean_content = title
        title = "Bài đọc chính tả"

    return title, clean_content

def segment_into_pedagogical_clauses(passage: str, chunk_mode: str = "phrase") -> List[str]:
    if not passage or not passage.strip():
        return []

    if chunk_mode == "sentence":
        delimiters = r"([\.!\?\n]+[\"'\u201d\u2019\)]*)"
    else:
        delimiters = r"([,;:!\?\.\n]+[\"'\u201d\u2019\)]*)"

    tokens = re.split(delimiters, passage)
    clauses = []
    current_text = ""
    for token in tokens:
        if not token:
            continue
        if re.match(delimiters, token):
            current_text += token
            clause_str = current_text.strip()
            if clause_str:
                clauses.append(clause_str)
            current_text = ""
        else:
            current_text += token

    if current_text.strip():
        clauses.append(current_text.strip())

    return clauses

def direct_prosody_script(
    passage: str,
    difficult_words: List[str] = None,
    grade: int = 3,
    chunk_mode: str = "phrase"
) -> Dict[str, Any]:
    raw_clauses = segment_into_pedagogical_clauses(passage, chunk_mode=chunk_mode)
    clean_diff_words = [w.strip() for w in (difficult_words or []) if w.strip()]
    
    clauses = []
    total_words = 0
    total_duration = 0.0
    
    for idx, text in enumerate(raw_clauses):
        word_count = len(text.split())
        total_words += word_count
        
        matched_diff = []
        lower_text = text.lower()
        for dw in clean_diff_words:
            dw_norm = dw.lower()
            pattern = rf"(?:\b|^){re.escape(dw_norm)}(?:\b|$)"
            if re.search(pattern, lower_text) or dw_norm in lower_text:
                matched_diff.append(dw)
                
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
    # Test 1: SGK Cleaning
    sample_sgk = """
    Tiếng Việt 3 - Tập 2
    Tuần 21 - Bài 3: Hội vật
    Trang 58
    
    Hội Vật Làng Em
    Tiếng trống vật dồn dập, giục giã bà con đổ về xới vật. Dưới ánh nắng vàng rực rỡ, hai đô vật thoăn thoắt so tài, những miếng võ hiểm hóc khiến người xem trầm trồ thán phục.
    
    58
    Câu 1: Tìm các từ ngữ miêu tả không khí hội vật?
    Câu 2: Em thích nhân vật nào trong bài đọc?
    Ghi nhớ: Hội vật là nét đẹp truyền thống.
    """
    title, content = clean_raw_sgk_text(sample_sgk)
    print("=== TEST 1: SGK CLEANING ===")
    print("Title:", title)
    print("Content:", content)
    assert "Câu 1" not in content and "Trang 58" not in content and "Hội vật là nét đẹp" not in content
    print("PASSED TEST 1")
    
    # Test 2: Prosody Director & Caching
    print("\n=== TEST 2: PROSODY DIRECTOR & CACHING ===")
    diffs = ["giục giã", "thoăn thoắt", "hiểm hóc"]
    cache_key = compute_prosody_cache_key(content, 3, "phrase", diffs)
    
    # Call 1 (Cache Miss)
    t0 = time.perf_counter()
    res1 = direct_prosody_script(content, diffs, grade=3, chunk_mode="phrase")
    miss_latency = (time.perf_counter() - t0) * 1000
    set_cached_prosody_script(cache_key, res1)
    print(f"Call 1 (Miss): {miss_latency:.3f} ms, Clauses: {len(res1['clauses'])}, Est duration: {res1['estimated_duration_sec']}s")
    
    # Call 2 (Cache Hit)
    t1 = time.perf_counter()
    res2 = get_cached_prosody_script(cache_key)
    hit_latency = (time.perf_counter() - t1) * 1000
    print(f"Call 2 (Hit): {hit_latency:.4f} ms (< 1ms)")
    assert res2 is not None
    assert hit_latency < 1.0, f"Cache hit took {hit_latency}ms >= 1.0ms"
    
    # Check verbatim invariant
    orig_words = content.split()
    clauses_words = [w for c in res1["clauses"] for w in c["text"].split()]
    assert orig_words == clauses_words, "Verbatim invariant failed!"
    print("Zero-Word-Mutation Invariant PASSED!")
    
    # Check difficult word pauses
    for c in res1["clauses"]:
        if c["matched_difficult_words"]:
            assert c["style"] == "emphasis"
            assert c["pause_sec"] >= 4.0, f"Pause should be >= 4.0s for difficult words, got {c['pause_sec']}"
    print("Difficult word +2.5s pause rule PASSED!")
    print("\nALL INTEGRATION TESTS PASSED 100%!")
