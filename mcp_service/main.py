"""
ViHand Grade — MCP Server cho Xiaozhi AI Chatbot
Cung cấp tools để Xiaozhi lưu phiên đọc chính tả vào hệ thống ViHand Grade.

Cài đặt:
  pip install -r requirements.txt

Chạy:
  python main.py

Cấu hình trên xiaozhi.me:
  URL MCP: http://<IP_máy_bạn>:8200/sse
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from mcp.server.fastmcp import FastMCP
from starlette.routing import Mount
import httpx
import logging
import json

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("mcp_dictation")

# ============================================================
# CẤU HÌNH
# ============================================================
VIHAND_API_URL = "http://localhost:3000"  # Next.js ViHand Grade API

# ============================================================
# MCP SERVER
# ============================================================
mcp = FastMCP(
    "ViHand Grade - Dictation",
    instructions="""Bạn là trợ lý đọc chính tả cho giáo viên tiểu học.
Khi giáo viên yêu cầu đọc một đoạn văn chính tả, hãy:
1. Đọc đoạn văn rõ ràng, chậm rãi, phù hợp học sinh tiểu học
2. Sau khi đọc xong, dùng tool save_dictation_session để lưu phiên đọc vào hệ thống ViHand Grade
3. Ghi lại toàn bộ nội dung hội thoại (giáo viên nói gì, bạn đọc gì) vào logs

Ví dụ cách dùng tool:
- title: "Nghe viết: Ai có lỗi" 
- passage: nội dung đoạn văn đầy đủ
- className: tên lớp nếu giáo viên có nói
- logs: danh sách các lượt chat [{speaker, content}]
""",
)


@mcp.tool()
async def save_dictation_session(
    title: str,
    passage: str,
    className: str = "",
    teacherName: str = "",
    summary: str = "",
    logs: str = "[]",
) -> str:
    """Lưu một phiên đọc chính tả vào hệ thống ViHand Grade.
    
    Gọi tool này SAU KHI đã đọc xong đoạn văn chính tả cho học sinh.
    
    Args:
        title: Tiêu đề bài đọc (VD: "Nghe viết: Ai có lỗi")
        passage: Toàn bộ nội dung đoạn văn chính tả đã đọc
        className: Tên lớp học (VD: "3A1"). Để trống nếu không biết.
        teacherName: Tên giáo viên yêu cầu đọc. Để trống nếu không biết.
        summary: Tóm tắt ngắn về buổi đọc chính tả
        logs: Chuỗi JSON danh sách các lượt hội thoại. Mỗi lượt có dạng:
              [{"speaker": "teacher", "content": "Đọc bài Ai có lỗi"},
               {"speaker": "xiaozhi", "content": "Vâng, em sẽ đọc bài..."},
               {"speaker": "xiaozhi", "content": "Ai có lỗi. Cả lớp ồn ào..."}]
              speaker: "xiaozhi" | "teacher" | "student"
    
    Returns:
        Thông báo kết quả lưu phiên thành công hoặc lỗi
    """
    try:
        # Parse logs JSON string
        try:
            parsed_logs = json.loads(logs) if isinstance(logs, str) else logs
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
            response = await client.post(
                f"{VIHAND_API_URL}/api/dictation/sessions",
                json=payload,
            )

        if response.status_code == 201:
            data = response.json()
            session_id = data.get("session", {}).get("id", "unknown")
            log_count = len(data.get("session", {}).get("logs", []))
            logger.info(f"✅ Đã lưu phiên '{title}' (ID: {session_id}, {log_count} logs)")
            return f"✅ Đã lưu phiên đọc chính tả '{title}' thành công vào hệ thống ViHand Grade! (ID: {session_id}, {log_count} lượt hội thoại)"
        else:
            error_msg = response.text
            logger.error(f"❌ Lỗi API: {response.status_code} — {error_msg}")
            return f"❌ Lỗi khi lưu phiên: {error_msg}"

    except httpx.ConnectError:
        logger.error("❌ Không kết nối được đến ViHand Grade API (Next.js)")
        return "❌ Không kết nối được đến hệ thống ViHand Grade. Hãy đảm bảo Next.js đang chạy trên port 3000."
    except Exception as e:
        logger.error(f"❌ Lỗi: {e}")
        return f"❌ Lỗi không xác định: {str(e)}"


@mcp.tool()
async def get_dictation_sessions(className: str = "", limit: int = 10) -> str:
    """Lấy danh sách các phiên đọc chính tả đã lưu trong ViHand Grade.
    
    Args:
        className: Lọc theo tên lớp (để trống = tất cả)
        limit: Số phiên tối đa trả về (mặc định 10)
    
    Returns:
        Danh sách các phiên đọc chính tả gần nhất
    """
    try:
        params = {"limit": str(limit)}
        if className:
            params["className"] = className

        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                f"{VIHAND_API_URL}/api/dictation/sessions",
                params=params,
            )

        if response.status_code == 200:
            data = response.json()
            sessions = data.get("sessions", [])
            if not sessions:
                return "📋 Chưa có phiên đọc chính tả nào được lưu."

            result_lines = [f"📋 Có {len(sessions)} phiên đọc chính tả gần nhất:\n"]
            for i, s in enumerate(sessions, 1):
                log_count = len(s.get("logs", []))
                created = s.get("createdAt", "")[:10]
                class_info = f" — Lớp {s['className']}" if s.get("className") else ""
                result_lines.append(
                    f"{i}. 📖 {s['title']}{class_info} ({created}, {log_count} lượt chat)"
                )
            return "\n".join(result_lines)
        else:
            return f"❌ Lỗi khi lấy danh sách: {response.text}"

    except httpx.ConnectError:
        return "❌ Không kết nối được đến hệ thống ViHand Grade."
    except Exception as e:
        return f"❌ Lỗi: {str(e)}"


# ============================================================
# FASTAPI APP + MCP SSE MOUNT
# ============================================================
app = FastAPI(title="ViHand Grade MCP Server", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok", "service": "mcp-dictation", "tools": ["save_dictation_session", "get_dictation_sessions"]}


# Mount MCP SSE endpoint — phải đặt SAU các route FastAPI vì mount("/") sẽ catch-all
app.mount("/", mcp.sse_app())


if __name__ == "__main__":
    import uvicorn
    logger.info("=" * 50)
    logger.info("🤖 MCP Server cho Xiaozhi Dictation")
    logger.info(f"📡 SSE endpoint: http://0.0.0.0:8200/sse")
    logger.info(f"🔗 ViHand Grade API: {VIHAND_API_URL}")
    logger.info("=" * 50)
    uvicorn.run(app, host="0.0.0.0", port=8200, log_level="info")

