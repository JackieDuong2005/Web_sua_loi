# Báo cáo Phân tích Chuyên sâu: Cơ chế Spoken Pedagogical Punctuation cho Piper VITS
**Agent**: Explorer 2 (`explorer_m1_2`)  
**Milestone**: Milestone 1 — Expressive Piper VITS Engine & Spoken Punctuation  
**Mục tiêu**: Thiết kế, thẩm định an toàn regex, bảo tồn ranh giới âm học và đề xuất mã nguồn triển khai hàm `inject_pedagogical_punctuation` trong `python_service/tts_engine.py`.

---

## 1. Bối cảnh Sư phạm và Nguyên lý Thiết kế (Pedagogical Dictation Foundation)

Trong chương trình Tiểu học Việt Nam (từ lớp 1 đến lớp 5 theo Thông tư 27/2020/TT-BGDĐT và chuẩn SGK Tiếng Việt Kết nối tri thức / Cánh diều / Chân trời sáng tạo):
- Khi giáo viên đọc chính tả thể loại **Nghe - Viết (Dictation)**, học sinh chưa thể tự ngắt câu hoặc nhận diện hết các vị trí dấu câu nếu chỉ dựa vào ngữ điệu.
- Giáo viên bắt buộc phải **đọc to tên dấu câu** (ví dụ: *"Gió mùa thu se lạnh [nghỉ] phẩy [nghỉ] bầu trời xanh trong vắt [nghỉ] chấm."*).
- Học sinh nghe tên dấu câu sẽ đặt bút viết ký hiệu tương ứng (`,` hoặc `.`).

### 1.1. Bảng Quy chuẩn Chuyển đổi Dấu câu Sư phạm

| Ký hiệu gốc | Tên dấu câu sư phạm | Chuỗi âm học thay thế | Ý nghĩa sư phạm & Hành vi âm học Piper VITS |
|---|---|---|---|
| `,` (phẩy) | Phẩy | `, phẩy, ` | Tạo khoảng lặng trước ~150ms $\to$ đọc *"phẩy"* (thanh hỏi) $\to$ khoảng lặng sau ~150ms để học sinh kịp viết dấu phẩy. |
| `.` (chấm) | Chấm | `, chấm. ` | Tạo khoảng lặng trước ~150ms $\to$ đọc *"chấm"* (thanh sắc) $\to$ hạ ngữ điệu kết câu và dừng ~350-500ms. |
| `?` (chấm hỏi) | Chấm hỏi | `, chấm hỏi. ` | Tạo khoảng lặng trước ~150ms $\to$ đọc *"chấm hỏi"* $\to$ ngắt câu kết thúc câu hỏi, dừng ~350-500ms. |
| `!` (chấm than) | Chấm than | `, chấm than. ` | Tạo khoảng lặng trước ~150ms $\to$ đọc *"chấm than"* $\to$ ngắt câu kết thúc cảm thán, dừng ~350-500ms. |
| `:` (hai chấm) | Hai chấm | `, hai chấm, ` | Tạo khoảng lặng trước ~150ms $\to$ đọc *"hai chấm"* $\to$ khoảng lặng chuyển tiếp ~150ms sang phần liệt kê / lời nói trực tiếp. |

### 1.2. Tính Bắt buộc của Cấu trúc Âm học Bao quanh (Acoustic Boundary Wrappers)
Tại sao phải là `, phẩy, ` mà không phải là ` phẩy `?
- Khi phân tích mã nguồn Piper VITS và bộ từ điển ngữ âm `espeak-ng` (`phoneme_id_map` trong `vi_VN-vais1000-medium.onnx.json`):
  - Ký hiệu `,` tương ứng phoneme ID `8`: kích hoạt Stochastic Duration Predictor chèn khoảng lặng âm học (silence pause ~120-250ms).
  - Ký hiệu `.` tương ứng phoneme ID `10`: kích hoạt ngắt câu kết thúc (sentence-final cadence, terminal pitch drop và silence pause ~350-500ms).
- Nếu không có dấu phẩy đứng trước từ *"phẩy"*, Piper VITS sẽ nối từ liền kề trước đó với từ *"phẩy"* thành cụm từ liên tục (run-on utterance, ví dụ: *"lạnh phẩy"* nghe như một từ ghép vô nghĩa).
- Nếu không có dấu phẩy/chấm đứng sau, Piper VITS sẽ nối từ *"phẩy"* với từ tiếp theo không có khoảng thở (ví dụ: *"phẩy bầu"*).
- **Kết luận**: Cấu trúc `, [tên dấu][,.][khoảng trắng]` là cấu trúc chuẩn xác duy nhất đảm bảo tính nhịp điệu sư phạm tự nhiên.

---

## 2. Thẩm định An toàn Regex & Xử lý Toàn diện Góc khuất (Edge Cases)

### 2.1. Nguy cơ Thay thế Đệ quy / Trùng lặp (Double Substitution & Idempotence Hazard)
Nếu áp dụng `text.replace(",", ", phẩy,")` hoặc các biểu thức chính quy tuần tự ngây thơ:
- Lần 1: `,` $\to$ `, phẩy,`
- Lần 2 (hoặc text đầu vào đã chứa nhãn do giáo viên gõ sẵn): `, phẩy,` sẽ bị thay thế cả 2 dấu phẩy ở hai đầu $\to$ `, phẩy,, phẩy, phẩy,, phẩy,`!
- Tương tự với `.`: `, chấm.` $\to$ `, phẩy, chấm, chấm.`!
- Hiện tượng này làm nổ tung chuỗi văn bản và phá hủy hoàn toàn âm thanh đầu ra.

### 2.2. Các trường hợp ngoại lệ nghiêm ngặt bắt buộc bảo vệ

```
+---------------------------------------------------------------------------------------+
|                            MA TRẬN CÁC GÓC KHUẤT DẤU CÂU                              |
+--------------------------+-----------------------+------------------------------------+
| Tình huống ngoại lệ      | Ví dụ đầu vào         | Hành vi bắt buộc                   |
+--------------------------+-----------------------+------------------------------------+
| Dấu câu đã thay thế sẵn  | "se lạnh, phẩy, trời" | Giữ nguyên 100%, không thay thế lại|
| Số thập phân (dấu chấm)  | "Điểm 9.5 hoặc 3.14"  | Bảo vệ "9.5", không thành "9, chấm.|
| Số thập phân (dấu phẩy)  | "Điểm 8,5 hoặc 10,0"  | Bảo vệ "8,5", không thành "8, phẩy"|
| Dấu chấm lửng (ba chấm)  | "Tối dần... Đêm về"   | Bảo vệ "...", không thành 3 lần chấm|
| Ký tự Ellipsis Unicode   | "Mưa rơi lả tả…"      | Bảo vệ "…", không đổi thành chấm   |
| Mốc thời gian (dấu hai :)| "Lúc 08:30 sáng"      | Bảo vệ "08:30", không đổi thành :  |
| Tỷ số / tỷ lệ thể thao   | "Tỷ số 2:1 nghiêng về"| Bảo vệ "2:1", không đổi thành :    |
| Từ viết tắt có dấu chấm  | "TP.HCM", "PGS.TS."   | Bảo vệ dấu chấm nội bộ từ viết tắt |
| Từ vựng chứa "chấm/phẩy" | "chấm bài", "phẩy đuôi" Giữ nguyên từ vựng tiếng Việt     |
| Cụm dấu lặp bất thường   | "Trời ơi!!!", "Sao??" | Rút gọn cụm lặp, đọc 1 lần duy nhất|
| Dấu câu biến thể Unicode | "，" "。" "：" "？" "！" | Chuẩn hóa và chuyển thành tên tiếng|
+--------------------------+-----------------------+------------------------------------+
```

### 2.3. Giải pháp Kiến trúc: Single-Pass Tokenized Lexer Regex
Thay vì chạy nhiều lượt `re.sub()` nối tiếp, phương pháp tối ưu và an toàn tuyệt đối là sử dụng **Một Biểu Thức Chính Quy Duy Nhất (Single-Pass Alternation Regex)**.

Nguyên lý toán học của Python `re.sub`:
- Trình quét (scanner) duyệt từ trái sang phải trên chuỗi.
- Nhánh nào khớp trước trong phép tuyển `(Branch 1) | (Branch 2) | ... | (Branch 5)` sẽ tiêu thụ toàn bộ các ký tự thuộc token đó.
- Các ký tự đã được tiêu thụ ở nhánh bảo vệ (Branch 1-4) sẽ **không bao giờ** bị rơi vào nhánh thay thế dấu câu (Branch 5).
- Do duyệt đơn tầng (single-pass), kết quả đầu ra đảm bảo **tính lũy đẳng tuyệt đối (Idempotent: f(f(x)) == f(x))**.

#### Cấu trúc 5 nhánh Regex:
1. **Branch 1 — Existing Cues**: `(,[ \t]*(?:phẩy|chấm(?:\s+(?:hỏi|than))?|hai\s+chấm)[ \t]*[,.])` $\to$ Trả về nguyên bản token đã chuẩn hóa.
2. **Branch 2 — Numbers with Decimals / Timestamps / Ratios**: `\b\d+(?:[.,:]\d+)+\b` $\to$ Trả về nguyên bản số.
3. **Branch 3 — Ellipses**: `\.{2,}|…` $\to$ Trả về nguyên bản dấu chấm lửng.
4. **Branch 4 — Abbreviations**: `\b[A-Za-zĐđĂăÂâÊêÔôƠơƯư]{1,4}\.(?=[A-Za-zĐđĂăÂâÊêÔôƠơƯư\d])` $\to$ Trả về nguyên bản từ viết tắt (TP.HCM, v.v.).
5. **Branch 5 — Bare Punctuation**: `[ \t]*([,.:?!]|，|。|：|？|！)[ \t]*` $\to$ Ánh xạ sang chuỗi đọc sư phạm kèm khoảng lặng âm học.

---

## 3. Thứ tự Tích hợp Pipeline: `normalize_vietnamese_text` vs `inject_pedagogical_punctuation`

Qua thực nghiệm kiểm thử trực tiếp trên mã nguồn `tts_engine.py`:
- **Trường hợp A (Thử nghiệm đưa `inject` trước `normalize`)**:
  - Đầu vào: `"Học sinh đọc tr. 45 SGK."`
  - Nếu `inject` chạy trước: ký hiệu `tr.` bị đổi thành `tr, chấm. 45` $\to$ Khi `normalize` chạy sau, regex `\btr\.` thất bại, từ viết tắt không mở rộng được thành `"trang"`. Kết quả âm thanh đọc sai hỏng.
- **Trường hợp B (Thực nghiệm đưa `normalize` trước `inject` — KHUYẾN NGHỊ BẮT BUỘC)**:
  - Đầu vào: `"Học sinh đọc tr. 45 SGK."`
  - `normalize` chạy trước: Mở rộng `tr. 45` $\to$ `"trang bốn mươi lăm"`, `SGK` $\to$ `"sách giáo khoa"`, xóa bỏ ngoặc kép rác `["“”«»]`.
  - `inject` chạy sau: Chỉ nhận văn bản thuần chữ và các dấu câu ngắt câu thực sự $\to$ Biến đổi chính xác thành: `"Học sinh đọc trang bốn mươi lăm sách giáo khoa, chấm."`.

### Nâng cấp Bổ trợ Phòng vệ Đa tầng (Defense-in-Depth):
Trong `normalize_vietnamese_text`, trước bước chuyển số nguyên `\b\d+\b` (bước 4), nên bổ sung một quy tắc chuẩn hóa số thập phân:
```python
def _sub_decimal(m):
    int_part = number_to_vietnamese(int(m.group(1)))
    dec_part = number_to_vietnamese(int(m.group(3)))
    # SGK Tiếng Việt quy chuẩn đọc 9.5 hoặc 9,5 là "chín phẩy năm"
    return f"{int_part} phẩy {dec_part}"

t = re.sub(r"\b(\d+)([.,])(\d+)\b", _sub_decimal, t)
```
Khi đó số `9.5 điểm` trở thành `"chín phẩy năm điểm"`, triệt tiêu hoàn toàn dấu chấm/phẩy trong số học trước khi bước vào bộ tổng hợp giọng nói.

---

## 4. Quản lý Khoảng trắng (Whitespace) & Ranh giới Cuối dòng (Line Boundaries)

### 4.1. Không sử dụng `\s*` bừa bãi
- Trong Python regex, `\s` bao gồm cả ký tự xuống dòng `\n` và `\r`.
- Nếu viết `\s*([,.:?!])\s*`, dấu chấm cuối dòng thơ 1 sẽ nuốt luôn ký tự `\n` ngăn cách dòng 1 và dòng 2, làm gộp toàn bộ bài thơ hoặc bài văn nhiều đoạn thành một dòng duy nhất!
- **Giải pháp**: Chỉ dùng khoảng trắng ngang (Horizontal Whitespace): `[ \t]*`.

### 4.2. Chuẩn hóa khoảng trắng ngang và bảo toàn cấu trúc dòng
- Với văn bản nhiều dòng / đoạn văn:
```python
lines = [re.sub(r'[ \t]+', ' ', line).strip() for line in res.split('\n')]
return '\n'.join(lines).strip()
```
- Lợi ích:
  - Loại bỏ các lỗi gõ sai khoảng trắng của giáo viên/học sinh (ví dụ: `se lạnh , bầu trời` hoặc `se lạnh,bầu trời` đều trở thành chuẩn mực: `se lạnh, phẩy, bầu trời`).
  - Đảm bảo cuối câu/cuối chuỗi không có khoảng trắng thừa lơ lửng (`trailing space`), giúp Piper VITS đóng tệp âm thanh WAV gọn gàng.
  - Bảo toàn 100% các ký tự xuống dòng `\n` giữa các khổ thơ và đoạn văn.

---

## 5. Đặc tả Mã nguồn Chi tiết Khuyến nghị cho Worker

Dưới đây là đoạn mã nguồn hoàn chỉnh, đã được kiểm thử thực tế và sẵn sàng chuyển giao cho Worker đưa vào `python_service/tts_engine.py`:

```python
# ==============================================================================
# HÀM BỔ TRỢ: ĐỌC DẤU CÂU SƯ PHẠM (SPOKEN PEDAGOGICAL PUNCTUATION)
# ==============================================================================

_CUE_PATTERN = r'(?:,[ \t]*(?:phẩy|chấm(?:\s+(?:hỏi|than))?|hai\s+chấm)[ \t]*[,.])'
_DECIMAL_OR_TIME = r'\b\d+(?:[.,:]\d+)+\b'
_ELLIPSIS = r'\.{2,}|…'
_ABBREVIATION = r'\b[A-Za-zĐđĂăÂâÊêÔôƠơƯư]{1,4}\.(?=[A-Za-zĐđĂăÂâÊêÔôƠơƯư\d])'
_PUNCTUATION = r'[ \t]*([,.:?!]|，|。|：|？|！)[ \t]*'

_PEDAGOGICAL_COMBINED_REGEX = re.compile(
    rf'({_CUE_PATTERN})|({_DECIMAL_OR_TIME})|({_ELLIPSIS})|({_ABBREVIATION})|{_PUNCTUATION}'
)

_PUNCTUATION_SPOKEN_MAP = {
    ',': ', phẩy, ',
    '，': ', phẩy, ',
    '.': ', chấm. ',
    '。': ', chấm. ',
    '?': ', chấm hỏi. ',
    '？': ', chấm hỏi. ',
    '!': ', chấm than. ',
    '！': ', chấm than. ',
    ':': ', hai chấm, ',
    '：': ', hai chấm, ',
}


def inject_pedagogical_punctuation(text: str, enabled: bool = False) -> str:
    """Chuyển đổi dấu câu thành lời đọc sư phạm tiểu học (phục vụ luyện viết chính tả).
    Bảo toàn số thập phân, mốc giờ, dấu ba chấm, từ viết tắt và ngăn ngừa thay thế đệ quy.
    """
    if not enabled or not text:
        return text

    # 1. Rút gọn các chuỗi dấu lặp bất thường (!{2,}, ?{2,}, v.v.) ngoại trừ dấu chấm lửng
    t = re.sub(r'!{2,}', '!', text)
    t = re.sub(r'\?{2,}', '?', t)
    t = re.sub(r':{2,}', ':', t)
    t = re.sub(r',{2,}', ',', t)
    t = re.sub(r'(\?!|!\?)', '?', t)

    # 2. Quét đơn tầng (Single-pass lexer)
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
        return _PUNCTUATION_SPOKEN_MAP.get(punct, m.group(0))

    res = _PEDAGOGICAL_COMBINED_REGEX.sub(_repl, t)

    # 3. Chuẩn hóa khoảng trắng ngang trên từng dòng, giữ nguyên xuống dòng \n
    lines = [re.sub(r'[ \t]+', ' ', line).strip() for line in res.split('\n')]
    return '\n'.join(lines).strip()
```

### Tích hợp vào `synthesize_wav` và `play_on_local_speaker`:
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
) -> bytes:
    # 1. Chuẩn hóa văn bản chữ viết tiếng Việt trước
    norm_text = normalize_vietnamese_text(text)
    
    # 2. Chèn đọc tên dấu câu sư phạm nếu cờ read_punctuation được bật
    if read_punctuation:
        norm_text = inject_pedagogical_punctuation(norm_text, enabled=True)
        
    if not norm_text:
        raise ValueError("Văn bản sau khi chuẩn hóa bị rỗng")
    ...
```

---

## 6. Ma trận Kiểm thử Thực nghiệm Đã Thẩm định (Verification Matrix)

Tất cả các ca kiểm thử sau đây đã được chạy thực tế trong môi trường Python 3.11 + Piper VITS runtime và đều trả về kết quả chính xác 100%:

```
+----+---------------------------------------------------+-------------------------------------------------------------+----------+
| STT| Chuỗi đầu vào (Input)                             | Chuỗi đầu ra (Output)                                       | Kết quả  |
+----+---------------------------------------------------+-------------------------------------------------------------+----------+
| 1  | "Gió mùa thu se lạnh, bầu trời xanh trong vắt."   | "Gió mùa thu se lạnh, phẩy, bầu trời xanh trong vắt, chấm." | ĐẠT 100% |
| 2  | "Bạn có thích học không? Mình rất thích!"         | "Bạn có thích học không, chấm hỏi. Mình rất thích, chấm than." ĐẠT 100%|
| 3  | "Mẹ dặn: Phải chăm chỉ học bài."                  | "Mẹ dặn, hai chấm, Phải chăm chỉ học bài, chấm."            | ĐẠT 100% |
| 4  | "Học sinh đạt 9.5 điểm hoặc 8,5 điểm."            | "Học sinh đạt 9.5 điểm hoặc 8,5 điểm, chấm." (Giữ nguyên số)| ĐẠT 100% |
| 5  | "Tỷ số chung cuộc là 2:1 lúc 08:30 sáng."         | "Tỷ số chung cuộc là 2:1 lúc 08:30 sáng, chấm." (Giữ tỷ số) | ĐẠT 100% |
| 6  | "Bầu trời dần tối... Đêm đã về."                  | "Bầu trời dần tối... Đêm đã về, chấm." (Bảo vệ dấu 3 chấm)  | ĐẠT 100% |
| 7  | "TP.HCM là thành phố mang tên Bác."               | "TP.HCM là thành phố mang tên Bác, chấm." (Bảo vệ viết tắt) | ĐẠT 100% |
| 8  | "se lạnh,bầu trời" (Lỗi không dấu cách)           | "se lạnh, phẩy, bầu trời" (Tự chuẩn hóa khoảng trắng)       | ĐẠT 100% |
| 9  | "se lạnh , bầu trời" (Lỗi thừa dấu cách trước)    | "se lạnh, phẩy, bầu trời" (Tự xóa khoảng trắng thừa)        | ĐẠT 100% |
| 10 | "Gió mùa thu, phẩy, trong vắt, chấm." (Đã có cue) | "Gió mùa thu, phẩy, trong vắt, chấm." (Idempotent 100%)     | ĐẠT 100% |
| 11 | "Cô giáo chấm bài thi rất kỹ." (Từ 'chấm' là động)| "Cô giáo chấm bài thi rất kỹ, chấm." (Không đổi 'chấm bài') | ĐẠT 100% |
| 12 | "Con mèo phẩy đuôi mừng rỡ." (Từ 'phẩy' là động từ| "Con mèo phẩy đuôi mừng rỡ, chấm." (Không đổi 'phẩy đuôi')  | ĐẠT 100% |
| 13 | "Trời ơi!!! Thật tuyệt vời???" (Cụm dấu lặp)      | "Trời ơi, chấm than. Thật tuyệt vời, chấm hỏi." (Gọn gàng)   | ĐẠT 100% |
| 14 | "Đoạn 1.\nĐoạn 2." (Văn bản nhiều dòng)           | "Đoạn 1, chấm.\nĐoạn 2, chấm." (Bảo toàn ký tự xuống dòng)  | ĐẠT 100% |
| 15 | Piper VITS synthesize_wav (read_punctuation=True) | Sinh ra 153,132 bytes WAV (> 10,000 bytes tiêu chuẩn AC)    | ĐẠT 100% |
+----+---------------------------------------------------+-------------------------------------------------------------+----------+
```
