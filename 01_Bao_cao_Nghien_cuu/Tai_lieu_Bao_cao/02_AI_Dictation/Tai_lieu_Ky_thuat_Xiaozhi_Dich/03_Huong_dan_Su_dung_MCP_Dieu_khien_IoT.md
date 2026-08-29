# Hướng Dẫn Sử Dụng MCP Điều Khiển IoT & Thiết Bị (MCP IoT Control Usage)

> **Tài liệu dịch kỹ thuật từ**: `xiaozhi-esp32-main/docs/mcp-usage.md`  
> **Áp dụng cho**: Lập trình firmware ESP32 và định nghĩa Tool cho Robot ViHand Grade

---

## 1. Giới Thiệu

Giao thức **MCP (Model Context Protocol)** là chuẩn giao thức khuyến nghị cao nhất để điều khiển IoT và phần cứng trong dự án Xiaozhi AI. Bằng cách sử dụng **JSON-RPC 2.0**, backend AI có thể tự động nhận biết và kích hoạt các hàm chức năng ("Tools") được đăng ký bởi thiết bị.

---

## 2. Quy Trình Đăng Ký Công Cụ Trên Firmware ESP32

Mọi công cụ được đăng ký thông qua lớp mẫu thiết kế Singleton `McpServer`. Có 2 API đăng ký chính:

* `McpServer::AddTool`: Đăng ký công cụ thông thường, hiển thị mặc định trong danh sách `tools/list` để mô hình AI tự do gọi.
* `McpServer::AddUserOnlyTool`: Đăng ký công cụ đặc quyền người dùng, bị ẩn mặc định và chỉ trả về khi gửi `withUserTools=true` (dùng cho các chức năng nhạy cảm như reboot, nạp firmware OTA, dọn cache).

### Cú pháp API C++:

```cpp
// 1. Đăng ký Tool thông thường cho AI
void AddTool(
    const std::string& name,                                  // Tên Tool duy nhất (VD: self.speaker.set_volume)
    const std::string& description,                           // Mô tả chức năng bằng tiếng tự nhiên cho AI hiểu
    const PropertyList& properties,                           // Danh sách tham số đầu vào (bool, int, string)
    std::function<ReturnValue(const PropertyList&)> callback  // Hàm callback thực thi mã C++
);

// 2. Đăng ký Tool dành riêng cho người dùng / App quản trị
void AddUserOnlyTool(
    const std::string& name,
    const std::string& description,
    const PropertyList& properties,
    std::function<ReturnValue(const PropertyList&)> callback
);
```

---

## 3. Các Ví Dụ Lập Trình Thực Tế

### Ví dụ 1: Đăng ký Tool không có tham số (Điều khiển robot dừng lại)
```cpp
void InitializeTools() {
    auto& mcp_server = McpServer::GetInstance();

    mcp_server.AddTool("self.robot.pause_reading",
        "Tạm dừng bài đọc chính tả ngay lập tức",
        PropertyList(),
        [this](const PropertyList&) -> ReturnValue {
            // Gọi hàm dừng bộ đệm âm thanh DAC
            this->StopAudioPlayback();
            return true; // Trả về true báo thành công
        });
}
```

### Ví dụ 2: Đăng ký Tool có tham số (Chỉnh âm lượng loa 0–100%)
```cpp
void InitializeTools() {
    auto& mcp_server = McpServer::GetInstance();

    mcp_server.AddTool("self.audio_speaker.set_volume",
        "Điều chỉnh âm lượng loa phát bài đọc (từ 0 đến 100)",
        PropertyList({
            Property("volume", kPropertyTypeInteger, 0, 100) // Tham số kiểu int, giới hạn 0-100
        }),
        [this](const PropertyList& properties) -> ReturnValue {
            int vol = properties["volume"].value<int>();
            this->GetAudioCodec()->SetOutputVolume(vol);
            return true;
        });
}
```

### Ví dụ 3: Đăng ký Tool đổi màu đèn LED trạng thái
```cpp
mcp_server.AddTool("self.light.set_rgb",
    "Đặt màu sắc đèn LED RGB báo trạng thái lớp học",
    PropertyList({
        Property("r", kPropertyTypeInteger, 0, 255),
        Property("g", kPropertyTypeInteger, 0, 255),
        Property("b", kPropertyTypeInteger, 0, 255)
    }),
    [this](const PropertyList& properties) -> ReturnValue {
        int r = properties["r"].value<int>();
        int g = properties["g"].value<int>();
        int b = properties["b"].value<int>();
        SetLedColor(r, g, b);
        return true;
    });
```

---

## 4. Danh Sách Các Công Cụ Tích Hợp Sẵn (Built-in Tools)

Hệ thống Xiaozhi tự động đăng ký sẵn một bộ công cụ thông dụng trong nhân firmware:

### 4.1 Nhóm Công Cụ AI có thể gọi (`AddCommonTools`)

| Tên Tool | Mô tả chức năng | Tham số |
| :--- | :--- | :--- |
| `self.get_device_status` | Trả về trạng thái hiện tại: âm lượng, màn hình, mức pin, chất lượng Wi-Fi. | Không |
| `self.audio_speaker.set_volume` | Thiết lập âm lượng loa ngoài. | `volume` (0–100) |
| `self.screen.set_brightness` | Thiết lập độ sáng màn hình LCD. | `brightness` (0–100) |
| `self.screen.set_theme` | Đổi giao diện màn hình sáng/tối. | `theme` (`"light"` / `"dark"`) |
| `self.camera.take_photo` | Chụp ảnh qua Camera nhúng (nếu bo mạch có) và phân tích câu hỏi. | `question` (string) |

### 4.2 Nhóm Công Cụ Người Dùng (`AddUserOnlyTools` - Ẩn mặc định)

| Tên Tool | Mô tả chức năng |
| :--- | :--- |
| `self.get_system_info` | Trả về JSON cấu hình chi tiết phần cứng, chip, bộ nhớ PSRAM/Flash. |
| `self.reboot` | Khởi động lại chip ESP32 sau 1 giây. |
| `self.upgrade_firmware` | Tự động tải Firmware qua đường dẫn `url` và nạp OTA. |
| `self.screen.snapshot` | Chụp ảnh màn hình LCD dạng JPEG và gửi về server để debug. |
| `self.screen.preview_image` | Tải một ảnh từ `url` và hiển thị trực tiếp lên màn hình LCD. |

---

## 5. Ví Dụ Gói Tin JSON-RPC Trao Đổi

### 1. Lấy danh sách công cụ:
```json
{
  "jsonrpc": "2.0",
  "method": "tools/list",
  "params": { "cursor": "", "withUserTools": false },
  "id": 1
}
```

### 2. Gọi lệnh chỉnh âm lượng loa:
```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "self.audio_speaker.set_volume",
    "arguments": { "volume": 85 }
  },
  "id": 2
}
```

### 3. Gọi lệnh khởi động lại thiết bị (User-only Tool):
```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "self.reboot",
    "arguments": {}
  },
  "id": 3
}
```
