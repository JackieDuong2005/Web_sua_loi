# Quy Trình Buổi Kiểm Tra Chính Tả — ViHand Grade

## Tổng quan quy trình

Một buổi kiểm tra chính tả hoàn chỉnh gồm 3 giai đoạn:
1. **Đọc bài** (Alexa + học sinh nghe viết)
2. **Nộp bài** (Giáo viên chụp ảnh, học sinh upload)
3. **Chấm điểm** (ViT5 AI tự động)

---

## Giai Đoạn 1: Đọc Bài Chính Tả

### Chuẩn bị
- Giáo viên bật thiết bị Xiaozhi (đã có Alexa)
- Học sinh chuẩn bị vở và bút
- Không cần chuẩn bị bài trước — Alexa tự soạn

### Quy trình đọc chuẩn
1. Giáo viên ra lệnh: *"Alexa, đọc bài chính tả cho lớp 3A"*
2. Alexa thông báo: *"Vâng thầy/cô, em soạn bài cho lớp 3 ạ"*
3. Alexa đọc **tiêu đề** bài
4. Alexa đọc **lần 1** — đọc liền toàn bộ đoạn văn (nghe tổng thể)
5. Alexa nghỉ 10–15 giây
6. Alexa đọc **lần 2** — đọc từng câu, ngắt giữa các câu để học sinh viết kịp
7. Alexa hỏi: *"Các em đã viết xong chưa ạ?"*
8. Alexa hỏi giáo viên: *"Thầy/cô có muốn em lưu bài này vào ViHand Grade không?"*
9. Giáo viên xác nhận → Alexa lưu vào hệ thống

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

### Học sinh tự nộp (tương lai)
- Học sinh chụp ảnh bài viết bằng điện thoại/máy tính bảng
- Đăng nhập ViHand Grade: http://localhost:3000
- Vào mục "Nộp bài" → Chọn bài chính tả → Upload ảnh

### Giáo viên nộp thay
- Giáo viên chụp từng bài của học sinh
- Vào ViHand Grade → Chọn học sinh → Upload ảnh
- Hệ thống tự nhận dạng và chấm điểm

---

## Giai Đoạn 3: Chấm Điểm Tự Động (ViT5 AI)

### Quy trình chấm
1. Ảnh bài làm được gửi lên ViT5 AI Service (port 8000)
2. OCR nhận dạng chữ viết tay → chuyển thành văn bản
3. So sánh với đáp án (đoạn văn Alexa đã đọc)
4. Phân tích từng lỗi: sai chính tả, thiếu dấu, sai dấu thanh
5. Tính điểm theo thang 10

### Cách tính điểm
- **10 điểm:** Không có lỗi
- **Trừ điểm:** Mỗi lỗi chính tả trừ 0.5 điểm | Mỗi lỗi dấu câu trừ 0.25 điểm
- **Điểm tối thiểu:** 0

### Kết quả trả về
- Điểm số (VD: 8.5/10)
- Danh sách lỗi cụ thể (VD: "Câu 3: 'cháo' viết thành 'cháu'")
- Nhận xét tổng quát (VD: "Em còn nhầm dấu hỏi/ngã, cần luyện thêm")
- Xếp loại: Xuất sắc / Giỏi / Khá / Trung bình / Cần cố gắng

---

## Giao Diện Giáo Viên — ViHand Grade

### Trang Tổng Quan (`/teacher/dashboard`)
- Thống kê lớp học: số học sinh, điểm trung bình
- Bài làm chờ chấm
- Biểu đồ tiến trình theo tuần

### Trang Đọc Chính Tả (`/teacher/dictation`)
- Lịch sử tất cả buổi đọc chính tả do Alexa lưu
- Xem chi tiết từng buổi: đoạn văn, lớp, giờ học, lịch sử hội thoại
- Tìm kiếm theo lớp, ngày, tiêu đề

### Trang Chấm Điểm (`/teacher/grade`)
- Danh sách bài làm của học sinh
- Xem ảnh bài gốc + kết quả AI chấm
- Điều chỉnh điểm thủ công nếu cần

### Trang Báo Cáo Lớp (`/teacher/class-report`)
- Bảng điểm toàn lớp
- Học sinh yếu môn chính tả cần hỗ trợ
- Export báo cáo

---

## Dữ Liệu Được Lưu Trong Hệ Thống

### DictationSession (phiên đọc chính tả)
- `title`: Tiêu đề bài (VD: "Nghe viết: Mùa hè")
- `passage`: Toàn bộ đoạn văn Alexa đã đọc
- `className`: Lớp học (VD: "3A1")
- `teacherName`: Tên giáo viên
- `summary`: Tóm tắt do Alexa tạo
- `createdAt`: Thời gian buổi học

### DictationLog (nhật ký hội thoại)
- `speaker`: Người nói ("teacher", "alexa", "student")
- `content`: Nội dung câu nói
- `createdAt`: Thời điểm

### Grade (kết quả chấm điểm)
- `studentName`: Tên học sinh
- `originalText`: Chữ viết tay đã OCR
- `fixedText`: Văn bản đã sửa
- `score`: Điểm (VD: "8.5/10")
- `corrections`: Danh sách lỗi chi tiết
- `feedback`: Nhận xét
- `dictationSessionId`: Liên kết với phiên đọc Alexa
