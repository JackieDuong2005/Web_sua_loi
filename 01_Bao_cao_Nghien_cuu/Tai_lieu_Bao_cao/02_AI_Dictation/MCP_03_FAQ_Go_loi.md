# MCP Server — Hỏi đáp & Gỡ lỗi thường gặp

## Phần A — Câu hỏi lý thuyết

---

### Q1: Tại sao MCP Server lại là WebSocket **Client** chứ không phải Server?

**A:** Đây là thiết kế đặc thù của xiaozhi.me.

Thông thường trong kiến trúc web, "server" là bên lắng nghe kết nối. Nhưng trong MCP của xiaozhi.me:

- **xiaozhi.me Cloud** cấp một endpoint cố định: `wss://api.xiaozhi.me/mcp/?token=...`
- **MCP Server của bạn** chủ động kết nối vào endpoint đó
- Sau khi kết nối, xiaozhi.me mới bắt đầu gửi JSON-RPC vào connection đó

**Lý do thiết kế này:**
1. MCP Server có thể nằm sau NAT/Firewall (mạng nội bộ trường học) mà không cần mở port
2. Không cần IP tĩnh — server tự tìm đến Cloud
3. Cloud quản lý tập trung tất cả kết nối từ các thiết bị Xiaozhi trên toàn thế giới

```
NAT/Firewall của trường học
        ↓
[MCP Server] ──────────────────────→ [xiaozhi.me Cloud]
              kết nối chủ động ra ngoài
              (outbound, không bị block)
```

---

### Q2: `ROLE_INSTRUCTIONS` gửi trong `initialize` có thực sự được LLM sử dụng không?

**A:** Có, đây là tính năng chính thức của MCP spec.

Trường `instructions` trong `initialize` response được MCP spec định nghĩa là:
> *"Instructions describing how to use the server and its capabilities. This can be used by clients to improve the LLM's understanding of available tools, resources, etc."*

Khi xiaozhi.me nhận được `instructions`, nó sẽ đưa nội dung này vào **system context** của LLM — tương tự như system prompt nhưng đến từ server, không phải từ cấu hình tay trên dashboard.

**Ưu điểm:**
- Role tự động cập nhật khi restart server — không cần vào dashboard sửa
- Role được version-control cùng code dự án
- Có thể thay đổi role theo môi trường (dev/prod) qua biến môi trường

---

### Q3: Tại sao tool description lại viết không dấu tiếng Việt?

**A:** Để đảm bảo LLM hiểu chính xác điều kiện kích hoạt.

```python
"description": (
    "Luu mot buoi doc chinh ta vao he thong ViHand Grade. "
    "Quy tac quan trong: "
    "1) SAU KHI doc xong doan van, LUON HOI giao vien..."
)
```

Lý do viết không dấu trong `description`:
1. Một số LLM xử lý UTF-8 tiếng Việt không ổn định trong metadata JSON
2. Description được LLM dùng để **phân tích ngữ nghĩa** — ASCII đơn giản hơn để parse
3. `ROLE_INSTRUCTIONS` (gửi qua `initialize`) đã viết đầy đủ tiếng Việt và cung cấp ngữ cảnh phong phú hơn

---

### Q4: Exponential backoff trong reconnect hoạt động như thế nào?

**A:** Khi kết nối WebSocket bị ngắt, server không retry liên tục ngay mà tăng dần thời gian chờ:

```python
reconnect_delay = 5  # khởi đầu 5 giây

while True:
    try:
        # ... kết nối và xử lý ...
        reconnect_delay = 5  # reset về 5s khi kết nối thành công
    except:
        pass

    await asyncio.sleep(reconnect_delay)
    reconnect_delay = min(reconnect_delay * 2, 60)  # nhân đôi, tối đa 60s
```

| Lần thử | Thời gian chờ |
|---------|--------------|
| 1 | 5 giây |
| 2 | 10 giây |
| 3 | 20 giây |
| 4 | 40 giây |
| 5+ | 60 giây (giới hạn tối đa) |

**Tại sao cần exponential backoff?**
- Tránh spam kết nối khi server đang quá tải
- Giảm bandwidth khi mạng không ổn định
- Tự động phục hồi mà không cần can thiệp thủ công

---

### Q5: `ping_interval=None` nghĩa là gì? Kết nối có bị timeout không?

**A:** Đây là cài đặt có chủ ý.

Thư viện `websockets` của Python có tính năng tự động gửi ping mỗi N giây để giữ kết nối. Tuy nhiên, xiaozhi.me **tự quản lý keep-alive** theo cách riêng của nó (gửi `{"method": "ping"}` theo giao thức MCP).

Nếu để `ping_interval` mặc định, sẽ có **2 cơ chế ping chạy song song** → xung đột → kết nối bị ngắt.

```python
websockets.connect(
    endpoint,
    ping_interval=None,   # TẮT auto-ping của thư viện
    ping_timeout=None,    # TẮT timeout khi không nhận pong
)
```

MCP Server xử lý ping của xiaozhi.me trong `handle_jsonrpc`:
```python
if method == "ping":
    return {"jsonrpc": "2.0", "id": req_id, "result": {}}
```

---

## Phần B — Gỡ lỗi thường gặp

---

### ❌ Lỗi: `MCP_ENDPOINT chưa được cấu hình`

```
[MCP] CANH BAO: MCP_ENDPOINT chua duoc cau hinh!
```

**Nguyên nhân:** File `.env` chưa tồn tại hoặc biến `MCP_ENDPOINT` trống.

**Giải quyết:**
```bash
# 1. Vào xiaozhi.me → Thiết bị → MCP Settings → Copy URL
# 2. Tạo file mcp_service/.env:
MCP_ENDPOINT=wss://api.xiaozhi.me/mcp/?token=eyJhbGci...
VIHAND_API_URL=http://localhost:3000
```

---

### ❌ Lỗi: `Khong ket noi duoc Next.js (port 3000)`

```
[LOI] Khong ket noi duoc Next.js (port 3000). Hay chay start_all.bat.
```

**Nguyên nhân:** Next.js web server chưa chạy.

**Giải quyết:**
```bash
# Chạy trước Next.js:
npm run dev
# Sau đó mới chạy MCP Server:
python mcp_service/main.py
```

Hoặc dùng `start_all.bat` để khởi động cùng lúc.

---

### ❌ Lỗi: `Ket noi bi ngat: ... Thu lai sau Xs`

```
[WS] Ket noi bi ngat: sent 1011 (internal error). Thu lai sau 10s...
```

**Nguyên nhân có thể:**
1. Token trong `MCP_ENDPOINT` đã hết hạn → lấy token mới từ xiaozhi.me
2. Mạng không ổn định → server tự reconnect, chờ thêm
3. xiaozhi.me bảo trì → chờ vài phút

**Kiểm tra token:**
```bash
# Token là JWT, decode phần payload để xem exp:
echo "eyJ..." | python3 -c "
import sys, base64, json
token = sys.stdin.read().strip().split('.')[1]
padded = token + '=' * (4 - len(token) % 4)
print(json.loads(base64.b64decode(padded)))
"
# Xem trường 'exp' — timestamp hết hạn
```

---

### ❌ Tool gọi nhưng không lưu được database

**Triệu chứng:** MCP Server log "Da luu thanh cong" nhưng không thấy dữ liệu trên web.

**Kiểm tra:**
```bash
# Test trực tiếp Next.js API:
curl -X POST http://localhost:3000/api/dictation/sessions \
  -H "Content-Type: application/json" \
  -d '{"title":"Test","passage":"Nội dung bài..."}'
# Kỳ vọng: HTTP 201 {"session": {...}}
```

**Nếu Next.js trả lỗi 400:** thiếu `title` hoặc `passage`
**Nếu Next.js trả lỗi 500:** kiểm tra database `prisma/vihand.db` có bị corrupt không

---

### ❌ LLM lưu bài khi giáo viên chưa xác nhận

**Nguyên nhân:** `description` của tool chưa đủ rõ ràng, hoặc `ROLE_INSTRUCTIONS` chưa được áp dụng.

**Kiểm tra:**
```bash
# Test HTTP endpoint xem initialize response có instructions không:
curl -X POST http://localhost:8200/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}'
# Kỳ vọng: result.instructions chứa ROLE_INSTRUCTIONS
```

**Giải pháp thêm:** Dán System Prompt vào dashboard xiaozhi.me (Thiết bị → Character) để có 2 lớp bảo vệ.

---

### ❌ Lỗi encoding tiếng Việt trên Windows

```
UnicodeEncodeError: 'charmap' codec can't encode character
```

**Nguyên nhân:** Windows console mặc định dùng CP1252, không hỗ trợ đầy đủ UTF-8.

**Giải quyết** (đã có sẵn trong code):
```python
if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
```

Hoặc chạy với:
```bash
set PYTHONIOENCODING=utf-8
python main.py
```

---

## Phần C — Kiểm thử nhanh (Checklist)

```bash
# 1. Kiểm tra server đang chạy
curl http://localhost:8200/health

# 2. Kiểm tra tools/list
curl -X POST http://localhost:8200/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'

# 3. Test lưu phiên giả
curl -X POST http://localhost:8200/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"vihand.save_dictation_session","arguments":{"title":"Test MCP","passage":"Đây là bài kiểm tra kết nối MCP.","className":"3A"}}}'

# 4. Test xem lịch sử
curl -X POST http://localhost:8200/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"vihand.get_dictation_sessions","arguments":{"limit":5}}}'
```

**Kết quả mong đợi cho từng bước:**
1. `{"status":"ok","xiaozhi_configured":true,...}`
2. `{"result":{"tools":[...2 tools...]}}`
3. `{"result":{"content":[{"text":"Da luu buoi doc chinh ta 'Test MCP'..."}]}}`
4. `{"result":{"content":[{"text":"1 buoi gan nhat:\n1. Test MCP..."}]}}`
