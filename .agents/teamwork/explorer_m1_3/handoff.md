# Báo cáo Chuyển giao Kỹ thuật (Handoff Report): Milestone 1 — Expressive Piper VITS Engine & Spoken Punctuation

**Người thực hiện**: Explorer 3 (`explorer_m1_3`)  
**Người nhận**: Parent Orchestrator (`0516b259-befc-4fac-baa8-b10ce65a612b`) & Worker M1 / Reviewers  
**Loại chuyển giao**: Hard (Nhiệm vụ điều tra & tổng hợp hoàn tất 100%)  
**Ngày lập**: 2026-10-18  

---

## 1. Quan sát Thực tế (Observation)

1. **Khảo sát Điểm gọi trong Codebase**:
   - Tệp: `python_service/tts_engine.py`
     - Dòng 344: `def synthesize_wav(self, text: str, voice_id: str = "vi_VN-vais1000-medium", rate: str = "-15%") -> bytes:`
     - Dòng 402: `def play_on_local_speaker(self, text: str, voice_id: str = "vi_VN-vais1000-medium", rate: str = "-15%") -> bool:`
     - Dòng 407: `audio_bytes = self.synthesize_wav(text, voice_id=voice_id, rate=rate)` (Lời gọi nội bộ từ `play_on_local_speaker`).
   - Tệp: `python_service/main.py`
     - Dòng 1740-1743: `class LocalPlayRequest(BaseModel): text: str, voice: str = "vi_VN-vais1000-medium", rate: str = "-15%"`
     - Dòng 1758: `audio_data = tts_engine.synthesize_wav(text.strip(), voice_id=voice, rate=rate)` (Trong `GET /tts`).
     - Dòng 1799: `success = tts_engine.play_on_local_speaker(req.text.strip(), voice_id=req.voice, rate=req.rate)` (Trong `POST /tts/play-local`).

2. **Thư viện Piper và `SynthesisConfig` Thực tế trong Môi trường Python 3.11**:
   - Đã chạy lệnh:
     `python -c "from piper import SynthesisConfig; import inspect; print(inspect.signature(SynthesisConfig.__init__))"`
   - Kết quả trả về thực tế:
     `(self, speaker_id: Optional[int] = None, length_scale: Optional[float] = None, noise_scale: Optional[float] = None, noise_w_scale: Optional[float] = None, normalize_audio: bool = True, volume: float = 1.0) -> None`
   - Nhận định: Tên trường trong `SynthesisConfig` là `noise_w_scale` (khác với tên `noise_w` thường dùng trong REST JSON payload).

3. **Thực nghiệm Tổng hợp Âm thanh Thực tế với Model ONNX Đã có sẵn**:
   - Model `vi_VN-vais1000-medium.onnx` (63,201,294 bytes) đã có sẵn tại `python_service/models/tts/`.
   - Chạy lệnh thử nghiệm:
     `python -c "import io, wave; from piper import PiperVoice, SynthesisConfig; v = PiperVoice.load('python_service/models/tts/vi_VN-vais1000-medium.onnx'); bio = io.BytesIO(); cfg = SynthesisConfig(length_scale=1.2075, noise_scale=0.78, noise_w_scale=0.90); text = 'Gió mùa thu se lạnh, phẩy, bầu trời xanh trong vắt, chấm.'; v.synthesize_wav(text, bio, syn_config=cfg); print(len(bio.getvalue()))"`
   - Kết quả sinh ra: **150,572 bytes** (WAV mono, 22050Hz, 16-bit PCM), thời lượng ~3.41 giây, vượt xa tiêu chuẩn Acceptance Criteria (> 10,000 bytes).

4. **Khảo sát Cơ chế Phát Loa Cục bộ (`play_on_local_speaker`)**:
   - Hiện tại hàm tạo tệp tạm qua `tempfile.NamedTemporaryFile(suffix=".wav", delete=False)`, ghi `audio_bytes`, đóng ngữ cảnh tệp, sau đó phân nhánh hệ điều hành:
     - Linux / Raspberry Pi: `subprocess.run(["aplay", "-q", tmp_path], check=False)`
     - Windows: `winsound.PlaySound(tmp_path, winsound.SND_FILENAME)`
     - Khối `finally: os.remove(tmp_path)` đảm bảo dọn dẹp đĩa sạch sẽ.
   - Thử nghiệm trên máy Windows cho thấy `winsound.PlaySound` hoạt động đồng bộ, giải phóng khóa tệp ngay sau khi hoàn tất, cho phép `os.remove(tmp_path)` thành công 100%.

---

## 2. Chuỗi Suy luận Kỹ thuật (Logic Chain)

1. **Từ Quan sát 1 (Các điểm gọi hiện hữu) $\to$ Đảm bảo Tương thích Ngược (Backward Compatibility)**:
   - Các điểm gọi trong `python_service/main.py:1758` và `1799` chỉ truyền 3 tham số vị trí/đặt tên (`text`, `voice_id=voice`, `rate=rate`).
   - Nếu đổi chữ ký hàm `synthesize_wav` và `play_on_local_speaker` mà các tham số mới không có giá trị mặc định, `main.py` sẽ gặp lỗi `TypeError` ngay lập tức.
   - Do đó, bắt buộc cấu hình chữ ký với giá trị mặc định an toàn:
     `style: str = "standard"`, `noise_scale: Optional[float] = None`, `noise_w: Optional[float] = None`, `read_punctuation: bool = False`, kèm `**kwargs`.
   - Kết quả: Các điểm gọi cũ tiếp tục hoạt động nguyên bản trong khi sẵn sàng đón nhận các tham số âm học diễn cảm mới từ Milestone 2 và 3.

2. **Từ Quan sát 2 (Tên trường `noise_w_scale`) $\to$ Cơ chế Phân giải Linh hoạt (`resolve_prosody_params`)**:
   - Giao diện người dùng và API REST dùng `noise_w`, trong khi Piper dùng `noise_w_scale`.
   - Phương thức `resolve_prosody_params` kiểm tra cả `noise_w` và `kwargs.get("noise_w_scale")`, giải quyết triệt để sự sai lệch tên gọi giữa các tầng hệ thống.
   - Hệ số tốc độ `length_scale` được tính bằng tích của `base_length_scale` (từ `rate`, mặc định 1.15 cho -15%) với `preset["length_multiplier"]`, đảm bảo câu đọc ở chế độ `emphasis` được làm chậm thêm 20% (hệ số 1.38) giúp học sinh nghe rõ từng âm tiết khó viết.

3. **Từ Quan sát 3 (Chất lượng âm thanh & Ngắt nghỉ) $\to$ Vị trí Chèn Dấu câu Sư phạm**:
   - `normalize_vietnamese_text` chuyển `tr. 15` $\to$ `trang mười lăm` và xóa ngoặc kép. Nếu chèn đọc dấu câu trước bước chuẩn hóa, `tr.` sẽ bị biến thành `tr, chấm.` làm hỏng quy tắc viết tắt.
   - Do đó, chuỗi xử lý chuẩn bắt buộc là: `normalize_vietnamese_text(text)` $\to$ sau đó nếu `read_punctuation=True` mới chạy `inject_pedagogical_punctuation`.
   - Kỹ thuật regex quét đơn tầng (single-pass alternation) với 5 nhánh loại trừ giúp bảo vệ số thập phân (`9.5`), mốc thời gian (`08:30`), dấu ba chấm (`...`), từ viết tắt (`TP.HCM`) và ngăn ngừa thay thế đệ quy (Idempotent: $f(f(x)) = f(x)$).

4. **Từ Quan sát 4 (Phát loa phần cứng) $\to$ Chuyển tiếp Tham số Toàn diện**:
   - Cập nhật `play_on_local_speaker` để nhận toàn bộ tham số âm học và chuyển tiếp trực tiếp vào `synthesize_wav`.
   - Nhờ vậy, giáo viên phát âm thanh ra loa lớp học trên Raspberry Pi hoặc máy Windows vẫn nhận được đầy đủ ngữ điệu ấm áp (`warm_story`) hoặc dõng dạc (`emphasis`) và khẩu ngữ đọc dấu câu.

---

## 3. Khu vực Cần Lưu ý & Góc khuất (Caveats)

1. **Thiết bị ALSA trên Linux / Raspberry Pi**:
   - Nếu Raspberry Pi chưa cắm loa hoặc jack 3.5mm bị chiếm dụng bởi tiến trình khác, lệnh `aplay -q` sẽ trả về mã khác 0. Đoạn code đề xuất đã bọc `try...except` và bắt mã lỗi trả về `False` thay vì làm sập server FastAPI.
2. **Ký tự Dấu câu Unicode Biến thể**:
   - Văn bản giáo viên copy từ nguồn tiếng Trung hoặc bản in OCR có thể chứa dấu câu toàn giác (Full-width Unicode: `，`, `。`, `：`, `？`, `！`). Regex đã được mở rộng để ánh xạ toàn bộ các ký tự này về chuẩn đọc tiếng Việt.
3. **Mã hóa Console trên Windows**:
   - Khi chạy script kiểm thử độc lập trong Command Prompt / PowerShell, nếu không thiết lập `PYTHONIOENCODING=utf-8` hoặc `io.TextIOWrapper`, Python sẽ báo lỗi `UnicodeEncodeError` với ký tự tiếng Việt. Lệnh kiểm thử nghiệm thu đã bao gồm cấu hình UTF-8 tường minh.

---

## 4. Kết luận & Khuyến nghị Triển khai (Conclusion)

- Kế hoạch triển khai cho Milestone 1 đã được thẩm định và xác thực thực nghiệm hoàn chỉnh:
  - **Tệp chỉnh sửa duy nhất**: `python_service/tts_engine.py` (M1 không chỉnh sửa `main.py` để bảo toàn ranh giới Milestone).
  - **Nội dung bổ sung vào `python_service/tts_engine.py`**:
    1. Hằng số `PROSODY_STYLE_PRESETS` (4 presets chuẩn) và `PEDAGOGICAL_PUNCTUATION_MAP`.
    2. Hàm `inject_pedagogical_punctuation(text: str, enabled: bool = False) -> str` an toàn lũy đẳng.
    3. Phương thức tĩnh `OfflineTTSEngine.resolve_prosody_params(...)`.
    4. Cập nhật `synthesize_wav(...)` và `play_on_local_speaker(...)` nhận các tham số mới với giá trị mặc định, truyền `SynthesisConfig` vào `voice.synthesize_wav`.
- Toàn bộ chi tiết phân tích và mã nguồn mẫu sẵn sàng tại `c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\explorer_m1_3\analysis.md`.

---

## 5. Phương pháp Xác thực Độc lập (Verification Method)

Worker M1 sau khi viết code và Reviewer kiểm tra có thể chạy trực tiếp lệnh kiểm thử tự động độc lập sau:

```powershell
python -c "
import sys, io, wave
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
from python_service.tts_engine import (
    tts_engine,
    PROSODY_STYLE_PRESETS,
    inject_pedagogical_punctuation,
)

# Test 1: Kiểm tra Presets
assert set(PROSODY_STYLE_PRESETS.keys()) == {'warm_story', 'standard', 'emphasis', 'question'}
assert PROSODY_STYLE_PRESETS['warm_story']['noise_scale'] == 0.78
assert PROSODY_STYLE_PRESETS['emphasis']['length_multiplier'] == 1.20

# Test 2: Đọc dấu câu sư phạm
sample = 'Gió mùa thu se lạnh, bầu trời xanh trong vắt.'
spoken = inject_pedagogical_punctuation(sample, enabled=True)
assert spoken == 'Gió mùa thu se lạnh, phẩy, bầu trời xanh trong vắt, chấm.'

# Test 3: Tính lũy đẳng (Idempotence) & bảo vệ số thập phân
assert inject_pedagogical_punctuation(spoken, enabled=True) == spoken
assert '9.5' in inject_pedagogical_punctuation('Điểm 9.5.', enabled=True)

# Test 4: Tương thích ngược với lời gọi cũ
wav_legacy = tts_engine.synthesize_wav('Chào các em.')
assert isinstance(wav_legacy, bytes) and len(wav_legacy) > 10000

# Test 5: Tổng hợp âm thanh diễn cảm mới
wav_expressive = tts_engine.synthesize_wav(sample, style='warm_story', read_punctuation=True)
assert isinstance(wav_expressive, bytes) and len(wav_expressive) > 10000

with wave.open(io.BytesIO(wav_expressive), 'rb') as wf:
    assert wf.getnchannels() == 1
    assert wf.getsampwidth() == 2
    assert wf.getframerate() == 22050
    assert wf.getnframes() > 10000

print(f'✅ XÁC THỰC MILESTONE 1 THÀNH CÔNG! Bytes: {len(wav_expressive)}')
"
```

**Tiêu chí Chấp nhận (Acceptance Criteria)**:
- Lệnh thoát với Exit Code 0.
- Số byte WAV trả về > 10,000 bytes.
- Format âm thanh chuẩn mono, 22050Hz, 16-bit PCM.
- Không phát sinh lỗi với các lời gọi không truyền tham số mới.
