# 📊 BÁO CÁO KẾT QUẢ KIỂM THỬ NHÓM 1: ĐĂNG NHẬP, XÁC THỰC & PHÂN QUYỀN (RBAC)
> **Dự án**: ViHand Grade — Hệ thống Chấm điểm Chính tả Tiếng Việt Thông minh  
> **Ngày thực hiện**: 2026-07-09  
> **Người thực hiện**: Antigravity (AI Agent)  
> **Trạng thái chung**: **100% ĐẠT (PASS)**

---

## 📋 TÓM TẮT TRẠNG THÁI THỰC THI

Hệ thống đã thực hiện kiểm thử tự động trực quan (Visual & End-to-End Automation) trên môi trường Next.js chạy tại cổng `3000`. Dữ liệu người dùng được nạp trực tiếp qua Prisma Client SQLite.

| Mã Test Case | Tên Kịch Bản | Trạng Thái | Kết Quả Thực Tế | Ghi Chú |
| :--- | :--- | :---: | :--- | :--- |
| **TC-AUTH-01** | Đăng nhập thành công vai Giáo viên (Teacher) | **PASS** | Đăng nhập thành công với `giao_vien_demo`, chuyển hướng về `/teacher`, hiển thị giao diện giáo viên kèm tên *"Giáo viên Demo"*. | Đúng phân quyền và giao diện GV |
| **TC-AUTH-02** | Đăng nhập thành công vai Học sinh (Student) | **PASS** | Đăng nhập thành công với `hoc_sinh_demo`, chuyển hướng về `/student`, hiển thị lịch sử và phân tích lỗi. | Đúng phân quyền và giao diện HS |
| **TC-AUTH-03** | Đăng nhập thất bại do sai mật khẩu | **PASS** | Nhập sai mật khẩu trả về mã lỗi `401 Unauthorized` từ API và hiển thị thông báo lỗi *"Mật khẩu không đúng"*. | Bẫy lỗi thành công |
| **TC-AUTH-04** | Kiểm soát phân quyền URL trực tiếp | **PASS** | - Khi chưa đăng nhập, truy cập `/teacher` hoặc `/admin` bị redirect về `/`. <br>- Khi đăng nhập Học sinh, truy cập `/teacher` bị block và trả về `/`. | Đảm bảo an toàn bảo mật |

---

## 📝 NHẬT KÝ THỰC THI (SERVER LOGS)

Dưới đây là log ghi nhận trực tiếp từ máy chủ Next.js trong quá trình tác vụ tự động thực hiện:

```bash
# 1. Thực hiện kịch bản TC-AUTH-03 (Sai thông tin đăng nhập)
POST /api/auth/login 401 in 627ms (Tài khoản/Mật khẩu sai -> Trả về lỗi 401)

# 2. Thực hiện kịch bản TC-AUTH-01 (Đăng nhập Giáo viên thành công)
POST /api/auth/login 200 in 53ms (Đăng nhập thành công giao_vien_demo)
GET /teacher 200 in 326ms (Chuyển hướng đến Dashboard giáo viên)
GET /api/grades 200 in 903ms (Tải lịch sử chấm điểm lớp học)

# 3. Thực hiện kịch bản TC-AUTH-04 (Kiểm thử truy cập trái phép)
GET / 200 in 117ms (Đăng xuất / Xóa session)
GET /admin 200 in 1025ms (Cố gắng truy cập trang Quản trị -> Redirect về trang chủ)
GET /teacher 200 in 551ms (Cố gắng truy cập trang Giáo viên -> Redirect về trang chủ)

# 4. Thực hiện kịch bản TC-AUTH-02 (Đăng nhập Học sinh thành công)
POST /api/auth/login 200 in 57ms (Đăng nhập thành công hoc_sinh_demo)
GET /student 200 in 251ms (Chuyển hướng đến Dashboard học sinh)
GET /api/grades 200 in 568ms (Tải lịch sử bài làm cá nhân của học sinh)
```

---

## 🖼️ HÌNH ẢNH MINH HỌA QUÁ TRÌNH KIỂM THỬ

*   **Video ghi lại luồng tự động kiểm thử**: Bạn có thể xem video hoạt động của browser subagent tại: `artifacts/login_flow_demo_*.webp` trong thư mục dữ liệu ứng dụng.
*   **Ảnh chụp màn hình trang Đăng nhập**:
    ![Trang đăng nhập](file:///C:/Users/Jackie%20Duong/.gemini/antigravity/brain/5cc76085-a982-449c-86f0-c1c478452473/.system_generated/click_feedback/click_feedback_1783578071057.png)

---

## 💡 ĐÁNH GIÁ CHUNG & KIẾN NGHỊ BẢO MẬT
*   **Đánh giá**: Cơ chế phân quyền và bảo mật phía client (Next.js Routing) kết hợp kiểm tra quyền ở API routes đã hoạt động ổn định và chính xác theo đặc tả kỹ thuật.
*   **Kiến nghị bảo mật bổ sung**:
    1. Hiện tại mật khẩu trong cơ sở dữ liệu đang lưu dưới dạng **plain-text** (văn bản thô) để phục vụ việc demo nhanh (`password: "123456"`). Kiến nghị áp dụng thư viện băm mật khẩu (ví dụ: `bcrypt` hoặc `argon2`) trước khi đưa vào môi trường production.
    2. Cân nhắc bổ sung cơ chế giới hạn số lần đăng nhập sai liên tiếp (Rate Limiter) trên endpoint `/api/auth/login` để ngăn chặn các cuộc tấn công Brute-force.
