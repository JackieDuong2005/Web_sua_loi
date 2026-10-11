---
name: long_mode
description: >
  Chế độ làm việc dài hạn và quy trình nghiêm ngặt (Long Mode / long_mode) bắt buộc cho AI:
  1. TUYỆT ĐỐI KHÔNG dùng sơ đồ Mermaid. Khi được yêu cầu tạo sơ đồ giải thuật, lưu đồ hệ thống, BẮT BUỘC xuất thành file ảnh JPEG (.jpg) chuẩn trắng đen học thuật (dùng diagram_generator.py hoặc generate_image).
  2. BẮT BUỘC khảo sát ngữ cảnh dự án (Fit Check) và chạy kiểm thử thực tế (Rigorous Verification) sau khi tạo hoặc sửa code.
  3. BẮT BUỘC sử dụng Chrome DevTools MCP có sẵn để kiểm thử Web App/giả lập Chrome nhằm tiết kiệm token và tương tác chính xác.
  Kích hoạt khi: "long_mode", "long mode", "/long_mode", "chế độ long_mode", "làm theo long_mode", "làm theo quy trình", "quy trình chuẩn", "sửa code chuẩn", "vẽ lưu đồ", "tạo sơ đồ giải thuật", "vẽ sơ đồ hệ thống", "test web bằng MCP", "kiểm thử web".
---

# 📋 Long Mode (long_mode) — Quy Trình Phát Triển & Vận Hành Chuẩn Hóa

Quy trình này định hình cách thức làm việc chuyên nghiệp, tiết kiệm token, tương thích kiến trúc và có bằng chứng xác thực thực nghiệm cho mọi hành động của AI Agent.

---

## 🚫 1. QUY TẮC SƠ ĐỒ: CẤM MERMAID — XUẤT FILE ẢNH JPEG (.JPG) CHUẨN HỌC THUẬT

### 1.1. Lý do cấm Mermaid
Giao diện hiển thị của người dùng không thể render hoặc không xem được sơ đồ Mermaid (` ```mermaid `). Việc xuất sơ đồ Mermaid sẽ hiển thị dưới dạng khối text lỗi hoặc vô nghĩa, làm gián đoạn trải nghiệm làm việc.
* **ĐIỀU CẤM:** Tuyệt đối không sinh khối mã ```mermaid ... ``` trong bất kỳ câu trả lời hay tài liệu artifact nào.

### 1.2. Hướng dẫn Phong cách Thiết kế Sơ đồ / Lưu đồ dạng ảnh JPEG (.jpg)
Khi người dùng yêu cầu: *"tạo sơ đồ giải thuật"*, *"vẽ lưu đồ"*, *"sơ đồ luồng hệ thống"*, *"kiến trúc pipeline"*:
* **Định dạng file bắt buộc:** File ảnh **JPEG (`.jpg`)**.
* **Đặc tả Phong cách thiết kế học thuật (Academic White Paper Style - Độc lập & Tự thân):**
  Toàn bộ phong cách thiết kế được quy định trực tiếp dưới đây, AI tự tuân thủ mà không phụ thuộc vào bất kỳ file tài liệu mẫu bên ngoài nào:

#### Bảng thông số kỹ thuật đồ họa chuẩn:
| Đặc tính | Tiêu chuẩn bắt buộc | Ghi chú |
| :--- | :--- | :--- |
| **Nền (Background)** | Trắng tinh khiết (`#FFFFFF`) | Tối giản, thanh lịch, chuẩn tài liệu khoa học |
| **Nét vẽ (Stroke)** | Đen sắc nét (`#000000`, 1.5pt) | Tuyệt đối không dùng màu mè lòe loẹt, viền rõ ràng |
| **Tỉ lệ khung hình** | Dọc `9:16` (768x1376px) hoặc Ngang `16:9` (1376x768px) | Dọc cho lưu đồ thuật toán; Ngang cho kiến trúc phân tầng |
| **Typography** | Font Arial / Segoe UI hỗ trợ 100% tiếng Việt UTF-8 | Tiêu đề in HOA đậm căn giữa; Subtitle ghi rõ file/module |
| **Hình khối chuẩn** | • **Oval (Pill):** Start / End / Bắt đầu / Kết thúc<br>• **Hình chữ nhật:** Khối xử lý (Process) có gạch đầu dòng/công thức<br>• **Hình thoi:** Điều kiện (Decision) kèm nhãn **YES** / **NO** rõ ràng<br>• **Hình bình hành:** Dữ liệu vào/ra (Input / Output)<br>• **Khung nét đứt:** Container gom nhóm Phase / Module | Đúng chuẩn biểu diễn lưu đồ kỹ thuật quốc tế |
| **Đường nối & Mũi tên** | Đường vuông góc (Orthogonal Arrows) | Nối chính xác tâm các cạnh khối, mũi tên nhọn rõ nét |

### 1.3. Hai phương thức tạo ảnh JPEG cho AI Agent

#### Phương thức 1: Dùng script Python `diagram_generator.py` (Khuyên dùng - Chuẩn xác 100%)
* File công cụ có sẵn: [diagram_generator.py](file:///c:/Users/Jackie%20Duong/Desktop/Web_sua_loi/.agents/skills/long_mode/scripts/diagram_generator.py)
* Dùng `matplotlib` + `PIL` để vẽ trực tiếp vector hình khối và render text tiếng Việt không bao giờ bị méo font hay lỗi chính tả.
* Xuất thẳng ra file `.jpg` tại thư mục chỉ định theo yêu cầu của người dùng.

*Ví dụ gọi script hoặc viết code tạo sơ đồ:*
```python
from scripts.diagram_generator import AcademicFlowchart

flow = AcademicFlowchart(
    title="LƯU ĐỒ THUẬT TOÁN XỬ LÝ",
    subtitle="src/module.ts — Core Pipeline"
)
flow.add_start_end(50, 92, "Bắt đầu")
flow.add_arrow(50, 90.4, 50, 85)
flow.add_process(50, 81, "Bước 1: Tiếp nhận dữ liệu\n→ Validate schema")
flow.add_arrow(50, 78, 50, 72)
flow.add_decision(50, 68, "Hợp lệ?")
flow.add_arrow(50, 65.25, 50, 59, label="YES", label_pos=(50, 62))
flow.add_process(50, 55, "Bước 2: Xử lý nghiệp vụ chính")
flow.add_arrow(50, 52, 50, 45)
flow.add_start_end(50, 43, "Kết thúc")
# Nhánh NO
flow.add_elbow_arrow([[66, 68], [85, 68], [85, 81], [82.5, 81]], label="NO", label_pos=(75, 69.5))
flow.save_jpg("ten_file_so_do.jpg")
```

#### Phương thức 2: Dùng công cụ `generate_image` với Prompt đặc tả phong cách
* Gọi `generate_image` với tham số:
  - `AspectRatio`: `'9:16'` (hoặc `'16:9'`)
  - `ImageName`: Tên file ngắn gọn (ví dụ: `flowchart_pipeline`)
  - `Prompt`: Mô tả chi tiết phong cách kỹ thuật học thuật tự thân:
    *"Academic white paper flowchart, pure white background (#FFFFFF), sharp black 1.5pt lines (#000000), black text with clear Vietnamese labels, vertical top-to-bottom layout. Pill shape for start/end, sharp rectangle boxes with bullet points for processes, diamond shape with bold YES and NO labels for decisions, orthogonal right-angle directional arrows. High contrast, minimalist technical style, no colored backgrounds."*
  - Lưu file kết quả dưới định dạng `.jpg`.

### 1.4. Phác thảo văn bản nhanh trong Chat (Chỉ dùng khi tóm tắt văn bản)
Nếu người dùng chỉ cần mô tả nhanh dạng text trong tin nhắn chat:
* Dùng **ASCII / Unicode Box Drawing** (`┌─┐`, `└─┘`, `│`, `▼`, `──>`, `├──`, `└──`).
* Dùng **Bảng Markdown** cho ma trận so sánh hoặc dữ liệu bảng.

---

## 🛡️ 2. QUY TẮC PHÁT TRIỂN & XÁC THỰC MÃ NGUỒN (CODE FIT & RIGOROUS VERIFICATION)

### 2.1. Triết lý cốt lõi
> *"Code viết xong mà không kiểm tra độ phù hợp với kiến trúc và không chạy lệnh xác thực thực tế thì bị coi là CHƯA HOÀN THÀNH."*

### 2.2. Quy trình 4 pha bắt buộc khi thao tác code

```text
┌─────────────────────────┐
│ Pha 1: Context & Fit    │ Đọc file, hiểu stack, kiểm tra thư viện hiện có
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ Pha 2: Surgical Edits   │ Sửa đổi vi phẫu chính xác bằng replace_file_content
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ Pha 3: Real Verify      │ Chạy lệnh test/build/lint thật (Capture Evidence)
└───────────┬─────────────┘
            │
     Có lỗi?├──► [Self-Healing: Tự sửa và verify lại]
            ▼
┌─────────────────────────┐
│ Pha 4: Proof Report     │ Báo cáo kết quả kèm mã lỗi đã sửa và log pass
└─────────────────────────┘
```

#### Pha 1: Khảo sát Ngữ Cảnh & Đảm Bảo Tương Thích (Context & Fit Check)
* Trước khi tạo mới hoặc sửa bất kỳ file nào:
  1. Phải dùng `view_file` đọc kỹ file mục tiêu và các file import liên quan.
  2. Kiểm tra `package.json`, `requirements.txt` hoặc cấu trúc dự án để biết framework, styling system (Tailwind, CSS Modules, MUI...), ngôn ngữ (TypeScript strict hay JS).
  3. **Không tự ý cài thêm package ngoài** nếu project đã có sẵn thư viện tương đương (ví dụ: đã có `axios` thì không tự cài thêm `got`, đã có `lucide-react` thì không cài thêm `react-icons`).
  4. Tuân thủ triệt để naming convention và coding patterns hiện có của dự án.

#### Pha 2: Chỉnh Sửa Vi Phẫu (Surgical Edits)
* Ưu tiên dùng `replace_file_content` để thay đổi chính xác khối mã cần sửa.
* Giữ nguyên các comment, docstring, typing hiện có, không làm xáo trộn các đoạn mã không liên quan.

#### Pha 3: Xác Thực Thực Tế (Rigorous Verification)
Ngay sau khi sửa code, **BẮT BUỘC** thực thi lệnh kiểm tra tương ứng với stack của dự án:
* **TypeScript / Next.js**: Chạy `npm run build`, `npx tsc --noEmit` hoặc `npm run lint`.
* **Python**: Chạy `pytest` hoặc chạy script test trực tiếp với dữ liệu mẫu.
* **API Endpoints**: Chạy curl hoặc script test để verify mã HTTP trả về (200 OK) và cấu trúc JSON.
* **Vòng lặp Tự sửa lỗi (Self-Healing Loop)**: Nếu lệnh verify báo lỗi đỏ:
  1. Đọc kỹ stack trace và dòng gây lỗi.
  2. Sửa lại code ngay lập tức.
  3. Chạy lại lệnh verify. Lặp lại cho đến khi exit code = 0.

#### Pha 4: Báo Cáo Bằng Chứng (Evidence Capture)
* Báo cáo cho người dùng phải nêu rõ:
  - File đã sửa là gì.
  - Lệnh verify đã chạy là gì.
  - Kết quả kiểm chứng (Exit code 0, log build thành công, hoặc response payload thực tế).

---

## 🌐 3. QUY TẮC KIỂM THỬ WEB & ĐIỀU KHIỂN TRÌNH DUYỆT BẰNG CHROME MCP

### 3.1. Lý do bắt buộc dùng Chrome DevTools MCP
* Hệ thống đã tích hợp sẵn máy chủ MCP `chrome-devtools-mcp`.
* Việc tự ý viết script mới (như Playwright, Puppeteer, Selenium) hoặc cào dump toàn bộ mã nguồn HTML dài hàng chục ngàn dòng sẽ làm **tràn context window, tiêu tốn lãng phí token khủng khiếp** và phản hồi chậm.

### 3.2. Quy trình chuẩn điều khiển qua MCP (Token-Efficient Pattern)

AI phải gọi các công cụ của server `chrome-devtools-mcp` qua `call_mcp_tool`:

```text
┌─────────────────┐
│ 1. Điều hướng   │ call_mcp_tool -> Server: chrome-devtools-mcp, Tool: navigate_page
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 2. Lấy Snapshot │ call_mcp_tool -> Server: chrome-devtools-mcp, Tool: take_snapshot
└────────┬────────┘ (Cây a11y rút gọn kèm element UID - cực kỳ tiết kiệm token!)
         │
         ▼
┌─────────────────┐
│ 3. Tương tác    │ call_mcp_tool -> Server: chrome-devtools-mcp, Tool: click / fill / fill_form
└────────┬────────┘ (Dùng đúng uid lấy từ snapshot)
         │
         ▼
┌─────────────────┐
│ 4. Bắt Lỗi JS   │ call_mcp_tool -> Server: chrome-devtools-mcp, Tool: list_console_messages
└────────┬────────┘ (Kiểm tra console error trực tiếp từ trình duyệt)
         │
         ▼
┌─────────────────┐
│ 5. Chụp Ảnh UI  │ call_mcp_tool -> Server: chrome-devtools-mcp, Tool: take_screenshot
└─────────────────┘ (LUÔN truyền tham số filePath để lưu file ảnh cục bộ, KHÔNG dump base64 vào chat!)
```

### 3.3. Các công cụ MCP thông dụng và tham số chuẩn

1. **Mở trang hoặc điều hướng:**
   - Server: `chrome-devtools-mcp`, Tool: `navigate_page`
   - Args: `{"url": "http://localhost:3000/...", "pageId": 1}`
2. **Lấy cấu trúc trang tiết kiệm token:**
   - Server: `chrome-devtools-mcp`, Tool: `take_snapshot`
   - *Lưu ý:* Snapshot trả về cây trợ năng (Accessibility Tree) với các `uid` ngắn gọn, không nhồi HTML thô hàng MB.
3. **Thao tác phần tử:**
   - Server: `chrome-devtools-mcp`, Tool: `click` với `{"uid": "<uid_từ_snapshot>"}`
   - Server: `chrome-devtools-mcp`, Tool: `fill` với `{"uid": "<uid>", "value": "text"}`
4. **Kiểm tra console và network:**
   - Server: `chrome-devtools-mcp`, Tool: `list_console_messages` (bắt uncaught errors, 404, 500)
5. **Chụp ảnh bằng chứng:**
   - Server: `chrome-devtools-mcp`, Tool: `take_screenshot`
   - Tham số quan trọng: `filePath` trỏ tới đường dẫn file ảnh cụ thể (ví dụ: `screenshots/result.png`), giúp người dùng xem được ảnh mà không bị nhồi base64 chuỗi dài vào chat.

### 3.4. Điều cấm trong kiểm thử Web
* ❌ **CẤM** cào dump toàn bộ HTML trang web vào context chat.
* ❌ **CẤM** tự tạo script chạy Puppeteer/Selenium/Playwright rời khi `chrome-devtools-mcp` đang sẵn sàng.
* ❌ **CẤM** kết luận "web hoạt động bình thường" khi chưa kiểm tra console messages (`list_console_messages`) để xác nhận không có lỗi JavaScript runtime.
