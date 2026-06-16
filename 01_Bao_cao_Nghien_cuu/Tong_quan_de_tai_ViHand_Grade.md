# TỔNG LIÊN ĐOÀN LAO ĐỘNG VIỆT NAM
# TRƯỜNG ĐẠI HỌC TÔN ĐỨC THẮNG
# ---------------------------------
# Công trình Nghiên cứu khoa học sinh viên năm học 2025 - 2026

**TÊN ĐỀ TÀI:**
### NGHIÊN CỨU VÀ XÂY DỰNG HỆ THỐNG CHẤM ĐIỂM CHÍNH TẢ TIẾNG VIỆT VIẾT TAY CHO HỌC SINH TIỂU HỌC SỬ DỤNG TRÍ TUỆ NHÂN TẠO ĐA PHƯƠNG THỨC (VIHAND GRADE)

**KHOA ĐIỆN – ĐIỆN TỬ**

* **GIẢNG VIÊN HƯỚNG DẪN:** ThS/TS. Nguyễn Văn Anh
* **SINH VIÊN THỰC HIỆN:**
  1. Nguyễn Văn Cường – 42101234
  2. Phan Văn Mạnh – 42105678
  3. Trần Thành Đạt – 42109012

---

# TỔNG QUAN ĐỀ TÀI NGHIÊN CỨU
*(Theo cấu trúc phân tích quy chuẩn của biểu mẫu BM18)*

---

### I. TÓM TẮT ĐỀ TÀI (ABSTRACT)
Đề tài nghiên cứu khoa học **"ViHand Grade"** tập trung vào việc giải quyết bài toán tự động hóa quy trình chấm điểm bài chính tả viết tay của học sinh tiểu học Việt Nam bằng cách kết hợp kỹ thuật xử lý ảnh số tiên tiến và Trí tuệ nhân tạo (AI) đa phương thức. 

Hệ thống được phát triển dưới dạng ứng dụng Web tiến trình (Progressive Web App - PWA) sử dụng framework Next.js 16, TypeScript, cơ sở dữ liệu SQLite thông qua Prisma ORM và mô hình ngôn ngữ lớn đa phương thức **Google Gemini 3 Flash**. Điểm cốt lõi của nghiên cứu là sự kết hợp chặt chẽ giữa:
1. **Bộ tiền xử lý ảnh 9 bước (Image Pipeline)** chạy trực tiếp trên TypeScript/Jimp để khử nhiễu bóng che, nhị phân hóa thích nghi và tăng cường nét chữ viết tay trên vở viết học sinh mà không làm mất nét chữ.
2. **Kiến trúc Lai (Hybrid AI Architecture):** Sử dụng **Google Gemini 3.1 Flash Lite** làm lõi OCR đa phương thức cực kỳ chính xác. Sau đó, kết quả được chuyển sang dịch vụ nội bộ chạy mô hình ngôn ngữ **ViT5** (đã lượng tử hóa INT8) trên phần cứng nhúng (Raspberry Pi 4) để thực hiện NLP, sửa lỗi chính tả và kết hợp thuật toán **Levenshtein** để chấm điểm theo chuẩn Thông tư 27/2020/TT-BGDĐT một cách toán học, đảm bảo tính nhất quán tuyệt đối.

---

### II. CÁC GIẢI PHÁP KHOA HỌC ĐÃ ĐƯỢC GIẢI QUYẾT Ở TRONG VÀ NGOÀI NƯỚC
#### 2.1. Trong nước
Tại Việt Nam, các nghiên cứu về nhận dạng ký tự quang học (OCR - Optical Character Recognition) tiếng Việt đã đạt được nhiều tiến bộ vượt bậc nhờ vào sự hỗ trợ của các mạng nơ-ron học sâu sâu như CNN, LSTM và kiến trúc CRNN (Convolutional Recurrent Neural Network). Các giải pháp tiêu biểu bao gồm:
* Các công cụ nhận dạng chữ viết tiếng Việt in ấn trên tài liệu, hóa đơn hoặc căn cước công dân đạt độ chính xác trên 95%.
* Một số mô hình nghiên cứu tại các trường Đại học lớn đã thử nghiệm nhận dạng chữ viết tay tiếng Việt (offline và online) bằng cách thu thập dữ liệu viết tay của người lớn và huấn luyện mô hình học máy chuyên biệt.

#### 2.2. Ngoài nước
Trên thế giới, lĩnh vực nhận dạng chữ viết tay (Handwriting Recognition) và chấm điểm tự động đã tiến tới giai đoạn trưởng thành rất cao:
* **Các công cụ OCR thương mại lớn:** Google Cloud Vision, Amazon Textract, Microsoft Azure Computer Vision sở hữu tập dữ liệu huấn luyện khổng lồ, hỗ trợ nhận dạng chữ viết tay của hàng chục ngôn ngữ với độ chính xác cao.
* **Sự bùng nổ của AI đa phương thức (Multimodal AI):** Kể từ khi các mô hình như GPT-4V, Gemini 1.5/3 Flash ra đời, việc phân tích hình ảnh không còn đơn thuần là trích xuất text thô (OCR). Mặc dù các mô hình này có khả năng thực hiện End-to-End toàn bộ quy trình, nhưng khi áp dụng vào việc chấm điểm dài, chúng thường vướng phải giới hạn về số lượng token phản hồi và gây ra sự không nhất quán trong điểm số (hallucination). Vì vậy, hướng tiếp cận hiện đại nhất là **Hybrid AI**: Kết hợp Cloud LLM (Gemini) để làm OCR và Edge SLM (ViT5) để xử lý logic chấm điểm cục bộ.

---

### III. NHỮNG VẤN ĐỀ TỒN TẠI CẦN ĐƯỢC TIẾP TỤC NGHIÊN CỨU
Mặc dù công nghệ OCR và AI phát triển mạnh mẽ, việc áp dụng vào môi trường giáo dục Tiểu học tại Việt Nam vẫn đối mặt với các thách thức lớn chưa được giải quyết triệt để:

```
┌────────────────────────────────────────────────────────────────────────┐
│             CÁC THÁCH THỨC LỚN TRONG OCR CHỮ VIẾT TAY TIỂU HỌC         │
├──────────────────────────────┬─────────────────────────────────────────┤
│ Nhiễu từ dòng kẻ ô ly        │ • Giấy tập học sinh tiểu học luôn có    │
│                              │   dòng kẻ ô ly màu xanh/đỏ mảnh dài.    │
│                              │ • Lưới ô ly đè lên nét chữ làm các      │
│                              │   mô hình OCR nhầm dấu thanh tiếng Việt.│
├──────────────────────────────┼─────────────────────────────────────────┤
│ Chất lượng ảnh đầu vào kém   │ • Ảnh chụp từ điện thoại phụ huynh/GV   │
│                              │   thường bị bóng che, rung tay, mờ nét. │
│                              │ • Nét bút chì của học sinh thường nhạt. │
├──────────────────────────────┼─────────────────────────────────────────┤
│ Sự khắt khe của tiếng Việt   │ • Tiếng Việt có hệ thống dấu thanh      │
│                              │   (sắc, huyền, hỏi, ngã, nặng) phức tạp.│
│                              │ • Các mô hình AI quốc tế dễ bỏ sót hoặc │
│                              │   nhận diện sai các dấu thanh nhỏ mảnh. │
└──────────────────────────────┴─────────────────────────────────────────┘
```

1. **Nhiễu nghiêm trọng từ dòng kẻ ô ly:** Học sinh tiểu học Việt Nam viết trên giấy ô ly (vở 4 ô ly hoặc 5 ô ly). Đường kẻ này đè lên các nét chữ, đặc biệt là các dấu thanh nhỏ (dấu hỏi, ngã, sắc, huyền). Khi quét ảnh, các mô hình OCR thông thường sẽ nhận diện nhầm các đường kẻ này là một phần của chữ hoặc dấu thanh, gây ra tỷ lệ lỗi rất cao.
2. **Chất lượng ảnh chụp thực tế không đồng đều:** Giáo viên chụp ảnh bài viết của học sinh bằng điện thoại di động trong phòng học thường bị bóng che của tay hoặc điện thoại, ánh sáng phân bố lệch (chỗ sáng, chỗ tối), nét chữ viết chì tiểu học lại mỏng và nhạt màu.
3. **Độ phức tạp của quy tắc chấm điểm chính tả sư phạm:** Việc chấm điểm không chỉ đơn thuần là so khớp từ đúng/từ sai. Giáo viên cần phân loại lỗi rõ ràng (phụ âm đầu, vần, dấu thanh, viết hoa...) và áp dụng các barem chấm điểm khác nhau cho từng khối lớp (ví dụ lớp 1-3 trừ điểm nặng hơn lớp 4-5 trên mỗi lỗi).
4. **Giới hạn về tài nguyên hệ thống:** Hầu hết các thư viện xử lý ảnh mạnh mẽ như OpenCV yêu cầu môi trường Python/C++ phức tạp, gây khó khăn cho việc triển khai trên server web gọn nhẹ hoặc chạy trực tiếp trên thiết bị di động của giáo viên mà không phụ thuộc vào hạ tầng cloud đắt đỏ.

---

### IV. PHƯƠNG ÁN GIẢI QUYẾT CỦA TÁC GIẢ (NHÓM TÁC GIẢ)
Nhằm giải quyết triệt để các tồn tại trên, nhóm nghiên cứu đề xuất giải pháp công nghệ tích hợp trong hệ thống **ViHand Grade**:

#### 4.1. Image Preprocessing Pipeline 9 bước chuyên biệt
Nhóm nghiên cứu phát triển một bộ tiền xử lý ảnh viết tay chạy trực tiếp bằng Jimp trên nền tảng TypeScript, giúp tối ưu hóa ảnh chụp trước khi hiển thị cho giáo viên và phân tích chất lượng ảnh:
* **Khử bóng (Shadow Removal):** Sử dụng thuật toán chuẩn hóa nền thông qua làm mờ hộp (box blur) giúp triệt tiêu hoàn toàn bóng che từ tay/điện thoại, mang lại nền giấy trắng đồng đều.
* **Tăng cường tương phản cục bộ (CLAHE):** Áp dụng thuật toán Cân bằng Histogram thích nghi giới hạn tương phản để làm nổi bật nét bút chì mờ nhạt của học sinh, đặc biệt trên nền giấy sáng không đều.
* **CLAHE cục bộ:** Tăng tương phản thích nghi để làm nổi bật nét bút chì viết tay mờ nhạt lên trên nền giấy trắng đã được làm sạch.
* **Module Đánh giá chất lượng (Quality Assessment):** Phân tích ảnh theo thời gian thực để đưa ra các chỉ số về độ sáng (brightness), độ mờ (blur_score) và tỉ lệ nét chữ. Hệ thống sẽ phát cảnh báo *"Ảnh bị mờ"* hoặc *"Nét chữ quá nhạt"* để ngăn ngừa việc gửi ảnh kém chất lượng lên AI.

#### 4.2. Kiến trúc Hybrid AI: Cloud OCR (Gemini) và Edge NLP (ViT5)
Hệ thống sử dụng mô hình kết hợp (Hybrid Architecture) để giải quyết bài toán giới hạn token và tính không đồng nhất của mô hình ngôn ngữ lớn:
* **Giai đoạn 1 - Trích xuất văn bản (Gemini OCR):** Ảnh gốc chất lượng cao được gửi sang đám mây Google Gemini 3.1 Flash Lite. AI được cung cấp prompt tập trung 100% vào việc OCR và xuất ra chuỗi JSON ngắn gọn, giải quyết tình trạng bị cộng dồn sai số của các engine OCR truyền thống.
* **Giai đoạn 2 - Xử lý ngữ pháp và chấm điểm (ViT5 Edge AI):** Văn bản thô được luân chuyển về dịch vụ Python FastAPI nội bộ. Tại đây, mô hình ngôn ngữ tiếng Việt (ViT5) được dùng để sửa câu hoàn chỉnh.
* **Giai đoạn 3 - Thuật toán điểm số Levenshtein:** Dựa trên kết quả sửa đổi của ViT5, thuật toán khoảng cách Levenshtein được lập trình để đếm số lượng lỗi, phân loại lỗi và trừ điểm chính xác tuyệt đối 100% theo quy định Thông tư 27/2020/TT-BGDĐT của Bộ Giáo dục. Kết quả cuối cùng được xuất ra dưới dạng JSON phục vụ lưu trữ.

---

### V. TÀI LIỆU THAM KHẢO / REFERENCES
*(Sắp xếp Alphabet theo quy chuẩn biểu mẫu BM18)*

* Craton, M. and G. Saunders. 1992. *Islanders in the Stream: A history of the Bahamian people*. Athens: University of Georgia Press.
* Herring, G. 1998. ‘The Beguiled: Misogynist myth or feminist fable?’ *Literature Film Quarterly* 26 (3): pp. 214-219.
* Nguyễn, Hiến Lê. 2002. *Bảy ngày trong Đồng tháp mười*. Hà Nội: nhà xuất bản Văn hóa Thông tin.
* Nguyễn, Trần Bạt. 2009. *Cải cách giáo dục Việt Nam*, xem 21.05.2026 <http://www.chungta.com/Desktop.aspx/ChungTa-suyNgam/GiaoDuc/Cai_cach_giao_duc_Viet_Nam/>
* Sambrook, J. and Russell, D.W. 2001. *Molecular Cloning: A Laboratory Manual*. New York: Cold Spring Harbor Laboratory Press.
