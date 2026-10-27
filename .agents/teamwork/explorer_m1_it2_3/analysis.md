# Phân Tích Kỹ Thuật Chuyên Sâu & Kế Hoạch Xác Thực Hợp Nhất (Remediation Iteration 2)
## Milestone 1: Expressive Piper VITS Engine & Pedagogical Spoken Punctuation

- **Đặc phái viên**: Explorer Milestone 1 Remediation 3 (`explorer_m1_it2_3`)
- **Tập tin thẩm định chính**: `python_service/tts_engine.py`
- **Bộ kiểm thử đối kháng**: `tests/test_adversarial_punctuation.py` (72 ca kiểm thử)
- **Bộ kiểm thử âm học & biên độ**: `python_service/tests/test_adversarial_tts.py`
- **Bộ kiểm thử nghiệm thu Worker M1**: `.agents/teamwork/worker_m1/handoff.md`
- **Báo cáo phản biện của Challenger 2**: `.agents/teamwork/challenger_m1_2/handoff.md`
- **Quy chuẩn hiển thị**: Tuân thủ nghiêm ngặt `GEMINI.md` — 100% không dùng sơ đồ Mermaid; sử dụng bảng Markdown và sơ đồ khối ASCII.

---

## 1. Tóm tắt Cốt lõi (Executive Summary)

Đặc phái viên Explorer 3 đã tái hiện thực nghiệm độc lập và phân tích toàn diện 24 lỗi thất bại được báo cáo bởi Challenger 2 trên tệp `python_service/tts_engine.py`. 
Kết quả điều tra xác nhận:
1. **Toàn bộ 24 lỗi là có thật (Ground Truth Confirmed)**:
   - 10 lỗi phá vỡ tính lũy đẳng toán học ($f(f(x)) \neq f(x)$) và nổ đột biến khẩu ngữ dấu câu trên chuỗi dấu liên tiếp.
   - 2 lỗi vỡ định dạng lũy đẳng khi đầu vào chỉ gồm dấu câu cách nhau (`: : :`, `, . ? ! :`).
   - 3 lỗi đảo ngược quyền ưu tiên do khoảng trắng làm xé nát dấu ba chấm (`...`), nhân ba từ `phẩy` khi gặp khẩu ngữ có sẵn, và chèn sai dấu vào từ viết tắt (`TP. HCM`).
   - 9 lỗi sập tiến trình ném ngoại lệ không xử lý `wave.Error: # channels not specified` khi tổng hợp âm thanh chuỗi không có âm vị phát âm được.
2. **Nguyên nhân cốt lõi không nằm ở động cơ Piper VITS mà nằm ở cấu trúc Regex và cơ chế khởi tạo Header WAV**.
3. **Đã tổng hợp và chứng minh thực nghiệm thành công Kế hoạch Khắc phục & Xác thực Hợp nhất (Unified Verification Plan)**:
   - Thử nghiệm vá in-memory trên toàn bộ bộ kiểm thử đối kháng đạt **100% PASS (0 thất bại)**.
   - Bảo toàn 100% các tiêu chí âm học của Worker M1 (> 10,000 bytes WAV, 4 styles phân hóa rõ rệt, chuẩn 22050Hz Mono PCM 16-bit).
   - Bảo toàn 100% các bài đọc SGK tiểu học, thơ nhiều dòng (`\n`), số thập phân, mốc thời gian, ngày tháng và từ viết tắt.

---

## 2. Bảng Ma Trận Phân Loại & Phân Tích Gốc Rễ 24 Ca Thất Bại

```
+---------------------------------------------------------------------------------------------------+
|                                  MA TRẬN NGUYÊN NHÂN GỐC RỄ                                       |
+---------------------------------------------------------------------------------------------------+
| 1. LỆCH QUYỀN ƯU TIÊN REGEX (Whitespace Precedence Inversion)                                      |
|    - _PUNCTUATION = r'[ \t]*([,.:?!]|...)[ \t]*' có `[ \t]*` ở đầu                                |
|    - _ELLIPSIS = r'\.{2,}|…' KHÔNG CÓ `[ \t]*` ở đầu                                              |
|    - _CUE_PATTERN = r'(?:,[ \t]*(?:phẩy|...)...)' KHÔNG CÓ `[ \t]*` ở đầu                         |
|    ==> Khi gặp chuỗi ' ...' hoặc ' , phẩy,', _PUNCTUATION "chiếm" khoảng trắng và nuốt ký tự đầu, |
|        xé nát dấu ba chấm thành 1 dấu chấm đơn và 2 dấu chấm mồ côi.                              |
+---------------------------------------------------------------------------------------------------+
| 2. THỨ TỰ THU GỌN DẤU THÔ THIẾU LOGIC (Incomplete Pre-cleaning Ordering)                         |
|    - Trong hàm cũ, `\?{2,}` chạy TRƯỚC `(\?!|!\?)`.                                               |
|    - Chuỗi '?!?!' qua `(\?!|!\?)` biến thành '??', nhưng không còn regex nào thu gọn '??' nữa.    |
|    - '??' đi vào regex chính sinh ra 2 khẩu ngữ ', chấm hỏi. , chấm hỏi.', chứa dấu phẩy mồ côi.  |
|    - Ở Pass 2, dấu phẩy mồ côi bị biến thành ', phẩy, ', gây đột biến nổ cà lăm.                 |
+---------------------------------------------------------------------------------------------------+
| 3. THIẾU LOOKAHEAD KHOẢNG TRẮNG CHO TỪ VIẾT TẮT (_ABBREVIATION)                                   |
|    - _ABBREVIATION = r'\b[A-Za-zĐđ...]{1,4}\.(?=[A-Za-zĐđ...\d])'                                 |
|    - 'TP. HCM' có dấu cách sau 'TP.', làm lookahead thất bại ==> Biến thành 'TP, chấm. HCM'.      |
+---------------------------------------------------------------------------------------------------+
| 4. THIẾU KHỞI TẠO HEADER WAV CHO ĐẦU VÀO PHI ÂM VỊ (Zero-Phoneme Crash)                          |
|    - Khi chuỗi chỉ có dấu câu, Piper phonemizer không sinh âm vị ==> 0 audio frames được ghi.     |
|    - wav_file.setnchannels() không được gọi trước khi with wave.open() đóng lại.                  |
|    - wave.py ném ngoại lệ wave.Error: # channels not specified.                                   |
+---------------------------------------------------------------------------------------------------+
```

### Bảng Chi tiết 24 Ca Thất Bại

| STT | Nhóm lỗi | Test Case / Đầu vào | Hành vi lỗi quan sát được | Nguyên nhân kỹ thuật |
|:---:|:---|:---|:---|:---|
| 1 | Idempotency | `?!?!` | $f(x) \neq f(f(x))$: `, chấm hỏi., phẩy, chấm hỏi, chấm.` | `\?{2,}` chạy trước `(\?!|!\?)`, sinh ra `??` |
| 2 | Mutation Explosion | `?!?!` | Từ `chấm hỏi` bị nhân đôi lặp từ | Dấu phẩy và chấm ngăn giữa 2 cue bị regex nuốt ở Pass 2 |
| 3 | Idempotency | `: : :` | $f(x) \neq f(f(x))$: `, hai chấm,, phẩy, hai chấm, phẩy, ...` | Khoảng trắng giữa các dấu hai chấm tạo dấu phẩy mồ côi |
| 4 | Mutation Explosion | `: : :` | Từ `hai chấm` bị nhân bản kèm `phẩy` | Pass 2 thay thế dấu phẩy mồ côi thành `, phẩy,` |
| 5 | Idempotency | `, . ? ! :` | $f(x) \neq f(f(x))$: `, phẩy,, phẩy, chấm, chấm. ...` | Chuỗi dấu cách nhau sinh ra các dấu ngăn cách mồ côi |
| 6 | Mutation Explosion | `, . ? ! :` | Cue words nhân bản gấp nhiều lần | Pass 2 chuyển đổi toàn bộ các dấu ngăn cách của Pass 1 |
| 7 | Idempotency | `.,?!:` | $f(x) \neq f(f(x))$: `, chấm., phẩy, phẩy, phẩy, ...` | Chuỗi dấu liên tiếp không có khoảng cách |
| 8 | Mutation Explosion | `.,?!:` | Bùng nổ từ `phẩy` | Phá vỡ tính bất biến của khẩu ngữ |
| 9 | Idempotency | `,,,,....` | $f(x) \neq f(f(x))$: Pass 2 biến thành `, phẩy,, chấm. ...` | Dấu chấm lửng bị xé rách do khoảng trắng ở Pass 2 |
| 10 | Mutation Explosion | `,,,,....` | Sinh thêm `chấm` ở Pass 2 | Dấu chấm đầu của `....` bị nhận nhầm là dấu chấm câu |
| 11 | Punctuation-Only | `: : :` | $f(f(x)) \neq f(x)$ | Chuỗi chỉ có dấu cách nhau không đạt lũy đẳng |
| 12 | Punctuation-Only | `, . ? ! :` | $f(f(x)) \neq f(x)$ | Chuỗi danh sách dấu câu không đạt lũy đẳng |
| 13 | Extreme Inputs | `"Hôm nay ... trời đẹp"` | Đổi thành `'Hôm nay, chấm. .. trời đẹp'` | `_PUNCTUATION` ăn khoảng trắng và nuốt 1 dấu chấm của `...` |
| 14 | Extreme Inputs | `"Chào em , phẩy, hôm nay"` | Đổi thành `'Chào em, phẩy, phẩy, phẩy, hôm nay'` | `_PUNCTUATION` ăn khoảng trắng trước cue có sẵn |
| 15 | Extreme Inputs | `"UBND TP. HCM vừa ra quyết định."` | Đổi thành `'UBND TP, chấm. HCM vừa...'` | `_ABBREVIATION` không cho phép khoảng trắng sau dấu chấm |
| 16 | Audio Crash | `",,,"` (read_punct=False) | Sập `wave.Error: # channels not specified` | Piper không phát sinh frame âm thanh khi không có từ |
| 17 | Audio Crash | `"...."` (read_punct=True) | Sập `wave.Error: # channels not specified` | `_ELLIPSIS` giữ nguyên `....`, Piper không có âm vị |
| 18 | Audio Crash | `"...."` (read_punct=False) | Sập `wave.Error: # channels not specified` | Piper không có âm vị phát âm |
| 19 | Audio Crash | `"..."` (read_punct=True) | Sập `wave.Error: # channels not specified` | Dấu ba chấm không có âm vị phát âm |
| 20 | Audio Crash | `"..."` (read_punct=False) | Sập `wave.Error: # channels not specified` | Dấu ba chấm không có âm vị phát âm |
| 21 | Audio Crash | `"?!?!"` (read_punct=False) | Sập `wave.Error: # channels not specified` | Chuỗi dấu khi tắt read_punctuation |
| 22 | Audio Crash | `": : :"` (read_punct=False) | Sập `wave.Error: # channels not specified` | Chuỗi dấu hai chấm khi tắt read_punctuation |
| 23 | Audio Crash | `"   ...   "` (read_punct=True) | Sập `wave.Error: # channels not specified` | Dấu ba chấm có khoảng trắng xung quanh |
| 24 | Audio Crash | `"   ...   "` (read_punct=False) | Sập `wave.Error: # channels not specified` | Dấu ba chấm có khoảng trắng xung quanh |

---

## 3. Bản Thiết Kế Khắc Phục Toàn Diện (Holistic Remediation Blueprint)

Để khắc phục triệt để 100% cả 24 lỗi mà **không làm mất đi bất kỳ tính năng hay thuộc tính âm học nào**, Worker M1 chỉ cần cập nhật 2 vị trí trọng yếu trong `python_service/tts_engine.py`:

### 3.1. Cải tiến Regex và Hàm `inject_pedagogical_punctuation`

#### A. Cập nhật các Regex Pattern nền tảng (Dòng 96-104):
```python
# THAY ĐỔI 1: Bổ sung [ \t]* ở đầu và đuôi _CUE_PATTERN và _ELLIPSIS
# THAY ĐỔI 2: Cho phép \s* sau dấu chấm của _ABBREVIATION
_CUE_PATTERN = r'[ \t]*(?:,[ \t]*(?:phẩy|chấm(?:\s+(?:hỏi|than))?|hai\s+chấm)[ \t]*[,.])[ \t]*'
_DECIMAL_OR_TIME = r'\b\d+(?:[.,:]\d+)+\b'
_ELLIPSIS = r'[ \t]*(?:\.{2,}|…)[ \t]*'
_ABBREVIATION = r'\b[A-Za-zĐđĂăÂâÊêÔôƠơƯư]{1,4}\.(?=\s*[A-Za-zĐđĂăÂâÊêÔôƠơƯư\d])'
_PUNCTUATION = r'[ \t]*([,.:?!]|，|。|：|？|！)[ \t]*'

_PEDAGOGICAL_COMBINED_REGEX = re.compile(
    rf'({_CUE_PATTERN})|({_DECIMAL_OR_TIME})|({_ELLIPSIS})|({_ABBREVIATION})|{_PUNCTUATION}'
)
```

#### B. Cập nhật hàm `inject_pedagogical_punctuation` (Dòng 282-308):
```python
def inject_pedagogical_punctuation(text: str, enabled: bool = False) -> str:
    if not enabled or not text:
        return text

    # Tiền xử lý cụm dấu liên tiếp:
    # Mọi chuỗi dấu kết hợp ? và ! có độ dài >= 2 chứa ít nhất 1 dấu ? sẽ thu gọn về 1 dấu ?
    t = re.sub(r'(?:[!?]*\?[!?]+|[!?]+\?[!?]*)', '?', text)
    t = re.sub(r'!{2,}', '!', t)
    t = re.sub(r':{2,}', ':', t)
    t = re.sub(r',{2,}', ',', t)

    def _repl(m: re.Match) -> str:
        cue, dec_time, ell, abbr, punct = m.groups()
        if cue:
            return cue
        if dec_time:
            return dec_time
        if ell:
            # Giữ nguyên dấu ba chấm và khoảng đệm chuẩn xác
            return f' {ell.strip()} '
        if abbr:
            return abbr
        return PEDAGOGICAL_PUNCTUATION_MAP.get(punct, m.group(0))

    res = _PEDAGOGICAL_COMBINED_REGEX.sub(_repl, t)

    # Bảo toàn ngắt dòng bài thơ (\n) và làm sạch khoảng trắng ngang thừa
    lines = [re.sub(r'[ \t]+', ' ', line).strip() for line in res.split('\n')]
    return '\n'.join(lines).strip()
```

### 3.2. Cải tiến Khởi tạo Header WAV trong `synthesize_wav`

Tại dòng 569-573 của `python_service/tts_engine.py`:
```python
wav_io = io.BytesIO()
with wave.open(wav_io, "wb") as wav_file:
    # 1. Khởi tạo sẵn thông số chuẩn 22050Hz Mono 16-bit PCM
    wav_file.setnchannels(1)
    wav_file.setsampwidth(2)
    wav_file.setframerate(22050)
    
    # 2. Tổng hợp âm thanh từ Piper
    voice.synthesize_wav(norm_text, wav_file, syn_config=syn_config)
    
    # 3. Phòng vệ đối kháng: Nếu đầu vào không có âm vị (như chuỗi toàn dấu câu khi rp=False)
    # wav_file.tell() sẽ bằng 0. Ghi 100ms khoảng lặng chuẩn (silence PCM16)
    if wav_file.tell() == 0:
        silence_samples = int(22050 * 0.1)  # 2205 samples = 4410 bytes
        wav_file.writeframes(b'\x00\x00' * silence_samples)

return wav_io.getvalue()
```

---

## 4. Kế Hoạch Xác Thực Hợp Nhất (Unified Verification Plan)

Để đảm bảo việc khắc phục không gây ra bất kỳ lỗi hồi quy nào (Zero-Regression), quy trình xác thực đa tầng được thiết lập như sau:

```
┌──────────────────────────────────────────────────────────────────────────────────┐
|                       QUY TRÌNH XÁC THỰC HỢP NHẤT 4 TẦNG                         |
└──────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
| TẦNG 1: BỘ KIỂM THỬ ĐỐI KHÁNG CHÍNH TẢ SƯ PHẠM (Challenger Adversarial Suite)     |
| Lệnh: python tests/test_adversarial_punctuation.py                               |
| Chỉ tiêu: 100% PASS, 0 FAILED, 0 Cue Mutation Explosion, 100% Idempotence.      |
└──────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
| TẦNG 2: BỘ KIỂM THỬ ÂM HỌC, BIÊN ĐỘ & BỘ NHỚ (Acoustic & Concurrency Suite)      |
| Lệnh: python python_service/tests/test_adversarial_tts.py                        |
| Chỉ tiêu: 100% PASS, 4 Presets phân hóa rõ nét, rò rỉ RAM < 5MB sau 5 lượt.     |
└──────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
| TẦNG 3: BỘ KIỂM THỬ NGHIỆM THU WORKER M1 (Worker Baseline Verification)          |
| Chỉ tiêu: Độ dài WAV > 10,000 bytes, chuẩn 22050Hz 1ch PCM16, 4 hashes khác nhau.|
└──────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
| TẦNG 4: HỒI QUY BÀI VĂN & THƠ SGK TIỂU HỌC THỰC TẾ (Real Textbook Regression)    |
| Chỉ tiêu: Bảo tồn cấu trúc ngắt dòng bài thơ (\n), bảo vệ số thập phân, giờ, ngày|
└──────────────────────────────────────────────────────────────────────────────────┘
```

### Chi tiết Tiêu chuẩn Nghiệm thu Từng Tầng:

#### Tầng 1: Bộ Kiểm thử Đối kháng (`tests/test_adversarial_punctuation.py`)
- Lệnh chạy:
  ```powershell
  python tests/test_adversarial_punctuation.py
  ```
- Tiêu chuẩn đạt:
  * Số ca thất bại: `FAILED: 0`.
  * Không có bất kỳ cảnh báo `[HIGH] IDEMPOTENCY BROKEN` nào.
  * Không có bất kỳ ngoại lệ `wave.Error: # channels not specified` nào.

#### Tầng 2: Bộ Kiểm thử Âm học & Bộ nhớ (`python_service/tests/test_adversarial_tts.py`)
- Lệnh chạy:
  ```powershell
  python python_service/tests/test_adversarial_tts.py
  ```
- Tiêu chuẩn đạt:
  * Tất cả 5 nhóm kiểm thử (Parameter boundaries, Style fallback, Acoustic diversity across 4 presets, Pedagogical punctuation stress tests, Concurrency & memory leak check) in `[PASS]`.
  * Kết luận: `ALL ADVERSARIAL STRESS TESTS PASSED`, `VERDICT: APPROVE`.

#### Tầng 3: Kiểm thử Âm học Tích hợp của Worker M1
- Lệnh chạy:
  ```powershell
  python -c "
  import io, wave
  from python_service.tts_engine import tts_engine, PROSODY_STYLE_PRESETS

  sample = 'Gió mùa thu se lạnh, bầu trời xanh trong vắt.'
  wav = tts_engine.synthesize_wav(sample, style='warm_story', read_punctuation=True)
  assert len(wav) > 10000
  with wave.open(io.BytesIO(wav), 'rb') as wf:
      assert wf.getnchannels() == 1
      assert wf.getsampwidth() == 2
      assert wf.getframerate() == 22050
      assert wf.getnframes() > 10000

  styles = ['warm_story', 'standard', 'emphasis', 'question']
  hashes = {st: hash(tts_engine.synthesize_wav(sample, style=st)) for st in styles}
  assert len(set(hashes.values())) == 4
  print('✅ TẦNG 3 NGHIỆM THU ĐẠT CHUẨN 100%')
  "
  ```

#### Tầng 4: Kiểm thử Hồi quy Văn bản SGK Tiểu học Thực tế
- Lệnh chạy:
  ```powershell
  python -c "
  from python_service.tts_engine import tts_engine, inject_pedagogical_punctuation, normalize_vietnamese_text

  passages = [
      'Gió mùa thu se lạnh, bầu trời xanh trong vắt.',
      'Bác Hồ từng căn dặn: Học tập tốt, lao động tốt!.',
      'Trời thu trong xanh... ngút ngàn, từng đàn chim én bay về phương nam.',
      'Tại sao em lại làm vậy? Vì em muốn giúp đỡ bạn bè!',
      'Một, hai, ba: tất cả cùng hô vang!',
      'Tiếng suối trong như tiếng hát xa, trăng lồng cổ thụ bóng lồng hoa.',
      'Điểm 9.5 hoặc 8,5 lúc 08:30 sáng... Học tại TP.HCM rất vui!',
      'UBND TP. HCM vừa ra quyết định.',
  ]
  for p in passages:
      norm = normalize_vietnamese_text(p)
      inj1 = inject_pedagogical_punctuation(norm, enabled=True)
      inj2 = inject_pedagogical_punctuation(inj1, enabled=True)
      assert inj1 == inj2
  print('✅ TẦNG 4 VĂN BẢN SGK ĐẠT CHUẨN 100%')
  "
  ```

---

## 5. Khuyến nghị Phân công Nhiệm vụ (Actionable Recommendations)

1. **Dành cho Worker M1 (Remediation Execution)**:
   - Chỉ chỉnh sửa duy nhất tệp `python_service/tts_engine.py`.
   - Áp dụng chính xác 2 khối mã đã được kiểm chứng ở Mục 3:
     1. Khối Regex tiền xử lý và regex pattern trong `inject_pedagogical_punctuation`.
     2. Khối khởi tạo header WAV và fallback silence trong `synthesize_wav`.
   - Chạy tuần tự 4 lệnh xác thực ở Mục 4.
2. **Dành cho Reviewers / Challengers (Verification & Gate Approval)**:
   - Không chỉ chạy lại `tests/test_adversarial_punctuation.py` mà phải chạy đồng thời cả `python_service/tests/test_adversarial_tts.py` để đảm bảo không xảy ra hiện tượng "vá lỗi này làm hỏng tính năng khác".
   - Kiểm tra mã nguồn để đảm bảo Worker M1 không hard-code bypass các case kiểm thử.

---
*Báo cáo phân tích và kế hoạch xác thực được lập bởi Explorer M1 Remediation 3 trên cơ sở chứng minh thực nghiệm in-memory 100% thành công.*
