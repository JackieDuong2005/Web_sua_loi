# ⚡ SCRIPT THUYẾT TRÌNH RÚT GỌN – 7 PHÚT
## Hội đồng Nghiệm thu NCKH Sinh viên – Khoa Điện – Điện Tử
### Đề tài: Phát triển thiết bị sửa lỗi và chấm điểm chính tả tự động cho học sinh tiểu học

---

> **Ghi chú sử dụng**
> - 🎙️ = Lời thuyết trình
> - ⏱️ = Thời lượng từng slide
> - 🔵 = Từ khóa cần nhấn mạnh
> - Tổng thời lượng: **~7 phút**
> - Cấu trúc slide: **1, 2, 3, 4, 6, 8, 9, 11, 12, 14, 15, 19, 20, 21, 22, 23, 24, 26, 27**

---

## SLIDE 1 – Trang bìa ⏱️ *~15 giây*

🎙️
> "Kính thưa quý thầy cô trong Hội đồng, thưa các bạn. Cho phép nhóm em bắt đầu buổi bảo vệ đề tài NCKH Sinh viên năm học 2025–2026. Nhóm em xin trân trọng cảm ơn Hội đồng đã dành thời gian lắng nghe."

---

## SLIDE 2 – Đề tài & Nhóm nghiên cứu ⏱️ *~30 giây*

🎙️
> "Đề tài của nhóm em: **'Phát triển thiết bị sửa lỗi và chấm điểm chính tả tự động cho học sinh tiểu học'** — thực hiện dưới sự hướng dẫn của **Tiến sĩ Lê Anh Vũ**. Nhóm gồm: **Dương Thành Long – 42300176**, **Phạm Hoài Quốc Bảo – 42300262**, **Nguyễn Thanh Phúc – 42300350**."

---

## SLIDE 3 – Lý do chọn đề tài ⏱️ *~40 giây*

🎙️
> "Giáo viên tiểu học phải chấm tay **35–45 bài**, mỗi bài **3–5 phút** — tốn hơn **3 tiếng/lần**. Nhóm em xác định 5 động lực chính:
> áp lực chấm bài lớn — đặc thù phức tạp của **chữ viết tay tiếng Việt** — cơ hội từ **mô hình AI đa phương thức** — yêu cầu **tối ưu chi phí và tính khả thi** — và tính cấp thiết cho **chuyển đổi số giáo dục Việt Nam**."

---

## SLIDE 4 – Thách thức nghiên cứu ⏱️ *~30 giây*

🎙️
> "Nhóm đối mặt 5 thách thức: **thiếu dữ liệu chuẩn** — **nét chữ và giấy ô ly** phức tạp — **chất lượng ảnh chụp** không đồng đều — **rào cản tích hợp AI** xử lý ngôn ngữ — và **giới hạn phần cứng** phải chạy trên Raspberry Pi chi phí thấp."

---

## SLIDE 6 – Mục tiêu nghiên cứu ⏱️ *~25 giây*

🎙️
> "Mục tiêu tổng quát: *'Cung cấp công cụ hỗ trợ nhận dạng chữ viết tay tiếng Việt, chấm điểm và sửa lỗi chính tả tự động.'* Chia thành hai nhóm: **Kỹ thuật** — Luồng xử lý từ trích xuất OCR đến chấm điểm; **Sư phạm** — tiết kiệm thời gian giáo viên và phản hồi chính xác cho học sinh."

---

## SLIDE 8 – Đối tượng | Nội dung | Kỹ thuật | Môi trường ⏱️ *~20 giây*

🎙️
> "Đối tượng: bài chính tả viết tay học sinh **lớp 1–5**. Nội dung: xử lý ảnh, OCR, NLP tiếng Việt. Môi trường: hệ thống **Web chạy trên Raspberry Pi 4**, giáo viên dùng điện thoại chụp ảnh và truy cập qua trình duyệt."

---

## SLIDE 9 – Quy trình hoạt động của thiết bị ⏱️ *~30 giây*

🎙️
> "Pipeline hoạt động 5 bước: **① Chụp ảnh** → **② Làm sạch & chuẩn hóa** → **③ OCR qua Cloud API (Gemini)** — nhận dạng và trích xuất văn bản → **④ Phân tích chính tả bằng Local AI** theo quy tắc sư phạm → **⑤ Chấm điểm**, lưu vào bộ dữ liệu và hiển thị trên Giao diện Web. Toàn bộ tự động trên thiết bị phần cứng Raspberry pi — giáo viên chỉ cần chụp và upload."

---

## SLIDE 11 – Tiền xử lý ảnh 9 bước ⏱️ *~30 giây*

🎙️
> "Tiền xử lý gồm **9 bước** qua 3 giai đoạn: **Chuẩn hóa hình học** — xoay lật, resize, cân bằng trắng, chuyển sang hệ Xám; **Tăng cường hình ảnh** — khử bóng đổ, tăng tương phản, làm sắc nét; **Phân tách** — nhị phân hóa và kiểm định chất lượng. Kết quả đảm bảo ảnh đầu vào luôn được chuẩn hóa dù điều kiện chụp như thế nào."

---

## SLIDE 12 – Mô hình đề xuất ⏱️ *~20 giây*

🎙️
> "Sau tiền xử lý thì bức ảnh được đưa vào 3 mô hình chính của hệ thống bao gồm mô hình nhận diện dùng chữ viết tay, mô hình sửa lỗi chính tả và mô hình chấm điểm."

---

## SLIDE 14 – Demo kết quả nhận diện ⏱️ *~25 giây*

🎙️
> "Đây là kết quả thực tế: ảnh bài viết tay học sinh → hệ thống xuất **JSON có cấu trúc** cho mỗi từ sai, gồm: từ lỗi, từ đúng đề xuất, phân loại lỗi (`phu_am_dau`, `van`...), có phải lỗi phương ngữ không và lý giải chi tiết bằng tiếng Việt tự nhiên. Đây chính là phản hồi có giá trị giáo dục."

---

## SLIDE 15 – So sánh mô hình nhận diện ⏱️ *~30 giây*

🎙️
> "Nhóm thử nghiệm 5 mô hình OCR trên dữ liệu **chưa qua tiền xử lý**:
> **Gemini API: 85–95%** ✔ — Chandra OCR: 80–87% — Light-on-OCR1B: 78–84% — Tesseract & VietOCR: 0–5% — EasyOCR: 0%.
> Gemini vượt trội trên cả 3 tiêu chí: **Độ chính xác** 85–95%, **Độ ổn định** xử lý dưới 30s, **Tính thực tiễn** không đòi hỏi phần cứng đắt đỏ."

---

## SLIDE 19 – Demo sửa lỗi ViHandGrade ⏱️ *~20 giây*

🎙️
> "Minh họa thực tế: bài viết có 2 lỗi — 'tết' thiếu dấu sắc, 'đường' sai vần. Sau khi **ViHandGrade** xử lý: cả hai lỗi được sửa chính xác. Mô hình **ViT5** được chọn vì tối ưu nhất trên 4 tiêu chí: chất lượng sửa lỗi, tương thích dữ liệu, hiệu năng phần cứng và tích hợp chấm điểm."

---

## SLIDE 20 – ViT5 – Chi tiết kỹ thuật ⏱️ *~30 giây*

🎙️
> "ViT5 nền tảng **T5 — Text-to-Text Transformer**, tiền huấn luyện trên bộ dữ liệu tiếng Việt với **226 triệu tham số**. Bài toán sửa lỗi → **Seq2Seq**: nhận câu sai, 'dịch' thành câu đúng. Kết quả fine-tune: sau **60.000 bước**, đạt **SacreBLEU 39.17%**. Best Checkpoint tại Step 15.000, Val Loss 0.17 — mô hình không bị overfitting."

---

## SLIDE 21 – Thuật toán chấm điểm ⏱️ *~25 giây*

🎙️
> "Chấm điểm tổ hợp hai lớp: **SequenceMatcher** so sánh từng từ — Thay thế / Khớp / Thiếu; **Rule-based** áp dụng thang **10 điểm** gồm: Chính tả (4đ) + Hình thức (3đ) + Nội dung (2đ) + Sáng tạo (1đ). Xếp loại tự động: Cần cố gắng → Trung bình → Khá → Tốt → **Xuất sắc**."

---

## SLIDE 22 – Section Break ⏱️ *~5 giây*

🎙️ *(Chuyển slide nhanh)* > "Phần tiếp theo — **Kiến trúc thiết bị**."

---

## SLIDE 23 – Thiết bị & Vai trò hệ thống ⏱️ *~20 giây*

🎙️
> "Phần cứng lõi: **Raspberry Pi 4 Model B** — CPU Quad-core 1.5GHz, RAM 4GB — đóng vai trò máy chủ Web quản lý toàn bộ dữ liệu lớp học. Ưu điểm: **nhỏ gọn, chi phí 2–3 triệu đồng, tiêu thụ chỉ 3–7W** — phù hợp triển khai đại trà tại mọi trường tiểu học."

---

## SLIDE 24 – Giải pháp Kết nối & Truy cập từ xa ⏱️ *~25 giây*

🎙️
> "Kiến trúc 4 lớp: **Người dùng** (laptop/điện thoại) → **Cloudflare CDN** (TLS, HTTPS, SSL tự động, DDoS Protection) → **Raspberry Pi** chạy Web server **Vihandgrate.click** + Local AI + SQLite → kết nối **Google Gemini API** (OCR) và **LLM Agent qua MCP server** (sửa lỗi). Giáo viên truy cập từ bất kỳ đâu, bảo mật cao."

---

## SLIDE 26 – Đóng góp của nghiên cứu ⏱️ *~20 giây*

🎙️
> "Ba đóng góp chính: **①** Ứng dụng thị giác máy tính trong giáo dục — tích hợp OCR, NLP tiếng Việt cho tiểu học. **②** Giảm thời gian chấm bài từ **3–5 phút xuống dưới 30 giây**. **③** Thúc đẩy chuyển đổi số giáo dục. Lưu ý: hệ thống cần **giám sát của giáo viên** — AI hỗ trợ, không thay thế."

---

## SLIDE 27 – Hướng phát triển ⏱️ *~20 giây*

🎙️
> "Bốn hướng phát triển: **① Local LLM** — mô hình chạy hoàn toàn cục bộ, độc lập Internet; **② Chuẩn hóa sư phạm** — hợp tác chuyên gia, mở rộng dữ liệu; **③ Mobile App** — iOS/Android thân thiện trẻ em; **④ Mở rộng chấm bài** — trắc nghiệm, công thức toán học."

---

## LỜI KẾT ⏱️ *~15 giây*

🎙️
> "Nhóm em đã trình bày đề tài **Thiết bị sửa lỗi và chấm điểm chính tả tự động cho học sinh tiểu học**. Xin cảm ơn **Tiến sĩ Lê Anh Vũ** và toàn thể Hội đồng. **Nhóm em xin kính chào và sẵn sàng lắng nghe ý kiến!**"

---

## 📊 PHÂN BỔ THỜI GIAN

| Slide | Nội dung | Thời gian |
|:-----:|----------|:---------:|
| 1 | Trang bìa | 15 giây |
| 2 | Đề tài & Nhóm | 30 giây |
| 3 | Lý do chọn đề tài | 40 giây |
| 4 | Thách thức | 30 giây |
| 6 | Mục tiêu | 25 giây |
| 8 | Đối tượng / Nội dung | 20 giây |
| 9 | Quy trình hoạt động | 30 giây |
| 11 | Tiền xử lý 9 bước | 30 giây |
| 12 | Mô hình đề xuất | 20 giây |
| 14 | Demo nhận diện thực tế | 25 giây |
| 15 | So sánh OCR | 30 giây |
| 19 | Demo sửa lỗi ViHandGrade | 20 giây |
| 20 | ViT5 chi tiết | 30 giây |
| 21 | Thuật toán chấm điểm | 25 giây |
| 22 | Section break | 5 giây |
| 23 | Thiết bị Raspberry Pi | 20 giây |
| 24 | Kết nối & Truy cập từ xa | 25 giây |
| 26 | Đóng góp nghiên cứu | 20 giây |
| 27 | Hướng phát triển | 20 giây |
| — | Lời kết | 15 giây |
| **Tổng** | | **~7 phút** |

---

*Script rút gọn 7 phút — tập trung vào các từ khóa và con số quan trọng nhất. Dành 3 phút cuối cho phần Q&A.*
