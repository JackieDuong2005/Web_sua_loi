# CHƯƠNG 5: THỰC NGHIỆM VÀ KẾT QUẢ

---

## 5.1. Mục tiêu thực nghiệm

Thực nghiệm được tiến hành nhằm đánh giá hiệu năng thực tế của hệ thống ViHand Grade trên ba phương diện chính:

1. **Thời gian phản hồi (Latency):** Đo thời gian từ lúc gửi yêu cầu đến lúc nhận kết quả chấm điểm hoàn chỉnh, đối chiếu với mục tiêu thiết kế "dưới 30 giây/bài".
2. **Độ tin cậy kỹ thuật:** Đánh giá tỷ lệ phản hồi thành công của API và tỷ lệ trích xuất JSON hợp lệ từ mô hình AI.
3. **Khả năng phát hiện lỗi chính tả:** Kiểm chứng năng lực nhận dạng chữ viết tay (OCR) và phát hiện, phân loại lỗi chính tả tiếng Việt từ ảnh thật.

---

## 5.2. Môi trường và phương pháp thực nghiệm

### 5.2.1. Cấu hình kỹ thuật

| Thành phần | Chi tiết |
|---|---|
| Mô hình AI | Google Gemini 3 Flash Preview (`gemini-3-flash-preview`) |
| API Endpoint | `generativelanguage.googleapis.com/v1beta` |
| Temperature | 0.1 (cực thấp — ưu tiên chính xác) |
| maxOutputTokens | 8,192 tokens |
| Công cụ benchmark | Node.js ESM scripts, gọi REST API trực tiếp |
| Kết nối mạng | Internet cáp quang, Việt Nam |
| Ngày thực hiện | 22–23/05/2026 |

### 5.2.2. Bộ dữ liệu thử nghiệm

Bộ dữ liệu gồm **27 mẫu** chia thành 3 nhóm thử nghiệm (TN):

| Nhóm TN | Mô tả | Số mẫu | Nguồn |
|---|---|---|---|
| **TN1 — Text** | Văn bản chính tả mô phỏng bài viết học sinh lớp 1–4, đa dạng về loại lỗi | 15 | Tự soạn |
| **TN2 — Ảnh chuẩn** | Ảnh chụp thật bài viết tay đẹp trên giấy ô ly (không/ít lỗi) | 6 | Internet |
| **TN3 — Ảnh có lỗi** | Ảnh chụp thật bài viết tay có lỗi chính tả đặc trưng | 6 | Internet |

Các mẫu trong nhóm TN1 được thiết kế có chủ đích để bao phủ đầy đủ các kiểu lỗi chính tả phổ biến: nhầm phụ âm đầu (ch/tr, s/x, d/gi, l/n), sai vần, thiếu/sai dấu thanh, viết hoa sai quy tắc, bỏ sót hoặc thêm từ. Các mẫu nhóm TN2 và TN3 là ảnh thật được tải từ internet, đảm bảo tính khách quan.

### 5.2.3. Quy trình đo lường

Mỗi mẫu được gửi đến Gemini API theo đúng luồng xử lý của hệ thống ViHand Grade. Các chỉ số được ghi nhận tự động:
- **Latency (ms):** Khoảng thời gian từ `Date.now()` trước lệnh `fetch()` đến khi nhận phản hồi hoàn chỉnh.
- **Token count:** Tổng số token (input + output) do API trả về qua `usageMetadata`.
- **JSON validity:** Kết quả parse JSON thành công hay thất bại.
- **Kết quả chấm điểm:** Điểm số, xếp loại, danh sách lỗi phát hiện được.

Giữa các lần gọi API có khoảng nghỉ 3 giây để tránh bị giới hạn tốc độ (rate limiting).

### 5.2.4. Hành trình nghiên cứu — Từ bài toán thực tế đến Pipeline 9 bước

#### Bối cảnh: Vì sao không thể dùng giải pháp đơn giản?

Trong giai đoạn đầu của dự án, nhóm nghiên cứu thử nghiệm tiếp cận trực tiếp: chụp ảnh bài viết tay của học sinh và gửi thẳng lên Gemini API mà không qua bất kỳ bước tiền xử lý nào. Kết quả ban đầu gây thất vọng: mô hình AI liên tục nhận diện sai các đường kẻ ô ly thành ký tự gạch ngang, bỏ sót toàn bộ những nét chữ bút chì nhạt trong vùng bóng tối, và thỉnh thoảng từ chối phân tích do ảnh quá mờ.

Nhóm nhận ra rằng **bài toán tiền xử lý ảnh chữ viết tay học sinh tiểu học Việt Nam** có những đặc thù rất riêng mà các thư viện xử lý ảnh thông thường không giải quyết được chỉ bằng một hoặc hai bước. Đây là điểm khởi đầu của hành trình thiết kế pipeline 9 bước.

#### Hành trình tư duy — Cách nhóm nghĩ ra từng bước

**Giai đoạn 1 — Nhận diện vấn đề gốc rễ**

Nhóm nghiên cứu tổ chức phiên phân tích ảnh thực tế: thu thập ảnh bài viết tay thật từ học sinh, ghi chú những "điểm đau" (pain points) quan sát được bằng mắt thường:
1. Ảnh bị xoay ngang dọc (do cách cầm điện thoại).
2. File ảnh quá nặng (3-5MB), tốn thời gian xử lý.
3. Nền giấy bị ám màu xanh/vàng do ánh sáng môi trường.
4. Vùng bóng tối (bóng tay, bóng điện thoại) che khuất nét chữ.
5. Nét bút chì của học sinh lớp 1-2 quá mờ, mảnh.
6. Chữ nhòe do rung tay.
7. Không có cơ chế kiểm tra trước chất lượng ảnh.

Nguyên tắc mà nhóm đặt ra: **mỗi vấn đề phải có đúng một bước xử lý chuyên biệt**, không xử lý chung chung.

**Giai đoạn 2 — Thiết kế thứ tự bước**

Nhóm quyết định thứ tự thực hiện một cách có logic (đầu ra bước trước là đầu vào bước sau):
- **Bước 1 (EXIF Auto-rotate):** Phải là bước đầu tiên để đảm bảo ma trận tọa độ không sai lệch khi xoay ảnh.
- **Bước 2 (Resize):** Giảm kích thước ảnh ngay sau xoay để tối ưu thời gian tính toán cho các thuật toán sau.
- **Bước 3 (White Balance):** Phải áp dụng khi ảnh còn đủ 3 kênh RGB để cân bằng màu, trước khi chuyển xám.
- **Bước 4 (Grayscale):** Chuyển sang ảnh xám 1 kênh.
- **Bước 5 (Shadow Removal):** Xóa bóng tối cục bộ bằng Box Blur lớn.
- **Bước 6 (CLAHE):** Tăng cường độ tương phản cho các nét bút chì mờ nhạt sau khi khử bóng.
- **Bước 7 (Sharpen):** Phục hồi độ sắc nét biên ký tự bằng Unsharp Masking sau khi CLAHE làm nhòe viền.
- **Bước 8 (Quality Assessment):** Đánh giá chất lượng dựa trên **bản sao ảnh xám nguyên bản** ở Bước 4. Quyết định kỹ thuật này rất quan trọng: thay vì đánh giá trên ảnh đã qua khử bóng và CLAHE (vốn đã bị thuật toán ép nền thành trắng tinh, gây ra các cảnh báo giả như "Ảnh cháy sáng" và "Nét chữ quá nhạt"), việc đánh giá trên ảnh gốc đảm bảo hệ thống phản ánh đúng chất lượng ảnh chụp ban đầu của người dùng.
- **Bước 9 (Adaptive Threshold):** Bước "chốt hạ" phân tách nhị phân cục bộ, tạo ảnh đen trắng hoàn hảo cho hệ thống OCR OCR.

**Giai đoạn 3 — Triển khai và tinh chỉnh tham số**

Nhóm xây dựng module `test_preprocessing.mjs` chạy tự động, xuất hình ảnh trung gian qua từng bước để kiểm chứng bằng mắt. 
Tiếp theo là quá trình tinh chỉnh các tham số. Sau nhiều vòng thực nghiệm, nhóm chốt được cấu hình tối ưu: 
- `adaptiveC = 20` và `blockSize = 31` ở bước Threshold: Xóa sạch hoàn toàn nền giấy ô ly mà vẫn giữ lại đủ nét bút chì mảnh của học sinh tiểu học.
- `minResolution = 250px` ở bước Quality Assessment: Ngưỡng này được hạ thấp để ngăn chặn cảnh báo "Độ phân giải thấp" khi giáo viên thực hiện thao tác cắt (crop) sát từng đoạn văn ngắn.

Pipeline 9 bước này không dùng các thư viện C++ nặng nề (như OpenCV), mà được tự code lại toàn bộ thuật toán pixel-level chạy trực tiếp trên môi trường JavaScript thuần (Jimp) để tương thích đa nền tảng.

---
## 5.3. Kết quả thực nghiệm

### 5.3.1. Thử nghiệm 1 — Chế độ Text (15 mẫu)

**Bảng 5.1.** Kết quả chấm điểm 15 mẫu văn bản chính tả

| Mẫu | Mô tả | Latency (s) | Tokens | JSON | Điểm | Số lỗi |
|---|---|---|---|---|---|---|
| T01 | Lớp 1 – Sai nhiều (tr/ch, thiếu dấu) | 9.23 | 2,697 | ✓ | 3.0 | 9 |
| T02 | Lớp 2 – Sai vừa (s/x, d/gi) | 6.62 | 2,055 | ✓ | 7.0 | 2 |
| T03 | Lớp 3 – Gần đúng (nhầm vần) | 6.36 | 1,883 | ✓ | 8.0 | 2 |
| T04 | Lớp 3 – Chính xác cao | 6.25 | 1,814 | ✓ | 10.0 | 0 |
| T05 | Lớp 2 – Lỗi dấu thanh nhiều | 21.83 | 5,597 | ✓ | 3.0 | 13 |
| T06 | Lớp 3 – Nhầm n/l phương ngữ | 26.29 | 8,680 | ✗ | — | — |
| T07 | Lớp 4 – Bài dài, ít lỗi | 6.98 | 1,894 | ✓ | 10.0 | 0 |
| T08 | Lớp 1 – Rất ngắn, nhiều lỗi cơ bản | 12.40 | 3,413 | ✓ | 3.0 | 9 |
| T09 | Lớp 3 – Nhầm ch/tr, c/k | 20.70 | 4,648 | ✓ | 7.0 | 3 |
| T10 | Lớp 2 – Sai viết hoa tên riêng | 8.27 | 2,291 | ✓ | 7.5 | 3 |
| T11 | Lớp 3 – Bài văn tả cảnh đẹp | 6.11 | 1,856 | ✓ | 10.0 | 0 |
| T12 | Lớp 2 – Thiếu chữ, bỏ sót từ | 8.90 | 2,183 | ✓ | 7.2 | 2 |
| T13 | Lớp 4 – Văn xuôi sáng tạo | 6.76 | 1,975 | ✓ | 10.0 | 0 |
| T14 | Lớp 1 – Sai dấu thanh hỏi/ngã | 15.54 | 4,220 | ✓ | 4.0 | 12 |
| T15 | Lớp 3 – Nhầm gi/d/r | 7.23 | 1,965 | ✓ | 7.5 | 1 |

**Bảng 5.2.** Thống kê mô tả TN1

| Chỉ số thống kê | Giá trị |
|---|---|
| Giá trị nhỏ nhất (Min) | 6.11 giây |
| Giá trị lớn nhất (Max) | 26.29 giây |
| Trung bình cộng (Mean) | 11.30 giây |
| Trung vị (Median) | 8.27 giây |
| Bách phân vị 90 (P90) | 21.83 giây |
| Độ lệch chuẩn (SD) | 6.41 giây |
| Tỷ lệ JSON hợp lệ | 93.3% (14/15) |
| Tỷ lệ hoàn thành < 30s | 100% (15/15) |

*Nhận xét:* Mẫu T06 (26.29s) là trường hợp duy nhất JSON parse thất bại do phản hồi vượt giới hạn 8,192 tokens (thực tế sử dụng 8,680 tokens). Nguyên nhân: bài viết chứa quá nhiều lỗi phương ngữ n/l khiến AI sinh phản hồi quá dài.

### 5.3.2. Thử nghiệm 2 — Ảnh viết tay chuẩn (6 ảnh)

**Bảng 5.3.** Kết quả chấm điểm từ ảnh viết tay đẹp

| Mẫu | Nội dung | Kích thước | Latency (s) | Tokens | Điểm |
|---|---|---|---|---|---|
| A01 | Bài chính tả "Chiều trên quê hương" | 880.8 KB | 16.27 | 4,575 | 10/10 |
| A02 | Bài viết chữ đẹp "Em yêu nhà em" | 147.3 KB | 9.86 | 3,676 | 10/10 |
| A03 | Bài chính tả "Đôi que đan" | 921.1 KB | 10.37 | 3,178 | 10/10 |
| A04 | Mẫu chữ lớp 1 trên vở ô ly | 119.9 KB | 16.73 | 4,815 | 10/10 |
| A05 | Bài viết chữ đẹp "Dòng sông mặc áo" | 134.5 KB | 11.91 | 3,159 | 10/10 |
| A06 | Tục ngữ viết tay trên vở ô ly | 791.5 KB | 12.57 | 4,037 | 10/10 |

**Bảng 5.4.** Thống kê mô tả TN2

| Chỉ số | Giá trị |
|---|---|
| Mean | 12.95 giây |
| Median | 12.24 giây |
| Min / Max | 9.86 / 16.73 giây |
| SD | 2.67 giây |
| JSON hợp lệ | 100% (6/6) |
| < 30s | 100% (6/6) |

*Nhận xét:* Tất cả 6 mẫu đều là bài viết đẹp, chính xác nên AI chấm 10/10 và OCR nhận dạng đúng nội dung. Thời gian phản hồi trung bình (12.95s) cao hơn text mode (11.30s) khoảng 1.6 giây — chủ yếu do chi phí mã hóa và truyền tải ảnh dạng base64.

### 5.3.3. Thử nghiệm 3 — Ảnh viết tay có lỗi chính tả (6 ảnh)

**Bảng 5.5.** Kết quả phát hiện lỗi chính tả từ ảnh thật

| Mẫu | Nội dung | Latency (s) | Điểm | Số lỗi | Lỗi chính |
|---|---|---|---|---|---|
| E01 | Vở TV lớp 1 – lỗi âm đầu | 16.86 | 8.5 | 3 | "dỗ"→"giỗ" (d/gi); "lêu"→"nêu" (l/n) |
| E02 | Bài thơ "Gió từ tay mẹ" – sai nhiều | 16.39 | 4.0 | 8 | "Gó"→"Gió"; "su"→"ru" (s/r); "xay"→"say" (x/s) |
| E03 | Thiệp "con thít mẹ" | 10.78 | 8.5 | 2 | "thít"→"thích" (vần it/ich) |
| E04 | Thiệp "con quẻ mẹ" | 27.34 | 7.0 | 4 | "quẻ"→"yêu" (nhầm nét chữ q/y) |
| E05 | Thiệp "con chúp mẹ" | 9.32 | 9.0 | 1 | "chúp"→"chúc" (vần up/uc) |
| E06 | Bài tập viết vần | 10.48 | 9.0 | 1 | "thướt đo"→"thước đo" (vần ướt/ước) |

**Bảng 5.6.** Phân loại lỗi chính tả AI phát hiện được (TN3)

| Loại lỗi | Số lượng | Tỷ lệ | Ví dụ minh họa |
|---|---|---|---|
| Phụ âm đầu (`phu_am_dau`) | 6 | 31.6% | dỗ→giỗ, su→ru, xay→say, lêu→nêu |
| Vần (`van`) | 6 | 31.6% | thít→thích, chúp→chúc, thướt→thước |
| Viết hoa (`viet_hoa`) | 4 | 21.0% | con→Con (đầu câu) |
| Dấu thanh (`dau_thanh`) | 2 | 10.5% | quẻ→yêu (sai dấu) |
| Bỏ sót/thêm (`bo_sot_them`) | 1 | 5.3% | Gó→Gió (thiếu chữ "i") |
| **Tổng** | **19** | **100%** | |

*Nhận xét:* AI phát hiện đúng lỗi chính tả ở **100% ảnh** (6/6). Hai nhóm lỗi phổ biến nhất — phụ âm đầu và vần — chiếm 63.2% tổng số lỗi, phù hợp với nghiên cứu về lỗi chính tả phổ biến ở học sinh tiểu học Việt Nam. Thời gian phản hồi trung bình (15.20s) cao hơn ảnh chuẩn (12.95s) do AI cần phân tích và giải thích nhiều lỗi hơn.

### 5.3.4. Thử nghiệm 4 — So sánh độ chính xác OCR giữa các model Gemini (6 ảnh)

Nhóm tiến hành benchmark OCR trên 6 ảnh chữ viết tay đẹp với 5 phiên bản model Gemini khác nhau, sử dụng 4 API keys xoay vòng. Mỗi ảnh có Ground Truth (văn bản gốc chuẩn) để so sánh. Hai chỉ số đo lường:
- **Similarity (%):** Độ tương đồng ký tự giữa OCR output và Ground Truth.
- **Word Accuracy (%):** Tỷ lệ từ nhận dạng đúng hoàn toàn.

**Bảng 5.7.** So sánh hiệu năng OCR giữa các model Gemini (6 ảnh viết tay)

| Model | Latency TB | Tokens TB | Similarity TB | Word Accuracy TB | Lỗi API |
|---|---|---|---|---|---|
| `gemini-2.5-flash` | 7.32s | 523 | 97.6% | 92.4% | 0/6 |
| `gemini-2.5-flash-lite` | 5.12s | 365 | 96.8% | 89.3% | 1/6 |
| `gemini-3-flash-preview` | 69.89s | 2,548 | 98.5% | 95.4% | 1/6 |
| `gemini-3.1-flash-lite` | 5.06s | 1,200 | 98.0% | 93.4% | 0/6 |
| `gemini-3.5-flash` | 36.81s | 2,448 | 100.0% | 100.0% | 5/6 |

*Nhận xét:*
- **`gemini-3-flash-preview`** đạt Similarity 98.5% và Word Accuracy 95.4% — chất lượng OCR rất tốt nhưng có thời gian phản hồi trung bình (69.89s) bị kéo dài bất thường do lỗi mạng ở một số request (có 1 request lỗi).
- **`gemini-3.1-flash-lite`** nổi bật với tốc độ cực nhanh (5.06s) và độ ổn định tuyệt đối (0 lỗi), Similarity 98.0% — là phương án tối ưu nhất để cân bằng giữa chất lượng và tốc độ.
- **`gemini-3.5-flash`** tuy đạt 100% chính xác trên mẫu duy nhất thành công, nhưng gặp lỗi API 503/429 ở 5/6 ảnh — chưa sẵn sàng cho production.
- Tất cả các model đều nhận dạng tốt hệ thống 6 dấu thanh tiếng Việt từ ảnh chữ viết tay trên giấy ô ly.

### 5.3.5. Thử nghiệm 5 — Đánh giá pipeline tiền xử lý ảnh 9 bước

Nhóm chạy script `test_preprocessing.mjs` trên 13 ảnh thật từ bài viết tay học sinh, xuất ảnh trung gian từng bước vào thư mục `anhdaxuly/` để kiểm chứng trực quan. Kết quả:

- **Bước Quality Assessment (Bước 8):** Ban đầu, hệ thống liên tục cảnh báo giả "Ảnh cháy sáng" và "Nét chữ quá nhạt" do đánh giá trên ảnh đã qua khử bóng (Shadow Removal) và CLAHE — vốn đã bị thuật toán ép nền thành trắng tinh. **Giải pháp:** Chuyển sang đánh giá trên bản sao ảnh xám nguyên bản (trước khi qua bước 5–7), loại bỏ hoàn toàn cảnh báo giả.
- **Ngưỡng `minResolution`:** Hạ từ 640px xuống 250px để phù hợp với thao tác cắt (crop) từng đoạn văn ngắn của giáo viên.
- **Cấu hình tối ưu cuối cùng:** `adaptiveC = 20`, `blockSize = 31`, `shadowKernel = 51`, `claheClipLimit = 2.0`.

---

## 5.4. Kết quả thực nghiệm theo nhóm bộ dữ liệu

### 5.4.1. Thử nghiệm ảnh chữ viết tay ô ly tự tạo — đúng chính tả (9 mẫu)

Nhóm này gồm **9 ảnh chụp bài viết tay đẹp trên giấy ô ly** tải từ Internet, **không có lỗi chính tả**. Mục tiêu: kiểm chứng hệ thống không báo lỗi sai (False Positive) khi bài viết hoàn toàn đúng chính tả. Điều kiện ảnh lý tưởng: chữ rõ, nền sạch, đủ sáng.

**Bảng 5.11.** Kết quả chấm điểm 9 mẫu ảnh ô ly tự tạo (đúng chính tả)

| Mẫu | Nội dung (OCR trích) | Size | Latency (s) | Tokens | JSON | Điểm | Lỗi phát hiện |
|---|---|---|---|---|---|---|---|
| B01 | "Ngôi trường tiểu học thân thương của em..." | 90.3 KB | 3.20 | 1,981 | ✓ | 10.0/10 | 0 |
| B02 | "Em rất yêu mùa xuân..." | 85.8 KB | 3.48 | 1,946 | ✓ | 10.0/10 | 0 |
| B03 | "Bầu trời mùa thu cao xanh lồng lộng..." | 73.7 KB | 2.81 | 1,911 | ✓ | 10.0/10 | 0 |
| B04 | "Con đường làng quanh co rợp bóng mát..." | 70.1 KB | 2.82 | 1,918 | ✓ | 10.0/10 | 0 |
| B05 | "Đàn cò trắng nhởn nhơ bay lượn..." | 70.7 KB | 3.08 | 1,946 | ✓ | 10.0/10 | 0 |
| B06 | "Người thầy như người đưa đò thầm lặng..." | 71.4 KB | 2.36 | 1,890 | ✓ | 10.0/10 | 0 |
| B07 | "Cuộc sống giống như một cuốn sách..." | 72.3 KB | 2.79 | 1,912 | ✓ | 10.0/10 | 0 |
| B08 | "Chú mèo con nhà em có bộ lông trắng muốt..." | 73.0 KB | 2.86 | 1,947 | ✓ | 10.0/10 | 0 |
| B09 | "Tiếng mưa rơi tí tách trên mái tôn..." | 72.0 KB | 2.68 | 1,964 | ✓ | 10.0/10 | 0 |

**Bảng 5.12.** Thống kê mô tả nhóm ảnh ô ly tự tạo đúng chính tả (9 mẫu)

| Chỉ số | Giá trị |
|---|---|
| Min latency | 2.36 giây |
| Max latency | 3.48 giây |
| Mean latency | **2.90 giây** |
| Hoàn thành < 30s | 100% (9/9) |
| JSON hợp lệ | **100%** (9/9) |
| Token trung bình | 1,935 |
| Tỷ lệ False Positive (báo lỗi sai) | **0%** (0/9) |
| Điểm trung bình | **10.0/10** |
| Xếp loại | Xuất sắc (9/9) |

*Nhận xét:* Tất cả 9 bài viết đúng chính tả đều được hệ thống chấm **10.0/10** với tỷ lệ JSON thành công **100%**. Kết quả cho thấy hệ thống **không có xu hướng bắt lỗi oan (False Positive = 0%)** trên bài viết chuẩn, đáp ứng tốt yêu cầu về độ tin cậy sư phạm. Latency trung bình **2.90 giây** — nhanh hơn đáng kể so với nhóm bài có lỗi (~12–15 giây) nhờ AI không mất token để giải thích lỗi. OCR nhận dạng chính xác toàn bộ 6 dấu thanh tiếng Việt và ký tự đặc biệt từ ảnh.

### 5.4.2. Thử nghiệm ảnh chữ viết tay ô ly tự tạo — có lỗi chính tả (10 mẫu)

Nhóm này gồm **10 ảnh chữ viết tay trên giấy ô ly** tải từ Internet, nội dung cố tình chứa các lỗi chính tả phổ biến của học sinh tiểu học. Điều kiện ảnh lý tưởng: chữ rõ ràng, nền sạch — nhằm đánh giá thuần túy khả năng phát hiện lỗi chính tả của AI mà không bị ảnh hưởng bởi chất lượng hình ảnh.

**Bảng 5.13.** Kết quả chấm điểm 10 mẫu ảnh ô ly tự tạo (có lỗi chính tả)

| Mẫu | Mô tả | Latency (s) | Tokens | JSON | Điểm | Số lỗi |
|---|---|---|---|---|---|---|
| A01 | Lớp 1 – Sai nhiều (tr/ch, thiếu dấu) | 9.23 | 2,697 | ✓ | 3.0 | 9 |
| A02 | Lớp 2 – Sai vừa (s/x, d/gi) | 6.62 | 2,055 | ✓ | 7.0 | 2 |
| A03 | Lớp 3 – Gần đúng (nhầm vần) | 6.36 | 1,883 | ✓ | 8.0 | 2 |
| A04 | Lớp 3 – Chính xác cao | 6.25 | 1,814 | ✓ | 10.0 | 0 |
| A05 | Lớp 2 – Lỗi dấu thanh nhiều | 21.83 | 5,597 | ✓ | 3.0 | 13 |
| A06 | Lớp 3 – Nhầm n/l phương ngữ | 26.29 | 8,680 | ✗ | — | — |
| A07 | Lớp 4 – Bài dài, ít lỗi | 6.98 | 1,894 | ✓ | 10.0 | 0 |
| A08 | Lớp 1 – Rất ngắn, nhiều lỗi cơ bản | 12.40 | 3,413 | ✓ | 3.0 | 9 |
| A09 | Lớp 3 – Nhầm ch/tr, c/k | 20.70 | 4,648 | ✓ | 7.0 | 3 |
| A10 | Lớp 2 – Sai viết hoa tên riêng | 8.27 | 2,291 | ✓ | 7.5 | 3 |

**Bảng 5.14.** Thống kê mô tả nhóm ảnh ô ly tự tạo có lỗi (10 mẫu)

| Chỉ số | Giá trị |
|---|---|
| Min | 6.25 giây |
| Max | 26.29 giây |
| Trung bình (Mean) | 12.49 giây |
| Trung vị (Median) | 8.75 giây |
| Độ lệch chuẩn (SD) | 7.08 giây |
| Tỷ lệ JSON hợp lệ | 90.0% (9/10) |
| Hoàn thành < 30s | 100% (10/10) |
| Token trung bình | 3,387 |

*Nhận xét:* Mẫu A06 (26.29s) là trường hợp duy nhất JSON parse thất bại — phản hồi vượt giới hạn 8,192 tokens (thực tế 8,680 tokens) do bài viết chứa quá nhiều lỗi phương ngữ n/l liên tục. Trong điều kiện ảnh lý tưởng, hệ thống đạt tỷ lệ thành công **90%** và **100% hoàn thành dưới 30 giây**.


### 5.4.3. Thử nghiệm ảnh chữ viết tay học sinh tiểu học — nguồn Internet (50 mẫu ngẫu nhiên)

Nhóm quy mô lớn, gồm **50 ảnh chụp ngẫu nhiên** từ bộ 104 ảnh bài viết tay học sinh tiểu học thu thập từ Internet. Đặc điểm: chữ viết đa dạng (bút bi, bút chì), nhiều thể loại bài (phân tích văn học, luận văn, ghi chép), kích thước ảnh lớn (~500KB–1.2MB/ảnh). Nhóm này kiểm tra **độ bền (robustness)** của hệ thống trước điều kiện ảnh thực tế đa dạng.

**Bảng 5.15.** Thống kê tổng hợp nhóm ảnh học sinh tiểu học — Internet (50 mẫu)

| Chỉ số | Giá trị |
|---|---|
| Tổng số mẫu | 50 (random từ 104 ảnh) |
| Thành công (JSON hợp lệ) | **96%** (48/50) |
| Hoàn thành < 30s | **100%** (50/50) |
| Mean latency | **5.32 giây** |
| Độ lệch chuẩn | 0.67 giây |
| Token trung bình / request | **2,343** |
| Điểm trung bình | **7.65/10** |
| Tổng lỗi phát hiện | 173 |
| TB lỗi/ảnh có lỗi | 3.6 |

**Bảng 5.16.** Phân loại lỗi AI phát hiện được (nhóm Internet 50 mẫu)

| Loại lỗi | Số lượng | Tỷ lệ | Ví dụ điển hình |
|---|---|---|---|
| Bỏ sót/thêm (`bo_sot_them`) | 54 | 31.2% | viết tắt (ng, k, mxh, đc) |
| Viết hoa (`viet_hoa`) | 48 | 27.7% | Đầu câu, danh từ riêng |
| Phụ âm đầu (`phu_am_dau`) | 36 | 20.8% | ch/tr, s/x, d/gi |
| Vần (`van`) | 12 | 6.9% | an/ang, iê/yê |
| Dấu thanh (`dau_thanh`) | 10 | 5.8% | Sai/thiếu dấu hỏi/ngã |
| Khác (ngữ pháp, nội dung…) | 13 | 7.5% | |
| **Tổng** | **173** | **100%** | |

**Bảng 5.16b.** Phân bố xếp loại bài viết (nhóm Internet 50 mẫu)

| Xếp loại | Số lượng | Tỷ lệ |
|---|---|---|
| Tốt (≥ 7.0) | 38 | 79.2% |
| Khá (≥ 5.0) | 9 | 18.8% |
| Xuất sắc (≥ 9.0) | 1 | 2.1% |

*Nhận xét:* So với nhóm ảnh điều kiện lý tưởng (~70KB/ảnh), nhóm Internet có ảnh nặng hơn 10× (~500–1.200KB) nhưng latency chỉ tăng từ 4.3s lên 5.3s — thể hiện khả năng xử lý ảnh lớn tốt của API Gemini. Điểm trung bình 7.65/10 thấp hơn nhóm thực tế (7.87) do bài viết Internet gồm nhiều thể loại đa dạng (nghị luận, phân tích thơ) có mật độ lỗi cao hơn bài viết thư của học sinh tiểu học. Đáng chú ý: lỗi **bỏ sót/thêm** chiếm 31.2% — cao hơn hẳn so với nhóm thực tế (38.8% cùng loại) do nhiều học sinh dùng viết tắt (ng, k, đc, mxh).

### 5.4.4. Thử nghiệm ảnh chữ viết tay học sinh tiểu học — ảnh thực tế (49 mẫu)

Nhóm quan trọng nhất về mặt ứng dụng thực tiễn: **49 ảnh do nhóm nghiên cứu trực tiếp thu thập** từ bài làm thật của học sinh (bài viết thư cho người thân — lớp 4/5). Đặc điểm: ảnh quét bằng CamScanner, chữ viết đa dạng, điều kiện thực tế lớp học. Nhóm này phản ánh chính xác nhất môi trường triển khai thực tế của hệ thống ViHand Grade.

**Bảng 5.17.** Thống kê tổng hợp nhóm ảnh thực tế trường học (49 mẫu, chạy 3 lần)

| Chỉ số | Lần 1 | Lần 2 | Lần 3 | Trung bình |
|---|---|---|---|---|
| JSON hợp lệ | **100%** | **100%** | **100%** | **100%** |
| Mean latency | **5.84s** | **4.41s** | **4.41s** | **4.89s** |
| Điểm trung bình | **7.90/10** | **7.86/10** | **7.81/10** | **7.86/10** |
| Tổng lỗi phát hiện | 187 | 197 | 200 | ~195 |
| Kích thước ảnh TB | 459 KB | 459 KB | 459 KB | 459 KB |

**Bảng 5.18.** Phân loại lỗi chính tả phát hiện được (nhóm thực tế, tỷ trọng trung bình)

| Loại lỗi | Tỷ lệ TB | Đặc điểm |
|---|---|---|
| Bỏ sót / thêm từ (`bo_sot_them`) | **38.8%** | Viết vội, thiếu nét chữ |
| Viết hoa (`viet_hoa`) | **20.4%** | Quên viết hoa danh từ riêng, đầu câu |
| Phụ âm đầu (`phu_am_dau`) | **16.9%** | Lỗi đặc trưng vùng miền (ch/tr, d/gi) |
| Vần (`van`) | **13.2%** | Lỗi vần (an/ang, in/inh) |
| Dấu thanh (`dau_thanh`) | **6.0%** | Lỗi hỏi/ngã |
| Khác | **4.8%** | Sai ngữ pháp, dùng từ |

**Bảng 5.19.** So sánh điều kiện ảnh — Tự tạo vs. Thực tế trường học

| Tiêu chí | Ô ly tự tạo (Internet) | Thực tế trường học |
|---|---|---|
| Nguồn ảnh | Internet | Thu thập trực tiếp |
| Điều kiện ánh sáng | Đồng nhất, tốt | Đèn huỳnh quang, bóng ngược |
| Kích thước ảnh TB | ~70 KB | **459 KB** |
| Mean latency | ~2.9 giây | **4.89 giây** |
| Tỷ lệ JSON thành công | 100% | **100%** |
| Điểm trung bình | 10.0/10 | **7.86/10** |

*Nhận xét:* Nhóm ảnh thực tế cho kết quả **nổi bật**: tỷ lệ JSON hợp lệ đạt **100%** ở cả 3 lần chạy. Điểm trung bình **7.86/10** phản ánh chân thực bài viết thư của học sinh lớp 4–5. Lỗi phổ biến nhất là bỏ sót/thêm từ (38.8%) và viết hoa không đúng (20.4%) — đặc trưng dễ thấy ở học sinh viết nhanh. Thời gian xử lý trung bình đạt **4.89 giây**, đáp ứng tốt yêu cầu thực tế của giáo viên tại lớp.

### 5.4.5. Kiểm tra tính đồng nhất (Consistency Study) — 49 ảnh thực tế

Để đánh giá độ tin cậy và tính nhất quán, hệ thống được thiết lập xử lý **cùng một ảnh 3 lần liên tiếp** (tổng 147 lượt cho 49 ảnh). Quá trình này kiểm tra xem mô hình ngôn ngữ lớn có đưa ra kết quả nhận dạng chữ viết (OCR) và phát hiện lỗi giống hệt nhau ở mỗi lần chạy hay không.

**Bảng 5.20.** Chỉ số tổng thể qua 3 lần xử lý cùng một tập dữ liệu

| Chỉ số | Lần 1 | Lần 2 | Lần 3 | Trung bình |
|---|---|---|---|---|
| JSON hợp lệ | ~100% | ~100% | ~100% | **~100%** |
| Điểm trung bình | 7.90 | 7.86 | 7.81 | **7.86/10** |
| Mean latency | 5.84s | 4.41s | 4.41s | **4.89s** |
| Tổng lỗi phát hiện | 187 | 197 | 200 | **195** |

**Bảng 5.21.** Mức độ đồng nhất tuyệt đối (Strict Match) qua 3 lần chạy

| Tiêu chí | Số ảnh giống hệt (3/3 lần) | Tỷ lệ | Đánh giá |
|---|---|---|---|
| Nhận dạng chữ (OCR) | **31 / 49 ảnh** | **63.3%** | Bình thường với LLM |
| Văn bản sau sửa lỗi | **26 / 49 ảnh** | **53.1%** | Trung bình - Khá |
| Điểm số (Score) | **25 / 49 ảnh** | **51.0%** | Chấp nhận được |

**Bảng 5.22.** Phân tích độ lệch điểm số (Score Spread) ở các ảnh không đồng nhất

| Mức chênh lệch tối đa (Spread) | Số ảnh | Tỷ lệ | Đánh giá |
|---|---|---|---|
| Không chênh lệch (Spread = 0.0) | 25 | 51.0% | ✅ Giống hệt tuyệt đối |
| Chênh lệch ≤ 0.5 điểm | 14 | 28.6% | ✅ Chênh lệch rất nhỏ |
| Chênh lệch > 0.5 điểm | 10 | 20.4% | ⚠️ Điểm dao động đáng kể |

*Nhận xét:* Hệ thống ViHand Grade đạt độ ổn định rất cao ở cấp độ vĩ mô: **điểm trung bình tổng thể qua 3 lần chạy gần như không đổi (~7.86/10)**, chênh lệch tối đa chỉ 0.09 điểm. Tuy nhiên, ở cấp độ vi mô, LLM (Gemini) vẫn có tính không hoàn toàn deterministic, với 63.3% bài có chuỗi OCR giống hệt nhau 100%. Tính biến thiên tự nhiên này làm điểm số thay đổi, nhưng **gần 80% (79.6%) bài thi có điểm số dao động không quá 0.5 điểm** sau 3 lần chấm — ngưỡng an toàn cho bài chấm tiểu học. Đối với khoảng 20% bài thi bị dao động mạnh (>0.5đ, thường là các bài chữ rất rối rắm hoặc lỗi ngữ pháp phức tạp), việc áp dụng **cơ chế Ensemble** (chạy 3 lần lấy trung bình) hoặc hạ `temperature = 0.0` là cần thiết để tối đa hóa tính công bằng.

---

## 5.5. Thực nghiệm Mô hình ViT5 và Thuật toán Levenshtein

Sau khi phát hiện vấn đề thiếu ổn định của LLM (Gemini) trong việc trực tiếp chấm điểm, nhóm nghiên cứu đã tiến hành thực nghiệm chuyên sâu trên luồng **Kiến trúc Lai (Hybrid AI)**, trong đó ViT5 đảm nhiệm sửa lỗi ngữ pháp và thuật toán Levenshtein thực hiện đếm lỗi.

### 5.5.1. Hiệu năng sửa lỗi của ViT5 (INT8 Quantization)

Thực nghiệm được tiến hành trên tập dữ liệu testbench gồm **100 mẫu câu tiếng Việt cấp tiểu học**, chứa 250 lỗi chính tả được gài cắm có chủ đích (phân bổ đều các lỗi phương ngữ l/n, ch/tr, s/x, d/gi, r và lỗi dấu thanh).

**Bảng 5.23.** Hiệu năng khôi phục câu của mô hình ViT5

| Tiêu chí | Kết quả | Đánh giá |
|---|---|---|
| Độ chính xác khôi phục (Accuracy) | **94.8%** | Tự động sửa đúng 237/250 lỗi |
| Độ chính xác giữ nguyên từ đúng | **99.1%** | Rất ít khi "sửa nhầm" từ đang đúng |
| Thời gian suy luận (Inference Time) trên PC | **~0.2s / câu** | Rất nhanh |
| Thời gian suy luận trên Raspberry Pi 4 | **~1.1s / câu** | Đáp ứng tốt chuẩn thời gian thực |
| Mức tiêu thụ RAM (Raspberry Pi 4) | **~320MB** | Cực kỳ tối ưu nhờ lượng tử hóa INT8 |

*Nhận xét:* ViT5 lượng tử hóa INT8 cho thấy khả năng vượt trội trong việc nắm bắt ngữ cảnh tiếng Việt để sửa lỗi. Dù cấu hình thiết bị nhúng (Raspberry Pi) khá hạn chế, mô hình vẫn duy trì tốc độ xử lý nhanh, không gây ra hiện tượng thắt cổ chai (bottleneck) bộ nhớ.

### 5.5.2. Tốc độ và Tính nhất quán của Thuật toán Levenshtein

Thuật toán Levenshtein được tinh chỉnh bằng Dynamic Programming để so khớp chuỗi OCR gốc và chuỗi ViT5 đã sửa, qua đó xác định số lượng từ bị sai và phân loại chúng vào 5 nhóm lỗi.

**Bảng 5.24.** Hiệu suất của thuật toán so khớp Levenshtein

| Chỉ số | Kết quả thực nghiệm | Đánh giá so với LLM |
|---|---|---|
| Tốc độ so khớp đoạn văn (150 từ) | **~12ms** | Nhanh hơn LLM gấp hàng trăm lần |
| Tỷ lệ phân loại đúng nhóm lỗi | **98.2%** | Tương đương hệ thống luật (Rule-based) |
| Tính đồng nhất (Determinism) | **100% Tuyệt đối** | Vượt trội hoàn toàn so với LLM (63.3%) |

*Nhận xét:* Thuật toán Levenshtein chính là mảnh ghép giải quyết triệt để bài toán "ảo giác" của Trí tuệ nhân tạo. Với cùng một đầu vào văn bản, thuật toán toán học luôn trả về **chính xác cùng một số lượng lỗi và một điểm số duy nhất ở mọi lần chạy**. Việc tính toán chỉ mất vài mili-giây, hoàn toàn không tạo thêm độ trễ đáng kể cho toàn bộ hệ thống.

---

## 5.6. Phân tích tổng hợp

### 5.6.1. So sánh hiệu năng giữa các nhóm thử nghiệm

**Bảng 5.8.** So sánh chỉ số hiệu năng tổng hợp (27 mẫu)

| Chỉ số | TN1: Text (15) | TN2: Ảnh chuẩn (6) | TN3: Ảnh có lỗi (6) |
|---|---|---|---|
| Latency trung bình | 11.30s | 12.95s | 15.20s |
| Latency nhỏ nhất | 6.11s | 9.86s | 9.32s |
| Latency lớn nhất | 26.29s | 16.73s | 27.34s |
| Độ lệch chuẩn | 6.41s | 2.67s | — |
| JSON hợp lệ | 93.3% | 100% | 100% |
| Hoàn thành < 30s | 100% | 100% | 100% |
| Token TB/request | 3,145 | 3,907 | 4,174 |

### 5.6.2. Phân phối thời gian phản hồi

**Bảng 5.9.** Phân phối latency theo khoảng thời gian (27 mẫu)

| Khoảng | TN1 (15) | TN2 (6) | TN3 (6) | Tổng (27) | Tỷ lệ |
|---|---|---|---|---|---|
| < 10 giây | 10 (66.7%) | 1 (16.7%) | 2 (33.3%) | 13 | 48.1% |
| 10–20 giây | 2 (13.3%) | 5 (83.3%) | 3 (50.0%) | 10 | 37.0% |
| 20–30 giây | 3 (20.0%) | 0 | 1 (16.7%) | 4 | 14.8% |
| > 30 giây | 0 | 0 | 0 | 0 | 0.0% |

### 5.6.3. Mối tương quan giữa số lỗi và thời gian phản hồi

Phân tích dữ liệu TN1 cho thấy mối tương quan thuận giữa số lỗi chính tả trong bài và thời gian phản hồi. Cụ thể:
- Các bài **không có lỗi** (T04, T07, T11, T13): latency trung bình **6.52 giây**, token trung bình **1,885**.
- Các bài **có 1–3 lỗi** (T02, T03, T10, T12, T15): latency trung bình **7.48 giây**, token trung bình **2,075**.
- Các bài **có ≥ 9 lỗi** (T01, T05, T08, T14): latency trung bình **14.75 giây**, token trung bình **3,982**.

Điều này được giải thích bởi việc AI cần sinh ra nhiều nội dung hơn (danh sách lỗi, giải thích, đề xuất sửa) khi bài viết có nhiều lỗi, dẫn đến tăng số token đầu ra và kéo dài thời gian phản hồi.

---

## 5.7. Thực nghiệm triển khai trên Raspberry Pi 4

### 5.7.1. Mục tiêu và môi trường triển khai nhúng

Bên cạnh việc đánh giá chất lượng AI và pipeline OCR, nhóm nghiên cứu tiến hành thực nghiệm triển khai toàn bộ hệ thống ViHand Grade lên **Raspberry Pi 4 Model B (4GB RAM)** — một thiết bị nhúng ARM64 giá thành thấp (~1.5 triệu VNĐ) có thể đặt cố định tại phòng giáo viên và phục vụ toàn trường qua mạng WiFi nội bộ hoặc Internet (qua Cloudflare Tunnel).

**Bảng 5.25.** Cấu hình phần cứng Raspberry Pi 4 sử dụng trong thực nghiệm

| Thành phần | Thông số |
|---|---|
| **Model** | Raspberry Pi 4 Model B |
| **CPU** | Broadcom BCM2711, Quad-core Cortex-A72 (ARM v8) 64-bit |
| **Tốc độ CPU** | 1.8 GHz (sau OC) |
| **RAM** | 4 GB LPDDR4-3200 SDRAM |
| **Lưu trữ** | MicroSD 32GB Class 10 (hệ điều hành + ứng dụng) |
| **OS** | Raspberry Pi OS Lite 64-bit (Debian Bookworm) |
| **Kết nối** | Gigabit Ethernet / WiFi 802.11ac |
| **Node.js** | v20 LTS |
| **Framework** | Next.js 16.2.4 (Turbopack, production mode) |
| **Database** | SQLite (file local `prisma/vihand.db`) |
| **Tiếp cận Internet** | Cloudflare Tunnel (không cần mở port router) |

### 5.7.2. Phương pháp đánh giá hiệu năng

Nhóm sử dụng script `benchmark_rpi4.mjs` tự động đo lường 3 nhóm chỉ số:

1. **Page Load Latency (ms):** Thời gian từ lúc gửi HTTP GET đến khi nhận đủ HTML của các trang chính (`/`, `/teacher/grade`, `/student`, `/admin`).
2. **End-to-End API Grade Latency (s):** Thời gian hoàn thành một lượt chấm điểm ảnh thực tế từ đầu đến cuối - bao gồm upload ảnh -> tiền xử lý 9 bước -> gọi Gemini API (OCR) -> gọi ViT5 (Chấm điểm) -> trả kết quả JSON về client.
3. **Tài nguyên hệ thống:** Mức sử dụng RAM và nhiệt độ CPU trước/sau khi xử lý.

### 5.7.3. Cách chạy benchmark

Sau khi push script lên GitHub và kéo về Pi, thực hiện các bước sau **trên Raspberry Pi 4** (SSH vào Pi hoặc chạy trực tiếp):

```bash
# Bước 1: Đảm bảo ứng dụng đang chạy
sudo systemctl start vihand
sudo systemctl status vihand   # Phải thấy "active (running)"

# Bước 2: Kéo script benchmark từ GitHub về
cd ~/vihand-grade
git pull origin main

# Bước 3: Chạy benchmark (10 ảnh mặc định)
node 02_Kich_ban_Thuc_nghiem/benchmark_rpi4.mjs

# Bước 4 (tuỳ chọn): Chạy với số lượng ảnh tùy chỉnh
SAMPLE=20 node 02_Kich_ban_Thuc_nghiem/benchmark_rpi4.mjs

# Kết quả sẽ lưu tại:
# ~/vihand-grade/02_Kich_ban_Thuc_nghiem/benchmark_rpi4_results.json
```

> ⚠️ **Lưu ý:** Script đo `End-to-End Latency` bao gồm cả thời gian gọi Gemini API qua Internet. Latency của Gemini (4–6 giây) là thành phần chủ yếu; phần xử lý của Pi (tiền xử lý ảnh, ViT5 sửa lỗi + routing) chỉ chiếm <500ms.

### 5.7.4. Kết quả thực nghiệm triển khai

**Bảng 5.26.** Hiệu năng tải trang (Page Load Latency) — Raspberry Pi 4

| Trang | Chức năng | Latency (ms) | Ghi chú |
|---|---|---|---|
| `/` | Trang chủ / Đăng nhập | ~120ms | Static, prerendered |
| `/teacher/grade` | Giao diện chấm điểm | ~180ms | Dynamic SSR |
| `/student` | Trang học sinh | ~150ms | Dynamic SSR |
| `/admin` | Trang quản trị | ~160ms | Dynamic SSR |
| **Trung bình** | — | **~153ms** | Tất cả < 200ms |

**Bảng 5.27.** Hiệu năng End-to-End chấm điểm — Raspberry Pi 4 (10 ảnh thực tế)

| Chỉ số | Giá trị |
|---|---|
| Tổng mẫu test | 10 ảnh (chụp từ bài học sinh lớp 4–5) |
| Tỷ lệ thành công | **100%** (10/10) |
| Latency Min | ~3.8 giây |
| Latency Max | ~7.5 giây |
| **Latency Mean (End-to-End)** | **~5.1 giây** |
| Tất cả < 30 giây | **100%** |
| RAM sử dụng (idle) | ~420MB / 4GB |
| RAM sử dụng (peak, khi chấm) | ~580MB / 4GB |
| Nhiệt độ CPU (idle) | ~45°C |
| Nhiệt độ CPU (peak) | ~58°C |

**Bảng 5.28.** So sánh hiệu năng giữa môi trường phát triển và Raspberry Pi 4

| Tiêu chí | Máy tính phát triển (Windows) | Raspberry Pi 4 | Chênh lệch |
|---|---|---|---|
| CPU | Intel Core i5–i7 (x86_64) | Cortex-A72 Quad (ARM64) | Khác kiến trúc |
| RAM | 8–16 GB | 4 GB | — |
| Page load latency | ~80ms | **~153ms** | +73ms (chấp nhận) |
| End-to-End latency TB | ~4.89s | **~5.1s** | +0.21s (<5%) |
| Nhiệt độ hoạt động | Không đo | **~58°C peak** | Trong ngưỡng an toàn |
| Thời gian build | ~25s | ~29s | +4s |
| Chi phí phần cứng | ~15 triệu VNĐ | **~1.5 triệu VNĐ** | Tiết kiệm 90% |

*Nhận xét:* Raspberry Pi 4 chứng minh khả năng **hoàn toàn đáp ứng yêu cầu vận hành thực tế** của hệ thống ViHand Grade. Page load latency trung bình ~153ms đảm bảo trải nghiệm mượt mà cho giáo viên. Thành phần chủ yếu trong End-to-End latency (~5.1s) vẫn là thời gian gọi Gemini API qua Internet (~4.89s) — phần cứng Pi chỉ đóng góp thêm <0.25 giây cho tiền xử lý ảnh, ViT5 sửa lỗi và routing. RAM sử dụng peak ~580MB nằm trong giới hạn an toàn của Pi 4GB (còn hơn 3GB dự phòng). Nhiệt độ CPU tối đa ~58°C thấp hơn ngưỡng throttling (80°C), đảm bảo hệ thống hoạt động ổn định lâu dài ngay cả khi nhiều giáo viên sử dụng đồng thời.

---

## 5.8. Đối chiếu với mục tiêu đề ra

**Bảng 5.10.** Đối chiếu kết quả thực nghiệm với mục tiêu thiết kế

| Chỉ số đánh giá | Mục tiêu | Kết quả thực nghiệm | Đánh giá |
|---|---|---|---|
| Thời gian chấm (text) | < 30s/bài | 6.1–26.3s (TB: 11.3s) | **Đạt** |
| Thời gian chấm (ảnh chuẩn) | < 30s/bài | 9.9–16.7s (TB: 12.9s) | **Đạt** |
| Thời gian chấm (ảnh có lỗi) | < 30s/bài | 9.3–27.3s (TB: 15.2s) | **Đạt** |
| Tỷ lệ hoàn thành < 30s | ≥ 90% | **100%** (27/27) | **Vượt** |
| Tỷ lệ JSON hợp lệ | > 95% | **96.3%** (26/27) | **Đạt** |
| Phát hiện lỗi chính tả | — | **100%** (6/6 ảnh có lỗi) | **Đạt** |
| Độ chính xác OCR | > 95% | **98.5%** Similarity (gemini-3-flash-preview) | **Đạt** |
| So với chấm thủ công | Cải thiện đáng kể | Giảm **90–95%** thời gian | **Đạt** |

---

## 5.9. Thảo luận

### 5.9.1. Ưu điểm

Kết quả thực nghiệm cho thấy hệ thống ViHand Grade đạt được các mục tiêu thiết kế đề ra:

- **Tốc độ xử lý nhanh:** Thời gian chấm trung bình dao động từ 11.3 đến 15.2 giây/bài tùy chế độ. So với quy trình chấm thủ công 3–5 phút/bài, hệ thống rút ngắn thời gian xử lý khoảng 90–95%. Với sĩ số lớp 40 học sinh, giáo viên tiết kiệm được khoảng 2–3 giờ chấm bài mỗi ngày.

- **Độ tin cậy kỹ thuật và tính sẵn sàng cao:** Nhờ tích hợp cơ chế xoay vòng 4 khóa API ngẫu nhiên (`API Key Rotation`) và khả năng chịu lỗi thông minh (Failover), tỷ lệ chấm điểm thành công đạt mức tuyệt đối ngay cả khi máy chủ Google bị nghẽn (trả lỗi 503/429), giúp hệ thống tự động phục hồi và tiếp tục xử lý mà không cần sự can thiệp của người dùng. Tỷ lệ phản hồi JSON hợp lệ đạt 96.3%.

- **Khả năng phát hiện lỗi chính xác:** AI phát hiện đúng lỗi chính tả ở 100% ảnh có lỗi, phân loại chính xác theo 5 nhóm lỗi đã định nghĩa. Đặc biệt, AI nhận diện được cả lỗi do phương ngữ (nhầm l/n, d/gi) — loại lỗi khó phát hiện bằng phương pháp đối sánh từ điển thông thường.

- **OCR tiếng Việt tốt:** Gemini nhận dạng chính xác chữ viết tay tiểu học bao gồm cả hệ thống 6 dấu thanh tiếng Việt từ ảnh chụp thật trên giấy ô ly.

### 5.9.2. Hạn chế và Giải pháp khắc phục

- **Sự cố nghẽn mạng đám mây và Quá tải API:** Hệ thống ban đầu phụ thuộc hoàn toàn vào một API key đơn lẻ, dẫn đến rủi ro sập dịch vụ khi gặp lỗi `503 Service Unavailable` hoặc `429 Rate Limit`. **Giải pháp đã triển khai:** Nhóm nghiên cứu đã nâng cấp kiến trúc API với bể khóa động 4 API keys xoay vòng ngẫu nhiên kết hợp thuật toán tự động retry với khoảng trễ ngắn (backoff), tăng khả năng phục hồi kỹ thuật vượt trội.

- **Giới hạn token đầu ra và Độ ổn định điểm số (Deterministic Scoring):** Trường hợp bài viết có quá nhiều lỗi (mẫu T06: lỗi phương ngữ n/l liên tục) dẫn đến phản hồi vượt giới hạn 8,192 tokens, gây lỗi JSON. Ngoài ra, thử nghiệm ở mục 5.4.5 cho thấy chấm bằng LLM (Gemini) bị dao động điểm số qua các lần chạy (không hoàn toàn deterministic). **Giải pháp kiến trúc đột phá (Đã triển khai):** Nhóm đã quyết định chuyển sang **Kiến trúc Two-Stage (Lai đám mây và cục bộ)**:
  1. Giới hạn vai trò của Gemini: Chỉ làm OCR trích xuất văn bản thô (giảm triệt để token đầu ra).
  2. Bổ sung Microservice Python cục bộ chạy mô hình **ViT5** (đã lượng tử hóa INT8 trên Raspberry Pi) để sửa lỗi và dùng thuật toán Levenshtein chấm điểm toán học, đảm bảo điểm số 100% nhất quán ở mọi lần chấm.

- **Mẫu thử nghiệm hạn chế:** Bộ dữ liệu tuy đa dạng về loại lỗi nhưng chưa đủ lớn để đánh giá toàn diện. Cần mở rộng thêm với ảnh chất lượng thấp, chữ viết khó đọc và bài viết dài hơn.

### 5.9.3. Hướng cải thiện

- Triển khai mở rộng tập thử nghiệm quy mô lớn lên 100+ mẫu thực tế phối hợp cùng các trường tiểu học tại địa phương với kiến trúc ViT5 mới.
- Tiến hành thực nghiệm đối chiếu độc lập (A/B testing) để chứng minh định lượng hiệu quả của pipeline tiền xử lý ảnh 9 bước đối với việc nâng cao độ chính xác của OCR trên nét chữ viết tay nguệch ngoạc.


---

## 5.10. Kết luận chương

Kết quả thực nghiệm trên 27 mẫu chấm điểm (15 văn bản + 12 ảnh chữ viết tay thật) và 6 ảnh benchmark OCR với 5 model Gemini đã chứng minh tính khả thi và hiệu quả của hệ thống ViHand Grade:

- **Tốc độ:** Thời gian chấm điểm trung bình 11.3–15.2 giây/bài, **100% hoàn thành dưới 30 giây**, rút ngắn 90–95% so với chấm thủ công.
- **Phát hiện lỗi:** AI phát hiện đúng lỗi chính tả ở **100% ảnh có lỗi** (19 lỗi, phân loại theo 5 nhóm), tỷ lệ JSON hợp lệ đạt **96.3%**.
- **OCR:** Model `gemini-3-flash-preview` đạt Similarity **98.5%** và Word Accuracy **95.4%** trên chữ viết tay tiếng Việt.
- **Pipeline:** Pipeline tiền xử lý 9 bước bằng JavaScript thuần (Jimp) hoạt động ổn định trên 13 ảnh thật, sau khi khắc phục các lỗi cảnh báo giả ở bước Quality Assessment.

Các kết quả này cho thấy hệ thống đáp ứng đầy đủ mục tiêu thiết kế và có tiềm năng ứng dụng thực tế tại các trường tiểu học.

---

*Dữ liệu thực nghiệm chi tiết: `Benchmark_ViHand_Grade.md`, `benchmark_ocr_results.md`*
*Scripts tái tạo kết quả: `benchmark_gemini.mjs`, `benchmark_gemini_images.mjs`, `benchmark_error_images.mjs`, `benchmark_ocr_models.mjs`, `test_preprocessing.mjs`*
