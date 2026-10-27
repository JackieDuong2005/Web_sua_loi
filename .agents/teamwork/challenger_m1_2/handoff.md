# Báo cáo Phản biện Thực nghiệm (Adversarial Challenge Report)
## Milestone 1: Expressive Piper VITS Engine & Pedagogical Spoken Punctuation

- **Đặc phái viên**: Challenger Milestone 1-2 (`challenger_m1_2`)
- **Tập tin thẩm định chính**: `python_service/tts_engine.py`
- **Bộ kiểm thử thực nghiệm**: `tests/test_adversarial_punctuation.py`
- **Thời điểm hoàn thành**: 2026-10-18T19:36:30Z
- **Phán quyết (Verdict)**: ❌ **REJECT** (Yêu cầu Worker M1 khắc phục 3 nhóm lỗi nghiêm trọng trước khi nghiệm thu)
- **Quy chuẩn hiển thị**: Tuân thủ nghiêm ngặt `GEMINI.md` — 100% không dùng Mermaid, sử dụng bảng Markdown và sơ đồ ASCII.

---

## 1. Quan sát Thực nghiệm (Observation)

Đặc phái viên đã thiết kế và thực thi trực tiếp bộ công cụ kiểm thử đối kháng (Adversarial Fuzzing Harness) `tests/test_adversarial_punctuation.py` gồm **72 ca kiểm thử** bao phủ 6 chiều không gian tấn công:
- **Tổng số ca kiểm thử**: 72
- **Thành công (PASS)**: 48 (66.7%)
- **Thất bại (FAIL)**: 24 (33.3%)

```
================================================================================
ADVERSARIAL SUITE FINISHED in 14.24s
TOTAL TESTS: 72
PASSED: 48
FAILED: 24
================================================================================
```

### 1.1. Lỗi Nhóm 1: Phá vỡ tính Lũy đẳng toán học và Đột biến nổ khẩu ngữ (Idempotency Breakdown & Cue Mutation Explosion)
Khi chạy lại `inject_pedagogical_punctuation` trên văn bản đã được chèn dấu hoặc chứa chuỗi dấu câu liên tiếp/có khoảng trắng, hàm tạo ra sự bùng nổ nhân bản từ ngữ:
- **Chuỗi dấu câu chuẩn `", . ? ! :"`**:
  * Pass 1: `", phẩy, , chấm. , chấm hỏi. , chấm than. , hai chấm,"`
  * Pass 2: `", phẩy,, phẩy, chấm, chấm. , chấm hỏi., phẩy, chấm than, chấm. , hai chấm,"`
  * Quan sát: `f(x) != f(f(x))`. Chữ `chấm` và `phẩy` bị nhân đôi lặp lại: `phẩy,, phẩy,` và `chấm than, chấm.`.
- **Dấu hai chấm cách nhau `": : :"`**:
  * Pass 1: `", hai chấm, , hai chấm, , hai chấm,"`
  * Pass 2: `", hai chấm,, phẩy, hai chấm, phẩy, , hai chấm,"`
  * Quan sát: Khẩu ngữ biến dạng thành `, hai chấm,, phẩy, hai chấm, phẩy,`.
- **Chuỗi dấu chấm hỏi - chấm than liên hoàn `"?!?!"`**:
  * Pass 1: `", chấm hỏi. , chấm hỏi."`
  * Pass 2: `", chấm hỏi., phẩy, chấm hỏi, chấm."`
- **Chuỗi dấu liên tiếp `".,?!:"`**:
  * Pass 1: `", chấm. , phẩy, , chấm hỏi. , hai chấm,"`
  * Pass 2: `", chấm., phẩy, phẩy, phẩy, , chấm hỏi., phẩy, hai chấm, phẩy,"`
- **Chuỗi dấu phẩy và chấm `",,,,...."`**:
  * Pass 1: `", phẩy, ...."`
  * Pass 2: `", phẩy,, chấm. ..."`

### 1.2. Lỗi Nhóm 2: Regex Greediness & Đảo ngược quyền ưu tiên do Khoảng trắng (Whitespace Precedence Inversion)
- **Khoảng trắng trước dấu chấm lửng (`"Hôm nay ... trời đẹp"`)**:
  * Đầu vào: `"Hôm nay ... trời đẹp"`
  * Đầu ra thực tế: `'Hôm nay, chấm. .. trời đẹp'`
  * Quan sát: Dấu ba chấm bị xé đôi thành 1 dấu chấm đơn kèm 2 dấu chấm phía sau (`..`). Dấu chấm đơn bị biến thành `, chấm.`, phá hủy hoàn toàn ngữ nghĩa dấu lửng của bài văn SGK.
- **Khoảng trắng trước khẩu ngữ có sẵn (`"Chào em , phẩy, hôm nay"`)**:
  * Đầu vào: `"Chào em , phẩy, hôm nay"`
  * Đầu ra thực tế: `'Chào em, phẩy, phẩy, phẩy, hôm nay'`
  * Quan sát: Bị chèn thừa thành 3 từ `phẩy` liên tiếp (`phẩy, phẩy, phẩy`).
- **Từ viết tắt có khoảng trắng sau dấu chấm (`"TP. HCM"`)**:
  * Đầu vào: `"UBND TP. HCM vừa ra quyết định."`
  * Đầu ra thực tế: `'UBND TP, chấm. HCM vừa ra quyết định, chấm.'`
  * Quan sát: Âm thanh bị đọc thành "Ủy ban nhân dân TP chấm Hồ Chí Minh".

### 1.3. Lỗi Nhóm 3: Sập hệ thống (Crash Uncaught Exception) khi Tổng hợp Âm thanh VITS không có âm vị
Tại `python_service/tts_engine.py:570`:
```python
wav_io = io.BytesIO()
with wave.open(wav_io, "wb") as wav_file:
    voice.synthesize_wav(norm_text, wav_file, syn_config=syn_config)
return wav_io.getvalue()
```
Khi gọi `tts_engine.synthesize_wav(text)` với các chuỗi chỉ có dấu câu hoặc dấu ba chấm:
```
Traceback (most recent call last):
  File "C:\Users\Jackie Duong\Desktop\Web_sua_loi\python_service\tts_engine.py", line 570, in synthesize_wav
    with wave.open(wav_io, "wb") as wav_file:
  File "C:\Users\Jackie Duong\AppData\Local\Programs\Python\Python311\Lib\wave.py", line 453, in __exit__
    self.close()
  File "C:\Users\Jackie Duong\AppData\Local\Programs\Python\Python311\Lib\wave.py", line 565, in close
    self._ensure_header_written(0)
  File "C:\Users\Jackie Duong\AppData\Local\Programs\Python\Python311\Lib\wave.py", line 583, in _ensure_header_written
    raise Error('# channels not specified')
wave.Error: # channels not specified
```
* **Các trường hợp văng ngoại lệ `wave.Error` không được bắt**:
  1. `synthesize_wav("....", read_punctuation=True)` $\to$ CRASH `wave.Error`
  2. `synthesize_wav("....", read_punctuation=False)` $\to$ CRASH `wave.Error`
  3. `synthesize_wav("...", read_punctuation=True)` $\to$ CRASH `wave.Error`
  4. `synthesize_wav("...", read_punctuation=False)` $\to$ CRASH `wave.Error`
  5. `synthesize_wav(",,,", read_punctuation=False)` $\to$ CRASH `wave.Error`
  6. `synthesize_wav("?!?!", read_punctuation=False)` $\to$ CRASH `wave.Error`
  7. `synthesize_wav(": : :", read_punctuation=False)` $\to$ CRASH `wave.Error`
  8. `synthesize_wav("   ...   ", read_punctuation=True)` $\to$ CRASH `wave.Error`
  9. `synthesize_wav("   ...   ", read_punctuation=False)` $\to$ CRASH `wave.Error`

---

## 2. Chuỗi Suy luận Nguyên nhân Gốc rễ (Logic Chain)

Từ các quan sát thực nghiệm trên, chuỗi nguyên nhân kỹ thuật được xác định như sau:

```
+------------------------------------------------------------------------------------+
|                               NGUYÊN NHÂN GỐC RỄ                                   |
+------------------------------------------------------------------------------------+
|                                                                                    |
|  1. CẤU TRÚC REGEX THIẾU TIỀN XỬ LÝ KHOẢNG TRẮNG Ở ĐẦU CÁC PATTERN BẢO VỆ          |
|     - _PUNCTUATION = r'[ \t]*([,.:?!]|...)[ \t]*' có `[ \t]*` ở đầu                |
|     - _ELLIPSIS = r'\.{2,}|…' KHÔNG CÓ `[ \t]*` ở đầu                              |
|     - _CUE_PATTERN = r'(?:,[ \t]*(?:phẩy|...)...)' KHÔNG CÓ `[ \t]*` ở đầu         |
|     ==> Khi gặp ' ...' hoặc ' , phẩy,', _PUNCTUATION "chiếm" khoảng trắng và nuốt  |
|         dấu đầu tiên, xé nát dấu ba chấm và nhân đôi khẩu ngữ.                     |
|                                                                                    |
|  2. CHUỖI DẤU LIÊN TIẾP TẠO RA DẤU PHẨY MỒ CÔI KHIẾN PASS 2 BỊ ĐỘT BIẾN LẶP LẠI    |
|     - Khi ', .' được thay thế thành ', phẩy, , chấm. '                             |
|     - Ký tự ', ' đứng sau ', phẩy,' bị regex ở Pass 2 hiểu lầm là dấu phẩy mới     |
|     - Dấu phẩy mới được thay bằng ', phẩy, ', biến câu thành cà lăm ', phẩy,, phẩy,'|
|                                                                                    |
|  3. PIPER VITS KHÔNG PHÁT SINH KHUNG ÂM THANH KHI ĐẦU VÀO TOÀN DẤU CÂU             |
|     - Khi text chỉ toàn dấu không thể đọc ra âm tiết (như ..., hoặc dấu khi         |
|       read_punctuation=False), phonemizer của Piper trả về chuỗi rỗng.             |
|     - Piper không gọi wav_file.setnchannels() vào đối tượng wave.open              |
|     - Khi khối `with wave.open(...)` đóng lại, wave.py ném `wave.Error`             |
|     - Không có try/except hay cấu hình khởi tạo header trước, làm sập tiến trình.  |
+------------------------------------------------------------------------------------+
```

1. **Về tính lũy đẳng (Idempotency)**:
   - Worker M1 tuyên bố tại handoff mục 1.4 rằng hàm đạt tính lũy đẳng $f(f(x)) = f(x)$. Tuy nhiên, Worker M1 chỉ kiểm tra với câu đơn chuẩn có chữ (`"Gió mùa thu..."`).
   - Khi đầu vào chứa chuỗi dấu liên tiếp hoặc có khoảng cách (thường gặp khi học sinh gõ sai hoặc đề bài SGK in ấn dạng trắc nghiệm điền khuyết `... , ... ?`), tính lũy đẳng bị phá vỡ 100%, sinh ra lỗi lặp âm nghiêm trọng.
2. **Về dấu ba chấm (`...`)**:
   - Trong văn học tiểu học, dấu ba chấm thường được gõ tách rời bằng dấu cách (ví dụ: `Hôm nay ... trời đẹp`). Việc regex biến thành `Hôm nay, chấm. .. trời đẹp` khiến giọng cô giáo đọc to từ "chấm" giữa chừng câu, sai lệch hoàn toàn phương pháp sư phạm.
3. **Về độ ổn định của API tổng hợp âm thanh (Resilience)**:
   - Trong môi trường thực tế, học sinh hoặc giáo viên có thể vô tình gửi văn bản chỉ có dấu chấm câu hoặc dấu ba chấm. Việc hệ thống ném ngoại lệ không xử lý `wave.Error: # channels not specified` sẽ làm treo hoặc trả về lỗi HTTP 500 trên cả Web BFF và Android App.

---

## 3. Các Điểm Giới hạn / Lưu ý (Caveats)

- **Các trường hợp đã hoạt động tốt (48/72 PASS)**:
  * Từ tiếng Việt chứa từ chỉ dấu (`chấm bài`, `phẩy đuôi`, `chấm thi`, `dấu chấm`, `dấu hai chấm`) được bảo vệ hoàn hảo khi đứng độc lập và trong câu bình thường.
  * Các câu tiếng Việt có dấu thanh và dấu câu chuẩn (`Ơ kìa, em ơi! Có phải... chú mèo? Đúng rồi: mèo tam thể.`) đạt chất lượng âm thanh rất tốt, âm lượng và cao độ tự nhiên, không bị lỗi font hay desync phonemizer.
  * Chuỗi văn bản rỗng `""` và chuỗi chỉ có khoảng trắng `"   "` đã được bảo vệ đúng cách bằng `ValueError` có kiểm soát.
  * Preset âm học (`warm_story`, `standard`, `emphasis`, `question`) sinh ra 4 luồng âm thanh khác biệt và phân giải tham số chính xác.
- **Phạm vi thẩm định**: Thẩm định tập trung chuyên sâu vào độ bền đối kháng (Adversarial Robustness) của module xử lý dấu câu và động cơ Piper VITS.

---

## 4. Kết luận & Khuyến nghị Khắc phục (Conclusion & Actionable Remediations)

**Phán quyết**: ❌ **REJECT**

Hệ thống Milestone 1 chưa đạt tiêu chuẩn bàn giao do tồn tại 24 lỗi thực nghiệm, trong đó có lỗi sập tiến trình (`wave.Error`) và lỗi vỡ tính lũy đẳng làm biến dạng văn bản khi gõ dấu liên tiếp.

### Đề xuất Khắc phục Chi tiết cho Worker M1 (Actionable Fixes)

Worker M1 chỉ cần chỉnh sửa cục bộ trong file `python_service/tts_engine.py`:

#### 1. Khắc phục lỗi Regex và Lũy đẳng trong `inject_pedagogical_punctuation`:
- Thêm tiền xử lý gom cụm dấu câu có khoảng trắng trước khi regex chính chạy:
  ```python
  # Thu gọn các dấu lặp có kèm khoảng trắng ngang: ', ,' -> ','
  t = re.sub(r'[, \t]*,[ \t]*,', ',', text)
  t = re.sub(r'[: \t]*:[ \t]*:', ':', t)
  t = re.sub(r'(\?[\s?!]*\?|\?!|!\?)', '?', t)
  t = re.sub(r'(![\s!]*!)', '!', t)
  ```
- Cập nhật pattern `_ELLIPSIS` và `_CUE_PATTERN` để bao gồm khoảng trắng ngang ở đầu:
  ```python
  _CUE_PATTERN = r'[ \t]*(?:,[ \t]*(?:phẩy|chấm(?:\s+(?:hỏi|than))?|hai\s+chấm)[ \t]*[,.])'
  _ELLIPSIS = r'[ \t]*(\.{2,}|…)'
  ```
- Thêm bước hậu xử lý làm sạch các dấu phẩy dư thừa ở kết quả:
  ```python
  res = re.sub(r',[ \t]*,', ',', res)
  ```

#### 2. Khắc phục lỗi sập `wave.Error: # channels not specified` trong `synthesize_wav`:
- Trước khi truyền `wav_file` vào `voice.synthesize_wav(norm_text, wav_file, ...)`, kiểm tra xem `norm_text` có chứa bất kỳ ký tự chữ cái/chữ số nào không (`if not re.search(r'[0-9A-Za-zĐđĂăÂâÊêÔôƠơƯư]', norm_text):`).
- Nếu không có âm tiết nào phát âm được (hoặc bọc khối `try...except wave.Error`), tự động khởi tạo header WAV hoặc trả về âm thanh dự phòng `_generate_beeps_wav` / khoảng lặng (silence WAV) thay vì để ném ngoại lệ sập server:
  ```python
  # Hoặc khởi tạo sẵn header chuẩn 22050Hz Mono 16-bit trước khi synthesize
  with wave.open(wav_io, "wb") as wav_file:
      wav_file.setnchannels(1)
      wav_file.setsampwidth(2)
      wav_file.setframerate(22050)
      voice.synthesize_wav(norm_text, wav_file, syn_config=syn_config)
  ```

---

## 5. Phương pháp Kiểm tra Xác thực Độc lập (Verification Method)

Người đánh giá độc lập hoặc Worker M1 sau khi sửa code có thể chạy toàn bộ bộ kiểm thử đối kháng bằng lệnh duy nhất:

```powershell
python tests/test_adversarial_punctuation.py
```

### Tiêu chí nghiệm thu (Approval Criteria):
- **TOTAL TESTS**: 72
- **PASSED**: 72
- **FAILED**: 0
- Không còn bất kỳ ngoại lệ `wave.Error` nào khi tổng hợp âm thanh với chuỗi chỉ chứa dấu.
- Đạt tính lũy đẳng 100%: $f(f(x)) == f(x)$ trên mọi mẫu dấu lặp (`: : :`, `, . ? ! :`, `?!?!`, v.v.).

---
*Báo cáo được lập bởi Challenger M1-2 dựa trên 100% bằng chứng thực nghiệm tự động.*
