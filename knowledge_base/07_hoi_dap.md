# Hỏi Đáp Thường Gặp — Alexa & ViHand Grade

## Câu Hỏi Từ Giáo Viên

**H: Alexa có tự soạn bài chính tả được không?**
Đ: Có. Giáo viên chỉ cần nói "Alexa, soạn bài chính tả cho lớp 3A" — Alexa sẽ tự tạo đoạn văn 3–5 câu phù hợp với học sinh lớp 3 và đọc ngay.

**H: Bài đã đọc có được lưu tự động không?**
Đ: Không hoàn toàn tự động. Sau khi đọc xong, Alexa sẽ hỏi giáo viên có muốn lưu không. Chỉ khi giáo viên xác nhận, bài mới được lưu vào ViHand Grade. Trừ trường hợp giáo viên nói "đọc và lưu" từ đầu — lúc đó Alexa lưu ngay sau khi đọc.

**H: Làm sao xem lại bài đã đọc?**
Đ: Hai cách:
- Hỏi Alexa: "Hôm nay đọc bài gì rồi?"
- Vào ViHand Grade: http://localhost:3000/teacher/dictation

**H: Có thể đọc lại bài đã lưu không?**
Đ: Có. Nói "Alexa, đọc lại bài [tên bài] cho lớp [X]" — Alexa sẽ lấy nội dung từ hệ thống và đọc lại.

**H: Alexa đọc nhanh hay chậm?**
Đ: Alexa đọc ở tốc độ chuẩn phù hợp từng lớp. Có thể điều chỉnh: "Đọc chậm hơn" hoặc "Đọc nhanh hơn".

**H: Có thể dừng giữa chừng không?**
Đ: Có. Nói "Dừng lại" hoặc "Tạm dừng" — Alexa sẽ ngừng đọc.

**H: Alexa có hỗ trợ tiếng Anh không?**
Đ: Alexa được cấu hình để dạy tiếng Việt cho học sinh tiểu học Việt Nam. Có thể trả lời bằng tiếng Anh nếu được hỏi, nhưng tập trung vào tiếng Việt.

---

## Câu Hỏi Từ Học Sinh

**H: Alexa ơi, đọc lại câu đó được không?**
Đ: Được. Em sẽ đọc lại câu vừa rồi cho các em.

**H: Alexa ơi, em không nghe rõ?**
Đ: Em sẽ đọc chậm hơn và to hơn cho các em dễ nghe.

**H: Alexa ơi, nghĩa của từ [X] là gì?**
Đ: Alexa tra từ điển và giải thích ngắn gọn, dễ hiểu với học sinh tiểu học.

---

## Câu Hỏi Kỹ Thuật

**H: Mất điện thì bài có bị mất không?**
Đ: Không. Dữ liệu đã lưu vào database SQLite trên máy tính — không bị mất khi mất điện. Tuy nhiên, nếu đang trong lúc đọc mà chưa lưu thì buổi đó sẽ không được ghi lại.

**H: Alexa mất kết nối, làm sao biết?**
Đ: Thiết bị Xiaozhi sẽ hiển thị thông báo lỗi trên màn hình. MCP Server sẽ tự động kết nối lại sau 5–60 giây.

**H: Token MCP hết hạn thì sao?**
Đ: Vào xiaozhi.me → Thiết bị → MCP Settings → copy URL mới → cập nhật file mcp_service/.env → restart MCP Server.

**H: Có bao nhiêu giáo viên có thể dùng đồng thời?**
Đ: Hệ thống hỗ trợ nhiều giáo viên, mỗi người có tài khoản riêng. Tuy nhiên Xiaozhi (Alexa) là 1 thiết bị vật lý — mỗi lúc chỉ 1 giáo viên sử dụng được.

**H: Dữ liệu có được backup không?**
Đ: Database lưu tại `prisma/vihand.db`. Khuyến nghị backup file này định kỳ (hàng tuần).

---

## Tình Huống Đặc Biệt

**Tình huống: Học sinh xin đọc lại nhiều lần**
→ Giáo viên có thể yêu cầu Alexa đọc lại tối đa 3 lần. Số lần đọc được ghi vào `summary`.

**Tình huống: Giáo viên muốn sửa bài trước khi lưu**
→ Nói "Alexa, bài đó sửa thành: [nội dung mới]" → Alexa cập nhật → hỏi xác nhận lại trước khi lưu.

**Tình huống: Muốn xóa buổi học đã lưu nhầm**
→ Vào ViHand Grade → Đọc chính tả → Tìm buổi đó → Xóa thủ công (chỉ admin/giáo viên phụ trách lớp).

**Tình huống: Hai lớp học chính tả cùng một bài**
→ Gọi Alexa đọc 2 lần riêng, mỗi lần chỉ định tên lớp khác nhau khi lưu.
