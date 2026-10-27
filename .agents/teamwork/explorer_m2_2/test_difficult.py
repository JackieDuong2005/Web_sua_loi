import re
from typing import List, Tuple

VIETNAMESE_STOPWORDS = {
    "của", "và", "có", "các", "những", "một", "trong", "trên", "dưới", "được", 
    "với", "lại", "ra", "vào", "này", "đó", "thì", "là", "mà", "ở", "cho", 
    "như", "đã", "sẽ", "đang", "bởi", "vì", "để", "làm", "lại", "rất", "cũng"
}

DIFFICULT_PHONETIC_REGEX = re.compile(
    r"\b([a-zđàáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵ]+)\b",
    re.IGNORECASE
)

DIFFICULT_FEATURES = [
    re.compile(r"^(?:tr|ch|s|x|r|gi|d)[a-zđàáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵ]+", re.I),
    re.compile(r"[a-zđ]*(?:oang|oanh|uông|uôn|ương|ươn|ươp|uôm|oay|oăt|uât|iêu|uôi|uy|uyp|oe|oa)[a-zđ]*", re.I),
    re.compile(r"[ảãẻẽỉĩỏõởỡửữỷỹ]", re.I), # Dấu hỏi, ngã
]

def extract_deterministic_difficult_words(text: str, max_words: int = 5) -> List[str]:
    """Trích xuất từ khó chính tả theo thuật toán ngữ âm sư phạm tiếng Việt GDPT 2018."""
    # Tìm các cụm 2 từ (từ ghép / từ láy) trước
    sentences = re.split(r"[.\n!?]", text)
    candidates = []
    
    # 1. Tìm các từ láy / từ ghép 2 âm tiết
    for s in sentences:
        words = [w.strip(" ,;:\"'") for w in s.split() if w.strip(" ,;:\"'")]
        for i in range(len(words) - 1):
            w1 = words[i].lower()
            w2 = words[i + 1].lower()
            if w1 in VIETNAMESE_STOPWORDS or w2 in VIETNAMESE_STOPWORDS:
                continue
            pair = f"{words[i]} {words[i+1]}"
            # Kiểm tra âm tiết khó hoặc từ láy (cùng âm đầu hoặc vần)
            score = 0
            if any(f.search(w1) for f in DIFFICULT_FEATURES):
                score += 1
            if any(f.search(w2) for f in DIFFICULT_FEATURES):
                score += 1
            # Từ láy âm đầu
            if len(w1) > 1 and len(w2) > 1 and w1[0] == w2[0]:
                score += 2
            if score >= 2:
                candidates.append((pair, score))

    # 2. Tìm các từ đơn khó
    words = [w.strip(" ,;:\"'") for w in text.split() if w.strip(" ,;:\"'")]
    for w in words:
        wl = w.lower()
        if wl in VIETNAMESE_STOPWORDS or len(wl) <= 2:
            continue
        score = sum(1 for f in DIFFICULT_FEATURES if f.search(wl))
        if score >= 2:
            candidates.append((w, score))

    # Sắp xếp theo score giảm dần, loại bỏ trùng lặp
    candidates.sort(key=lambda x: x[1], reverse=True)
    selected = []
    seen = set()
    for word, _ in candidates:
        wl = word.lower()
        if wl not in seen and not any(wl in s or s in wl for s in seen):
            seen.add(wl)
            selected.append(word)
            if len(selected) >= max_words:
                break
                
    return selected

if __name__ == "__main__":
    content = "Gió mùa thu se lạnh thổi qua từng kẽ lá. Bầu trời xanh trong vắt, không một gợn mây đen. Những tia nắng vàng dịu dàng trải dài trên con đường làng thân quen."
    diffs = extract_deterministic_difficult_words(content)
    print("Difficult words:", diffs)
