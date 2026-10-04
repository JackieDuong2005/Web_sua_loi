# Hỏi Đáp Thường Gặp — Hệ Thống ViHand Grade

## Câu Hỏi Về Phân Hệ Đọc Chính Tả

**H: Hệ thống có tự soạn bài chính tả được không?**
Đ: Có. Trong tab *Đọc chính tả*, giáo viên bấm *"AI Soạn bài"* — mô hình Qwen 2.5 SLM sẽ tự động tạo bài đọc đạt chuẩn sư phạm GDPT 2018 theo khối lớp (1–5) và chủ đề mong muốn, kèm theo gợi ý các từ khó cần lưu ý.

**H: Bài đọc có được lưu tự động không?**
Đ: Có. Sau khi hoàn thành lượt phát đọc, hệ thống tự động lưu phiên đọc vào danh mục *Lịch Sử Phiên Đọc* để làm căn cứ Ground Truth đối chiếu khi chấm điểm.

**H: Làm sao xem lại bài đã đọc?**
Đ: Vào ViHand Grade Web: `http://localhost:3000/teacher/dictation`, chọn tab *Lịch Sử Phiên Đọc*.

**H: Có thể điều chỉnh tốc độ và số lần đọc không?**
Đ: Có. Giáo viên có thể tùy chọn tốc độ (từ Cực chậm -35% đến Chuẩn -15%), số lần lặp lại (1-5 lần), thời gian nghỉ viết (1-10s hoặc tự động theo độ dài từ), và chế độ ngắt câu.

---

## Câu Hỏi Kỹ Thuật

**H: Mất điện thì dữ liệu bài chấm có bị mất không?**
Đ: Không. Dữ liệu được lưu trữ an toàn trong database SQLite tại `prisma/vihand.db` trên máy chủ — không bị mất mát khi tắt máy đột ngột.

**H: Có bao nhiêu giáo viên có thể dùng đồng thời?**
Đ: Hệ thống hỗ trợ đa người dùng (multi-user) trên giao diện Web, mỗi giáo viên có tài khoản riêng để quản lý lớp học và lịch sử chấm điểm độc lập.

**H: Dữ liệu có được sao lưu (backup) không?**
Đ: Toàn bộ dữ liệu nằm trong tệp `prisma/vihand.db`. Khuyến nghị sao lưu tệp này định kỳ để lưu trữ lâu dài.
