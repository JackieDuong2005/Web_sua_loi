"""
ViHand Grade — MCP Server cho Xiaozhi AI
==========================================
Theo đúng kiến trúc thực tế của xiaozhi.me:

  xiaozhi.me cấp cho bạn 1 WebSocket endpoint:
    wss://api.xiaozhi.me/mcp/?token=...

  Server này KẾT NỐI VÀO endpoint đó (là WS client).
  xiaozhi.me cloud sau đó gửi JSON-RPC vào:
    → initialize
    → tools/list
    → tools/call (khi LLM muốn lưu chính tả)

  Server xử lý và trả kết quả, gọi Next.js API để lưu DB.

Flow:
  [Xiaozhi Robot] → [xiaozhi.me Cloud LLM]
       (nói "đọc bài chính tả...")      ↕ WebSocket
                              [MCP Server này] ← kết nối vào wss://api.xiaozhi.me/mcp/?token=...
                                      ↓ REST
                              [Next.js :3000] → [SQLite DB]

Cấu hình:
  1. Vào xiaozhi.me → Thiết bị → MCP Settings → MCP Endpoint → Copy URL
  2. Tạo file mcp_service/.env:
       MCP_ENDPOINT=wss://api.xiaozhi.me/mcp/?token=eyJhbGci...
       VIHAND_API_URL=http://localhost:3000

Cài đặt:
  pip install -r requirements.txt

Chạy:
  python main.py
"""

import asyncio
import httpx
import json
import logging
import os
import sys

import websockets
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager

# ============================================================
# LOGGING
# ============================================================
# Fix Windows console encoding
if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger("mcp")

# ============================================================
# CẤU HÌNH
# ============================================================
VIHAND_API_URL = os.getenv("VIHAND_API_URL", "http://localhost:3000")
MCP_ENDPOINT   = os.getenv("MCP_ENDPOINT", "")  # wss://api.xiaozhi.me/mcp/?token=...

# Đọc thêm từ file .env trong cùng thư mục
_env_file = os.path.join(os.path.dirname(__file__), ".env")
if os.path.exists(_env_file):
    with open(_env_file, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip())
    VIHAND_API_URL = os.getenv("VIHAND_API_URL", VIHAND_API_URL)
    MCP_ENDPOINT   = os.getenv("MCP_ENDPOINT",   MCP_ENDPOINT)

# ============================================================
# ROLE INSTRUCTIONS — gửi cho LLM qua initialize response
# ============================================================
ROLE_INSTRUCTIONS = """
# MISSION
Bạn là Alexa, trợ lý AI chuyên biệt hỗ trợ giáo viên tiểu học thuộc hệ thống ViHand Grade. Nhiệm vụ tối thượng của bạn là giúp giáo viên tổ chức các buổi kiểm tra nghe viết chính tả ngay tại lớp một cách trơn tru, tương tác tự nhiên để lấy yêu cầu, và tự động hóa quy trình lưu trữ.

# IDENTITY & TONE
- Tên gọi: Alexa (Wake word: "Alexa"). Xưng hô: "em" hoặc "Alexa", gọi giáo viên là "thầy/cô", gọi học sinh là "các em".
- Tính cách: Nhẹ nhàng, kiên nhẫn, thân thiện, mang phong cách của một trợ giảng sư phạm.
- Cách nói chuyện: Ngắn gọn, thực tế, đúng trọng tâm.

# CORE CAPABILITIES & WORKFLOW
Bạn PHẢI tuân thủ quy trình 3 bước sau đây trong mọi buổi chính tả:

**Bước 1: Thu thập thông tin (TRƯỚC KHI ĐỌC)**
Nếu giáo viên chỉ ra lệnh chung chung (VD: "Alexa, chuẩn bị đọc chính tả"), bạn CHƯA ĐƯỢC soạn hay đọc ngay. Hãy chủ động đặt câu hỏi để làm rõ:
1. Bài chính tả gồm bao nhiêu câu?
2. Chủ đề hoặc nội dung là gì?
3. Dành cho học sinh lớp mấy?
4. Cần đọc lại bao nhiêu lần?
5. Tốc độ đọc nhanh hay chậm?

**Bước 2: Soạn bài & Đọc bài**
- Sáng tác đoạn văn chuẩn sư phạm dựa trên thông tin đã thu thập (nếu giáo viên không cung cấp sẵn nội dung).
- Sử dụng các thẻ nhịp độ như [Đọc chậm], [Đọc bình thường], [Nghỉ 10 giây] phù hợp yêu cầu.
- Đọc đủ số lần giáo viên đã yêu cầu.
- Xác nhận học sinh viết xong trước khi sang Bước 3.

**Bước 3: Nhắc nhở lưu trữ hoặc đọc tiếp (SAU KHI ĐỌC — RẤT QUAN TRỌNG)**
Sau khi kết thúc bài đọc, bạn BẮT BUỘC phải hỏi:
"Thầy/cô có muốn em lưu bài chính tả này vào hệ thống ViHand Grade không, hay thầy/cô muốn em đọc thêm bài nữa ạ?"

# TOOL CALLING RULES
1. vihand.save_dictation_session — CHỈ gọi khi giáo viên xác nhận lưu ("Có", "Lưu lại", "Ok lưu đi", "Được", "Ừ"). KHÔNG lưu tự động khi chưa xác nhận. Ngoại lệ: lưu ngay nếu lệnh đầu vào đã nói rõ "đọc và lưu" hoặc "lưu buổi học vừa rồi".
2. vihand.get_dictation_sessions — gọi khi giáo viên hỏi lịch sử bài đã đọc.

# MỨC ĐỘ BÀI THEO KHỐI LỚP
- Lớp 1–2: 2–3 câu ngắn, từ quen thuộc, không dấu hỏi/ngã phức tạp.
- Lớp 3: 3–4 câu, bắt đầu có dấu hỏi/ngã, câu ghép đơn giản.
- Lớp 4–5: 4–6 câu, từ láy, thành ngữ ngắn, từ Hán Việt cơ bản.

# ĐIỀU ALEXA KHÔNG ĐƯỢC LÀM
- Không soạn/đọc bài ngay khi lệnh chưa đủ thông tin — phải hỏi trước.
- Không lưu bài khi giáo viên chưa xác nhận.
- Không chia sẻ điểm số học sinh với người ngoài.
- Không xóa dữ liệu đã lưu trong hệ thống.
- Không chỉnh sửa điểm số (chỉ giáo viên có quyền).
""".strip()

# ============================================================
# DANH SÁCH TOOLS (chuẩn MCP inputSchema)
# ============================================================
TOOLS = [
    {
        "name": "vihand.save_dictation_session",
        "description": (
            "Luu mot buoi doc chinh ta vao he thong ViHand Grade. "
            "Quy tac quan trong: "
            "1) SAU KHI doc xong doan van, LUON HOI giao vien: "
            "   'Thay/co co muon em luu bai chinh ta nay vao ViHand Grade khong?' "
            "2) Chi goi tool NAY khi giao vien xac nhan ('co', 'luu lai', 'ok', 'uu'). "
            "3) Goi ngay khong can hoi neu giao vien da noi: "
            "   'doc va luu', 'luu buoi hoc vua roi', 'luu lai di'. "
            "Phu hop voi hoc sinh tieu hoc lop 1-5."
        ),
        "inputSchema": {
            "type": "object",
            "properties": {
                "title": {
                    "type": "string",
                    "description": (
                        "Tieu de bai chinh ta. "
                        "VD: 'Nghe viet: Mua he' hoac 'Chinh ta lop 3A - Dong que'"
                    )
                },
                "passage": {
                    "type": "string",
                    "description": (
                        "Toan bo noi dung doan van da doc cho hoc sinh. "
                        "Neu Alexa tu soan bai, dien noi dung do vao day. "
                        "Phai day du, chinh xac nhu da doc."
                    )
                },
                "className": {
                    "type": "string",
                    "description": (
                        "Ten lop hoc. VD: '1A', '2B', '3A1', '4C', '5D'. "
                        "De trong neu giao vien chua noi."
                    )
                },
                "teacherName": {
                    "type": "string",
                    "description": "Ten giao vien. De trong neu khong biet."
                },
                "summary": {
                    "type": "string",
                    "description": (
                        "Tom tat ngan buoi doc. "
                        "VD: 'Alexa tu soan bai, doc 2 lan, lop 3A, toc do cham'"
                    )
                },
                "logs": {
                    "type": "string",
                    "description": (
                        "Lich su hoi thoai day du trong buoi hoc, dang JSON string. "
                        "speaker chi nhan 3 gia tri: 'teacher', 'alexa', 'student'. "
                        'VD: [{"speaker":"teacher","content":"Alexa, soan bai chinh ta lop 3"},'
                        '{"speaker":"alexa","content":"Vang thay/co, em soan bai..."},'
                        '{"speaker":"alexa","content":"[Noi dung doan van]"},'
                        '{"speaker":"teacher","content":"Luu lai di"},'
                        '{"speaker":"alexa","content":"Em da luu thanh cong!"}]'
                    )
                }
            },
            "required": ["title", "passage"]
        }
    },
    {
        "name": "vihand.get_dictation_sessions",
        "description": (
            "Xem danh sach cac buoi doc chinh ta da luu trong ViHand Grade. "
            "Kich hoat khi giao vien hoi: "
            "'da doc bai gi roi?', 'lich su chinh ta', "
            "'hom nay doc bai gi?', 'lop X hoc bai nao?', "
            "'tuan nay lop Y lam bai nao roi?'"
        ),
        "inputSchema": {
            "type": "object",
            "properties": {
                "className": {
                    "type": "string",
                    "description": "Loc theo lop. De trong = tat ca cac lop."
                },
                "limit": {
                    "type": "integer",
                    "description": "So buoi toi da can lay (mac dinh 10, toi da 50)"
                }
            }
        }
    }
]


# ============================================================
# XỬ LÝ TOOL CALLS → gọi Next.js API
# ============================================================
async def tool_save_dictation(args: dict) -> str:
    title      = args.get("title", "")
    passage    = args.get("passage", "")
    className  = args.get("className", "")
    teacherName = args.get("teacherName", "")
    summary    = args.get("summary", "")
    logs_raw   = args.get("logs", "[]")

    if not title or not passage:
        return "[LOI] Thieu tieu de hoac noi dung doan van"

    try:
        parsed_logs = json.loads(logs_raw) if isinstance(logs_raw, str) else logs_raw
    except json.JSONDecodeError:
        parsed_logs = []

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            r = await client.post(
                f"{VIHAND_API_URL}/api/dictation/sessions",
                json={
                    "title": title, "passage": passage,
                    "className": className, "teacherName": teacherName,
                    "source": "mcp",       # Phiên đọc từ Trợ lý MCP Cloud
                    "deviceId": "",        # MCP không có thiết bị vật lý
                    "status": "completed", "summary": summary,
                    "logs": parsed_logs,
                },
            )
        if r.status_code == 201:
            s = r.json().get("session", {})
            logger.info(f"[SAVE] Da luu phien '{title}' ID={s.get('id')}")
            return (
                f"Da luu buoi doc chinh ta '{title}' thanh cong!\n"
                f"Lop: {className or 'chua xac dinh'} | {len(s.get('logs', []))} luot hoi thoai\n"
                f"Xem lai: http://localhost:3000/teacher/dictation"
            )
        return f"[LOI] API tra ve {r.status_code}: {r.text}"
    except httpx.ConnectError:
        return "[LOI] Khong ket noi duoc Next.js (port 3000). Hay chay start_all.bat."
    except Exception as e:
        return f"[LOI] {e}"


async def tool_get_sessions(args: dict) -> str:
    try:
        params = {"limit": str(args.get("limit", 10))}
        if args.get("className"):
            params["className"] = args["className"]
        async with httpx.AsyncClient(timeout=10.0) as client:
            r = await client.get(f"{VIHAND_API_URL}/api/dictation/sessions", params=params)
        sessions = r.json().get("sessions", []) if r.status_code == 200 else []
        if not sessions:
            return "Chua co buoi doc chinh ta nao."
        lines = [f"{len(sessions)} buoi gan nhat:"]
        for i, s in enumerate(sessions, 1):
            class_info = f" - Lop {s['className']}" if s.get("className") else ""
            lines.append(f"{i}. {s['title']}{class_info} ({s.get('createdAt','')[:10]})")
        return "\n".join(lines)
    except Exception as e:
        return f"[LOI] {e}"


# ============================================================
# XỬ LÝ JSON-RPC (dùng chung cho cả WS và HTTP)
# ============================================================
async def handle_jsonrpc(body: dict) -> dict | None:
    method = body.get("method", "")
    req_id = body.get("id")
    params = body.get("params", {})

    # Notifications — không cần reply
    if method.startswith("notifications/"):
        logger.info(f"[RPC] Notification: {method}")
        return None

    logger.info(f"[RPC] {method} (id={req_id})")

    if method == "initialize":
        return {
            "jsonrpc": "2.0", "id": req_id,
            "result": {
                "protocolVersion": "2024-11-05",
                "capabilities": {"tools": {}},
                "serverInfo": {"name": "ViHand Grade Dictation", "version": "2.0.0"},
                "instructions": ROLE_INSTRUCTIONS,
            },
        }

    if method == "tools/list":
        return {
            "jsonrpc": "2.0", "id": req_id,
            "result": {"tools": TOOLS, "nextCursor": ""},
        }

    if method == "tools/call":
        name = params.get("name", "")
        args = params.get("arguments", {})
        logger.info(f"[TOOL] Calling: {name}")
        try:
            if name == "vihand.save_dictation_session":
                text = await tool_save_dictation(args)
            elif name == "vihand.get_dictation_sessions":
                text = await tool_get_sessions(args)
            else:
                return {
                    "jsonrpc": "2.0", "id": req_id,
                    "error": {"code": -32601, "message": f"Unknown tool: {name}"},
                }
            return {
                "jsonrpc": "2.0", "id": req_id,
                "result": {"content": [{"type": "text", "text": text}], "isError": False},
            }
        except Exception as e:
            return {
                "jsonrpc": "2.0", "id": req_id,
                "result": {"content": [{"type": "text", "text": str(e)}], "isError": True},
            }

    # ping - xiaozhi.me dung de keep-alive, phai tra loi OK
    if method == "ping":
        logger.info("[RPC] ping -> pong")
        return {"jsonrpc": "2.0", "id": req_id, "result": {}}

    # Unknown method - tra loi OK de tranh bi ngat ket noi
    logger.warning(f"[RPC] Unknown method '{method}' -> returning empty OK")
    return {"jsonrpc": "2.0", "id": req_id, "result": {}}


# ============================================================
# WEBSOCKET CLIENT — kết nối vào wss://api.xiaozhi.me/mcp/...
# ============================================================
async def connect_to_xiaozhi(endpoint: str):
    """
    Ket noi vao MCP Endpoint cua xiaozhi.me (la WS client).
    xiaozhi.me gui JSON-RPC vao connection nay:
      initialize -> tools/list -> tools/call
    """
    reconnect_delay = 5

    while True:
        try:
            logger.info("[WS] Dang ket noi xiaozhi.me MCP endpoint...")
            async with websockets.connect(
                endpoint,
                ping_interval=None,   # tat ping cua websockets, de xiaozhi.me tu quan ly keep-alive
                ping_timeout=None,
                open_timeout=15,
                max_size=10 * 1024 * 1024,  # 10MB
            ) as ws:
                logger.info("[WS] Da ket noi xiaozhi.me! Cho lenh tu LLM...")
                reconnect_delay = 5

                async for raw_msg in ws:
                    try:
                        msg = json.loads(raw_msg)
                    except json.JSONDecodeError:
                        logger.warning(f"[WS] Khong parse duoc message: {str(raw_msg)[:100]}")
                        continue

                    # xiaozhi.me co the boc trong {type:'mcp', payload:{...}}
                    # hoac gui bare JSON-RPC truc tiep
                    if msg.get("type") == "mcp" and "payload" in msg:
                        rpc_body = msg["payload"]
                        session_id = msg.get("session_id", "")
                    else:
                        rpc_body = msg
                        session_id = ""

                    result = await handle_jsonrpc(rpc_body)

                    if result is None:
                        continue

                    if session_id:
                        response = {
                            "session_id": session_id,
                            "type": "mcp",
                            "payload": result,
                        }
                    else:
                        response = result

                    await ws.send(json.dumps(response, ensure_ascii=False))
                    logger.info(f"[WS] Tra loi: {rpc_body.get('method')} (id={result.get('id')})")

        except websockets.exceptions.ConnectionClosedOK:
            logger.info("[WS] xiaozhi.me dong ket noi (OK). Thu lai sau 5s...")
        except websockets.exceptions.ConnectionClosedError as e:
            logger.warning(f"[WS] Ket noi bi ngat: {e}. Thu lai sau {reconnect_delay}s...")
        except OSError as e:
            logger.warning(f"[WS] Loi mang: {e}. Thu lai sau {reconnect_delay}s...")
        except Exception as e:
            logger.error(f"[WS] Loi: {e}. Thu lai sau {reconnect_delay}s...")

        await asyncio.sleep(reconnect_delay)
        reconnect_delay = min(reconnect_delay * 2, 60)


# ============================================================
# FASTAPI — HTTP endpoint để test cục bộ + health check
# ============================================================
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("=" * 60)
    logger.info("[MCP] ViHand Grade - MCP Server cho Xiaozhi")
    logger.info(f"[MCP] ViHand API: {VIHAND_API_URL}")

    if MCP_ENDPOINT:
        short = MCP_ENDPOINT[:55] + "..."
        logger.info(f"[MCP] Xiaozhi endpoint: {short}")
        task = asyncio.create_task(connect_to_xiaozhi(MCP_ENDPOINT))
    else:
        logger.warning("[MCP] CANH BAO: MCP_ENDPOINT chua duoc cau hinh!")
        logger.info("[MCP] Buoc 1: Vao xiaozhi.me > Thiet bi > MCP Settings > MCP Endpoint > Copy URL")
        logger.info("[MCP] Buoc 2: Tao file mcp_service/.env:")
        logger.info("[MCP]         MCP_ENDPOINT=wss://api.xiaozhi.me/mcp/?token=...")
        task = None

    logger.info("[MCP] HTTP test endpoint: http://localhost:8200/mcp")
    logger.info("=" * 60)
    yield
    if task:
        task.cancel()


app = FastAPI(title="ViHand Grade MCP", version="1.0.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


@app.get("/health")
def health():
    return {
        "status": "ok",
        "xiaozhi_configured": bool(MCP_ENDPOINT),
        "vihand_api": VIHAND_API_URL,
        "tools": [t["name"] for t in TOOLS],
    }


@app.post("/mcp")
async def http_mcp(request_data: dict):
    """HTTP endpoint để test cục bộ (không cần xiaozhi.me)"""
    result = await handle_jsonrpc(request_data)
    if result is None:
        return JSONResponse({}, status_code=204)
    return JSONResponse(result)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8200, log_level="warning")
