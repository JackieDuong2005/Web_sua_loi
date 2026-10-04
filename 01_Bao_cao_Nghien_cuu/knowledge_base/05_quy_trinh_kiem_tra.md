# Quy Trình Buổi Kiểm Tra Chính Tả — ViHand Grade

## Tổng quan quy trình

Một buổi kiểm tra chính tả hoàn chỉnh gồm 3 giai đoạn:
1. **Đọc bài** (AI phát đọc qua Web Dictation + học sinh nghe viết)
2. **Nộp bài** (Giáo viên chụp ảnh hoặc học sinh upload)
3. **Chấm điểm** (AI Gemini OCR + ViT5 Seq2Seq tự động)

---

## Giai Đoạn 1: Đọc Bài Chính Tả

### Chuẩn bị
- Giáo viên mở tab **Đọc chính tả** (`/teacher/dictation`) trên màn hình lớp học hoặc kết nối loa
- Học sinh chuẩn bị vở và bút
- Giáo viên có thể dùng bài trong kho SGK, tự nhập văn bản, hoặc bấm *"AI Soạn bài"* để Qwen 2.5 SLM tạo bài

### Quy trình đọc chuẩn
1. Giáo viên chọn bài đọc và thiết lập nhịp đọc sư phạm (Tốc độ, số lần lặp, thời gian nghỉ viết)
2. Bấm **"BẮT ĐẦU ĐỌC CHO CẢ LỚP"**
3. Hệ thống phát âm tiêu đề và cụm câu theo chuẩn ngữ âm tiếng Việt
4. Học sinh lắng nghe và viết vào vở trong các khoảng dừng
5. Hoàn thành bài đọc → hệ thống tự động lưu phiên đọc làm **Ground Truth**
6. Bấm *"Mở Phiên Chấm Điểm Cho Bài Này"* để chuyển sang giao diện chấm

### Thời gian ước tính
| Khối lớp | Thời gian đọc | Thời gian chờ viết | Tổng |
|---------|--------------|-------------------|------|
| Lớp 1 | 1–2 phút | 5 phút | ~7 phút |
| Lớp 2 | 2–3 phút | 7 phút | ~10 phút |
| Lớp 3 | 3–4 phút | 10 phút | ~14 phút |
| Lớp 4 | 4–5 phút | 12 phút | ~17 phút |
| Lớp 5 | 5–6 phút | 15 phút | ~21 phút |

---

## Giai Đoạn 2: Nộp Bài

### Học sinh nộp bài
- Học sinh chụp ảnh bài viết bằng điện thoại hoặc ứng dụng mobile
- Upload ảnh bài làm trực tiếp lên hệ thống

### Giáo viên nộp bài / Chấm tập trung
- Giáo viên chụp ảnh bài của học sinh
- Upload trực tiếp trên giao diện chấm điểm `/teacher/grade`

---

## Giai Đoạn 3: Chấm Điểm Tự Động (AI Pipeline)

### Quy trình chấm
1. Ảnh bài làm được đưa qua pipeline tiền xử lý ảnh 9 bước (Jimp)
2. Gemini Vision OCR trích xuất chữ viết tay và vị trí tọa độ (Bounding Box)
3. ViT5 Seq2Seq sửa lỗi chính tả theo ngữ cảnh tiếng Việt
4. So sánh với bài đọc mẫu Ground Truth (từ phiên đọc đã lưu)
5. Phân tích chi tiết: lỗi chính tả, dấu câu, hình thức trình bày và tính điểm theo thang 10

### Kết quả trả về
- Điểm số thang 10 (Chính tả 4đ + Hình thức 3đ + Nội dung 2đ + Sáng tạo 1đ)
- Bounding Box trực quan hóa từng từ lỗi trên chính ảnh chụp bài làm
- Lời nhận xét sư phạm toàn diện động viên học sinh

---

## Giao Diện Giáo Viên — ViHand Grade

### Trang Đọc Chính Tả (`/teacher/dictation`)
- Trình phát đọc AI với điều khiển nhịp đọc sư phạm
- Kho ngữ liệu SGK chuẩn (Kết Nối, Cánh Diều, Chân Trời)
- Lịch sử tất cả phiên đọc chính tả đã thực hiện

### Trang Chấm Điểm (`/teacher/grade`)
- Upload ảnh bài làm của học sinh
- Canvas trực quan hóa lỗi viết tay và đối chiếu văn bản gốc
- Chỉnh sửa điểm số và gửi nhận xét

### Trang Báo Cáo (`/teacher/reports`)
- Bảng điểm và thống kê tiến độ học tập toàn lớp
- Biểu đồ phân bố lỗi chính tả thường gặp
