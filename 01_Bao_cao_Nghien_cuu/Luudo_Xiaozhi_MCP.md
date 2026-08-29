# Sơ Đồ Khối & Lưu Đồ Module Xiaozhi AI Dictation Robot

Tài liệu này mô tả chi tiết kiến trúc, quy trình nghiệp vụ và luồng dữ liệu cho **Module Xiaozhi Dictation** — thành phần trợ lý giọng nói AI đọc chính tả trong hệ thống ViHand Grade, sử dụng thiết bị phần cứng Xiaozhi ESP32-S3 kết hợp MCP Server.

*(Tất cả sơ đồ đã được thiết kế dưới dạng khung văn bản trực quan (Box-Drawing) tương thích mọi trình xem tài liệu).*

---

## Hình X.1 – Kiến trúc tổng thể Module Xiaozhi Dictation

Sơ đồ mô tả luồng dữ liệu hai chiều từ khi giáo viên ra lệnh giọng nói đến khi bài đọc được lưu vào cơ sở dữ liệu ViHand Grade:

```text
       👨‍🏫 GIÁO VIÊN
       ("Alexa, soạn bài chính tả lớp 3A, chủ đề mùa hè")
              │
              ▼
┌────────────────────────────────────────────────────────┐
│  🔊 PHẦN CỨNG XIAOZHI (ESP32-S3)                       │
│  - Microphone thu âm (Wake word: "Alexa")              │
│  - Loa phát âm thanh cho cả lớp nghe                   │
└─────────────────────────┬──────────────────────────────┘
                          │ Luồng âm thanh (Audio Stream)
                          ▼
┌────────────────────────────────────────────────────────┐
│  ☁️ XIAOZHI.ME CLOUD PLATFORM                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │ 1. ASR Engine: Giọng nói ──▶ Văn bản lệnh        │  │
│  │ 2. LLM Core: Xử lý ngữ cảnh + Role "Alexa"       │  │
│  │ 3. Quyết định: Cần gọi công cụ ngoài không?      │  │
│  └───────────────┬──────────────────────────┬───────┘  │
│                  │ Không                    │ Có       │
│                  ▼                          ▼          │
│       ┌──────────────────────┐   ┌──────────────────┐  │
│       │ TTS: Chuyển văn bản  │   │ Gọi MCP Tool     │  │
│       │  thành giọng đọc     │   │ (JSON-RPC 2.0)   │  │
│       └──────────┬───────────┘   └──────────┬───────┘  │
└──────────────────┼──────────────────────────┼──────────┘
                   │ Phát âm                  │ WebSocket
                   ▼                          ▼
       ┌───────────────────────┐   ┌───────────────────────────────────┐
       │ 🔈 Loa Robot ESP32-S3 │   │ 🐍 MCP SERVER (Python - :8200)    │
       │ (Cả lớp nghe & chép)  │   │ ┌───────────────────────────────┐ │
       └───────────────────────┘   │ │ • Khởi tạo Role Prompt Alexa  │ │
                                   │ │ • Router điều phối Tools:     │ │
                                   │ │   - vihand.save_dictation     │ │
                                   │ │   - vihand.get_sessions       │ │
                                   │ └───────────────┬───────────────┘ │
                                   └─────────────────┼─────────────────┘
                                                     │ HTTP REST (Port 3000)
                                                     ▼
┌──────────────────────────────────────────────────────────────────────┐
│  🌐 VIHAND GRADE CORE (Next.js Web Server & Database)                │
│                                                                      │
│    POST /api/dictation/sessions ──▶ [ Prisma ORM ]                   │
│    GET  /api/dictation/sessions             │                        │
│                                             ▼                        │
│                                   [( SQLite: vihand.db )]            │
│                                   • DictationSession                 │
│                                   • ConversationLog                  │
│                                             │                        │
│                                             ▼                        │
│                                   📊 Dashboard Giáo Viên             │
│                                   (/teacher/dictation)               │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Hình X.2 – Lưu đồ quy trình 3 bước của Alexa (Chi tiết)

Lưu đồ biểu diễn logic tương tác và kịch bản sư phạm khi trợ lý AI Alexa tổ chức một buổi nghe - viết chính tả:

```text
                      [🎙️ Kích hoạt: "Alexa, ..."]
                                  │
                                  ▼
                     ┌──────────────────────────┐
                     │ Phân tích câu lệnh đầu vào│
                     └────────────┬─────────────┘
                                  │
         ┌────────────────────────┼────────────────────────┐
         │                        │                        │
         ▼ (Lệnh chung chung)     ▼ (Lệnh đầy đủ)          ▼ (Hỏi lịch sử)
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│ BƯỚC 1: HỎI LẠI  │     │ BƯỚC 2: SOẠN BÀI │     │ TRA CỨU LỊCH SỬ  │
│ Alexa hỏi 5 ý:   │     │ & ĐỌC CHÍNH TẢ   │     │ Gọi Tool:        │
│ 1. Lớp mấy?      │     │                  │     │ get_sessions     │
│ 2. Chủ đề gì?    │     │ • Có sẵn nội dung│     │       │          │
│ 3. Bao nhiêu câu?│     │   ──▶ Dùng luôn  │     │       ▼          │
│ 4. Đọc mấy lần?  │     │ • Chưa có nội dung     │ Đọc danh sách    │
│ 5. Tốc độ đọc?   │     │   ──▶ LLM tự tạo │     │ các bài đã học   │
└────────┬─────────┘     └────────┬─────────┘     └──────────────────┘
         │                        │
         │ Giáo viên trả lời      │
         └───────────────────────▶│
                                  ▼
                  ┌─────────────────────────────────┐
                  │ ĐỌC LẦN 1: Đọc toàn bài liền    │
                  │ mạch để học sinh nắm đại ý      │
                  └───────────────┬─────────────────┘
                                  │
                                  ▼
                  ┌─────────────────────────────────┐
                  │ ĐỌC LẦN 2: Đọc từng câu một     │
                  │ - Tạm dừng 1.5s/chữ cho HS chép │
                  │ - Lặp lại N lần theo yêu cầu    │
                  └───────────────┬─────────────────┘
                                  │
                                  ▼
                  ┌─────────────────────────────────┐
                  │ Hỏi học sinh:                   │
                  │ "Các em đã viết xong chưa ạ?"   │
                  └───────────────┬─────────────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    │                           │
          [Chưa xong / Đọc lại]              [Đã xong]
                    │                           │
                    └───────────┐               ▼
                                │    ┌─────────────────────────────────┐
                                │    │ BƯỚC 3: HỎI XÁC NHẬN LƯU BÀI    │
                                │    │ "Thầy/cô có muốn em lưu bài vào │
                                │    │  hệ thống ViHand Grade không?"  │
                                │    └──────────────┬──────────────────┘
                                │                   │
                                │         ┌─────────┴─────────┐
                                │         │                   │
                                │     ["Lưu lại"]       ["Không cần"]
                                │         │                   │
                                │         ▼                   │
                                │    ┌──────────────────┐     │
                                │    │ GỌI MCP TOOL:    │     │
                                │    │ save_dictation   │     │
                                │    │  • Tiêu đề, lớp  │     │
                                │    │  • Đoạn văn      │     │
                                │    │  • Lịch sử log   │     │
                                │    └────────┬─────────┘     │
                                │             │               │
                                │             ▼               │
                                │    [( Ghi vào SQLite )]     │
                                │             │               │
                                │             ▼               │
                                │    [Báo lưu thành công]     │
                                │             │               │
                                └─────────────┼───────────────┘
                                              ▼
                                     [✅ KẾT THÚC PHIÊN]
```

---

## Hình X.3 – Lưu đồ MCP JSON-RPC Handshake (Giao thức kết nối)

Sơ đồ trình tự biểu diễn các gói tin JSON-RPC trao đổi giữa các thành phần phần mềm và phần cứng:

```text
ESP32-S3          xiaozhi.me Cloud        MCP Server (:8200)       Next.js API (:3000)      SQLite DB
   │                     │                        │                         │                  │
   │   === GIAI ĐOẠN 1: KHỞI TẠO KẾT NỐI (Khi MCP Server vừa bật) ===       │                  │
   │                     │                        │                         │                  │
   │                     │◀── WebSocket Connect ──┤ (wss://api.xiaozhi.me)  │                  │
   │                     ├── {"method":"initialize"}───────────────────────▶│                  │
   │                     │◀── {"result": {RolePrompt, serverInfo}}──────────┤                  │
   │                     ├── {"method":"tools/list"}───────────────────────▶│                  │
   │                     │◀── {"result": {tools: [save, get]}}──────────────┤                  │
   │                     │                        │                         │                  │
   │   === GIAI ĐOẠN 2: GIÁO VIÊN RA LỆNH GIỌNG NÓI ===                     │                  │
   │                     │                        │                         │                  │
   │── Audio Stream ────▶│ (Thu âm lệnh thoại)    │                         │                  │
   │   "Alexa, đọc bài"  │ [ASR ──▶ LLM Core]     │                         │                  │
   │                     │                        │                         │                  │
   │◀── Audio TTS ───────┤ (Đọc bài cho học sinh) │                         │                  │
   │   "Vâng, em đọc..." │                        │                         │                  │
   │                     │                        │                         │                  │
   │   === GIAI ĐOẠN 3: LƯU PHIÊN ĐỌC VÀO HỆ THỐNG ===                      │                  │
   │                     │                        │                         │                  │
   │── Audio: "Lưu lại" ─▶ [LLM quyết định gọi tool]                        │                  │
   │                     ├── {"method":"tools/call",                        │                  │
   │                     │    "params":{name:"save_dictation", args:{...}}▶│                  │
   │                     │                        ├── POST /api/dictation/sessions ───────────▶│
   │                     │                        │   {title, passage, className, logs}        ├── Prisma.create
   │                     │                        │                         │                  │──────┐
   │                     │                        │                         │                  │◀─────┘
   │                     │                        │◀── HTTP 201 Created ────┴── ID: session_123│
   │                     │◀── {"result": "OK"} ───┤                         │                  │
   │                     │                        │                         │                  │
   │◀── Audio TTS ───────┤                        │                         │                  │
   │   "Đã lưu thành công"                        │                         │                  │
   │                     │                        │                         │                  │
```

---

## Hình X.4 – Thiết kế Cơ sở Dữ liệu Module Xiaozhi (Entity Relationship)

Mối liên kết giữa bảng phiên đọc chính tả của Xiaozhi với cơ sở dữ liệu chấm điểm ViHand Grade:

```text
┌────────────────────────────────────────┐
│           DictationSession             │
├────────────────────────────────────────┤
│ PK  id           : String (CUID)       │
│     title        : String              │
│     passage      : String (Toàn bài)   │
│     className    : String (3A1, 4B...) │
│     teacherName  : String              │
│     status       : String (completed)  │
│     summary      : String              │
│     createdAt    : DateTime            │
└──────────────────┬─────────────────────┘
                   │
                   │ 1 - N (Một phiên có nhiều lượt hội thoại)
                   ▼
┌────────────────────────────────────────┐       ┌────────────────────────────────────────┐
│            DictationLog                │       │                 Grade                  │
├────────────────────────────────────────┤       ├────────────────────────────────────────┤
│ PK  id           : String (CUID)       │       │ PK  id                 : String        │
│ FK  sessionId    : String              │       │     studentName        : String        │
│     speaker      : String (gv/ai/hs)   │       │     assignmentTitle    : String        │
│     content      : String (Nội dung)   │       │ FK  dictationSessionId : String (Opt)   │◄──┐
│     createdAt    : DateTime            │       │     originalText       : String (OCR)  │   │
└────────────────────────────────────────┘       │     fixedText          : String (ViT5) │   │
                                                 │     scoreNum           : Float         │   │
                                                 │     createdAt          : DateTime      │   │
                                                 └────────────────────────────────────────┘   │
                                                                                              │
                                                 (Liên kết đối chiếu: Bài đọc ───────────────┘
                                                  được dùng để chấm bài viết tay của học sinh)
```

---

## Hình X.5 – Lưu đồ trang Quản lý Phiên đọc (Teacher Dashboard)

Quy trình tải, lọc, tra cứu và xem chi tiết bài đọc chính tả trên giao diện Web (`/teacher/dictation`):

```text
                 [👨‍🏫 Giáo viên truy cập: /teacher/dictation]
                                      │
                                      ▼
                 ┌──────────────────────────────────────────┐
                 │ Gửi Request: GET /api/dictation/sessions │
                 └────────────────────┬─────────────────────┘
                                      │
                                      ▼
                 ┌──────────────────────────────────────────┐
                 │ Tải danh sách + Thống kê:                │
                 │ • Tổng số bài đã đọc                     │
                 │ • Danh sách lớp học                      │
                 │ • Lần đọc gần nhất                       │
                 └────────────────────┬─────────────────────┘
                                      │
                                      ▼
         ┌──────────────────────────────────────────────────────────┐
         │ 🔍 BỘ LỌC TÌM KIẾM (Client-side useMemo Filter)          │
         │ ├── 1. Ô tìm kiếm: Tên bài / Từ khóa đoạn văn            │
         │ ├── 2. Dropdown Lớp: Tất cả, 1A, 2B, 3A1, 4C, 5D...     │
         │ └── 3. Dropdown Thời gian: Hôm nay, 7 ngày, Tháng này    │
         └────────────────────────────┬─────────────────────────────┘
                                      │
                                      ▼
                          ┌────────────────────────┐
                          │ Có kết quả phù hợp?    │
                          └───────────┬────────────┘
                                      │
                     ┌────────────────┴────────────────┐
                     │ Có                              │ Không
                     ▼                                 ▼
       ┌───────────────────────────┐     ┌───────────────────────────┐
       │ Hiển thị danh sách Cards: │     │ Hiển thị thông báo trống  │
       │ - Tiêu đề bài & Badge lớp │     │ + Nút "Xóa bộ lọc"        │
       │ - Trích đoạn nội dung     │     └───────────────────────────┘
       │ - Thời gian & Số lượt thoại│
       └─────────────┬─────────────┘
                     │
         ┌───────────┴───────────┐
         │ Thao tác của Giáo viên│
         └───────────┬───────────┘
                     │
       ┌─────────────┴─────────────┐
       │ Xem chi tiết              │ Xóa phiên
       ▼                           ▼
┌───────────────────────────┐ ┌───────────────────────────┐
│ Mở Modal Dialog:          │ │ Xác nhận xoá:             │
│ • Toàn văn bài chính tả   │ │ DELETE /api/sessions/:id  │
│ • Lịch sử hội thoại đầy đủ│ │ Cập nhật lại danh sách UI │
└───────────────────────────┘ └───────────────────────────┘
```

---

## Hình X.6 – Lưu đồ tổng hợp toàn hệ thống ViHand Grade

Bức tranh tổng thể 5 Modules kết nối liền mạch từ khâu đọc bài (tiền kỳ) đến khâu chấm điểm (hậu kỳ):

```text
    ┌────────────────────────┐                   ┌────────────────────────┐
    │ 🎙️ LỆNH GIỌNG NÓI      │                   │ 📷 ẢNH CHỤP BÀI VIẾT   │
    │ (Giáo viên ──▶ Alexa)  │                   │ (Bài làm của học sinh) │
    └───────────┬────────────┘                   └───────────┬────────────┘
                │                                            │
                ▼                                            ▼
┌────────────────────────────────┐               ┌────────────────────────┐
│ 🤖 MODULE 1: XIAOZHI DICTATION │               │ 🖼️ MODULE 2: TIỀN XỬ LÝ│
│ • Phần cứng Robot ESP32-S3     │               │ Pipeline 9 bước lọc ảnh│
│ • xiaozhi.me Cloud ASR/TTS     │               │ (Khử bóng, nhị phân...)│
│ • MCP Server Python (:8200)    │               └───────────┬────────────┘
└───────────────┬────────────────┘                           │
                │                                            ▼
                │                                ┌────────────────────────┐
                │                                │ ☁️ MODULE 3: OCR VISION│
                │                                │ Google Gemini API      │
                │                                │ (Trích xuất chữ viết)  │
                │                                └───────────┬────────────┘
                │                                            │
                │                                            ▼
                │                                ┌────────────────────────┐
                │                                │ 🤖 MODULE 4: CHẤM ĐIỂM │
                │                                │ • Sửa lỗi ViT5 (:8000) │
                │                                │ • So khớp Levenshtein  │
                │                                │ • Chấm điểm 4 tiêu chí │
                │                                └───────────┬────────────┘
                │                                            │
                ▼                                            ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ 🌐 MODULE 5: HỆ THỐNG QUẢN TRỊ TRUNG TÂM (Next.js :3000 + SQLite)       │
│                                                                         │
│   • Lưu trữ & tra cứu bài đọc chính tả (DictationSession)               │
│   • Lưu trữ bài chấm điểm & bảng điểm lớp học (Grade)                   │
│   • Phân quyền 3 cấp: Admin / Giáo viên / Học sinh                      │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Bảng Thuật ngữ Kỹ thuật

| Thuật ngữ | Ý nghĩa & Chức năng trong hệ thống |
| :--- | :--- |
| **MCP (Model Context Protocol)** | Giao thức mở chuẩn hóa trao đổi JSON-RPC, cho phép AI Chatbot chủ động kích hoạt API lưu bài của ViHand Grade. |
| **WebSocket** | Kênh kết nối mạng hai chiều liên tục thời gian thực giữa MCP Server và dịch vụ Cloud/ESP32. |
| **ASR (Automatic Speech Recognition)** | Bộ nhận dạng giọng nói tự động, chuyển lệnh thoại của giáo viên thành văn bản điều khiển. |
| **TTS (Text-to-Speech)** | Bộ tổng hợp giọng nói, đọc đoạn văn chính tả tiếng Việt phát ra loa với tốc độ phù hợp học sinh tiểu học. |
| **ESP32-S3** | Vi điều khiển trung tâm trên robot Xiaozhi, tích hợp WiFi/BLE, bộ nhớ PSRAM và các cổng I2S giao tiếp Mic/Loa. |
| **Prisma ORM** | Tầng truy xuất dữ liệu an toàn, ánh xạ đối tượng lập trình với cơ sở dữ liệu SQLite cục bộ. |
| **Role Prompt** | Đoạn chỉ dẫn hệ thống định hình tính cách, phong cách sư phạm và quy tắc nghiệp vụ cho trợ lý AI Alexa. |
