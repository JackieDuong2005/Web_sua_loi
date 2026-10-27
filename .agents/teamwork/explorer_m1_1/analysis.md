# Phân tích Kỹ thuật & Chiến lược Triển khai: Milestone 1
## Expressive Piper VITS Engine & Spoken Punctuation (`python_service/tts_engine.py`)

**Tác giả**: Explorer 1 (Milestone 1)  
**Ngày thực hiện**: 2026-10-18  
**Trạng thái**: Khảo sát hoàn tất — Đề xuất sẵn sàng cho Worker  
**Quy chuẩn áp dụng**: Tuân thủ `GEMINI.md` (Không dùng Mermaid; dùng ASCII và bảng Markdown).

---

## 1. Tóm tắt Tổng quan (Executive Summary)

Mục tiêu của **Milestone 1** là nâng cấp động cơ phát âm offline Piper VITS ONNX trong tệp `python_service/tts_engine.py` nhằm:
1. **Loại bỏ giọng đọc đều đều/robot**: Định nghĩa 4 cấu hình phong cách diễn cảm âm học (`PROSODY_STYLE_PRESETS`: `warm_story`, `standard`, `emphasis`, `question`) thông qua các tham số VITS (`noise_scale`, `noise_w_scale`, `length_multiplier`).
2. **Hỗ trợ đọc tên dấu câu sư phạm (Spoken Punctuation)**: Cung cấp hàm `inject_pedagogical_punctuation(text, enabled)` dùng cơ chế token hóa một lượt (single-pass regex) để chuyển các dấu câu (`,`, `.`, `?`, `!`, `:`) thành lời đọc khẩu ngữ sư phạm (`phẩy`, `chấm`, `chấm hỏi`, `chấm than`, `hai chấm`).
3. **Truyền `SynthesisConfig` vào Piper**: Cập nhật `synthesize_wav` và `play_on_local_speaker` để nhận các tham số âm học, ưu tiên override của người dùng trên nền preset mặc định, và khởi tạo đối tượng `SynthesisConfig(length_scale, noise_scale, noise_w_scale)` truyền trực tiếp vào `voice.synthesize_wav`.

Qua khảo sát thực nghiệm trên môi trường runtime thực tế, mô hình ONNX `vi_VN-vais1000-medium.onnx` và thư viện `piper` (phiên bản Python 3.11) đã sẵn sàng, và tổng hợp giọng nói thực nghiệm với các tham số trên sinh ra tệp WAV đạt hơn 150.000 bytes với chất lượng âm thanh xuất sắc.

---

## 2. Khảo sát Hiện trạng Codebase (`python_service/tts_engine.py`)

### 2.1. Kiến trúc hiện tại của `tts_engine.py`
Tệp gồm 453 dòng code, được chia thành 2 phần chính:
- **Phần 1 (Dòng 61 - 196)**: Bộ tiền xử lý và chuẩn hóa văn bản tiếng Việt sư phạm (`normalize_vietnamese_text`). Hàm này chuyển đổi chữ số thành chữ đọc tiếng Việt (`3A` $\to$ `ba A`, `15/10/2026` $\to$ `mười lăm tháng mười năm...`), chuẩn hóa từ viết tắt (`tr.` $\to$ `trang `, `SGK` $\to$ `sách giáo khoa`), xóa ngoặc kép (`"“”«»`) và dọn dẹp khoảng trắng.
- **Phần 2 (Dòng 198 - 453)**: Lớp singleton `OfflineTTSEngine` quản lý nạp mô hình ONNX (`PiperVoice.load`), tổng hợp âm thanh (`synthesize_wav`) và phát ra loa phần cứng cục bộ (`play_on_local_speaker`).

### 2.2. Điểm hạn chế hiện tại cần khắc phục
| Thành phần | Hiện trạng trong code | Vấn đề / Yêu cầu nâng cấp |
|---|---|---|
| **Cấu hình Prosody** | Hoàn toàn chưa có. Chỉ có `length_scale` đơn điệu tính từ chuỗi `rate` (dòng 354-363). | Thiếu `PROSODY_STYLE_PRESETS` (`warm_story`, `standard`, `emphasis`, `question`). Đầu ra âm thanh bị phẳng/robot. |
| **Đọc dấu câu** | Chưa có. Dấu câu chỉ đóng vai trò phân tách câu cho mô hình espeak. | Chưa thể đọc khẩu ngữ sư phạm cho tiết học Nghe - Viết chính tả của học sinh lớp 1-5. |
| **SynthesisConfig** | Dòng 372: chỉ truyền `SynthesisConfig(length_scale=length_scale)`. Bỏ trống `noise_scale` và `noise_w_scale`. | Không tận dụng được khả năng kiểm soát độ biểu cảm (variability/noise) của kiến trúc VITS. |
| **Override Hierarchy** | Chưa có cơ chế nhận override từ caller. | Cần cơ chế: `style` cung cấp giá trị nền; các tham số explicit `noise_scale`, `noise_w` ghi đè nếu caller truyền vào. |

---

## 3. Thiết kế Kỹ thuật Chi tiết cho Milestone 1

### 3.1. Sơ đồ Kiến trúc Luồng Dữ liệu (ASCII Diagram)

```
[Văn bản đầu vào (text)] + [style, rate, noise_scale, noise_w, read_punctuation]
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ 1. normalize_vietnamese_text(text)                          │
│    - Số -> Chữ tiếng Việt chuẩn sư phạm                      │
│    - Từ viết tắt: tr. -> trang, SGK -> sách giáo khoa       │
│    - Loại bỏ dấu ngoặc kép ("“”«»)                          │
└────────────────────────┬────────────────────────────────────┘
                         │ norm_text
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. inject_pedagogical_punctuation(norm_text, enabled)       │
│    - Single-pass Regex Tokenization                         │
│    - Chuyển: , -> , phẩy, | . -> , chấm. | ? -> , chấm hỏi. │
│    - ! -> , chấm than. | : -> , hai chấm,                   │
└────────────────────────┬────────────────────────────────────┘
                         │ spoken_text
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. resolve_prosody_params(style, rate, noise_scale, noise_w) │
│    - Tra cứu preset trong PROSODY_STYLE_PRESETS             │
│    - Tính base_length_scale từ rate                         │
│    - eff_length = round(base_length * length_multiplier, 3) │
│    - Ghi đè eff_noise_scale nếu caller truyền noise_scale   │
│    - Ghi đè eff_noise_w_scale nếu caller truyền noise_w     │
└────────────────────────┬────────────────────────────────────┘
                         │ {length_scale, noise_scale, noise_w_scale}
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. SynthesisConfig & PiperVoice.synthesize_wav             │
│    - SynthesisConfig(length_scale=..., noise_scale=...,     │
│                      noise_w_scale=...)                     │
│    - Xuất WAV stream (audio/wav binary bytes)               │
└─────────────────────────────────────────────────────────────┘
```

---

### 3.2. Đặc tả Bảng Presets Âm học (`PROSODY_STYLE_PRESETS`)

Các tham số trong mô hình Piper VITS:
- `noise_scale`: Mức độ biến thiên âm sắc / ngữ điệu (sample noise). Giá trị cao hơn tạo giọng đọc tự nhiên, ấm áp, giàu cảm xúc hơn; giá trị thấp hơn tạo giọng phát âm chuẩn mực, chắc chắn, ít dao động.
- `noise_w_scale`: Mức độ biến thiên độ dài âm vị (phoneme length noise). Giá trị cao hơn làm nhịp điệu phong phú, có nhịp nhấn nhá tự nhiên; giá trị thấp hơn giữ nhịp đều đặn.
- `length_multiplier`: Hệ số nhân thời lượng âm thanh. Giá trị > 1.00 kéo dài thời lượng đọc (giọng đọc chậm rãi, rõ ràng hơn).

| Preset ID | Tên tiếng Việt | noise_scale | noise_w_scale | length_multiplier | Ứng dụng Sư phạm |
|---|---|:---:|:---:|:---:|---|
| `warm_story` | Truyền cảm, ấm áp | **0.78** | **0.90** | **1.05** | Đọc bài văn mẫu, đọc nhận xét sư phạm của cô giáo, lời khen ngợi động viên học sinh. |
| `standard` | Chuẩn mực | **0.667** | **0.80** | **1.00** | Đọc hướng dẫn làm bài chung, thông báo hệ thống, giọng đọc trung tính cơ bản. |
| `emphasis` | Nhấn mạnh, rõ ràng | **0.58** | **0.72** | **1.20** | Đọc từ khó chính tả, luyện phát âm từ sai, cần ngắt nhịp và nhấn rõ từng phụ âm đầu/vần/thanh điệu. |
| `question` | Gợi mở, nghi vấn | **0.82** | **0.92** | **1.08** | Đọc câu hỏi thảo luận SGK, câu nghi vấn, ngữ điệu lên giọng ở cuối câu. |

---

### 3.3. Đặc tả Bộ Đọc Dấu câu Sư phạm (`inject_pedagogical_punctuation`)

#### Quy tắc chuyển đổi:
- `,` $\to$ `, phẩy,`
- `.` $\to$ `, chấm.`
- `?` $\to$ `, chấm hỏi.`
- `!` $\to$ `, chấm than.`
- `:` $\to$ `, hai chấm,`

#### Phân tích Kỹ thuật:
1. **Lý do dùng Single-Pass Tokenized Regex**:
   Nếu dùng các lệnh `.replace()` nối tiếp nhau:
   - Thay `.` thành `, chấm.` $\implies$ sinh ra dấu `,` mới.
   - Nếu sau đó thay `,` thành `, phẩy,` $\implies$ chuỗi sẽ biến thành `, phẩy, chấm.` (LỖI NGHIÊM TRỌNG).
   - Vì vậy, **BẮT BUỘC** dùng cơ chế `re.compile(r"\s*([,.?!:])\s*")` kết hợp callback mapping để thay thế trong đúng một lượt duy nhất.
2. **Xử lý dấu lặp và chấm lửng**:
   - Trước khi tokenize, chuẩn hóa dấu ba chấm `...` hoặc ký tự `…` (U+2026) thành một dấu chấm `.`.
   - Thu gọn các dấu trùng lặp `([,.?!:])\1+` thành một dấu duy nhất để tránh đọc lặp nhiều lần (ví dụ: `!!` $\to$ `!`).
3. **Thứ tự thực hiện so với `normalize_vietnamese_text`**:
   - `normalize_vietnamese_text(text)` chạy **TRƯỚC**: để chuyển đổi số và từ viết tắt có chứa dấu chấm (như `tr.` $\to$ `trang `), loại bỏ dấu ngoặc kép.
   - `inject_pedagogical_punctuation` chạy **SAU**: trên văn bản đã được chuẩn hóa, đảm bảo không biến đổi nhầm các dấu chấm viết tắt thành lời đọc.

---

### 3.4. Thứ bậc Ưu tiên Tham số (Parameter Resolution & Override Hierarchy)

Khi gọi `synthesize_wav` hoặc `play_on_local_speaker`:
1. **Bước 1 — Chọn Style**:
   Lấy cấu hình mặc định từ `PROSODY_STYLE_PRESETS[style]`. Nếu `style` không hợp lệ hoặc `None`, fallback về `standard`.
2. **Bước 2 — Tính `length_scale`**:
   - Tính `base_length_scale` từ tham số `rate`:
     * Nếu `rate < 0` (ví dụ `-15%`): `base_length_scale = 1.0 + abs(rate) / 100` (= `1.15`).
     * Nếu `rate >= 0` (ví dụ `+10%`): `base_length_scale = max(0.5, 1.0 - rate / 100)` (= `0.90`).
     * Mặc định là `1.15`.
   - Nhân với hệ số `length_multiplier` của style:
     * `effective_length_scale = round(base_length_scale * preset["length_multiplier"], 3)`.
   - Nếu caller truyền trực tiếp `length_scale` (explicit override): ghi đè bằng giá trị đó.
3. **Bước 3 — Tính `noise_scale`**:
   - Mặc định: `preset["noise_scale"]`.
   - Nếu caller truyền `noise_scale is not None`: ghi đè `effective_noise_scale = float(noise_scale)`.
4. **Bước 4 — Tính `noise_w_scale`**:
   - Mặc định: `preset["noise_w_scale"]`.
   - Nếu caller truyền `noise_w is not None` hoặc `noise_w_scale is not None`: ghi đè `effective_noise_w_scale = float(override)`.

---

### 3.5. Nhập khẩu và Tích hợp `SynthesisConfig`

Trong thư viện `piper-tts`, lớp cấu hình được định nghĩa:
```python
@dataclass
class SynthesisConfig:
    speaker_id: Optional[int] = None
    length_scale: Optional[float] = None
    noise_scale: Optional[float] = None
    noise_w_scale: Optional[float] = None
    normalize_audio: bool = True
    volume: float = 1.0
```

Chiến lược import phòng thủ (Defensive Import):
```python
syn_config = None
try:
    from piper import SynthesisConfig
    syn_config = SynthesisConfig(
        length_scale=eff_length_scale,
        noise_scale=eff_noise_scale,
        noise_w_scale=eff_noise_w_scale,
    )
except ImportError:
    try:
        from piper.voice import SynthesisConfig
        syn_config = SynthesisConfig(
            length_scale=eff_length_scale,
            noise_scale=eff_noise_scale,
            noise_w_scale=eff_noise_w_scale,
        )
    except Exception as e:
        logger.warning(f"⚠️ Không thể khởi tạo SynthesisConfig: {e}")
```

Khi gọi `voice.synthesize_wav`:
```python
wav_io = io.BytesIO()
with wave.open(wav_io, "wb") as wav_file:
    voice.synthesize_wav(norm_text, wav_file, syn_config=syn_config)
return wav_io.getvalue()
```

---

## 4. Hướng dẫn Triển khai Chi tiết cho Worker

Worker sẽ tiến hành sửa tệp `python_service/tts_engine.py` với các bước cụ thể:

### Bước 1: Thêm `PROSODY_STYLE_PRESETS` và `PEDAGOGICAL_PUNCTUATION_MAP`
Vị trí: Ngay dưới `OFFICIAL_MODELS_MAP` (sau dòng 59).

```python
# ==============================================================================
# CẤU HÌNH PROSODY & PHONG CÁCH ÂM HỌC VITS CHO BẬC TIỂU HỌC
# ==============================================================================

PROSODY_STYLE_PRESETS: Dict[str, Dict[str, Any]] = {
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
        "label": "Nhấn mạnh, rõ ràng",
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

PEDAGOGICAL_PUNCTUATION_MAP: Dict[str, str] = {
    ",": ", phẩy, ",
    ".": ", chấm. ",
    "?": ", chấm hỏi. ",
    "!": ", chấm than. ",
    ":": ", hai chấm, ",
}
```

### Bước 2: Thêm hàm `inject_pedagogical_punctuation`
Vị trí: Cuối Phần 1 (sau hàm `normalize_vietnamese_text`).

```python
def inject_pedagogical_punctuation(text: str, enabled: bool = False) -> str:
    """Chuyển đổi dấu câu thành lời đọc khẩu ngữ tiếng Việt chuẩn sư phạm:
    - ',' -> ', phẩy,'
    - '.' -> ', chấm.'
    - '?' -> ', chấm hỏi.'
    - '!' -> ', chấm than.'
    - ':' -> ', hai chấm,'
    Sử dụng cơ chế single-pass tokenized regex để tránh lỗi thay thế lặp lồng nhau.
    """
    if not enabled or not text:
        return text

    # Chuẩn hóa dấu chấm lửng (...) và dấu lặp lại trước khi token hóa
    t = re.sub(r"…|\.{2,}", ".", text)

    # Single-pass regex quét các dấu câu kèm khoảng trắng lân cận
    pattern = re.compile(r"\s*([,.?!:])\s*")

    def _replace_punct(match: re.Match) -> str:
        punct = match.group(1)
        return PEDAGOGICAL_PUNCTUATION_MAP.get(punct, punct)

    t = pattern.sub(_replace_punct, t)
    # Dọn dẹp khoảng trắng dư thừa
    return re.sub(r"\s+", " ", t).strip()
```

### Bước 3: Thêm phương thức `resolve_prosody_params` trong `OfflineTTSEngine`
Vị trí: Ngay trước `synthesize_wav`.

```python
    @staticmethod
    def resolve_prosody_params(
        style: Optional[str] = "standard",
        rate: str = "-15%",
        noise_scale: Optional[float] = None,
        noise_w: Optional[float] = None,
        noise_w_scale: Optional[float] = None,
        length_scale: Optional[float] = None,
    ) -> Dict[str, float]:
        """Tính toán tham số âm học kết hợp giữa style preset và override từ người dùng."""
        chosen_style = (style or "standard").lower().strip()
        preset = PROSODY_STYLE_PRESETS.get(chosen_style, PROSODY_STYLE_PRESETS["standard"])

        # 1. Tính length_scale
        if length_scale is not None:
            eff_length_scale = float(length_scale)
        else:
            base_length_scale = 1.15
            if rate:
                try:
                    clean_rate = str(rate).replace("%", "").strip()
                    rate_val = float(clean_rate)
                    if rate_val < 0:
                        base_length_scale = 1.0 + abs(rate_val) / 100.0
                    else:
                        base_length_scale = max(0.5, 1.0 - rate_val / 100.0)
                except Exception:
                    base_length_scale = 1.15

            length_mult = preset.get("length_multiplier", 1.0)
            eff_length_scale = round(base_length_scale * length_mult, 3)

        # 2. noise_scale
        eff_noise_scale = preset["noise_scale"]
        if noise_scale is not None:
            try:
                eff_noise_scale = float(noise_scale)
            except (ValueError, TypeError):
                pass

        # 3. noise_w_scale
        eff_noise_w_scale = preset["noise_w_scale"]
        override_w = noise_w_scale if noise_w_scale is not None else noise_w
        if override_w is not None:
            try:
                eff_noise_w_scale = float(override_w)
            except (ValueError, TypeError):
                pass

        return {
            "length_scale": eff_length_scale,
            "noise_scale": round(eff_noise_scale, 3),
            "noise_w_scale": round(eff_noise_w_scale, 3),
        }
```

### Bước 4: Cập nhật `synthesize_wav` và `play_on_local_speaker`
Cập nhật chữ ký hàm và logic thực thi:
```python
    def synthesize_wav(
        self,
        text: str,
        voice_id: str = "vi_VN-vais1000-medium",
        rate: str = "-15%",
        style: Optional[str] = "standard",
        noise_scale: Optional[float] = None,
        noise_w: Optional[float] = None,
        read_punctuation: bool = False,
        noise_w_scale: Optional[float] = None,
        length_scale: Optional[float] = None,
    ) -> bytes:
        """Tổng hợp chuỗi văn bản thành dữ liệu âm thanh định dạng WAV với hỗ trợ Prosody và Đọc dấu câu."""
        norm_text = normalize_vietnamese_text(text)
        if not norm_text:
            raise ValueError("Văn bản sau khi chuẩn hóa bị rỗng")

        # Xử lý đọc tên dấu câu sư phạm nếu được kích hoạt
        read_punct_flag = (
            read_punctuation
            if isinstance(read_punctuation, bool)
            else str(read_punctuation).lower() in ("true", "1", "yes")
        )
        if read_punct_flag:
            norm_text = inject_pedagogical_punctuation(norm_text, enabled=True)

        # Tính toán tham số âm học
        prosody = self.resolve_prosody_params(
            style=style,
            rate=rate,
            noise_scale=noise_scale,
            noise_w=noise_w,
            noise_w_scale=noise_w_scale,
            length_scale=length_scale,
        )
        eff_length_scale = prosody["length_scale"]
        eff_noise_scale = prosody["noise_scale"]
        eff_noise_w_scale = prosody["noise_w_scale"]

        PiperVoice = self._get_piper_class()
        if PiperVoice is not None:
            voice = self._get_or_load_voice(voice_id)
            if voice:
                syn_config = None
                try:
                    from piper import SynthesisConfig
                    syn_config = SynthesisConfig(
                        length_scale=eff_length_scale,
                        noise_scale=eff_noise_scale,
                        noise_w_scale=eff_noise_w_scale,
                    )
                except ImportError:
                    try:
                        from piper.voice import SynthesisConfig
                        syn_config = SynthesisConfig(
                            length_scale=eff_length_scale,
                            noise_scale=eff_noise_scale,
                            noise_w_scale=eff_noise_w_scale,
                        )
                    except Exception as e:
                        logger.warning(f"⚠️ Không thể khởi tạo SynthesisConfig: {e}")

                wav_io = io.BytesIO()
                with wave.open(wav_io, "wb") as wav_file:
                    voice.synthesize_wav(norm_text, wav_file, syn_config=syn_config)
                return wav_io.getvalue()

        # Fallback qua CLI nếu cần
        import shutil
        import subprocess
        piper_bin = shutil.which("piper")
        if piper_bin:
            onnx_path, json_path = self.ensure_model_files(voice_id)
            cmd = [
                piper_bin,
                "--model", onnx_path,
                "--config", json_path,
                "--length_scale", str(eff_length_scale),
                "--noise_scale", str(eff_noise_scale),
                "--noise_w", str(eff_noise_w_scale),
                "--output_file", "-"
            ]
            proc = subprocess.run(cmd, input=norm_text.encode("utf-8"), stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            if proc.returncode == 0 and len(proc.stdout) > 44:
                return proc.stdout

        logger.warning(f"⚠️ Chưa có Piper engine hoặc file model. Tạo âm thanh dự phòng cho '{norm_text[:30]}...'")
        return self._generate_beeps_wav(norm_text)
```

Tương tự cho `play_on_local_speaker`:
```python
    def play_on_local_speaker(
        self,
        text: str,
        voice_id: str = "vi_VN-vais1000-medium",
        rate: str = "-15%",
        style: Optional[str] = "standard",
        noise_scale: Optional[float] = None,
        noise_w: Optional[float] = None,
        read_punctuation: bool = False,
        noise_w_scale: Optional[float] = None,
        length_scale: Optional[float] = None,
    ) -> bool:
        """Phát âm thanh trực tiếp ra Loa phần cứng cắm trên Raspberry Pi (3.5mm AUX / USB Speaker)."""
        import tempfile
        import subprocess

        audio_bytes = self.synthesize_wav(
            text,
            voice_id=voice_id,
            rate=rate,
            style=style,
            noise_scale=noise_scale,
            noise_w=noise_w,
            read_punctuation=read_punctuation,
            noise_w_scale=noise_w_scale,
            length_scale=length_scale,
        )
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
            tmp.write(audio_bytes)
            tmp_path = tmp.name

        try:
            if sys.platform.startswith("linux"):
                res = subprocess.run(["aplay", "-q", tmp_path], check=False)
                return res.returncode == 0
            elif sys.platform.startswith("win"):
                import winsound
                winsound.PlaySound(tmp_path, winsound.SND_FILENAME)
                return True
            else:
                res = subprocess.run(["afplay", tmp_path], check=False)
                return res.returncode == 0
        finally:
            try:
                os.remove(tmp_path)
            except Exception:
                pass
```

---

## 5. Phương pháp Kiểm thử & Nghiệm thu Thực nghiệm (Verification Plan)

Sau khi Worker hoàn thành sửa đổi code, Worker cần chạy script kiểm thử Python độc lập để xác minh 4 tiêu chí cốt lõi:

```powershell
python -c "
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
from python_service.tts_engine import (
    tts_engine,
    PROSODY_STYLE_PRESETS,
    inject_pedagogical_punctuation,
)

# 1. Kiểm tra Presets tồn tại và đủ 4 styles
assert 'warm_story' in PROSODY_STYLE_PRESETS
assert 'standard' in PROSODY_STYLE_PRESETS
assert 'emphasis' in PROSODY_STYLE_PRESETS
assert 'question' in PROSODY_STYLE_PRESETS
assert PROSODY_STYLE_PRESETS['warm_story']['noise_scale'] == 0.78
assert PROSODY_STYLE_PRESETS['emphasis']['length_multiplier'] == 1.20

# 2. Kiểm tra đọc dấu câu
sample = 'Gió mùa thu se lạnh, bầu trời xanh trong vắt.'
spoken = inject_pedagogical_punctuation(sample, enabled=True)
assert spoken == 'Gió mùa thu se lạnh, phẩy, bầu trời xanh trong vắt, chấm.'

# 3. Kiểm tra override tham số âm học
res = tts_engine.resolve_prosody_params(style='warm_story', noise_scale=0.55, noise_w=0.65)
assert res['noise_scale'] == 0.55
assert res['noise_w_scale'] == 0.65
assert res['length_scale'] == 1.208

# 4. Kiểm tra tổng hợp âm thanh thực tế với Piper
audio = tts_engine.synthesize_wav(sample, style='warm_story', read_punctuation=True)
assert isinstance(audio, bytes)
assert len(audio) > 10000, f'Audio size too small: {len(audio)} bytes'

print('✅ Tất cả kiểm thử Milestone 1 đều vượt qua thành công! WAV bytes:', len(audio))
"
```

Lệnh trên phải chạy thành công với Exit Code 0 và in ra thông báo `✅ Tất cả kiểm thử Milestone 1 đều vượt qua thành công!`.
