## 5.2.4.4. Kịch bản hành trình nghiên cứu — Từ bài toán thực tế đến Pipeline 9 bước

### Bối cảnh: Vì sao không thể dùng giải pháp đơn giản?

Trong giai đoạn đầu của dự án, nhóm nghiên cứu thử nghiệm tiếp cận trực tiếp: chụp ảnh bài viết tay của học sinh và gửi thẳng lên Gemini API mà không qua bất kỳ bước tiền xử lý nào. Kết quả ban đầu gây thất vọng: mô hình AI liên tục nhận diện sai các đường kẻ ô ly thành ký tự gạch ngang, bỏ sót toàn bộ những nét chữ bút chì nhạt trong vùng bóng tối, và thỉnh thoảng từ chối phân tích do ảnh quá mờ.

Nhóm nhận ra rằng **bài toán tiền xử lý ảnh chữ viết tay học sinh tiểu học Việt Nam** có những đặc thù rất riêng mà các thư viện xử lý ảnh thông thường không giải quyết được chỉ bằng một hoặc hai bước. Đây là điểm khởi đầu của hành trình thiết kế pipeline 9 bước.

---

### Hành trình tư duy — Cách nhóm nghĩ ra từng bước

#### Giai đoạn 1 — Nhận diện vấn đề gốc rễ (Tuần 1)

Nhóm nghiên cứu tổ chức phiên phân tích ảnh thực tế: thu thập 13 ảnh bài viết tay thật từ học sinh lớp 1–4, in ra và dán lên bảng trắng, rồi từng người trong nhóm quan sát và ghi chú những "điểm đau" (pain points) họ thấy bằng mắt thường. Danh sách vấn đề thu được:

| # | Vấn đề quan sát được | Nguồn gốc |
|---|---|---|
| P1 | Ảnh bị xoay 90° hoặc 270° | Giáo viên chụp ngang |
| P2 | File ảnh 3–5MB, quá nặng | Camera smartphone 12–24MP |
| P3 | Nền giấy bị ám vàng/xanh | Đèn huỳnh quang, ánh cửa sổ |
| P4 | Vùng bóng tối che khuất chữ | Bóng tay, bóng điện thoại |
| P5 | Nét bút chì quá mờ, mảnh | Trẻ lớp 1–2 viết nhẹ tay |
| P6 | Chữ nhòe do rung tay/mất nét | Chụp bằng tay không dùng chân máy |
| P7 | Không biết ảnh có đủ chất lượng không | Không có cơ chế kiểm tra trước |

Nguyên tắc mà nhóm đặt ra từ đầu: **mỗi vấn đề phải có đúng một bước xử lý chuyên biệt**, không xử lý chung chung.

---

#### Giai đoạn 2 — Thiết kế thứ tự bước (Tuần 1–2)

Nhóm tranh luận về thứ tự thực hiện các bước. Câu hỏi trung tâm: *"Bước nào phải làm trước bước nào?"*

**Quyết định 1 — EXIF Auto-rotate phải là bước đầu tiên (Bước 1):**
Nếu ảnh bị xoay mà bắt đầu resize hay tính toán pixel ngay, toàn bộ ma trận tọa độ sẽ sai lệch. Xoay đúng chiều là điều kiện tiên quyết cho mọi xử lý tiếp theo.

**Quyết định 2 — Resize ngay sau xoay (Bước 2):**
Ảnh 5MB chứa hàng chục triệu điểm ảnh. Mọi thuật toán lọc sau đó (blur kernel 51×51, CLAHE 8×8 tiles...) sẽ chạy chậm kinh khủng nếu áp dụng trên ảnh nguyên gốc. Resize sớm giúp tất cả các bước sau nhanh hơn 3–4 lần.

**Quyết định 3 — White Balance trước khi chuyển xám (Bước 3 → Bước 3):**
Cân bằng màu phải làm khi ảnh còn đủ 3 kênh R, G, B. Sau khi chuyển xám, thông tin màu mất đi vĩnh viễn và không thể cân bằng trắng nữa.

**Quyết định 4 — CLAHE sau Shadow Removal (Bước 6):**
Sau khi khử bóng, nét chữ bút chì còn lại rất mờ và có độ tương phản thấp. CLAHE lúc này có đất để phát huy: tăng cường cục bộ mà không làm phóng đại nhiễu nền.

**Quyết định 5 — Sharpen sau CLAHE (Bước 7):**
CLAHE làm đậm pixel nhưng đôi khi khiến các cạnh bị mờ nhẹ do nội suy. Sharpen (Unsharp Masking) phục hồi độ sắc nét của biên ký tự.

**Quyết định 6 — Quality Assessment trước Threshold, không phải sau (Bước 8):**
Đây là quyết định thiết kế quan trọng nhất mà nhóm tranh luận lâu nhất. Nếu đặt đánh giá chất lượng sau threshold (bước cuối), ảnh đã thành nhị phân đen/trắng — rất khó đo blur_score hay brightness có ý nghĩa. Đặt trước threshold (trên ảnh xám đã xử lý qua 7 bước) cho phép đo đúng các chỉ số thực tế của nét chữ. Nếu ảnh không đạt, cảnh báo ngay và **không cần chạy bước Threshold tốn kém** — tiết kiệm tài nguyên.

**Quyết định 7 — Adaptive Gaussian Thresholding là bước cuối (Bước 9):**
Threshold là bước "chốt hạ" — tạo ra ảnh nhị phân trắng đen hoàn hảo để gửi vào Gemini. Phải là bước cuối cùng vì mọi thông tin xám đều mất sau bước này.

---

#### Giai đoạn 3 — Triển khai và kiểm chứng (Tuần 2–3)

Nhóm xây dựng script `test_preprocessing.mjs` — một công cụ kiểm thử tự động chạy toàn bộ pipeline 9 bước và **xuất ảnh trung gian của từng bước** vào thư mục `anhdaxuly/`. Mỗi ảnh đầu vào tạo ra 9 file ảnh đầu ra trung gian (step_01 đến step_09) kèm file `quality_report.json`.

Đây là quyết định kỹ thuật quan trọng: thay vì kiểm tra pipeline như một "hộp đen", nhóm có thể quan sát từng bước trung gian bằng mắt thường. Phương pháp này giúp phát hiện nhanh những bước chạy sai — ví dụ bước Shadow Removal đôi khi làm mờ nét chữ quá mức khi shadowKernel quá nhỏ.

Trong giai đoạn này, nhóm cũng quyết định **port pipeline từ Python/OpenCV sang JavaScript/Jimp** để chạy hoàn toàn phía client (trình duyệt), tránh phụ thuộc vào backend server và giảm độ trễ mạng. Đây là thách thức kỹ thuật lớn: các hàm OpenCV như `cv2.adaptiveThreshold`, `cv2.CLAHE`, `cv2.morphologyEx` không có bản tương đương trực tiếp trong Jimp — nhóm phải tự cài đặt từng thuật toán bằng JavaScript thuần.

---

#### Giai đoạn 4 — Tinh chỉnh tham số qua 4 vòng thực nghiệm (Tuần 3–4)

Sau khi pipeline hoạt động ổn định về mặt logic, nhóm bước vào giai đoạn tinh chỉnh tham số trên bộ dữ liệu 13 ảnh thực. Tham số quan trọng nhất cần tìm là `adaptiveC` — hằng số trừ trong Adaptive Gaussian Thresholding, yếu tố quyết định bao nhiêu pixel nền được chuyển thành trắng và bao nhiêu nét chữ được giữ lại.

**Vòng 1 — Thử `adaptiveC = 10`, `blockSize = Auto`:**
Kết quả: Ảnh nhị phân vẫn còn nhiều vệt xám từ đường kẻ ô ly. blockSize tự tính thay đổi theo từng ảnh gây kết quả không đồng nhất. Thời gian xử lý trung bình: **12,154 ms**.

**Vòng 2 — Thử `adaptiveC = 5`, `blockSize = 31`:**
Nhóm cố định blockSize = 31 (giá trị chuẩn từ tài liệu OpenCV cho tài liệu in). Kết quả: Nền sạch hơn nhiều nhưng nhiều nét bút chì mảnh của học sinh lớp 1–2 bị mất hoàn toàn — ngưỡng quá khắc khe. Thời gian: **9,746 ms** (giảm nhờ blockSize cố định).

**Vòng 3 — Thử `adaptiveC = 15`, `blockSize = 31`:**
Cân bằng tốt hơn. Nền gần sạch, nét chữ giữ lại phần lớn. Tuy nhiên vẫn còn vài chấm nhiễu nhỏ ở góc ảnh. Thời gian: **9,253 ms**.

**Vòng 4 — Thử `adaptiveC = 20`, `blockSize = 31`:**
Đây là cấu hình tối ưu: nền giấy trắng hoàn toàn, nét chữ giữ đủ độ đậm để nhận diện kể cả những nét bút chì mảnh nhất. Thời gian: **9,184 ms**. Nhóm chốt đây là **cấu hình sản xuất** cho hệ thống ViHand Grade.

---

### Tổng kết hành trình thiết kế

| Quyết định | Lý do kỹ thuật | Tác động |
|---|---|---|
| 9 bước tuần tự thay vì song song | Đầu ra bước trước là đầu vào bước sau — phụ thuộc nhân quả | Đảm bảo tính nhất quán của pipeline |
| Port sang JavaScript/Jimp | Chạy client-side, không cần backend | Giảm độ trễ, tăng khả năng triển khai |
| Xuất ảnh trung gian từng bước | Quan sát trực quan từng bước bằng mắt | Phát hiện lỗi nhanh, tinh chỉnh hiệu quả |
| Quality Assessment trước Threshold | Đo chỉ số trên ảnh xám — chính xác hơn | Cảnh báo sớm, tiết kiệm API calls |
| `adaptiveC = 20`, `blockSize = 31` | 4 vòng thực nghiệm trên 13 ảnh thật | Tối ưu cho bút chì học sinh tiểu học |
| `shadowKernel = 51` | Kernel đủ lớn để ước lượng vùng ánh sáng nền | Loại bỏ bóng tay/điện thoại hiệu quả |

Pipeline 9 bước không phải là kết quả của một lý thuyết có sẵn, mà là sản phẩm của **quá trình quan sát thực tế, phân tích có hệ thống và thực nghiệm lặp đi lặp lại** với bộ dữ liệu ảnh thật từ lớp học Việt Nam.
