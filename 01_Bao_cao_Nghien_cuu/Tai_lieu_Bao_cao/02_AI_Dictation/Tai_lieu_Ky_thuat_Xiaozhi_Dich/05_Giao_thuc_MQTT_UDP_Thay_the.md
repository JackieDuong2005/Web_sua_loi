# Giao Thức Lai Ghép MQTT + UDP (MQTT + UDP Hybrid Protocol)

> **Tài liệu dịch kỹ thuật từ**: `xiaozhi-esp32-main/docs/mqtt-udp.md`  
> **Áp dụng cho**: Phương án truyền thông thay thế WebSocket khi cần độ trễ âm thanh siêu thấp và mã hóa AES

---

## 1. Tổng Quan Kiến Trúc Lai Ghép (Overview)

Giao thức **MQTT + UDP Hybrid** tách biệt hoàn toàn 2 luồng truyền tải:
* **Kênh Điều Khiển (MQTT)**: Truyền tải các gói tin JSON điều khiển, đồng bộ trạng thái, thông điệp MCP và các sự kiện bắt tay.
* **Kênh Âm Thanh Thời Gian Thực (UDP)**: Truyền tải luồng âm thanh Opus hai chiều có mã hóa đối xứng **AES-CTR** để đạt độ trễ thấp nhất.

### Các đặc tính nổi bật:
1. **Thiết kế 2 kênh độc lập (Dual-channel)**: Tách kênh âm thanh khỏi kênh điều khiển giúp tránh tắc nghẽn luồng dữ liệu.
2. **Mã hóa bảo mật cao**: Luồng âm thanh UDP được mã hóa bằng thuật toán AES-CTR với khóa (Key) và Nonce được cấp động qua MQTT lúc bắt tay.
3. **Chống lặp và đảo thứ tự gói (Sequence Numbers)**: Khắc phục nhược điểm mất gói / xáo trộn gói của giao thức UDP.
4. **Tự động kết nối lại (Auto-reconnect)**: Tầng MQTT tự động khôi phục kết nối khi mạng Wi-Fi chập chờn.

---

## 2. Quy Trình Hoạt Động Toàn Trình (End-to-End Flow)

```text
Thiết bị ESP32                MQTT Broker (Port 1883)          UDP Audio Server (Port 8888)
      │                                │                                    │
      │── 1. Kết nối MQTT ────────────▶│                                    │
      │◀── Xác nhận kết nối (ConnAck) ─┤                                    │
      │                                │                                    │
      │── 2. Gửi "hello" (transport: "udp") ──▶│                           │
      │◀── "hello" ack (Cấp IP UDP Server + Key/Nonce) ─┤                   │
      │                                │                                    │
      │── 3. Bắt tay kết nối UDP ──────────────────────────────────────────▶│
      │◀── Xác nhận kết nối UDP ────────────────────────────────────────────┤
      │                                │                                    │
      │── 4. Stream Âm thanh Opus Mã hóa (AES-CTR) ◄───────────────────────►│
      │                                │                                    │
      │── 5. Trao đổi lệnh MCP / Lắng nghe / STT qua MQTT ◄────────────────►│
      │                                │                                    │
      │── 6. Ngắt kết nối "goodbye" ──▶│                                    │
      │── Đóng socket UDP ─────────────────────────────────────────────────▶│
```

---

## 3. Cấu Trúc Bắt Tay Qua MQTT (Hello Exchange)

### 3.1 Thiết bị gửi lên Server:
```json
{
  "type": "hello",
  "version": 3,
  "transport": "udp",
  "features": {
    "mcp": true,
    "aec": true
  },
  "audio_params": {
    "format": "opus",
    "sample_rate": 16000,
    "channels": 1,
    "frame_duration": 60
  }
}
```

### 3.2 Server phản hồi cấp thông tin UDP Server & Khóa mã hóa:
```json
{
  "type": "hello",
  "transport": "udp",
  "session_id": "session_999",
  "audio_params": {
    "format": "opus",
    "sample_rate": 24000,
    "channels": 1,
    "frame_duration": 60
  },
  "udp": {
    "server": "192.168.1.100",
    "port": 8888,
    "key": "0123456789ABCDEF0123456789ABCDEF",
    "nonce": "0123456789ABCDEF0123456789ABCDEF"
  }
}
```
* `udp.server`: Địa chỉ IP của máy chủ giải mã âm thanh UDP.
* `udp.port`: Cổng lắng nghe UDP (VD: 8888).
* `udp.key`: Khóa mã hóa AES 128-bit (định dạng Hex).
* `udp.nonce`: Giá trị khởi tạo Nonce cho thuật toán AES-CTR.

---

## 4. Định Dạng Gói Tin Âm Thanh Nhị Phân UDP

Mỗi gói tin âm thanh truyền qua UDP có cấu trúc tiêu đề (Header) nhị phân:

```c
struct UdpAudioPacket {
    uint32_t sequence_number; // Số thứ tự gói tin (tăng dần, chống phát lại)
    uint32_t timestamp;       // Timestamp mili-giây
    uint8_t payload[];        // Dữ liệu Opus đã mã hóa AES-CTR
} __attribute__((packed));
```

Thiết bị giải mã gói tin bằng khóa `udp.key` và `udp.nonce` tương ứng trước khi chuyển vào bộ giải mã Opus để phát ra loa.
