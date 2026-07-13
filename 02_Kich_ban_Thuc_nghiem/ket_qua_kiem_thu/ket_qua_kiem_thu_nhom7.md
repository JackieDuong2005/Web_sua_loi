# 📊 BÁO CÁO KẾT QUẢ KIỂM THỬ NHÓM 7: GIAO DIỆN HỌC SINH (STUDENT DASHBOARD)
> **Dự án**: ViHand Grade — Hệ thống Chấm điểm Chữ viết tay Tiếng Việt Thông minh  
> **Ngày thực hiện**: 2026-07-09  
> **Người thực hiện**: Antigravity (AI Agent)  
> **Trạng thái chung**: **100% ĐẠT (PASS)**

---

## 📋 TÓM TẮT TRẠNG THÁI THỰC THI

Chúng tôi đã thực hiện kiểm thử tự động E2E (End-to-End) giao diện Học sinh (Student Dashboard) bằng Browser Subagent (Playwright) trên môi trường Localhost để giả lập đầy đủ quy trình học sinh tra cứu lịch sử điểm, xem chi tiết bài chấm và kiểm tra trạng thái chỉ đọc (read-only) của kết quả.

| Mã Test Case | Tên Kịch Bản | Trạng Thái | Kết Quả Thực Tế | Đánh Giá Kỹ Thuật |
| :--- | :--- | :---: | :--- | :--- |
| **TC-UI-STUDENT-01** | Học sinh tra cứu lịch sử và chi tiết bài chấm | **PASS** | <ul><li>Đăng nhập thành công với tài khoản học sinh `hoc_sinh_demo`.</li><li>Trang `/student` hiển thị đúng lời chào: *"Xin chào, Học sinh Demo!"*.</li><li>Widget điểm số hiển thị điểm gần nhất `7.0/10` chính xác.</li><li>Nhấp vào nút **Xem chi tiết** mở ra hộp thoại chi tiết bài viết, các lỗi chính tả (`vễ -> về`, `meo -> mèo`) hiển thị trực quan.</li><li>Hộp thoại hoàn toàn ở chế độ **Read-only (chỉ đọc)**, không chứa bất kỳ thanh trượt hoặc trường nhập liệu nào có thể chỉnh sửa.</li></ul> | Cơ chế phân quyền hiển thị (RBAC) trên giao diện hoạt động tốt. |
| **TC-UI-STUDENT-02** | Xem thống kê các lỗi thường gặp cá nhân | **PASS** | <ul><li>Trang lịch sử điểm `/student/history` hiển thị đúng số lượng bài chấm của học sinh (1 bài), điểm trung bình và biểu đồ phân loại.</li></ul> | Đồng bộ dữ liệu SQLite DB với thông tin cá nhân của học sinh hoạt động chính xác. |

---

## 📸 HÌNH ẢNH KẾT QUẢ MINH HỌA
Dưới đây là hình ảnh ghi nhận từ quá trình kiểm thử tự động của Browser Agent tại màn hình giao diện Học sinh:

### 1. Danh sách Lịch sử điểm của Học sinh
![Danh sách Lịch sử điểm của Học sinh](file:///C:/Users/Jackie%20Duong/.gemini/antigravity/brain/5cc76085-a982-449c-86f0-c1c478452473/.system_generated/click_feedback/click_feedback_1783584075682.png)

### 2. Màn hình Chi tiết bài chấm (Read-only) của Học sinh
![Chi tiết bài chấm của học sinh](file:///C:/Users/Jackie%20Duong/.gemini/antigravity/brain/5cc76085-a982-449c-86f0-c1c478452473/student_details_dialog_1783584085907.png)

*Ghi chú: Hộp thoại hiển thị đầy đủ thông tin: Lớp 3A1, Tên bài "Bai nghe viet: Ai co loi", Điểm số 7.0/10, các từ sai chính tả và lý do sai, hai phiên bản văn bản đối chiếu, và hoàn toàn ở chế độ chỉ đọc.*

---

## ⚙️ NHẬT KÝ CHI TIẾT CỦA BROWSER AGENT

1.  **Chấm bài cho Học sinh Demo**:
    - Truy cập tài khoản Giáo viên, dán văn bản: *"Bé vễ con meo nhỏ ở sần nhà. Con mèo đang đùa nghịch với cuôn len."*
    - Thực hiện chấm bài cho học sinh có tên là **Học sinh Demo** thuộc lớp **3A1**, lưu thành công bài chấm vào hệ thống.
2.  **Đăng nhập phía Học sinh**:
    - Xóa session lưu trữ, quay về màn hình đăng nhập.
    - Điền thông tin tài khoản học sinh: username `hoc_sinh_demo`, password `123456`.
    - Đăng nhập thành công và tự động chuyển hướng đến `/student`.
3.  **Tra cứu chi tiết bài chấm**:
    - Nhấp chọn "Xem tất cả điểm" để truy cập `/student/history`.
    - Danh sách hiển thị chính xác bài viết *"Bai nghe viet: Ai co loi"* điểm số `7.0` (Xếp loại Tốt).
    - Nhấp chọn "Xem chi tiết" để mở Dialog chi tiết:
        - Hiển thị đúng ảnh bài viết (nếu có), điểm số, xếp loại và nhận xét sư phạm.
        - Phần sửa lỗi hiển thị chi tiết các từ sai (`vễ -> về`, `meo -> mèo`).
        - Trạng thái màn hình chỉ cho phép đọc, không thể chỉnh sửa điểm số hay nhận xét.
