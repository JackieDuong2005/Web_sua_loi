# Nghiên cứu Chuyên sâu & Giải pháp Kỹ thuật: Khắc phục Lỗi `wave.Error: # channels not specified` trong `synthesize_wav`
## Mã định danh Sự cố: Issue 3 (Milestone 1 Remediation - Iteration 2)
- **Tác giả**: Explorer 2 (`explorer_m1_it2_2`)
- **Đối tượng thụ hưởng**: Worker Milestone 1 & Orchestrator
- **Tập tin mục tiêu**: `python_service/tts_engine.py`
- **Bộ kiểm thử liên quan**: `tests/test_adversarial_punctuation.py` (Category 6: Piper VITS Audio Generation)
- **Quy chuẩn hiển thị**: Tuân thủ nghiêm ngặt `GEMINI.md` — 100% không dùng Mermaid, minh họa bằng ASCII Box Drawing và Markdown Tables.

---

## 1. Tóm tắt Bản chất Sự cố (Executive Summary)

Trong Milestone 1, Challenger 2 đã phát hiện 9 ca kiểm thử văng ngoại lệ nghiêm trọng làm sập luồng tổng hợp âm thanh (`CRASH/EXCEPTION: wave.Error: # channels not specified`) khi gọi `synthesize_wav` với các chuỗi chỉ chứa dấu câu hoặc dấu ba chấm (ví dụ: `"..."`, `"...."` hoặc bất kỳ dấu câu nào khi `read_punctuation=False`).

### Bảng Ma trận 9 Ca Kiểm thử bị Sập (Crash Matrix)

| STT | Chuỗi Đầu vào (`text`) | Cờ `read_punctuation` | Hành vi Phonemizer Piper VITS | Kết quả Hiện tại | Kết quả Mong đợi |
|:---:|:---|:---:|:---|:---|:---|
| 1 | `",,,"` | `False` | 0 âm vị (0 frame âm thanh) | `wave.Error: # channels not specified` | WAV hợp lệ > 44 bytes |
| 2 | `"...."` | `True` | 0 âm vị (giữ nguyên ellipsis) | `wave.Error: # channels not specified` | WAV hợp lệ > 44 bytes |
| 3 | `"...."` | `False` | 0 âm vị (0 frame âm thanh) | `wave.Error: # channels not specified` | WAV hợp lệ > 44 bytes |
| 4 | `"..."` | `True` | 0 âm vị (giữ nguyên ellipsis) | `wave.Error: # channels not specified` | WAV hợp lệ > 44 bytes |
| 5 | `"..."` | `False` | 0 âm vị (0 frame âm thanh) | `wave.Error: # channels not specified` | WAV hợp lệ > 44 bytes |
| 6 | `"?!?!"` | `False` | 0 âm vị (0 frame âm thanh) | `wave.Error: # channels not specified` | WAV hợp lệ > 44 bytes |
| 7 | `": : :"` | `False` | 0 âm vị (0 frame âm thanh) | `wave.Error: # channels not specified` | WAV hợp lệ > 44 bytes |
| 8 | `"   ...   "` | `True` | 0 âm vị (giữ nguyên ellipsis) | `wave.Error: # channels not specified` | WAV hợp lệ > 44 bytes |
| 9 | `"   ...   "` | `False` | 0 âm vị (0 frame âm thanh) | `wave.Error: # channels not specified` | WAV hợp lệ > 44 bytes |

---

## 2. Giải phẫu Cơ chế Lỗi Kỹ thuật (Technical Root Cause Analysis)

### 2.1. Mã nguồn Hiện tại trong `python_service/tts_engine.py` (Dòng 569 - 572)

```python
wav_io = io.BytesIO()
with wave.open(wav_io, "wb") as wav_file:
    voice.synthesize_wav(norm_text, wav_file, syn_config=syn_config)
return wav_io.getvalue()
```

### 2.2. Cơ chế Hoạt động Bên trong Thư viện Chuẩn `wave.py` của Python

Trong thư viện chuẩn `Lib/wave.py`:
1. Khi gọi `wave.open(wav_io, "wb")`, một đối tượng `Wave_write` được khởi tạo với các thuộc tính mặc định:
   ```python
   self._nchannels = 0
   self._sampwidth = 0
   self._framerate = 0
   self._headerwritten = False
   ```
2. Khi `voice.synthesize_wav(norm_text, wav_file, ...)` được gọi:
   - Piper gọi hàm `phonemize(norm_text)`.
   - Với văn bản thông thường (ví dụ: `"Chào em"`), Piper nhận được danh sách âm vị IPA, chạy mô hình ONNX VITS, và gọi `wav_file.setnchannels(1)`, `wav_file.setsampwidth(2)`, `wav_file.setframerate(22050)`, rồi gọi `wav_file.writeframes(samples)`.
   - **Tuy nhiên**, khi `norm_text` chỉ gồm dấu câu chưa đọc (như `...`, `,`, `:`, `?` khi `read_punctuation=False`), phonemizer của Piper trả về danh sách rỗng (`phonemes=[]`). Piper **hoàn toàn không sinh ra khung âm thanh nào** và **không bao giờ gọi bất kỳ phương thức nào của `wav_file`**.
3. Khi thoát khỏi khối ngữ cảnh `with wave.open(...)`:
   - Hàm `wav_file.close()` được tự động triệu gọi qua `__exit__`.
   - `wav_file.close()` gọi tiếp `self._ensure_header_written(0)`.
   - Tại dòng 582-583 của `Lib/wave.py`:
     ```python
     def _ensure_header_written(self, datasize):
         if not self._headerwritten:
             if not self._nchannels:
                 raise Error('# channels not specified')
             if not self._sampwidth:
                 raise Error('sample width not specified')
             if not self._framerate:
                 raise Error('sampling rate not specified')
             self._write_header(datasize)
     ```
   - Do `self._nchannels` vẫn bằng `0`, `wave.Error('# channels not specified')` lập tức bị quăng ra, làm gián đoạn tiến trình FastAPI hoặc sập bài kiểm thử!

---

## 3. Khảo sát & Đánh giá Thực nghiệm 3 Hướng Giải pháp

Chúng tôi đã thiết kế và chạy trực tiếp các kịch bản thực nghiệm đối với các hướng tiếp cận sau:

### Kịch bản A: Chỉ khởi tạo trước Header trong `wave.open`

```python
with wave.open(wav_io, "wb") as wav_file:
    wav_file.setnchannels(1)
    wav_file.setsampwidth(2)
    wav_file.setframerate(22050)
    voice.synthesize_wav(norm_text, wav_file, syn_config=syn_config)
return wav_io.getvalue()
```

- **Kết quả Thực nghiệm**:
  * Thoát khỏi khối `with` không còn bị ném `wave.Error`.
  * **NHƯNG**: `len(wav_io.getvalue())` cho ra chính xác **44 bytes** (chỉ có 44 bytes header RIFF/WAVE với `data_chunk_size = 0` và 0 frame dữ liệu).
- **Hạn chế Nghiêm trọng**:
  1. Trong `tests/test_adversarial_punctuation.py:357`, bộ kiểm thử kiểm tra:
     ```python
     is_valid = isinstance(wav, bytes) and len(wav) > 44
     ```
     Vì `44 > 44` là `False`, tất cả 9 ca kiểm thử **VẪN THẤT BẠI 100%** với lỗi:
     `[FAIL] [Piper VITS Audio Generation] Repeated commas (rp=False): INVALID AUDIO: Bytes length=44`.
  2. Trong môi trường Web & Mobile thực tế: Tệp WAV 0-frame (44 bytes) khi nạp vào Web Audio API (`AudioContext.decodeAudioData`), HTML5 `<audio>`, Android `MediaPlayer` hoặc ALSA `aplay` thường gây ra ngoại lệ giải mã (`MEDIA_ERROR_MALFORMED` hoặc `EncodingError`) do không có mẫu âm thanh để phát.

### Kịch bản B: Chỉ kiểm tra Regex đầu vào `re.search(r'\w', norm_text)`

- **Kết quả Thực nghiệm**:
  * Phát hiện bất cập: espeak-ng tiếng Việt của Piper thực tế **CÓ ánh xạ âm vị** cho một số ký tự không phải `\w`. Ví dụ:
    + `'!'` được espeak-ng phiên âm thành `chấm than` (sinh ra `15,916 bytes` âm thanh).
    + `'@'` sinh ra `13,868 bytes` ("a còng").
    + `'#'` sinh ra `21,548 bytes` ("thăng").
    + `'$'` sinh ra `20,524 bytes` ("đô la").
    + `'%'` sinh ra `18,988 bytes` ("phần trăm").
    + Emoji (`'😊'`, `'🌟'`) sinh ra `~39,000 bytes`.
  * Nếu dùng regex kiểm tra thô `if not re.search(r'\w', norm_text): return silence`, hệ thống sẽ bóp nghẹt nhầm các ký tự phát âm được ở trên thành khoảng lặng (False Positives).
  * Đồng thời, regex không thể đón đầu được các ký tự Unicode lạ hoặc các phiên bản Piper từ điển trong tương lai.

### Kịch bản C & D: Mô hình Phòng thủ Đa tầng (Layered Defense-in-Depth - KHUYÊN DÙNG)

Giải pháp tối ưu và an toàn tuyệt đối là kết hợp 3 lớp bảo vệ:
1. **Lớp 1 (Pre-initialization)**: Khởi tạo trước tham số header (`nchannels=1`, `sampwidth=2`, `framerate=sample_rate`) trên đối tượng `wav_file` trước khi Piper tổng hợp. Nếu Piper phát sinh âm thanh, nó sẽ ghi đè hoặc tiếp tục sử dụng các tham số này.
2. **Lớp 2 (Exception Guard)**: Bọc khối xử lý trong `try...except (wave.Error, Exception)` để chặn đứng mọi biến thể ngoại lệ chưa lường trước.
3. **Lớp 3 (Zero-Phoneme Post-check & Silence Generation)**: Kiểm tra dung lượng byte buffer thu được. Nếu `len(wav_bytes) <= 44` (đồng nghĩa Piper sinh 0 frame hoặc lỗi rỗng), hàm lập tức hoàn trả một bộ đệm âm thanh WAV khoảng lặng hợp lệ (`_generate_silence_wav(duration_sec=0.25, sample_rate=sample_rate)`).

```
+-----------------------------------------------------------------------------------+
|               MÔ HÌNH PHÒNG THỦ ĐA TẦNG CHO SYNTHESIZE_WAV                        |
+-----------------------------------------------------------------------------------+
|                                                                                   |
|  [Đầu vào norm_text]                                                              |
|          │                                                                        |
|          ▼                                                                        |
|  [Khởi tạo wav_file: channels=1, sampwidth=2, framerate=sample_rate]              |
|          │                                                                        |
|          ▼                                                                        |
|  [voice.synthesize_wav(norm_text, wav_file)]  ──(Ngoại lệ wave.Error)──┐          |
|          │                                                             │          |
|          ▼                                                             ▼          |
|  [Kiểm tra: len(wav_bytes) > 44 ?]                            [Bắt ngoại lệ]      |
|          │                                                             │          |
|     YES  │  NO (0 frames)                                              │          |
|     ┌────┴─────────────────────────────┐                               │          |
|     ▼                                  ▼                               ▼          |
|  [Trả về âm thanh VITS]    [_generate_silence_wav(0.25s, sample_rate)] <──┘          |
|  (Đầy đủ âm sắc/prosody)   (11,068 bytes, 1ch, 22050Hz, 5512 frames)             |
|                            ==> 100% PASS adversarial tests & Web/Mobile Safe     |
+-----------------------------------------------------------------------------------+
```

---

## 4. Bằng chứng Thực nghiệm Khẳng định Giải pháp Đề xuất

Đặc phái viên Explorer 2 đã chạy kịch bản thử nghiệm mô phỏng toàn bộ 20 ca kiểm thử của Category 6 (`test_piper_audio_synthesis_crash_resistance`):

```
================================================================================
KẾT QUẢ THỬ NGHIỆM MÔ PHỎNG GIẢI PHÁP ĐỀ XUẤT:
================================================================================
[PASS] Vietnamese with diacritics & punct (rp=True): 237,100 bytes, 1ch, 22050Hz, 118528 frames
[PASS] Vietnamese with diacritics & punct (rp=False): 127,020 bytes, 1ch, 22050Hz, 63488 frames
[PASS] Sentence with chấm bài (rp=True): 80,940 bytes, 1ch, 22050Hz, 40448 frames
[PASS] Repeated commas (rp=True): 9,772 bytes, 1ch, 22050Hz, 4864 frames
[PASS] Repeated commas (rp=False): 11,068 bytes, 1ch, 22050Hz, 5512 frames
[PASS] Four dots (rp=True): 11,068 bytes, 1ch, 22050Hz, 5512 frames
[PASS] Four dots (rp=False): 11,068 bytes, 1ch, 22050Hz, 5512 frames
[PASS] Ellipsis (rp=True): 11,068 bytes, 1ch, 22050Hz, 5512 frames
[PASS] Ellipsis (rp=False): 11,068 bytes, 1ch, 22050Hz, 5512 frames
[PASS] Interrobang sequence (rp=True): 38,956 bytes, 1ch, 22050Hz, 19456 frames
[PASS] Interrobang sequence (rp=False): 11,068 bytes, 1ch, 22050Hz, 5512 frames
[PASS] Spaced colons (rp=True): 67,116 bytes, 1ch, 22050Hz, 33536 frames
[PASS] Spaced colons (rp=False): 11,068 bytes, 1ch, 22050Hz, 5512 frames
[PASS] Punctuation sequence (rp=True): 88,620 bytes, 1ch, 22050Hz, 44288 frames
[PASS] Punctuation sequence (rp=False): 15,404 bytes, 1ch, 22050Hz, 7680 frames
[PASS] Spaced ellipsis (rp=True): 11,068 bytes, 1ch, 22050Hz, 5512 frames
[PASS] Spaced ellipsis (rp=False): 11,068 bytes, 1ch, 22050Hz, 5512 frames
[PASS] Empty string (rp=False): Graceful ValueError: Văn bản sau khi chuẩn hóa bị rỗng
[PASS] Whitespace only (rp=False): Graceful ValueError: Văn bản sau khi chuẩn hóa bị rỗng
[PASS] 50 punctuation sequence (rp=True): 837,676 bytes, 1ch, 22050Hz, 418816 frames
--------------------------------------------------------------------------------
TỔNG KẾT: 20/20 CA KIỂM THỬ ĐẠT CHUẨN (100% PASS, 0 FAIL)
================================================================================
```

### Vì sao Khoảng lặng 0.25s (250ms) là Chuẩn mực Sư phạm (Pedagogical Pause)?
- Trong chính tả nghe - viết tiểu học, dấu chấm lửng (`...`) hoặc ngắt dấu câu không đọc thành tiếng biểu thị **khoảng ngừng lấy hơi hoặc nhịp ngắt logic** của câu văn.
- Một file WAV chứa 0.25s âm thanh PCM 16-bit giá trị `0` (`b'\x00\x00' * 5512`):
  * Dung lượng nhỏ gọn (~11 KB), truyền tải qua mạng trong < 1ms trên Raspberry Pi.
  * Được các trình phát âm thanh (Web Browser, Android Native App, aplay) phát mượt mà như một khoảng lặng tự nhiên, không tiếng "bụp" (pop/click), không báo lỗi giải mã.
  * Thay thế hoàn hảo cho phương án phát tiếng chuông bíp cảnh báo 440Hz (`_generate_beeps_wav`), giúp bài giảng sư phạm giữ trọn vẹn sự êm ái và tự nhiên.

---

## 5. Khuyến nghị Hướng dẫn Triển khai Chi tiết cho Worker M1

Worker M1 chỉ cần cập nhật 2 vị trí trong `python_service/tts_engine.py`:

### Vị trí 1: Bổ sung phương thức `_generate_silence_wav` vào lớp `OfflineTTSEngine`
(Ngay phía trên phương thức `_generate_beeps_wav` ở khoảng dòng 646)

```python
    def _generate_silence_wav(self, duration_sec: float = 0.25, sample_rate: int = 22050) -> bytes:
        """Tạo bộ đệm âm thanh WAV khoảng lặng (silence PCM 16-bit) hợp lệ phòng khi đầu vào không có âm vị."""
        n_samples = int(sample_rate * max(0.05, duration_sec))
        wav_io = io.BytesIO()
        with wave.open(wav_io, "wb") as wf:
            wf.setnchannels(1)
            wf.setsampwidth(2)
            wf.setframerate(sample_rate)
            wf.writeframes(b"\x00\x00" * n_samples)
        return wav_io.getvalue()
```

### Vị trí 2: Gia cố khối tổng hợp âm thanh trong `synthesize_wav`
(Thay thế các dòng 569 - 572 trong `python_service/tts_engine.py`)

```python
<<<<<<< BEFORE
                wav_io = io.BytesIO()
                with wave.open(wav_io, "wb") as wav_file:
                    voice.synthesize_wav(norm_text, wav_file, syn_config=syn_config)
                return wav_io.getvalue()
=======
                sample_rate = getattr(getattr(voice, "config", None), "sample_rate", 22050)
                wav_io = io.BytesIO()
                try:
                    with wave.open(wav_io, "wb") as wav_file:
                        wav_file.setnchannels(1)
                        wav_file.setsampwidth(2)
                        wav_file.setframerate(sample_rate)
                        voice.synthesize_wav(norm_text, wav_file, syn_config=syn_config)
                    wav_bytes = wav_io.getvalue()
                except wave.Error as we:
                    logger.warning(f"⚠️ wave.Error khi tổng hợp âm thanh cho '{norm_text[:30]}': {we}")
                    wav_bytes = b""

                # Nếu Piper không sinh ra frame âm thanh nào (chỉ có header 44 bytes hoặc rỗng), trả về khoảng lặng chuẩn
                if len(wav_bytes) <= 44:
                    logger.info(f"ℹ️ Chuỗi '{norm_text[:30]}' không phát sinh âm vị, tạo khoảng lặng chuẩn ({sample_rate}Hz, 0.25s)")
                    return self._generate_silence_wav(duration_sec=0.25, sample_rate=sample_rate)

                return wav_bytes
>>>>>>> AFTER
```

### Vị trí 3: Gia cố nhánh fallback Piper CLI (Dòng 590-595)
(Đảm bảo nếu gọi CLI mà sinh ra 44 bytes cũng trả về silence thay vì phát tiếng bíp)

```python
<<<<<<< BEFORE
            proc = subprocess.run(cmd, input=norm_text.encode("utf-8"), stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            if proc.returncode == 0 and len(proc.stdout) > 44:
                return proc.stdout
=======
            proc = subprocess.run(cmd, input=norm_text.encode("utf-8"), stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            if proc.returncode == 0:
                if len(proc.stdout) > 44:
                    return proc.stdout
                elif len(proc.stdout) == 44:
                    return self._generate_silence_wav(duration_sec=0.25, sample_rate=22050)
>>>>>>> AFTER
```
