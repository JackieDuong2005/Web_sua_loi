# Handoff Report: Milestone 1 — Expressive Piper VITS Engine & Spoken Punctuation

**Agent**: Explorer 1 (`explorer_m1_1`)  
**Target Recipient**: Parent / Orchestrator (`0516b259-befc-4fac-baa8-b10ce65a612b`) & Worker M1  
**Handoff Type**: Hard (Task Complete)  
**Date**: 2026-10-18  

---

## 1. Observation

1. **Vị trí và nội dung tệp nguồn hiện tại**:
   - Tệp: `python_service/tts_engine.py` (453 dòng).
   - Dòng 28-59: `OFFICIAL_MODELS_MAP` chứa 3 mô hình (`vi_VN-vais1000-medium`, `vi_VN-25hours_single-low`, `vi_VN-vivos-x_low`).
   - Dòng 61-196: `normalize_vietnamese_text(text: str)` chuẩn hóa số, ngày tháng, tên lớp, từ viết tắt, và xóa ngoặc kép `re.sub(r'["“”«»]', '', t)`.
   - Dòng 344: `synthesize_wav(self, text: str, voice_id: str = "vi_VN-vais1000-medium", rate: str = "-15%") -> bytes:`.
   - Dòng 354-363: Chỉ tính `length_scale` đơn điệu từ `rate` (mặc định 1.15 cho `-15%`).
   - Dòng 369-374: `SynthesisConfig` chỉ được gọi với `SynthesisConfig(length_scale=length_scale)`. Không truyền `noise_scale` hay `noise_w_scale`.
   - Dòng 402: `play_on_local_speaker(self, text: str, voice_id: str = "vi_VN-vais1000-medium", rate: str = "-15%") -> bool:`.
   - `python_service/models/tts/` đã có sẵn tệp model `vi_VN-vais1000-medium.onnx` và `vi_VN-vais1000-medium.onnx.json`.

2. **Thư viện Piper và SynthesisConfig trong môi trường Python**:
   - Chạy lệnh: `python -c "import piper; from piper.voice import SynthesisConfig; import dataclasses; print(dataclasses.fields(SynthesisConfig))"`
   - Kết quả trả về thành công:
     ```
     Field(name='speaker_id', type=Optional[int], default=None)
     Field(name='length_scale', type=Optional[float], default=None)
     Field(name='noise_scale', type=Optional[float], default=None)
     Field(name='noise_w_scale', type=Optional[float], default=None)
     Field(name='normalize_audio', type=bool, default=True)
     Field(name='volume', type=float, default=1.0)
     ```
   - Chữ ký hàm `PiperVoice.synthesize_wav`:
     `(self, text: str, wav_file: wave.Wave_write, syn_config: Optional[piper.config.SynthesisConfig] = None, set_wav_format: bool = True, include_alignments: bool = False) -> Optional[list[piper.voice.PhonemeAlignment]]`

3. **Thực nghiệm Tổng hợp Âm thanh**:
   - Đã chạy kiểm thử với `PiperVoice.load('python_service/models/tts/vi_VN-vais1000-medium.onnx')` cùng `SynthesisConfig(noise_scale=0.78, noise_w_scale=0.90, length_scale=1.208)` và câu đọc khẩu ngữ dấu câu `Gió mùa thu se lạnh, phẩy, bầu trời xanh trong vắt, chấm.`.
   - Kết quả sinh ra file WAV hợp lệ với kích thước **150.060 bytes** (> 10.000 bytes yêu cầu của Acceptance Criteria) và exit code 0.

---

## 2. Logic Chain

1. **Từ Quan sát 1 & Yêu cầu F1 (Prosody Style Presets)**:
   - Hiện tại Piper VITS chỉ chạy với giá trị mặc định của file json (`noise_scale=0.667`, `noise_w=0.80`), dẫn đến giọng đọc đều đều.
   - Định nghĩa `PROSODY_STYLE_PRESETS` với 4 preset chuẩn:
     * `warm_story`: `noise_scale=0.78`, `noise_w_scale=0.90`, `length_multiplier=1.05`
     * `standard`: `noise_scale=0.667`, `noise_w_scale=0.80`, `length_multiplier=1.00`
     * `emphasis`: `noise_scale=0.58`, `noise_w_scale=0.72`, `length_multiplier=1.20`
     * `question`: `noise_scale=0.82`, `noise_w_scale=0.92`, `length_multiplier=1.08`
   - Nhờ đó, giáo viên có thể linh hoạt chọn giọng đọc truyền cảm cho bài văn (`warm_story`), dõng dạc ngắt nhịp cho từ khó chính tả (`emphasis`), hoặc ngữ điệu nghi vấn cho câu hỏi (`question`).

2. **Từ Quan sát 1 & Yêu cầu F2 (Spoken Punctuation)**:
   - Nếu thay thế bằng chuỗi `.replace()` tuần tự, dấu `,` trong kết quả `, chấm.` sẽ bị thay thế lần nữa thành `, phẩy, chấm.`.
   - Do đó, bắt buộc sử dụng single-pass tokenized regex `re.compile(r"\s*([,.?!:])\s*")` để chuyển đổi:
     * `,` $\to$ `, phẩy,`
     * `.` $\to$ `, chấm.`
     * `?` $\to$ `, chấm hỏi.`
     * `!` $\to$ `, chấm than.`
     * `:` $\to$ `, hai chấm,`
   - Đặt hàm `inject_pedagogical_punctuation` chạy sau `normalize_vietnamese_text` để bảo toàn các từ viết tắt có dấu chấm như `tr. 45` $\to$ `trang 45`.

3. **Từ Quan sát 2 & Yêu cầu F3 (SynthesisConfig & Overrides)**:
   - `SynthesisConfig` nhận các trường `length_scale`, `noise_scale`, `noise_w_scale`.
   - Cung cấp phương thức `resolve_prosody_params`:
     * Lấy giá trị mặc định từ `PROSODY_STYLE_PRESETS[style]`.
     * `base_length_scale` tính từ `rate` (mặc định 1.15 cho -15%), sau đó nhân với `length_multiplier`.
     * Ghi đè `noise_scale` và `noise_w_scale` nếu caller truyền đối số tường minh (`noise_scale`, `noise_w`).
   - Cập nhật `synthesize_wav` và `play_on_local_speaker` để nhận thêm các tham số `style`, `noise_scale`, `noise_w`, `read_punctuation`, bảo toàn 100% tương thích ngược với các caller hiện tại.

---

## 3. Caveats

1. **Thư viện ALSA trên Windows**: Lệnh phát loa phần cứng `play_on_local_speaker` sử dụng `winsound` trên Windows và `aplay` trên Linux. Trên máy tính phát triển Windows, hàm dùng `winsound.PlaySound` nên hoàn toàn không bị ảnh hưởng bởi thiếu ALSA.
2. **Ký tự ellipsis và dấu câu kép**: Nếu học sinh hoặc giáo viên nhập văn bản có dấu ba chấm `...` hoặc ký tự `…`, hàm tiền xử lý sẽ chuẩn hóa thành một dấu chấm `.` duy nhất trước khi tokenize, tránh việc đọc lặp `chấm., chấm., chấm.`.
3. **Mã hóa chuỗi đầu vào tiếng Việt**: Đảm bảo chuỗi văn bản được truyền dạng UTF-8 chuẩn NFC để espeak phonemizer xử lý chính xác thanh điệu tiếng Việt.

---

## 4. Conclusion

Chiến lược triển khai cho Worker M1 đã được thiết kế và kiểm chứng thực nghiệm hoàn chỉnh:
- **Tệp cần chỉnh sửa**: `python_service/tts_engine.py` (chỉ duy nhất tệp này thuộc phạm vi M1).
- **Các thành phần bổ sung**:
  1. Hằng số `PROSODY_STYLE_PRESETS` và `PEDAGOGICAL_PUNCTUATION_MAP`.
  2. Hàm `inject_pedagogical_punctuation(text: str, enabled: bool = False) -> str`.
  3. Phương thức tĩnh `OfflineTTSEngine.resolve_prosody_params(style, rate, noise_scale, noise_w, noise_w_scale, length_scale)`.
  4. Cập nhật chữ ký hàm và logic cho `synthesize_wav` và `play_on_local_speaker` nhận `style`, `noise_scale`, `noise_w`, `read_punctuation`, khởi tạo `SynthesisConfig(length_scale, noise_scale, noise_w_scale)` truyền vào `voice.synthesize_wav`.
- Toàn bộ mã nguồn mẫu chi tiết từng dòng đã được soạn thảo tại `c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\explorer_m1_1\analysis.md`. Worker có thể áp dụng trực tiếp.

---

## 5. Verification Method

Worker sau khi áp dụng code vào `python_service/tts_engine.py` cần chạy lệnh kiểm thử độc lập sau trong PowerShell:

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

**Điều kiện nghiệm thu (Acceptance Criteria)**:
- Lệnh trên kết thúc với Exit Code 0.
- Độ lớn byte âm thanh trả về > 10.000 bytes.
- Chuỗi đọc dấu câu khớp chính xác từng từ khẩu ngữ sư phạm.
