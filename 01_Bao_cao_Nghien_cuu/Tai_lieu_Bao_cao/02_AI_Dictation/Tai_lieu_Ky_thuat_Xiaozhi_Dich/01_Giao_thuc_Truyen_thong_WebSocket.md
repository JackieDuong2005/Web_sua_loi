# Giao Thức Truyền Thông WebSocket (WebSocket Communication Protocol)

> **Tài liệu dịch kỹ thuật từ**: `xiaozhi-esp32-main/docs/websocket.md`  
> **Áp dụng cho**: Hệ thống Robot Đọc Chính Tả Xiaozhi & ViHand Grade (`ViHandGrade_Xiaozhi_DictationRobot_Spec.md`)

---

## 1. Luồng Hoạt Động Tổng Thể (Overall Flow)

### 1.1 Khởi tạo thiết bị (Device initialization)
1. Thiết bị ESP32-S3 khởi động và khởi tạo đối tượng `Application`:
   - Khởi tạo Audio Codec (Microphone, Loa/DAC), màn hình hiển thị (Display), đèn LED trạng thái,...
   - Kết nối vào mạng Wi-Fi lớp học.
   - Khởi tạo thực thể giao thức WebSocket (`WebsocketProtocol`) triển khai từ interface `Protocol`.
2. Thiết bị đi vào vòng lặp chính (Main Loop) và chờ đợi các sự kiện (thu nhận âm thanh từ mic, phát âm thanh ra loa, tác vụ định thời,...).

### 1.2 Mở kết nối WebSocket (Opening WebSocket Connection)
Khi thiết bị cần bắt đầu một phiên giọng nói (do nhận diện Wake Word "Alexa" hoặc giáo viên nhấn nút vật lý), hàm `OpenAudioChannel()` được gọi:
- Đọc đường dẫn WebSocket URL từ cấu hình cài đặt (trỏ về server Bridge Service hoặc Cloud).
- Thiết lập các HTTP Request Headers (`Authorization`, `Protocol-Version`, `Device-Id`, `Client-Id`).
- Gọi lệnh `Connect()` để thiết lập kết nối WebSocket với Server.

### 1.3 Thiết bị gửi gói tin bắt tay "hello" (Device -> Server)
Ngay sau khi kết nối thành công, thiết bị gửi gói tin JSON đầu tiên:

```json
{
  "type": "hello",
  "version": 1,
  "features": {
    "mcp": true,
    "aec": true
  },
  "transport": "websocket",
  "audio_params": {
    "format": "opus",
    "sample_rate": 16000,
    "channels": 1,
    "frame_duration": 60
  }
}
```
* `features`: Trường tùy chọn sinh ra từ cấu hình lúc biên dịch firmware (VD: `"mcp": true` báo hiệu thiết bị hỗ trợ MCP, `"aec": true` bật khử vọng âm phía server).
* `frame_duration`: Thời lượng khung âm thanh (mặc định 60 ms tương ứng với `OPUS_FRAME_DURATION_MS`).

### 1.4 Server phản hồi gói tin "hello" (Server -> Device)
Thiết bị chờ gói tin JSON phản hồi từ Server có `"type": "hello"` và `"transport": "websocket"`:

```json
{
  "type": "hello",
  "transport": "websocket",
  "session_id": "session_abc123",
  "audio_params": {
    "format": "opus",
    "sample_rate": 24000,
    "channels": 1,
    "frame_duration": 60
  }
}
```
- Nếu `transport` khớp, thiết bị đánh dấu kênh âm thanh (Audio Channel) đã mở thành công.
- Nếu không nhận được phản hồi hợp lệ trong thời gian chờ (Timeout mặc định 10 giây), kết nối bị coi là thất bại và kích hoạt callback báo lỗi mạng.

### 1.5 Quá trình trao đổi dữ liệu tiếp theo
Có hai loại dữ liệu được truyền tải hai chiều qua WebSocket:
1. **Dữ liệu nhị phân (Binary Audio Data)**: Các khung âm thanh mã hóa chuẩn Opus (Opus frames).
2. **Gói tin văn bản JSON (Text JSON Messages)**: Trạng thái hội thoại, sự kiện STT/TTS, gói tin giao thức MCP, cảnh báo hệ thống,...

*Xử lý tại tầng ứng dụng (`OnData` callback):*
- Nếu gói tin là **Binary** (`binary == true`): Payload được giải mã thành khung âm thanh PCM Opus để phát ra loa.
- Nếu gói tin là **Text** (`binary == false`): Payload được parse thành JSON và điều phối theo trường `type`.

### 1.6 Đóng kết nối WebSocket
Khi phiên kết thúc hoặc giáo viên ra lệnh ngắt, thiết bị gọi `CloseAudioChannel()` để giải phóng socket và chuyển về trạng thái nghỉ (Idle).

---

## 2. Các HTTP Request Headers Thông Dụng

Khi bắt tay thiết lập WebSocket, thiết bị gửi các Headers sau:

* `Authorization`: Mã Access Token xác thực, định dạng `"Bearer <token>"`.
* `Protocol-Version`: Phiên bản giao thức nhị phân (khớp với trường `version` trong gói tin hello).
* `Device-Id`: Địa chỉ MAC phần cứng của chip ESP32 (dùng làm định danh duy nhất).
* `Client-Id`: Chuỗi UUID sinh bằng phần mềm (lưu trong bộ nhớ NVS).

---

## 3. Các Phiên Bản Giao Thức Nhị Phân (Binary Protocol Versions)

* **Version 1 (Mặc định)**: Các khung Opus thô (Raw Opus frames) không gắn thêm metadata. Tầng WebSocket tự phân biệt khung nhị phân và văn bản.
* **Version 2 (`BinaryProtocol2`)**: Bổ sung trường Timestamp và Payload Size phục vụ giải thuật khử tiếng vọng (AEC) phía Server:
  ```c
  struct BinaryProtocol2 {
      uint16_t version;        // Phiên bản giao thức
      uint16_t type;           // Loại tin nhắn (0: OPUS, 1: JSON)
      uint32_t reserved;       // Dự phòng
      uint32_t timestamp;      // Timestamp mili-giây (cho Server AEC)
      uint32_t payload_size;   // Kích thước payload (bytes)
      uint8_t payload[];       // Dữ liệu âm thanh
  } __attribute__((packed));
  ```
* **Version 3 (`BinaryProtocol3`)**: Cấu trúc rút gọn nhẹ:
  ```c
  struct BinaryProtocol3 {
      uint8_t type;            // Loại tin nhắn
      uint8_t reserved;        // Dự phòng
      uint16_t payload_size;   // Kích thước payload
      uint8_t payload[];       // Dữ liệu âm thanh
  } __attribute__((packed));
  ```

---

## 4. Cấu Trúc Chi Tiết Các Gói Tin JSON

### 4.1 Chiều Thiết Bị gửi lên Server (Device -> Server)

#### 1. Lắng nghe / Thu âm (`listen`)
Báo cho Server biết thiết bị bắt đầu hoặc dừng thu âm từ Micro:
```json
{
  "session_id": "session_123",
  "type": "listen",
  "state": "start",
  "mode": "manual"
}
```
* `state`: `"start"` (bắt đầu), `"stop"` (dừng), hoặc `"detect"` (khi phát hiện từ khóa đánh thức).
* `mode`: `"auto"` (tự động phát hiện im lặng), `"manual"` (nhấn nút giữ), hoặc `"realtime"`.

#### 2. Ngắt lời / Hủy phát âm (`abort`)
Dùng khi giáo viên muốn ngắt lời robot đang đọc hoặc có từ khóa đánh thức mới:
```json
{
  "session_id": "session_123",
  "type": "abort",
  "reason": "wake_word_detected"
}
```

#### 3. Thông điệp MCP (`mcp`)
Truyền tải kết quả thực thi các công cụ phần cứng qua chuẩn JSON-RPC 2.0:
```json
{
  "session_id": "session_123",
  "type": "mcp",
  "payload": {
    "jsonrpc": "2.0",
    "id": 1,
    "result": {
      "content": [
        { "type": "text", "text": "true" }
      ],
      "isError": false
    }
  }
}
```

---

### 4.2 Chiều Server gửi xuống Thiết Bị (Server -> Device)

#### 1. Bắt tay phản hồi (`hello`)
Xác nhận phiên kết nối thành công và thỏa thuận định dạng âm thanh.

#### 2. Kết quả nhận dạng giọng nói (`stt`)
Gửi văn bản câu nói vừa nhận diện được từ giáo viên để hiển thị phụ đề lên màn hình robot:
```json
{
  "session_id": "session_123",
  "type": "stt",
  "text": "Alexa, đọc bài Hạt gạo làng ta"
}
```

#### 3. Cảm xúc biểu cảm màn hình (`llm`)
Điều khiển khuôn mặt biểu cảm của robot trên màn hình IPS (vui vẻ, lắng nghe, suy nghĩ):
```json
{
  "session_id": "session_123",
  "type": "llm",
  "emotion": "happy",
  "text": "😀"
}
```

#### 4. Điều khiển đọc văn bản (`tts`)
* Bắt đầu phát âm: `{"session_id": "session_123", "type": "tts", "state": "start"}`
* Kết thúc câu/bài đọc: `{"session_id": "session_123", "type": "tts", "state": "stop"}`
* Bắt đầu một câu mới (hiển thị chữ): `{"session_id": "session_123", "type": "tts", "state": "sentence_start", "text": "Hạt gạo làng ta, có vị phù sa..."}`

#### 5. Gọi công cụ phần cứng qua MCP (`mcp`)
Server yêu cầu thiết bị thực thi lệnh (chỉnh âm lượng, đổi màu đèn LED,...):
```json
{
  "session_id": "session_123",
  "type": "mcp",
  "payload": {
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "self.audio_speaker.set_volume",
      "arguments": { "volume": 80 }
    },
    "id": 10
  }
}
```

#### 6. Cảnh báo hiển thị (`alert`)
Hiển thị thông báo khẩn cấp kèm âm báo trên thiết bị:
```json
{
  "session_id": "session_123",
  "type": "alert",
  "status": "Cảnh báo",
  "message": "Pin yếu hoặc mất kết nối",
  "emotion": "sad"
}
```

---

## 5. Máy Trạng Thái Của Thiết Bị (Device State Machine)

Các trạng thái chính của ESP32-S3:
* `kDeviceStateStarting`: Đang khởi động phần cứng.
* `kDeviceStateWifiConfiguring`: Đang ở chế độ cấu hình Wi-Fi qua BLE.
* `kDeviceStateIdle`: Trạng thái nghỉ, sẵn sàng nhận lệnh.
* `kDeviceStateConnecting`: Đang thiết lập kết nối WebSocket tới Server.
* `kDeviceStateListening`: Đang mở micro thu âm và stream Opus lên Server.
* `kDeviceStateSpeaking`: Đang nhận luồng audio TTS từ Server và phát ra loa.
* `kDeviceStateFatalError`: Lỗi nghiêm trọng cần người dùng kiểm tra.

```text
               ┌───────────────────────┐
               │   kDeviceStateIdle    │ (Nghỉ / Sẵn sàng)
               └──────────┬────────────┘
                          │ Kích hoạt: Wake Word / Nút nhấn
                          ▼
               ┌───────────────────────┐
               │kDeviceStateConnecting │ (Bắt tay WebSocket)
               └──────────┬────────────┘
                          │ Bắt tay thành công
                          ▼
               ┌───────────────────────┐
      ┌───────▶│ kDeviceStateListening │ (Thu âm Micro ──▶ Stream Opus)
      │        └──────────┬────────────┘
      │                   │ Server gửi tts: start
      │                   ▼
      │        ┌───────────────────────┐
      └────────┤  kDeviceStateSpeaking │ (Nhận Audio TTS ──▶ Phát loa)
  tts: stop    └──────────┬────────────┘
 (chế độ auto)            │ tts: stop (hết bài) / ngắt lời
                          ▼
               ┌───────────────────────┐
               │   kDeviceStateIdle    │
               └───────────────────────┘
```

---

## 6. Luồng Tin Nhắn Ví Dụ Hoàn Chỉnh

1. **ESP32 ──▶ Server**: Bắt tay `hello` (Opus 16kHz, mono, frame 60ms, mcp=true).
2. **Server ──▶ ESP32**: Xác nhận `hello` (cấp `session_id: "sess_001"`).
3. **ESP32 ──▶ Server**: `listen (start)` + gửi liên tục các gói nhị phân Opus.
4. **Server ──▶ ESP32**: `stt ("Alexa, đọc bài chính tả lớp 3")`.
5. **Server ──▶ ESP32**: `llm (emotion: "happy")` + `tts (start)` + gửi luồng nhị phân TTS Opus.
6. **Server ──▶ ESP32**: `tts (stop)` ➔ Thiết bị dừng loa và trở về trạng thái nghỉ.
