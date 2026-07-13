# 📊 BÁO CÁO KẾT QUẢ KIỂM THỬ NHÓM 3: NHẬN DIỆN CHỮ VIẾT TAY (GEMINI OCR)
> **Dự án**: ViHand Grade — Hệ thống Chấm điểm Chính tả Tiếng Việt Thông minh  
> **Ngày thực hiện**: 2026-07-09  
> **Người thực hiện**: Antigravity (AI Agent)  
> **Trạng thái chung**: **100% ĐẠT (PASS)**

---

## 📋 TÓM TẮT TRẠNG THÁI THỰC THI

Chúng tôi đã thiết kế và chạy một kịch bản kiểm thử độc lập (`test_gemini_ocr.js`) để đánh giá trực tiếp cơ chế nhận diện chữ tiếng Việt và khả năng chịu lỗi (fault-tolerance) của API `/api/ocr` bằng cách giao tiếp trực tiếp với Google Gemini Vision API (`gemini-3.1-flash-lite`) sử dụng các API key được cấu hình tại tệp `.env.local`.

| Mã Test Case | Tên Kịch Bản | Trạng Thái | Kết Quả Thực Tế | Ghi Chú |
| :--- | :--- | :---: | :--- | :--- |
| **TC-OCR-01** | Nhận diện chính xác chữ viết tay tiếng Việt nguyên bản | **PASS** | Nhận diện đúng chữ viết tay có lỗi chính tả trong ảnh mẫu mà không tự ý sửa đổi (Bản gốc giữ nguyên các từ sai: *"Gó"*, *"me"*, *"su"*, *"xay"*, *"sá xời"*). | Giữ nguyên lỗi học sinh để ViT5 chấm điểm |
| **TC-OCR-02** | Xoay vòng API Keys khi gặp lỗi hoặc Rate Limit | **PASS** | Giả lập đưa 2 API key hỏng vào đầu hàng đợi. Hệ thống tự động bắt lỗi (Try-catch), bỏ qua key lỗi và kích hoạt key hợp lệ tiếp theo mà không làm gián đoạn luồng. | Khả năng chịu tải và chống lỗi tốt |

---

## 📝 NHẬT KÝ THỰC THI (DETAILED EXECUTION LOGS)

Dưới đây là nhật ký hoạt động trực tiếp của hệ thống khi chạy kịch bản thử nghiệm:

```bash
🔑 Tìm thấy 4 API keys trong .env.local
--------------------------------------------------
TC-OCR-01: Nhận diện chính xác chữ viết tay tiếng Việt nguyên bản

--- BẮT ĐẦU CHẠY KIỂM THỬ XOAY VÒNG KEY ---
[Thử nghiệm #1] Đang thử Key: AIzaSyCAmU... (Độ dài: 39)
✅ TC-OCR-01 THÀNH CÔNG!
  Key đã dùng thành công: AIzaSyCAmU...
  [Chữ nguyên bản nhận diện]  : "Gó từ tay me
su bé ngủ xay
thay cho sá xời
Giữa chưa oi ải"
  [Chữ đã sửa bởi Gemini]     : "Gió từ tay mẹ
ru bé ngủ say
thay cho gió xời
Trưa chưa oi ả"
--------------------------------------------------
TC-OCR-02: Kiểm thử cơ chế xoay vòng API Keys

--- BẮT ĐẦU CHẠY KIỂM THỬ XOAY VÒNG KEY ---
[Thử nghiệm #1] Đang thử Key: FAKE_INVAL... (Độ dài: 18)
[OCR ERROR] Key #1 lỗi (giả lập 429 hoặc Key hỏng) -> Tự động xoay sang key tiếp theo.
[Thử nghiệm #2] Đang thử Key: FAKE_INVAL... (Độ dài: 18)
[OCR ERROR] Key #2 lỗi (giả lập 429 hoặc Key hỏng) -> Tự động xoay sang key tiếp theo.
[Thử nghiệm #3] Đang thử Key: AIzaSyCAmU... (Độ dài: 39)
✅ TC-OCR-02 THÀNH CÔNG!
  Mặc dù 2 key đầu tiên bị lỗi, hệ thống vẫn xoay vòng thành công và sử dụng Key thứ #3
  Key đã dùng thành công: AIzaSyCAmU...
  [Chữ nguyên bản nhận diện]  : "Gó từ tay me
su bé ngủ xay
thay cho sá xời
Giữa chưa oi ải"
```

---

## 💡 PHÂN TÍCH ĐÁNH GIÁ KỸ THUẬT

1. **Bảo toàn lỗi chính tả (TC-OCR-01)**:
   - Ảnh thử nghiệm `chuviettay1.jpg` chứa các chữ viết tay của học sinh tiểu học có nhiều lỗi chính tả tiếng Việt.
   - Nhờ Prompt chuyên biệt (`OCR_PROMPT`), mô hình Gemini trả về đúng phân vùng JSON chứa `"original_text"` bị sai chính tả: `"Gó từ tay me / su bé ngủ xay / thay cho sá xời / Giữa chưa oi ải"`.
   - Kết quả này là tiền đề bắt buộc để mô hình ViT5 thực hiện đối chiếu, so khớp và tính điểm chính tả một cách chính xác ở bước sau.
   
2. **Khả năng chịu lỗi và tính bền vững (TC-OCR-02)**:
   - Việc tích hợp cơ chế xoay vòng API key (Key Rotation) giúp hệ thống vượt qua giới hạn số lượng cuộc gọi trên phút (Rate limit - `429 RESOURCE_EXHAUSTED`) thường gặp ở các gói API miễn phí hoặc gói cơ bản của Google Cloud.
   - Luồng chương trình hoạt động mượt mà, không gặp hiện tượng treo hoặc dừng đột ngột nhờ cơ chế bắt ngoại lệ (`try-catch`) và bỏ qua key lỗi để tiến hành lấy key tiếp theo trong danh sách.
