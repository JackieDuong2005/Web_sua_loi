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
import json
import random
from concurrent.futures import ThreadPoolExecutor
from typing import Optional, Union, List, Tuple, Dict, Any
from collections import OrderedDict
import warnings

# Suppress known harmless deprecation warnings (torch.ao.quantization, T5Tokenizer)
warnings.filterwarnings("ignore", category=DeprecationWarning)
warnings.filterwarnings("ignore", category=FutureWarning)
warnings.filterwarnings("ignore", message=".*torch.ao.quantization.*")
warnings.filterwarnings("ignore", message=".*T5Tokenizer.*")

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
# Tắt log cảnh báo thiếu phoneme ID không ảnh hưởng của Piper VITS
logging.getLogger("piper.phoneme_ids").setLevel(logging.ERROR)

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
    _tokenizer = AutoTokenizer.from_pretrained(ORIGINAL_MODEL, use_fast=False, legacy=False)
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

    enable_vit5 = os.getenv("ENABLE_VIT5", "1").lower() not in ("0", "false", "no", "off")
    if not enable_vit5 and _model is None:
        logger.info("⚡ ENABLE_VIT5=0: Bỏ qua ViT5 inference, giữ nguyên văn bản (Gemini API xử lý sửa lỗi)")
        return text

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
        "Một bài viết xuất sắc! Cách con chọn lọc từ ngữ và dùng hình ảnh gợi cảm rất có duyên. Chúc mừng con đã hoàn thành bài viết thật ấn tượng!",
        "Văn phong của con rất trong sáng và cuốn hút. Con biết chọn chi tiết đắt giá và viết hoa đúng quy tắc. Hãy tiếp tục nuôi dưỡng tình yêu văn học nhé!",
        "Cô rất ấn tượng với lối hành văn sinh động của con! Bài làm hoàn hảo từ chính tả đến cảm xúc, xứng đáng là bài văn mẫu của lớp."
    ],
    "high_creativity_has_errors": [
        "Cô khen con biết dùng hình ảnh so sánh và từ láy rất sinh động! Con chỉ cần chú ý viết đúng {errors} để bài văn đạt điểm tuyệt đối nhé.",
        "Bài viết của con rất giàu cảm xúc và sáng tạo! Con nhớ rèn luyện thêm về {errors} để câu văn của mình hoàn thiện và chỉn chu hơn nhé.",
        "Ý văn của con rất hay và độc đáo! Lần sau con chú ý kiểm tra lại {errors} trước khi nộp bài để đạt kết quả cao nhất nhé. Cố gắng lên con!",
        "Cô rất thích cách con diễn đạt, giàu hình ảnh và tự nhiên! Con lưu ý rèn thêm {errors} để nét chữ và câu văn đều thật đẹp nhé.",
        "Con có năng khiếu viết văn rất tốt, giàu trí tưởng tượng. Nhớ đọc lại bài cẩn thận hơn để phát hiện và sửa các lỗi {errors} nhé con.",
        "Từng câu văn của con đều gợi hình gợi cảm. Chỉ tiếc một chút ở lỗi {errors}, con chú ý luyện tập thêm để bài viết điểm 10 trọn vẹn nhé!"
    ],
    "medium_creativity_clean": [
        "Bài viết tốt, con diễn đạt tự nhiên và câu văn có hình ảnh gợi cảm. Chữ viết rõ ràng, sạch sẽ, hãy tiếp tục phát huy nhé con!",
        "Cô khen con viết đúng chủ đề, câu từ mạch lạc và không mắc lỗi chính tả. Con hãy thử thêm một vài hình ảnh so sánh để bài hay hơn nữa nhé!",
        "Bài làm rất chỉn chu và cẩn thận! Con giữ vở sạch, viết đúng chính tả. Tiếp tục rèn luyện để bài văn ngày càng truyền cảm hơn nhé.",
        "Con nắm chắc cấu trúc bài văn, câu văn gãy gọn và rõ ràng. Con thử dùng thêm từ gợi tả âm thanh hoặc màu sắc để bài sinh động hơn nhé!",
        "Cô đánh giá cao sự nghiêm túc và nề nếp viết bài của con. Bài viết không lỗi chính tả, hãy tiếp tục phát huy phong độ này nhé!"
    ],
    "medium_creativity_has_errors": [
        "Bài viết của con khá tốt, ý tứ rõ ràng và chân thành. Con chú ý rèn thêm về {errors} để bài viết được điểm cao hơn nhé!",
        "Câu văn của con diễn đạt tự nhiên, dễ hiểu. Con nhớ để ý phân biệt {errors} khi viết bài để không bị trừ điểm đáng tiếc nhé con.",
        "Cô thấy con có nhiều tiến bộ trong cách dùng từ! Con chỉ cần cẩn thận hơn ở {errors} là bài viết sẽ rất tuyệt vời đấy.",
        "Con bám sát yêu cầu đề bài và có nhiều ý văn hay. Nhớ rèn thêm kỹ năng nhận diện {errors} khi viết chính tả nhé con.",
        "Cách hành văn của con khá trôi chảy. Con hãy dành thêm thời gian luyện viết những từ chứa {errors} để tự tin hơn trong các bài sau nhé!"
    ],
    "basic_clean": [
        "Bài viết của con đầy đủ ý, bám sát yêu cầu đề bài. Con viết đúng chính tả và nề nếp tốt, cô khen con nhé!",
        "Con đã hoàn thành bài viết rất cẩn thận, không mắc lỗi chính tả. Con hãy đọc thêm sách để vốn từ ngữ phong phú và sinh động hơn nhé!",
        "Bài làm sạch sẽ, đúng quy cách đoạn văn. Con tiếp tục rèn chữ và mở rộng ý văn để bài viết cuốn hút hơn nhé.",
        "Cô khen con viết bài nghiêm túc, đúng ngữ pháp và không sai chính tả. Hãy tự tin mở rộng thêm cảm xúc của bản thân vào bài nhé con!",
        "Nét chữ và cách trình bày của con rất đáng khen. Con tiếp tục đọc thêm các bài văn hay để học hỏi thêm cách mở đoạn sinh động nhé."
    ],
    "basic_has_errors": [
        "Bài viết của con bám sát đề bài và đủ ý. Con chú ý rèn thêm lỗi {errors} để bài văn của mình chỉn chu và tiến bộ hơn nhé!",
        "Con đã cố gắng hoàn thành bài viết. Lần sau con nhớ đọc lại bài để phát hiện và sửa các lỗi {errors} trước khi nộp bài nhé con!",
        "Ý văn của con mộc mạc và chân thật. Con cần rèn luyện thêm cách viết đúng {errors} để bài viết đạt kết quả tốt hơn nhé. Cố lên con!",
        "Cô thấy con có nhiều cố gắng trong bài làm hôm nay. Con hãy luyện viết lại các từ có lỗi {errors} vào vở rèn chữ nhé.",
        "Con đã hiểu đề và viết tương đối trọn vẹn. Chỉ cần tập trung sửa thêm {errors} là bài viết sẽ tiến bộ rõ rệt đấy con!"
    ],
    "dictation_clean": [
        "Bài viết rất cẩn thận, không mắc lỗi chính tả nào. Con viết đúng chuẩn bài đọc mẫu, cô rất khen ngợi!",
        "Chữ viết sạch sẽ, đều nét và hoàn thành đúng 100% bài đọc. Con tiếp tục giữ vững phong độ nhé!",
        "Con lắng nghe và chép bài rất tập trung, bài làm chỉn chu không sai một từ nào. Cô rất tự hào về con!",
        "Rất xuất sắc! Nề nếp bài viết mẫu mực, chữ viết nắn nót và không có lỗi chính tả. Tiếp tục phát huy nhé con!",
        "Cô khen con nghe viết chuẩn xác, đặt dấu thanh và viết hoa đúng vị trí. Chúc mừng con đạt kết quả rất tốt!"
    ],
    "dictation_has_errors": [
        "Cô khen con đã cố gắng hoàn thành bài viết! Lần sau con chú ý viết cẩn thận hơn các lỗi {errors} nhé.",
        "Bài viết khá tốt nhưng con còn nhầm lẫn ở {errors}. Con hãy dành thêm thời gian luyện viết lại những từ này nhé con!",
        "Con có nề nếp viết bài cẩn thận. Nhớ đối chiếu lại từng câu chữ trước khi nộp bài để khắc phục lỗi {errors} nhé con.",
        "Con lắng nghe bài đọc tốt nhưng cần chú ý rèn thêm cách viết đúng {errors}. Cố gắng luyện tập thêm con nhé!",
        "Bài viết cơ bản hoàn thành tốt. Con chỉ cần cẩn thận hơn ở các từ có {errors} là sẽ đạt điểm tuyệt đối đấy!"
    ]
}

def build_fallback_pedagogical_comments(
    creativity_info: dict,
    errors: list[dict],
    is_dictation: bool = False,
    exclude_comments: list[str] = None
) -> list[str]:
    """Tạo danh sách 3 lời nhận xét sư phạm với 3 định hướng (Khen ngợi, Nhắc lỗi, Rèn luyện), tránh lặp lại."""
    import random
    st_raw = (creativity_info or {}).get("score", 0.0)
    has_errors = bool(errors and len(errors) > 0)

    err_labels = []
    for e in (errors or [])[:2]:
        lbl = e.get("error_label") or ERROR_TYPE_VI_LABELS.get(e.get("error_type", ""), e.get("error_type", "chính tả"))
        if lbl and lbl not in err_labels:
            err_labels.append(lbl)
    errors_str = " và ".join(err_labels) if err_labels else "chính tả"

    if is_dictation:
        cat = "dictation_has_errors" if has_errors else "dictation_clean"
    else:
        if st_raw >= 1.0:
            cat = "high_creativity_has_errors" if has_errors else "high_creativity_clean"
        elif st_raw >= 0.5:
            cat = "medium_creativity_has_errors" if has_errors else "medium_creativity_clean"
        else:
            cat = "basic_has_errors" if has_errors else "basic_clean"

    tpl_list = list(DIVERSE_PEDAGOGICAL_TEMPLATES.get(cat, DIVERSE_PEDAGOGICAL_TEMPLATES["basic_has_errors"]))
    formatted = [tpl.format(errors=errors_str) for tpl in tpl_list]

    exclude_set = set(c.strip().lower() for c in (exclude_comments or []))
    candidates = [c for c in formatted if c.strip().lower() not in exclude_set]
    if len(candidates) < 3:
        candidates = list(formatted)
    random.shuffle(candidates)
    return candidates[:3]


def build_fallback_pedagogical_comment(creativity_info: dict, errors: list[dict]) -> str:
    """Tạo lời nhận xét sư phạm mẫu (tương thích ngược)."""
    return build_fallback_pedagogical_comments(creativity_info, errors)[0]


# ==============================================================================
# C. TẦNG 2: SLM ENHANCER (QWEN2.5-0.5B-INSTRUCT)
# Sinh lời nhận xét sư phạm phong phú, tự động Fallback về Tầng 1
# ==============================================================================

_qwen_model = None
_qwen_tokenizer = None
_qwen_lock = threading.Lock()
ENABLE_QWEN_SLM = os.getenv("ENABLE_QWEN_SLM", "1").lower() in ("1", "true", "yes")
QWEN_MODEL_ID = os.getenv("QWEN_MODEL_ID", "Qwen/Qwen2.5-0.5B-Instruct")
QWEN_PRECISION = os.getenv("QWEN_PRECISION", "float32").lower()
QWEN_LIFECYCLE_MODE = os.getenv("QWEN_LIFECYCLE_MODE", "always_active").strip().lower()
QWEN_RAM_THRESHOLD_MB = float(os.getenv("QWEN_RAM_THRESHOLD_MB", "650.0"))

_PROSODY_CACHE_MAX_ENTRIES = 128
_prosody_script_cache: OrderedDict[str, dict] = OrderedDict()
_prosody_cache_lock = threading.Lock()


def get_available_ram_mb() -> float:
    """Xác định dung lượng RAM khả dụng (MB) hỗ trợ đa nền tảng (Linux RPi & Windows Dev)."""
    # 1. Linux / Raspberry Pi: Đọc trực tiếp từ Kernel qua /proc/meminfo
    if sys.platform.startswith("linux"):
        try:
            with open("/proc/meminfo", "r", encoding="utf-8") as f:
                for line in f:
                    if line.startswith("MemAvailable:"):
                        parts = line.split()
                        return round(float(parts[1]) / 1024.0, 2)
        except Exception as e:
            logger.warning(f"⚠️ [RAM Guard] Không thể đọc /proc/meminfo: {e}")

    # 2. Windows: Gọi Win32 API GlobalMemoryStatusEx qua ctypes
    elif sys.platform.startswith("win"):
        try:
            import ctypes

            class MEMORYSTATUSEX(ctypes.Structure):
                _fields_ = [
                    ('dwLength', ctypes.c_ulong),
                    ('dwMemoryLoad', ctypes.c_ulong),
                    ('ullTotalPhys', ctypes.c_ulonglong),
                    ('ullAvailPhys', ctypes.c_ulonglong),
                    ('ullTotalPageFile', ctypes.c_ulonglong),
                    ('ullAvailPageFile', ctypes.c_ulonglong),
                    ('ullTotalVirtual', ctypes.c_ulonglong),
                    ('ullAvailVirtual', ctypes.c_ulonglong),
                    ('sullAvailExtendedVirtual', ctypes.c_ulonglong),
                ]

            stat = MEMORYSTATUSEX()
            stat.dwLength = ctypes.sizeof(MEMORYSTATUSEX)
            if ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(stat)):
                return round(float(stat.ullAvailPhys) / (1024.0 * 1024.0), 2)
        except Exception as e:
            logger.warning(f"⚠️ [RAM Guard] Không thể gọi GlobalMemoryStatusEx: {e}")

    # 3. Fallback qua thư viện psutil (nếu có cài đặt)
    try:
        import psutil
        return round(float(psutil.virtual_memory().available) / (1024.0 * 1024.0), 2)
    except Exception:
        pass

    return 1024.0  # Ngưỡng an toàn dự phòng


def unload_qwen_model() -> None:
    """Giải phóng hoàn toàn Qwen2.5-0.5B và Tokenizer khỏi RAM, thu hồi về 0 MB RAM."""
    global _qwen_model, _qwen_tokenizer
    with _qwen_lock:
        if _qwen_model is not None or _qwen_tokenizer is not None:
            logger.info("🧹 [Qwen Unloader] Đang xả mô hình Qwen2.5-0.5B khỏi bộ nhớ RAM...")
            try:
                del _qwen_model
            except Exception:
                pass
            try:
                del _qwen_tokenizer
            except Exception:
                pass
            _qwen_model = None
            _qwen_tokenizer = None

            try:
                import torch
                if torch.cuda.is_available():
                    torch.cuda.empty_cache()
            except Exception:
                pass

            import gc
            gc.collect()
            gc.collect()
            gc.collect()
            logger.info("✅ [Qwen Unloader] Đã giải phóng hoàn toàn Qwen2.5-0.5B (0 MB RAM khi idle).")


def compute_prosody_cache_key(passage: str, grade: int, chunk_mode: str, difficult_words: list) -> str:
    norm_passage = (passage or "").strip().lower()
    norm_words = ",".join(sorted(str(w).strip().lower() for w in (difficult_words or [])))
    key_str = f"{norm_passage}|grade={grade}|mode={chunk_mode}|diff={norm_words}"
    return hashlib.sha256(key_str.encode("utf-8")).hexdigest()


def get_cached_prosody_script(key: str) -> Optional[dict]:
    with _prosody_cache_lock:
        if key in _prosody_script_cache:
            _prosody_script_cache.move_to_end(key)
            cached = _prosody_script_cache[key]
            return {
                "clauses": [dict(c) for c in cached["clauses"]],
                "total_words": cached["total_words"],
                "estimated_duration_sec": cached["estimated_duration_sec"],
            }
    return None


def set_cached_prosody_script(key: str, data: dict) -> None:
    with _prosody_cache_lock:
        if key in _prosody_script_cache:
            _prosody_script_cache.move_to_end(key)
        _prosody_script_cache[key] = {
            "clauses": [dict(c) for c in data["clauses"]],
            "total_words": data["total_words"],
            "estimated_duration_sec": data["estimated_duration_sec"],
        }
        if len(_prosody_script_cache) > _PROSODY_CACHE_MAX_ENTRIES:
            _prosody_script_cache.popitem(last=False)


VIETNAMESE_STOPWORDS = {
    "của", "và", "có", "các", "những", "một", "trong", "trên", "dưới", "được",
    "với", "lại", "ra", "vào", "này", "đó", "thì", "là", "mà", "ở", "cho",
    "như", "đã", "sẽ", "đang", "bởi", "vì", "để", "làm", "rất", "cũng"
}

DIFFICULT_FEATURES = [
    re.compile(r"^(?:tr|ch|s|x|r|gi|d|l|n)[a-zđàáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵ]+", re.I),
    re.compile(r"[a-zđ]*(?:oang|oanh|uông|uôn|ương|ươn|ươp|uôm|oay|oăt|uât|iêu|uôi|uy|uyp|oe|oa|ang|anh|ênh|iêng|ă[ctnmp]|â[ctnmp])[a-zđ]*", re.I),
    re.compile(r"[ảãẻẽỉĩỏõởỡửữỷỹạẹịọụỵ]", re.I),
]


def clean_raw_sgk_text(raw_text: str) -> Tuple[str, str]:
    """Làm sạch văn bản thô từ SGK / PDF: loại bỏ tiêu đề trang, tuần học, số trang và câu hỏi bài tập."""
    if not raw_text or not raw_text.strip():
        return "", ""

    text = raw_text.replace("\r\n", "\n").replace("\r", "\n").strip()
    
    # Nếu văn bản chỉ có 1 dòng dài nhưng chứa nhiều câu, tách theo dấu chấm hoặc xuống dòng
    if "\n" not in text and len(text.split()) > 15:
        text = re.sub(r"([.?!])\s+", r"\1\n", text)

    lines = text.split("\n")

    header_patterns = [
        re.compile(r"^(?:tiếng\s*việt|tập\s*đọc|chính\s*tả)\s*\d*(?:\s*[-–]\s*tập\s*\d*)?\s*$", re.IGNORECASE),
        re.compile(r"^tuần\s*\d+\s*$", re.IGNORECASE),
        re.compile(r"^bài\s*(?:đọc|học)?\s*\d+\s*:?\s*$", re.IGNORECASE),
        re.compile(r"^(?:trang|tr\.?)\s*\d+\s*$", re.IGNORECASE),
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
        cleaned_line = re.sub(r"^\*+|\*+$", "", cleaned_line).strip()
        if cleaned_line:
            valid_lines.append(cleaned_line)

    if not valid_lines:
        # Fallback an toàn: nếu bộ lọc quá tay, lấy lại văn bản gốc đã chuẩn hóa khoảng trắng
        clean_fb = " ".join(raw_text.split())
        words_fb = clean_fb.split()
        title_fb = " ".join(words_fb[:5]) if words_fb else "Bài đọc chính tả"
        return title_fb, clean_fb

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


def extract_deterministic_difficult_words(text: str, max_words: int = 5) -> List[str]:
    """Trích xuất từ khó chính tả theo thuật toán ngữ âm sư phạm tiếng Việt GDPT 2018 (0 MB RAM)."""
    sentences = re.split(r"[.\n!?]", text)
    candidates = []

    for s in sentences:
        words = [w.strip(" ,;:\"'") for w in s.split() if w.strip(" ,;:\"'")]
        for i in range(len(words) - 1):
            w1 = words[i].lower()
            w2 = words[i + 1].lower()
            if w1 in VIETNAMESE_STOPWORDS or w2 in VIETNAMESE_STOPWORDS:
                continue
            pair = f"{words[i]} {words[i+1]}"
            score = 0
            if any(f.search(w1) for f in DIFFICULT_FEATURES):
                score += 1
            if any(f.search(w2) for f in DIFFICULT_FEATURES):
                score += 1
            if len(w1) > 1 and len(w2) > 1 and w1[0] == w2[0]:
                score += 2
            if score >= 1:
                candidates.append((pair, score))

    words = [w.strip(" ,;:\"'") for w in text.split() if w.strip(" ,;:\"'")]
    for w in words:
        wl = w.lower()
        if wl in VIETNAMESE_STOPWORDS or len(wl) < 2:
            continue
        score = sum(1 for f in DIFFICULT_FEATURES if f.search(wl))
        if score >= 1:
            candidates.append((w, score))

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

    # Nếu vẫn chưa đủ, trích thêm từ vựng thực tế không nằm trong stopwords
    if len(selected) < max_words:
        for w in words:
            wl = w.lower()
            if wl not in VIETNAMESE_STOPWORDS and len(wl) >= 3 and wl not in seen:
                seen.add(wl)
                selected.append(w)
                if len(selected) >= max_words:
                    break

    return selected


GRADE_WRITING_SECONDS_PER_WORD: Dict[int, float] = {
    1: 2.5,
    2: 2.0,
    3: 1.7,
    4: 1.4,
    5: 1.2,
}


def segment_into_pedagogical_clauses_with_meta(passage: str, chunk_mode: str = "phrase") -> List[Tuple[str, bool]]:
    """Phân đoạn bài đọc thành các vế câu sư phạm kèm cờ báo bắt đầu đoạn mới (Zero-Word-Mutation)."""
    if not passage or not passage.strip():
        return []

    if chunk_mode == "sentence":
        delimiters = r"([\.!\?\n]+[\"'\u201d\u2019\)]*)"
    else:
        delimiters = r"([,;:!\?\.\n]+[\"'\u201d\u2019\)]*)"

    tokens = re.split(delimiters, passage)
    clauses: List[Tuple[str, bool]] = []
    current_text = ""
    next_is_new_para = True

    for token in tokens:
        if not token:
            continue
        if re.match(delimiters, token):
            current_text += token
            clause_str = current_text.strip()
            if clause_str and clause_str.split():
                clauses.append((clause_str, next_is_new_para))
                next_is_new_para = "\n" in token
            elif "\n" in token:
                next_is_new_para = True
            current_text = ""
        else:
            if "\n" in token:
                next_is_new_para = True
            current_text += token

    if current_text.strip() and current_text.strip().split():
        clauses.append((current_text.strip(), next_is_new_para))

    return clauses


def segment_into_pedagogical_clauses(passage: str, chunk_mode: str = "phrase") -> List[str]:
    """Phân đoạn bài đọc thành các vế câu sư phạm bảo toàn 100% từ ngữ và dấu câu gốc (Zero-Word-Mutation)."""
    meta_clauses = segment_into_pedagogical_clauses_with_meta(passage, chunk_mode=chunk_mode)
    return [text for text, _ in meta_clauses]


def direct_prosody_script(
    passage: str,
    difficult_words: List[str] = None,
    grade: int = 3,
    chunk_mode: str = "phrase"
) -> Dict[str, Any]:
    meta_clauses = segment_into_pedagogical_clauses_with_meta(passage, chunk_mode=chunk_mode)
    clean_diff_words = [str(w).strip() for w in (difficult_words or []) if str(w).strip()]
    clean_grade = max(1, min(5, int(grade or 3)))
    writing_factor = GRADE_WRITING_SECONDS_PER_WORD.get(clean_grade, 1.7)

    clauses = []
    total_words = 0
    total_duration = 0.0

    for idx, (text, is_new_para) in enumerate(meta_clauses):
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
        elif clean_end.endswith((".", "!")):
            base_style = "warm_story"
        else:
            base_style = "standard"

        base_writing_pause = word_count * writing_factor
        punct_bonus = 1.0 if clean_end.endswith((".", "!", "?", ":")) else 0.0

        if matched_diff:
            style = "emphasis"
            style_label = "Nhấn mạnh từ khó"
            rate = "-20%"
            pause_sec = max(4.0, round(base_writing_pause + punct_bonus + 2.5, 1))
        else:
            style = base_style
            preset = PROSODY_STYLE_PRESETS.get(style, PROSODY_STYLE_PRESETS.get("standard", {}))
            style_label = preset.get("label", "Chuẩn mực")
            rate = "-15%"
            pause_sec = max(3.0, round(base_writing_pause + punct_bonus, 1))

        preset = PROSODY_STYLE_PRESETS.get(style, PROSODY_STYLE_PRESETS.get("standard", {
            "noise_scale": 0.667, "noise_w_scale": 0.80, "length_multiplier": 1.00
        }))
        noise_scale = preset.get("noise_scale", 0.667)
        noise_w = preset.get("noise_w_scale", 0.80)

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
            "matched_difficult_words": matched_diff,
            "starts_new_paragraph": is_new_para,
        })

    return {
        "clauses": clauses,
        "total_words": total_words,
        "estimated_duration_sec": round(total_duration, 1),
    }


def get_qwen_model():
    """Tải Lazy load mô hình Qwen2.5-0.5B-Instruct vào bộ nhớ với lượng tử hóa tiết kiệm RAM."""
    global _qwen_model, _qwen_tokenizer
    if _qwen_model is not None:
        return _qwen_model, _qwen_tokenizer

    with _qwen_lock:
        if _qwen_model is not None:
            return _qwen_model, _qwen_tokenizer

        # RAM Guard Check: Bảo vệ Raspberry Pi 4 (4GB RAM) không bị OOM
        avail_ram = get_available_ram_mb()
        if avail_ram < QWEN_RAM_THRESHOLD_MB:
            err_msg = (
                f"RAM khả dụng ({avail_ram} MB) thấp hơn ngưỡng an toàn "
                f"({QWEN_RAM_THRESHOLD_MB} MB). Từ chối tải Qwen2.5 để bảo vệ hệ thống."
            )
            logger.warning(f"⚠️ [Qwen RAM Guard] {err_msg}")
            raise MemoryError(err_msg)

        logger.info(f"⏳ [Tầng 2] Đang tải mô hình SLM: {QWEN_MODEL_ID} (chế độ {QWEN_PRECISION}, RAM trống {avail_ram} MB)...")
        import torch
        try:
            import transformers.dependency_versions_check as _dvc
            _orig_req = _dvc.require_version_core
            _dvc.require_version_core = lambda requirement: None if "huggingface-hub" in str(requirement) else _orig_req(requirement)
        except Exception:
            pass
        from transformers import AutoModelForCausalLM, AutoTokenizer

        device = "cuda" if torch.cuda.is_available() else "cpu"
        tokenizer = AutoTokenizer.from_pretrained(QWEN_MODEL_ID)
        if device == "cuda":
            model = AutoModelForCausalLM.from_pretrained(
                QWEN_MODEL_ID,
                torch_dtype=torch.float16,
                device_map="auto"
            )
        # Mặc định: bfloat16 với low_cpu_mem_usage=True để nạp thẳng 16-bit không nhân đôi RAM đỉnh
        else:
            try:
                import torch
                torch.set_num_threads(min(4, os.cpu_count() or 4))
            except Exception:
                pass

            has_accelerate = False
            try:
                import accelerate  # noqa: F401
                has_accelerate = True
            except ImportError:
                has_accelerate = False

            extra_kwargs = {"low_cpu_mem_usage": True} if has_accelerate else {}

            if QWEN_PRECISION in ("int8", "qint8"):
                logger.info("🔧 [Tầng 2] Tải model và lượng tử hóa Dynamic INT8 trên CPU...")
                raw_model = AutoModelForCausalLM.from_pretrained(
                    QWEN_MODEL_ID,
                    torch_dtype=torch.float32,
                    **extra_kwargs
                )
                try:
                    for layer in raw_model.model.layers:
                        torch.quantization.quantize_dynamic(
                            layer, {torch.nn.Linear}, dtype=torch.qint8, inplace=True
                        )
                    model = raw_model
                    logger.info("✅ [Tầng 2] Lượng tử hóa INT8 các transformer layers thành công!")
                except Exception as q_err:
                    logger.warning(f"⚠️ [Tầng 2] Quantize INT8 thất bại ({q_err}), chuyển sang bfloat16")
                    model = AutoModelForCausalLM.from_pretrained(
                        QWEN_MODEL_ID,
                        torch_dtype=torch.bfloat16,
                        **extra_kwargs
                    )
            elif QWEN_PRECISION in ("float32", "fp32"):
                logger.info("ℹ️ [Tầng 2] Tải model Qwen chế độ Float32 chuẩn...")
                model = AutoModelForCausalLM.from_pretrained(
                    QWEN_MODEL_ID,
                    torch_dtype=torch.float32,
                    **extra_kwargs
                )
            else:
                logger.info("🔧 [Tầng 2] Tải model với lượng tử hóa 16-bit bfloat16 (tiết kiệm ~75% RAM)...")
                model = AutoModelForCausalLM.from_pretrained(
                    QWEN_MODEL_ID,
                    torch_dtype=torch.bfloat16,
                    **extra_kwargs
                )

        model.eval()
        _qwen_tokenizer = tokenizer
        _qwen_model = model
        logger.info(f"✅ [Tầng 2] Đã tải thành công SLM {QWEN_MODEL_ID} ({QWEN_PRECISION}) trên thiết bị {device}")
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
    current_comments: list[str] = None,
    is_dictation: bool = False,
) -> dict:
    """Sinh 3 lời nhận xét sư phạm bằng Qwen2.5-0.5B (3 định hướng: Động viên, Sửa lỗi, Bứt phá).
    Tự động Fallback về Tầng 1 nếu tắt SLM, timeout hoặc gặp ngoại lệ."""
    fallback_list = build_fallback_pedagogical_comments(
        creativity_info, errors, is_dictation=is_dictation, exclude_comments=current_comments
    )

    if not ENABLE_QWEN_SLM:
        return {
            "text": fallback_list[0],
            "suggestions": fallback_list[:3],
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
                max_new_tokens=32,
                do_sample=True,
                temperature=0.7,
                top_p=0.9,
                repetition_penalty=1.15,
                num_return_sequences=1,
                pad_token_id=tokenizer.eos_token_id
            )

        invalid_words = [
            "toán", "dự thi", "thực tế cuộc sống", "bài thi", "tiếng anh", "bạn đã",
            "rất thấp", "điểm thấp", "vị trí", "kém", "yếu kém", "hỗ trợ mẹ"
        ]

        qwen_comments = []
        for out_seq in outputs:
            generated_ids = out_seq[inputs.input_ids.shape[1]:]
            raw_comment = tokenizer.decode(generated_ids, skip_special_tokens=True).strip()
            comment = clean_qwen_text(raw_comment)
            is_invalid = any(w in comment.lower() for w in invalid_words)
            has_teacher_tone = any(w in comment.lower() for w in ["cô", "con", "em", "khen", "chú ý", "bài viết", "cố gắng", "rèn", "tiến bộ", "tốt"])
            if comment and len(comment.split()) >= 4 and not is_invalid and has_teacher_tone and comment not in qwen_comments:
                qwen_comments.append(comment)

        # Bổ sung từ fallback_list để luôn có đủ 3 lời nhận xét phong phú
        final_suggestions = list(qwen_comments)
        for fb in fallback_list:
            if fb not in final_suggestions:
                final_suggestions.append(fb)
            if len(final_suggestions) >= 3:
                break

        final_suggestions = final_suggestions[:3]
        source = "qwen2.5_0.5b" if len(qwen_comments) > 0 else "tang1_diverse_pedagogy"
        latency = round((time.time() - t0) * 1000, 2)

        return {
            "text": final_suggestions[0],
            "suggestions": final_suggestions,
            "source": source,
            "latency_ms": latency
        }
    except Exception as e:
        logger.warning(f"⚠️ [Tầng 2] Qwen SLM không khả dụng ({e}) -> Fallback Tầng 1.")
        return {
            "text": fallback_list[0],
            "suggestions": fallback_list[:3],
            "source": "tang1_deterministic_fallback",
            "latency_ms": round((time.time() - t0) * 1000, 2)
        }
    finally:
        if QWEN_LIFECYCLE_MODE == "on_demand_unload":
            unload_qwen_model()


# ==============================================================================
# D. SÁNG TÁC BÀI ĐỌC CHÍNH TẢ & TÁCH TỪ KHÓ (QWEN2.5-0.5B-INSTRUCT)
# Chuẩn hóa theo Chương trình GDPT 2018 (Lớp 1 đến Lớp 5)
# ==============================================================================

FALLBACK_DICTATION_BANK: dict[int, list[dict]] = {
    1: [
        {
            "title": "Bé và Chú Cún Nhỏ",
            "content": "Bé Na có một chú cún nhỏ rất xinh. Bộ lông của cún trắng tinh như bông. Mỗi khi bé đi học về, cún lại vẫy đuôi mừng rỡ đón bé vào nhà.",
            "difficultWords": "chú cún, trắng tinh, vẫy đuôi, mừng rỡ",
            "summary": "Đoạn văn ngắn gọn, dễ thương về tình cảm giữa bé và vật nuôi trong nhà."
        },
        {
            "title": "Mái Trường Thân Yêu",
            "content": "Trường của em nằm dưới hàng cây xanh mát. Tiếng chim hót líu lo chào đón chúng em mỗi sớm mai. Chúng em cùng nhau học bài thật chăm ngoan.",
            "difficultWords": "xanh mát, líu lo, sớm mai, chăm ngoan",
            "summary": "Bài đọc ca ngợi vẻ đẹp thân thương của ngôi trường tiểu học."
        }
    ],
    2: [
        {
            "title": "Buổi Sáng Mùa Thu",
            "content": "Gió mùa thu se lạnh thổi qua từng kẽ lá. Bầu trời xanh trong vắt, không một gợn mây đen. Những tia nắng vàng dịu dàng trải dài trên con đường làng thân quen.",
            "difficultWords": "se lạnh, trong vắt, gợn mây, dịu dàng, thân quen",
            "summary": "Đoạn văn miêu tả cảnh sắc buổi sáng mùa thu trong lành và yên bình."
        },
        {
            "title": "Đôi Bạn Thân",
            "content": "Nam và Minh là đôi bạn cùng tiến của lớp em. Giờ ra chơi, hai bạn thường ngồi dưới gốc cây bàng râm mát để cùng nhau giải những bài toán khó.",
            "difficultWords": "cùng tiến, ra chơi, cây bàng, râm mát",
            "summary": "Ca ngợi tình bạn đẹp đẽ, cùng giúp đỡ nhau tiến bộ trong học tập."
        }
    ],
    3: [
        {
            "title": "Mùa Lúa Chín Quê Em",
            "content": "Cánh đồng lúa quê em vào mùa thu hoạch trải rộng như một tấm thảm lúa vàng óng ả. Từng cơn gió nhẹ lướt qua mang theo hương thơm ngòn ngọt, mộc mạc của bông lúa non. Các bác nông dân rộn rã gặt lúa với nụ cười rạng rỡ trên môi.",
            "difficultWords": "thu hoạch, vàng óng ả, ngòn ngọt, rộn rã, rạng rỡ",
            "summary": "Đoạn văn gợi tả vẻ đẹp trù phú của đồng lúa chín và niềm vui lao động của người nông dân."
        },
        {
            "title": "Bảo Vệ Môi Trường Xanh",
            "content": "Sáng chủ nhật, các bạn nhỏ trong xóm rủ nhau nhặt rác và quét dọn đường làng sạch sẽ. Những bồn hoa ven đường được chăm sóc cẩn thận, khoe sắc rực rỡ dưới ánh nắng ban mai. Giữ gìn môi trường xanh đẹp là niềm vui chung của mọi người.",
            "difficultWords": "nhặt rác, sạch sẽ, chăm sóc, rực rỡ, ban mai",
            "summary": "Giáo dục ý thức giữ gìn vệ sinh chung và tình yêu thiên nhiên của học sinh."
        },
        {
            "title": "Tình Bạn Tuổi Thơ",
            "content": "Mỗi ngày đến lớp, chúng em cùng nhau đọc sách và chia sẻ những câu chuyện vui dưới tán cây phượng vĩ. Khi bạn gặp khó khăn, cả lớp luôn sẵn lòng động viên và giúp đỡ. Tình bạn học trò ấm áp như ánh nắng sớm mai soi sáng con đường đến trường.",
            "difficultWords": "phượng vĩ, chia sẻ, động viên, sẵn lòng, sớm mai",
            "summary": "Ca ngợi tình cảm bạn bè trong sáng, biết chia sẻ và gắn bó dưới mái trường."
        }
    ],
    4: [
        {
            "title": "Dòng Sông Tuổi Thơ",
            "content": "Dòng sông quê hương hiền hòa uốn lượn quanh những bãi mía, nương dâu xanh mướt. Mặt nước trong veo in bóng những rặng tre rì rào trong gió sớm. Tiếng hò reo vang vọng của lũ trẻ tắm sông lúc hoàng hôn buông xuống làm xao xuyến lòng người.",
            "difficultWords": "uốn lượn, xanh mướt, trong veo, rì rào, hoàng hôn, xao xuyến",
            "summary": "Bài văn giàu chất thơ miêu tả dòng sông quê và ký ức êm đềm của tuổi thơ."
        },
        {
            "title": "Rừng Cọ Quê Tôi",
            "content": "Chẳng đâu đẹp bằng những đồi cọ xanh ngắt của quê tôi. Từng tán cọ xòe tròn như những chiếc ô khổng lồ che mát cả một vùng đồi trung du. Dưới bóng cọ, đàn trâu thong dong gặm cỏ, tiếng suối róc rách hòa cùng tiếng chim ca ríu rít.",
            "difficultWords": "đồi cọ, xanh ngắt, khổng lồ, thong dong, róc rách, ríu rít",
            "summary": "Văn phong gợi cảm miêu tả vẻ đẹp đặc trưng của rừng cọ miền trung du Bắc Bộ."
        }
    ],
    5: [
        {
            "title": "Kỳ Quan Thiên Nhiên Đất Nước",
            "content": "Vịnh Hạ Long sừng sững giữa biển trời mênh mông với hàng ngàn hòn đảo đá vôi nhấp nhô tuyệt đẹp. Nước biển bốn mùa trong xanh như ngọc bích, phản chiếu ánh bình minh rạng ngời. Vẻ đẹp kỳ vĩ và thơ mộng của non sông đất nước luôn là niềm tự hào to lớn của mỗi người dân Việt Nam.",
            "difficultWords": "sừng sững, mênh mông, nhấp nhô, ngọc bích, bình minh, kỳ vĩ",
            "summary": "Đoạn văn ngợi ca vẻ đẹp hùng vĩ của Vịnh Hạ Long và lòng tự hào dân tộc."
        },
        {
            "title": "Mùa Hoa Tây Bắc",
            "content": "Khi làn gió xuân ấm áp tràn về, núi rừng Tây Bắc bừng sáng bởi sắc trắng tinh khôi của hoa ban và sắc thắm rực rỡ của hoa đào rừng. Tiếng khèn bè ngân vang réo rắt bên sườn non như lời mời gọi tha thiết của mùa lễ hội truyền thống.",
            "difficultWords": "Tây Bắc, tinh khôi, hoa ban, rực rỡ, khèn bè, réo rắt, tha thiết",
            "summary": "Đoạn văn miêu tả vẻ đẹp lộng lẫy, đậm đà bản sắc văn hóa của mùa xuân vùng cao Tây Bắc."
        }
    ]
}


def generate_dictation_passage_tier2(
    grade: int = 3,
    topic: str = "Tình bạn và trường lớp",
    sentence_count: int = 4,
    book_set: str = "KetNoi"
) -> dict:
    """Sáng tác bài đọc chính tả kèm trích xuất từ khó bằng Qwen2.5-0.5B-Instruct.
    Tự động fallback về ngân hàng bài đọc chuẩn GDPT 2018 nếu mô hình tắt hoặc ngoại lệ.
    """
    valid_grade = max(1, min(5, int(grade or 3)))
    fallback_pool = FALLBACK_DICTATION_BANK.get(valid_grade, FALLBACK_DICTATION_BANK[3])
    fallback_item = random.choice(fallback_pool)

    if not ENABLE_QWEN_SLM:
        return {
            "title": fallback_item["title"],
            "content": fallback_item["content"],
            "difficultWords": fallback_item["difficultWords"],
            "summary": fallback_item["summary"],
            "grade": valid_grade,
            "topic": topic,
            "source": "curriculum_bank_deterministic",
            "latency_ms": 0.0
        }

    t0 = time.time()
    try:
        model, tokenizer = get_qwen_model()
        import torch
        device = "cuda" if torch.cuda.is_available() else "cpu"

        book_names = {
            "KetNoi": "Kết Nối Tri Thức Với Cuộc Sống",
            "CanhDieu": "Cánh Diều",
            "ChanTroi": "Chân Trời Sáng Tạo"
        }
        book_label = book_names.get(book_set, "Kết Nối Tri Thức")

        system_prompt = (
            "Bạn là giáo viên tiểu học Việt Nam.\n"
            "Nhiệm vụ: Viết một đoạn văn chính tả ngắn gọn (3-4 câu) trong sáng cho học sinh tiểu học.\n"
            "Định dạng bắt buộc:\n"
            "Tiêu đề: [Tên bài đọc]\n"
            "Nội dung: [Đoạn văn chính tả 3-4 câu]\n"
            "Từ khó: [3-4 từ khó phát âm cách nhau dấu phẩy]"
        )

        grade_guide = {
            1: "20-30 từ, gần gũi.",
            2: "30-40 từ, trong sáng.",
            3: "40-50 từ, giàu hình ảnh.",
            4: "50-60 từ, cảm xúc.",
            5: "55-70 từ, trau chuốt."
        }
        guide_text = grade_guide.get(valid_grade, grade_guide[3])

        user_content = (
            f"Sáng tác bài đọc chính tả Lớp {valid_grade} ({guide_text}), chủ đề: \"{topic}\", "
            f"bộ sách {book_label}."
        )

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_content}
        ]

        prompt_text = tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
        inputs = tokenizer([prompt_text], return_tensors="pt").to(device)

        with _qwen_lock:
            with torch.no_grad():
                outputs = model.generate(
                    **inputs,
                    max_new_tokens=65,
                    do_sample=False,
                    repetition_penalty=1.15,
                    pad_token_id=tokenizer.eos_token_id
                )

        generated_ids = outputs[0][inputs.input_ids.shape[1]:]
        raw_text = tokenizer.decode(generated_ids, skip_special_tokens=True).strip()

        content = ""
        title = f"Chính tả: {topic}"
        diff_words = ""
        summary = f"Bài đọc chính tả Lớp {valid_grade} chủ đề {topic}"

        # 1. Thử bóc tách theo định dạng dòng trực tiếp (Tiêu đề / Nội dung / Từ khó)
        for line in raw_text.splitlines():
            line_s = line.strip()
            if not line_s:
                continue
            lower_s = line_s.lower()
            if lower_s.startswith("tiêu đề:") or lower_s.startswith("tên bài:"):
                title = line_s.split(":", 1)[1].strip().strip('"\'-[]{}')
            elif lower_s.startswith("nội dung:"):
                content = line_s.split(":", 1)[1].strip().strip('"\'-[]{}')
            elif lower_s.startswith("từ khó:"):
                diff_words = line_s.split(":", 1)[1].strip().strip('"\'-[]{}')
            elif not content and len(line_s.split()) >= 6 and not any(k in lower_s for k in ("tiêu đề", "từ khó", "bộ sách")):
                content = line_s.strip('"\'-[]{}')
            elif content and not diff_words and not lower_s.startswith("tiêu đề:") and not lower_s.startswith("từ khó:"):
                content += " " + line_s.strip('"\'-[]{}')

        # 2. Dự phòng nếu Qwen sinh JSON
        if not content or len(content.split()) < 10:
            cleaned = raw_text.replace("```json", "").replace("```", "").strip()
            start_idx = cleaned.find("{")
            end_idx = cleaned.rfind("}")
            if start_idx != -1 and end_idx != -1 and end_idx > start_idx:
                try:
                    parsed = json.loads(cleaned[start_idx:end_idx + 1])
                    content = str(parsed.get("content", content)).strip()
                    title = str(parsed.get("title", title)).strip() or title
                    diff_words = str(parsed.get("difficultWords", diff_words)).strip()
                except Exception:
                    pass

        if not title or title.lower() in ("tiêu đề ngắn gọn", "tên bài đọc ngắn gọn", "tiêu đề", "[tên bài đọc]"):
            title = topic.strip().title() if topic else "Bài Đọc Chính Tả"

        if not diff_words or "từ khó" in diff_words.lower():
            diff_words = ", ".join(extract_deterministic_difficult_words(content, max_words=5))

        if not summary or "tóm tắt ngắn gọn" in summary.lower():
            summary = f"Bài đọc chính tả Lớp {valid_grade} chủ đề {topic}, rèn kỹ năng nghe - viết chính xác."

        if len(content.split()) >= 12:
            latency = round((time.time() - t0) * 1000, 2)
            logger.info(f"✅ [Qwen Passage] Sáng tác thành công bài đọc Lớp {valid_grade} ({len(content.split())} từ, {latency}ms)")
            return {
                "title": title,
                "content": content,
                "difficultWords": diff_words,
                "summary": summary,
                "grade": valid_grade,
                "topic": topic,
                "source": "qwen2.5_0.5b",
                "latency_ms": latency
            }
        else:
            raise ValueError("Nội dung bài đọc Qwen sinh ra quá ngắn")

    except Exception as e:
        logger.warning(f"⚠️ [Qwen Passage] Lỗi khi sinh bài đọc bằng Qwen ({e}) -> Dùng ngân hàng SGK fallback.")
        latency = round((time.time() - t0) * 1000, 2)
        return {
            "title": fallback_item["title"],
            "content": fallback_item["content"],
            "difficultWords": fallback_item["difficultWords"],
            "summary": fallback_item["summary"],
            "grade": valid_grade,
            "topic": topic,
            "source": "curriculum_bank_fallback",
            "latency_ms": latency
        }
    finally:
        if QWEN_LIFECYCLE_MODE == "on_demand_unload":
            unload_qwen_model()


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
    pedagogical_comments = comment_info.get("suggestions", [pedagogical_comment])
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
        "pedagogical_comments": pedagogical_comments,
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
    enable_vit5 = os.getenv("ENABLE_VIT5", "1").lower() not in ("0", "false", "no", "off")
    if enable_vit5:
        logger.info("==========================================")
        logger.info("ĐANG TẢI MÔ HÌNH VIT5 LÊN RAM...")
        logger.info("Vui lòng đợi khoảng 10-30 giây...")
        try:
            get_model()
            logger.info("✅ TẢI MÔ HÌNH VIT5 THÀNH CÔNG!")
        except Exception as e:
            logger.error(f"❌ LỖI TẢI MÔ HÌNH VIT5: {e}")
    else:
        logger.info("==========================================")
        logger.info("ℹ️ Chế độ ENABLE_VIT5=0: Tạm tắt ViT5 để khởi động siêu nhanh.")
        logger.info("   YOLOv8 & Gemini API sẽ đảm nhận xử lý.")

    try:
        import sys
        sys.path.insert(0, os.path.dirname(__file__))
        from yolo_detector import load_yolo_model
        load_yolo_model()
        logger.info("✅ TẢI MÔ HÌNH YOLOV8 WORD DETECTOR THÀNH CÔNG!")
    except Exception as e:
        logger.warning(f"⚠️ Không thể nạp YOLOv8 lúc startup: {e}")

    if ENABLE_QWEN_SLM and QWEN_LIFECYCLE_MODE != "on_demand_unload":
        logger.info("==========================================")
        logger.info(f"ĐANG KÍCH HOẠT MÔ HÌNH QWEN2.5 ({QWEN_MODEL_ID}) LUÔN SẴN SÀNG TRÊN RAM...")
        try:
            get_qwen_model()
            logger.info("✅ MÔ HÌNH QWEN2.5 ĐÃ SẴN SÀNG HOẠT ĐỘNG LIÊN TỤC!")
        except Exception as e:
            logger.warning(f"⚠️ Không thể nạp trước Qwen2.5 lúc startup: {e}")

    logger.info("==========================================")
    logger.info("🚀 HỆ THỐNG AI SERVICE ĐÃ SẴN SÀNG!")
    logger.info("==========================================")

@app.post("/preload")
def preload_model():
    """Tải model trước để request đầu tiên không bị chậm (dùng cho API trigger)"""
    enable_vit5 = os.getenv("ENABLE_VIT5", "1").lower() not in ("0", "false", "no", "off")
    if not enable_vit5:
        return {"status": "vit5 disabled (ENABLE_VIT5=0)"}
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


# ============================================================
# ĐỘNG CƠ TỔNG HỢP GIỌNG NÓI OFFLINE PIPER TTS VITS ONNX
# Vận hành 100% offline trên Raspberry Pi / máy cục bộ, hỗ trợ Multi-Voice & Loa ngoài
# ============================================================
try:
    from .tts_engine import tts_engine, PROSODY_STYLE_PRESETS
except ImportError:
    try:
        from tts_engine import tts_engine, PROSODY_STYLE_PRESETS
    except Exception as _e:
        tts_engine = None
        PROSODY_STYLE_PRESETS = {}
        logger.warning(f"⚠️ Không thể khởi tạo tts_engine: {_e}")

if not PROSODY_STYLE_PRESETS:
    PROSODY_STYLE_PRESETS = {
        "warm_story": {
            "noise_scale": 0.78,
            "noise_w_scale": 0.90,
            "length_multiplier": 1.05,
            "label": "Truyền cảm, ấm áp",
            "description": "Thích hợp đọc bài văn, nhận xét sư phạm, truyền cảm hứng",
        },
        "standard": {
            "noise_scale": 0.667,
            "noise_w_scale": 0.80,
            "length_multiplier": 1.00,
            "label": "Chuẩn mực",
            "description": "Tốc độ và âm sắc trung tính, đọc văn bản chung",
        },
        "emphasis": {
            "noise_scale": 0.58,
            "noise_w_scale": 0.72,
            "length_multiplier": 1.20,
            "label": "Nhấn mạnh từ khó",
            "description": "Dùng cho từ khó, từ phát âm sai, cần học sinh tập trung nghe từng âm tiết",
        },
        "question": {
            "noise_scale": 0.82,
            "noise_w_scale": 0.92,
            "length_multiplier": 1.08,
            "label": "Gợi mở, nghi vấn",
            "description": "Dùng cho câu hỏi, giọng đọc cao dần ở cuối câu",
        },
    }


class LocalPlayRequest(BaseModel):
    text: str
    voice: Optional[str] = "vi_VN-vais1000-medium"
    rate: Optional[str] = "-15%"
    style: Optional[str] = "standard"
    noise_scale: Optional[float] = None
    noise_w: Optional[float] = None
    read_punctuation: Optional[bool] = False


@app.get("/tts")
async def tts_endpoint(
    text: str,
    voice: Optional[str] = "vi_VN-vais1000-medium",
    rate: Optional[str] = "-15%",
    style: Optional[str] = "standard",
    noise_scale: Optional[float] = None,
    noise_w: Optional[float] = None,
    read_punctuation: Optional[bool] = False,
):
    """Tạo âm thanh phát âm tiếng Việt OFFLINE chuẩn bằng Piper TTS VITS ONNX
    với hỗ trợ 4 phong cách biểu cảm và cờ đọc tên dấu câu sư phạm.
    """
    if not text or not text.strip():
        raise HTTPException(status_code=400, detail="Văn bản không được để trống")
    if tts_engine is None:
        raise HTTPException(status_code=503, detail="Động cơ TTS Offline chưa sẵn sàng")
    try:
        from fastapi.responses import Response

        audio_data = tts_engine.synthesize_wav(
            text.strip(),
            voice_id=voice or "vi_VN-vais1000-medium",
            rate=rate or "-15%",
            style=style or "standard",
            noise_scale=noise_scale,
            noise_w=noise_w,
            read_punctuation=read_punctuation if read_punctuation is not None else False,
        )
        if not audio_data or len(audio_data) == 0:
            raise HTTPException(status_code=500, detail="Không thể tạo luồng âm thanh từ Piper TTS")

        return Response(
            content=audio_data,
            media_type="audio/wav",
            headers={
                "Content-Type": "audio/wav",
                "Cache-Control": "public, max-age=86400, s-maxage=86400",
                "X-TTS-Engine": "Piper-VITS-ONNX-Offline",
                "X-TTS-Style": style or "standard",
            },
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Lỗi Piper TTS: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Lỗi tạo âm thanh Piper TTS: {str(e)}")


@app.get("/tts/voices")
async def tts_voices_endpoint():
    """Danh sách các giọng đọc TTS Offline hiện có trong hệ thống (bao gồm các model Clone)."""
    if tts_engine is None:
        return {"voices": [], "count": 0, "status": "unavailable"}
    try:
        voices = tts_engine.list_available_voices()
        return {"voices": voices, "count": len(voices), "engine": "piper-vits-onnx"}
    except Exception as e:
        logger.error(f"❌ Lỗi lấy danh sách giọng TTS: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/tts/play-local")
async def tts_play_local_endpoint(req: LocalPlayRequest):
    """Phát âm thanh trực tiếp ra Loa phần cứng cắm trên Raspberry Pi (3.5mm AUX / USB)."""
    if not req.text or not req.text.strip():
        raise HTTPException(status_code=400, detail="Văn bản không được để trống")
    if tts_engine is None:
        raise HTTPException(status_code=503, detail="Động cơ TTS Offline chưa sẵn sàng")
    try:
        prosody = tts_engine.resolve_prosody_params(
            style=req.style or "standard",
            rate=req.rate or "-15%",
            noise_scale=req.noise_scale,
            noise_w=req.noise_w,
        )
        success = tts_engine.play_on_local_speaker(
            req.text.strip(),
            voice_id=req.voice or "vi_VN-vais1000-medium",
            rate=req.rate or "-15%",
            style=req.style or "standard",
            noise_scale=req.noise_scale,
            noise_w=req.noise_w,
            read_punctuation=req.read_punctuation if req.read_punctuation is not None else False,
        )
        return {
            "status": "ok" if success else "error",
            "device": "local_speaker",
            "success": success,
            "message": "Đã phát ra loa cục bộ thiết bị" if success else "Lỗi khi phát ra loa",
            "length_scale": prosody["length_scale"],
            "noise_scale": prosody["noise_scale"],
            "noise_w_scale": prosody["noise_w_scale"],
        }
    except Exception as e:
        logger.error(f"❌ Lỗi phát loa cục bộ: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/qwen/status")
async def qwen_status_endpoint():
    """Kiểm tra trạng thái hoạt động liên tục và tài nguyên của Qwen2.5-0.5B-Instruct."""
    avail_ram = get_available_ram_mb()
    if ENABLE_QWEN_SLM and QWEN_LIFECYCLE_MODE == "always_active" and _qwen_model is None and avail_ram >= QWEN_RAM_THRESHOLD_MB:
        try:
            get_qwen_model()
        except Exception as e:
            logger.warning(f"⚠️ [qwen/status] Không thể tự động kích hoạt Qwen2.5: {e}")

    is_loaded = _qwen_model is not None
    import torch
    has_cuda = torch.cuda.is_available()
    with _prosody_cache_lock:
        cache_len = len(_prosody_script_cache)
    return {
        "enabled": ENABLE_QWEN_SLM,
        "status": "ready" if ENABLE_QWEN_SLM else "disabled",
        "model_id": QWEN_MODEL_ID,
        "is_loaded": is_loaded,
        "lifecycle_mode": QWEN_LIFECYCLE_MODE,
        "available_ram_mb": avail_ram,
        "ram_threshold_mb": QWEN_RAM_THRESHOLD_MB,
        "cache_entries": cache_len,
        "memory_mode": "always_active" if QWEN_LIFECYCLE_MODE == "always_active" else "zero_idle_ram",
        "precision": QWEN_PRECISION,
        "quantized": QWEN_PRECISION in ("bfloat16", "bf16", "int8", "qint8"),
        "device": "cuda" if has_cuda else "cpu",
        "description": "Trợ lý AI soạn bài, lọc nội dung SGK và điều phối nhịp đọc chính tả",
    }


class ExtractSGKRequest(BaseModel):
    raw_text: str
    grade: Optional[int] = 3


@app.post("/qwen/extract-sgk")
async def extract_sgk_endpoint(req: ExtractSGKRequest):
    """Trích xuất và làm sạch văn bản SGK / PDF, loại bỏ số trang, câu hỏi thảo luận,
    kèm từ khó và tóm tắt theo quy chuẩn GDPT 2018 bằng Qwen2.5-0.5B.
    """
    if not req.raw_text or not req.raw_text.strip():
        raise HTTPException(status_code=400, detail="Văn bản thô không được để trống")

    title, clean_content = clean_raw_sgk_text(req.raw_text)
    if not clean_content:
        raise HTTPException(status_code=400, detail="Không tìm thấy nội dung bài đọc hợp lệ sau khi làm sạch")

    valid_grade = max(1, min(5, int(req.grade or 3)))
    avail_ram = get_available_ram_mb()
    can_use_qwen = ENABLE_QWEN_SLM and (avail_ram >= QWEN_RAM_THRESHOLD_MB)

    difficult_words = []
    summary = ""
    source = "deterministic_pedagogy"

    if can_use_qwen:
        try:
            model, tokenizer = get_qwen_model()
            import torch
            device = "cuda" if torch.cuda.is_available() else "cpu"

            system_prompt = (
                "Bạn là chuyên gia sư phạm tiểu học Việt Nam biên soạn sách giáo khoa Tiếng Việt (GDPT 2018).\n"
                "Nhiệm vụ: Phân tích đoạn văn bài đọc chính tả, trích xuất danh sách 3-5 từ khó viết đối với học sinh "
                "(dễ sai phụ âm đầu, vần khó hoặc dấu hỏi/ngã) và viết 1 câu tóm tắt ý nghĩa bài đọc.\n"
                "Chỉ xuất DUY NHẤT một chuỗi JSON hợp lệ không có markdown codeblock theo mẫu:\n"
                "{\n"
                '  "title": "Tên bài đọc ngắn gọn",\n'
                '  "difficultWords": ["từ 1", "từ 2", "từ 3", "từ 4"],\n'
                '  "summary": "Tóm tắt ngắn gọn ý nghĩa bài đọc"\n'
                "}"
            )
            user_content = f"Văn bản bài đọc Lớp {valid_grade}:\n{clean_content}\n\nHãy xuất JSON:"
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_content}
            ]
            prompt_text = tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
            inputs = tokenizer([prompt_text], return_tensors="pt").to(device)

            with _qwen_lock:
                with torch.no_grad():
                    outputs = model.generate(
                        **inputs,
                        max_new_tokens=160,
                        do_sample=True,
                        temperature=0.6,
                        top_p=0.90,
                        repetition_penalty=1.12,
                        pad_token_id=tokenizer.eos_token_id
                    )

            generated_ids = outputs[0][inputs.input_ids.shape[1]:]
            gen_text = tokenizer.decode(generated_ids, skip_special_tokens=True).strip()
            cleaned = gen_text.replace("```json", "").replace("```", "").strip()
            s_idx, e_idx = cleaned.find("{"), cleaned.rfind("}")
            cleaned_json = cleaned[s_idx:e_idx + 1] if (s_idx != -1 and e_idx != -1 and e_idx > s_idx) else cleaned

            try:
                parsed = json.loads(cleaned_json)
                if parsed.get("title"):
                    title = str(parsed["title"]).strip()
                dw = parsed.get("difficultWords", [])
                if isinstance(dw, str):
                    difficult_words = [w.strip() for w in dw.split(",") if w.strip()]
                elif isinstance(dw, list):
                    difficult_words = [str(w).strip() for w in dw if str(w).strip()]
                if parsed.get("summary"):
                    summary = str(parsed["summary"]).strip()
            except Exception:
                m_title = re.search(r'"title"\s*:\s*"([^"]+)"', cleaned)
                if m_title:
                    title = m_title.group(1).strip()
                m_summary = re.search(r'"summary"\s*:\s*"([^"]+)"', cleaned)
                if m_summary:
                    summary = m_summary.group(1).strip()
                m_dw = re.search(r'"difficultWords"\s*:\s*\[([^\]]+)\]', cleaned)
                if m_dw:
                    difficult_words = [w.strip().strip('"\'') for w in m_dw.group(1).split(",") if w.strip().strip('"\'')]

            source = "qwen2.5_0.5b"
        except Exception as e:
            logger.warning(f"⚠️ [extract-sgk] Qwen inference không thành công ({e}) -> Fallback sang deterministic.")
            source = "deterministic_pedagogy_fallback"
        finally:
            if QWEN_LIFECYCLE_MODE == "on_demand_unload":
                unload_qwen_model()

    if not difficult_words:
        difficult_words = extract_deterministic_difficult_words(clean_content, max_words=5)
    if not summary:
        summary = f"Bài đọc chính tả Lớp {valid_grade} gồm {len(clean_content.split())} từ, rèn luyện kỹ năng viết đúng các từ khó: {', '.join(difficult_words[:3])}."

    return {
        "title": title or "Bài đọc chính tả",
        "clean_content": clean_content,
        "difficultWords": difficult_words,
        "summary": summary,
        "source": source,
        "qwen_active": _qwen_model is not None,
        "ram_unloaded": QWEN_LIFECYCLE_MODE == "on_demand_unload"
    }


class DirectProsodyRequest(BaseModel):
    passage: str
    difficult_words: Optional[Union[List[str], str]] = []
    grade: Optional[int] = 3
    chunk_mode: Optional[str] = "phrase"


@app.post("/qwen/direct-prosody")
async def direct_prosody_endpoint(req: DirectProsodyRequest):
    """Điều phối nhịp đọc chính tả trong pipeline Qwen2.5 + Piper VITS:
    - Bảo đảm mô hình Qwen2.5 luôn ở trạng thái hoạt động sẵn sàng.
    - Bảo toàn 100% từ ngữ gốc (Zero-Word-Mutation).
    - Gán tốc độ, sắc thái giọng đọc Piper VITS & thời gian nghỉ viết (+2.5s cho câu có từ khó).
    """
    if not req.passage or not req.passage.strip():
        raise HTTPException(status_code=400, detail="Đoạn văn không được để trống")

    if isinstance(req.difficult_words, str):
        diff_list = [w.strip() for w in req.difficult_words.split(",") if w.strip()]
    elif isinstance(req.difficult_words, list):
        diff_list = [str(w).strip() for w in req.difficult_words if str(w).strip()]
    else:
        diff_list = []

    valid_grade = max(1, min(5, int(req.grade or 3)))
    chunk_mode = req.chunk_mode or "phrase"

    # Đảm bảo Qwen2.5 luôn được nạp và hoạt động trong pipeline chính khi RAM cho phép
    avail_ram = get_available_ram_mb()
    if ENABLE_QWEN_SLM and QWEN_LIFECYCLE_MODE == "always_active" and _qwen_model is None and avail_ram >= QWEN_RAM_THRESHOLD_MB:
        try:
            get_qwen_model()
        except Exception as e:
            logger.warning(f"⚠️ [direct-prosody] Không thể nạp Qwen2.5: {e}")

    # 1. Tra cứu LRU Cache
    cache_key = compute_prosody_cache_key(req.passage, valid_grade, chunk_mode, diff_list)
    cached = get_cached_prosody_script(cache_key)
    if cached is not None:
        resp = dict(cached)
        resp["cache_hit"] = True
        resp["qwen_active"] = _qwen_model is not None
        resp["source"] = "qwen2.5_0.5b+piper_vits" if _qwen_model is not None else "deterministic_pedagogy"
        resp["ram_unloaded"] = QWEN_LIFECYCLE_MODE == "on_demand_unload"
        return resp

    # 2. Xử lý kịch bản phân đoạn sư phạm Qwen2.5 + Piper VITS (Zero-Word-Mutation)
    try:
        script = direct_prosody_script(
            req.passage,
            difficult_words=diff_list,
            grade=valid_grade,
            chunk_mode=chunk_mode
        )
        # Lưu cache
        set_cached_prosody_script(cache_key, script)

        return {
            "clauses": script["clauses"],
            "total_words": script["total_words"],
            "estimated_duration_sec": script["estimated_duration_sec"],
            "cache_hit": False,
            "qwen_active": _qwen_model is not None,
            "source": "qwen2.5_0.5b+piper_vits" if _qwen_model is not None else "deterministic_pedagogy",
            "ram_unloaded": QWEN_LIFECYCLE_MODE == "on_demand_unload"
        }
    finally:
        if QWEN_LIFECYCLE_MODE == "on_demand_unload":
            unload_qwen_model()


class QwenTestRequest(BaseModel):
    creativity_score: float = 1.0
    evidence: list[str] = ["Từ láy: róc rách, thoang thoảng", "So sánh: 'dòng suối như dải lụa'"]
    errors: list[dict] = []
    grading_mode: str = "essay"
    current_comments: list[str] = []


@app.post("/qwen/generate")
async def qwen_generate_endpoint(req: QwenTestRequest):
    """Endpoint thử nghiệm sinh lời nhận xét sư phạm trực tiếp bằng Qwen."""
    creativity_info = {
        "score": req.creativity_score,
        "evidence": req.evidence,
        "devices": ["tu_lay", "so_sanh"]
    }
    result = generate_pedagogical_comment_tier2(
        creativity_info,
        req.errors,
        current_comments=req.current_comments,
        is_dictation=(req.grading_mode != "essay")
    )
    return result


class GeneratePassageRequest(BaseModel):
    grade: Optional[int] = 3
    topic: Optional[str] = "Tình bạn và trường lớp"
    sentence_count: Optional[int] = 4
    book_set: Optional[str] = "KetNoi"


@app.post("/qwen/generate-passage")
async def qwen_generate_passage_endpoint(req: GeneratePassageRequest):
    """Sáng tác bài đọc chính tả kèm trích xuất từ khó chuẩn GDPT 2018 bằng Qwen2.5 SLM."""
    result = generate_dictation_passage_tier2(
        grade=req.grade or 3,
        topic=req.topic or "Tình bạn và trường lớp",
        sentence_count=req.sentence_count or 4,
        book_set=req.book_set or "KetNoi"
    )
    return result


# ============================================================
# YOLOv8 WORD DETECTION & READING ORDER ALIGNMENT
# ============================================================
class DetectWordsRequest(BaseModel):
    imageBase64: str
    conf_threshold: Optional[float] = 0.50
    iou_threshold: Optional[float] = 0.45


@app.get("/yolo/status")
async def yolo_status_endpoint():
    """Kiểm tra trạng thái nạp của YOLOv8 Word Detector."""
    import sys
    sys.path.insert(0, os.path.dirname(__file__))
    import yolo_detector
    return {
        "loaded": yolo_detector._model_loaded,
        "weights_path": yolo_detector.DEFAULT_WEIGHTS_PATH,
        "weights_exists": os.path.exists(yolo_detector.DEFAULT_WEIGHTS_PATH)
    }


@app.post("/detect-words")
async def detect_words_endpoint(req: DetectWordsRequest):
    """
    Endpoint nhận diện Bounding Box của từng từ viết tay (YOLOv8 + Vertical Overlap).
    Sắp xếp theo thứ tự đọc tự nhiên (trên→dưới, trái→phải).
    """
    try:
        import base64
        import io
        from PIL import Image
        import sys
        sys.path.insert(0, os.path.dirname(__file__))
        from yolo_detector import detect_words_from_image

        raw_b64 = req.imageBase64
        if "," in raw_b64:
            raw_b64 = raw_b64.split(",", 1)[1]

        img_bytes = base64.b64decode(raw_b64)
        image = Image.open(io.BytesIO(img_bytes)).convert("RGB")

        conf = req.conf_threshold if req.conf_threshold is not None else 0.50
        iou  = req.iou_threshold  if req.iou_threshold  is not None else 0.45
        result = detect_words_from_image(image, conf_threshold=conf, iou_threshold=iou)
        return result
    except Exception as e:
        logger.error(f"[YOLO] Lỗi khi xử lý detect-words: {e}")
        raise HTTPException(status_code=500, detail=str(e))


def ensure_port_available(port: int = 8000):
    """Đảm bảo port không bị chiếm dụng bởi process zombie trước khi uvicorn khởi chạy."""
    import socket
    import os
    import time
    try:
        import psutil
    except ImportError:
        psutil = None

    def is_in_use(p):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.settimeout(0.3)
            return s.connect_ex(("127.0.0.1", p)) == 0

    if not is_in_use(port):
        return

    logger.warning(f"⚠️ Port {port} đang bị chiếm dụng. Đang tự động giải phóng process cũ...")
    curr_pid = os.getpid()

    # 1. Dùng psutil diệt trực tiếp tiến trình theo port (nhanh nhất < 0.1s)
    if psutil:
        try:
            for conn in psutil.net_connections(kind="inet"):
                if conn.laddr and conn.laddr.port == port and conn.pid and conn.pid != curr_pid:
                    try:
                        p = psutil.Process(conn.pid)
                        p.kill()
                        logger.info(f"Đã giải phóng process chiếm port {port} (PID: {conn.pid})")
                    except Exception:
                        pass
        except Exception:
            pass

    # 2. Dùng taskkill trên Windows nếu vẫn còn
    if is_in_use(port) and sys.platform == "win32":
        try:
            import subprocess
            out = subprocess.check_output(f'netstat -ano | findstr :{port}', shell=True, text=True, errors="ignore")
            for line in out.strip().splitlines():
                parts = line.strip().split()
                if len(parts) >= 5 and "LISTENING" in line:
                    pid = parts[-1]
                    if pid.isdigit() and int(pid) != curr_pid and int(pid) > 4:
                        subprocess.run(f"taskkill /F /T /PID {pid}", shell=True, capture_output=True)
        except Exception:
            pass

    time.sleep(0.8)
    if not is_in_use(port):
        logger.info(f"✅ Đã giải phóng thành công port {port}!")
    else:
        logger.warning(f"⚠️ Port {port} vẫn còn kết nối, uvicorn sẽ thử khởi động lại...")



if __name__ == "__main__":
    ensure_port_available(port=8000)
    import uvicorn
    import time
    try:
        uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")
    except OSError as e:
        if "10048" in str(e) or "address already in use" in str(e).lower():
            logger.warning("⚠️ Bị lỗi xung đột port 10048, đang cưỡng chế giải phóng và khởi động lại...")
            ensure_port_available(port=8000)
            time.sleep(1.5)
            uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")
        else:
            raise

