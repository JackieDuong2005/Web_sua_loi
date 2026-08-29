# MCP Server — Lý thuyết tổng quan

## 1. MCP là gì?

**MCP (Model Context Protocol)** là giao thức mã nguồn mở do **Anthropic** phát triển (11/2024). Mục tiêu: tạo **chuẩn giao tiếp thống nhất** giữa LLM và các công cụ/dịch vụ bên ngoài — tương tự USB-C chuẩn hóa cổng kết nối.

> **Tóm gọn:** MCP là "ngôn ngữ chung" để LLM gọi hàm/API bên ngoài một cách có cấu trúc, an toàn và nhất quán.

---

## 2. Vấn đề MCP giải quyết

Trước MCP, mỗi ứng dụng AI tích hợp công cụ theo cách riêng:
- OpenAI → **Function Calling** (JSON schema riêng)
- Anthropic → **Tool Use** (XML riêng)
- LangChain, AutoGen → mỗi framework một chuẩn

**MCP chuẩn hóa:**

```
Trước MCP:  LLM-A ←→(format A)←→ Tool    Sau MCP: LLM-A ←→ [MCP] ←→ Tool
            LLM-B ←→(format B)←→ Tool             LLM-B ←→ [MCP] ←→ Tool
```

Một MCP Server viết một lần → tương thích mọi LLM hỗ trợ MCP.

---

## 3. Kiến trúc — 3 thành phần

| Vai trò | Tên gọi | Trong ViHand Grade |
|---------|---------|-------------------|
| Ứng dụng chứa LLM | **MCP Host** | xiaozhi.me Cloud |
| Quản lý kết nối | **MCP Client** | (nằm trong Host) |
| Cung cấp công cụ | **MCP Server** | `mcp_service/main.py` |

```
┌──────────────────────┐
│   MCP Host           │  xiaozhi.me Cloud (LLM)
│   ┌──────────────┐   │
│   │  MCP Client  │   │
│   └──────┬───────┘   │
└──────────┼───────────┘
           │ JSON-RPC 2.0 over WebSocket
┌──────────┴───────────┐
│   MCP Server         │  mcp_service/main.py :8200
│   • Tools            │
│   • Resources        │
│   • Prompts          │
└──────────────────────┘
```

---

## 4. Giao thức — JSON-RPC 2.0

MCP dùng **JSON-RPC 2.0** làm định dạng tin nhắn.

### Request mẫu
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "vihand.save_dictation_session",
    "arguments": {
      "title": "Nghe viết: Mùa hè",
      "passage": "Mùa hè đến rồi..."
    }
  }
}
```

### Response mẫu
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [{"type": "text", "text": "Đã lưu thành công!"}],
    "isError": false
  }
}
```

### Các method chuẩn

| Method | Hướng | Mô tả |
|--------|-------|-------|
| `initialize` | Host→Server | Handshake, trao đổi capabilities |
| `tools/list` | Host→Server | Lấy danh sách công cụ |
| `tools/call` | Host→Server | Gọi thực thi một công cụ |
| `notifications/*` | Server→Host | Thông báo không cần reply |
| `ping` | Host→Server | Keep-alive |

---

## 5. Transport — Phương thức truyền tải

| Transport | Mô tả | Dùng khi |
|-----------|-------|---------|
| **stdio** | stdin/stdout | Server local, spawn bởi Host |
| **HTTP + SSE** | HTTP với Server-Sent Events | Web service |
| **WebSocket** | Kết nối hai chiều liên tục | Real-time, server từ xa ✅ ViHand Grade |

---

## 6. Vòng đời kết nối

```
1. CONNECT     → Server mở WebSocket đến Host
2. INITIALIZE  → Host gửi initialize
               ← Server trả capabilities + instructions (Role Prompt)
3. TOOLS/LIST  → Host hỏi danh sách tool
               ← Server trả [save_dictation, get_sessions]
4. (Runtime)   → Host gửi tools/call khi LLM quyết định dùng tool
               ← Server thực thi → trả kết quả text
5. PING        → Host ping định kỳ để giữ kết nối
6. DISCONNECT  → Kết nối đóng → Server tự reconnect (exponential backoff)
```

---

## 7. Khái niệm "Tool"

Một **Tool** = hàm có thể được LLM gọi từ xa. Mỗi tool gồm:

| Thành phần | Mô tả |
|-----------|-------|
| `name` | Định danh duy nhất |
| `description` | LLM đọc để quyết định khi nào dùng (**cực kỳ quan trọng**) |
| `inputSchema` | JSON Schema tham số đầu vào |

```json
{
  "name": "vihand.save_dictation_session",
  "description": "CHỈ gọi sau khi GV xác nhận lưu bài...",
  "inputSchema": {
    "type": "object",
    "properties": {
      "title": {"type": "string"},
      "passage": {"type": "string"}
    },
    "required": ["title", "passage"]
  }
}
```

---

## 8. Nghịch lý: MCP Server là WebSocket Client

> **Hay nhầm lẫn:** MCP Server **chủ động kết nối** vào endpoint của Host — không phải chờ được kết nối đến.

| Thuật ngữ | Vai trò WebSocket |
|-----------|-----------------|
| MCP Server (`main.py`) | **WS Client** — kết nối đến `wss://api.xiaozhi.me/mcp/` |
| xiaozhi.me Cloud | **WS Server** — lắng nghe kết nối |

---

## 9. Tài liệu tham khảo

- [MCP Specification](https://spec.modelcontextprotocol.io) — Anthropic
- [MCP GitHub](https://github.com/modelcontextprotocol/specification)
- [JSON-RPC 2.0](https://www.jsonrpc.org/specification)
