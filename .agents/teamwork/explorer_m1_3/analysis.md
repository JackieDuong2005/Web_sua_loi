# Báo cáo Phân tích Kỹ thuật Toàn diện: Động cơ Âm học Piper VITS & Đọc Dấu câu Sư phạm

**Agent**: Explorer 3 (`explorer_m1_3`)  
**Milestone**: Milestone 1 — Expressive Piper VITS Engine & Spoken Punctuation  
**Phạm vi**: `python_service/tts_engine.py` & Các điểm gọi trong `python_service/main.py`  
**Ngày lập**: 2026-10-18  

---

## 1. Tóm tắt Điều hành & Ranh giới Bài toán (Executive Summary)

Hệ thống chấm thi và đọc chính tả **ViHand Grade** vận hành trên nền tảng lai (Raspberry Pi 4 4GB RAM + Máy cục bộ giáo viên). Để giải quyết triệt để vấn đề giọng đọc Piper TTS VITS ban đầu bị đều đều (flat/robotic), thiếu cảm xúc và không đáp ứng được yêu cầu sư phạm tiểu học môn Tiếng Việt (Thông tư 27/2020/TT-BGDĐT), Milestone 1 nâng cấp động cơ âm học `python_service/tts_engine.py` với 3 năng lực cốt lõi:

1. **Bộ 4 Presets Âm học Diễn cảm (`PROSODY_STYLE_PRESETS`)**: `warm_story` (truyền cảm, ấm áp), `standard` (chuẩn mực), `emphasis` (dõng dạc, nhấn trọng âm từ khó), `question` (ngữ điệu câu hỏi).
2. **Khẩu ngữ Dấu câu Sư phạm Đơn tầng (`inject_pedagogical_punctuation`)**: Tự động chuyển đổi dấu câu `, . ? ! :` thành các khẩu lệnh đọc chính tả sư phạm (`, phẩy,`, `, chấm.`, v.v.) kèm khoảng lặng âm học chuẩn xác, bảo vệ số thập phân, mốc giờ, dấu chấm lửng và chống thay thế đệ quy.
3. **Cấu hình Động `SynthesisConfig` & Tương thích Ngược Tuyệt đối (100% Backward Compatibility)**: Mở rộng chữ ký của `synthesize_wav` và `play_on_local_speaker` với các giá trị mặc định (`style="standard"`, `noise_scale=None`, `noise_w=None`, `read_punctuation=False`), đảm bảo mọi caller hiện tại không bị ảnh hưởng.

```
+-------------------------------------------------------------------------------------------------+
|                         KIẾN TRÚC TỔNG HỢP ÂM HỌC DIỄN CẢM (M1)                                  |
+-------------------------------------------------------------------------------------------------+
|                                                                                                 |
|   Văn bản Tiếng Việt ──────> [1. normalize_vietnamese_text]                                      |
|                                    │                                                            |
|                                    ▼                                                            |
|                           Văn bản đã mở rộng viết tắt & số                                      |
|                                    │                                                            |
|                                    ▼ (Nếu read_punctuation=True)                                |
|                              [2. inject_pedagogical_punctuation]                                |
|                                    │                                                            |
|                                    ▼                                                            |
|   style, rate, overrides ──> [3. resolve_prosody_params]                                        |
|                                    │                                                            |
|                                    ▼                                                            |
|                              SynthesisConfig(length_scale, noise_scale, noise_w_scale)          |
|                                    │                                                            |
|                                    ▼                                                            |
|   vi_VN-vais1000-medium ───> [4. PiperVoice.synthesize_wav]                                     |
|                                    │                                                            |
|                    ┌───────────────┴───────────────┐                                            |
|                    ▼                               ▼                                            |
|          Luồng WAV Binary                 Phát Loa Cục bộ                                       |
|          (Return audio/wav)          (aplay Linux / winsound Windows)                           |
+-------------------------------------------------------------------------------------------------+
```

---

## 2. Đối soát Toàn diện Các Điểm Gọi (Callers Survey)

Qua việc quét toàn bộ codebase dự án, các điểm gọi của `synthesize_wav` và `play_on_local_speaker` được xác định chính xác như sau:

| Điểm gọi (Caller) | Vị trí (Tệp & Dòng) | Chữ ký / Tham số gọi hiện tại | Hành vi mong muốn sau M1/M2 |
|---|---|---|---|
| `OfflineTTSEngine.play_on_local_speaker` | `python_service/tts_engine.py:407` | `self.synthesize_wav(text, voice_id=voice_id, rate=rate)` | Chuyển tiếp đầy đủ `style`, `noise_scale`, `noise_w`, `read_punctuation` xuống `self.synthesize_wav`. |
| Endpoint `GET /tts` | `python_service/main.py:1758` | `tts_engine.synthesize_wav(text.strip(), voice_id=voice, rate=rate)` | Vẫn hoạt động hoàn hảo trong M1; sẵn sàng nhận thêm query params trong M2. |
| Endpoint `POST /tts/play-local` | `python_service/main.py:1799` | `tts_engine.play_on_local_speaker(req.text.strip(), voice_id=req.voice, rate=req.rate)` | Vẫn hoạt động hoàn hảo trong M1; sẵn sàng nhận thêm body fields trong M2. |

### Đảm bảo Tính Tương thích Ngược (Backward Compatibility Guarantee)

Nếu một caller chỉ truyền các tham số vị trí cũ hoặc tham số đặt tên cũ:
- `tts_engine.synthesize_wav("Chào em")`
- `tts_engine.synthesize_wav("Chào em", "vi_VN-vais1000-medium")`
- `tts_engine.synthesize_wav("Chào em", voice_id="vi_VN-vais1000-medium", rate="-15%")`
- `tts_engine.play_on_local_speaker("Chào em", voice_id="vi_VN-vais1000-medium", rate="-15%")`

Nhờ thiết kế:
```python
def synthesize_wav(
    self,
    text: str,
    voice_id: str = "vi_VN-vais1000-medium",
    rate: str = "-15%",
    style: str = "standard",
    noise_scale: Optional[float] = None,
    noise_w: Optional[float] = None,
    read_punctuation: bool = False,
    **kwargs,
) -> bytes:
```
Tất cả các lời gọi trên đều tiếp tục thực thi trơn tru mà không có bất kỳ ngoại lệ `TypeError: missing required argument` nào.

---

## 3. Phân giải Tham số Âm học & Bộ Presets (`PROSODY_STYLE_PRESETS`)

### 3.1. Đặc tả Kỹ thuật của 4 Presets Chuẩn Sư phạm

| Preset (`style`) | `noise_scale` | `noise_w_scale` | `length_multiplier` | Mục đích Sư phạm Tiểu học |
|---|---|---|---|---|
| `warm_story` | `0.78` | `0.90` | `1.05` | Đọc bài văn kể chuyện, thơ ca, lời nhận xét tổng kết của cô giáo. Ngữ điệu ấm áp, tự nhiên, nhịp vừa phải. |
| `standard` | `0.667` | `0.80` | `1.00` | Giọng chuẩn mặc định của mô hình VAIS1000, ổn định, cân bằng. |
| `emphasis` | `0.58` | `0.72` | `1.20` | Đọc luyện viết từ khó, chữa lỗi chính tả. Giảm độ biến thiên âm tố (firmer acoustic), nhịp chậm hơn 20% giúp học sinh nghe rõ từng nguyên âm, phụ âm và dấu thanh. |
| `question` | `0.82` | `0.92` | `1.08` | Đọc câu hỏi trắc nghiệm, câu hỏi tìm hiểu bài. Độ biến thiên âm tố cao tạo ngữ điệu nghi vấn cuối câu. |

### 3.2. Logic Phân giải Tham số (`resolve_prosody_params`)

Quy tắc ưu tiên (Priority Hierarchy):
1. **Giá trị Cơ sở (Preset Defaults)**: Luôn lấy từ `PROSODY_STYLE_PRESETS[style]`. Nếu `style` không tồn tại, fallback về `PROSODY_STYLE_PRESETS["standard"]`.
2. **Hệ số Độ dài (`length_scale`)**:
   - Tính từ chuỗi `rate` (ví dụ: `"-15%"` $\to$ `1.15`, `"-25%"` $\to$ `1.25`, `"+10%"` $\to$ `0.90`).
   - Nhân với `preset["length_multiplier"]`.
   - Giới hạn biên an toàn: `0.5 <= length_scale <= 3.0`.
3. **Độ biến thiên Âm tố (`noise_scale`)**:
   - Nếu caller truyền tường minh `noise_scale is not None`: ép kiểu `float(noise_scale)` ghi đè hoàn toàn.
   - Ngược lại: dùng `preset["noise_scale"]`.
4. **Độ biến thiên Thời lượng Âm tố (`noise_w_scale`)**:
   - Nếu caller truyền tường minh `noise_w is not None`: dùng `float(noise_w)`.
   - Hoặc nếu truyền `noise_w_scale is not None` trong `kwargs`: dùng `float(kwargs["noise_w_scale"])`.
   - Ngược lại: dùng `preset["noise_w_scale"]`.

---

## 4. Cơ chế Đọc Dấu câu Sư phạm (`inject_pedagogical_punctuation`)

### 4.1. Bảng Quy chuẩn Khẩu ngữ

```
+-------------+----------------------+--------------------+----------------------------------------+
| Ký hiệu gốc | Khẩu lệnh sư phạm    | Chuỗi thay thế     | Hành vi Ngắt nghỉ (Acoustic Pauses)    |
+-------------+----------------------+--------------------+----------------------------------------+
| ,           | Phẩy                 | , phẩy,            | Nghỉ trước ~150ms -> đọc -> nghỉ sau   |
| .           | Chấm                 | , chấm.            | Nghỉ trước ~150ms -> đọc -> ngắt câu   |
| ?           | Chấm hỏi             | , chấm hỏi.        | Nghỉ trước ~150ms -> đọc -> kết thúc ? |
| !           | Chấm than            | , chấm than.       | Nghỉ trước ~150ms -> đọc -> kết thúc ! |
| :           | Hai chấm             | , hai chấm,        | Nghỉ trước ~150ms -> đọc -> nghỉ sau : |
+-------------+----------------------+--------------------+----------------------------------------+
```

### 4.2. Kỹ thuật Single-Pass Regex Tokenizer Bảo vệ Góc khuất (Edge Cases)

Để ngăn chặn hiện tượng thay thế đệ quy khi văn bản được gọi nhiều lần (`f(f(x)) == f(x)` - Idempotence), và bảo vệ các trường hợp đặc thù trong văn bản tiểu học:
1. **Existing Cues**: Không thay thế các cụm `, phẩy,`, `, chấm.` đã tồn tại.
2. **Số thập phân & Mốc giờ**: Giữ nguyên `9.5`, `8,5`, `08:30`, `2:1`.
3. **Dấu ba chấm (Ellipsis)**: Giữ nguyên `...` hoặc `…` (không biến thành `, chấm., chấm., chấm.`).
4. **Từ viết tắt**: Giữ nguyên `TP.HCM`, `PGS.TS.`.
5. **Khoảng trắng ngang**: Sử dụng `[ \t]*` thay vì `\s*` để bảo toàn ký tự xuống dòng `\n` của các bài thơ và đoạn văn.

### 4.3. Thứ tự Tích hợp trong Pipeline

Bắt buộc chạy `normalize_vietnamese_text` trước `inject_pedagogical_punctuation`:
- `normalize_vietnamese_text` sẽ chuyển đổi các từ viết tắt như `tr. 15` thành `trang mười lăm` và chuyển số nguyên thành chữ.
- `inject_pedagogical_punctuation` sau đó chỉ xử lý các dấu câu ngắt câu thực sự mà không phá hỏng cấu trúc từ viết tắt.

---

## 5. Kiến trúc Phát Loa Cục bộ (`play_on_local_speaker`)

### 5.1. Vòng đời Tệp Âm thanh Tạm (Tempfile Lifecycle)

```
[synthesize_wav] ──> [tempfile.NamedTemporaryFile(suffix='.wav')]
                             │
                             ▼
                    [Ghi dữ liệu WAV & đóng handle tệp]
                             │
                             ▼
              ┌──────────────┴──────────────┐
              ▼                             ▼
     Linux / Raspberry Pi                Windows
   subprocess.run(["aplay", "-q"])   winsound.PlaySound(SND_FILENAME)
              │                             │
              └──────────────┬──────────────┘
                             ▼
               [finally: os.remove(tmp_path)]
```

### 5.2. Đánh giá Tính Đa nền tảng (Cross-Platform Evaluation)

- **Trên Raspberry Pi / Linux**:
  - Lệnh gọi: `aplay -q <tmp_path>`.
  - Phù hợp với cổng âm thanh 3.5mm AUX hoặc loa USB cắm trực tiếp trên Pi trong lớp học.
  - Xử lý lỗi: Bắt mã trả về `res.returncode == 0`. Nếu thiết bị âm thanh bận, không làm sập tiến trình máy chủ.
- **Trên Windows**:
  - Lệnh gọi: `winsound.PlaySound(tmp_path, winsound.SND_FILENAME)`.
  - `winsound` là module chuẩn có sẵn trong Python Windows, không cần cài đặt thêm thư viện ngoài (tuân thủ nghiêm ngặt GEMINI.md).
  - Hành vi đồng bộ (blocking) giúp hoàn tất câu đọc trước khi trả về HTTP 200, phù hợp với luồng đọc tuần tự từng câu của giáo viên.
- **Xóa tệp tạm**:
  - Khối `finally` đảm bảo tệp `.wav` tạm luôn được dọn dẹp sạch sẽ, không gây tràn bộ nhớ đĩa sau hàng ngàn lần phát.

---

## 6. Tổng hợp Đồng thuận & Hoàn thiện Ý kiến (Synthesis)

### 6.1. Đồng thuận (Consensus)
- Toàn bộ 3 Explorer (1, 2, 3) thống nhất cấu trúc 4 style presets (`warm_story`, `standard`, `emphasis`, `question`) và các thông số âm học chính xác.
- Thống nhất cơ chế đọc dấu câu với token âm học bao quanh `, [tên dấu][,.][cách]`.
- Thống nhất việc sử dụng `SynthesisConfig` từ thư viện `piper` nạp trực tiếp qua `voice.synthesize_wav(..., syn_config=syn_config)`.
- Thống nhất thứ tự xử lý: `normalize_vietnamese_text` chạy trước, `inject_pedagogical_punctuation` chạy sau.

### 6.2. Hoàn thiện Xung đột / Điểm làm rõ (Resolved Conflicts)
- **Tên tham số `noise_w` vs `noise_w_scale`**: Trong JSON REST API và giao diện Web dùng `noise_w`, trong khi `SynthesisConfig` của Piper dùng `noise_w_scale`. Giải pháp: Hàm tiếp nhận `noise_w: Optional[float] = None` đồng thời nhận `**kwargs` (hoặc `noise_w_scale: Optional[float] = None`), tự động chuẩn hóa sang `noise_w_scale` bên trong.
- **Khoảng trắng dòng thơ**: Explorer 2 đã chỉ ra nguy cơ của `\s*` nuốt ký tự `\n`. Giải pháp dùng `[ \t]*` đã được kiểm chứng và đưa vào chuẩn triển khai.
- **Bảo toàn tương thích ngược**: Explorer 3 xác định chữ ký mở rộng với giá trị mặc định cho toàn bộ tham số mới, giúp các điểm gọi tại `python_service/main.py:1758` và `1799` tiếp tục chạy hoàn hảo ngay cả trước khi Milestone 2 được kích hoạt.

### 6.3. Khoảng trống Đã bù đắp (Addressed Gaps)
- Bổ sung kiểm tra tính hợp lệ của Header tệp WAV (Channels=1, SampleRate=22050, BitDepth=16-bit PCM, Duration > 0).
- Đảm bảo xử lý ngoại lệ an toàn cho cả hai nhánh phát loa phần cứng (Linux và Windows).

---

## 7. Khuyến nghị Mã nguồn Chi tiết cho Worker M1

Worker M1 sẽ cập nhật tệp `python_service/tts_engine.py` theo bản thiết kế sau:

### 7.1. Định nghĩa Presets & Bản đồ Dấu câu (Đặt ở đầu tệp)

```python
# ==============================================================================
# BỘ THIẾT LẬP ÂM HỌC DIỄN CẢM & BẢN ĐỒ DẤU CÂU SƯ PHẠM (MILESTONE 1)
# ==============================================================================

PROSODY_STYLE_PRESETS: Dict[str, Dict[str, float]] = {
    "warm_story": {
        "noise_scale": 0.78,
        "noise_w_scale": 0.90,
        "length_multiplier": 1.05,
    },
    "standard": {
        "noise_scale": 0.667,
        "noise_w_scale": 0.80,
        "length_multiplier": 1.00,
    },
    "emphasis": {
        "noise_scale": 0.58,
        "noise_w_scale": 0.72,
        "length_multiplier": 1.20,
    },
    "question": {
        "noise_scale": 0.82,
        "noise_w_scale": 0.92,
        "length_multiplier": 1.08,
    },
}

_CUE_PATTERN = r'(?:,[ \t]*(?:phẩy|chấm(?:\s+(?:hỏi|than))?|hai\s+chấm)[ \t]*[,.])'
_DECIMAL_OR_TIME = r'\b\d+(?:[.,:]\d+)+\b'
_ELLIPSIS = r'\.{2,}|…'
_ABBREVIATION = r'\b[A-Za-zĐđĂăÂâÊêÔôƠơƯư]{1,4}\.(?=[A-Za-zĐđĂăÂâÊêÔôƠơƯư\d])'
_PUNCTUATION = r'[ \t]*([,.:?!]|，|。|：|？|！)[ \t]*'

_PEDAGOGICAL_COMBINED_REGEX = re.compile(
    rf'({_CUE_PATTERN})|({_DECIMAL_OR_TIME})|({_ELLIPSIS})|({_ABBREVIATION})|{_PUNCTUATION}'
)

PEDAGOGICAL_PUNCTUATION_MAP = {
    ",": ", phẩy, ",
    "，": ", phẩy, ",
    ".": ", chấm. ",
    "。": ", chấm. ",
    "?": ", chấm hỏi. ",
    "？": ", chấm hỏi. ",
    "!": ", chấm than. ",
    "！": ", chấm than. ",
    ":": ", hai chấm, ",
    "：": ", hai chấm, ",
}


def inject_pedagogical_punctuation(text: str, enabled: bool = False) -> str:
    """Chuyển đổi các dấu câu thành khẩu lệnh đọc chính tả tiếng Việt sư phạm.
    - Dấu phẩy (,) -> ', phẩy, '
    - Dấu chấm (.) -> ', chấm. '
    - Dấu chấm hỏi (?) -> ', chấm hỏi. '
    - Dấu chấm than (!) -> ', chấm than. '
    - Dấu hai chấm (:) -> ', hai chấm, '
    Bảo vệ số thập phân, mốc giờ, dấu ba chấm, từ viết tắt và ngăn ngừa thay thế đệ quy.
    """
    if not enabled or not text:
        return text

    # Rút gọn các chuỗi dấu lặp bất thường (!{2,}, ?{2,}, v.v.) ngoại trừ dấu chấm lửng
    t = re.sub(r'!{2,}', '!', text)
    t = re.sub(r'\?{2,}', '?', t)
    t = re.sub(r':{2,}', ':', t)
    t = re.sub(r',{2,}', ',', t)
    t = re.sub(r'(\?!|!\?)', '?', t)

    def _repl(m: re.Match) -> str:
        cue, dec_time, ell, abbr, punct = m.groups()
        if cue:
            return cue
        if dec_time:
            return dec_time
        if ell:
            return ell
        if abbr:
            return abbr
        return PEDAGOGICAL_PUNCTUATION_MAP.get(punct, m.group(0))

    res = _PEDAGOGICAL_COMBINED_REGEX.sub(_repl, t)

    lines = [re.sub(r'[ \t]+', ' ', line).strip() for line in res.split('\n')]
    return '\n'.join(lines).strip()
```

### 7.2. Phương thức Phân giải Tham số trong `OfflineTTSEngine`

```python
    @staticmethod
    def resolve_prosody_params(
        style: str = "standard",
        rate: str = "-15%",
        noise_scale: Optional[float] = None,
        noise_w: Optional[float] = None,
        **kwargs,
    ) -> Dict[str, float]:
        """Phân giải và hợp nhất tham số âm học từ style preset và các giá trị override."""
        preset = PROSODY_STYLE_PRESETS.get(style, PROSODY_STYLE_PRESETS["standard"])

        final_noise_scale = float(noise_scale) if noise_scale is not None else preset["noise_scale"]

        raw_noise_w = noise_w if noise_w is not None else kwargs.get("noise_w_scale")
        final_noise_w_scale = float(raw_noise_w) if raw_noise_w is not None else preset["noise_w_scale"]

        base_length = 1.15
        try:
            clean_rate = rate.replace("%", "").strip()
            rate_val = float(clean_rate)
            if rate_val < 0:
                base_length = 1.0 + abs(rate_val) / 100.0
            else:
                base_length = max(0.5, 1.0 - rate_val / 100.0)
        except Exception:
            base_length = 1.15

        final_length = round(base_length * preset.get("length_multiplier", 1.0), 4)
        final_length = max(0.5, min(3.0, final_length))

        return {
            "length_scale": final_length,
            "noise_scale": final_noise_scale,
            "noise_w_scale": final_noise_w_scale,
        }
```

### 7.3. Cập nhật `synthesize_wav`

```python
    def synthesize_wav(
        self,
        text: str,
        voice_id: str = "vi_VN-vais1000-medium",
        rate: str = "-15%",
        style: str = "standard",
        noise_scale: Optional[float] = None,
        noise_w: Optional[float] = None,
        read_punctuation: bool = False,
        **kwargs,
    ) -> bytes:
        """Tổng hợp chuỗi văn bản thành dữ liệu âm thanh định dạng WAV với thiết lập âm học diễn cảm."""
        norm_text = normalize_vietnamese_text(text)
        if read_punctuation:
            norm_text = inject_pedagogical_punctuation(norm_text, enabled=True)

        if not norm_text:
            raise ValueError("Văn bản sau khi chuẩn hóa bị rỗng")

        params = self.resolve_prosody_params(
            style=style,
            rate=rate,
            noise_scale=noise_scale,
            noise_w=noise_w,
            **kwargs,
        )

        PiperVoice = self._get_piper_class()
        if PiperVoice is not None:
            voice = self._get_or_load_voice(voice_id)
            if voice:
                syn_config = None
                try:
                    from piper import SynthesisConfig
                    syn_config = SynthesisConfig(
                        length_scale=params["length_scale"],
                        noise_scale=params["noise_scale"],
                        noise_w_scale=params["noise_w_scale"],
                    )
                except Exception as _e:
                    logger.warning(f"⚠️ Không thể tạo SynthesisConfig: {_e}")

                wav_io = io.BytesIO()
                with wave.open(wav_io, "wb") as wav_file:
                    voice.synthesize_wav(norm_text, wav_file, syn_config=syn_config)
                return wav_io.getvalue()

        # Fallback qua lệnh nhị phân piper CLI
        import shutil
        import subprocess
        piper_bin = shutil.which("piper")
        if piper_bin:
            onnx_path, json_path = self.ensure_model_files(voice_id)
            cmd = [
                piper_bin,
                "--model", onnx_path,
                "--config", json_path,
                "--length_scale", str(params["length_scale"]),
                "--noise_scale", str(params["noise_scale"]),
                "--noise_w", str(params["noise_w_scale"]),
                "--output_file", "-",
            ]
            proc = subprocess.run(cmd, input=norm_text.encode("utf-8"), stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            if proc.returncode == 0 and len(proc.stdout) > 44:
                return proc.stdout

        logger.warning(f"⚠️ Chưa có Piper engine hoặc file model. Tạo âm thanh dự phòng cho '{norm_text[:30]}...'")
        return self._generate_beeps_wav(norm_text)
```

### 7.4. Cập nhật `play_on_local_speaker`

```python
    def play_on_local_speaker(
        self,
        text: str,
        voice_id: str = "vi_VN-vais1000-medium",
        rate: str = "-15%",
        style: str = "standard",
        noise_scale: Optional[float] = None,
        noise_w: Optional[float] = None,
        read_punctuation: bool = False,
        **kwargs,
    ) -> bool:
        """Phát âm thanh trực tiếp ra Loa phần cứng cắm trên Raspberry Pi (3.5mm AUX / USB Speaker)."""
        import tempfile
        import subprocess

        audio_bytes = self.synthesize_wav(
            text=text,
            voice_id=voice_id,
            rate=rate,
            style=style,
            noise_scale=noise_scale,
            noise_w=noise_w,
            read_punctuation=read_punctuation,
            **kwargs,
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
        except Exception as e:
            logger.error(f"❌ Lỗi khi phát âm thanh ra loa cục bộ: {e}")
            return False
        finally:
            try:
                os.remove(tmp_path)
            except Exception:
                pass
```

---

## 8. Quy trình Kiểm thử Xác thực Toàn diện (Rigorous Verification Suite)

Worker và Reviewer sẽ chạy bộ kịch bản kiểm thử sau để xác nhận nghiệm thu Milestone 1:

```powershell
python -c "
import sys, io, wave
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
from python_service.tts_engine import (
    tts_engine,
    PROSODY_STYLE_PRESETS,
    inject_pedagogical_punctuation,
)

print('=== 1. KIỂM TRA PRESETS ===')
assert set(PROSODY_STYLE_PRESETS.keys()) == {'warm_story', 'standard', 'emphasis', 'question'}
assert PROSODY_STYLE_PRESETS['warm_story']['noise_scale'] == 0.78
assert PROSODY_STYLE_PRESETS['emphasis']['length_multiplier'] == 1.20
print('-> Presets: ĐẠT')

print('=== 2. KIỂM TRA ĐỌC DẤU CÂU (SPOKEN PUNCTUATION) ===')
sample = 'Gió mùa thu se lạnh, bầu trời xanh trong vắt.'
spoken = inject_pedagogical_punctuation(sample, enabled=True)
assert spoken == 'Gió mùa thu se lạnh, phẩy, bầu trời xanh trong vắt, chấm.'

# Kiểm tra tính lũy đẳng (Idempotent)
assert inject_pedagogical_punctuation(spoken, enabled=True) == spoken

# Kiểm tra bảo vệ số thập phân
dec_sample = 'Đạt 9.5 điểm và 8,5 điểm.'
dec_spoken = inject_pedagogical_punctuation(dec_sample, enabled=True)
assert '9.5' in dec_spoken and '8,5' in dec_spoken
print('-> Punctuation injection & Idempotence: ĐẠT')

print('=== 3. KIỂM TRA TƯƠNG THÍCH NGƯỢC (BACKWARD COMPATIBILITY) ===')
wav_legacy = tts_engine.synthesize_wav('Kiểm tra tương thích ngược.')
assert isinstance(wav_legacy, bytes) and len(wav_legacy) > 10000
print(f'-> Legacy call: ĐẠT ({len(wav_legacy)} bytes)')

print('=== 4. KIỂM TRA TỔNG HỢP ÂM HỌC DIỄN CẢM & DẤU CÂU ===')
wav_expressive = tts_engine.synthesize_wav(
    sample,
    style='warm_story',
    read_punctuation=True
)
assert isinstance(wav_expressive, bytes) and len(wav_expressive) > 10000

# Thẩm tra định dạng WAV chuẩn
with wave.open(io.BytesIO(wav_expressive), 'rb') as wf:
    assert wf.getnchannels() == 1, 'Kênh âm thanh phải là Mono (1)'
    assert wf.getsampwidth() == 2, 'Mã hóa phải là 16-bit PCM (2 bytes)'
    assert wf.getframerate() == 22050, 'Sample rate phải là 22050 Hz'
    assert wf.getnframes() > 10000, 'Số frame âm thanh không hợp lệ'
    duration = wf.getnframes() / wf.getframerate()

print(f'-> Expressive WAV: ĐẠT ({len(wav_expressive)} bytes, {duration:.2f}s)')
print('🎉 TẤT CẢ 4 HẠNG MỤC KIỂM THỬ XÁC THỰC M1 ĐÃ VƯỢT QUA 100%!')
"
```
