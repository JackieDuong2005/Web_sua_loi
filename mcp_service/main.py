"""
ViHand Grade — MCP Service cho Xiaozhi AI Chatbot
Kết nối đến WSS endpoint của xiaozhi.me, đăng ký tools đọc chính tả.

Cách dùng:
  1. Copy file .env.example thành .env
  2. Dán Endpoint URL từ xiaozhi.me vào .env (XIAOZHI_WSS_URL=wss://...)  
  3. Chạy: python main.py

Tìm URL tại: xiaozhi.me → Agent → MCP Endpoint → Copy
"""

import asyncio
import json
import logging
import os
import sys
import httpx
import websockets
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger("mcp_dictation")

# ============================================================
# CẤU HÌNH
# ============================================================
XIAOZHI_WSS_URL = os.getenv("XIAOZHI_WSS_URL", "")
VIHAND_API_URL  = os.getenv("VIHAND_API_URL", "http://localhost:3000")

# ============================================================
# TOOL IMPLEMENTATIONS
# ============================================================
async def _save_dictation_session(
    title: str,
    passage: str,
    className: str = "",
    teacherName: str = "",
    summary: str = "",
    logs_str: str = "[]",
) -> str:
    try:
        try:
            parsed_logs = json.loads(logs_str) if isinstance(logs_str, str) else logs_str
        except json.JSONDecodeError:
            parsed_logs = []

        payload = {
            "title": title,
            "passage": passage,
            "className": className,
            "teacherName": teacherName,
            "status": "completed",
            "summary": summary,
            "logs": parsed_logs,
        }

        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(f"{VIHAND_API_URL}/api/dictation/sessions", json=payload)

        if resp.status_code == 201:
            data = resp.json()
            sid = data.get("session", {}).get("id", "?")
            cnt = len(data.get("session", {}).get("logs", []))
            logger.info(f"✅ Đã lưu phiên '{title}' (ID: {sid}, {cnt} logs)")
            return (
                f"✅ Đã lưu phiên đọc chính tả '{title}' thành công! "
                f"(ID: {sid}, {cnt} lượt hội thoại). "
                "Giáo viên xem lại tại trang 'Đọc chính tả' trên ViHand Grade."
            )
        return f"❌ Lỗi API: {resp.status_code} — {resp.text}"

    except httpx.ConnectError:
        return "❌ Không kết nối được đến ViHand Grade. Web app có đang chạy không?"
    except Exception as e:
        logger.error(f"❌ Lỗi save_session: {e}")
        return f"❌ Lỗi: {str(e)}"


async def _get_dictation_sessions(className: str = "", limit: int = 10) -> str:
    try:
        params = {"limit": str(limit)}
        if className:
            params["className"] = className

        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(f"{VIHAND_API_URL}/api/dictation/sessions", params=params)

        if resp.status_code == 200:
            sessions = resp.json().get("sessions", [])
            if not sessions:
                return "📋 Chưa có phiên đọc chính tả nào được lưu."
            lines = [f"📋 {len(sessions)} phiên đọc chính tả gần nhất:\n"]
            for i, s in enumerate(sessions, 1):
                ci = f" — Lớp {s['className']}" if s.get("className") else ""
                lines.append(f"{i}. 📖 {s['title']}{ci} ({s.get('createdAt','')[:10]})")
            return "\n".join(lines)
        return f"❌ Lỗi: {resp.text}"

    except httpx.ConnectError:
        return "❌ Không kết nối được đến ViHand Grade."
    except Exception as e:
        return f"❌ Lỗi: {str(e)}"


# ============================================================
# MCP TOOL SCHEMAS
# ============================================================
TOOLS = [
    {
        "name": "save_dictation_session",
        "description": (
            "Lưu phiên đọc chính tả vào hệ thống ViHand Grade. "
            "Gọi tool này SAU KHI đã đọc xong đoạn văn chính tả cho học sinh. "
            "Ghi lại toàn bộ hội thoại (giáo viên yêu cầu, bạn đọc gì) vào logs."
        ),
        "inputSchema": {
            "type": "object",
            "properties": {
                "title":       {"type": "string", "description": "Tiêu đề bài đọc, VD: 'Nghe viết: Ai có lỗi'"},
                "passage":     {"type": "string", "description": "Toàn bộ nội dung đoạn văn chính tả"},
                "className":   {"type": "string", "description": "Tên lớp học, VD: '3A1'", "default": ""},
                "teacherName": {"type": "string", "description": "Tên giáo viên yêu cầu đọc", "default": ""},
                "summary":     {"type": "string", "description": "Tóm tắt ngắn gọn về buổi đọc", "default": ""},
                "logs":        {
                    "type": "string",
                    "description": (
                        "JSON string danh sách lượt hội thoại. VD: "
                        '[{"speaker":"teacher","content":"Đọc bài..."}, '
                        '{"speaker":"xiaozhi","content":"Vâng, em sẽ đọc..."}]. '
                        "speaker: xiaozhi | teacher | student"
                    ),
                    "default": "[]",
                },
            },
            "required": ["title", "passage"],
        },
    },
    {
        "name": "get_dictation_sessions",
        "description": "Lấy danh sách các phiên đọc chính tả đã lưu trong ViHand Grade.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "className": {"type": "string", "description": "Lọc theo lớp học (để trống = tất cả)", "default": ""},
                "limit":     {"type": "integer", "description": "Số phiên tối đa (mặc định 10)", "default": 10},
            },
        },
    },
]

# ============================================================
# MCP JSON-RPC PROTOCOL HANDLER
# ============================================================
_request_id = 0

def _next_id():
    global _request_id
    _request_id += 1
    return _request_id


async def handle_request(msg: dict) -> dict | None:
    """Xử lý một JSON-RPC request từ xiaozhi.me và trả về response."""
    method = msg.get("method", "")
    req_id = msg.get("id")
    params = msg.get("params", {})

    # Notification (không cần response)
    if req_id is None:
        logger.debug(f"📩 Notification: {method}")
        return None

    logger.info(f"📩 Request [{req_id}]: {method}")

    # initialize
    if method == "initialize":
        return {
            "jsonrpc": "2.0", "id": req_id,
            "result": {
                "protocolVersion": "2024-11-05",
                "capabilities": {"tools": {"listChanged": False}},
                "serverInfo": {"name": "ViHand Grade Dictation", "version": "1.0.0"},
            },
        }

    # tools/list
    if method == "tools/list":
        return {
            "jsonrpc": "2.0", "id": req_id,
            "result": {"tools": TOOLS},
        }

    # tools/call
    if method == "tools/call":
        tool_name = params.get("name", "")
        arguments  = params.get("arguments", {})
        logger.info(f"🔧 Tool call: {tool_name}({list(arguments.keys())})")

        try:
            if tool_name == "save_dictation_session":
                result_text = await _save_dictation_session(
                    title       = arguments.get("title", ""),
                    passage     = arguments.get("passage", ""),
                    className   = arguments.get("className", ""),
                    teacherName = arguments.get("teacherName", ""),
                    summary     = arguments.get("summary", ""),
                    logs_str    = arguments.get("logs", "[]"),
                )
            elif tool_name == "get_dictation_sessions":
                result_text = await _get_dictation_sessions(
                    className = arguments.get("className", ""),
                    limit     = arguments.get("limit", 10),
                )
            else:
                return {
                    "jsonrpc": "2.0", "id": req_id,
                    "error": {"code": -32601, "message": f"Tool không tồn tại: {tool_name}"},
                }

            return {
                "jsonrpc": "2.0", "id": req_id,
                "result": {
                    "content": [{"type": "text", "text": result_text}],
                    "isError": False,
                },
            }
        except Exception as e:
            logger.error(f"❌ Tool error: {e}")
            return {
                "jsonrpc": "2.0", "id": req_id,
                "result": {
                    "content": [{"type": "text", "text": f"❌ Lỗi: {str(e)}"}],
                    "isError": True,
                },
            }

    # Ping
    if method == "ping":
        return {"jsonrpc": "2.0", "id": req_id, "result": {}}

    # Unknown
    logger.warning(f"⚠️  Method chưa xử lý: {method}")
    return {
        "jsonrpc": "2.0", "id": req_id,
        "error": {"code": -32601, "message": f"Method không hỗ trợ: {method}"},
    }


# ============================================================
# WEBSOCKET CONNECTION LOOP (with auto-reconnect)
# ============================================================
async def run_forever(url: str):
    """Kết nối đến xiaozhi.me, tự động reconnect khi mất kết nối."""
    retry_delay = 3

    while True:
        try:
            logger.info(f"🔌 Đang kết nối đến xiaozhi.me...")
            async with websockets.connect(
                url,
                subprotocols=["mcp"],
                ping_interval=30,
                ping_timeout=10,
            ) as ws:
                logger.info("✅ Đã kết nối! Đang chờ requests từ Xiaozhi AI...")
                retry_delay = 3  # Reset delay khi kết nối thành công

                async for raw in ws:
                    try:
                        msg = json.loads(raw)
                        logger.debug(f"⬇️  Nhận: {json.dumps(msg)[:200]}")

                        response = await handle_request(msg)
                        if response is not None:
                            await ws.send(json.dumps(response))
                            logger.debug(f"⬆️  Gửi: {json.dumps(response)[:200]}")

                    except json.JSONDecodeError:
                        logger.warning(f"⚠️  JSON không hợp lệ: {raw[:100]}")
                    except Exception as e:
                        logger.error(f"❌ Lỗi xử lý message: {e}")

        except websockets.exceptions.ConnectionClosedOK:
            logger.info("🔌 Kết nối đóng bình thường. Thử kết nối lại...")
        except websockets.exceptions.ConnectionClosedError as e:
            logger.warning(f"⚠️  Kết nối bị ngắt: {e}. Thử lại sau {retry_delay}s...")
        except (OSError, ConnectionRefusedError) as e:
            logger.error(f"❌ Lỗi kết nối mạng: {e}. Thử lại sau {retry_delay}s...")
        except Exception as e:
            logger.error(f"❌ Lỗi không xác định: {e}. Thử lại sau {retry_delay}s...")

        await asyncio.sleep(retry_delay)
        retry_delay = min(retry_delay * 2, 60)  # Exponential backoff, tối đa 60s


# ============================================================
# ENTRY POINT
# ============================================================
async def main():
    logger.info("=" * 55)
    logger.info("🤖 ViHand Grade — Xiaozhi MCP Dictation Service")
    logger.info(f"🔗 ViHand Grade API: {VIHAND_API_URL}")
    logger.info("=" * 55)

    if not XIAOZHI_WSS_URL or "YOUR_TOKEN" in XIAOZHI_WSS_URL:
        logger.error("❌ Chưa cấu hình XIAOZHI_WSS_URL!")
        logger.error("")
        logger.error("   Cách cấu hình:")
        logger.error("   1. Vào xiaozhi.me → Agent → MCP Endpoint")
        logger.error("   2. Copy URL (wss://api.xiaozhi.me/mcp/?token=...)")
        logger.error("   3. Tạo file mcp_service/.env với nội dung:")
        logger.error("      XIAOZHI_WSS_URL=wss://api.xiaozhi.me/mcp/?token=...")
        logger.error("")
        sys.exit(1)

    logger.info(f"📡 Kết nối đến: {XIAOZHI_WSS_URL[:70]}...")
    logger.info(f"🛠️  Tools: save_dictation_session, get_dictation_sessions")
    logger.info("")

    try:
        await run_forever(XIAOZHI_WSS_URL)
    except KeyboardInterrupt:
        logger.info("⏹  Đã dừng MCP service.")


if __name__ == "__main__":
    asyncio.run(main())
