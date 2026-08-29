# 🤖 ViHand Grade — Đặc Tả Kỹ Thuật Mở Rộng
## Module 11: Robot Đọc Chính Tả tích hợp Xiaozhi AI Chatbot

> Tài liệu bổ sung cho `ViHandGrade_TechSpec.md v1.2.0`
> Đề xuất phiên bản: `v1.3.0-draft`

---

## 11.1 Bối cảnh & Mục tiêu

Hiện tại ViHand Grade xử lý ở **hậu kỳ**: giáo viên đọc chính tả trực tiếp trên lớp (không được hệ thống hỗ trợ), sau đó mới chụp ảnh bài viết của học sinh để chấm điểm. Module này bổ sung phần **tiền kỳ**: dùng một robot vật lý chạy nền tảng **Xiaozhi AI Chatbot** (dự án mã nguồn mở `xiaozhi-esp32`, chip ESP32-S3) để **đọc đoạn văn chính tả thay hoặc hỗ trợ giáo viên**, đồng thời toàn bộ hội thoại (lệnh điều khiển bằng giọng nói của giáo viên/học sinh và phản hồi của robot) được ghi lại và lưu vào cùng cơ sở dữ liệu với hệ thống chấm điểm hiện có.

**Mục tiêu kỹ thuật:**
* **Chế độ đọc linh hoạt kép (Dual-Mode Dictation)**:
  1. *Chế độ Ngữ liệu Chuẩn (Database Retrieval / Ground Truth)*: Robot tự động tra cứu từ Cơ sở dữ liệu chứa toàn bộ kho ngữ liệu Sách Giáo Khoa (SGK) Tiếng Việt Tiểu học (Lớp 1–5) hoặc các đoạn văn do giáo viên soạn trước trên Web để đọc chuẩn xác 100% nguyên tác, không bịa từ (Zero-Hallucination).
  2. *Chế độ AI Tự Động (Generative)*: AI tự động sáng tác đoạn văn ngắn chuẩn sư phạm theo chủ đề, khối lớp và số lượng câu mà giáo viên yêu cầu qua giọng nói.
* Giáo viên soạn/chọn đoạn văn chính tả trên Web app hoặc ra lệnh thoại trực tiếp → robot đọc bằng giọng TTS tiếng Việt, tốc độ phù hợp học sinh tiểu học tập chép.
* Robot hiểu lệnh thoại điều khiển cơ bản: đọc lại, chậm hơn, tạm dừng, tiếp tục, đánh vần từ khó.
* Toàn bộ transcript hội thoại (nội dung đọc + lệnh + phản hồi) được lưu trữ, gắn với Lớp học / Bài viết, có thể tra cứu lại và **liên kết với bản ghi `Grade`** của học sinh đã chép bài đó làm **văn bản đáp án chuẩn (Ground Truth)** để đối chiếu lỗi sai khi chấm điểm qua OCR/ViT5.
* Không phụ thuộc dịch vụ cloud `xiaozhi.me` chính thức — tự triển khai backend riêng để dữ liệu ở lại trong hạ tầng của ViHand Grade (phù hợp với triết lý "tối ưu phần cứng cục bộ" đã có của dự án gốc).

**Ghi chú quan trọng:** `xiaozhi-esp32` là firmware mã nguồn mở chạy trên phần cứng ESP32-S3, giao tiếp với một **server riêng** qua WebSocket (không bắt buộc dùng server đám mây của nhà phát triển gốc). Do đó phần việc chính là xây dựng **Xiaozhi Bridge Service** — server tự host đóng vai trò "bộ não" cho robot, đồng thời là cầu nối dữ liệu với ViHand Grade.

---

## 11.2 Kiến trúc tổng thể mở rộng

```text
┌───────────────────────────┐     WebSocket (Audio + JSON)     ┌──────────────────────────────────┐
│   Robot Xiaozhi (ESP32-S3)│◀─────────────────────────────────▶│   Xiaozhi Bridge Service          │
│  Mic + Loa + LED + Nút    │                                   │   (Python/FastAPI, Port 8100)     │
│  Firmware: xiaozhi-esp32  │                                   │   - ASR streaming (lệnh thoại)    │
└───────────────────────────┘                                   │   - Dialog/Intent Manager         │
                                                                  │   - TTS engine (đọc chính tả)     │
                                                                  │   - MCP Tool Client                │
                                                                  └───────────────┬───────────────────┘
                                                                                  │ HTTPS (REST, nội bộ)
                                                                                  ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                        Next.js App Router (Port 3000) — ViHand Grade Core                        │
│  /api/xiaozhi/devices     /api/xiaozhi/passages     /api/xiaozhi/sessions     /api/xiaozhi/logs   │
│                                          │                                                        │
│                                  ┌───────▼───────┐                                                │
│                                  │  Prisma ORM   │                                                │
│                                  │ SQLite (vihand.db) — bảng mới: RobotDevice, DictationPassage,   │
│                                  │ DictationSession, ConversationLog                               │
│                                  └───────────────┘                                                │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘
```

**Vì sao thêm một service riêng (Xiaozhi Bridge) thay vì gọi thẳng Next.js từ robot?**
Giao thức của `xiaozhi-esp32` yêu cầu một server duy trì kết nối WebSocket song công thời gian thực (streaming audio 2 chiều, quản lý trạng thái phiên nghe/nói, wake-word ACK...). Đây là workload streaming liên tục, khác bản chất với API REST ngắn hạn của Next.js. Do đó tách riêng thành microservice Python (tương tự cách `python_service` ViT5 đã được tách khỏi Next.js), và Bridge Service chỉ gọi REST vào Next.js để đọc cấu hình bài đọc và ghi log — giữ đúng triết lý kiến trúc hiện có của dự án.

---

## 11.3 Đặc tả Phần cứng Robot & Hạ tầng Nhúng (Hardware Specification)

Hệ thống được thiết kế theo kiến trúc phần cứng 2 tầng phân tán: **Tầng Thiết bị Lớp học (Edge Device / Robot)** và **Tầng Máy chủ Biên Cục bộ (Edge Server)**.

### 11.3.1 Kiến trúc 2 tầng phần cứng

```text
┌────────────────────────────────────────────────────────────────────────┐
│               TẦNG 1: THIẾT BỊ LỚP HỌC (ROBOT XIAOZHI)                │
│                                                                        │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │               Vi điều khiển trung tâm: ESP32-S3                │   │
│   │    (Xtensa 32-bit Dual-Core 240MHz, 512KB SRAM, 8MB PSRAM)     │   │
│   └──────┬───────────────┬─────────────────┬───────────────┬───────┘   │
│          │ I2S (RX)      │ I2S (TX)        │ SPI / I2C     │ GPIOs     │
│          ▼               ▼                 ▼               ▼           │
│     ┌─────────┐    ┌───────────┐     ┌───────────┐    ┌─────────┐      │
│     │ Micro   │    │ Mạch Amp  │     │ Màn hình  │    │ Nút bấm │      │
│     │ (INMP441│    │ + Loa 3-5W│     │ LCD/OLED  │    │ & LED   │      │
│     │ /ES7210)│    │ (MAX98357)│     │ (ST7789)  │    │         │      │
│     └─────────┘    └───────────┘     └───────────┘    └─────────┘      │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Wi-Fi 2.4GHz (WebSocket Audio/JSON Streaming)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│             TẦNG 2: MÁY CHỦ BIÊN CỤC BỘ (EDGE SERVER)                  │
│                                                                        │
│               Raspberry Pi 4 Model B (4GB / 8GB RAM)                   │
│   - Xiaozhi Bridge Service (FastAPI / WebSocket Audio Broker)          │
│   - ViHand Grade Core (Next.js, SQLite, Prisma ORM)                    │
└────────────────────────────────────────────────────────────────────────┘
```

### 11.3.2 Khối xử lý trung tâm Robot (ESP32-S3)
* **Vi điều khiển**: ESP32-S3-WROOM-1 (N16R8) — Dual-core Xtensa LX7 @ 240 MHz.
* **Bộ nhớ**: 512 KB SRAM nội bộ + **8 MB Octal PSRAM** ngoài + **16 MB Flash**. Bộ nhớ PSRAM dung lượng lớn là điều kiện tiên quyết để duy trì bộ đệm âm thanh (Audio Ring Buffers) 2 chiều (Rx/Tx) chống tràn và chống rớt gói (packet drop) khi stream qua mạng không dây.
* **Tập lệnh Vector & DSP**: Tận dụng các tập lệnh AI/DSP tích hợp trên lõi LX7 để xử lý nhanh các tác vụ âm thanh biên: lọc nhiễu sơ bộ, mã hóa/giải mã luồng thoại (Opus/PCM) và phát hiện từ khóa đánh thức (Wake-word Detection).
* **Truyền thông không dây**: Wi-Fi 802.11 b/g/n (2.4 GHz) cho luồng streaming thời gian thực và Bluetooth 5.0 (BLE) phục vụ quá trình cấu hình mạng ban đầu (BLE Provisioning).

### 11.3.3 Khối Thu / Phát Âm Thanh (Audio Front-End)
* **Microphone (Thu lệnh thoại)**:
  * Module: Micro số MEMS **INMP441** (hoặc cụm Dual-Mic ES7210) giao tiếp qua bus **I2S (Rx)**.
  * Tần số lấy mẫu: 16 kHz, độ sâu 16-bit Mono (tối ưu cho nhận dạng giọng nói ASR).
  * Xử lý tín hiệu: Trang bị cơ chế chống vọng âm (Acoustic Echo Cancellation - AEC) dạng phần mềm/firmware bằng cách tạm ngắt mic khi loa đang phát hoặc chỉ mở mic trong chu kỳ học sinh viết bài.
* **Mạch Khuếch Đại & Giải Mã Âm Thanh (DAC + Amp)**:
  * Module: Mạch khuếch đại Class-D kỹ thuật số **MAX98357A** (hoặc NS4168) giao tiếp qua bus **I2S (Tx)**, hiệu suất chuyển đổi năng lượng > 90%.
* **Loa (Speaker)**:
  * Loa toàn dải công suất **3W – 5W (trở kháng 4Ω / 8Ω)**, đường kính màng loa 40mm – 50mm.
  * Yêu cầu âm học: Đảm bảo âm lượng đạt tối thiểu 75–80 dB ở khoảng cách 3m – 5m, dải trung âm (vocal) trong trẻo, rõ ràng để học sinh ở cuối lớp nghe chuẩn các thanh điệu tiếng Việt (hỏi, ngã, sắc, nặng).

### 11.3.4 Khối Giao Diện & Tương Tác Vật Lý (HMI)
* **Màn hình hiển thị**:
  * Màn hình màu IPS **ST7789 1.3" / 1.54" (độ phân giải 240×240 pixel)** giao tiếp qua chuẩn SPI tốc độ cao.
  * Nhiệm vụ: Hiển thị biểu cảm robot (Animation mắt vui vẻ/lắng nghe/đang đọc), hiển thị mã QR ghép nối (`deviceCode`), trạng thái Wi-Fi và chỉ số câu đang đọc (`Câu 2/5`).
* **Nút bấm vật lý (Tactile Buttons)**:
  * Nút tạm dừng / tiếp tục khẩn cấp (Emergency Pause/Resume Button) kích hoạt qua ngắt phần cứng (Hardware Interrupt GPIO), cho phép giáo viên can thiệp tức thì ngay cả khi môi trường lớp học ồn làm ASR nhận lệnh chậm.
* **Đèn LED hiển thị trạng thái (RGB WS2812B / Neopixel)**:
  * Xanh dương nhấp nháy: Đang lắng nghe lệnh (Listening).
  * Xanh lá: Đang đọc đoạn văn (Speaking / Dictating).
  * Vàng: Tạm dừng (Paused).
  * Đỏ: Lỗi kết nối mạng hoặc lỗi server.

### 11.3.5 Khối Nguồn & Quản lý Năng lượng
* **Nguồn cấp trực tiếp**: Cổng USB Type-C 5V / 2A bố trí phía sau đế robot.
* **Tùy chọn di động (Pin sạc)**: Tích hợp mạch sạc xả bảo vệ pin Lithium TP4056 + Mạch tăng áp 5V Boost Converter kèm 01 cell pin Li-ion 18650 (2600 mAh), cho phép robot hoạt động liên tục từ 3 – 4 giờ không cần cắm nguồn trực tiếp.

### 11.3.6 Bảng kê linh kiện ước tính (Bill of Materials - BOM cho 1 Robot)

| STT | Thành phần linh kiện | Mã / Model đề xuất | Giao tiếp | Số lượng | Đơn giá ước tính |
|:---:|:---|:---|:---:|:---:|:---:|
| 1 | Bo mạch điều khiển trung tâm | ESP32-S3-WROOM-1 (N16R8) | Wi-Fi / BLE | 1 | 110.000 đ |
| 2 | Cảm biến Micro kỹ thuật số | INMP441 MEMS Microphone | I2S (Rx) | 1 | 25.000 đ |
| 3 | Mạch giải mã DAC & Khuếch đại | MAX98357A Class-D 3W | I2S (Tx) | 1 | 35.000 đ |
| 4 | Loa toàn dải lớp học | Loa Oval/Tròn 4Ω 3W (40mm) | Analog | 1 | 20.000 đ |
| 5 | Màn hình màu hiển thị HMI | ST7789 1.3" IPS (240x240) | SPI | 1 | 55.000 đ |
| 6 | Đèn LED báo trạng thái | WS2812B RGB Mini | GPIO | 1 | 5.000 đ |
| 7 | Nút bấm & Công tắc nguồn | Tactile Switch 6x6mm | GPIO | 2 | 5.000 đ |
| 8 | Khung vỏ robot & phụ kiện | Vỏ in 3D (PLA) + ốc vít + Jack Type-C | — | 1 bộ | 60.000 đ |
| **Tổng** | **Chi phí phần cứng ước tính cho 1 Robot** | | | | **~ 315.000 đ** |

---

## 11.4 Luồng nghiệp vụ (Business Flow)

1. **Chuẩn bị bài đọc (2 phương thức linh hoạt)**:
   * *Cách 1 (Qua Web App)*: Giáo viên vào màn hình `teacher/dictation/passages` trên Web app, chọn một bài đọc có sẵn trong **Kho ngữ liệu Sách Giáo Khoa (SGK Lớp 1–5)** hoặc tự nhập một đoạn văn mới vào thư viện cá nhân.
   * *Cách 2 (Qua Giọng nói trực tiếp trên Robot)*: Giáo viên chỉ cần ra lệnh thoại trên lớp: *"Alexa, đọc bài 'Hạt gạo làng ta' SGK lớp 3"* hoặc *"Alexa, đọc bài chính tả cô đã lưu hôm qua"*. Robot sẽ tự động gọi MCP Tool để tra cứu trực tiếp vào Database của ViHand Grade.
2. **Ghép nối robot**: Giáo viên chọn robot đã pair trong lớp (mỗi robot có `deviceCode` duy nhất, đăng ký một lần qua QR code hiển thị trên màn hình robot khi khởi động lần đầu).
3. **Khởi tạo phiên đọc**: Giáo viên bấm "Bắt đầu đọc chính tả" trên Web HOẶC kích hoạt bằng giọng nói trên Robot → Next.js tạo bản ghi `DictationSession` (trạng thái `pending`) → Bridge Service nạp đúng văn bản gốc chuẩn từ bảng `DictationPassage`.
4. **Robot thực hiện đọc chính tả** theo kịch bản 4 bước (chi tiết mục 11.7):
   a. Đọc toàn bài 1 lượt tốc độ chuẩn để học sinh nắm nội dung và bối cảnh tác phẩm.
   b. Đọc từng câu, dừng đủ thời gian ước tính học sinh chép kịp (mặc định 1.5s/chữ), lặp mỗi câu theo cấu hình (mặc định 2 lần).
   c. Trong lúc đọc, robot luôn lắng nghe lệnh điều khiển ngắn bằng giọng nói của giáo viên (chậm hơn / đọc lại / tạm dừng / tiếp tục / đánh vần từ khó).
   d. Đọc lại toàn bài 1 lượt cuối để học sinh soát lỗi.
5. **Ghi log song song**: Mỗi lượt robot đọc và mỗi lệnh thoại nhận được đều được Bridge Service gửi ngay (gần thời gian thực) tới `POST /api/xiaozhi/sessions/{id}/logs` để lưu vào bảng `ConversationLog`.
6. **Kết thúc phiên**: Giáo viên bấm "Kết thúc" hoặc robot tự kết thúc sau bước d → `DictationSession.status = "completed"`, hệ thống tổng hợp transcript đầy đủ.
7. **Liên kết đối chiếu chấm điểm (Ground Truth)**: Đoạn văn bản chuẩn lấy từ `DictationPassage` trong phiên đọc này sẽ được hệ thống gán trực tiếp làm **Văn bản chuẩn (Ground Truth)** cho bản ghi `Grade`. Khi giáo viên chụp ảnh bài viết tay của học sinh, Pipeline AI (OCR + ViT5) sẽ so khớp bài viết với chính xác đoạn văn này để chấm điểm chính tả, bắt lỗi dấu thanh và tính điểm tự động.

---

## 11.5 Mở rộng Database Schema (Prisma)

```prisma
// 4. Thiết bị Robot Xiaozhi đã ghép nối với hệ thống
model RobotDevice {
  id          String   @id @default(cuid())
  deviceCode  String   @unique                     // Mã định danh phần cứng ESP32 (MAC/Chip ID)
  name        String   @default("Robot lớp học")   // Tên gợi nhớ do giáo viên đặt
  classId     String   @default("")                // Lớp học được gán mặc định
  status      String   @default("offline")         // "online" | "offline" | "busy"
  lastSeenAt  DateTime @default(now())
  createdAt   DateTime @default(now())
}

// 5. Thư viện đoạn văn chính tả (SGK chuẩn & Giáo viên soạn trước)
model DictationPassage {
  id            String   @id @default(cuid())
  title         String                             // Ví dụ: "Hạt gạo làng ta", "Ai có lỗi"
  content       String                             // Toàn văn đoạn chính tả chuẩn 100%
  classId       String   @default("")                // Gán lớp (nếu là bài riêng của lớp)
  grade         Int      @default(3)               // Khối lớp phù hợp (1-5)
  source        String   @default("SGK")            // "SGK Tiếng Việt 3 Tập 1", "Giáo viên tự soạn"
  topic         String   @default("Chung")          // Chủ đề: Mùa hè, Nhà trường, Gia đình, Tình bạn...
  author        String   @default("")               // Tác giả đoạn văn / bài thơ
  readingSpeed  String   @default("normal")         // "slow" | "normal" | "fast"
  repeatPerLine Int      @default(2)                // Số lần lặp lại mỗi câu khi đọc
  createdBy     String   @default("")               // teacherId (rỗng = bài SGK mặc định hệ thống)
  createdAt     DateTime @default(now())
}

// 6. Một phiên robot đọc chính tả cho một lớp/nhóm học sinh
model DictationSession {
  id           String   @id @default(cuid())
  passageId    String                              // Liên kết DictationPassage (Ground Truth)
  deviceId     String                              // Liên kết RobotDevice
  classId      String   @default("")
  teacherId    String   @default("")
  status       String   @default("pending")        // "pending"|"reading"|"paused"|"completed"|"cancelled"
  currentLine  Int      @default(0)                // Câu đang đọc (phục vụ resume)
  startedAt    DateTime?
  endedAt      DateTime?
  createdAt    DateTime @default(now())
}

// 7. Nhật ký hội thoại chi tiết từng lượt (turn-by-turn)
model ConversationLog {
  id           String   @id @default(cuid())
  sessionId    String                              // Liên kết DictationSession
  speaker      String                              // "robot" | "teacher" | "student"
  intent       String   @default("")               // "read_line"|"repeat"|"pause"|"resume"|"slow_down"|"speed_up"|"spell_word"|"search_passage"|"other"
  content      String                              // Nội dung văn bản (đã được ASR/TTS hoá)
  audioUrl     String   @default("")               // (tuỳ chọn) đường dẫn file ghi âm lưu trữ
  timestampMs  Int      @default(0)                // Mốc thời gian tương đối trong phiên (ms)
  createdAt    DateTime @default(now())
}
```

> **Ghi chú tích hợp**: Bảng `Grade` hiện có được bổ sung 1 trường tuỳ chọn `dictationSessionId String @default("")` để liên kết ngược, không phá vỡ dữ liệu cũ (migration additive, không cần backfill bắt buộc).

---

## 11.6 API Endpoints mới

### 11.6.1 Quản lý thiết bị & thư viện bài đọc
* `POST /api/xiaozhi/devices/pair` — Ghép nối robot mới bằng mã QR (device gửi `deviceCode` lần đầu kết nối, giáo viên xác nhận gán vào lớp).
* `GET /api/xiaozhi/devices` — Danh sách robot theo lớp, trạng thái online/offline (heartbeat 30s).
* `GET|POST /api/xiaozhi/passages` — CRUD đoạn văn chính tả trong kho ngữ liệu.
* `GET /api/xiaozhi/passages/search` — Tìm kiếm đoạn văn theo từ khóa, tiêu đề, tác giả, khối lớp (phục vụ tra cứu RAG của MCP Server).
  * **Query Params**: `query=Hat+gao+lang+ta&grade=3`

### 11.6.2 Điều khiển phiên đọc
* `POST /api/xiaozhi/sessions`
  * **Body**: `{"passageId": "...", "deviceId": "...", "classId": "..."}`
  * **Mô tả**: Tạo phiên mới, chuyển tiếp lệnh `start` xuống Bridge Service.
* `POST /api/xiaozhi/sessions/{id}/control`
  * **Body**: `{"action": "pause" | "resume" | "repeat_line" | "slow_down" | "speed_up" | "stop"}`
  * **Mô tả**: Cho phép giáo viên điều khiển thủ công từ giao diện Web (song song với lệnh thoại trực tiếp trên robot).
* `GET /api/xiaozhi/sessions/{id}` — Trạng thái phiên hiện tại (câu đang đọc, tốc độ, thời lượng).

### 11.6.3 Ghi nhận & tra cứu hội thoại
* `POST /api/xiaozhi/sessions/{id}/logs` *(gọi nội bộ từ Bridge Service, không public)*
  * **Body**: `{"speaker": "robot|teacher|student", "intent": "...", "content": "...", "timestampMs": 15230}`
* `GET /api/xiaozhi/sessions/{id}/transcript`
  * **Response**: Danh sách `ConversationLog` sắp xếp theo thời gian, dùng để hiển thị lại toàn bộ hội thoại trên UI giáo viên (dạng chat log kèm nút phát lại audio nếu có lưu `audioUrl`).

---

## 11.7 Kịch bản đọc chính tả & Xử lý lệnh thoại (Dialog Manager)

### 11.7.1 State machine của phiên đọc
```text
pending → searching_passage (tra cứu bài SGK/soạn trước nếu giáo viên yêu cầu theo tên)
        → reading_intro (đọc toàn bài lần 1)
        → reading_lines (lặp qua từng câu: đọc → chờ → lặp lại N lần → câu kế tiếp)
        → reading_recap (đọc toàn bài lần cuối)
        → completed
Bất kỳ trạng thái "reading_*" có thể chuyển tạm sang "paused" rồi quay lại đúng vị trí (currentLine).
```

### 11.7.2 Tính thời gian chờ giữa các câu
Thời gian tạm dừng sau mỗi câu được ước lượng theo số lượng chữ trong câu và tốc độ viết trung bình của học sinh tiểu học (mặc định **1.5 giây/chữ**, có thể cấu hình theo khối lớp — khối 1-2 chậm hơn khối 4-5), cộng thêm khoảng đệm cố định 2 giây để chuyển câu.

### 11.7.3 Bảng ánh xạ lệnh thoại → Intent
Do học sinh/giáo viên sẽ nói các câu ngắn tự nhiên, Bridge Service dùng một lớp NLU nhẹ (tập mẫu câu tiếng Việt + fallback gọi LLM phân loại intent khi câu lệnh không khớp mẫu có sẵn) để ánh xạ sang các hành động cố định của hệ thống — ví dụ:
* Nhóm lệnh "đọc bài [Tên_bài] trong SGK / đã soạn" ──▶ `search_passage`
* Nhóm lệnh "đọc lại câu vừa rồi" ──▶ `repeat_line`
* Nhóm lệnh "đọc chậm hơn / nhanh hơn" ──▶ `slow_down` / `speed_up`
* Nhóm lệnh "dừng lại / tiếp tục" ──▶ `pause` / `resume`
* Nhóm lệnh "đánh vần giúp từ..." ──▶ `spell_word` (robot đọc tách từng chữ cái/âm tiết của từ được chỉ định).

### 11.7.4 Giới hạn phạm vi hội thoại (Guardrail)
Robot trong module này **chỉ đóng vai trò trợ lý đọc chính tả**, không phải chatbot tự do. Dialog Manager cần giới hạn: nếu câu nói không khớp bất kỳ intent điều khiển đọc nào, robot phản hồi trung lập kiểu "Con muốn cô đọc tiếp hay đọc lại nhé?" thay vì chuyển sang trò chuyện mở, để tránh lệch trọng tâm giờ học và tránh rủi ro nội dung không phù hợp lứa tuổi tiểu học.

### 11.7.5 Cơ chế Tra cứu Ngữ liệu SGK & Soạn trước qua MCP Tool (Passage Retrieval / RAG)
Để giải quyết bài toán chống ảo giác (Hallucination) và đảm bảo chuẩn 100% ngữ pháp sách giáo khoa, hệ thống cung cấp công cụ MCP Tool cho LLM:

* **Tên Tool**: `vihand.search_dictation_passage`
* **Mô tả Tool**: Tra cứu đoạn văn hoặc bài thơ trong kho dữ liệu SGK hoặc bài giáo viên soạn trước.
* **Quy trình thực thi**:
  ```text
  [Giáo viên: "Alexa, đọc bài 'Ai có lỗi' lớp 3"]
                         │
                         ▼
  [LLM nhận diện Intent search_passage]
                         │
                         ▼
  [Gọi Tool: vihand.search_dictation_passage(query="Ai có lỗi", grade=3)]
                         │
                         ▼
  [Bridge Service gọi API: GET /api/xiaozhi/passages/search]
                         │
                         ▼
  [Database trả về toàn văn đoạn văn chuẩn + Tác giả + Số câu]
                         │
                         ▼
  [Robot phản hồi: "Em đã tìm thấy bài 'Ai có lỗi' trong SGK Tiếng Việt 3... Sau đây em xin đọc..."]
  ```

---

---

## 11.8 Cơ Chế Chấm Điểm Đối Chiếu Văn Bản Chuẩn (Ground-Truth Guided Grading Pipeline)

Đây là tính năng cốt lõi khép kín vòng đời dữ liệu từ **Tiền kỳ (Robot Xiaozhi đọc chính tả)** đến **Hậu kỳ (ViHand Grade chấm điểm bài viết tay)**. Thay vì để mô hình AI tự suy đoán văn bản sửa lỗi (Unsupervised Correction), hệ thống sử dụng trực tiếp đoạn văn chuẩn từ phiên đọc của Xiaozhi làm **Đáp án chuẩn (Ground Truth)** để so khớp và tính điểm.

```text
┌────────────────────────────────────────────────────────────────────────┐
│ BƯỚC 1: TIỀN KỲ — ROBOT XIAOZHI ĐỌC CHÍNH TẢ & LƯU PHIÊN               │
│                                                                        │
│  Robot đọc bài "Hạt gạo làng ta" cho lớp 3A1 ──▶ Lưu Database         │
│  Bản ghi: DictationSession (id: "sess_101", passage: "Hạt gạo...")    │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Liên kết dữ liệu qua Session ID
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ BƯỚC 2: HẬU KỲ — GIÁO VIÊN CHẤM BÀI TRÊN WEB APP (/teacher/grade)      │
│                                                                        │
│  1. Giáo viên chọn bài mẫu: [ Hạt gạo làng ta - Lớp 3A1 - 21/08 ]      │
│  2. Chụp/Upload ảnh vở viết tay của học sinh (Em Nguyễn Văn A)         │
│  3. OCR Gemini Vision trích xuất: original_text = "Hạt gao nàn ta..."  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Đẩy vào Engine So Khớp Chính Tả
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ BƯỚC 3: THUẬT TOÁN SO KHỚP CHÍNH TẢ VỚI GROUND TRUTH (Word Alignment) │
│                                                                        │
│  [Học sinh viết (OCR)]   :  "Hạt   gao    nàn    ta,  có  vị  phù  xa" │
│  [Đáp án chuẩn (Xiaozhi)]:  "Hạt   gạo    làng   ta,  có  vị  phù  sa" │
│                               ▲      ▲      ▲                    ▲     │
│  Phân loại lỗi tự động:       │      │      │                    │     │
│  • "gao" ──▶ "gạo"   : Sai dấu thanh (dau_thanh)          ──▶ -0.5đ    │
│  • "nàn" ──▶ "làng"  : Sai phụ âm đầu n/l + vần (van)     ──▶ -0.5đ    │
│  • "xa"  ──▶ "sa"    : Sai phụ âm đầu s/x (phu_am_dau)    ──▶ -0.5đ    │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Tính điểm theo Barem Bộ GD&ĐT
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ BƯỚC 4: XUẤT BẢNG ĐIỂM CHI TIẾT & LƯU DATABASE (Bảng Grade)            │
│                                                                        │
│  • Điểm Chính tả : 4.0 - 1.5 = 2.5 / 4.0đ (3 lỗi)                      │
│  • Điểm Hình thức: 2.5 / 3.0đ | Nội dung: 2.0 / 2.0đ | Sáng tạo: 0.5đ │
│  👉 TỔNG ĐIỂM: 7.5 / 10.0đ (Xếp loại: Khá 👍)                         │
│  🔗 Ghi nhận: Grade.dictationSessionId = "sess_101"                    │
└────────────────────────────────────────────────────────────────────────┘
```

### 11.8.1 So sánh: Chấm Tự Do (AI Heuristic) vs Chấm Có Ground Truth (Xiaozhi)

| Tiêu chí so sánh | Phương pháp 1: Chấm Tự Do (AI Dự Đoán) | Phương pháp 2: Chấm Theo Ground Truth Xiaozhi |
| :--- | :--- | :--- |
| **Nguồn văn bản sửa** | Mô hình AI (ViT5/Gemini) **tự suy đoán** xem học sinh định viết gì. | **Lấy nguyên văn 100%** từ đoạn văn/thơ Xiaozhi đã đọc và lưu trong DB. |
| **Rủi ro ảo giác (Hallucination)** | Có thể xảy ra nếu học sinh viết sai quá nặng, viết thiếu câu hoặc chữ viết quá xấu. | **Triệt tiêu 100% ảo giác (Zero-Hallucination)**, văn bản sửa luôn chuẩn mực tuyệt đối. |
| **Độ chính xác bắt lỗi** | Đạt ~85–90% tùy vào chất lượng mô hình ngôn ngữ. | **Đạt 100% độ chính xác đối chiếu** theo đúng đáp án bài học. |
| **Tốc độ xử lý (Latency)** | 5 – 10 giây (cần thời gian chạy Seq2Seq ViT5 hoặc gọi LLM Cloud). | **< 0.5 giây** (chỉ chạy thuật toán so khớp chuỗi tại chỗ, không cần gọi LLM sửa văn bản). |
| **Tính khép kín sư phạm** | Rời rạc: Khâu dạy đọc và khâu chấm bài là 2 quá trình riêng biệt. | **Khép kín 100%**: Bài robot đọc trên lớp trở thành thước đo trực tiếp để chấm bài tập chép. |

---

### 11.8.2 Thuật toán Căn Chỉnh Từ & Phân Loại Lỗi (Word Alignment & Error Classification)

Khi nhận được cặp văn bản: `original_text` (từ OCR) và `ground_truth_text` (từ Xiaozhi), hệ thống thực hiện pipeline xử lý 3 bước:

#### Bước 1: Chuẩn hóa & Tách từ (Tokenization)
Tách hai chuỗi văn bản thành mảng các từ (tokens), loại bỏ khoảng trắng thừa nhưng giữ nguyên dấu câu để kiểm tra lỗi ngắt câu:
* $T_{ocr} = [w_1^{ocr}, w_2^{ocr}, ..., w_n^{ocr}]$
* $T_{gt} = [w_1^{gt}, w_2^{gt}, ..., w_m^{gt}]$

#### Bước 2: Căn chỉnh chuỗi từ (Sequence Alignment via Dynamic Programming)
Sử dụng thuật toán căn chỉnh chuỗi tối ưu (Needleman-Wunsch / Levenshtein ở cấp độ từ) để tìm ra đường căn chỉnh có chi phí biến đổi nhỏ nhất giữa bài viết của học sinh và bài chuẩn.

#### Bước 3: Phân loại lỗi tự động 6 nhóm (Error Categorization)
Đối với mỗi cặp từ sai lệch $(w_i^{ocr}, w_j^{gt})$, bộ quy tắc chuyên gia tiếng Việt tự động gắn nhãn:
1. `phu_am_dau`: Nhầm lẫn các cặp phụ âm đầu địa phương ($c/k/q$, $g/gh$, $ng/ngh$, $d/gi/r$, $s/x$, $ch/tr$, $l/n$).
2. `van`: Sai phần vần ($an/ang$, $en/eng$, $iên/iêng$, $uôn/uông$, $ăt/ăc$, $ươn/ương$).
3. `dau_thanh`: Sai dấu hỏi/ngã, sắc/nặng, huyền/không dấu ($vả \leftrightarrow vã$, $ngả \leftrightarrow ngã$).
4. `viet_hoa`: Quên viết hoa chữ cái đầu câu, tên người ($hà nội \rightarrow Hà\ Nội$).
5. `bo_sot_them`: Học sinh chép thiếu từ (do nghe không kịp) hoặc viết lặp lại từ.
6. `dau_cau`: Thiếu hoặc sai dấu chấm, dấu phẩy, dấu chấm hỏi.

---

### 11.8.3 Barem Chấm Điểm Chính Tả Tự Động (Scoring Matrix)

Điểm tổng thể được tính theo thang điểm 10 chuẩn mực giáo dục tiểu học Việt Nam:

$$\text{Tổng điểm} = S_{\text{chính tả}} + S_{\text{hình thức}} + S_{\text{nội dung}} + S_{\text{sáng tạo}}$$

Trong đó:
* **$S_{\text{chính tả}}$ (Tối đa 4.0 điểm)**:
  * Điểm ban đầu: $4.0$ điểm.
  * Lớp 1 – 3: Mỗi lỗi chính tả khác nhau trừ $0.5$ điểm (các lỗi lặp lại cùng một từ chỉ trừ 1 lần).
  * Lớp 4 – 5: Mỗi lỗi chính tả trừ $0.25$ – $0.5$ điểm.
  * Bỏ sót từ / thiếu câu: Trừ $0.5$ điểm/cụm từ thiếu.
  * Điểm sàn tối thiểu: $0.0$ điểm (không có điểm âm).
* **$S_{\text{hình thức}}$ (Tối đa 3.0 điểm)**: Đánh giá độ sạch đẹp, nét chữ đều, đúng lề vở ô ly (giáo viên có thể điều chỉnh qua thanh trượt Slider trên Web).
* **$S_{\text{nội dung}}$ (Tối đa 2.0 điểm)**: Đánh giá độ đầy đủ của đoạn văn chép.
* **$S_{\text{sáng tạo}}$ (Tối đa 1.0 điểm)**: Điểm cộng khuyến khích trình bày sáng tạo/tiến bộ.

---

### 11.8.4 Tích hợp Giao Diện & API Chấm Điểm

#### Giao diện Giáo viên (`app/teacher/grade/page.tsx`):
1. **Dropdown chọn bài đọc**: Giáo viên mở dropdown *"Bài đọc mẫu"* ➔ Danh sách các phiên đọc Xiaozhi đã thực hiện gần đây (hiển thị kèm Ngày đọc, Tên bài, Lớp học).
2. **Hiển thị song song**: 
   * Cột trái: Ảnh gốc bài viết tay + Lớp phủ văn bản OCR.
   * Cột phải: Văn bản chuẩn của Xiaozhi với các từ sai được **highlight màu sắc trực quan** (Đỏ: phụ âm, Cam: vần, Tím: dấu thanh, Hồng: bỏ sót).

#### Cập nhật API Chấm Điểm (`POST /api/grade`):
* **Payload Request**:
  ```json
  {
    "image": "data:image/jpeg;base64,...",
    "dictationSessionId": "sess_101",
    "groundTruthText": "Hạt gạo làng ta, có vị phù sa của sông Kinh Thầy...",
    "studentName": "Nguyễn Văn A",
    "className": "3A1",
    "gradeLevel": 3
  }
  ```
* **Luồng xử lý tại Backend**:
  * Nếu có `groundTruthText`: Bỏ qua ViT5/LLM, gán `fixed_text = groundTruthText` và chạy hàm `calculateLevenshteinMetrics(originalText, groundTruthText)`.
  * Nếu không có `groundTruthText`: Chạy luồng AI Fallback tự động sửa như cũ.

---

### 11.8.5 Thống Kê & Báo Cáo Phân Tích Lớp Học (Session Analytics)

Nhờ liên kết `Grade.dictationSessionId`, hệ thống cung cấp màn hình Báo cáo Tổng kết Phiên đọc (`/teacher/dictation/analytics/[sessionId]`):
* **Tỷ lệ lỗi phổ biến toàn lớp**: Thống kê từ nào trong bài đọc bị học sinh viết sai nhiều nhất (VD: 80% lớp viết đúng từ *"phù sa"*, nhưng 20% lớp nhầm thành *"phù xa"*).
* **Biểu đồ phân bố điểm số**: Biểu đồ hình cột thể hiện số học sinh đạt Xuất sắc, Tốt, Khá, Trung bình trong bài chính tả đó.
* **Cảnh báo lỗi phương ngữ**: Tự động gợi ý giáo viên các âm vần cần luyện tập thêm cho lớp trong các tiết học tiếp theo.

---

## 11.9 Lựa chọn công nghệ ASR/TTS tiếng Việt

Vì đối tượng là học sinh tiểu học và nội dung đọc chính tả cần **phát âm chuẩn, tốc độ điều chỉnh được**, khuyến nghị **không dùng giọng TTS mặc định** đi kèm firmware gốc (thường tối ưu cho tiếng Trung/Anh) mà tích hợp một dịch vụ TTS tiếng Việt chuyên biệt ở tầng Bridge Service, tương tự cách hệ thống hiện tại đã tách riêng lựa chọn OCR (Gemini) và NLP sửa lỗi (ViT5) làm hai thành phần độc lập. Việc chọn nhà cung cấp TTS/ASR tiếng Việt cụ thể (ví dụ dịch vụ cloud có API tiếng Việt, hoặc mô hình mã nguồn mở chạy cục bộ) cần được khảo sát riêng dựa trên tiêu chí độ trễ, chất lượng phát âm có dấu, và chi phí vận hành — nằm ngoài phạm vi đặc tả kiến trúc này.

**Yêu cầu kỹ thuật tối thiểu cho TTS:**
* Hỗ trợ điều chỉnh tốc độ đọc (0.5× – 1.2×) và có thể ngắt câu tại dấu câu tiếng Việt.
* Phát âm đúng dấu thanh — cùng mối quan tâm chất lượng đã đặt ra với OCR ở Module 2 của hệ thống gốc.

**Yêu cầu kỹ thuật tối thiểu cho ASR (nhận lệnh thoại):**
* Độ trễ nhận dạng câu lệnh ngắn (< 2 giây) để không làm gián đoạn nhịp đọc chính tả.
* Không cần nhận dạng câu dài phức tạp — chỉ cần độ chính xác cao với tập từ khoá lệnh điều khiển cố định (mục 11.7.3), có thể áp dụng kỹ thuật giới hạn từ vựng (keyword-biased ASR) để tăng độ chính xác thay vì ASR tổng quát.

---

## 11.10 Bảo mật & Quyền riêng tư

* Kết nối WebSocket giữa robot và Bridge Service cần xác thực bằng `deviceCode` + token cấp khi ghép nối (pairing), tránh robot lạ giả mạo kết nối vào lớp học.
* Vì hội thoại có thể ghi nhận giọng nói học sinh (trẻ em), mặc định **chỉ lưu bản text đã chuyển đổi (transcript)**, không lưu file âm thanh gốc (`audioUrl` để trống) trừ khi giáo viên bật tuỳ chọn lưu âm thanh phục vụ mục đích sư phạm cụ thể — cần có sự đồng ý/thông báo tới phụ huynh theo quy định bảo vệ dữ liệu trẻ em hiện hành.
* Dữ liệu `ConversationLog` áp dụng cùng chính sách phân quyền như bảng `Grade`: chỉ giáo viên chủ nhiệm lớp và Admin được truy vấn.

---

## 11.11 Quản lý rủi ro bổ sung

| Tình huống rủi ro | Xác suất | Tác động | Giải pháp xử lý dự phòng |
| :--- | :---: | :---: | :--- |
| **Robot mất kết nối WiFi giữa phiên đọc** | Trung bình | Cao | Bridge Service lưu `currentLine` liên tục; khi robot kết nối lại trong vòng 5 phút, tự động khôi phục đúng vị trí đọc (trạng thái `paused` → `resume`). Quá 5 phút, phiên chuyển `cancelled` và giáo viên có thể tạo phiên mới tiếp tục từ câu đã dừng. |
| **ASR nhận sai lệnh thoại do ồn lớp học** | Cao | Trung bình | Ưu tiên hiển thị nút điều khiển thủ công trên Web app (`/api/xiaozhi/sessions/{id}/control`) làm phương án chính; lệnh thoại là hỗ trợ bổ sung, không bắt buộc. |
| **TTS đọc sai dấu thanh với từ hiếm/địa phương** | Trung bình | Trung bình | Cho phép giáo viên nghe thử (preview) toàn bộ `DictationPassage` trước khi dùng cho lớp, chỉnh sửa thủ công cách ngắt câu nếu cần trước khi lưu vào thư viện. |
| **Nhiều robot cùng lúc trong một trường gây quá tải Bridge Service** | Thấp | Trung bình | Thiết kế Bridge Service dạng stateless theo phiên (session state lưu ở DB, không lưu in-memory), cho phép chạy nhiều instance phía sau load balancer khi mở rộng quy mô. |

---

## 11.12 Hướng dẫn Kỹ thuật & Danh mục Tài liệu Tham khảo (Quick References & Guides)

Để thuận tiện cho việc phát triển, cấu hình và tự xây dựng hệ thống server thay thế `xiaozhi.me`, dưới đây là danh mục toàn bộ tài liệu hướng dẫn và mã nguồn liên quan trong dự án:

### 11.12.1 Bộ Tài Liệu Kỹ Thuật Đã Dịch Chi Tiết Sang Tiếng Việt (Khuyến Nghị Đọc)
Toàn bộ các tài liệu giao thức và cấu hình phần cứng gốc của Xiaozhi đã được dịch, chú giải và tổ chức trong thư mục:
📂 **[`01_Bao_cao_Nghien_cuu/Tai_lieu_Bao_cao/Tai_lieu_Ky_thuat_Xiaozhi_Dich/`](file:///c:/Users/Jackie%20Duong/Desktop/Web_sua_loi/01_Bao_cao_Nghien_cuu/Tai_lieu_Bao_cao/Tai_lieu_Ky_thuat_Xiaozhi_Dich/README_Tong_quan_Tai_lieu_Dich.md)**

* 📄 **[`01_Giao_thuc_Truyen_thong_WebSocket.md`](file:///c:/Users/Jackie%20Duong/Desktop/Web_sua_loi/01_Bao_cao_Nghien_cuu/Tai_lieu_Bao_cao/Tai_lieu_Ky_thuat_Xiaozhi_Dich/01_Giao_thuc_Truyen_thong_WebSocket.md)**: Hướng dẫn bắt tay kết nối `hello`, streaming âm thanh nhị phân Opus 16kHz/24kHz, cấu trúc gói JSON STT/TTS, ngắt lời `abort`, máy trạng thái State Machine.
* 📄 **[`02_Giao_thuc_Tuong_tac_MCP.md`](file:///c:/Users/Jackie%20Duong/Desktop/Web_sua_loi/01_Bao_cao_Nghien_cuu/Tai_lieu_Bao_cao/Tai_lieu_Ky_thuat_Xiaozhi_Dich/02_Giao_thuc_Tuong_tac_MCP.md)**: Đặc tả quy chuẩn JSON-RPC 2.0 cho MCP, các phương thức `initialize`, `tools/list`, `tools/call`, thông báo `notifications`.
* 📄 **[`03_Huong_dan_Su_dung_MCP_Dieu_khien_IoT.md`](file:///c:/Users/Jackie%20Duong/Desktop/Web_sua_loi/01_Bao_cao_Nghien_cuu/Tai_lieu_Bao_cao/Tai_lieu_Ky_thuat_Xiaozhi_Dich/03_Huong_dan_Su_dung_MCP_Dieu_khien_IoT.md)**: Hướng dẫn viết code C++ đăng ký Tool trên ESP32, các công cụ phần cứng tích hợp sẵn.
* 📄 **[`04_Huong_dan_Thiet_ke_Phan_cung_Custom_Board.md`](file:///c:/Users/Jackie%20Duong/Desktop/Web_sua_loi/01_Bao_cao_Nghien_cuu/Tai_lieu_Bao_cao/Tai_lieu_Ky_thuat_Xiaozhi_Dich/04_Huong_dan_Thiet_ke_Phan_cung_Custom_Board.md)**: Sơ đồ đấu nối và gán chân GPIO cho phần cứng ESP32-S3 (Mic I2S, Loa I2S, Màn hình LCD ST7789 SPI, Nút nhấn, Flash 16MB).
* 📄 **[`05_Giao_thuc_MQTT_UDP_Thay_the.md`](file:///c:/Users/Jackie%20Duong/Desktop/Web_sua_loi/01_Bao_cao_Nghien_cuu/Tai_lieu_Bao_cao/Tai_lieu_Ky_thuat_Xiaozhi_Dich/05_Giao_thuc_MQTT_UDP_Thay_the.md)**: Giao thức MQTT + UDP truyền âm thanh mã hóa AES-CTR độ trễ thấp.
* 📄 **[`06_Cau_hinh_WiFi_BluFi.md`](file:///c:/Users/Jackie%20Duong/Desktop/Web_sua_loi/01_Bao_cao_Nghien_cuu/Tai_lieu_Bao_cao/Tai_lieu_Ky_thuat_Xiaozhi_Dich/06_Cau_hinh_WiFi_BluFi.md)**: Cấu hình mạng Wi-Fi trường học cho Robot qua Bluetooth BLE trên điện thoại.

### 11.12.2 Tài liệu Thiết kế, Lưu đồ & Gỡ lỗi (ViHand Grade)
* 📖 **[`01_Bao_cao_Nghien_cuu/Tai_lieu_Bao_cao/MCP_02_Thiet_ke_Hien_thuc.md`](file:///c:/Users/Jackie%20Duong/Desktop/Web_sua_loi/01_Bao_cao_Nghien_cuu/Tai_lieu_Bao_cao/MCP_02_Thiet_ke_Hien_thuc.md)**: Hướng dẫn chi tiết thiết kế mã nguồn Server Python, cấu hình file `.env`, nạp Role Prompt "Alexa Sư phạm" và định nghĩa các Tools lưu trữ bài đọc.
* 📖 **[`01_Bao_cao_Nghien_cuu/Tai_lieu_Bao_cao/MCP_01_Ly_thuyet_Tong_quan.md`](file:///c:/Users/Jackie%20Duong/Desktop/Web_sua_loi/01_Bao_cao_Nghien_cuu/Tai_lieu_Bao_cao/MCP_01_Ly_thuyet_Tong_quan.md)**: Tổng quan lý thuyết về giao thức MCP và kiến trúc cầu nối AI giọng nói với Web App.
* 📖 **[`01_Bao_cao_Nghien_cuu/Tai_lieu_Bao_cao/MCP_03_FAQ_Go_loi.md`](file:///c:/Users/Jackie%20Duong/Desktop/Web_sua_loi/01_Bao_cao_Nghien_cuu/Tai_lieu_Bao_cao/MCP_03_FAQ_Go_loi.md)**: Hướng dẫn gỡ lỗi (troubleshooting) thường gặp: lỗi ngắt kết nối WebSocket, lỗi gọi API Next.js, timeout...
* 📖 **[`01_Bao_cao_Nghien_cuu/Luudo_Xiaozhi_MCP.md`](file:///c:/Users/Jackie%20Duong/Desktop/Web_sua_loi/01_Bao_cao_Nghien_cuu/Luudo_Xiaozhi_MCP.md)**: Toàn bộ lưu đồ giải thuật và sơ đồ khối mô tả luồng dữ liệu tương tác giữa Giáo viên ↔ ESP32 ↔ Local Server ↔ SQLite DB.

### 11.12.3 Vị trí Mã nguồn & Scripts triển khai trong Codebase
* 💻 **Mã nguồn MCP Server (Python)**: [`mcp_service/main.py`](file:///c:/Users/Jackie%20Duong/Desktop/Web_sua_loi/mcp_service/main.py) — Server FastAPI/WebSocket chạy trên cổng `8200`.
* 💻 **Script Triển khai & Cài đặt tự động**:
  * [`mcp_service/install_service.sh`](file:///c:/Users/Jackie%20Duong/Desktop/Web_sua_loi/mcp_service/install_service.sh) — Đăng ký MCP Server thành systemd service chạy nền trên Linux/Raspberry Pi.
  * [`mcp_service/setup_rpi.sh`](file:///c:/Users/Jackie%20Duong/Desktop/Web_sua_loi/mcp_service/setup_rpi.sh) — Cài đặt môi trường Python venv và thư viện phụ thuộc trên Raspberry Pi.
  * [`start_all.bat`](file:///c:/Users/Jackie%20Duong/Desktop/Web_sua_loi/start_all.bat) — Script khởi động đồng thời cả 3 dịch vụ trên Windows: Next.js (3000), Python ViT5 (8000), và MCP Server (8200).
* 💻 **API Next.js Core & Giao diện Dashboard**:
  * [`app/api/dictation/sessions/route.ts`](file:///c:/Users/Jackie%20Duong/Desktop/Web_sua_loi/app/api/dictation/sessions/route.ts) — Endpoint REST tiếp nhận và lưu trữ phiên đọc chính tả.
  * [`app/teacher/dictation/page.tsx`](file:///c:/Users/Jackie%20Duong/Desktop/Web_sua_loi/app/teacher/dictation/page.tsx) — Giao diện Web cho giáo viên theo dõi lịch sử và quản lý nội dung bài đọc.

---

*Tài liệu này là bản đề xuất mở rộng (v1.3.0-draft) cho ViHand Grade, mô tả kiến trúc tích hợp robot Xiaozhi AI Chatbot làm trợ lý đọc chính tả. Cần rà soát cùng đội kỹ thuật phần cứng trước khi triển khai thực tế, đặc biệt ở khâu lựa chọn nhà cung cấp ASR/TTS tiếng Việt cụ thể.*
