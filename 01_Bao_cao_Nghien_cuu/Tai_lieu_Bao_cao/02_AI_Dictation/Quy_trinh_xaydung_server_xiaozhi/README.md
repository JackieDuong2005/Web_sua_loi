# 🤖 HƯỚNG DẪN QUY TRÌNH XÂY DỰNG SERVER XIAOZHI & TÍCH HỢP VIHAND GRADE (PHƯƠNG ÁN A)

> **Tài liệu Kỹ thuật & Hướng dẫn Thực thi Đề tài Nghiên cứu Khoa học**  
> **Hệ thống:** ViHand Grade — Chấm điểm chính tả tiếng Việt viết tay & Trợ lý đọc chính tả Robot ESP32  
> **Phiên bản:** `v1.3.0 - Option A (Native Lightweight Integration)`  
> **Ngày cập nhật:** 25/08/2026  

---

# 📑 MỤC LỤC

- [PHẦN 1: NHỮNG THỨ CẦN BIẾT & NGUYÊN LÝ HOẠT ĐỘNG](#-phần-1-những-thứ-cần-biết--nguyên-lý-hoạt-động)
  - [1.1. Bối cảnh & Triết lý Thiết kế Phương án A](#11-bối-cảnh--triết-lý-thiết-kế-phương-án-a)
  - [1.2. Yêu cầu Phần cứng Robot (Hardware BOM)](#12-yêu-cầu-phần-cứng-robot-hardware-bom)
  - [1.3. Sơ đồ Mạch & Pinout Đấu nối ESP32-S3](#13-sơ-đồ-mạch--pinout-đấu-nối-esp32-s3)
  - [1.4. Nguyên lý Giao tiếp WebSocket & Đóng gói Âm thanh 2 Chiều](#14-nguyên-lý-giao-tiếp-websocket--đóng-gói-âm-thanh-2-chiều)
  - [1.5. Pipeline Xử lý AI Thời gian thực (VAD - ASR - LLM - TTS)](#15-pipeline-xử-lý-ai-thời-gian-thực-vad---asr---llm---tts)
  - [1.6. Cơ chế MCP Tool & Đồng bộ Ground Truth Sang Module Chấm Bài](#16-cơ-chế-mcp-tool--đồng-bộ-ground-truth-sang-module-chấm-bài)
  - [1.7. So sánh Kỹ thuật: Phương án A vs. Full Stack Gốc](#17-so-sánh-kỹ-thuật-phương-án-a-vs-full-stack-gốc)
- [PHẦN 2: CÁC BƯỚC THỰC HIỆN CHI TIẾT (4 GIAI ĐOẠN)](#-phần-2-các-bước-thực-hiện-chi-tiết-4-giai-đoạn)
  - [GIAI ĐOẠN 1: Mở rộng Database SQLite & Xây dựng REST API (Next.js)](#giai-đoạn-1-mở-rộng-database-sqlite--xây-dựng-rest-api-nextjs)
  - [GIAI ĐOẠN 2: Xây dựng Giao diện Trung tâm Quản trị Xiaozhi Hub trên Web](#giai-đoạn-2-xây-dựng-giao-diện-trung-tâm-quản-trị-xiaozhi-hub-trên-web)
  - [GIAI ĐOẠN 3: Cấu hình Voice Core Server (Python) & Tích hợp Edge-TTS Tiếng Việt](#giai-đoạn-3-cấu-hình-voice-core-server-python--tích-hợp-edge-tts-tiếng-việt)
  - [GIAI ĐOẠN 4: Cấu hình Firmware & Nạp vào Mạch ESP32-S3](#giai-đoạn-4-cấu-hình-firmware--nạp-vào-mạch-esp32-s3)
- [PHẦN 3: XỬ LÝ SỰ CỐ & CÁC LỖI THƯỜNG GẶP (TROUBLESHOOTING)](#-phần-3-xử-lý-sự-cố--các-lỗi-thường-gặp-troubleshooting)

---

# 🧠 PHẦN 1: NHỮNG THỨ CẦN BIẾT & NGUYÊN LÝ HOẠT ĐỘNG

---

## 1.1. Bối cảnh & Triết lý Thiết kế Phương án A

Trong dự án gốc `xiaozhi-esp32-server-main`, hệ sinh thái máy chủ gồm 4 dịch vụ cồng kềnh:
- `manager-api`: Java Spring Boot + Maven (Port 8002).
- `manager-web`: Vue.js 3 + Element Plus (Port 8001).
- `xiaozhi-server`: Python WebSocket AI Gateway (Port 8000/8003).
- Cơ sở dữ liệu: MySQL + Redis Cache.

Nhược điểm của mô hình gốc khi áp dụng vào môi trường trường học Việt Nam và máy chủ biên Raspberry Pi 4:
1. **Tiêu tốn tài nguyên quá mức:** Chiếm hơn 3.5GB - 5GB RAM ở trạng thái chờ, dễ gây sập Raspberry Pi 4 (4GB).
2. **Trải nghiệm phân mảnh:** Giáo viên phải mở 2 trang web khác nhau (một web để chỉnh robot, một web ViHand Grade để chấm bài).
3. **Không liên thông nghiệp vụ:** Robot đọc xong một bài chính tả nhưng không tự chuyển được văn bản đó sang làm đáp án chuẩn (Ground Truth) để chấm ảnh OCR.

**Triết lý của Phương án A (Native Lightweight Integration):**
* Giữ nguyên **Next.js 16 + TypeScript + SQLite (Prisma ORM)** của ViHand Grade làm **Trung tâm Quản trị duy nhất (Unified Console)**.
* Tận dụng lõi **`main/xiaozhi-server` (Python)** làm máy chủ WebSocket streaming âm thanh 2 chiều với ESP32.
* Tích hợp **Edge-TTS tiếng Việt** chất lượng cao chuẩn sư phạm và cơ chế **1-Click Chuyển sang Chấm bài**.

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                               KIẾN TRÚC TỔNG THỂ PHƯƠNG ÁN A                           │
├────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                        │
│   [ROBOT ESP32-S3 THẬT]                                                                │
│   (Mic I2S + Loa I2S + LCD + Firmware xiaozhi-esp32-main)                              │
│            ▲                                                                           │
│            │ WebSocket Song công (Opus Audio 16kHz & JSON State)                       │
│            ▼                                                                           │
│   [XIAOZHI VOICE CORE SERVER (Python Asyncio - Port 8100/8200)]                        │
│   ├── VAD (Silero) ── Phát hiện giọng nói & ngắt câu                                   │
│   ├── ASR (Whisper / SenseVoice / Gemini) ── Chuyển giọng nói thành chữ                │
│   ├── LLM (Gemini 3.1 Flash Lite) ── Kịch bản Sư phạm 3 bước của Alexa                 │
│   ├── TTS (Edge-TTS vi-VN-HoaiMyNeural, rate: -15%) ── Đọc chậm rãi từng câu           │
│   └── MCP / Webhook Client ── Gọi REST API lưu dữ liệu                                 │
│            │                                                                           │
│            │ HTTP REST (JSON)                                                          │
│            ▼                                                                           │
│   [VIHAND GRADE WEB APP & CONSOLE (Next.js 16 - Port 3000)]                            │
│   ├── Bảng điều khiển Quản trị Robot ESP32 (/teacher/xiaozhi)                          │
│   ├── Cấu hình AI Prompts & Giọng đọc TTS                                              │
│   ├── Kho Ngữ liệu Sách Giáo Khoa Tiểu học (Lớp 1-5)                                   │
│   ├── Cơ sở dữ liệu SQLite (vihand.db qua Prisma ORM)                                  │
│   └── 🎯 1-Click Ground Truth ── Chuyển bài đọc sang Module Chấm bài OCR/ViT5          │
│                                                                                        │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 1.2. Yêu cầu Phần cứng Robot (Hardware BOM)

Để robot hoạt động mượt mà, các linh kiện phần cứng được lựa chọn chuẩn công nghiệp nhúng:

| STT | Tên linh kiện | Thông số khuyến nghị | Vai trò trong hệ thống |
| :---: | :--- | :--- | :--- |
| **1** | **Vi điều khiển ESP32-S3** | ESP32-S3-WROOM-1 / DevKitC-1 (**8MB/16MB Octal PSRAM**, 8MB/16MB Flash) | Xử lý nén/giải mã Opus, quản lý Wi-Fi và giao tiếp I2S |
| **2** | **Micro I2S** | **INMP441** (hoặc ES7210 / ICS-43434) | Thu âm thanh giáo viên/học sinh chuẩn 16kHz, 16-bit Mono, độ nhạy cao |
| **3** | **Mạch Amp & DAC I2S** | **MAX98357A** (Class-D Amplifier) | Giải mã I2S sang analog và khuếch đại công suất |
| **4** | **Loa (Speaker)** | Loa 3W – 5W, trở kháng 4Ω hoặc 8Ω, đường kính 40mm – 50mm | Phát âm thanh giọng đọc chính tả to, rõ, không rè |
| **5** | **Màn hình (Tuỳ chọn)** | Màn hình màu ST7789 SPI (1.54 inch hoặc 2.0 inch, 240x240) | Hiển thị biểu cảm robot (Mắt chớp, Đang nghe, Đang đọc) |
| **6** | **Nguồn cấp** | Nguồn USB Type-C 5V – 2A | Đảm bảo nguồn không bị sụt áp khi bật loa âm lượng lớn |

---

## 1.3. Sơ đồ Mạch & Pinout Đấu nối ESP32-S3

```text
       ESP32-S3 DEVKITC-1 (38 PINS)
       ┌───────────────────────────┐
       │ 3V3                   GND ├─── [GND Chung toàn mạch]
       │ EN                    IO1 │
       │ IO4  ─────────────────────┼─── INMP441  (SD / Data Out)
       │ IO5  ─────────────────────┼─── INMP441  (WS / Word Select)
       │ IO6  ─────────────────────┼─── MAX98357 (LRC / Left-Right Clock)
       │ IO7  ─────────────────────┼─── MAX98357 (DIN / Data In)
       │ IO15 ─────────────────────┼─── MAX98357 (BCLK / Bit Clock)
       │ IO18 ─────────────────────┼─── INMP441  (SCK / Serial Clock)
       │ 5V   ─────────────────────┼─── MAX98357 (VIN - Cấp nguồn 5V Loa)
       └───────────────────────────┘

Chi tiết kết nối:
• INMP441  VDD -> 3.3V  | GND -> GND | L/R -> GND (Left Channel)
• MAX98357 VIN -> 5V    | GND -> GND | GAIN -> GND (Mặc định 9dB)
```

---

## 1.4. Nguyên lý Giao tiếp WebSocket & Đóng gói Âm thanh 2 Chiều

1. **Khởi tạo bắt tay (Handshake):**
   * ESP32 kết nối Wi-Fi ➡️ Mở WebSocket tới `ws://<SERVER_IP>:8000/xiaozhi/v1/`.
   * ESP32 gửi gói JSON Hello:
     ```json
     {
       "type": "hello",
       "version": 1,
       "transport": "websocket",
       "audio_params": { "format": "opus", "sample_rate": 16000, "channels": 1, "frame_duration": 60 }
     }
     ```
   * Server trả về JSON xác thực và kích hoạt phiên.

2. **Luồng Thu âm (Uplink - Từ Robot lên Server):**
   * Khi giáo viên/học sinh nói, micro INMP441 thu tín hiệu PCM 16kHz.
   * Bộ mã hoá Opus trên ESP32 đóng gói âm thanh thành các khung nhị phân (Binary Frames) gửi liên tục qua WebSocket.

3. **Luồng Phát âm (Downlink - Từ Server về Robot):**
   * Server sinh giọng đọc TTS ➡️ Mã hoá thành Opus frames ➡️ Bắn về ESP32.
   * ESP32 giải mã Opus sang I2S stream truyền vào mạch MAX98357A để phát ra loa.

4. **Luồng Điều khiển (Control Packets):**
   * Server gửi JSON báo trạng thái: `{"type": "state", "state": "listening" | "thinking" | "speaking"}` để ESP32 đổi biểu cảm trên màn hình LCD.

---

## 1.5. Pipeline Xử lý AI Thời gian thực (VAD - ASR - LLM - TTS)

```text
[Audio Nhị phân] 
       │
       ▼
 1. VAD (Silero-VAD) ──────────> Cắt lọc tạp âm, phát hiện khi nào người nói dừng lại
       │
       ▼
 2. ASR (Speech-to-Text) ──────> Chuyển âm thanh thành câu chữ tiếng Việt
       │
       ▼
 3. LLM (Gemini / Qwen) ───────> Nhận diện ý định, thực thi Quy trình Sư phạm 3 Bước
       │
       ▼
 4. TTS (Edge-TTS Tiếng Việt) ─> Sinh âm thanh giọng Hoài My/Nam Minh (Tốc độ -15%)
       │
       ▼
[Audio Trả về Loa]
```

### Kịch bản Sư phạm 3 Bước của Trợ giảng Alexa:
* **Bước 1 (Xác nhận thông tin):** Khi giáo viên nói *"Alexa, chuẩn bị đọc bài chính tả"*, robot sẽ hỏi lại: *"Dạ, bài đọc hôm nay thuộc khối lớp mấy, chủ đề gì và gồm bao nhiêu câu ạ?"*
* **Bước 2 (Tiến hành đọc):** Đọc to, rõ, ngắt nghỉ sau mỗi cụm từ 2–3 giây để học sinh kịp viết; nhắc nhở học sinh các từ khó dễ nhầm lẫn (ví dụ: *sương sớm* hay *xương cá*).
* **Bước 3 (Tự động lưu trữ):** Sau khi đọc xong, kích hoạt Tool `save_dictation_session` đẩy toàn bộ đoạn văn chuẩn vào ViHand Grade.

---

## 1.6. Cơ chế MCP Tool & Đồng bộ Ground Truth Sang Module Chấm Bài

Thay vì chỉ là một chiếc loa thông minh độc lập, Robot được gắn kết chặt chẽ vào bài toán cốt lõi của ViHand Grade:

$$\text{Robot ESP32 Đọc Bài} \xrightarrow{\text{MCP REST}} \text{SQLite (DictationSession)} \xrightarrow{\text{1-Click}} \text{Module Chấm Điểm (OCR + ViT5)}$$

* Khi Robot đọc xong: Một bản ghi `DictationSession` được tạo kèm `passage` (đoạn văn chuẩn 100%).
* Trên Web ViHand Grade: Giáo viên bấm **"Mở phiên chấm cho lớp này"** ➡️ Hệ thống chuyển ngay sang trang `/teacher/grade`, điền sẵn đoạn văn gốc làm **Barem Ground Truth**.
* Khi tải ảnh bài viết tay của học sinh lên: Hệ thống OCR bài học sinh và đối chiếu từng ký tự với đoạn văn mà Robot đã đọc để tính điểm chính tả tự động.

---

## 1.7. So sánh Kỹ thuật: Phương án A vs. Full Stack Gốc

| Tiêu chí so sánh | Full Stack Gốc (`xiaozhi-esp32-server`) | **Phương án A (Tích hợp ViHand Grade)** |
| :--- | :--- | :--- |
| **Công nghệ Backend** | Java Spring Boot + Python + Vue.js | **Next.js 16 (React 19) + TypeScript + Python** |
| **Cơ sở dữ liệu** | MySQL + Redis (Cần cấu hình tài khoản, port riêng) | **SQLite nhẹ nhàng qua Prisma ORM (Tất cả trong 1 file `vihand.db`)** |
| **RAM tiêu thụ** | **~3.5GB – 5.0GB RAM** | **~700MB – 1.2GB RAM** (Tiết kiệm > 70% RAM) |
| **Khả năng chạy trên Raspberry Pi 4** | ❌ Quá tải, nghẽn RAM | ✅ **Hoạt động trơn tru 100%** |
| **Khởi động hệ thống** | Phức tạp (Cần bật 4 terminal riêng rẽ) | Đơn giản (**1 cú click vào `start_all.bat`**) |
| **Tối ưu tiếng Việt** | Giọng đọc TTS Trung Quốc/Quốc tế thô cứng | **Edge-TTS tiếng Việt mượt mà, điều chỉnh tốc độ sư phạm** |
| **Liên thông chấm bài** | Không có (Hoạt động cô lập) | **Tự động liên thông 100% với OCR và ViT5 Grader** |

---

# 🛠️ PHẦN 2: CÁC BƯỚC THỰC HIỆN CHI TIẾT (4 GIAI ĐOẠN)

---

## 🟢 GIAI ĐOẠN 1: Mở rộng Database SQLite & Xây dựng REST API (Next.js)

### Bước 1.1: Cập nhật `prisma/schema.prisma`
Mở file [prisma/schema.prisma](file:///c:/Users/Jackie%20Duong/Desktop/Web_sua_loi/prisma/schema.prisma) và thêm các model sau:

```prisma
// ============================================================
// Module Xiaozhi — Quản lý Thiết bị ESP32 & Kho Ngữ liệu SGK
// ============================================================

model RobotDevice {
  id          String   @id @default(cuid())
  macAddress  String   @unique
  name        String   @default("Robot Trợ Giảng Lớp Học")
  ipAddress   String   @default("")
  className   String   @default("")        // Gắn với lớp học cụ thể (VD: "3A")
  isOnline    Boolean  @default(false)
  volume      Int      @default(80)        // Âm lượng 0 - 100
  voiceName   String   @default("vi-VN-HoaiMyNeural")
  speedRate   String   @default("-15%")    // Tốc độ đọc
  lastSeen    DateTime @default(now())
  createdAt   DateTime @default(now())
}

model TextbookPassage {
  id             String   @id @default(cuid())
  gradeLevel     Int      @default(3)        // Khối lớp 1, 2, 3, 4, 5
  bookSet        String   @default("KetNoi") // "KetNoi" | "CanhDieu" | "ChanTroi"
  unit           String   @default("Tuần 1")
  title          String                      // Tiêu đề (VD: "Ai có lỗi")
  content        String                      // Đoạn văn chính tả
  difficultWords String   @default("")       // Các từ khó ghi nhớ
  createdAt      DateTime @default(now())
}
```

### Bước 1.2: Đồng bộ Schema vào SQLite
Chạy lệnh trong PowerShell:
```bash
npx prisma db push
```

### Bước 1.3: Tạo các API Endpoints trong `app/api/xiaozhi/`

1. **API Quản lý Thiết bị (`app/api/xiaozhi/devices/route.ts`):**
   * `GET`: Lấy danh sách các mạch ESP32 và trạng thái Online.
   * `POST`: Đăng ký thiết bị mới hoặc cập nhật heartbeat từ ESP32.
2. **API Cấu hình Voice & Prompt (`app/api/xiaozhi/config/route.ts`):**
   * `GET`/`PUT`: Lấy và lưu cài đặt giọng đọc (Hoài My / Nam Minh), tốc độ, System Prompt của giáo viên.
3. **API Kho Ngữ liệu SGK (`app/api/xiaozhi/passages/route.ts`):**
   * `GET`: Lấy danh sách bài đọc theo Lớp / Bộ sách.
   * `POST`: Thêm bài đọc mới vào kho.

---

## 🟢 GIAI ĐOẠN 2: Xây dựng Giao diện Trung tâm Quản trị Xiaozhi Hub trên Web

### Bước 2.1: Tạo Trang Giao diện `app/teacher/xiaozhi/page.tsx`
Xây dựng giao diện Dashboard chuyên nghiệp với 4 tab chính:

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ 🤖 TRUNG TÂM QUẢN TRỊ ROBOT TRỢ GIẢNG XIAOZHI                                         │
├───────────────────┬────────────────────┬────────────────────┬──────────────────────────┤
│ 📡 THIẾT BỊ ESP32  │ ⚙️ CẤU HÌNH AI     │ 📚 KHO BÀI ĐỌC SGK │ 📜 PHIÊN ĐỌC & CHẤM BÀI  │
├───────────────────┴────────────────────┴────────────────────┴──────────────────────────┤
│                                                                                        │
│  [Card: Robot Lớp 3A]   Trạng thái: 🟢 ONLINE   IP: 192.168.1.45   MAC: 48:E7:29:...   │
│  • Âm lượng loa: [──────●─────] 80%                                                    │
│  • Giọng đọc: [vi-VN-HoaiMyNeural (Nữ) ▼]    Tốc độ: [-15% (Chuẩn chính tả) ▼]        │
│                                                                                        │
│  ───────────────────────────────────────────────────────────────────────────────────  │
│  [Danh sách bài đọc vừa hoàn thành]                                                    │
│  • Bài: "Ai có lỗi" — Lớp 3A — 15:30 Hôm nay                                           │
│    Đoạn văn: "Cơn giận lắng xuống. Tôi bắt đầu thấy hối hận..."                        │
│    [ nút: 🎯 MỞ PHIÊN CHẤM ĐIỂM CHO BÀI NÀY ] ──> Tự động chuyển sang /teacher/grade   │
│                                                                                        │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### Bước 2.2: Tích hợp vào Menu Sidebar Giáo viên
Cập nhật file [components/teacher-sidebar.tsx](file:///c:/Users/Jackie%20Duong/Desktop/Web_sua_loi/components) để thêm mục:
* **Icon:** `Bot` hoặc `Radio`
* **Tên menu:** *Trợ lý Robot Xiaozhi*
* **Đường dẫn:** `/teacher/xiaozhi`

---

## 🟢 GIAI ĐOẠN 3: Cấu hình Voice Core Server (Python) & Tích hợp Edge-TTS Tiếng Việt

### Bước 3.1: Chuẩn bị Thư mục Python Server
Sử dụng mã nguồn tại `xiaozhi-esp32-server-main/main/xiaozhi-server/` hoặc tích hợp vào `mcp_service/`.

Cài đặt các thư viện cần thiết:
```bash
pip install websockets fastapi uvicorn edge-tts pydantic httpx pyyaml silero-vad
```

### Bước 3.2: Cấu hình `config.yaml` cho Tiếng Việt
Thiết lập các thông số trong `config.yaml`:
```yaml
server:
  port: 8000
  auth_key: "vihandgrade_secret_key"

# Bộ phát hiện giọng nói
vad:
  provider: "silero"
  threshold: 0.5
  min_silence_duration_ms: 800

# Nhận dạng giọng nói (ASR)
asr:
  provider: "gemini" # hoặc SenseVoiceSmall / Whisper

# Mô hình ngôn ngữ lớn (LLM)
llm:
  provider: "gemini"
  model: "gemini-3.1-flash-lite"
  temperature: 0.3

# Tổng hợp giọng nói Tiếng Việt (TTS)
tts:
  provider: "edge_tts"
  voice: "vi-VN-HoaiMyNeural" # Hoặc vi-VN-NamMinhNeural
  rate: "-15%"
  volume: "+0%"

# Tích hợp MCP Tool về Web ViHand Grade
mcp:
  endpoint_url: "http://localhost:3000/api/dictation/sessions"
```

### Bước 3.3: Tích hợp Khởi động vào `start_all.bat`
Chỉnh sửa file [start_all.bat](file:///c:/Users/Jackie%20Duong/Desktop/Web_sua_loi/start_all.bat) để khởi chạy đồng bộ 3 dịch vụ:

```bat
@echo off
echo ========================================================
echo        KHOI DONG HE THONG VIHAND GRADE + XIAOZHI
echo ========================================================

echo [1/3] Khoi dong Web Frontend & API (Next.js - Port 3000)...
start "Next.js Web Server" cmd /c "npm run dev"

echo [2/3] Khoi dong AI ViT5 Grader Service (Port 8000)...
start "ViT5 AI Service" cmd /k "cd python_service && python main.py"

echo [3/3] Khoi dong Xiaozhi Voice Core cho ESP32 (Port 8100)...
start "Xiaozhi Voice Core" cmd /k "cd xiaozhi-esp32-server-main\main\xiaozhi-server && python app.py"

echo.
echo [OK] Tat ca dich vu da san sang!
pause
```

---

## 🟢 GIAI ĐOẠN 4: Cấu hình Firmware & Nạp vào Mạch ESP32-S3

### Bước 4.1: Cấu hình Hardware Pinout trong Firmware
Mở thư mục `xiaozhi-esp32-main/`, chọn board cấu hình (ví dụ `main/boards/common/` hoặc tạo custom board):

```c
// Cấu hình chân I2S cho Micro INMP441
#define I2S_MIC_SCK_PIN   GPIO_NUM_18
#define I2S_MIC_WS_PIN    GPIO_NUM_5
#define I2S_MIC_SD_PIN    GPIO_NUM_4

// Cấu hình chân I2S cho Loa MAX98357A
#define I2S_SPK_BCLK_PIN  GPIO_NUM_15
#define I2S_SPK_LRC_PIN   GPIO_NUM_6
#define I2S_SPK_DIN_PIN   GPIO_NUM_7
```

### Bước 4.2: Cấu hình Server WebSocket URL
Trong file cấu hình kết nối, đặt URL trỏ thẳng về IP máy chủ ViHand Grade trong mạng LAN:
```c
#define CONFIG_DEFAULT_SERVER_URL "ws://192.168.1.100:8100/xiaozhi/v1/"
```

### Bước 4.3: Biên dịch & Nạp Firmware
* Kết nối cáp Type-C từ ESP32-S3 vào máy tính.
* Chạy lệnh nạp qua ESP-IDF:
  ```bash
  idf.py set-target esp32s3
  idf.py build
  idf.py -p COMx flash monitor
  ```
* *(Hoặc sử dụng công cụ nạp file `.bin` đồ họa ESP Flash Download Tool)*.

### Bước 4.4: Cấu hình Wi-Fi (BluFi) & Kiểm thử Thực tế
1. Khởi động mạch ESP32.
2. Dùng điện thoại kết nối Bluetooth với thiết bị `Xiaozhi-XXXX` để truyền tên và mật khẩu Wi-Fi phòng học.
3. ESP32 kết nối Wi-Fi thành công ➡️ Đèn LED xanh sáng, Loa phát câu chào: *"Em là trợ giảng Alexa, em đã sẵn sàng hỗ trợ thầy cô!"*.
4. Mở trang Web `http://localhost:3000/teacher/xiaozhi` ➡️ Thấy trạng thái mạch hiển thị **ONLINE**.

---

# 🩺 PHẦN 3: XỬ LÝ SỰ CỐ & CÁC LỖI THƯỜNG GẶP (TROUBLESHOOTING)

| Hiện tượng lỗi | Nguyên nhân gốc rễ | Cách xử lý dứt điểm |
| :--- | :--- | :--- |
| **Loa bị rè hoặc ngắt quãng** | 1. Sụt áp nguồn 5V khi bật âm lượng cao.<br>2. Tốc độ nén Opus frame bị trễ. | • Cấp nguồn USB Type-C 5V-2A chuẩn.<br>• Kiểm tra mạch dùng đúng chip ESP32-S3 có **PSRAM Octal 8MB**. |
| **Micro không thu được tiếng** | Sai chân L/R hoặc xung Clock I2S SCK/WS. | • Đảm bảo chân `L/R` của INMP441 được nối xuống **GND** (kênh trái).<br>• Kiểm tra khai báo đúng chân GPIO trong firmware. |
| **WebSocket tự ngắt kết nối** | Trùng port hoặc Windows Firewall chặn kết nối mạng nội bộ. | • Mở port inbound (8000/8100/3000) trên Windows Defender Firewall.<br>• Đảm bảo ESP32 và máy chủ kết nối cùng một mạng Wi-Fi (cùng dải IP 192.168.x.x). |
| **Robot đọc quá nhanh** | Tốc độ TTS mặc định không phù hợp lớp 1–3. | • Trong `config.yaml`, thiết lập `rate: "-15%"` hoặc `"-20%"` để giọng đọc chậm rãi theo chuẩn chính tả tiểu học. |
| **Lỗi Rate Limit Gemini (429)** | Hết quota khi nhiều lượt gọi API. | • Thêm nhiều API keys cách nhau bởi dấu phẩy trong biến môi trường `GEMINI_API_KEYS` để kích hoạt cơ chế tự động xoay tua (Key Rotation). |

---

> 🎉 **Tài liệu này là cẩm nang hướng dẫn đầy đủ để hiện thực hóa toàn bộ giải pháp Robot Đọc Chính Tả tích hợp ViHand Grade theo Phương án A!**
