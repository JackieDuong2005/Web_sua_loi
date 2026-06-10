# SCRIPT THUYẾT TRÌNH NGHIÊN CỨU KHOA HỌC
## ViHand Grade — Hệ thống chấm điểm chính tả tiếng Việt viết tay cho học sinh tiểu học
**Thời gian: 5–7 phút | Trường Đại học Tôn Đức Thắng**

---

## SLIDE 1 — TRANG BÌA (30 giây)

> "Kính chào Hội đồng, kính thưa quý thầy cô và các bạn. Nhóm chúng em xin trình bày đề tài nghiên cứu khoa học:
> **'Nghiên cứu và xây dựng hệ thống chấm điểm chính tả tiếng Việt viết tay cho học sinh tiểu học sử dụng Trí tuệ nhân tạo đa phương thức — ViHand Grade.'**
> Đề tài thuộc Khoa Điện – Điện tử, dưới sự hướng dẫn của thầy Nguyễn Văn Anh."

---

## SLIDE 2 — ĐẶT VẤN ĐỀ (60 giây)

> "Chúng ta hãy bắt đầu với một thực trạng rất quen thuộc tại các trường tiểu học Việt Nam.
> Mỗi ngày, giáo viên phải chấm tay hàng chục quyển vở viết tay của học sinh — mỗi bài mất từ **3 đến 5 phút**. Nhân với sĩ số lớp thường **35–45 em**, đây là công việc chiếm đến **2–3 tiếng đồng hồ mỗi ngày**, ngoài giờ lên lớp.
>
> Câu hỏi đặt ra: **Tại sao chúng ta chưa tự động hóa được quy trình này?**
>
> Bởi vì chữ viết tay học sinh tiểu học đặt ra những thách thức kỹ thuật rất đặc thù:
> - **Nhiễu từ dòng kẻ ô ly** — đường kẻ đè lên dấu thanh tiếng Việt, làm các hệ thống OCR nhầm lẫn nghiêm trọng.
> - **Chất lượng ảnh kém** — bóng tay che khuất, rung tay, nét bút chì nhạt màu.
> - **Sự phức tạp của tiếng Việt** — 6 dấu thanh, lỗi phương ngữ đặc thù từng vùng miền.
>
> Đây chính là lý do nhóm chúng em quyết định thực hiện đề tài này."

---

## SLIDE 3 — GIẢI PHÁP TỔNG QUAN (45 giây)

> "Hệ thống **ViHand Grade** là một ứng dụng Web tiến trình — hay còn gọi là PWA — được xây dựng trên nền tảng Next.js, TypeScript và cơ sở dữ liệu SQLite thông qua Prisma ORM.
>
> Điểm cốt lõi của nghiên cứu là sự kết hợp giữa **hai đóng góp kỹ thuật chính**:
>
> **Thứ nhất** — Bộ tiền xử lý ảnh 9 bước chạy hoàn toàn bằng JavaScript thuần (thư viện Jimp), không phụ thuộc vào Python hay OpenCV — phù hợp triển khai đa nền tảng.
>
> **Thứ hai** — Kỹ thuật Prompt Engineering tích hợp barem chấm điểm chuẩn sư phạm của Bộ GD&ĐT, gửi ảnh trực tiếp đến mô hình **Google Gemini** để thực hiện đồng thời OCR và phân tích ngôn ngữ — loại bỏ sai số cộng dồn của phương pháp 2 bước truyền thống."

---

## SLIDE 4 — PIPELINE 9 BƯỚC (60 giây)

> "Hành trình thiết kế Pipeline bắt đầu từ một thất bại: khi nhóm thử gửi ảnh thô trực tiếp lên Gemini mà không qua tiền xử lý — AI liên tục nhầm đường kẻ ô ly thành ký tự gạch ngang và bỏ sót nét bút chì mờ trong vùng bóng tối.
>
> Nhóm đặt ra nguyên tắc: **mỗi vấn đề phải có đúng một bước xử lý chuyên biệt.** Kết quả là Pipeline 9 bước với logic rõ ràng từ đầu đến cuối:
>
> - **Bước 1–2:** Chỉnh xoay EXIF và thu nhỏ ảnh
> - **Bước 3–4:** Cân bằng trắng và chuyển ảnh xám
> - **Bước 5:** Khử bóng tối bằng Box Blur
> - **Bước 6:** Tăng cường độ tương phản cục bộ — CLAHE
> - **Bước 7:** Làm sắc nét biên ký tự
> - **Bước 8:** Đánh giá chất lượng ảnh — quan trọng là bước này đánh giá trên **bản sao ảnh gốc** chứ không phải ảnh đã qua xử lý, để tránh cảnh báo giả
> - **Bước 9:** Nhị phân hóa thích nghi — tạo ảnh đen trắng hoàn hảo
>
> Cấu hình tối ưu sau nhiều vòng thực nghiệm: `adaptiveC = 20`, `blockSize = 31`."

---

## SLIDE 5 — PROMPT ENGINEERING VÀ CHẤM ĐIỂM AI (45 giây)

> "Về phần AI, thay vì OCR trước rồi mới dùng NLP — chúng em chọn cách gửi **ảnh gốc trực tiếp** đến Gemini với một System Prompt đặc biệt.
>
> Mô hình đóng vai một giáo viên tiểu học Việt Nam và chấm theo **barem 10 điểm chuẩn** gồm 4 tiêu chí:
> - **Chính tả & Ngữ pháp:** 4 điểm — trừ 0.5đ/lỗi cho lớp 1–3, 0.25đ/lỗi cho lớp 4–5
> - **Hình thức:** 3 điểm
> - **Nội dung:** 2 điểm
> - **Sáng tạo:** 1 điểm cộng khuyến khích
>
> Để tránh hiện tượng 'ảo giác' của AI, chúng em đặt `Temperature = 0.1` — cực thấp — và ép AI trả về dữ liệu có cấu trúc **JSON Schema** định sẵn, bao gồm văn bản gốc, văn bản sửa, danh sách lỗi chi tiết theo từng loại."

---

## SLIDE 6 — KẾT QUẢ THỰC NGHIỆM (75 giây)

> "Phần thực nghiệm được tiến hành trên **tổng cộng 27 mẫu** gồm 15 văn bản text và 12 ảnh chữ viết tay thật, cộng thêm 6 ảnh benchmark riêng cho so sánh các model.
>
> **Về tốc độ xử lý:**
> Toàn bộ 27/27 mẫu hoàn thành trong vòng 30 giây — đạt **100%**, vượt mục tiêu đề ra. Thời gian trung bình dao động từ 11.3 đến 15.2 giây tùy chế độ. So với chấm thủ công 3–5 phút, hệ thống rút ngắn thời gian **90–95%**.
>
> **Về độ tin cậy:**
> Tỷ lệ JSON hợp lệ đạt **96.3%** — vượt ngưỡng 95% đề ra. Trường hợp thất bại duy nhất là bài viết có quá nhiều lỗi phương ngữ n/l khiến phản hồi vượt giới hạn token.
>
> **Về phát hiện lỗi chính tả từ ảnh:**
> AI phát hiện đúng lỗi ở **100% ảnh có lỗi** — 6 trên 6 ảnh — tổng cộng 19 lỗi, phân loại chính xác theo 5 nhóm: phụ âm đầu, vần, dấu thanh, viết hoa và bỏ sót.
>
> **Về OCR:**
> Model `gemini-3-flash-preview` đạt Similarity **98.5%** và Word Accuracy **95.4%** trên chữ viết tay tiếng Việt ô ly thực tế.
>
> Quan trọng không kém — **False Positive bằng 0%** trên bài viết đúng chính tả: AI không báo lỗi sai trên 9/9 bài chuẩn."

---

## SLIDE 7 — TRIỂN KHAI RASPBERRY PI 4 (45 giây)

> "Một trong những đóng góp thực tiễn quan trọng của đề tài là chứng minh hệ thống có thể chạy trên **Raspberry Pi 4 Model B** — thiết bị nhúng ARM64 có giá chỉ **1.5 triệu đồng**, tiết kiệm **90% chi phí** so với máy tính phát triển thông thường.
>
> Kết quả: Page load latency trung bình chỉ **153ms**, End-to-End latency **5.1 giây** — chênh lệch so với máy tính phát triển chưa đến 5%. RAM sử dụng peak **580MB / 4GB**, nhiệt độ CPU **58°C** — hoàn toàn trong ngưỡng an toàn.
>
> Điều này khẳng định tính khả thi kinh tế: một trường tiểu học hoàn toàn có thể triển khai ViHand Grade với chi phí phần cứng tối thiểu, kết nối toàn trường qua WiFi thông qua Cloudflare Tunnel."

---

## SLIDE 8 — KẾT LUẬN VÀ HƯỚNG PHÁT TRIỂN (45 giây)

> "Tóm lại, **ViHand Grade** đã chứng minh tính khả thi của việc ứng dụng AI đa phương thức vào bài toán chấm điểm chính tả tiếng Việt viết tay — một bài toán vốn được xem là rất khó do đặc thù kỹ thuật của chữ viết học sinh tiểu học.
>
> Hệ thống kết hợp thành công ba yếu tố: **kiến trúc Web hiện đại** — Next.js, **phần cứng nhúng chi phí thấp** — Raspberry Pi 4, và **sức mạnh Cloud AI** — Google Gemini.
>
> Về hướng phát triển, nhóm đề xuất:
> - **Huấn luyện mô hình SLM offline** chạy cục bộ để bảo mật dữ liệu học sinh
> - **Phát triển ứng dụng Android** tích hợp AR căn chỉnh khung hình
> - **Mở rộng sang chấm bài Toán** và phiếu trắc nghiệm
> - **Fine-tuning** với bộ dữ liệu thu thập thực tế từ các trường tiểu học địa phương
>
> Chúng em xin cảm ơn Hội đồng đã lắng nghe. Nhóm sẵn sàng trả lời câu hỏi."

---

## BẢNG THỜI GIAN TỔNG HỢP

| Slide | Nội dung | Thời gian |
|---|---|---|
| 1 | Trang bìa | 30 giây |
| 2 | Đặt vấn đề | 60 giây |
| 3 | Giải pháp tổng quan | 45 giây |
| 4 | Pipeline 9 bước | 60 giây |
| 5 | Prompt Engineering & AI | 45 giây |
| 6 | Kết quả thực nghiệm | 75 giây |
| 7 | Triển khai Raspberry Pi | 45 giây |
| 8 | Kết luận & Hướng phát triển | 45 giây |
| **Tổng** | | **~6 phút 45 giây** |

---

## GỢI Ý CÂU HỎI PHẢN BIỆN THƯỜNG GẶP

**Q: Tại sao không dùng Tesseract hoặc Google Vision thay vì Gemini?**
> A: Tesseract và Vision chỉ trả về text thô — chúng em cần AI vừa OCR vừa phân tích ngữ nghĩa, phân loại lỗi và chấm điểm theo barem sư phạm trong một lần gọi API. Gemini đa phương thức cho phép làm tất cả trong một bước, giảm sai số cộng dồn.

**Q: Làm sao đảm bảo độ tin cậy khi AI có thể "ảo giác"?**
> A: Nhóm áp dụng ba lớp kiểm soát: Temperature = 0.1 để ép AI tập trung, JSON Schema bắt buộc để validate cấu trúc, và cơ chế xoay vòng 4 API key với retry tự động. Consistency Study cho thấy 79.6% bài có điểm dao động không quá 0.5 điểm qua 3 lần chấm.

**Q: Chi phí vận hành hệ thống thực tế là bao nhiêu?**
> A: Chi phí phần cứng 1.5 triệu đồng (Pi). Chi phí API Gemini miễn phí ở tier cơ bản — phù hợp quy mô trường tiểu học. Không cần server cloud đắt tiền.
