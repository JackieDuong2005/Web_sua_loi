# 🤖 ViHand Grade — Đặc Tả Kỹ Thuật Mở Rộng
## Module 11: Robot Đọc Chính Tả tích hợp Xiaozhi AI Chatbot

> Tài liệu bổ sung cho `ViHandGrade_TechSpec.md v1.2.0`
> Đề xuất phiên bản: `v1.3.0-draft`

---

## 11.1 Bối cảnh & Mục tiêu

Hiện tại ViHand Grade xử lý ở **hậu kỳ**: giáo viên đọc chính tả trực tiếp trên lớp (không được hệ thống hỗ trợ), sau đó mới chụp ảnh bài viết của học sinh để chấm điểm. Module này bổ sung phần **tiền kỳ**: dùng một robot vật lý chạy nền tảng **Xiaozhi AI Chatbot** (dự án mã nguồn mở `xiaozhi-esp32`, chip ESP32-S3) để **đọc đoạn văn chính tả thay hoặc hỗ trợ giáo viên**, đồng thời toàn bộ hội thoại (lệnh điều khiển bằng giọng nói của giáo viên/học sinh và phản hồi của robot) được ghi lại và lưu vào cùng cơ sở dữ liệu với hệ thống chấm điểm hiện có.

**Mục tiêu kỹ thuật:**
* Giáo viên soạn/chọn đoạn văn chính tả trên Web app → đẩy xuống robot → robot đọc bằng giọng TTS tiếng Việt, tốc độ phù hợp học sinh tiểu học tập chép.
* Robot hiểu lệnh thoại điều khiển cơ bản: đọc lại, chậm hơn, tạm dừng, tiếp tục, đánh vần từ khó.
* Toàn bộ transcript hội thoại (nội dung đọc + lệnh + phản hồi) được lưu trữ, gắn với Lớp học / Bài viết, có thể tra cứu lại và **liên kết với bản ghi `Grade`** của học sinh đã chép bài đó (đối chiếu sau này).
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

## 11.3 Luồng nghiệp vụ (Business Flow)

1. **Chuẩn bị bài đọc**: Giáo viên vào màn hình mới `teacher/dictation/` trên Web app, soạn hoặc chọn từ thư viện một **Đoạn văn chính tả** (`DictationPassage`), gắn với Lớp học, đặt tốc độ đọc mặc định và số lần lặp mỗi câu.
2. **Ghép nối robot**: Giáo viên chọn robot đã pair trong lớp (mỗi robot có `deviceCode` duy nhất, đăng ký một lần qua QR code hiển thị trên màn hình robot khi khởi động lần đầu).
3. **Khởi tạo phiên đọc**: Giáo viên bấm "Bắt đầu đọc chính tả" → Next.js tạo bản ghi `DictationSession` (trạng thái `pending`) → gọi Bridge Service qua REST nội bộ để đẩy lệnh xuống robot đang giữ kết nối WebSocket tương ứng với `deviceCode`.
4. **Robot thực hiện đọc chính tả** theo kịch bản 4 bước (chi tiết mục 11.6):
   a. Đọc toàn bài 1 lượt tốc độ chuẩn để học sinh nắm nội dung.
   b. Đọc từng câu, dừng đủ thời gian ước tính học sinh chép kịp, lặp mỗi câu theo cấu hình (mặc định 2 lần).
   c. Trong lúc đọc, robot luôn lắng nghe lệnh điều khiển ngắn bằng giọng nói của giáo viên (chậm hơn / đọc lại / tạm dừng / tiếp tục / đánh vần).
   d. Đọc lại toàn bài 1 lượt cuối để học sinh soát lỗi.
5. **Ghi log song song**: Mỗi lượt robot đọc và mỗi lệnh thoại nhận được đều được Bridge Service gửi ngay (gần thời gian thực) tới `POST /api/xiaozhi/sessions/{id}/logs` để lưu vào bảng `ConversationLog`.
6. **Kết thúc phiên**: Giáo viên bấm "Kết thúc" hoặc robot tự kết thúc sau bước d → `DictationSession.status = "completed"`, hệ thống tổng hợp transcript đầy đủ.
7. **Liên kết chấm điểm (tuỳ chọn)**: Khi giáo viên chấm bài viết tay của học sinh cho đúng đoạn văn này (qua pipeline OCR + ViT5 sẵn có), hệ thống cho phép chọn `dictationSessionId` liên kết vào bản ghi `Grade`, để sau này xem lại "đoạn robot đã đọc" song song với "bài học sinh đã viết".

---

## 11.4 Mở rộng Database Schema (Prisma)

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

// 5. Thư viện đoạn văn chính tả do giáo viên soạn
model DictationPassage {
  id            String   @id @default(cuid())
  title         String                             // Ví dụ: "Nghe viết: Ai có lỗi"
  content       String                             // Toàn văn đoạn chính tả chuẩn
  classId       String   @default("")
  grade         Int      @default(3)               // Khối lớp phù hợp
  readingSpeed  String   @default("normal")         // "slow" | "normal" | "fast"
  repeatPerLine Int      @default(2)                // Số lần lặp lại mỗi câu khi đọc
  createdBy     String   @default("")               // teacherId
  createdAt     DateTime @default(now())
}

// 6. Một phiên robot đọc chính tả cho một lớp/nhóm học sinh
model DictationSession {
  id           String   @id @default(cuid())
  passageId    String                              // Liên kết DictationPassage
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
  intent       String   @default("")               // "read_line"|"repeat"|"pause"|"resume"|"slow_down"|"speed_up"|"spell_word"|"other"
  content      String                              // Nội dung văn bản (đã được ASR/TTS hoá)
  audioUrl     String   @default("")               // (tuỳ chọn) đường dẫn file ghi âm lưu trữ
  timestampMs  Int      @default(0)                // Mốc thời gian tương đối trong phiên (ms)
  createdAt    DateTime @default(now())
}
```

> **Ghi chú tích hợp**: Bảng `Grade` hiện có được bổ sung 1 trường tuỳ chọn `dictationSessionId String @default("")` để liên kết ngược, không phá vỡ dữ liệu cũ (migration additive, không cần backfill bắt buộc).

---

## 11.5 API Endpoints mới

### 11.5.1 Quản lý thiết bị & thư viện bài đọc
* `POST /api/xiaozhi/devices/pair` — Ghép nối robot mới bằng mã QR (device gửi `deviceCode` lần đầu kết nối, giáo viên xác nhận gán vào lớp).
* `GET /api/xiaozhi/devices` — Danh sách robot theo lớp, trạng thái online/offline (heartbeat 30s).
* `GET|POST /api/xiaozhi/passages` — CRUD đoạn văn chính tả.

### 11.5.2 Điều khiển phiên đọc
* `POST /api/xiaozhi/sessions`
  * **Body**: `{"passageId": "...", "deviceId": "...", "classId": "..."}`
  * **Mô tả**: Tạo phiên mới, chuyển tiếp lệnh `start` xuống Bridge Service.
* `POST /api/xiaozhi/sessions/{id}/control`
  * **Body**: `{"action": "pause" | "resume" | "repeat_line" | "slow_down" | "speed_up" | "stop"}`
  * **Mô tả**: Cho phép giáo viên điều khiển thủ công từ giao diện Web (song song với lệnh thoại trực tiếp trên robot).
* `GET /api/xiaozhi/sessions/{id}` — Trạng thái phiên hiện tại (câu đang đọc, tốc độ, thời lượng).

### 11.5.3 Ghi nhận & tra cứu hội thoại
* `POST /api/xiaozhi/sessions/{id}/logs` *(gọi nội bộ từ Bridge Service, không public)*
  * **Body**: `{"speaker": "robot|teacher|student", "intent": "...", "content": "...", "timestampMs": 15230}`
* `GET /api/xiaozhi/sessions/{id}/transcript`
  * **Response**: Danh sách `ConversationLog` sắp xếp theo thời gian, dùng để hiển thị lại toàn bộ hội thoại trên UI giáo viên (dạng chat log kèm nút phát lại audio nếu có lưu `audioUrl`).

---

## 11.6 Kịch bản đọc chính tả & Xử lý lệnh thoại (Dialog Manager)

### 11.6.1 State machine của phiên đọc
```text
pending → reading_intro (đọc toàn bài lần 1)
        → reading_lines (lặp qua từng câu: đọc → chờ → lặp lại N lần → câu kế tiếp)
        → reading_recap (đọc toàn bài lần cuối)
        → completed
Bất kỳ trạng thái "reading_*" có thể chuyển tạm sang "paused" rồi quay lại đúng vị trí (currentLine).
```

### 11.6.2 Tính thời gian chờ giữa các câu
Thời gian tạm dừng sau mỗi câu được ước lượng theo số lượng chữ trong câu và tốc độ viết trung bình của học sinh tiểu học (mặc định **1.5 giây/chữ**, có thể cấu hình theo khối lớp — khối 1-2 chậm hơn khối 4-5), cộng thêm khoảng đệm cố định 2 giây để chuyển câu.

### 11.6.3 Bảng ánh xạ lệnh thoại → Intent
Do học sinh/giáo viên sẽ nói các câu ngắn tự nhiên, Bridge Service dùng một lớp NLU nhẹ (tập mẫu câu tiếng Việt + fallback gọi LLM phân loại intent khi câu lệnh không khớp mẫu có sẵn) để ánh xạ sang các hành động cố định của hệ thống — ví dụ nhóm lệnh "đọc lại câu vừa rồi" tương ứng `repeat_line`, nhóm lệnh "đọc chậm hơn/nhanh hơn" tương ứng `slow_down`/`speed_up`, nhóm lệnh "dừng lại/tiếp tục" tương ứng `pause`/`resume`, và lệnh "đánh vần giúp từ..." tương ứng `spell_word` (robot đọc tách từng chữ cái/âm tiết của từ được chỉ định). Toàn bộ danh sách mẫu câu và bảng intent chi tiết nên được quản lý trong một file cấu hình riêng (`intent_patterns.yaml`) để giáo viên/đội kỹ thuật dễ bổ sung mẫu câu địa phương mà không cần sửa code.

### 11.6.4 Giới hạn phạm vi hội thoại (Guardrail)
Robot trong module này **chỉ đóng vai trò trợ lý đọc chính tả**, không phải chatbot tự do. Dialog Manager cần giới hạn: nếu câu nói không khớp bất kỳ intent điều khiển đọc nào, robot phản hồi trung lập kiểu "Con muốn cô đọc tiếp hay đọc lại nhé?" thay vì chuyển sang trò chuyện mở, để tránh lệch trọng tâm giờ học và tránh rủi ro nội dung không phù hợp lứa tuổi tiểu học.

---

## 11.7 Lựa chọn công nghệ ASR/TTS tiếng Việt

Vì đối tượng là học sinh tiểu học và nội dung đọc chính tả cần **phát âm chuẩn, tốc độ điều chỉnh được**, khuyến nghị **không dùng giọng TTS mặc định** đi kèm firmware gốc (thường tối ưu cho tiếng Trung/Anh) mà tích hợp một dịch vụ TTS tiếng Việt chuyên biệt ở tầng Bridge Service, tương tự cách hệ thống hiện tại đã tách riêng lựa chọn OCR (Gemini) và NLP sửa lỗi (ViT5) làm hai thành phần độc lập. Việc chọn nhà cung cấp TTS/ASR tiếng Việt cụ thể (ví dụ dịch vụ cloud có API tiếng Việt, hoặc mô hình mã nguồn mở chạy cục bộ) cần được khảo sát riêng dựa trên tiêu chí độ trễ, chất lượng phát âm có dấu, và chi phí vận hành — nằm ngoài phạm vi đặc tả kiến trúc này.

**Yêu cầu kỹ thuật tối thiểu cho TTS:**
* Hỗ trợ điều chỉnh tốc độ đọc (0.5× – 1.2×) và có thể ngắt câu tại dấu câu tiếng Việt.
* Phát âm đúng dấu thanh — cùng mối quan tâm chất lượng đã đặt ra với OCR ở Module 2 của hệ thống gốc.

**Yêu cầu kỹ thuật tối thiểu cho ASR (nhận lệnh thoại):**
* Độ trễ nhận dạng câu lệnh ngắn (< 2 giây) để không làm gián đoạn nhịp đọc chính tả.
* Không cần nhận dạng câu dài phức tạp — chỉ cần độ chính xác cao với tập từ khoá lệnh điều khiển cố định (mục 11.6.3), có thể áp dụng kỹ thuật giới hạn từ vựng (keyword-biased ASR) để tăng độ chính xác thay vì ASR tổng quát.

---

## 11.8 Bảo mật & Quyền riêng tư

* Kết nối WebSocket giữa robot và Bridge Service cần xác thực bằng `deviceCode` + token cấp khi ghép nối (pairing), tránh robot lạ giả mạo kết nối vào lớp học.
* Vì hội thoại có thể ghi nhận giọng nói học sinh (trẻ em), mặc định **chỉ lưu bản text đã chuyển đổi (transcript)**, không lưu file âm thanh gốc (`audioUrl` để trống) trừ khi giáo viên bật tuỳ chọn lưu âm thanh phục vụ mục đích sư phạm cụ thể — cần có sự đồng ý/thông báo tới phụ huynh theo quy định bảo vệ dữ liệu trẻ em hiện hành.
* Dữ liệu `ConversationLog` áp dụng cùng chính sách phân quyền như bảng `Grade`: chỉ giáo viên chủ nhiệm lớp và Admin được truy vấn.

---

## 11.9 Quản lý rủi ro bổ sung

| Tình huống rủi ro | Xác suất | Tác động | Giải pháp xử lý dự phòng |
| :--- | :---: | :---: | :--- |
| **Robot mất kết nối WiFi giữa phiên đọc** | Trung bình | Cao | Bridge Service lưu `currentLine` liên tục; khi robot kết nối lại trong vòng 5 phút, tự động khôi phục đúng vị trí đọc (trạng thái `paused` → `resume`). Quá 5 phút, phiên chuyển `cancelled` và giáo viên có thể tạo phiên mới tiếp tục từ câu đã dừng. |
| **ASR nhận sai lệnh thoại do ồn lớp học** | Cao | Trung bình | Ưu tiên hiển thị nút điều khiển thủ công trên Web app (`/api/xiaozhi/sessions/{id}/control`) làm phương án chính; lệnh thoại là hỗ trợ bổ sung, không bắt buộc. |
| **TTS đọc sai dấu thanh với từ hiếm/địa phương** | Trung bình | Trung bình | Cho phép giáo viên nghe thử (preview) toàn bộ `DictationPassage` trước khi dùng cho lớp, chỉnh sửa thủ công cách ngắt câu nếu cần trước khi lưu vào thư viện. |
| **Nhiều robot cùng lúc trong một trường gây quá tải Bridge Service** | Thấp | Trung bình | Thiết kế Bridge Service dạng stateless theo phiên (session state lưu ở DB, không lưu in-memory), cho phép chạy nhiều instance phía sau load balancer khi mở rộng quy mô. |

---

*Tài liệu này là bản đề xuất mở rộng (v1.3.0-draft) cho ViHand Grade, mô tả kiến trúc tích hợp robot Xiaozhi AI Chatbot làm trợ lý đọc chính tả. Cần rà soát cùng đội kỹ thuật phần cứng trước khi triển khai thực tế, đặc biệt ở khâu lựa chọn nhà cung cấp ASR/TTS tiếng Việt cụ thể.*
