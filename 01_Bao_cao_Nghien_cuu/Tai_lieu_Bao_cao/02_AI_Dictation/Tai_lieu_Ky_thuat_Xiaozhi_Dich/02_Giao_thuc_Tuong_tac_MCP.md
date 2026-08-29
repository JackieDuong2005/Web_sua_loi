# Giao Thức Tương Tác MCP (Model Context Protocol)

> **Tài liệu dịch kỹ thuật từ**: `xiaozhi-esp32-main/docs/mcp-protocol.md`  
> **Áp dụng cho**: Kết nối điều khiển công cụ phần mềm & phần cứng trong ViHand Grade

---

## 1. Tổng Quan về MCP trong Dự Án

Trong kiến trúc Xiaozhi AI, giao thức **MCP (Model Context Protocol)** được sử dụng giữa **Backend API (đóng vai trò MCP Client)** và **Thiết bị ESP32 hoặc Local Server (đóng vai trò MCP Server)**. 

Mục đích chính của MCP là cho phép mô hình ngôn ngữ lớn (LLM):
1. Tự động khám phá danh sách các công cụ (Tools) hiện có trên thiết bị hoặc hệ sinh thái.
2. Tự động gọi thực thi (Invoke / Function Calling) các công cụ này dựa trên ngữ cảnh câu nói của người dùng.

---

## 2. Định Dạng Gói Tin (Message Format)

Toàn bộ thông điệp MCP được đóng gói bên trong kênh truyền tải nền tảng (WebSocket hoặc MQTT). Nội dung bên trong (`payload`) tuân thủ tuyệt đối chuẩn **[JSON-RPC 2.0](https://www.jsonrpc.org/specification)**.

### Cấu trúc tổng thể:

```json
{
  "session_id": "session_12345",
  "type": "mcp",
  "payload": {
    "jsonrpc": "2.0",
    "method": "...",
    "params": { ... },
    "id": 1,
    "result": { ... },
    "error": { ... }
  }
}
```

* `jsonrpc`: Luôn cố định là `"2.0"`.
* `method`: Tên phương thức được gọi (`"initialize"`, `"tools/list"`, `"tools/call"`,...).
* `params`: Tham số truyền vào dạng JSON Object.
* `id`: Định danh yêu cầu (Request ID), được gửi lặp lại trong gói phản hồi (Response) để khớp cặp request-response.
* `result`: Dữ liệu trả về khi thực thi thành công.
* `error`: Thông tin mã lỗi và thông báo lỗi khi thất bại.

---

## 3. Luồng Tương Tác Chi Tiết (5 Bước Chuẩn)

### Bước 1: Kết nối và Khai báo tính năng (Connection & Capability Announcement)
* **Thời điểm**: Ngay sau khi thiết bị khởi động và kết nối WebSocket thành công.
* **Chiều gửi**: Thiết bị ──▶ Backend.
* **Gói tin**: Thiết bị gửi bản tin `hello` chứa `"mcp": true` trong trường `features`.

```json
{
  "type": "hello",
  "version": 1,
  "features": {
    "mcp": true
  },
  "transport": "websocket",
  "session_id": "session_abc"
}
```

---

### Bước 2: Khởi tạo phiên MCP (`initialize`)
* **Thời điểm**: Backend nhận diện thiết bị có hỗ trợ MCP.
* **Chiều gửi**: Backend ──▶ Thiết bị (hoặc Cloud ──▶ MCP Server ViHand Grade).
* **Gói tin yêu cầu**:
```json
{
  "jsonrpc": "2.0",
  "method": "initialize",
  "params": {
    "capabilities": {
      "vision": {
        "url": "https://api.vihand.edu.vn/ocr/upload",
        "token": "token_xyz"
      }
    }
  },
  "id": 1
}
```
* **Phản hồi từ MCP Server**:
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "protocolVersion": "2024-11-05",
    "capabilities": {
      "tools": {}
    },
    "serverInfo": {
      "name": "ViHand Grade Dictation Server",
      "version": "2.0.0"
    },
    "instructions": "[System Prompt vai trò trợ giảng Alexa...]"
  }
}
```

---

### Bước 3: Khám phá danh sách công cụ (`tools/list`)
* **Thời điểm**: Khi Backend/LLM cần lấy danh sách các công cụ có thể gọi và cấu trúc dữ liệu đầu vào (Input Schema).
* **Chiều gửi**: Backend ──▶ MCP Server.
* **Gói tin yêu cầu**:
```json
{
  "jsonrpc": "2.0",
  "method": "tools/list",
  "params": {
    "cursor": "",
    "withUserTools": false
  },
  "id": 2
}
```
* **Phản hồi từ MCP Server**:
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {
    "tools": [
      {
        "name": "vihand.search_dictation_passage",
        "description": "Tìm bài chính tả trong kho SGK hoặc bài soạn trước",
        "inputSchema": {
          "type": "object",
          "properties": {
            "query": { "type": "string", "description": "Tên bài hoặc từ khóa" },
            "grade": { "type": "integer", "description": "Khối lớp (1-5)" }
          },
          "required": ["query"]
        }
      },
      {
        "name": "vihand.save_dictation_session",
        "description": "Lưu phiên đọc chính tả vào hệ thống",
        "inputSchema": {
          "type": "object",
          "properties": {
            "title": { "type": "string" },
            "passage": { "type": "string" }
          },
          "required": ["title", "passage"]
        }
      }
    ],
    "nextCursor": ""
  }
}
```

---

### Bước 4: Gọi thực thi công cụ (`tools/call`)
* **Thời điểm**: LLM quyết định cần gọi một công cụ cụ thể sau khi xử lý câu nói của người dùng.
* **Chiều gửi**: Backend ──▶ MCP Server.
* **Gói tin yêu cầu**:
```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "vihand.search_dictation_passage",
    "arguments": {
      "query": "Hạt gạo làng ta",
      "grade": 3
    }
  },
  "id": 3
}
```
* **Phản hồi khi thành công**:
```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "Tìm thấy bài: 'Hạt gạo làng ta' (Trần Đăng Khoa) - SGK Tiếng Việt 3 Tập 1. Nội dung: Hạt gạo làng ta, có vị phù sa..."
      }
    ],
    "isError": false
  }
}
```
* **Phản hồi khi gặp lỗi**:
```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "error": {
    "code": -32601,
    "message": "Không tìm thấy bài đọc yêu cầu trong kho dữ liệu"
  }
}
```

---

### Bước 5: Thông báo chủ động từ thiết bị (Notifications)
* **Thời điểm**: Thiết bị chủ động báo cáo trạng thái nội bộ (ví dụ: chuyển từ nghe sang phát, pin yếu,...).
* **Đặc điểm**: Thông báo dạng Notification **không có trường `id`** và Backend không cần gửi phản hồi.
```json
{
  "jsonrpc": "2.0",
  "method": "notifications/state_changed",
  "params": {
    "newState": "speaking",
    "oldState": "listening"
  }
}
```

---

## 4. Phân Biệt Hai Nhóm Công Cụ (Regular vs User-only Tools)

Trên thiết bị ESP32, MCP Server duy trì 2 nhóm công cụ riêng biệt:

1. **Công cụ thông thường (Regular Tools)**:
   - Đăng ký qua hàm `McpServer::AddTool`.
   - Được công khai trong danh sách `tools/list` mặc định.
   - Cho phép mô hình AI (LLM) tự do gọi tự động (chỉnh âm lượng, bật đèn, đọc trạng thái).
2. **Công cụ đặc quyền của người dùng (User-only Tools)**:
   - Đăng ký qua hàm `McpServer::AddUserOnlyTool`.
   - Bị ẩn trong danh sách mặc định; chỉ hiển thị khi Backend gửi kèm `params.withUserTools = true`.
   - Dùng cho các thao tác nhạy cảm cần sự can thiệp trực tiếp của con người (Khởi động lại máy `reboot`, cập nhật Firmware từ xa `OTA`, chụp ảnh màn hình debug...).

---

## 5. Sơ Đồ Trình Tự Tương Tác MCP

```text
Thiết bị ESP32 / Server                            Backend API (LLM Client)
       │                                                      │
       │════════════ Thiết lập kết nối WebSocket ═════════════│
       │                                                      │
       │── 1. Hello (features.mcp = true) ───────────────────▶│
       │                                                      │
       │◀── 2. initialize request { capabilities } ───────────┤
       │── initialize response { serverInfo, instructions } ─▶│
       │                                                      │
       │◀── 3. tools/list request { cursor: "" } ─────────────┤
       │── tools/list response { tools: [search, save...] } ─▶│
       │                                                      │
       │   ... Người dùng nói: "Alexa, đọc bài lớp 3" ...     │
       │   ... LLM phân tích và chọn Tool ...                 │
       │                                                      │
       │◀── 4. tools/call request { name: "search", args } ───┤
       │── tools/call response { content: "[Nội dung]" } ────▶│
       │                                                      │
       │   ... LLM phát âm nội dung bài đọc ra Loa ...        │
       │                                                      │
```
