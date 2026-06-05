# Báo cáo So sánh Benchmark — Tính Đồng Nhất (Consistency)

> **Mục tiêu:** Đánh giá độ ổn định và tính nhất quán của hệ thống ViHand Grade bằng cách yêu cầu AI xử lý **cùng một ảnh 3 lần liên tiếp** (tổng 147 lượt xử lý cho 49 ảnh thực tế). Việc này kiểm tra xem LLM có đưa ra kết quả nhận dạng chữ viết (OCR) và sửa lỗi giống hệt nhau ở mỗi lần chạy hay không.

| Thông tin | Giá trị |
|---|---|
| **Thư mục ảnh** | `Ảnh viết tay 76 thực tế` |
| **Số ảnh test** | 49 ảnh |
| **Số lần lặp/ảnh**| 3 lần liên tiếp |
| **Model AI** | `gemini-3.1-flash-lite` |
| **Nguồn dữ liệu** | `benchmark_thuc_te_results.json` |

---

## 1. Chỉ số tổng thể — So sánh 3 lần chạy

| Chỉ số | Lần 1 | Lần 2 | Lần 3 | Trung bình |
|---|---|---|---|---|
| JSON hợp lệ | ~100% | ~100% | ~100% | **~100%** |
| Điểm trung bình | 7.90 | 7.86 | 7.81 | **7.86/10** |
| Mean latency | 5.84s | 4.41s | 4.41s | **4.89s** |
| Tổng lỗi phát hiện | 187 | 197 | 200 | **195** |

> ✅ **Phân tích:**
> - **Điểm trung bình** của 3 lần chạy dao động trong khoảng hẹp (7.81 – 7.90), chênh lệch tối đa chỉ **0.09 điểm**. Tính ổn định ở mức tổng thể là cực kỳ tốt.
> - **Latency** ở lần chạy 1 cao hơn (5.84s) do hệ thống "khởi động" (cold start) hoặc tải API, các lần sau ổn định ở mức rất nhanh (4.41s). Toàn bộ đều vượt chuẩn < 30s.

---

## 2. Kiểm tra Độ Đồng Nhất Tuyệt Đối (Strict Match)

Hệ thống so sánh **chuỗi ký tự chính xác (exact string match)** của văn bản OCR, văn bản sửa lỗi và điểm số giữa cả 3 lần chạy đối với từng ảnh.

| Tiêu chí | Số ảnh giống hệt (3/3 lần) | Tỷ lệ | Đánh giá |
|---|---|---|---|
| **Nhận dạng chữ (OCR)** | **31 / 49 ảnh** | **63.3%** | Khá (Bình thường với AI) |
| **Văn bản sau sửa lỗi** | **26 / 49 ảnh** | **53.1%** | Trung bình - Khá |
| **Điểm số (Score)** | **25 / 49 ảnh** | **51.0%** | Chấp nhận được |

> ⚠️ **Nhận định về LLM (Gemini):**
> - **Đồng nhất 63.3% OCR:** Tỷ lệ này là bình thường với các mô hình ngôn ngữ lớn (LLM). AI thường thay đổi cách dịch chữ hoặc nhận dạng sai các nét mờ, dấu câu ở các lần chạy khác nhau dù `temperature = 0.1`. (Ví dụ: `thành phố` vs `Thành phố`, `l/n`).
> - **Đồng nhất điểm số (51.0%):** Khoảng một nửa số bài thi có điểm số giống hệt nhau hoàn toàn qua 3 lần chấm. Số bài còn lại có sự thay đổi nhẹ do AI nhận dạng số lỗi khác nhau.

---

## 3. Phân tích độ lệch điểm số (Score Spread)

Mặc dù chỉ có 51% ảnh có điểm số giống hệt nhau tuyệt đối, nhưng **mức độ chênh lệch điểm (spread)** ở các ảnh còn lại mới là yếu tố quyết định tính ứng dụng.

| Mức chênh lệch tối đa (Spread) | Số ảnh | Tỷ lệ | Đánh giá |
|---|---|---|---|
| Không chênh lệch (Spread = 0.0) | 25 | 51.0% | ✅ Giống hệt tuyệt đối |
| Chênh lệch ≤ 0.5 điểm | 14 | 28.6% | ✅ Chênh lệch rất nhỏ (Chấp nhận) |
| Chênh lệch > 0.5 điểm | 10 | 20.4% | ⚠️ Điểm dao động đáng kể |

> ✅ **Tổng hợp:** Gần **80% (79.6%) bài thi có điểm số dao động không quá 0.5 điểm** sau 3 lần chấm. Đây là một con số cho thấy hệ thống đủ đáng tin cậy để triển khai chấm bài cho học sinh.
> ⚠️ **20.4% bài thi dao động > 0.5 điểm:** Thường rơi vào các bài viết "vùng xám" (chữ quá khó đọc, lỗi ngữ pháp phức tạp), khiến AI phải tự diễn giải theo các hướng khác nhau ở mỗi lần chạy.

---

## 4. Kết luận & Đề xuất

### Kết luận
1. **Mức độ tổng thể (Macro):** ViHand Grade cực kỳ ổn định. Điểm trung bình tổng thể qua các lần chạy gần như không đổi (~7.86).
2. **Mức độ chi tiết (Micro):** Tính đồng nhất tuyệt đối từng ký tự đạt khoảng 53–63%. AI không hoạt động như một cỗ máy deterministic 100%, mà có sự biến thiên tự nhiên. Tuy nhiên, sự biến thiên này chỉ làm điểm số dao động nhẹ (≤ 0.5 điểm) ở hầu hết các trường hợp.

### Đề xuất Kỹ thuật & Sư phạm
| Giải pháp | Mục tiêu | Khuyến nghị |
|---|---|---|
| **Cơ chế Ensemble (Chạy 3 lấy TB)** | Triệt tiêu sự dao động ngẫu nhiên của điểm số và lỗi. | Khuyến nghị áp dụng cho các bài thi cuối kỳ (High-stakes). |
| **Giáo viên review 20% bài "vùng xám"** | Phát hiện các bài có chữ quá rối rắm mà AI dao động điểm mạnh. | Áp dụng trên giao diện UI: cảnh báo bài thi có độ tin cậy thấp. |
| **Hạ `temperature` xuống 0.0** | Tối đa hóa tính deterministic của Gemini API. | Cần cập nhật cấu hình API ngay lập tức. |
