"""
ViHand Grade - Python Microservice
Sửa lỗi chính tả tiếng Việt bằng ViT5 + Chấm điểm bằng Levenshtein/SequenceMatcher
Optimized v2: batch processing, dynamic token budget, thread-pool parallel inference
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import re
import difflib
import unicodedata
import time
import logging
import hashlib
import asyncio
from concurrent.futures import ThreadPoolExecutor
from typing import Optional

# ThreadPool dùng riêng cho ViT5 inference (không block event loop FastAPI)
_executor = ThreadPoolExecutor(max_workers=1)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("vit5_service")

app = FastAPI(title="ViHand Grade - ViT5 Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================
# MODEL LOADING — PyTorch + Dynamic INT8 Quantization
# ============================================================
_tokenizer = None
_model     = None
_quantized = False

ORIGINAL_MODEL = "chamdentimem/ViT5_Vietnamese_Correction"


def get_model():
    """Tải model PyTorch và áp dụng Dynamic INT8 Quantization.
    Lần đầu mất ~30s (tải model). Các lần sau trả về ngay từ memory.
    """
    global _tokenizer, _model, _quantized
    if _model is not None:
        return _tokenizer, _model

    import torch
    from transformers import AutoTokenizer, AutoModelForSeq2SeqLM

    logger.info(f"⏳ Tải model: {ORIGINAL_MODEL}...")
    _tokenizer = AutoTokenizer.from_pretrained(ORIGINAL_MODEL, use_fast=False)
    _model     = AutoModelForSeq2SeqLM.from_pretrained(ORIGINAL_MODEL)
    _model.eval()  # Tắt dropout, batch norm theo mode train

    # === Áp dụng Dynamic INT8 Quantization ===
    try:
        logger.info("🔧 Áp dụng Dynamic INT8 Quantization...")
        _model = torch.quantization.quantize_dynamic(
            _model,
            {torch.nn.Linear},
            dtype=torch.qint8,
        )
        _quantized = True
        logger.info("✅ Model đã quantize INT8 — sẵn sàng trên CPU")
    except Exception as e:
        logger.warning(f"⚠️  Quantization thất bại ({e}), chạy model gốc.")
        _quantized = False

    # === Tận dụng toàn bộ nhân CPU (quan trọng cho Raspberry Pi) ===
    import os
    n_cores = os.cpu_count() or 4
    torch.set_num_threads(n_cores)
    logger.info(f"🖥️  Sử dụng {n_cores} nhân CPU cho PyTorch")

    return _tokenizer, _model


# ============================================================
# BỘ LỌC TEENCODE & TIỀN XỬ LÝ
# ============================================================
TEENCODE_DICT = {
    r'\bsưa\b': 'sữa', r'\bzậy\b': 'dậy', r'\brấc\b': 'rất',
    r'\bko\b': 'không', r'\bkhog\b': 'không', r'\bbít\b': 'biết',
    r'\bqá\b': 'quá', r'\bmềnh\b': 'mình', r'\bmún\b': 'muốn',
    r'\bj\b': 'gì', r'\btrc\b': 'trước', r'\bdc\b': 'được',
    r'\bctrai\b': 'con trai', r'\bkhôg\b': 'không', r'\bbme\b': 'bố mẹ',
    r'\bcta\b': 'chúng ta', r'\bmih\b': 'mình', r'\bmqh\b': 'mối quan hệ',
    r'\bcgai\b': 'con gái', r'\bnhữg\b': 'những', r'\bmng\b': 'mọi người',
    r'\br\b': 'rồi', r'\bqtam\b': 'quan tâm', r'\bthươg\b': 'thương',
    r'\bchug\b': 'chung', r'\btrườg\b': 'trường', r'\bthoy\b': 'thôi',
    r'\bđki\b': 'đăng ký', r'\bcv\b': 'công việc', r'\bcùg\b': 'cùng',
    r'\bpn\b': 'bạn', r'\bthjk\b': 'thích', r'\bktra\b': 'kiểm tra',
    r'\bnthe\b': 'như thế', r'\bchúg\b': 'chúng', r'\blòg\b': 'lòng',
    r'\btừg\b': 'từng', r'\brằg\b': 'rằng', r'\bsốg\b': 'sống',
    r'\bthuơng\b': 'thương', r'\bnhag\b': 'nhàng', r'\bvs\b': 'với',
}


def clean_teencode(text: str) -> str:
    for pattern, replacement in TEENCODE_DICT.items():
        text = re.sub(pattern, replacement, text, flags=re.IGNORECASE)
    return text


def fix_erratic_punctuation(text: str) -> str:
    text = re.sub(r'\s+([.,!?])', r'\1', text)
    text = re.sub(r'([.,!?])\s*([.,!?])+', r'\1', text)
    text = re.sub(r'[.,!?]{2,}', '.', text)
    return text


def preprocess(text: str) -> str:
    """Tiền xử lý toàn bộ văn bản nhưng GIỮ NGUYÊN cấu trúc \\n."""
    lines = text.split('\n')
    cleaned_lines = [fix_erratic_punctuation(clean_teencode(line)) for line in lines]
    return '\n'.join(cleaned_lines)


def detect_text_type(text: str) -> str:
    """Nhận biết văn bản là THƠ CA hay VĂN XUÔI dựa trên cấu trúc dòng.
    Output: 'tho' hoặc 'van_xuoi'
    """
    lines = [l.strip() for l in text.split('\n') if l.strip()]
    # Bỏ dòng tiêu đề (dòng 1)
    content_lines = lines[1:] if len(lines) > 1 else lines
    if not content_lines:
        return 'van_xuoi'
    # Thơ: nhiều dòng ngắn (độ dài trung bình < 40 ký tự)
    avg_len = sum(len(l) for l in content_lines) / len(content_lines)
    if avg_len < 40 and len(content_lines) >= 2:
        return 'tho'
    return 'van_xuoi'


# ============================================================
# CACHE KẾT QUẢ ViT5 — Tránh xử lý lại cùng một văn bản
# ============================================================
_correction_cache: dict[str, str] = {}   # MD5 hash → corrected text
_failed_cache:     set[str]        = set() # Hash của các lần fallback — không cache, thử lại lần sau
MAX_CACHE_SIZE = 200

def _cache_key(text: str) -> str:
    return hashlib.md5(text.strip().lower().encode()).hexdigest()


# ============================================================
# Sửa LỗI BẰNG ViT5 (Tối ưu cho CPU & Raspberry Pi)
# ============================================================
def _is_header_line(line: str) -> bool:
    """Kiểm tra dòng có phải là tiêu đề/nhãn không (VD: 'Làm bài:', 'Đề bài:').
    Những dòng này GIỮ NGUYÊN, không cho ViT5 xử lý — chúng thường gây repetition loop.
    """
    stripped = line.strip()
    # Dòng kết thúc bằng ':' và ngắn (≤ 30 ký tự)
    if stripped.endswith(':') and len(stripped) <= 30:
        return True
    # Dòng có cụm đặc trưng của nhãn
    header_keywords = ['đề bài', 'làm bài', 'bài làm', 'họ tên', 'lớp', 'ngày']
    low = stripped.lower()
    if any(kw in low for kw in header_keywords) and len(stripped) <= 50:
        return True
    return False


def _remove_repetition(text: str, original: str) -> str:
    """Phát hiện và loại bỏ repetition loop trong output của ViT5.
    Nếu phát hiện lặp, trả về original (OCR gốc) và đánh dấu là FAILED để không cache.
    """
    words = text.split()
    if len(words) < 6:
        return text

    # Kiểm tra: nếu có cụm ≥ 3 từ lặp lại ≥ 3 lần liên tiếp → đang bị loop
    for window in range(3, 6):
        for start in range(len(words) - window * 3):
            phrase = tuple(words[start:start + window])
            count = 0
            for i in range(start, len(words) - window + 1, window):
                if tuple(words[i:i + window]) == phrase:
                    count += 1
                else:
                    break
            if count >= 3:
                logger.warning(f"⚠️ ViT5 repetition loop: '{' '.join(phrase)}' x{count} — fallback")
                return None  # None = đánh dấu FAILED, không cache

    # Kiểm tra tỉ lệ output/input quá lớn
    if len(words) > len(original.split()) * 2.5:
        logger.warning(f"⚠️ ViT5 output quá dài ({len(words)} vs {len(original.split())} từ) — fallback")
        return None  # None = FAILED

    if text.strip() == original.strip():
        logger.info("⚡ ViT5 không sửa được gì (output = input)")

    return text


def _dynamic_max_tokens(chunk: str) -> int:
    """Tính max_new_tokens tối thiểu cần thiết dựa trên độ dài chunk.
    Tránh generate dư token → nhanh hơn đáng kể cho chunk ngắn.
    """
    word_count = len(chunk.split())
    # Tiếng Việt ~1.3 token/từ, buffer 1.4x để chắc chắn
    estimated = int(word_count * 1.3 * 1.4)
    return max(32, min(estimated, 120))


def _vit5_correct_chunks(chunks: list[str], tokenizer, model) -> list[str]:
    """Chạy ViT5 theo batch trên danh sách chunks, trả về danh sách đã sửa.
    - BATCH=6: giảm overhead padding/decode so với BATCH=3
    - max_new_tokens động: tiết kiệm ~30-40% thời gian cho chunk ngắn
    """
    import torch
    BATCH = 6  # Tăng từ 3→6: RPi4 RAM đủ, giảm số lần forward pass
    corrected: list[str] = []

    for i in range(0, len(chunks), BATCH):
        batch = chunks[i:i + BATCH]

        # max_new_tokens = max của tất cả chunk trong batch (để batch hợp lệ)
        max_tok = max(_dynamic_max_tokens(c) for c in batch)

        inputs = tokenizer(
            batch,
            return_tensors="pt",
            padding=True,
            truncation=True,
            max_length=128,
        )
        with torch.inference_mode():
            outputs = model.generate(
                **inputs,
                max_new_tokens=max_tok,   # Động thay vì cố định 100
                num_beams=1,              # Greedy — nhanh nhất
                do_sample=False,
                repetition_penalty=1.5,
                no_repeat_ngram_size=4,
            )
        raw_decoded = tokenizer.batch_decode(outputs, skip_special_tokens=True)
        for raw, orig in zip(raw_decoded, batch):
            result = _remove_repetition(raw, orig)
            corrected.append(orig if result is None else result)
    return corrected


def _split_prose_to_chunks(paragraph: str, max_chunk: int = 120) -> list[str]:
    """Tách đoạn văn xuôi thành các chunk ≤ max_chunk ký tự theo dấu câu.
    Tăng max_chunk 100→120: giảm số chunk → ít forward pass hơn.
    """
    sentences = re.split(r'(?<=[.!?])\s+', paragraph)
    sentences = [s.strip() for s in sentences if s.strip()]
    chunks: list[str] = []
    for sent in sentences:
        if len(sent) <= max_chunk:
            chunks.append(sent)
        else:
            parts = re.split(r',\s+', sent)
            current = ""
            for part in parts:
                candidate = (current + ", " + part).lstrip(", ") if current else part
                if len(candidate) <= max_chunk:
                    current = candidate
                else:
                    if current:
                        chunks.append(current)
                    current = part if len(part) <= max_chunk else part
            if current:
                chunks.append(current)
    return chunks


def correct_with_vit5(text: str) -> str:
    """Sửa lỗi chính tả bằng ViT5, giữ nguyên cấu trúc \\n của OCR output."""
    ck = _cache_key(text)
    if ck in _correction_cache:
        logger.info("⚡ Cache hit — bỏ qua ViT5 inference")
        return _correction_cache[ck]

    tokenizer, model = get_model()

    lines = [l for l in text.split('\n')]  # Giữ nguyên cả dòng trống
    if not lines:
        return text

    # Chỉ treat dòng 0 là tiêu đề khi nó rõ ràng là header label hoặc ngắn hơn 3x so với nội dung
    first_line = lines[0].strip()
    content_avg_len = 0
    if len(lines) > 1:
        content_lens = [len(l.strip()) for l in lines[1:] if l.strip()]
        content_avg_len = sum(content_lens) / len(content_lens) if content_lens else 0

    has_real_title = (
        len(lines) > 1
        and any(l.strip() for l in lines[1:])
        and (
            _is_header_line(first_line)                           # Dạng 'Làm bài:'
            or (content_avg_len > 0 and len(first_line) < content_avg_len / 3)  # Tiêu đề thực sự ngắn
        )
    )

    if has_real_title:
        title_line = lines[0]
        content_lines = lines[1:]
    else:
        title_line = None
        content_lines = lines

    text_type = detect_text_type(text)
    logger.info(f"⚡ ViT5: phát hiện '{text_type}' | {len(content_lines)} dòng nội dung | title={'có' if has_real_title else 'không'}")

    if text_type == 'tho':
        # THƠ CA: sửa từng dòng độc lập, bỏ qua dòng header
        result_content: list[str] = []
        for line in content_lines:
            if not line.strip() or _is_header_line(line):
                result_content.append(line)  # Giữ nguyên
                continue
            fixed = _vit5_correct_chunks([line], tokenizer, model)
            result_content.append(fixed[0] if fixed else line)
        corrected_body = '\n'.join(result_content)
    else:
        # VĂN XUÔI: xử lý từng đoạn riêng biệt, bỏ qua dòng header
        corrected_paragraphs: list[str] = []
        for para in content_lines:
            if not para.strip():
                corrected_paragraphs.append('')
                continue
            if _is_header_line(para):
                corrected_paragraphs.append(para)  # Giữ nguyên 'Làm bài:', 'Đề bài:' ...
                continue
            chunks = _split_prose_to_chunks(para)
            if not chunks:
                corrected_paragraphs.append(para)
                continue
            corrected_chunks = _vit5_correct_chunks(chunks, tokenizer, model)
            corrected_paragraphs.append(' '.join(corrected_chunks))
        corrected_body = '\n'.join(corrected_paragraphs)

    result = (title_line + '\n' + corrected_body) if has_real_title else corrected_body

    # Lưu cache — chỉ cache khi kết quả không phải fallback hoàn toàn
    ck_result = _cache_key(result)
    is_full_fallback = result.strip() == text.strip()
    if not is_full_fallback:
        if len(_correction_cache) >= MAX_CACHE_SIZE:
            oldest = next(iter(_correction_cache))
            del _correction_cache[oldest]
        _correction_cache[ck] = result
    else:
        _failed_cache.add(ck)
        logger.warning("⚠️ ViT5 trả về nguyên văn gốc — không cache, sẽ thử lại lần sau")

    return result


# ============================================================
# THUẬT TOÁN CHẤM ĐIỂM LEVENSHTEIN / SEQUENCEMATCHER
# ============================================================
def remove_accents(s: str) -> str:
    nfd = unicodedata.normalize('NFD', s)
    return "".join(c for c in nfd if unicodedata.category(c) != 'Mn')


def classify_error_type(wrong: str, correct: str) -> tuple[str, str]:
    """Trả về (error_type_code, error_type_label)"""
    if wrong.lower() == correct.lower():
        return ("viet_hoa", "viet_hoa")

    if remove_accents(wrong.lower()) == remove_accents(correct.lower()):
        return ("dau_thanh", "dau_thanh")

    # Kiểm tra các phụ âm đầu phổ biến
    phu_am_pairs = [
        ('c', 'k'), ('k', 'c'), ('c', 'q'), ('q', 'c'),
        ('g', 'gh'), ('gh', 'g'), ('ng', 'ngh'), ('ngh', 'ng'),
        ('d', 'gi'), ('gi', 'd'), ('d', 'r'), ('r', 'd'),
        ('s', 'x'), ('x', 's'), ('ch', 'tr'), ('tr', 'ch'),
        ('l', 'n'), ('n', 'l'), ('z', 'd'),
    ]
    w_lower = remove_accents(wrong.lower())
    c_lower = remove_accents(correct.lower())
    for (a, b) in phu_am_pairs:
        if w_lower.startswith(a) and c_lower.startswith(b):
            return ("phu_am_dau", "phu_am_dau")

    return ("van", "van")


ERROR_TYPE_LABELS = {
    "viet_hoa":    "Viết hoa",
    "dau_thanh":   "Sai dấu thanh",
    "phu_am_dau":  "Sai phụ âm đầu",
    "van":         "Sai vần",
    "bo_sot_them": "Bỏ sót/Thêm chữ",
    "dau_cau":     "Dấu câu",
}


def auto_sang_tao(text: str) -> tuple[float, str]:
    """Tự động chấm điểm Sáng tạo dựa trên phân tích văn bản.
    - 1.0: có biện pháp nghệ thuật rõ (điệp ngữ + hình ảnh gợi cảm)
    - 0.5: có một trong hai yếu tố trên
    - 0.0: câu văn bình thường
    """
    t = text.lower()
    words = t.split()

    # Biện pháp so sánh / hình ảnh gợi cảm
    fig_keywords = ["như là", "tựa như", "giống như", "như thể", "xanh", "vui", "buồn",
                    "tiếng", "ánh", "ngọt", "thơm", "lấp lánh", "rực rỡ", "dịu dàng"]
    has_fig = any(kw in t for kw in fig_keywords)

    # Điệp ngữ: từ xuất hiện >= 3 lần
    word_freq: dict = {}
    for w in words:
        word_freq[w] = word_freq.get(w, 0) + 1
    has_dieu_ngu = any(v >= 3 for v in word_freq.values())

    # Văn bản dài (cố gắng diễn đạt nhiều)
    is_long = len(words) >= 40

    if has_dieu_ngu and has_fig:
        return 1.0, "Có điệp ngữ và biện pháp nghệ thuật"
    elif has_dieu_ngu:
        return 0.5, "Có điệp ngữ"
    elif has_fig:
        return 0.5, "Có hình ảnh gợi cảm"
    elif is_long:
        return 0.5, "Văn bản đầy đủ, thể hiện sự cố gắng"
    else:
        return 0.0, "Không có"


def grade_with_levenshtein(
    student_text: str,
    corrected_text: str,
    penalty_per_error: float = 0.5,
    hinh_thuc_raw: Optional[float] = None,
    noi_dung_raw: Optional[float] = None,
) -> dict:
    """So khớp word-level giữa văn bản gốc và ViT5 đã sửa."""

    def _is_title_line(line: str, all_lines: list[str]) -> bool:
        """Kiểm tra dòng có phải tiêu đề thực sự không.
        Tiêu đề thực sự: ngắn hơn trung bình các dòng khác đáng kể.
        """
        stripped = line.strip()
        if not stripped:
            return False
        if _is_header_line(stripped):
            return True
        # Tính độ dài trung bình các dòng còn lại
        other_lines = [l.strip() for l in all_lines[1:] if l.strip()]
        if not other_lines:
            return False
        avg_len = sum(len(l) for l in other_lines) / len(other_lines)
        # Tiêu đề thường ngắn hơn 50% so với trung bình nội dung
        return len(stripped) < avg_len * 0.5 and len(stripped) <= 60

    def _extract_content(text: str) -> str:
        """Lấy phần nội dung — bỏ dòng tiêu đề NẼu dòng đó thực sự là tiêu đề."""
        lines = text.split('\n')
        if len(lines) > 1 and _is_title_line(lines[0], lines):
            content_lines = lines[1:]
        else:
            content_lines = lines
        return ' '.join(l.strip() for l in content_lines if l.strip())

    student_content  = _extract_content(student_text)
    corrected_content = _extract_content(corrected_text)

    # Xóa dấu câu để so sánh từ — tránh ViT5 tự thêm dấu chấm bị đếm lỗi
    clean_student = re.sub(r'[^\w\s]', '', student_content).strip()
    clean_ai      = re.sub(r'[^\w\s]', '', corrected_content).strip()

    student_words = clean_student.split()
    ai_words      = clean_ai.split()

    matcher = difflib.SequenceMatcher(None, ai_words, student_words)
    errors = []
    error_count = 0

    for tag, i1, i2, j1, j2 in matcher.get_opcodes():
        if tag == 'replace':
            if (i2 - i1) == (j2 - j1):
                for c_idx, o_idx in zip(range(i1, i2), range(j1, j2)):
                    correct_w = ai_words[c_idx]
                    wrong_w   = student_words[o_idx]
                    err_code, err_label = classify_error_type(wrong_w, correct_w)
                    errors.append({
                        "error":      wrong_w,
                        "suggestion": correct_w,
                        "error_type": err_code,
                        "is_dialect": False,
                        "reason":     _error_reason(err_code, wrong_w, correct_w)
                    })
                    error_count += 1
            else:
                wrong_chunk = " ".join(student_words[j1:j2])
                correct_chunk = " ".join(ai_words[i1:i2])
                errors.append({
                    "error": wrong_chunk,
                    "suggestion": correct_chunk,
                    "error_type": "bo_sot_them",
                    "is_dialect": False,
                    "reason": f"Con viết '{wrong_chunk}' nhưng đúng phải là '{correct_chunk}' nhé."
                })
                error_count += max((i2 - i1), (j2 - j1))

        elif tag == 'delete':
            missing = " ".join(ai_words[i1:i2])
            errors.append({
                "error": "[Trống]",
                "suggestion": missing,
                "error_type": "bo_sot_them",
                "is_dialect": False,
                "reason": f"Con bị viết thiếu chữ '{missing}' rồi nhé."
            })
            error_count += (i2 - i1)

        elif tag == 'insert':
            extra = " ".join(student_words[j1:j2])
            errors.append({
                "error": extra,
                "suggestion": "[Không có]",
                "error_type": "bo_sot_them",
                "is_dialect": False,
                "reason": f"Con bị viết thừa chữ '{extra}' rồi, chú ý nhé."
            })
            error_count += (j2 - j1)

    # Tính điểm
    chinh_ta_max  = 4.0
    chinh_ta_raw  = max(0.0, chinh_ta_max - (error_count * penalty_per_error))

    # Dùng giá trị giáo viên set, nếu không có thì dùng mặc định
    ht_raw  = round(min(3.0, max(0.0, hinh_thuc_raw)), 1) if hinh_thuc_raw is not None else 2.5
    nd_raw  = round(min(2.0, max(0.0, noi_dung_raw)),  1) if noi_dung_raw  is not None else 1.5

    # Sáng tạo — Tự động phân tích
    sang_tao_raw, sang_tao_note = auto_sang_tao(corrected_text)

    total_score = chinh_ta_raw + ht_raw + nd_raw + sang_tao_raw
    total_score = round(min(10.0, total_score), 1)

    # Xếp loại
    if total_score >= 9.0:
        rating = "Xuất sắc"
    elif total_score >= 7.0:
        rating = "Tốt"
    elif total_score >= 5.0:
        rating = "Khá"
    elif total_score >= 3.0:
        rating = "Trung bình"
    else:
        rating = "Cần cố gắng"

    # Nhận xét
    if error_count == 0:
        feedback = "Bài viết xuất sắc! Con không mắc lỗi chính tả nào. Tiếp tục phát huy nhé!"
    elif error_count <= 2:
        feedback = f"Bài viết tốt! Con chỉ mắc {error_count} lỗi nhỏ. Chú ý sửa những từ đã được đánh dấu để bài viết hoàn thiện hơn nhé."
    else:
        feedback = f"Con còn mắc {error_count} lỗi chính tả trong bài. Con hãy xem lại từng lỗi được chỉ ra và luyện tập thêm nhé! Cố gắng lên!"

    return {
        "original_text": student_text,
        "fixed_text": corrected_text,
        "corrections": errors,
        "score_breakdown": {
            "chinh_ta":  {"raw": chinh_ta_raw,  "max": chinh_ta_max, "error_count": error_count, "deduction": round(error_count * penalty_per_error, 1)},
            "hinh_thuc": {"raw": ht_raw,        "max": 3.0, "note": "Giáo viên đánh giá"},
            "noi_dung":  {"raw": nd_raw,         "max": 2.0, "note": "Giáo viên đánh giá"},
            "sang_tao":  {"raw": sang_tao_raw,   "max": 1.0, "note": sang_tao_note},
        },
        "score": f"{total_score}/10",
        "overall_rating": rating,
        "feedback": feedback,
        "engine": "vit5+levenshtein",
    }


def _error_reason(err_code: str, wrong: str, correct: str) -> str:
    reasons = {
        "viet_hoa":   f"Chữ '{wrong}' cần viết hoa thành '{correct}' ở đầu câu hoặc tên riêng nhé.",
        "dau_thanh":  f"Con viết '{wrong}' bị sai dấu thanh, phải là '{correct}' nhé.",
        "phu_am_dau": f"Con viết '{wrong}' sai phụ âm đầu, đúng phải là '{correct}' nhé.",
        "van":        f"Con viết '{wrong}' sai vần, phải là '{correct}' nhé.",
    }
    return reasons.get(err_code, f"Sai chính tả: '{wrong}' → '{correct}'")


# ============================================================
# API ENDPOINTS
# ============================================================
class GradeRequest(BaseModel):
    text: str
    penalty_per_error: Optional[float] = 0.5
    hinh_thuc:         Optional[float] = None   # giáo viên set trước
    noi_dung:          Optional[float] = None   # giáo viên set trước


class HealthResponse(BaseModel):
    status: str
    model_loaded: bool


@app.get("/health", response_model=HealthResponse)
def health():
    return {
        "status": "ok",
        "model_loaded": _model is not None,
        "backend": "pytorch-int8" if _quantized else "pytorch-fp32",
    }


@app.post("/grade")
async def grade_endpoint(req: GradeRequest):
    if not req.text or not req.text.strip():
        raise HTTPException(status_code=400, detail="Văn bản không được để trống")

    start = time.time()
    word_count = len(req.text.split())
    logger.info(f"📥 Nhận văn bản: {word_count} từ")

    try:
        # 1. Tiền xử lý (nhanh — không block)
        preprocessed = preprocess(req.text)

        # 2. Sửa lỗi ViT5 — chạy trong ThreadPool để không block event loop
        #    Giúp FastAPI vẫn nhận request khác trong khi inference đang chạy
        logger.info(f"⏳ Chạy ViT5 (batch inference, max_tok động)...")
        loop = asyncio.get_event_loop()
        corrected = await loop.run_in_executor(
            _executor,
            correct_with_vit5,
            preprocessed
        )
        logger.info(f"✅ ViT5 xong: {corrected[:80]}...")

        # 3. Chấm điểm (nhanh — không cần executor)
        result = grade_with_levenshtein(
            req.text, corrected,
            penalty_per_error=req.penalty_per_error,
            hinh_thuc_raw=req.hinh_thuc,
            noi_dung_raw=req.noi_dung,
        )

        elapsed = int((time.time() - start) * 1000)
        result["processingTimeMs"] = elapsed
        result["tokenCount"] = 0
        result["wordCount"] = word_count

        logger.info(f"✅ Hoàn tất trong {elapsed}ms ({word_count} từ) | Điểm: {result['score']}")
        return result

    except Exception as e:
        logger.error(f"❌ Lỗi: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.on_event("startup")
async def startup_event():
    """Tải model lên RAM ngay khi khởi động server, tránh chậm ở lần chấm đầu tiên"""
    logger.info("==========================================")
    logger.info("ĐANG TẢI MÔ HÌNH VIT5 LÊN RAM...")
    logger.info("Vui lòng đợi khoảng 10-30 giây...")
    try:
        get_model()
        logger.info("✅ TẢI MÔ HÌNH THÀNH CÔNG! HỆ THỐNG ĐÃ SẴN SÀNG.")
    except Exception as e:
        logger.error(f"❌ LỖI TẢI MÔ HÌNH: {e}")
    logger.info("==========================================")

@app.post("/preload")
def preload_model():
    """Tải model trước để request đầu tiên không bị chậm (dùng cho API trigger)"""
    try:
        get_model()
        return {"status": "model loaded"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")
