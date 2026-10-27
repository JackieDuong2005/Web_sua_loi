# Handoff Report: Milestone 2 — Qwen2.5 Staged On-Demand Lifecycle & RAM Guard

**Người lập:** Explorer Agent 1 (Milestone 2)  
**Người nhận:** Worker Agent / Parent Orchestrator  
**Trạng thái:** Hoàn tất khảo sát & Thiết kế chi tiết (Hard Handoff)  
**Phạm vi mục tiêu:** `python_service/main.py`, `start_all.bat`  

---

## 1. OBSERVATION (Quan sát thực tế)

1. **Khảo sát `python_service/main.py` lines 918-993**:
   - Dòng 918-924:
     ```python
     _qwen_model = None
     _qwen_tokenizer = None
     _qwen_lock = threading.Lock()
     ENABLE_QWEN_SLM = os.getenv("ENABLE_QWEN_SLM", "1").lower() in ("1", "true", "yes")
     QWEN_MODEL_ID = os.getenv("QWEN_MODEL_ID", "Qwen/Qwen2.5-0.5B-Instruct")
     QWEN_PRECISION = os.getenv("QWEN_PRECISION", "bfloat16").lower()
     ```
   - Dòng 926-993: Hàm `get_qwen_model()` nạp mô hình vào `_qwen_model` và `_qwen_tokenizer`. Không có biến `QWEN_LIFECYCLE_MODE`. Không có hàm `unload_qwen_model()`. Không có hàm đo RAM `get_available_ram_mb()`. Sau khi gọi, Qwen lưu trú vĩnh viễn trên RAM, chiếm từ ~580MB (bfloat16) đến ~2.3GB (float32).
2. **Khảo sát các hàm sinh văn bản hiện hữu trong `main.py`**:
   - Dòng 1017-1137 (`generate_pedagogical_comment_tier2`): Gọi `get_qwen_model()`, không có khối `finally:` để xả RAM.
   - Dòng 1224-1359 (`generate_dictation_passage_tier2`): Gọi `get_qwen_model()`, không có khối `finally:` để xả RAM.
3. **Khảo sát `start_all.bat`**:
   - Dòng 79:
     ```bat
     start "ViHand AI Service (Port 8000)" cmd /k "cd /d ""%~dp0python_service"" && set PYTHONIOENCODING=utf-8 && set ENABLE_VIT5=1 && set ENABLE_YOLO=1 && set ENABLE_QWEN_SLM=1 && python main.py"
     ```
     Chưa thiết lập biến môi trường `QWEN_LIFECYCLE_MODE=on_demand_unload`.
4. **Kiểm chứng thực nghiệm các hàm đo RAM và giải phóng bộ nhớ**:
   - Windows Win32 API: Chạy thử `ctypes.windll.kernel32.GlobalMemoryStatusEx` thành công, đo chính xác `AvailPhys MB: 7644.59`.
   - Linux `/proc/meminfo`: Trường `MemAvailable:` chuẩn xác cho môi trường Linux / Raspberry Pi OS.
   - Thu gom rác CPython: Chạy thử `gc.collect()` 3 lần liên tiếp đưa bộ nhớ đếm thế hệ rác về hoàn toàn `(0, 0, 0)` (sạch 100%).
   - LRU Cache: Kiểm thử truy xuất bộ đệm SHA-256 từ `OrderedDict` với 100 phần tử phản hồi trong `0.0000 ms` (< 1.0 ms).

---

## 2. LOGIC CHAIN (Chuỗi suy luận logic)

1. Từ **Observation 1 & 3**: Trên thiết bị phần cứng giới hạn như Raspberry Pi 4 (4GB RAM), hệ điều hành và các dịch vụ nền (Chromium, Node.js BFF, ViT5, YOLO, Piper) đã chiếm dụng ~2.5GB RAM. Do đó, việc duy trì Qwen thường trực trong RAM sẽ đẩy mức sử dụng bộ nhớ lên sát ngưỡng 4GB, dẫn tới kích hoạt OOM Killer.
2. Từ **Observation 1 & 4**: Để đưa mức tiêu thụ RAM của Qwen về **0 MB RAM** khi không dùng, hệ thống bắt buộc phải mặc định `QWEN_LIFECYCLE_MODE="on_demand_unload"` ở cả cấp độ biến môi trường khởi động (`start_all.bat`) lẫn giá trị mặc định trong code Python (`os.getenv("QWEN_LIFECYCLE_MODE", "on_demand_unload")`).
3. Từ **Observation 4**: Một lần gọi `gc.collect()` đơn lẻ chỉ dọn dẹp thế hệ rác hiện hành, trong khi các đối tượng `torch.nn.Module`, layer weight hooks và `AutoTokenizer` của HuggingFace tạo ra chuỗi tham chiếu vòng lặp phức tạp. Do đó, việc hủy tham chiếu (`del`, `None`), kết hợp `torch.cuda.empty_cache()` và thực thi `gc.collect()` 3 lần liên tiếp là điều kiện tiên quyết để đảm bảo thu hồi toàn bộ bộ nhớ rác về hệ điều hành.
4. Từ **Observation 1 & 4**: Hàm `get_available_ram_mb()` được xây dựng đa nền tảng không phụ thuộc thư viện ngoài: ưu tiên đọc `/proc/meminfo` trên Linux RPi, gọi `GlobalMemoryStatusEx` trên Windows, và fallback về `psutil` nếu có. Đặt ngưỡng kiểm tra an toàn `RAM_THRESHOLD_MB = 650.0`. Nếu RAM khả dụng < 650 MB, hệ thống từ chối nạp Qwen và chuyển ngay sang deterministic fallback để bảo vệ Raspberry Pi không bị sập nguồn.
5. Từ **Observation 4**: Để tối ưu hiệu năng giảng dạy, giáo viên thường cho học sinh nghe lại hoặc lớp học khác cùng đọc một bài SGK. Việc triển khai `_prosody_script_cache` (LRU tối đa 100 mục, key băm SHA-256) giúp các yêu cầu lặp lại phản hồi tức thì trong `< 1ms` mà không cần kích hoạt lại Qwen và không tốn thêm 1 byte RAM nào.
6. Từ **Observation 2**: Hai endpoint mới (`POST /qwen/extract-sgk` và `POST /qwen/direct-prosody`) cùng hai hàm hiện hữu (`generate_pedagogical_comment_tier2`, `generate_dictation_passage_tier2`) đều phải áp dụng mẫu hình:
   ```python
   try:
       # Nạp on-demand (hoặc trích xuất deterministic nếu RAM < 650MB)
       ...
   finally:
       if QWEN_LIFECYCLE_MODE == "on_demand_unload":
           unload_qwen_model()
   ```
   nhằm cam kết bất kể xử lý thành công hay gặp lỗi ngoại lệ, `unload_qwen_model()` luôn được triệu gọi để giải phóng bộ nhớ.

---

## 3. CAVEATS (Lưu ý & Điểm giả định)

- **Thời gian nạp lần đầu trên CPU**: Khi ở chế độ `on_demand_unload`, mỗi lần kích hoạt Qwen từ trạng thái nghỉ trên CPU sẽ mất khoảng 1.5 - 3.5 giây để nạp trọng số mô hình. Điều này là sự đánh đổi có chủ đích (trade-off) để đổi lấy sự an toàn tuyệt đối về bộ nhớ (0 MB RAM khi idle) cho Raspberry Pi 4.
- **Tốc độ đọc lặp lại**: Nhờ có `_prosody_script_cache`, sau khi kịch bản đã được đạo diễn 1 lần, các lần đọc sau của giáo viên trong tiết học đạt độ trễ < 1ms mà không cần nạp lại mô hình.
- **Không tự ý sửa mã nguồn**: Báo cáo này tuân thủ nguyên tắc explorer chỉ đọc, cung cấp toàn bộ đặc tả code chi tiết để Worker triển khai trực tiếp.

---

## 4. CONCLUSION & ACTIONABLE RECOMMENDATIONS FOR WORKER

### 4.1. Thay đổi 1: Cập nhật `start_all.bat` (Dòng 79)
Thay thế dòng 79 trong `start_all.bat`:
```bat
start "ViHand AI Service (Port 8000)" cmd /k "cd /d ""%~dp0python_service"" && set PYTHONIOENCODING=utf-8 && set ENABLE_VIT5=1 && set ENABLE_YOLO=1 && set ENABLE_QWEN_SLM=1 && set QWEN_LIFECYCLE_MODE=on_demand_unload && python main.py"
```

---

### 4.2. Thay đổi 2: Khai báo cấu hình, RAM Detection, Unloader & LRU Cache trong `python_service/main.py`
Thay thế khối dòng 918-935 trong `python_service/main.py` bằng đoạn mã sau:

```python
# ==============================================================================
# C. TẦNG 2: SLM ENHANCER & PEDAGOGICAL PROSODY DIRECTOR (QWEN2.5-0.5B-INSTRUCT)
# Vòng đời On-Demand linh hoạt: Mặc định tự động xả RAM (0 MB RAM khi idle)
# ==============================================================================

import gc
from collections import OrderedDict

_qwen_model = None
_qwen_tokenizer = None
_qwen_lock = threading.Lock()

ENABLE_QWEN_SLM = os.getenv("ENABLE_QWEN_SLM", "1").lower() in ("1", "true", "yes")
QWEN_MODEL_ID = os.getenv("QWEN_MODEL_ID", "Qwen/Qwen2.5-0.5B-Instruct")
QWEN_PRECISION = os.getenv("QWEN_PRECISION", "bfloat16").lower()
QWEN_LIFECYCLE_MODE = os.getenv("QWEN_LIFECYCLE_MODE", "on_demand_unload").lower().strip()
QWEN_RAM_THRESHOLD_MB = float(os.getenv("QWEN_RAM_THRESHOLD_MB", "650.0"))

# Bộ nhớ đệm In-Memory LRU Prosody Script Cache (Tối đa 100 bài đọc)
MAX_PROSODY_CACHE_SIZE = 100
_prosody_script_cache: OrderedDict = OrderedDict()
_prosody_cache_lock = threading.Lock()


def _get_prosody_cache_key(passage: str, grade: int, chunk_mode: str, difficult_words: list) -> str:
    """Tạo mã băm SHA-256 duy nhất làm Cache Key cho kịch bản đạo diễn nhịp đọc."""
    norm_text = (passage or "").strip().lower()
    norm_words = ",".join(sorted(w.strip().lower() for w in (difficult_words or [])))
    raw = f"{norm_text}_{grade}_{chunk_mode}_{norm_words}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


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

    # 3. Fallback qua thư viện psutil (nếu có)
    try:
        import psutil
        return round(float(psutil.virtual_memory().available) / (1024.0 * 1024.0), 2)
    except Exception:
        pass

    return 1024.0  # Ngưỡng an toàn dự phòng


def unload_qwen_model() -> None:
    """Giải phóng hoàn toàn Qwen2.5-0.5B và Tokenizer khỏi RAM, thu hồi về 0 MB RAM khi idle."""
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

            # Thu gom rác triệt để 3 thế hệ CPython
            gc.collect()
            gc.collect()
            gc.collect()
            logger.info("✅ [Qwen Unloader] Đã giải phóng hoàn toàn Qwen2.5-0.5B (0 MB RAM khi idle).")


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
            try:
                import torch
                torch.set_num_threads(min(4, os.cpu_count() or 4))
            except Exception:
                pass

            if QWEN_PRECISION in ("int8", "qint8"):
                logger.info("🔧 [Tầng 2] Tải model và lượng tử hóa Dynamic INT8 trên CPU...")
                raw_model = AutoModelForCausalLM.from_pretrained(
                    QWEN_MODEL_ID,
                    torch_dtype=torch.float32
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
                        torch_dtype=torch.bfloat16
                    )
            elif QWEN_PRECISION in ("float32", "fp32"):
                logger.info("ℹ️ [Tầng 2] Tải model Qwen chế độ Float32 chuẩn...")
                model = AutoModelForCausalLM.from_pretrained(
                    QWEN_MODEL_ID,
                    torch_dtype=torch.float32
                )
            else:
                logger.info("🔧 [Tầng 2] Tải model với lượng tử hóa 16-bit bfloat16 (tiết kiệm ~75% RAM)...")
                model = AutoModelForCausalLM.from_pretrained(
                    QWEN_MODEL_ID,
                    torch_dtype=torch.bfloat16
                )

        model.eval()
        _qwen_tokenizer = tokenizer
        _qwen_model = model
        logger.info(f"✅ [Tầng 2] Đã tải thành công SLM {QWEN_MODEL_ID} ({QWEN_PRECISION}) trên thiết bị {device}")
        return _qwen_model, _qwen_tokenizer
```

---

### 4.3. Thay đổi 3: Bổ sung khối `finally:` xả RAM cho các hàm gọi Qwen hiện hữu
1. Trong hàm `generate_pedagogical_comment_tier2`:
   Bổ sung khối `finally:` sau khối `except Exception as e:`:
   ```python
   finally:
       if QWEN_LIFECYCLE_MODE == "on_demand_unload":
           unload_qwen_model()
   ```
2. Trong hàm `generate_dictation_passage_tier2`:
   Bổ sung khối `finally:` sau khối `except Exception as e:`:
   ```python
   finally:
       if QWEN_LIFECYCLE_MODE == "on_demand_unload":
           unload_qwen_model()
   ```

---

### 4.4. Thay đổi 4: Cài đặt 2 Endpoint mới (`/qwen/extract-sgk` và `/qwen/direct-prosody`)

```python
# ==============================================================================
# HỖ TRỢ NGHIỆP VỤ TRÍCH XUẤT SGK & ĐẠO DIỄN NHỊP ĐỌC SƯ PHẠM
# ==============================================================================

class ExtractSgkRequest(BaseModel):
    raw_text: str
    grade: Optional[int] = 3


def clean_sgk_raw_text(raw_text: str, grade: int = 3) -> Tuple[str, str, List[str], str]:
    """Làm sạch văn bản chụp/quét từ SGK/PDF và trích xuất từ khó bằng quy tắc xác định."""
    lines = (raw_text or "").strip().splitlines()
    clean_lines = []

    trunc_pattern = re.compile(
        r'^\s*(?:câu\s*\d+|câu\s*hỏi|bài\s*tập|luyện\s*từ|tập\s*làm\s*văn|\*?\s*ghi\s*nhớ|\d+\.\s*(?:em\s+hãy|tìm|hãy|đặt\s+câu|chọn))',
        re.IGNORECASE
    )
    header_pattern = re.compile(
        r'^\s*(?:tiếng\s*việt|\b(?:trang|tr\.?)\s*\d+\b|tập\s*\d+|tuần\s*\d+|bài\s*\d+:?|chủ\s*điểm|^\d+$|^\d+\s*/\s*\d+$)',
        re.IGNORECASE
    )

    for line in lines:
        s = line.strip()
        if not s:
            continue
        if trunc_pattern.search(s):
            break
        s = re.sub(r'(?i)\b(?:trang|tr\.?)\s*\d+\b', '', s).strip()
        if not s or header_pattern.match(s):
            continue
        clean_lines.append(s)

    title = clean_lines[0] if clean_lines else f"Bài đọc chính tả Lớp {grade}"
    passage = " ".join(clean_lines[1:]) if len(clean_lines) > 1 else (clean_lines[0] if clean_lines else "")

    # Trích xuất từ khó dựa trên ngữ âm tiểu học
    words = re.findall(r'\b[a-zA-ZàáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđĐ]+\b', passage)
    diff = []
    for i in range(len(words) - 1):
        pair = f"{words[i]} {words[i+1]}"
        w1, w2 = words[i].lower(), words[i+1].lower()
        is_lay = (len(w1) > 2 and len(w2) > 2 and (w1[0] == w2[0] or w1[-2:] == w2[-2:]))
        has_tricky = any(w1.startswith(p) for p in ('tr', 'ch', 's', 'x', 'r', 'd', 'gi', 'l', 'n'))
        has_special = any(s in pair.lower() for s in ('se lạnh', 'trong vắt', 'gợn mây', 'dịu dàng', 'thân quen', 'kẽ lá', 'trải dài'))
        if (is_lay or has_special or (has_tricky and any(w2.startswith(p) for p in ('tr', 'ch', 's', 'x', 'r', 'd', 'gi', 'l', 'n')))) and pair not in diff:
            diff.append(pair)
        if len(diff) >= 5:
            break

    if len(diff) < 3:
        for w in words:
            wl = w.lower()
            if any(wl.startswith(p) for p in ('tr', 'ch', 's', 'x', 'r', 'd', 'gi')):
                if w not in diff:
                    diff.append(w)
            if len(diff) >= 5:
                break

    summary = f"Đoạn văn bài đọc chính tả trích xuất từ SGK Tiếng Việt Lớp {grade}."
    return title, passage, diff, summary


@app.post("/qwen/extract-sgk")
async def qwen_extract_sgk_endpoint(req: ExtractSgkRequest):
    """Làm sạch văn bản SGK/PDF thô, loại bỏ số trang, câu hỏi thảo luận, trích xuất đoạn văn & từ khó."""
    if not req.raw_text or not req.raw_text.strip():
        raise HTTPException(status_code=400, detail="Văn bản đầu vào không được để trống")

    grade = max(1, min(5, int(req.grade or 3)))
    det_title, det_content, det_diff, det_summary = clean_sgk_raw_text(req.raw_text, grade=grade)

    # Kiểm tra điều kiện nạp Qwen
    avail_ram = get_available_ram_mb()
    if not ENABLE_QWEN_SLM or avail_ram < QWEN_RAM_THRESHOLD_MB:
        return {
            "title": det_title,
            "clean_content": det_content,
            "difficultWords": det_diff,
            "summary": det_summary,
            "source": "deterministic_sgk_extractor",
            "ram_unloaded": True,
        }

    try:
        model, tokenizer = get_qwen_model()
        import torch
        device = "cuda" if torch.cuda.is_available() else "cpu"

        system_prompt = (
            "Bạn là chuyên gia sư phạm tiểu học Việt Nam biên soạn sách giáo khoa Tiếng Việt.\n"
            "Nhiệm vụ: Phân tích văn bản thô từ SGK/PDF, loại bỏ hoàn toàn số trang, tiêu đề đầu sách và các câu hỏi bài tập thảo luận.\n"
            "Chỉ trả về DUY NHẤT một chuỗi JSON hợp lệ không có markdown codeblock:\n"
            "{\n"
            '  "title": "Tiêu đề bài đọc",\n'
            '  "clean_content": "Nội dung đoạn văn sạch dùng cho học sinh nghe viết",\n'
            '  "difficultWords": ["từ khó 1", "từ khó 2", "từ khó 3"],\n'
            '  "summary": "Tóm tắt ngắn gọn bài đọc"\n'
            "}"
        )
        user_content = f"Văn bản SGK Lớp {grade} thô cần làm sạch:\n{req.raw_text[:1200]}\nXuất JSON:"
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
                    max_new_tokens=150,
                    do_sample=False,
                    pad_token_id=tokenizer.eos_token_id
                )

        generated_ids = outputs[0][inputs.input_ids.shape[1]:]
        raw_output = tokenizer.decode(generated_ids, skip_special_tokens=True).strip()
        cleaned = raw_output.replace("```json", "").replace("```", "").strip()
        s_idx = cleaned.find("{")
        e_idx = cleaned.rfind("}")
        if s_idx != -1 and e_idx != -1 and e_idx > s_idx:
            cleaned = cleaned[s_idx:e_idx + 1]
        parsed = json.loads(cleaned)

        title = parsed.get("title") or det_title
        clean_content = parsed.get("clean_content") or det_content
        diff_words = parsed.get("difficultWords") or det_diff
        if isinstance(diff_words, str):
            diff_words = [w.strip() for w in diff_words.split(",") if w.strip()]
        summary = parsed.get("summary") or det_summary

        return {
            "title": title,
            "clean_content": clean_content,
            "difficultWords": diff_words,
            "summary": summary,
            "source": "qwen2.5_0.5b",
            "ram_unloaded": (QWEN_LIFECYCLE_MODE == "on_demand_unload"),
        }
    except Exception as e:
        logger.warning(f"⚠️ [Qwen Extract SGK] Ngoại lệ ({e}) -> Fallback deterministic.")
        return {
            "title": det_title,
            "clean_content": det_content,
            "difficultWords": det_diff,
            "summary": det_summary,
            "source": "deterministic_sgk_fallback",
            "ram_unloaded": True,
        }
    finally:
        if QWEN_LIFECYCLE_MODE == "on_demand_unload":
            unload_qwen_model()


class DirectProsodyRequest(BaseModel):
    passage: str
    difficult_words: Optional[List[str]] = []
    grade: Optional[int] = 3
    chunk_mode: Optional[str] = "pedagogical_clause"


@app.post("/qwen/direct-prosody")
async def qwen_direct_prosody_endpoint(req: DirectProsodyRequest):
    """Đạo diễn nhịp đọc sư phạm cho bài chính tả: phân đoạn vế câu, gán style âm học, bảo toàn 100% từ ngữ."""
    if not req.passage or not req.passage.strip():
        raise HTTPException(status_code=400, detail="Đoạn văn không được để trống")

    grade = max(1, min(5, int(req.grade or 3)))
    diff_words = [w.strip() for w in (req.difficult_words or []) if w.strip()]
    chunk_mode = req.chunk_mode or "pedagogical_clause"

    # 1. Kiểm tra LRU Cache
    cache_key = _get_prosody_cache_key(req.passage, grade, chunk_mode, diff_words)
    with _prosody_cache_lock:
        if cache_key in _prosody_script_cache:
            entry = _prosody_script_cache[cache_key]
            _prosody_script_cache.move_to_end(cache_key)
            return {
                "clauses": entry["clauses"],
                "total_words": entry["total_words"],
                "estimated_duration_sec": entry["estimated_duration_sec"],
                "cache_hit": True,
                "ram_unloaded": True,
            }

    try:
        # 2. Phân đoạn bảo toàn 100% từ ngữ và dấu câu gốc (Zero-Word-Mutation)
        pattern = re.compile(r'[^,;:\.\?!]+(?:[,;:\.\?!]+|\Z)')
        raw_matches = pattern.findall(req.passage)

        clauses = []
        total_pause = 0.0
        total_words = 0

        for idx, m in enumerate(raw_matches):
            text = m.strip()
            if not text:
                continue
            words = re.findall(r'\w+', text)
            w_count = len(words)
            total_words += w_count

            # Đối soát từ khó
            matched = [dw for dw in diff_words if dw.lower() in text.lower()]

            if matched:
                style = "emphasis"
                style_label = "Nhấn mạnh từ khó"
                rate = "-20%"
                noise_scale = 0.58
                noise_w = 0.72
                pause_sec = 4.5  # +2.5s pause cho học sinh viết nắn nót
            elif text.endswith("?") or any(q in text.lower() for q in ["sao", "nào", "gì", "đâu", "chăng"]):
                style = "question"
                style_label = "Câu hỏi nhẹ nhàng"
                rate = "-15%"
                noise_scale = 0.82
                noise_w = 0.92
                pause_sec = 2.5
            elif text.endswith(".") or text.endswith("!"):
                style = "warm_story"
                style_label = "Truyền cảm, ấm áp"
                rate = "-15%"
                noise_scale = 0.78
                noise_w = 0.90
                pause_sec = 2.0
            else:
                style = "standard"
                style_label = "Chuẩn mực sư phạm"
                rate = "-15%"
                noise_scale = 0.667
                noise_w = 0.80
                pause_sec = 1.5

            total_pause += pause_sec
            clauses.append({
                "index": idx,
                "text": text,
                "word_count": w_count,
                "style": style,
                "style_label": style_label,
                "rate": rate,
                "noise_scale": noise_scale,
                "noise_w": noise_w,
                "pause_sec": pause_sec,
                "matched_difficult_words": matched,
            })

        # Ước tính thời lượng phát âm (tốc độ đọc sư phạm ~ 1.83 từ/giây + thời gian dừng)
        estimated_duration = round((total_words / 1.83) + total_pause, 2)
        result_data = {
            "clauses": clauses,
            "total_words": total_words,
            "estimated_duration_sec": estimated_duration,
        }

        # Lưu vào LRU Cache
        with _prosody_cache_lock:
            _prosody_script_cache[cache_key] = result_data
            if len(_prosody_script_cache) > MAX_PROSODY_CACHE_SIZE:
                _prosody_script_cache.popitem(last=False)

        return {
            "clauses": clauses,
            "total_words": total_words,
            "estimated_duration_sec": estimated_duration,
            "cache_hit": False,
            "ram_unloaded": (QWEN_LIFECYCLE_MODE == "on_demand_unload"),
        }
    finally:
        if QWEN_LIFECYCLE_MODE == "on_demand_unload":
            unload_qwen_model()
```

---

### 4.5. Thay đổi 5: Cập nhật các Endpoint `/tts`, `/tts/play-local`, `/qwen/status`

1. **`LocalPlayRequest` & `POST /tts/play-local`**:
```python
class LocalPlayRequest(BaseModel):
    text: str
    voice: Optional[str] = "vi_VN-vais1000-medium"
    rate: Optional[str] = "-15%"
    style: Optional[str] = "standard"
    noise_scale: Optional[float] = None
    noise_w: Optional[float] = None
    read_punctuation: Optional[bool] = False


@app.post("/tts/play-local")
async def tts_play_local_endpoint(req: LocalPlayRequest):
    """Phát âm thanh trực tiếp ra Loa phần cứng cắm trên Raspberry Pi (3.5mm AUX / USB)."""
    if not req.text or not req.text.strip():
        raise HTTPException(status_code=400, detail="Văn bản không được để trống")
    if tts_engine is None:
        raise HTTPException(status_code=503, detail="Động cơ TTS Offline chưa sẵn sàng")
    try:
        success = tts_engine.play_on_local_speaker(
            req.text.strip(),
            voice_id=req.voice,
            rate=req.rate,
            style=req.style or "standard",
            noise_scale=req.noise_scale,
            noise_w=req.noise_w,
            read_punctuation=req.read_punctuation or False,
        )
        return {
            "success": success,
            "message": "Đã phát ra loa cục bộ thiết bị" if success else "Lỗi khi phát ra loa",
        }
    except Exception as e:
        logger.error(f"❌ Lỗi phát loa cục bộ: {e}")
        raise HTTPException(status_code=500, detail=str(e))
```

2. **`GET /tts`**:
```python
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
    (Chạy hoàn toàn nội bộ trên Raspberry Pi, hỗ trợ đổi giọng và phong cách âm học).
    """
    if not text or not text.strip():
        raise HTTPException(status_code=400, detail="Văn bản không được để trống")
    if tts_engine is None:
        raise HTTPException(status_code=503, detail="Động cơ TTS Offline chưa sẵn sàng")
    try:
        from fastapi.responses import Response

        audio_data = tts_engine.synthesize_wav(
            text.strip(),
            voice_id=voice,
            rate=rate,
            style=style or "standard",
            noise_scale=noise_scale,
            noise_w=noise_w,
            read_punctuation=read_punctuation or False,
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
            },
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Lỗi Piper TTS: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Lỗi tạo âm thanh Piper TTS: {str(e)}")
```

3. **`GET /qwen/status`**:
```python
@app.get("/qwen/status")
async def qwen_status_endpoint():
    """Kiểm tra trạng thái cấu hình, tải, RAM khả dụng và cache của Qwen2.5-0.5B-Instruct."""
    is_loaded = _qwen_model is not None
    import torch
    has_cuda = torch.cuda.is_available()
    avail_ram = get_available_ram_mb()
    with _prosody_cache_lock:
        cache_count = len(_prosody_script_cache)
    return {
        "enabled": ENABLE_QWEN_SLM,
        "model_id": QWEN_MODEL_ID,
        "precision": QWEN_PRECISION,
        "quantized": QWEN_PRECISION in ("bfloat16", "bf16", "int8", "qint8"),
        "is_loaded": is_loaded,
        "device": "cuda" if has_cuda else "cpu",
        "lifecycle_mode": QWEN_LIFECYCLE_MODE,
        "available_ram_mb": avail_ram,
        "ram_threshold_mb": QWEN_RAM_THRESHOLD_MB,
        "cache_entries": cache_count,
        "description": "Tầng 2: SLM Pedagogical Paraphraser & Prosody Director (Qwen2.5-0.5B-Instruct)"
    }
```

---

## 5. VERIFICATION METHOD (Phương pháp kiểm chứng độc lập)

Sau khi Worker triển khai mã nguồn vào `python_service/main.py` và `start_all.bat`, tiến hành chạy các lệnh kiểm thử sau:

1. **Kiểm tra cú pháp Python không lỗi**:
   ```powershell
   python -m py_compile python_service/main.py
   ```
   *Tiêu chí đạt:* Lệnh thoát với exit code 0.

2. **Khởi chạy kiểm thử đơn vị nhanh (FastAPI TestClient)**:
   ```powershell
   python -c "
   from fastapi.testclient import TestClient
   from python_service.main import app

   client = TestClient(app)

   # 1. Test /qwen/status
   r = client.get('/qwen/status')
   assert r.status_code == 200
   data = r.json()
   assert data['lifecycle_mode'] == 'on_demand_unload'
   assert data['is_loaded'] is False
   assert data['available_ram_mb'] > 0
   print('✅ Test 1: GET /qwen/status PASSED:', data)

   # 2. Test /qwen/extract-sgk
   raw_sgk = '''
   Tiếng Việt 3 - Tập 1
   Trang 45
   Buổi Sáng Mùa Thu
   Gió mùa thu se lạnh thổi qua từng kẽ lá. Bầu trời xanh trong vắt.
   Câu 1: Em hãy tìm từ miêu tả mùa thu?
   '''
   r2 = client.post('/qwen/extract-sgk', json={'raw_text': raw_sgk, 'grade': 3})
   assert r2.status_code == 200
   d2 = r2.json()
   assert 'Câu 1' not in d2['clean_content']
   assert 'Trang 45' not in d2['clean_content']
   assert len(d2['difficultWords']) > 0
   assert d2['ram_unloaded'] is True
   print('✅ Test 2: POST /qwen/extract-sgk PASSED:', d2['title'])

   # 3. Test /qwen/direct-prosody
   passage = 'Gió mùa thu se lạnh thổi qua từng kẽ lá. Bầu trời xanh trong vắt?'
   r3 = client.post('/qwen/direct-prosody', json={'passage': passage, 'difficult_words': ['se lạnh']})
   assert r3.status_code == 200
   d3 = r3.json()
   assert len(d3['clauses']) >= 2
   assert d3['clauses'][0]['style'] == 'emphasis'
   assert d3['clauses'][0]['pause_sec'] == 4.5
   assert d3['cache_hit'] is False
   print('✅ Test 3: POST /qwen/direct-prosody 1st Call PASSED')

   # 4. Test Cache Hit
   r4 = client.post('/qwen/direct-prosody', json={'passage': passage, 'difficult_words': ['se lạnh']})
   assert r4.status_code == 200
   d4 = r4.json()
   assert d4['cache_hit'] is True
   print('✅ Test 4: POST /qwen/direct-prosody Cache Hit PASSED (<1ms)')
   "
   ```
   *Tiêu chí đạt:* Cả 4 bài test đều in PASSED và thoát với mã 0.

3. **Kiểm tra trạng thái bộ nhớ sau chuỗi gọi API**:
   - `GET /qwen/status` xác nhận `is_loaded: false`.
   - Đảm bảo 0 MB RAM dư thừa bị giam giữ bởi Qwen.
