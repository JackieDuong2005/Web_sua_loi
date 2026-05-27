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
1. **Bộ tiền xử lý ảnh 10 bước (Image Pipeline)** chạy trực tiếp trên TypeScript/Jimp để khử nhiễu bóng che, nhị phân hóa thích nghi và loại bỏ dòng kẻ ô ly trên vở viết học sinh mà không làm mất nét chữ.
2. **Kỹ thuật thiết kế Prompt hệ thống (Prompt Engineering)** tích hợp barem điểm chuẩn sư phạm của Bộ Giáo dục và Đào tạo Việt Nam để chấm điểm chi tiết 4 tiêu chí (Chính tả, Hình thức, Nội dung, Sáng tạo), trích xuất chi tiết các lỗi dưới dạng cấu trúc dữ liệu JSON để lưu trữ và phân tích.

---

### II. CÁC GIẢI PHÁP KHOA HỌC ĐÃ ĐƯỢC GIẢI QUYẾT Ở TRONG VÀ NGOÀI NƯỚC
#### 2.1. Trong nước
Tại Việt Nam, các nghiên cứu về nhận dạng ký tự quang học (OCR - Optical Character Recognition) tiếng Việt đã đạt được nhiều tiến bộ vượt bậc nhờ vào sự hỗ trợ của các mạng nơ-ron học sâu sâu như CNN, LSTM và kiến trúc CRNN (Convolutional Recurrent Neural Network). Các giải pháp tiêu biểu bao gồm:
* Các công cụ nhận dạng chữ viết tiếng Việt in ấn trên tài liệu, hóa đơn hoặc căn cước công dân đạt độ chính xác trên 95%.
* Một số mô hình nghiên cứu tại các trường Đại học lớn đã thử nghiệm nhận dạng chữ viết tay tiếng Việt (offline và online) bằng cách thu thập dữ liệu viết tay của người lớn và huấn luyện mô hình học máy chuyên biệt.

#### 2.2. Ngoài nước
Trên thế giới, lĩnh vực nhận dạng chữ viết tay (Handwriting Recognition) và chấm điểm tự động đã tiến tới giai đoạn trưởng thành rất cao:
* **Các công cụ OCR thương mại lớn:** Google Cloud Vision, Amazon Textract, Microsoft Azure Computer Vision sở hữu tập dữ liệu huấn luyện khổng lồ, hỗ trợ nhận dạng chữ viết tay của hàng chục ngôn ngữ với độ chính xác cao.
* **Sự bùng nổ của AI đa phương thức (Multimodal AI):** Kể từ khi các mô hình như GPT-4V, Gemini 1.5/3 Flash ra đời, việc phân tích hình ảnh không còn đơn thuần là trích xuất text thô (OCR). Các mô hình này có khả năng "nhìn" ảnh và "hiểu" ngữ nghĩa trực tiếp, thực hiện đồng thời việc đọc chữ viết tay, phát hiện lỗi ngữ pháp, lỗi ngữ cảnh và chấm điểm bài viết theo barem yêu cầu mà không cần qua hai bước tách biệt (OCR rồi mới NLP).

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

#### 4.1. Image Preprocessing Pipeline 10 bước chuyên biệt
Nhóm nghiên cứu phát triển một bộ tiền xử lý ảnh viết tay chạy trực tiếp bằng Jimp trên nền tảng TypeScript, giúp tối ưu hóa ảnh chụp trước khi hiển thị cho giáo viên và phân tích chất lượng ảnh:
* **Khử bóng (Shadow Removal):** Sử dụng thuật toán chuẩn hóa nền thông qua làm mờ hộp (box blur) giúp triệt tiêu hoàn toàn bóng che từ tay/điện thoại, mang lại nền giấy trắng đồng đều.
* **Xoá dòng kẻ ô ly (Grid Line Removal):** Thiết kế bộ lọc hình thái học (morphological filter) với kernel định hướng ngang và dọc nhằm bóc tách riêng các nét kẻ ô ly mảnh, sau đó xóa chúng và tiến hành inpaint nhẹ để nối lại các nét chữ bị đứt gãy tại giao điểm.
* **CLAHE cục bộ:** Tăng tương phản thích nghi để làm nổi bật nét bút chì viết tay mờ nhạt lên trên nền giấy trắng đã được làm sạch.
* **Module Đánh giá chất lượng (Quality Assessment):** Phân tích ảnh theo thời gian thực để đưa ra các chỉ số về độ sáng (brightness), độ mờ (blur_score) và tỉ lệ nét chữ. Hệ thống sẽ phát cảnh báo *"Ảnh bị mờ"* hoặc *"Nét chữ quá nhạt"* để ngăn ngừa việc gửi ảnh kém chất lượng lên AI.

#### 4.2. Tích hợp AI đa phương thức Gemini thông qua Prompt sư phạm tối ưu
Thay vì sử dụng các công cụ OCR thô để trích xuất chữ rồi mới dùng NLP sửa lỗi (dễ bị cộng dồn sai số), hệ thống gửi trực tiếp ảnh gốc chất lượng cao sang **Google Gemini 3 Flash**:
* Mô hình được cung cấp Prompt hệ thống đóng vai trò một giáo viên tiểu học giàu kinh nghiệm tại Việt Nam.
* Tích hợp **Barem chấm điểm chuẩn 10 điểm** chi tiết:
  * **Chính tả & Ngữ pháp (4.0đ):** Trừ điểm khoa học theo khối lớp (0.5đ/lỗi cho lớp 1-3, 0.25đ/lỗi cho lớp 4-5), không trừ điểm lặp lỗi.
  * **Hình thức (3.0đ):** Đánh giá nét chữ viết đều đẹp, rõ ràng, đúng độ cao khoảng cách.
  * **Nội dung (2.0đ):** Đánh giá tính mạch lạc, đủ ý, đúng chủ đề.
  * **Sáng tạo (1.0đ):** Cộng điểm khuyến khích khi học sinh sử dụng từ láy, phép so sánh, nhân hóa.
* Định cấu hình tham số sáng tạo cực thấp ($Temperature = 0.1$) để đảm bảo AI chỉ tập trung nhận dạng chính xác và đưa ra nhận xét trung thực, loại bỏ hoàn toàn hiện tượng "ảo giác".
* Sử dụng cấu trúc **JSON Schema** ép buộc AI trả về dữ liệu có cấu trúc định sẵn. Điều này giúp hệ thống tự động bóc tách: văn bản gốc, văn bản đã sửa, danh sách lỗi chính tả cụ thể (từ sai, từ đúng đề xuất, loại lỗi, lý do sai) và lưu trực tiếp vào cơ sở dữ liệu SQLite thông qua Prisma ORM một cách dễ dàng và đồng bộ.

---

### V. TÀI LIỆU THAM KHẢO / REFERENCES
*(Sắp xếp Alphabet theo quy chuẩn biểu mẫu BM18)*

* Craton, M. and G. Saunders. 1992. *Islanders in the Stream: A history of the Bahamian people*. Athens: University of Georgia Press.
* Herring, G. 1998. ‘The Beguiled: Misogynist myth or feminist fable?’ *Literature Film Quarterly* 26 (3): pp. 214-219.
* Nguyễn, Hiến Lê. 2002. *Bảy ngày trong Đồng tháp mười*. Hà Nội: nhà xuất bản Văn hóa Thông tin.
* Nguyễn, Trần Bạt. 2009. *Cải cách giáo dục Việt Nam*, xem 21.05.2026 <http://www.chungta.com/Desktop.aspx/ChungTa-suyNgam/GiaoDuc/Cai_cach_giao_duc_Viet_Nam/>
* Sambrook, J. and Russell, D.W. 2001. *Molecular Cloning: A Laboratory Manual*. New York: Cold Spring Harbor Laboratory Press.
