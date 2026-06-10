# SCRIPT THUYẾT TRÌNH — ViHand Grade (Bản đầy đủ ~7 phút)

---

## SLIDE 1 — TRANG BÌA (20s)

> "Kính chào Hội đồng, kính thưa quý thầy cô. Nhóm chúng em xin trình bày đề tài: **Nghiên cứu và xây dựng hệ thống chấm điểm chính tả tiếng Việt viết tay cho học sinh tiểu học sử dụng Trí tuệ nhân tạo đa phương thức — ViHand Grade**. Đề tài thuộc Khoa Điện – Điện tử, dưới sự hướng dẫn của thầy Nguyễn Văn Anh."

---

## SLIDE 2 — ĐẶT VẤN ĐỀ (50s)

> "Tại các trường tiểu học Việt Nam, giáo viên phải chấm **35–45 bài viết tay mỗi ngày**, mỗi bài mất 3–5 phút — tổng cộng **2–3 tiếng ngoài giờ lên lớp**.
>
> Tự động hóa quy trình này gặp 3 thách thức lớn:
> 1. **Nhiễu ô ly** — đường kẻ đè lên dấu thanh tiếng Việt khiến OCR thông thường nhầm lẫn nghiêm trọng.
> 2. **Ảnh chất lượng kém** — bóng tay, rung tay, nét bút chì nhạt.
> 3. **Tiếng Việt phức tạp** — 6 dấu thanh, lỗi phương ngữ đặc thù l/n, ch/tr, s/x.
>
> Đây là lý do nhóm chọn đề tài này."

---

## SLIDE 3 — TỔNG QUAN GIẢI PHÁP (40s)

> "ViHand Grade là ứng dụng Web PWA kết hợp hai đóng góp kỹ thuật chính:
>
> **Thứ nhất** — Bộ tiền xử lý ảnh 9 bước viết hoàn toàn bằng JavaScript thuần (Jimp), không phụ thuộc OpenCV hay Python.
>
> **Thứ hai** — Kỹ thuật Prompt Engineering tích hợp barem sư phạm chuẩn Bộ GD&ĐT, gửi ảnh trực tiếp đến Google Gemini 3 Flash để OCR và chấm điểm trong một bước — loại bỏ sai số cộng dồn của phương pháp 2 bước truyền thống.
>
> Hệ thống xây dựng trên Next.js 16, TypeScript, Prisma ORM + SQLite."

---

## SLIDE 4 — CƠ SỞ LÝ THUYẾT (40s)

> "Về mặt lý thuyết, hệ thống dựa trên ba trụ cột:
>
> **OCR đa phương thức End-to-End**: Thay vì pipeline 2 bước truyền thống (OCR → NLP) dễ cộng dồn sai số, Gemini thực hiện nhận dạng và phân tích lỗi trong MỘT bước duy nhất.
>
> **Xử lý ảnh số**: Các thuật toán Gray World, Shadow Removal dùng Integral Image đạt O(1)/pixel, CLAHE với nội suy song tuyến, và Adaptive Threshold — tất cả được triển khai ở cấp pixel thuần TypeScript.
>
> **Prompt Engineering**: Kết hợp Role Prompting, Few-Shot Prompting và JSON Schema Constraint để ép AI chấm điểm theo đúng barem sư phạm."

---

## SLIDE 5 — PIPELINE 9 BƯỚC (50s)

> "Pipeline bắt đầu từ một thất bại: khi gửi ảnh thô lên Gemini, AI nhầm ô ly thành ký tự và bỏ sót nét chì mờ. Nguyên tắc thiết kế: **mỗi vấn đề — đúng một bước chuyên biệt**.
>
> 9 bước theo thứ tự logic:
> - Bước 1–2: Xoay EXIF và resize ảnh
> - Bước 3–4: Cân bằng trắng Gray World và chuyển xám
> - Bước 5: Khử bóng bằng Box Blur kernel 51×51 với Integral Image
> - Bước 6: CLAHE tăng tương phản cục bộ
> - Bước 7: Sharpen bằng Unsharp Mask
> - Bước 8: Quality Assessment — đánh giá trên **ảnh gốc** để tránh cảnh báo giả
> - Bước 9: Nhị phân hóa thích nghi (adaptiveC=20, blockSize=31)
>
> Toàn bộ chạy bằng Jimp — không cần OpenCV."

---

## SLIDE 6 — CHẤM ĐIỂM AI & BAREM (40s)

> "Gemini được cấu hình Temperature=0.1 để tối thiểu ảo giác, và ép trả về JSON Schema chặt.
>
> Barem 10 điểm theo 4 tiêu chí:
> - **Chính tả & Ngữ pháp (4đ)**: Trừ 0.5đ/lỗi cho lớp 1–3, 0.25đ/lỗi cho lớp 4–5
> - **Hình thức (3đ)**: Đánh giá nét chữ, khoảng cách
> - **Nội dung (2đ)**: Đủ ý, mạch lạc
> - **Sáng tạo (1đ)**: Cộng điểm khuyến khích
>
> AI phân loại lỗi theo 5 nhóm chuẩn: phụ âm đầu, vần, dấu thanh, viết hoa, bỏ sót/thêm."

---

## SLIDE 7 — KIẾN TRÚC HỆ THỐNG (35s)

> "Hệ thống theo kiến trúc Full-Stack trong một dự án Next.js duy nhất với 3 phân hệ RBAC:
> - **Teacher**: Chấm bài bằng AI, duyệt/chỉnh sửa điểm, xem báo cáo lớp
> - **Student**: Xem lịch sử điểm cá nhân, biểu đồ tiến bộ
> - **Admin**: Quản lý tài khoản, lớp học, giám sát hệ thống
>
> CSDL SQLite qua Prisma ORM với 3 model: User, Class, Grade. Cơ chế xoay vòng 4 API key ngẫu nhiên với failover tự động khi gặp lỗi 429/503."

---

## SLIDE 8 — KẾT QUẢ THỰC NGHIỆM CHÍNH (50s)

> "Thực nghiệm trên 27 mẫu ban đầu — 15 text + 12 ảnh viết tay thật:
>
> - **Tốc độ**: 100% hoàn thành dưới 30 giây, trung bình 11–15s/bài. Giảm 90–95% so với chấm thủ công.
> - **Độ tin cậy**: Tỷ lệ JSON hợp lệ đạt 96.3%.
> - **Phát hiện lỗi**: AI phát hiện đúng lỗi ở 100% ảnh có lỗi — 19 lỗi phân loại theo 5 nhóm.
> - **OCR**: Model gemini-3-flash-preview đạt Similarity 98.5% và Word Accuracy 95.4%.
>
> Bài viết đúng chính tả: AI chấm 10/10 với False Positive = 0% trên 9/9 mẫu chuẩn."

---

## SLIDE 9 — THỰC NGHIỆM MỞ RỘNG (45s)

> "Mở rộng thêm 108 mẫu thực tế:
>
> **49 ảnh thu thập trực tiếp từ trường học** — chạy 3 lần: JSON hợp lệ 100%, latency trung bình 4.89s, điểm trung bình 7.86/10.
>
> **50 ảnh ngẫu nhiên từ Internet** — tỷ lệ thành công 96%, latency 5.32s.
>
> **Consistency Study trên 49 ảnh × 3 lần**: 79.6% bài có điểm dao động không quá 0.5 điểm. Điểm trung bình tổng thể gần như không đổi (~7.86) — chênh lệch tối đa 0.09 điểm giữa các lần chạy."

---

## SLIDE 10 — TRIỂN KHAI RASPBERRY PI 4 (40s)

> "Đóng góp thực tiễn quan trọng: triển khai trên Raspberry Pi 4 — thiết bị nhúng ARM64 giá chỉ **1.5 triệu đồng**, tiết kiệm 90% chi phí.
>
> Kết quả: Page load 153ms, End-to-End latency 5.1 giây — chênh lệch so với PC phát triển chưa đến 5%. RAM peak 580MB/4GB, CPU 58°C — trong ngưỡng an toàn.
>
> Giáo viên trong trường truy cập qua WiFi nội bộ, ở nhà truy cập qua Cloudflare Tunnel HTTPS — không cần mở port router."

---

## SLIDE 11 — KẾT LUẬN (30s)

> "ViHand Grade đã chứng minh tính khả thi của AI đa phương thức trong chấm điểm chính tả viết tay tiểu học. Ba đóng góp chính:
> 1. Pipeline 9 bước JS thuần xử lý ảnh ô ly
> 2. Prompt Engineering barem sư phạm chuẩn 10 điểm
> 3. Triển khai thành công trên Raspberry Pi 4 chi phí thấp
>
> Hệ thống giảm 90–95% thời gian chấm bài, đạt OCR 98.5% và phát hiện lỗi 100%."

---

## SLIDE 12 — HƯỚNG PHÁT TRIỂN & CẢM ƠN (30s)

> "Hướng phát triển:
> - Huấn luyện SLM offline bảo mật dữ liệu học sinh
> - App Android tích hợp AR căn chỉnh ảnh
> - Mở rộng chấm bài Toán và trắc nghiệm OMR
> - Fine-tuning với dữ liệu thực tế từ trường tiểu học
>
> Chúng em xin cảm ơn Hội đồng đã lắng nghe. Nhóm sẵn sàng trả lời câu hỏi."

---

## BẢNG THỜI GIAN

| Slide | Nội dung | Thời gian |
|---|---|---|
| 1 | Trang bìa | 20s |
| 2 | Đặt vấn đề | 50s |
| 3 | Tổng quan giải pháp | 40s |
| 4 | Cơ sở lý thuyết | 40s |
| 5 | Pipeline 9 bước | 50s |
| 6 | Chấm điểm AI & Barem | 40s |
| 7 | Kiến trúc hệ thống | 35s |
| 8 | Kết quả thực nghiệm | 50s |
| 9 | Thực nghiệm mở rộng | 45s |
| 10 | Triển khai Raspberry Pi | 40s |
| 11 | Kết luận | 30s |
| 12 | Hướng phát triển | 30s |
| **Tổng** | | **~7 phút 10 giây** |

---

## CÂU HỎI PHẢN BIỆN THƯỜNG GẶP

**Q1: Tại sao không dùng Tesseract/Google Vision thay vì Gemini?**
> Tesseract/Vision chỉ trả text thô. Gemini vừa OCR vừa phân tích ngữ nghĩa, phân loại lỗi và chấm điểm trong 1 lần gọi — giảm sai số cộng dồn.

**Q2: Làm sao kiểm soát "ảo giác" của AI?**
> Temperature=0.1, JSON Schema bắt buộc, 4 API key xoay vòng + retry. Consistency Study: 79.6% bài dao động ≤0.5 điểm qua 3 lần chấm.

**Q3: Chi phí vận hành?**
> Phần cứng: 1.5 triệu (Pi). API Gemini miễn phí tier cơ bản (~80 request/ngày với 4 key). Không cần server cloud.

**Q4: Tại sao dùng Jimp thay vì OpenCV?**
> OpenCV Wasm ~8MB, cần môi trường C++/Python phức tạp. Jimp gọn nhẹ, chạy native TypeScript, tương thích đa nền tảng và dễ triển khai trên Pi.

**Q5: Pipeline có thực sự cải thiện OCR không?**
> Giai đoạn đầu gửi ảnh thô — AI nhầm ô ly thành ký tự, bỏ sót nét chì mờ. Sau pipeline: Similarity 98.5%, Word Accuracy 95.4%.

**Q6: Hệ thống có thể thay thế giáo viên không?**
> Không. ViHand Grade là công cụ hỗ trợ quyết định (DSS). Giáo viên luôn duyệt, chỉnh sửa điểm trước khi lưu chính thức.
