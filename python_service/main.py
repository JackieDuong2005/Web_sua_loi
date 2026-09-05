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
import threading
import os
import sys
from concurrent.futures import ThreadPoolExecutor
from typing import Optional

# ============================================================
# Issue #20 Fix: Vô hiệu hóa QuickEdit trên Windows Console cục bộ
# Ngăn chặn click chuột làm đóng băng tiến trình mà KHÔNG can thiệp Registry
# ============================================================
if sys.platform == "win32":
    try:
        import ctypes
        kernel32 = ctypes.windll.kernel32
        h_stdin = kernel32.GetStdHandle(-10)  # STD_INPUT_HANDLE = -10
        mode = ctypes.c_uint32()
        if kernel32.GetConsoleMode(h_stdin, ctypes.byref(mode)):
            ENABLE_QUICK_EDIT_MODE = 0x0040
            ENABLE_EXTENDED_FLAGS = 0x0080
            new_mode = (mode.value & ~ENABLE_QUICK_EDIT_MODE) | ENABLE_EXTENDED_FLAGS
            kernel32.SetConsoleMode(h_stdin, new_mode)
    except Exception:
        pass

# ============================================================
# ThreadPool cho ViT5 inference — không block FastAPI event loop
#
# Lý do max_workers mặc định = 1 là TỐI ƯU cho CPU:
#   PyTorch đã áp dụng Intra-op Parallelism qua torch.set_num_threads(n_cores)
#   → 1 lần suy luận tận dụng TOÀN BỘ nhân CPU đồng thời.
#   Nếu tăng workers > 1 trên CPU, các worker sẽ tranh chấp nhân CPU với nhau
#   (CPU Thrashing), kéo dài thời gian mỗi bài gấp đôi và tăng nguy cơ tràn RAM.
#
# Có thể điều chỉnh qua biến môi trường VIT5_WORKERS nếu triển khai
# trên máy chủ GPU hoặc khi cần thực nghiệm hiệu năng.
# ============================================================
_VIT5_WORKERS = int(os.getenv("VIT5_WORKERS", "1"))
_executor = ThreadPoolExecutor(max_workers=_VIT5_WORKERS)

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


# Các HƯ TỪ / TỪ CHỨC NĂNG không bao giờ lặp đôi trong ngữ pháp tiếng Việt chuẩn
# Nếu xuất hiện liền kề (VD: "là là", "và và", "của của"), chắc chắn là do học sinh gõ nhầm
ACCIDENTAL_REPEAT_WORDS = {
    'là', 'thì', 'mà', 'và', 'của', 'trong', 'ở', 'với', 'những', 'các',
    'để', 'bị', 'được', 'cho', 'từ', 'do', 'nếu', 'nhưng', 'bởi', 'vì',
    'sẽ', 'đã', 'đang', 'cũng', 'vẫn', 'rất', 'quá', 'lắm', 'một', 'cái',
    'con', 'này', 'kia', 'đó', 'nọ', 'ấy', 'thế', 'vậy'
}

# Các từ tượng thanh âm thanh có thể lặp 3 lần hợp lệ (tiếng cười, tiếng trống, tiếng chim...)
VALID_TRIPLE_REPEATS = {
    'ha', 'hô', 'he', 'hì', 'tùng', 'cắc', 'chát', 'cốc', 'reng', 'tíc', 'tắc', 'oa'
}


def remove_adjacent_duplicates(text: str, is_poetry: bool = False) -> str:
    """Xóa từ lặp liền kề do học sinh viết nhầm: 'đồng đồng' → 'đồng', 'là là' → 'là'.
    Bảo toàn các từ láy và điệp từ nghệ thuật tiếng Việt ('đêm đêm', 'ngày ngày', 'xanh xanh'...).
    Trong thơ ca: ưu tiên tối đa bảo tồn nhịp điệu bài thơ của học sinh.
    """
    words = text.split()
    if len(words) < 2:
        return text

    result = []
    i = 0
    while i < len(words):
        w_current = words[i].lower()

        # Đếm số lượng từ lặp liên tiếp giống hệt nhau
        repeat_count = 1
        while i + repeat_count < len(words) and words[i + repeat_count].lower() == w_current:
            repeat_count += 1

        if repeat_count == 1:
            result.append(words[i])
            i += 1
        elif repeat_count == 2:
            # 2 từ lặp đôi:
            # Nếu là hư từ/từ chức năng viết nhầm -> chỉ giữ 1 từ
            if w_current in ACCIDENTAL_REPEAT_WORDS:
                result.append(words[i])
                logger.info(f"🔧 Bỏ hư từ lặp nhầm: '{words[i]} {words[i+1]}' → '{words[i]}'")
            else:
                # Từ láy / điệp từ tiếng Việt (danh từ, tính từ, từ tượng thanh: ngày ngày, xanh xanh, ào ào...)
                # GIỮ NGUYÊN cả 2 từ
                result.append(words[i])
                result.append(words[i+1])
            i += 2
        else:
            # Lặp ≥ 3 từ liên tiếp:
            if w_current in VALID_TRIPLE_REPEATS:
                # Tiếng tượng thanh hợp lệ (ha ha ha, tùng tùng tùng...)
                for k in range(repeat_count):
                    result.append(words[i + k])
            elif is_poetry and w_current not in ACCIDENTAL_REPEAT_WORDS:
                # Trong thơ, cho phép điệp từ lặp 3 (trừ hư từ)
                for k in range(min(repeat_count, 3)):
                    result.append(words[i + k])
            else:
                # Viết nhầm lặp nhiều lần: thu gọn về 1 từ (nếu là hư từ) hoặc 2 từ (nếu là thực từ)
                keep_count = 1 if w_current in ACCIDENTAL_REPEAT_WORDS else 2
                for k in range(keep_count):
                    result.append(words[i + k])
                logger.info(f"🔧 Rút gọn từ lặp bất thường: '{w_current}' x{repeat_count} → x{keep_count}")
            i += repeat_count

    return ' '.join(result)


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
# CACHE KẾT QUẢ ViT5
# ============================================================
# Chính sách:
#   - Khóa cache (Cache Key): MD5 hash của văn bản đầu vào (chuẩn hóa lowercase + strip)
#   - Dung lượng tối đa: MAX_CACHE_SIZE mục
#   - Đào thải (Eviction): FIFO theo thứ tự chèn — khi đầy, mục cũ nhất bị xóa trước
#     (Python dict từ v3.7+ duy trì insertion order, nên `next(iter(cache))` = mục cũ nhất)
#   - TTL (Time-to-Live): 3600 giây (1 giờ) — mục hết hạn sẽ bị tải lại khi truy cập
#   - Fallback: Các văn bản ViT5 trả về nguyên gốc (không sửa được) không được cache,
#     để service tự động thử lại lần sau khi model có thể xử lý tốt hơn.
# ============================================================
_correction_cache: dict[str, str] = {}         # MD5 hash → corrected text
_cache_timestamps: dict[str, float] = {}        # MD5 hash → Unix timestamp khi cache
_failed_cache:     set[str]         = set()     # Hash của lần fallback — thử lại lần sau
MAX_CACHE_SIZE = 200
CACHE_TTL_SECONDS = 3600                        # 1 giờ

def _cache_key(text: str) -> str:
    """Sinh khóa cache bằng MD5 của văn bản đã chuẩn hóa."""
    return hashlib.md5(text.strip().lower().encode()).hexdigest()

def _cache_get(key: str) -> Optional[str]:
    """Lấy giá trị từ cache, trả None nếu không có hoặc đã hết hạn TTL."""
    if key not in _correction_cache:
        return None
    age = time.time() - _cache_timestamps.get(key, 0)
    if age > CACHE_TTL_SECONDS:
        # Mục đã hết hạn — xóa và bỏ qua
        _correction_cache.pop(key, None)
        _cache_timestamps.pop(key, None)
        logger.debug(f"⏰ Cache TTL hết hạn sau {age:.0f}s — tải lại từ ViT5")
        return None
    return _correction_cache[key]

def _cache_set(key: str, value: str) -> None:
    """Lưu vào cache với FIFO eviction khi đầy."""
    if len(_correction_cache) >= MAX_CACHE_SIZE:
        oldest = next(iter(_correction_cache))
        del _correction_cache[oldest]
        _cache_timestamps.pop(oldest, None)
    _correction_cache[key] = value
    _cache_timestamps[key] = time.time()


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
    """Phát hiện và loại bỏ hallucination trong output của ViT5.
    Fallback về original nếu:
      - Output lặp cụm từ ≥ 3 lần liên tiếp (repetition loop)
      - Output dài hơn input quá 1.5x (sinh thêm nội dung)
      - Output ngắn hơn input quá 0.5x (mất nội dung / cắt sai)
    """
    words = text.split()
    orig_words = original.split()
    if len(words) < 4:
        return text

    # 1. Kiểm tra repetition loop: cụm ≥ 3 từ lặp ≥ 3 lần liên tiếp
    for window in range(3, 6):
        for start in range(max(0, len(words) - window * 4)):
            phrase = tuple(words[start:start + window])
            count = 0
            for i in range(start, len(words) - window + 1, window):
                if tuple(words[i:i + window]) == phrase:
                    count += 1
                else:
                    break
            if count >= 3:
                phrase_str = ' '.join(phrase)
                # Kiểm tra đối chiếu với bản gốc: nếu bản gốc cũng có cụm này lặp lại (điệp khúc bài thơ/vè)
                # thì bảo tồn kết quả của học sinh, không coi là ảo giác lặp của ViT5
                orig_count = original.lower().count(phrase_str.lower())
                if orig_count >= 2:
                    logger.info(f"🌿 Điệp khúc nghệ thuật trong bài gốc ('{phrase_str}' x{orig_count}) — Bảo toàn kết quả.")
                    continue
                logger.warning(f"⚠️ ViT5 repetition loop: '{phrase_str}' x{count} — fallback")
                return None

    # 2. Kiểm tra hallucination: output dài hơn input 1.5x
    #    (ngưỡng cũ 2.5x quá cao — lặp gần x2 vẫn không bị bắt)
    if len(orig_words) >= 5 and len(words) > len(orig_words) * 1.5:
        logger.warning(f"⚠️ ViT5 output quá dài ({len(words)} vs {len(orig_words)} từ, ×{len(words)/len(orig_words):.2f}) — fallback")
        return None

    # 3. Kiểm tra mất nội dung: output ngắn hơn input 0.5x (model bị cắt sai)
    if len(orig_words) >= 8 and len(words) < len(orig_words) * 0.5:
        logger.warning(f"⚠️ ViT5 output quá ngắn ({len(words)} vs {len(orig_words)} từ, ×{len(words)/len(orig_words):.2f}) — fallback")
        return None

    if text.strip() == original.strip():
        logger.info("⚡ ViT5 không sửa được gì (output = input)")

    return text


def _dynamic_max_tokens(chunk: str) -> int:
    """Tính max_new_tokens tối thiểu cần thiết dựa trên độ dài chunk.
    Tiếng Việt ~1.5 token/ký tự (sentencepiece), buffer 1.5x để đủ cho output.
    Giới hạn 256 để khớp với max_length=256 của tokenizer.
    """
    estimated = int(len(chunk) * 1.5 * 1.5)
    return max(32, min(estimated, 256))


def _vit5_correct_chunks(chunks: list[str], tokenizer, model) -> list[str]:
    """Chạy ViT5 theo batch trên danh sách chunks.
    - BATCH=4: cân bằng giữa tốc độ (batch) và độ chính xác (padding ít hơn)
    - max_new_tokens động theo độ dài thực tế của chunk
    """
    import torch
    BATCH = 4  # 3→4: vẫn nhanh hơn 3, padding ít hơn 6
    corrected: list[str] = []

    for i in range(0, len(chunks), BATCH):
        batch = chunks[i:i + BATCH]
        max_tok = max(_dynamic_max_tokens(c) for c in batch)

        inputs = tokenizer(
            batch,
            return_tensors="pt",
            padding=True,
            truncation=True,
            max_length=256,  # Tăng lên 256 để không truncate input dài (128 quá nhỏ cho tiếng Việt có dấu)
        )
        with torch.inference_mode():
            outputs = model.generate(
                **inputs,
                max_new_tokens=max_tok,
                num_beams=1,
                do_sample=False,
                repetition_penalty=1.5,
                no_repeat_ngram_size=4,
            )
        raw_decoded = tokenizer.batch_decode(outputs, skip_special_tokens=True)
        for raw, orig in zip(raw_decoded, batch):
            result = _remove_repetition(raw, orig)
            corrected.append(orig if result is None else result)
    return corrected


def _split_prose_to_chunks(paragraph: str, max_chunk: int = 160) -> list[str]:
    """Tách đoạn văn xuôi thành các chunk ≤ max_chunk ký tự theo dấu câu.

    Tại sao max_chunk=160?
    - ViT5 tokenizer tiếng Việt: ~1.5 token/ký tự (có dấu thanh)
    - 160 ký tự x 1.5 ≈ 240 token ≤ 256 (context window mới) → không bị truncate
    - QUAN TRỌNG: KHÔNG dùng sliding window (prev_tail) vì nó khiến model
      "nhìn thấy" câu trước trong input và sinh lại câu đó trong output,
      gây ra hiện tượng lặp/thêm câu không có trong bản gốc.
    """
    sentences = re.split(r'(?<=[.!?])\s+', paragraph)
    sentences = [s.strip() for s in sentences if s.strip()]
    chunks: list[str] = []

    for sent in sentences:
        if len(sent) <= max_chunk:
            chunks.append(sent)
        else:
            # Câu dài: tách theo dấu phẩy
            parts = re.split(r',\s+', sent)
            current = ""
            for part in parts:
                candidate = (current + ", " + part).lstrip(", ") if current else part
                if len(candidate) <= max_chunk:
                    current = candidate
                else:
                    if current:
                        chunks.append(current)
                    # Nếu bản thân part vẫn dài, cắt cứng tại max_chunk
                    current = part[:max_chunk]
            if current:
                chunks.append(current)
    return chunks


def correct_with_vit5(text: str) -> str:
    """Sửa lỗi chính tả bằng ViT5, giữ nguyên cấu trúc \\n của OCR output."""
    ck = _cache_key(text)
    cached = _cache_get(ck)
    if cached is not None:
        logger.info("⚡ Cache hit — bỏ qua ViT5 inference")
        return cached

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

    # === Post-processing: xóa từ lặp liền kề mà ViT5 không xử lý được ===
    # (VD: "đồng đồng", "là là" do học sinh viết nhầm)
    is_poetry = (text_type == 'tho')
    result_lines = result.split('\n')
    result_lines_dedup = []
    for line in result_lines:
        if line.strip() and not _is_header_line(line):
            result_lines_dedup.append(remove_adjacent_duplicates(line, is_poetry=is_poetry))
        else:
            result_lines_dedup.append(line)
    result = '\n'.join(result_lines_dedup)

    # Lưu cache — chỉ cache khi kết quả không phải fallback hoàn toàn
    is_full_fallback = result.strip() == text.strip()
    if not is_full_fallback:
        _cache_set(ck, result)
    else:
        _failed_cache.add(ck)
        logger.warning("⚠️ ViT5 trả về nguyên văn gốc — không cache, sẽ thử lại lần sau")

    return result


# ============================================================
# THUẬT TOÁN CHẤM ĐIỂM LEVENSHTEIN / PHÂN TÍCH ÂM TIẾT TIẾNG VIỆT (Issue #23 Fix)
# ============================================================
TONE_COMBINING = {
    '\u0300': 'huyen',
    '\u0301': 'sac',
    '\u0303': 'nga',
    '\u0309': 'hoi',
    '\u0323': 'nang'
}

TONE_NAMES_VI = {
    'ngang': 'thanh ngang (không dấu)',
    'huyen': 'thanh huyền',
    'sac': 'thanh sắc',
    'hoi': 'thanh hỏi',
    'nga': 'thanh ngã',
    'nang': 'thanh nặng'
}

VIETNAMESE_INITIALS = [
    'ngh', 'ng', 'nh', 'ch', 'th', 'tr', 'ph', 'kh', 'gh', 'gi', 'qu',
    'b', 'c', 'd', 'đ', 'g', 'h', 'k', 'l', 'm', 'n', 'p', 'r', 's', 't', 'v', 'x', 'z'
]

VIETNAMESE_FINALS = ['ng', 'nh', 'ch', 'c', 'm', 'n', 'p', 't', 'i', 'y', 'o', 'u']


def remove_accents(s: str) -> str:
    nfd = unicodedata.normalize('NFD', s)
    return "".join(c for c in nfd if unicodedata.category(c) != 'Mn')


def extract_tone(s: str) -> tuple[str, str]:
    """Tách thanh điệu tiếng Việt: trả về (chuỗi_bỏ_dấu_thanh, tên_thanh)"""
    nfd = unicodedata.normalize('NFD', s.lower())
    tone = 'ngang'
    clean = []
    for c in nfd:
        if c in TONE_COMBINING:
            tone = TONE_COMBINING[c]
        else:
            clean.append(c)
    return unicodedata.normalize('NFC', ''.join(clean)), tone


def parse_vietnamese_syllable(word: str) -> dict:
    """Bóc tách cấu trúc âm tiết tiếng Việt 5 thành phần:
    Âm tiết = Âm đầu + Âm chính + Âm cuối + Thanh điệu
    """
    w = word.strip().lower()
    base, tone = extract_tone(w)

    init = ''
    rest = base

    # Xử lý đặc biệt phụ âm 'gi'
    if base == 'gi':
        init = 'gi'
        rest = 'i'
    elif base.startswith('gi') and len(base) > 2 and base[2] in 'êeaơu':
        init = 'gi'
        rest = base[2:]
    elif base.startswith('gi') and len(base) > 2 and base[2] == 'i':
        init = 'gi'
        rest = base[2:]
    else:
        for p in VIETNAMESE_INITIALS:
            if base.startswith(p):
                init = p
                rest = base[len(p):]
                break

    fin = ''
    nucleus = rest
    for f in VIETNAMESE_FINALS:
        if rest.endswith(f) and len(rest) > len(f):
            fin = f
            nucleus = rest[:-len(f)]
            break

    return {
        'word': word,
        'base': base,
        'tone': tone,
        'initial': init,
        'rhyme': rest,
        'nucleus': nucleus,
        'final': fin
    }


def classify_error_type(wrong: str, correct: str) -> tuple[str, str]:
    """Phân loại lỗi chính tả tiếng Việt dựa trên âm tiết học chuẩn (Issue #23 Fix).
    Trả về (error_type_code, error_type_label)
    """
    if wrong.lower() == correct.lower():
        return ("viet_hoa", "viet_hoa")

    pw = parse_vietnamese_syllable(wrong)
    pc = parse_vietnamese_syllable(correct)

    # 1. Sai dấu thanh: base (âm đầu + vần) giống hệt nhau
    if pw['base'] == pc['base'] and pw['tone'] != pc['tone']:
        return ("dau_thanh", "dau_thanh")

    # 2. Sai phụ âm đầu: Vần giống hệt nhau, chỉ khác âm đầu
    if pw['rhyme'] == pc['rhyme'] and pw['initial'] != pc['initial']:
        return ("phu_am_dau", "phu_am_dau")

    # 3. Sai phụ âm cuối: Âm đầu giống, âm chính giống, khác âm cuối
    if pw['initial'] == pc['initial'] and pw['nucleus'] == pc['nucleus'] and pw['final'] != pc['final']:
        return ("phu_am_cuoi", "phu_am_cuoi")

    # 4. Sai âm chính / nguyên âm: Âm đầu giống, âm cuối giống, khác âm chính
    if pw['initial'] == pc['initial'] and pw['final'] == pc['final'] and pw['nucleus'] != pc['nucleus']:
        return ("am_chinh", "am_chinh")

    # 5. Sai vần hỗn hợp: Âm đầu giống nhưng vần khác
    if pw['initial'] == pc['initial'] and pw['rhyme'] != pc['rhyme']:
        return ("van", "van")

    # 6. Thay thế từ / Khác biệt từ vựng hoàn toàn
    return ("thay_the_tu", "thay_the_tu")


ERROR_TYPE_LABELS = {
    "viet_hoa":    "Viết hoa",
    "dau_thanh":   "Sai dấu thanh",
    "phu_am_dau":  "Sai phụ âm đầu",
    "phu_am_cuoi": "Sai âm cuối",
    "am_chinh":    "Sai nguyên âm",
    "van":         "Sai vần",
    "thay_the_tu": "Khác biệt từ",
    "bo_sot_them": "Bỏ sót/Thêm chữ",
    "dau_cau":     "Dấu câu",
}


# ==============================================================================
# B. MODULE BIỂU CẢM & SÁNG TẠO (ISSUE #25 FIX)
# Thay thế triệt để heuristic đếm lặp từ và từ khóa 'vui/buồn/xanh' cũ
# ==============================================================================

REDUPLICATIONS_TUONG_THANH = {
    "róc rách", "râm ran", "véo von", "tí tách", "thì thào", "thì thầm", "rì rào",
    "xôn xao", "ào ào", "leng keng", "líu lo", "vi vu", "lộp độp", "lao xao",
    "khúc khích", "rầm rĩ", "thao thiết", "lách cách", "lục cục", "văng vẳng",
    "ríu rít", "ngân nga", "oang oang", "loảng xoảng", "rập rình", "vi vu",
    "thập thình", "ình ịch", "lập bập", "thủ thỉ", "thầm thì", "rè rè"
}

REDUPLICATIONS_TUONG_HINH = {
    "long lanh", "lấp lánh", "lung linh", "rực rỡ", "thoang thoảng", "dịu dàng",
    "thướt tha", "mơn mởn", "chập chùng", "nhấp nhô", "quanh co", "ngút ngát",
    "mê mê", "mênh mông", "bát ngát", "bập bùng", "trắng xóa", "xanh ngắt",
    "đỏ rực", "vàng óng", "chói chang", "nhung nhúc", "chênh vênh", "lom khom",
    "thoắt ẩn", "lặc lè", "dập dềnh", "thênh thang", "hùng vĩ", "nghiêng nghiêng",
    "nhè nhẹ", "êm ả", "lung linh", "chập chờn", "ngào ngạt", "ngọt ngào",
    "bâng khuâng", "xao xuyến", "bồi hồi", "tha thiết", "triều mến", "tươi tắn"
}

NEGATIVE_SIMILE_PHRASES = [
    "ví dụ như", "chẳng hạn như", "như vậy", "như thế", "như sau",
    "như đã nói", "cũng như", "như thế này", "như trên"
]

SIMILE_REGEX = re.compile(
    r'([^.!?\n,]{2,25})\s+(như là|tựa như|giống như|hệt như|như thể|tựa hồ|chẳng khác nào|như in|như)\s+([^.!?\n,]{2,30})',
    re.IGNORECASE | re.UNICODE
)

PERSONIFICATION_TITLES = ["ông", "bà", "chú", "bác", "cô", "dì", "chị", "anh"]
PERSONIFICATION_OBJECTS = [
    "mặt trời", "trăng", "gió", "mây", "bàng", "phượng", "chim", "sông",
    "suối", "núi", "cây", "hoa", "đồng hồ", "gà trống", "mưa", "nắng"
]
PERSONIFICATION_ACTIONS = [
    "thức dậy", "mỉm cười", "thì thầm", "nhảy múa", "ca hát", "chăm chỉ",
    "giận dữ", "chạy trốn", "kể chuyện", "vẫy tay", "khoác áo", "đứng nhìn"
]

def detect_reduplications(text: str) -> tuple[list[str], list[str]]:
    low = text.lower()
    found_sound = [w for w in REDUPLICATIONS_TUONG_THANH if w in low]
    found_vivid = [w for w in REDUPLICATIONS_TUONG_HINH if w in low]
    return found_sound, found_vivid

def detect_similes(text: str) -> list[str]:
    low = text.lower()
    for neg in NEGATIVE_SIMILE_PHRASES:
        low = low.replace(neg, "---")
    matches = []
    for match in SIMILE_REGEX.finditer(low):
        sub_a, marker, sub_b = match.group(1).strip(), match.group(2).strip(), match.group(3).strip()
        phrase = f"{sub_a} {marker} {sub_b}".strip()
        if len(sub_a.split()) >= 1 and len(sub_b.split()) >= 1:
            matches.append(phrase)
    return matches[:2]

def detect_personifications(text: str) -> list[str]:
    low = text.lower()
    found = []
    for title in PERSONIFICATION_TITLES:
        for obj in PERSONIFICATION_OBJECTS:
            pattern = f"{title} {obj}"
            if pattern in low and pattern not in found:
                found.append(pattern)
    for obj in PERSONIFICATION_OBJECTS:
        for act in PERSONIFICATION_ACTIONS:
            pattern = f"{obj} {act}"
            if pattern in low and pattern not in found:
                found.append(pattern)
    return found[:2]

def analyze_creativity_tier1(text: str) -> dict:
    """Chấm điểm sáng tạo (Barem 1.0đ) theo chuẩn Bộ GD&ĐT và trích xuất dẫn chứng."""
    sound_reds, vivid_reds = detect_reduplications(text)
    similes = detect_similes(text)
    personifications = detect_personifications(text)

    devices = []
    evidence = []

    all_reds = sound_reds + vivid_reds
    if all_reds:
        devices.append("tu_lay")
        evidence.append(f"Từ láy: {', '.join(all_reds[:3])}")
    if similes:
        devices.append("so_sanh")
        evidence.append(f"So sánh: '{similes[0]}'")
    if personifications:
        devices.append("nhan_hoa")
        evidence.append(f"Nhân hóa: '{personifications[0]}'")

    # Barem Bộ GD&ĐT: Tối đa 1.0đ
    if len(devices) >= 2 or (len(similes) >= 1 and len(all_reds) >= 2):
        score = 1.0
        note = "Bài viết giàu cảm xúc, sử dụng sáng tạo các biện pháp nghệ thuật."
    elif len(devices) == 1:
        score = 0.5
        note = f"Có ý thức sáng tạo, sử dụng {devices[0].replace('_', ' ')}."
    else:
        score = 0.0
        note = "Văn phong trần thuật đơn giản, chưa có biện pháp biểu cảm nổi bật."

    return {
        "score": score,
        "devices": devices,
        "evidence": evidence,
        "note": note
    }

# ==============================================================================
# TỪ ĐIỂN NHÃN LỖI CHÍNH TẢ SƯ PHẠM TIẾNG VIỆT
# ==============================================================================
ERROR_TYPE_VI_LABELS = {
    "phu_am_dau": "phụ âm đầu",
    "phu_am_cuoi": "âm cuối",
    "am_chinh": "nguyên âm",
    "van": "vần",
    "dau_thanh": "dấu thanh",
    "viet_hoa": "chữ viết hoa",
    "thay_the_tu": "dùng sai từ",
    "bo_sot_them": "bỏ sót hoặc viết thừa chữ",
    "dau_cau": "dấu câu",
}

# Ngân hàng nhận xét sư phạm đa dạng chuẩn Bộ GD&ĐT
DIVERSE_PEDAGOGICAL_TEMPLATES = {
    "high_creativity_clean": [
        "Cô rất khen ngợi con! Bài viết tràn đầy cảm xúc, biết vận dụng hình ảnh nghệ thuật rất sinh động và chữ viết sạch đẹp. Tiếp tục phát huy nhé!",
        "Bài văn của con thật giàu trí tưởng tượng và diễn đạt tự nhiên! Con viết đúng chính tả, câu từ trôi chảy, cô rất tự hào về con.",
        "Tuyệt vời lắm! Con có năng khiếu quan sát tinh tế và vốn từ phong phú. Toàn bài không mắc lỗi chính tả nào, cố gắng giữ vững phong độ nhé!",
        "Một bài viết xuất sắc! Cách con chọn lọc từ ngữ và dùng hình ảnh gợi cảm rất có duyên. Chúc mừng con đã hoàn thành bài viết thật ấn tượng!"
    ],
    "high_creativity_has_errors": [
        "Cô khen con biết dùng hình ảnh so sánh và từ láy rất sinh động! Con chỉ cần chú ý viết đúng {errors} để bài văn đạt điểm tuyệt đối nhé.",
        "Bài viết của con rất giàu cảm xúc và sáng tạo! Con nhớ rèn luyện thêm về {errors} để câu văn của mình hoàn thiện và chỉn chu hơn nhé.",
        "Ý văn của con rất hay và độc đáo! Lần sau con chú ý kiểm tra lại {errors} trước khi nộp bài để đạt kết quả cao nhất nhé. Cố gắng lên con!",
        "Cô rất thích cách con diễn đạt, giàu hình ảnh và tự nhiên! Con lưu ý rèn thêm {errors} để nét chữ và câu văn đều thật đẹp nhé."
    ],
    "medium_creativity_clean": [
        "Bài viết tốt, con diễn đạt tự nhiên và câu văn có hình ảnh gợi cảm. Chữ viết rõ ràng, sạch sẽ, hãy tiếp tục phát huy nhé con!",
        "Cô khen con viết đúng chủ đề, câu từ mạch lạc và không mắc lỗi chính tả. Con hãy thử thêm một vài hình ảnh so sánh để bài hay hơn nữa nhé!",
        "Bài làm rất chỉn chu và cẩn thận! Con giữ vở sạch, viết đúng chính tả. Tiếp tục rèn luyện để bài văn ngày càng truyền cảm hơn nhé."
    ],
    "medium_creativity_has_errors": [
        "Bài viết của con khá tốt, ý tứ rõ ràng và chân thành. Con chú ý rèn thêm về {errors} để bài viết được điểm cao hơn nhé!",
        "Câu văn của con diễn đạt tự nhiên, dễ hiểu. Con nhớ để ý phân biệt {errors} khi viết bài để không bị trừ điểm đáng tiếc nhé con.",
        "Cô thấy con có nhiều tiến bộ trong cách dùng từ! Con chỉ cần cẩn thận hơn ở {errors} là bài viết sẽ rất tuyệt vời đấy."
    ],
    "basic_clean": [
        "Bài viết của con đầy đủ ý, bám sát yêu cầu đề bài. Con viết đúng chính tả và nề nếp tốt, cô khen con nhé!",
        "Con đã hoàn thành bài viết rất cẩn thận, không mắc lỗi chính tả. Con hãy đọc thêm sách để vốn từ ngữ phong phú và sinh động hơn nhé!",
        "Bài làm sạch sẽ, đúng quy cách đoạn văn. Con tiếp tục rèn chữ và mở rộng ý văn để bài viết cuốn hút hơn nhé."
    ],
    "basic_has_errors": [
        "Bài viết của con bám sát đề bài và đủ ý. Con chú ý rèn thêm lỗi {errors} để bài văn của mình chỉn chu và tiến bộ hơn nhé!",
        "Con đã cố gắng hoàn thành bài viết. Lần sau con nhớ đọc lại bài để phát hiện và sửa các lỗi {errors} trước khi nộp bài nhé con!",
        "Ý văn của con mộc mạc và chân thật. Con cần rèn luyện thêm cách viết đúng {errors} để bài viết đạt kết quả tốt hơn nhé. Cố lên con!"
    ]
}

def build_fallback_pedagogical_comment(creativity_info: dict, errors: list[dict]) -> str:
    """Tạo lời nhận xét sư phạm mẫu đa dạng từ ngân hàng sư phạm chuẩn Bộ GD&ĐT."""
    import random
    st_raw = creativity_info.get("score", 0.0)
    has_errors = bool(errors and len(errors) > 0)

    err_labels = []
    for e in (errors or [])[:2]:
        lbl = e.get("error_label") or ERROR_TYPE_VI_LABELS.get(e.get("error_type", ""), e.get("error_type", "chính tả"))
        if lbl and lbl not in err_labels:
            err_labels.append(lbl)
    errors_str = " và ".join(err_labels) if err_labels else "chính tả"

    if st_raw >= 1.0:
        cat = "high_creativity_has_errors" if has_errors else "high_creativity_clean"
    elif st_raw >= 0.5:
        cat = "medium_creativity_has_errors" if has_errors else "medium_creativity_clean"
    else:
        cat = "basic_has_errors" if has_errors else "basic_clean"

    tpl_list = DIVERSE_PEDAGOGICAL_TEMPLATES.get(cat, DIVERSE_PEDAGOGICAL_TEMPLATES["basic_has_errors"])
    selected = random.choice(tpl_list)
    return selected.format(errors=errors_str)


# ==============================================================================
# C. TẦNG 2: SLM ENHANCER (QWEN2.5-0.5B-INSTRUCT)
# Sinh lời nhận xét sư phạm phong phú, tự động Fallback về Tầng 1
# ==============================================================================

_qwen_model = None
_qwen_tokenizer = None
_qwen_lock = threading.Lock()
ENABLE_QWEN_SLM = os.getenv("ENABLE_QWEN_SLM", "1").lower() in ("1", "true", "yes")
QWEN_MODEL_ID = os.getenv("QWEN_MODEL_ID", "Qwen/Qwen2.5-0.5B-Instruct")


def get_qwen_model():
    """Tải Lazy load mô hình Qwen2.5-0.5B-Instruct vào bộ nhớ."""
    global _qwen_model, _qwen_tokenizer
    if _qwen_model is not None:
        return _qwen_model, _qwen_tokenizer

    with _qwen_lock:
        if _qwen_model is not None:
            return _qwen_model, _qwen_tokenizer

        logger.info(f"⏳ [Tầng 2] Đang tải mô hình SLM: {QWEN_MODEL_ID}...")
        import torch
        from transformers import AutoModelForCausalLM, AutoTokenizer

        device = "cuda" if torch.cuda.is_available() else "cpu"
        tokenizer = AutoTokenizer.from_pretrained(QWEN_MODEL_ID)
        if device == "cuda":
            model = AutoModelForCausalLM.from_pretrained(
                QWEN_MODEL_ID,
                torch_dtype=torch.float16,
                device_map="auto"
            )
        else:
            model = AutoModelForCausalLM.from_pretrained(
                QWEN_MODEL_ID,
                torch_dtype=torch.float32
            )
        model.eval()
        _qwen_tokenizer = tokenizer
        _qwen_model = model
        logger.info(f"✅ [Tầng 2] Đã tải thành công SLM {QWEN_MODEL_ID} trên thiết bị {device}")
        return _qwen_model, _qwen_tokenizer


def clean_qwen_text(text: str) -> str:
    text = text.strip().strip('"\'”’')
    prefixes = [
        "lời nhận xét sư phạm cho học sinh:",
        "lời nhận xét sư phạm:",
        "lời phê sư phạm:",
        "lời phê:",
        "nhận xét của cô:",
        "cô giáo nhận xét:",
        "nhận xét:",
    ]
    lower = text.lower()
    for p in prefixes:
        if lower.startswith(p):
            text = text[len(p):].strip().strip(':').strip()
            lower = text.lower()
    last_punct = max(text.rfind('.'), text.rfind('!'))
    if last_punct != -1 and last_punct < len(text) - 1:
        text = text[:last_punct + 1]
    return text.strip()


def generate_pedagogical_comment_tier2(
    creativity_info: dict,
    errors: list[dict],
) -> dict:
    """Sinh lời nhận xét sư phạm bằng Qwen2.5-0.5B.
    Tự động Fallback về Tầng 1 nếu tắt SLM, timeout hoặc gặp ngoại lệ."""
    fallback_text = build_fallback_pedagogical_comment(creativity_info, errors)

    if not ENABLE_QWEN_SLM:
        return {
            "text": fallback_text,
            "source": "tang1_deterministic",
            "latency_ms": 0.0
        }

    t0 = time.time()
    try:
        model, tokenizer = get_qwen_model()
        import torch
        device = "cuda" if torch.cuda.is_available() else "cpu"

        st_raw = creativity_info.get("score", 0.0)
        evidence = creativity_info.get("evidence", [])
        evidence_str = "; ".join(evidence) if evidence else "Không có"

        err_labels = []
        for e in (errors or [])[:2]:
            lbl = e.get("error_label") or ERROR_TYPE_VI_LABELS.get(e.get("error_type", ""), e.get("error_type", "chính tả"))
            if lbl and lbl not in err_labels:
                err_labels.append(lbl)
        errors_str = " và ".join(err_labels) if err_labels else "Không mắc lỗi chính tả"

        system_prompt = (
            "Bạn là một cô giáo tiểu học Việt Nam dịu dàng, ân cần và giàu tình thương.\n"
            "Nhiệm vụ của bạn là viết đúng 1-2 câu lời nhận xét sư phạm ngắn gọn (dưới 40 từ) khích lệ con dựa trên kết quả bài làm.\n"
            "Nguyên tắc nhận xét:\n"
            "1. Xưng hô: xưng 'Cô' và gọi học sinh là 'con' (hoặc 'em').\n"
            "2. Nếu bài có sáng tạo: Hãy khen ngợi sự sáng tạo hoặc từ ngữ gợi cảm trước.\n"
            "3. Nếu bài có lỗi chính tả: Hãy nhẹ nhàng nhắc con chú ý rèn thêm lỗi đó.\n"
            "4. Giọng văn ấm áp, động viên, tuyệt đối không viết tiêu đề, không chê bai, chỉ viết trực tiếp câu nhận xét."
        )

        if evidence:
            creativity_desc = f"Có {evidence_str} sinh động"
        else:
            creativity_desc = "Bài viết rõ ràng, bám sát yêu cầu đề bài"

        user_content = (
            f"Thông tin bài viết của học sinh:\n"
            f"- Điểm nổi bật: {creativity_desc}\n"
            f"- Lỗi chính tả cần rèn thêm: {errors_str}\n"
            f"Viết 1-2 câu nhận xét của cô gửi cho con (khen ngợi sự cố gắng trước, nhắc nhở lỗi chính tả sau):"
        )

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_content}
        ]

        prompt_text = tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
        inputs = tokenizer([prompt_text], return_tensors="pt").to(device)

        with torch.no_grad():
            outputs = model.generate(
                **inputs,
                max_new_tokens=60,
                do_sample=True,
                temperature=0.75,
                top_p=0.9,
                repetition_penalty=1.15,
                pad_token_id=tokenizer.eos_token_id
            )

        generated_ids = outputs[0][inputs.input_ids.shape[1]:]
        raw_comment = tokenizer.decode(generated_ids, skip_special_tokens=True).strip()
        comment = clean_qwen_text(raw_comment)

        # Kiểm tra chất lượng và chuẩn sư phạm của câu sinh bởi Qwen
        invalid_words = [
            "toán", "dự thi", "thực tế cuộc sống", "bài thi", "tiếng anh", "bạn đã",
            "rất thấp", "điểm thấp", "vị trí", "kém", "yếu kém", "hỗ trợ mẹ"
        ]
        is_invalid = any(w in comment.lower() for w in invalid_words)
        has_teacher_tone = any(w in comment.lower() for w in ["cô", "con", "em", "khen", "chú ý", "bài viết", "cố gắng"])

        if not comment or len(comment.split()) < 4 or is_invalid or not has_teacher_tone:
            logger.info(f"🔄 [Tầng 2] Câu Qwen chưa chuẩn ({raw_comment}) -> Sử dụng nhận xét sư phạm chuẩn.")
            comment = fallback_text
            source = "tang1_diverse_pedagogy"
        else:
            source = "qwen2.5_0.5b"

        latency = round((time.time() - t0) * 1000, 2)
        return {
            "text": comment,
            "source": source,
            "latency_ms": latency
        }
    except Exception as e:
        logger.warning(f"⚠️ [Tầng 2] Qwen SLM không khả dụng ({e}) -> Fallback Tầng 1.")
        return {
            "text": fallback_text,
            "source": "tang1_deterministic_fallback",
            "latency_ms": round((time.time() - t0) * 1000, 2)
        }


def grade_with_levenshtein(
    student_text: str,
    corrected_text: str,
    penalty_per_error: float = 0.5,
    hinh_thuc_raw: Optional[float] = None,
    noi_dung_raw: Optional[float] = None,
) -> dict:
    """So khớp word-level giữa văn bản gốc và ViT5 đã sửa."""

    # Chốt chặn bài viết rỗng
    if not student_text or not student_text.strip():
        return {
            "original_text": "",
            "fixed_text": "",
            "corrections": [],
            "score_breakdown": {
                "chinh_ta":  {"raw": 0.0, "max": 4.0, "error_count": 0, "deduction": 4.0},
                "hinh_thuc": {"raw": 0.0, "max": 3.0, "note": "Chưa có bài viết"},
                "noi_dung":  {"raw": 0.0, "max": 2.0, "note": "Chưa có nội dung"},
                "sang_tao":  {"raw": 0.0, "max": 1.0, "note": "Chưa có nội dung", "devices": [], "evidence": []},
            },
            "score": "0.0/10",
            "overall_rating": "Cần cố gắng",
            "feedback": "Chưa có bài viết để chấm điểm.",
            "pedagogical_comment": "Học sinh chưa hoàn thành bài viết.",
            "engine": "vit5+levenshtein",
        }

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
                        "error_label": err_label,
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
                    "error_label": "Bỏ sót/Thêm chữ",
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
                "error_label": "Viết thiếu chữ",
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
                "error_label": "Viết thừa chữ",
                "is_dialect": False,
                "reason": f"Con bị viết thừa chữ '{extra}' rồi, chú ý nhé."
            })
            error_count += (j2 - j1)

    # Tính điểm
    chinh_ta_max  = 4.0
    chinh_ta_raw  = max(0.0, chinh_ta_max - (error_count * penalty_per_error))

    # Dùng giá trị giáo viên set, nếu không có thì dùng mặc định
    ht_raw  = round(min(3.0, max(0.0, hinh_thuc_raw)), 1) if hinh_thuc_raw is not None else 3.0
    nd_raw  = round(min(2.0, max(0.0, noi_dung_raw)),  1) if noi_dung_raw  is not None else 2.0

    # Sáng tạo — Tự động phân tích Tầng 1 (Issue #25 Fix)
    creativity_info = analyze_creativity_tier1(corrected_text)
    sang_tao_raw = creativity_info["score"]

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

    # Lời nhận xét sư phạm tổng hợp (Tầng 2 Qwen + Tầng 1 Fallback)
    comment_info = generate_pedagogical_comment_tier2(creativity_info, errors)
    pedagogical_comment = comment_info["text"]
    pedagogical_comment_source = comment_info["source"]

    # Nhận xét ngắn phản hồi nhanh
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
            "hinh_thuc": {"raw": ht_raw,        "max": 3.0, "note": "Trình bày chữ viết sạch đẹp"},
            "noi_dung":  {"raw": nd_raw,         "max": 2.0, "note": "Đúng chủ đề, đủ ý"},
            "sang_tao":  {
                "raw": sang_tao_raw,
                "max": 1.0,
                "note": creativity_info["note"],
                "devices": creativity_info["devices"],
                "evidence": creativity_info["evidence"]
            },
        },
        "score": f"{total_score}/10",
        "overall_rating": rating,
        "feedback": feedback,
        "pedagogical_comment": pedagogical_comment,
        "pedagogical_comment_source": pedagogical_comment_source,
        "engine": "vit5+levenshtein",
    }


def _error_reason(err_code: str, wrong: str, correct: str) -> str:
    pw = parse_vietnamese_syllable(wrong)
    pc = parse_vietnamese_syllable(correct)

    if err_code == "viet_hoa":
        return f"Chữ '{wrong}' cần viết hoa thành '{correct}' ở đầu câu hoặc tên riêng nhé."
    elif err_code == "dau_thanh":
        tw = TONE_NAMES_VI.get(pw['tone'], pw['tone'])
        tc = TONE_NAMES_VI.get(pc['tone'], pc['tone'])
        return f"Con viết '{wrong}' bị sai dấu thanh ({tw} thành {tc}), đúng phải là '{correct}' nhé."
    elif err_code == "phu_am_dau":
        iw = f"'{pw['initial']}'" if pw['initial'] else "không có âm đầu"
        ic = f"'{pc['initial']}'" if pc['initial'] else "không có âm đầu"
        return f"Con viết '{wrong}' sai phụ âm đầu ({iw} thành {ic}), đúng phải là '{correct}' nhé."
    elif err_code == "phu_am_cuoi":
        fw = f"'{pw['final']}'" if pw['final'] else "không có âm cuối"
        fc = f"'{pc['final']}'" if pc['final'] else "không có âm cuối"
        return f"Con viết '{wrong}' sai âm cuối ({fw} thành {fc}), đúng phải là '{correct}' nhé."
    elif err_code == "am_chinh":
        nw = f"'{pw['nucleus']}'"
        nc = f"'{pc['nucleus']}'"
        return f"Con viết '{wrong}' sai nguyên âm ({nw} thành {nc}), đúng phải là '{correct}' nhé."
    elif err_code == "van":
        return f"Con viết '{wrong}' sai vần '{pw['rhyme']}', đúng phải là vần '{pc['rhyme']}' trong '{correct}' nhé."
    elif err_code == "thay_the_tu":
        return f"Con viết chữ '{wrong}' khác với từ mẫu '{correct}'."
    return f"Sai chính tả: '{wrong}' → '{correct}'"


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


@app.post("/correct")
async def correct_endpoint(req: GradeRequest):
    """Chỉ sửa lỗi bằng ViT5, không chấm điểm.
    Dùng cho fire-and-forget khi hệ thống đã có gemini_fixed_text từ OCR.
    Endpoint này giúp ViT5 model vẫn 'hoạt động' trong pipeline báo cáo.
    """
    if not req.text or not req.text.strip():
        raise HTTPException(status_code=400, detail="Văn bản không được để trống")

    start = time.time()
    word_count = len(req.text.split())
    logger.info(f"📥 [/correct] Nhận văn bản: {word_count} từ")

    try:
        preprocessed = preprocess(req.text)

        loop = asyncio.get_event_loop()
        corrected = await loop.run_in_executor(
            _executor,
            correct_with_vit5,
            preprocessed
        )

        elapsed = int((time.time() - start) * 1000)
        logger.info(f"✅ [/correct] Hoàn tất trong {elapsed}ms")

        return {
            "original_text": req.text,
            "fixed_text": corrected,
            "processingTimeMs": elapsed,
        }
    except Exception as e:
        logger.error(f"❌ [/correct] Lỗi: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/tts")
async def tts_endpoint(text: str, voice: str = "vi-VN-HoaiMyNeural", rate: str = "-15%"):
    """Tạo âm thanh phát âm tiếng Việt chuẩn bằng Microsoft Edge-TTS
    (vi-VN-HoaiMyNeural giọng Nữ Bắc hoặc vi-VN-NamMinhNeural giọng Nam Bắc).
    """
    if not text or not text.strip():
        raise HTTPException(status_code=400, detail="Văn bản không được để trống")
    try:
        import edge_tts
        from fastapi.responses import Response

        # Chuẩn hóa tham số rate (tránh lỗi double-encoding như "-15%25" làm sập Edge-TTS)
        clean_rate = rate.replace("%25", "%").strip()
        if not clean_rate.endswith("%"):
            if clean_rate.startswith("+") or clean_rate.startswith("-"):
                clean_rate = f"{clean_rate}%"
            elif clean_rate.isdigit():
                clean_rate = f"+{clean_rate}%"
            else:
                clean_rate = "-15%"

        # Đảm bảo voice hợp lệ
        clean_voice = voice.strip()
        if clean_voice not in ["vi-VN-HoaiMyNeural", "vi-VN-NamMinhNeural"]:
            clean_voice = "vi-VN-HoaiMyNeural"

        communicate = edge_tts.Communicate(text.strip(), clean_voice, rate=clean_rate)
        audio_data = bytearray()
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                audio_data.extend(chunk["data"])

        if len(audio_data) == 0:
            raise HTTPException(status_code=500, detail="Không nhận được dữ liệu âm thanh từ Edge-TTS")

        return Response(
            content=bytes(audio_data),
            media_type="audio/mpeg",
            headers={
                "Content-Type": "audio/mpeg",
                "Cache-Control": "public, max-age=86400, s-maxage=86400",
            },
        )
    except HTTPException:
        raise
@app.get("/qwen/status")
async def qwen_status_endpoint():
    """Kiểm tra trạng thái cấu hình và tải của Qwen2.5-0.5B-Instruct."""
    is_loaded = _qwen_model is not None
    import torch
    has_cuda = torch.cuda.is_available()
    return {
        "enabled": ENABLE_QWEN_SLM,
        "model_id": QWEN_MODEL_ID,
        "is_loaded": is_loaded,
        "device": "cuda" if has_cuda else "cpu",
        "description": "Tầng 2: SLM Pedagogical Paraphraser (Qwen2.5-0.5B-Instruct)"
    }


class QwenTestRequest(BaseModel):
    creativity_score: float = 1.0
    evidence: list[str] = ["Từ láy: róc rách, thoang thoảng", "So sánh: 'dòng suối như dải lụa'"]
    errors: list[dict] = []


@app.post("/qwen/generate")
async def qwen_generate_endpoint(req: QwenTestRequest):
    """Endpoint thử nghiệm sinh lời nhận xét sư phạm trực tiếp bằng Qwen."""
    creativity_info = {
        "score": req.creativity_score,
        "evidence": req.evidence,
        "devices": ["tu_lay", "so_sanh"]
    }
    result = generate_pedagogical_comment_tier2(creativity_info, req.errors)
    return result


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")
