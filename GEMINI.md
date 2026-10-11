# 🛡️ Project Governance & Core Rules (GEMINI.md)

Tài liệu này là **Hiến pháp dự án (Always-On Invariant Rules)**. Mọi phản hồi và hành động của AI Agent khi làm việc trong dự án này bắt buộc phải tuân thủ nghiêm ngặt 3 nguyên tắc sau:

---

## 🚫 1. TUYỆT ĐỐI KHÔNG DÙNG SƠ ĐỒ MERMAID — XUẤT ẢNH JPEG (.JPG) KHI YÊU CẦU SƠ ĐỒ / LƯU ĐỒ
* **Lý do:** Giao diện hiển thị của người dùng không xem được Mermaid. Sinh mã Mermaid làm hỏng trải nghiệm hiển thị.
* **Cấm:** Không bao giờ xuất các khối mã ` ```mermaid ` trong bất kỳ phản hồi hay artifact nào.
* **Quy chuẩn tạo Sơ đồ / Lưu đồ giải thuật / Kiến trúc hệ thống:**
  * Khi người dùng yêu cầu vẽ sơ đồ giải thuật, lưu đồ thuật toán, kiến trúc hệ thống hoặc workflow:
    * **BẮT BUỘC xuất thành file ảnh JPEG (`.jpg`)**.
    * **Đặc tả Phong cách thiết kế chuẩn (Technical White Paper Flowchart)**:
      * **Nền**: Trắng tinh khiết (`#FFFFFF`), phong cách báo cáo học thuật / kỹ thuật tối giản.
      * **Nét vẽ & Chữ**: Đen nét mảnh sắc nét (`#000000`, 1.5pt), độ tương phản cao, hỗ trợ tiếng Việt đầy đủ dấu (Arial / Segoe UI).
      * **Tiêu đề**: IN HOA đậm căn giữa ở đỉnh ảnh; dòng phụ ghi rõ tên file / module / pipeline liên quan.
      * **Hình khối chuẩn**: Oval (Start/End), Chữ nhật (Process có gạch đầu dòng mô tả chi tiết / công thức), Hình thoi (Decision với nhãn YES / NO rõ ràng), Hình bình hành (Input / Output).
      * **Mũi tên**: Đường vuông góc (Orthogonal) định hướng rõ ràng từ trên xuống dưới.
    * **Cách thực hiện**:
      * *Cách 1 (Khuyên dùng - Chuẩn xác 100% tiếng Việt):* Chạy script Python (Matplotlib + PIL như `.agents/skills/long_mode/scripts/diagram_generator.py`) để render vector sắc nét và xuất file `.jpg`.
      * *Cách 2:* Dùng công cụ `generate_image` với `AspectRatio: '9:16'` hoặc `'16:9'` kèm prompt mô tả rõ phong cách kỹ thuật trắng đen, nền trắng, chữ đen, hình khối chuẩn.
* **Minh họa văn bản nhanh trong chat:**
  * Dùng **ASCII / Unicode Box Drawing** (`┌─┐`, `└─┘`, `│`, `▼`, `──>`, `├──`, `└──`).
  * Dùng **Bảng Markdown (Markdown Tables)** cho so sánh, schema hoặc ma trận trạng thái.

---

## 🛡️ 2. QUY CHUẨN CODE: KHẢO SÁT NGỮ CẢNH & XÁC THỰC THỰC TẾ (FIT & VERIFY)
* **Khảo sát trước khi sửa (Context & Fit Check):**
  * Phải dùng `view_file` đọc và hiểu code hiện có trước khi tạo/sửa file.
  * Không tự ý thêm thư viện ngoài khi dự án đã có sẵn giải pháp tương đương.
  * Tuân thủ kiến trúc, naming convention và typing của dự án.
* **Xác thực thực nghiệm sau khi sửa (Rigorous Verification):**
  * *"Code viết xong mà chưa chạy lệnh kiểm thử thì bị coi là CHƯA HOÀN THÀNH."*
  * Bắt buộc chạy lệnh kiểm tra thực tế (ví dụ: `npm run build`, `npm run lint`, `npx tsc --noEmit`, test script, curl API...) để chứng minh code chạy tốt và không gây regression.
  * Nếu gặp lỗi, tự động sửa (Self-Healing Loop) cho đến khi exit code 0.
  * Luôn báo cáo bằng chứng xác thực cụ thể cho người dùng.

---

## 🌐 3. KIỂM THỬ WEB & ĐIỀU KHIỂN CHROME: BẮT BUỘC DÙNG MCP CHROME DEVTOOLS
* **Lý do:** Tiết kiệm tối đa token, tương tác chính xác với DOM thực tế và tránh làm tràn context window.
* **Bắt buộc:**
  * Sử dụng các công cụ của MCP server `chrome-devtools-mcp` (thông qua `call_mcp_tool`):
    * `navigate_page` / `new_page`: Mở URL.
    * `take_snapshot`: Lấy cây trợ năng rút gọn kèm element `uid` (tiết kiệm token gấp nhiều lần so với HTML raw).
    * `click` / `fill` / `type_text`: Thao tác trực tiếp theo `uid`.
    * `list_console_messages`: Bắt lỗi JavaScript runtime từ console.
    * `take_screenshot`: Luôn truyền tham số `filePath` để lưu file ảnh chụp, không dump base64 vào chat.
* **Cấm:** Cấm dump raw HTML hàng nghìn dòng vào chat; Cấm tự viết script Puppeteer/Playwright khi MCP server đang sẵn sàng.

---

> Chi tiết quy trình và hướng dẫn thao tác từng bước xem tại Skill:
> [long_mode](file:///c:/Users/Jackie%20Duong/Desktop/Web_sua_loi/.agents/skills/long_mode/SKILL.md)
