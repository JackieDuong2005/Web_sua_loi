# Chương 1: Giới thiệu đề tài

## 1.1. Bối cảnh và lý do chọn đề tài

### 1.1.1. Thực trạng dạy học chính tả tại trường tiểu học Việt Nam

Chính tả là môn học nền tảng trong chương trình giáo dục tiểu học Việt Nam, được giảng dạy từ lớp 1 đến lớp 5 với tần suất gần như mỗi ngày. Trong một buổi học điển hình, giáo viên đọc to từng câu từng đoạn văn, học sinh viết tay vào vở, sau đó giáo viên thu vở về chấm điểm thủ công.

Khảo sát thực tế tại các trường tiểu học cho thấy quy trình này tồn tại nhiều nút thắt nghiêm trọng:

| Vấn đề | Biểu hiện cụ thể |
|--------|-----------------|
| **Tốn thời gian chấm bài** | Mỗi bài chính tả mất 3–5 phút chấm tay; lớp 35 học sinh = 2–3 tiếng/buổi |
| **Thiếu nhất quán** | Giáo viên khác nhau chấm cùng bài có thể cho điểm khác nhau 0.5–1.5 điểm |
| **Phản hồi chung chung** | Chỉ ghi "Sai dấu hỏi/ngã", không chỉ rõ vị trí, nguyên nhân, cách sửa |
| **Chậm trễ trong đọc bài** | Không có thiết bị hỗ trợ đọc chuẩn; giáo viên phải vừa đọc vừa kiểm soát lớp |
| **Không theo dõi tiến bộ** | Điểm số ghi tay, khó tổng hợp lịch sử và phân tích xu hướng lỗi của từng học sinh |

### 1.1.2. Cơ hội từ công nghệ AI

Sự phát triển của Trí tuệ nhân tạo, đặc biệt là:
- **Mô hình ngôn ngữ lớn (LLM):** Google Gemini có khả năng nhận dạng chữ viết tay tiếng Việt qua hình ảnh với độ chính xác cao.
- **Mô hình sửa lỗi chính tả tiếng Việt (ViT5):** Được huấn luyện trên tập dữ liệu tiếng Việt đặc thù, có thể chạy trên thiết bị nhúng (Raspberry Pi, máy tính cá nhân).
- **Thiết bị AI giọng nói nhúng (Xiaozhi ESP32-S3):** Cho phép triển khai trợ lý giọng nói AI có thể đọc bài chính tả tự động tại lớp học với chi phí phần cứng thấp (~500.000 VNĐ/thiết bị).

Ba công nghệ này tạo ra cơ hội để xây dựng một hệ thống đọc và chấm điểm chính tả thông minh, có thể triển khai thực tế tại các trường tiểu học Việt Nam với chi phí thấp.

---

## 1.2. Mục tiêu đề tài

### 1.2.1. Mục tiêu tổng quát

Xây dựng hệ thống **ViHand Grade** — một nền tảng AI tích hợp hỗ trợ giáo viên tiểu học trong toàn bộ quy trình kiểm tra chính tả: từ đọc bài tự động bằng giọng nói, nhận dạng chữ viết tay, chấm điểm AI, đến quản lý và báo cáo kết quả.

### 1.2.2. Mục tiêu cụ thể

| # | Mục tiêu | Chỉ số đo lường thành công |
|---|----------|--------------------------|
| 1 | Tự động hóa việc đọc bài chính tả | Xiaozhi AI đọc đúng tốc độ, đúng số lần, lưu lịch sử |
| 2 | Nhận dạng chữ viết tay tiếng Việt | Độ chính xác OCR ≥ 90% ký tự có dấu |
| 3 | Chấm điểm tự động có giải thích | Thời gian ≤ 30 giây/bài; liệt kê từng lỗi cụ thể |
| 4 | Phân quyền người dùng | Admin / Giáo viên / Học sinh với quyền truy cập phù hợp |
| 5 | Hoạt động trên phần cứng tiết kiệm | Chạy ổn định trên Raspberry Pi 4 (4GB RAM) |
| 6 | Không phụ thuộc hoàn toàn vào Internet | Chấm điểm offline bằng ViT5 cục bộ |

---

## 1.3. Phạm vi nghiên cứu

### 1.3.1. Phạm vi chức năng

**Hệ thống ViHand Grade bao gồm:**
- **Module 1 — Xiaozhi Dictation Robot:** Thiết bị AI giọng nói đọc bài chính tả, giao tiếp tự nhiên với giáo viên, lưu phiên đọc vào hệ thống qua MCP Server.
- **Module 2 — Image Processing Pipeline:** Tiền xử lý ảnh chụp bài viết tay học sinh (9 bước) để tối ưu cho OCR.
- **Module 3 — OCR bằng Google Gemini:** Trích xuất văn bản nguyên bản từ ảnh bài viết.
- **Module 4 — ViT5 Grading Engine:** Sửa lỗi chính tả, so khớp Levenshtein, phân loại lỗi, tính điểm theo 4 tiêu chí.
- **Module 5 — Web Dashboard:** Giao diện cho 3 vai trò người dùng, báo cáo tiến bộ học sinh.

**Ngoài phạm vi:**
- Không hỗ trợ các môn học khác ngoài chính tả tiếng Việt.
- Không bao gồm chức năng chấm Toán, Khoa học, hay các bài kiểm tra trắc nghiệm.
- Không tích hợp hệ thống quản lý học sinh cấp quận/huyện (SMAS, VNPT School...).

### 1.3.2. Phạm vi phần cứng và triển khai

- **Phần cứng tối thiểu:** Raspberry Pi 4 Model B (4GB RAM) cho máy chủ; điện thoại thông minh (iOS/Android) cho giáo viên chụp ảnh; thiết bị Xiaozhi ESP32-S3 cho tính năng đọc bài.
- **Môi trường:** Trường tiểu học Việt Nam; hỗ trợ kết nối LAN nội bộ và truy cập từ xa qua Cloudflare Tunnel.
- **Dữ liệu:** Bài chính tả của học sinh lớp 1–5 chương trình giáo dục phổ thông 2018.

---

## 1.4. Phương pháp nghiên cứu

### 1.4.1. Phương pháp nghiên cứu lý thuyết

- **Nghiên cứu tài liệu:** Đọc và tổng hợp các bài báo khoa học về OCR tiếng Việt, mô hình Seq2Seq, thuật toán Levenshtein, và các hệ thống chấm điểm tự động.
- **So sánh công nghệ:** Đánh giá các mô hình AI tiếng Việt (BARTpho, ViT5, PhoBERT) để chọn giải pháp phù hợp với tài nguyên phần cứng hạn chế.
- **Phân tích bài toán:** Nghiên cứu chương trình chính tả tiểu học, thu thập mẫu bài viết thực tế để hiểu đặc điểm dữ liệu đầu vào.

### 1.4.2. Phương pháp thực nghiệm

- **Phát triển lặp tăng dần (Iterative & Incremental):** Xây dựng và kiểm thử từng module độc lập trước khi tích hợp toàn hệ thống.
- **Thử nghiệm thực tế:** Chạy thử nghiệm với bài chính tả thực tế của học sinh để đánh giá độ chính xác và tốc độ xử lý.
- **Human-in-the-Loop:** Thiết kế quy trình giáo viên luôn là người kiểm duyệt cuối cùng trước khi lưu kết quả, đảm bảo tính sư phạm.

---

## 1.5. Cấu trúc báo cáo

| Chương | Nội dung |
|--------|----------|
| **Chương 1** | Giới thiệu đề tài — Bối cảnh, mục tiêu, phạm vi, phương pháp nghiên cứu |
| **Chương 2** | Cơ sở lý thuyết — OCR, mô hình NLP tiếng Việt, thuật toán Levenshtein, kiến trúc hệ thống nhúng |
| **Chương 3** | Thiết kế hệ thống — Kiến trúc Hybrid AI, Pipeline xử lý ảnh, module chấm điểm, phân quyền RBAC |
| **Chương 4** | Xây dựng ứng dụng — Công nghệ sử dụng, cài đặt, triển khai trên Raspberry Pi |
| **Chương 5** | Kết quả thực nghiệm — Đánh giá độ chính xác, tốc độ, so sánh với chấm tay |
| **Chương 6** | Kết luận và hướng phát triển — Tổng kết, hạn chế, đề xuất cải tiến |
| **Phụ lục** | Lưu đồ giải thuật, sơ đồ cơ sở dữ liệu, tài liệu API |

---

## 1.6. Tóm tắt chương

Chương 1 đã xác định rõ bối cảnh thực tiễn của bài toán chấm điểm chính tả thủ công tại trường tiểu học Việt Nam, phân tích cơ hội từ các công nghệ AI hiện đại, và định nghĩa phạm vi, mục tiêu cụ thể của hệ thống ViHand Grade. Hệ thống được thiết kế theo triết lý **AI hỗ trợ, giáo viên quyết định** — đảm bảo ứng dụng AI có trách nhiệm trong môi trường giáo dục.

Các chương tiếp theo sẽ đi sâu vào cơ sở lý thuyết (Chương 2), thiết kế kiến trúc chi tiết (Chương 3), quá trình hiện thực hóa (Chương 4), và đánh giá kết quả thực tế (Chương 5).
