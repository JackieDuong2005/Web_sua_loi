# 📚 Bộ Tài Liệu Kỹ Thuật Xiaozhi AI & Robot Đọc Chính Tả (Bản Tiếng Việt)

Thư mục này chứa toàn bộ các tài liệu kỹ thuật gốc được dịch chi tiết, chuẩn hóa thuật ngữ và bổ sung ghi chú ứng dụng thực tế cho hệ thống **Robot Đọc Chính Tả ViHand Grade** (Module 11 - `ViHandGrade_Xiaozhi_DictationRobot_Spec.md`).

---

## 📂 Danh Mục Tài Liệu Chi Tiết

| STT | Tên file tài liệu | Nội dung chính | File gốc tương ứng |
|:---:|:---|:---|:---|
| **01** | 📄 [**01_Giao_thuc_Truyen_thong_WebSocket.md**](./01_Giao_thuc_Truyen_thong_WebSocket.md) | **Tài liệu quan trọng nhất** về giao thức mạng WebSocket giữa ESP32-S3 và Server: bắt tay `hello`, định dạng stream âm thanh Opus/PCM 16kHz, gói tin JSON điều khiển STT/TTS/Alert, cơ chế ngắt lời `abort`, máy trạng thái (State Machine). | `docs/websocket.md` |
| **02** | 📄 [**02_Giao_thuc_Tuong_tac_MCP.md**](./02_Giao_thuc_Tuong_tac_MCP.md) | Đặc tả chi tiết giao thức Model Context Protocol (MCP) chuẩn JSON-RPC 2.0: phương thức `initialize`, `tools/list`, `tools/call`, thông báo chủ động và sơ đồ tuần tự 5 bước. | `docs/mcp-protocol.md` |
| **03** | 📄 [**03_Huong_dan_Su_dung_MCP_Dieu_khien_IoT.md**](./03_Huong_dan_Su_dung_MCP_Dieu_khien_IoT.md) | Hướng dẫn thực hành viết hàm C++ đăng ký công cụ trên firmware ESP32 (`AddTool`, `AddUserOnlyTool`), các công cụ tích hợp sẵn (chỉnh âm lượng, độ sáng LCD, theme, chụp ảnh). | `docs/mcp-usage.md` |
| **04** | 📄 [**04_Huong_dan_Thiet_ke_Phan_cung_Custom_Board.md**](./04_Huong_dan_Thiet_ke_Phan_cung_Custom_Board.md) | Hướng dẫn đấu nối và gán chân GPIO cho phần cứng ESP32-S3 tự thiết kế: I2S Microphone (INMP441), I2S Loa Amply (MAX98357A), Màn hình LCD ST7789 SPI, Nút bấm và file `config.h`, `config.json`. | `docs/custom-board.md` |
| **05** | 📄 [**05_Giao_thuc_MQTT_UDP_Thay_the.md**](./05_Giao_thuc_MQTT_UDP_Thay_the.md) | Giao thức lai ghép MQTT + UDP khi cần độ trễ thấp và luồng âm thanh mã hóa đối xứng AES-CTR. | `docs/mqtt-udp.md` |
| **06** | 📄 [**06_Cau_hinh_WiFi_BluFi.md**](./06_Cau_hinh_WiFi_BluFi.md) | Hướng dẫn cấu hình mạng Wi-Fi ban đầu cho Robot thông qua sóng Bluetooth BLE từ điện thoại thông minh (App EspBlufi). | `docs/blufi.md` |

---

## 🔗 Mối Liên Hệ với Hệ Thống ViHand Grade

```text
┌────────────────────────────────────────────────────────────────────────┐
│  Robot Xiaozhi ESP32-S3 (Phần cứng: Tài liệu 04, Cấu hình: 06)         │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ WebSocket (Tài liệu 01)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│  Xiaozhi Bridge / MCP Server (FastAPI :8200) (Tài liệu 02, 03)         │
│  - Xử lý JSON-RPC 2.0 (initialize, tools/list, tools/call)             │
│  - Nạp Role Prompt "Alexa Sư phạm"                                     │
│  - Tra cứu kho SGK & Lưu bài chính tả                                  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ REST API (localhost:3000)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│  Next.js Core & SQLite Database (ViHand Grade)                         │
│  - Quản lý phiên đọc (DictationSession) & Bảng điểm (Grade)            │
└────────────────────────────────────────────────────────────────────────┘
```
