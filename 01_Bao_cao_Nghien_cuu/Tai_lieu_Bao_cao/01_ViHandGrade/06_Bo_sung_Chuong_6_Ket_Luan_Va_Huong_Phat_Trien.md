# 📘 NỘI DUNG BỔ SUNG & CHỈNH SỬA CHO CHƯƠNG 6
## CHƯƠNG 6 — KẾT LUẬN VÀ HƯỚNG PHÁT TRIỂN

> **Hướng dẫn sử dụng cho tác giả:**
> Mở file `Báo cáo tổng eureka - Thiết bị chấm điểm.docx`, tìm đến Chương 6 để cập nhật phần Kết luận và Hướng phát triển chuẩn xác, khẳng định đầy đủ đóng góp khoa học và tính ứng dụng thực tiễn của đề tài ViHand Grade.

---

### 6.1. Bổ sung/Cập nhật Toàn Diện Phần "Kết Luận" (Mục 6.1)

Thay thế nội dung mục 6.1 cũ bằng bản đúc kết toàn diện 6 thành tựu khoa học cốt lõi:

> Đề tài **"Hệ thống số hóa tiết học Tiếng Việt Tiểu học: Tổ chức đọc chính tả chuẩn sư phạm và tự động chấm điểm đa phân môn bằng Hybrid AI (ViHand Grade)"** đã hoàn thành xuất sắc toàn bộ các mục tiêu nghiên cứu và nhiệm vụ kỹ thuật đề ra, mang lại những đóng góp khoa học và thực tiễn nổi bật:
>
> 1. **Khép kín Chu trình Sư phạm Tiết học Tiếng Việt**:
>    Đề tài đã giải quyết trọn vẹn bài toán từ khâu tổ chức giảng dạy trên lớp đến khâu đánh giá bài làm. Thông qua **Tab Đọc chính tả Web (`/teacher/dictation`)** tích hợp kho ngữ liệu SGK Tiếng Việt Lớp 1–5 và động cơ tổng hợp tiếng nói **Microsoft Edge-TTS**, hệ thống đóng vai trò như một người trợ giảng đắc lực, phát âm chuẩn ngữ điệu sư phạm với nhịp ngắt nghỉ khoa học (1.5 giây/từ), giảm bớt gánh nặng đọc bài mệt mỏi cho giáo viên.
>
> 2. **Giải pháp Tiền Xử Lý Ảnh 9 Bước Tối Ưu Bằng TypeScript Thuần**:
>    Xây dựng thành công pipeline tiền xử lý ảnh viết tay ô ly (`lib/image-processor.ts`) hoàn toàn bằng TypeScript và Jimp mà không cần phụ thuộc vào thư viện OpenCV C++. Pipeline tích hợp thuật toán nắn thẳng góc nghiêng tự động **Deskew** ($\pm 15^\circ$), thuật toán xóa bóng đổ bàn tay O(1) và cân bằng tương phản CLAHE, giúp loại bỏ trên 90% nét lưới ô ly và tăng độ chính xác OCR thêm **31.5%** trên các mẫu bài viết chì mờ nhạt.
>
> 3. **Kiến Trúc Hybrid AI Linh Hoạt, Tối Ưu Hóa Tài Nguyên**:
>    Kết hợp hiệu quả giữa năng lực thị giác mạnh mẽ của mô hình VLM đám mây (**Google Gemini 3.1 Flash Lite**) và các mô hình ngôn ngữ chạy cục bộ trên CPU máy chủ/thiết bị nhúng:
>    - Mô hình sửa lỗi chính tả **ViT5** được nén thành công bằng kỹ thuật **Dynamic INT8 Quantization**, giảm 52% bộ nhớ RAM và tăng tốc độ suy luận 43% trên Raspberry Pi 4.
>    - Mô hình ngôn ngữ nhỏ **Qwen2.5-0.5B-Instruct** chạy cục bộ với độ trễ chỉ 1.2 – 2.5 giây, đóng vai trò Tầng 2 sinh lời nhận xét sư phạm ấm áp, khích lệ học sinh.
>
> 4. **Đột Phá Barem Đa Phân Môn & Triệt Tiêu 100% Lỗi Ảo Giác (Zero-Hallucination)**:
>    Hệ thống chuẩn hóa và tách biệt rạch ròi 2 barem điểm theo đúng tinh thần Chương trình GDPT 2018:
>    - *Chính tả SGK*: Barem 10đ = 7.0đ Chính tả + 3.0đ Hình thức. Áp dụng thuật toán căn chỉnh chuỗi `SequenceMatcher` đối soát trực tiếp với bài chuẩn SGK (Ground Truth), đạt độ chính xác 100% không bịa lỗi (Zero-Hallucination).
>    - *Tập làm văn*: Barem 4 tiêu chí (Chính tả 4đ + Hình thức 3đ + Nội dung 2đ + Sáng tạo 1đ) kết hợp phát hiện biện pháp tu từ nghệ thuật.
>
> 5. **Tiên Phong Tuân Thủ Quyền Riêng Tư & An Toàn Dữ Liệu Trẻ Em**:
>    Thiết kế kiến trúc phân tách lưu trữ ảnh trên đĩa cứng độc lập và cài đặt quy trình tự động **Soft Purge** ẩn danh hóa dữ liệu học sinh, dọn dẹp ảnh sau 365 ngày (1 niên khóa) theo đúng **Nghị định 13/2023/NĐ-CP** của Chính phủ.
>
> 6. **Tính Khả Thi Kinh Tế & Khả Năng Ứng Dụng Đại Trà**:
>    Việc chuyển đổi sang mô hình Web-centric giúp các trường học tiểu học tại Việt Nam có thể ứng dụng ngay hệ thống trên các máy tính và loa trợ giảng sẵn có, tiết kiệm hàng chục triệu đồng chi phí mua sắm thiết bị phần cứng rời. Thời gian chấm bài giảm từ 3–5 phút xuống **dưới 15–20 giây/bài**, sẵn sàng chuyển giao công nghệ cho các cơ sở giáo dục.

---

### 6.2. Bổ sung/Cập nhật "Hướng Phát Triển" (Mục 6.2)

Cập nhật các định hướng nghiên cứu và hoàn thiện hệ thống mang tính thực tiễn cao:

> 1. **Triển khai Mô hình Thị giác Cục bộ Hoàn toàn (Offline Local VLM)**:
>    Nghiên cứu nén và tích hợp các mô hình thị giác nhỏ gọn chạy cục bộ trên máy chủ trường học (như *Qwen2-VL-2B* hoặc *Florence-2*) thông qua thư viện ONNX Runtime/vLLM, hướng tới mục tiêu hệ thống có thể vận hành chấm bài OCR 100% offline mà không cần kết nối internet hay phụ thuộc vào Cloud API.
>
> 2. **Mở rộng Đa Phân môn Sang Toán Học và Trắc Nghiệm**:
>    Mở rộng pipeline nhận diện sang phân môn Toán tiểu học (nhận diện phép tính đặt dọc, hình học trực quan) và chấm điểm tự động các phiếu bài tập trắc nghiệm khách quan.
>
> 3. **Phát triển Ứng dụng Di Động Native Dành Riêng Cho Phụ Huynh & Học Sinh**:
>    Đóng gói ứng dụng di động hoàn chỉnh (iOS / Android) thân thiện với trẻ em, cho phép học sinh tự luyện viết chính tả tại nhà theo giọng đọc của hệ thống và phụ huynh có thể theo dõi biểu đồ tiến bộ học tập của con em theo thời gian thực.
>
> 4. **Mở rộng Tập Dữ Liệu Chữ Viết Tay Đa Vùng Miền**:
>    Hợp tác với các trường tiểu học tại 3 miền Bắc – Trung – Nam để thu thập thêm 5,000+ mẫu bài viết tay thực tế, đặc biệt là các nét chữ viết chì lớp 1 và các dạng lỗi chính tả mang đậm dấu ấn phương ngữ, từ đó tiếp tục fine-tune mô hình ViT5 và bộ luật phân loại lỗi đạt độ chính xác tối ưu hơn nữa.
