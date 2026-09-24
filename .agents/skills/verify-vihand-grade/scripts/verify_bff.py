#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
verify_bff.py - Verification Harness for ViHand Grade BFF & Grading Pipeline
Part of the verify-vihand-grade skill (based on Lauren Tan's pstack methodology).

Drives the application the way a real user would:
1. Loads an actual elementary student handwriting exam image (err_01/00_anh_goc.jpg).
2. Sends the base64 payload to POST /api/mobile/grade (Cloudflare or local).
3. Captures and verifies empirical evidence:
   - HTTP 200 response
   - Score breakdown (4 criteria: Spelling, Format, Content, Creativity)
   - Bounding Boxes: rel_x1, rel_y1, rel_w, rel_h bounded in [0.0, 1.0]
   - 6 pedagogical error categories classification
   - Pedagogical comment generation
"""

import sys
import os
import json
import base64
import time
import urllib.request
import urllib.error

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

DEFAULT_REMOTE_URL = "https://vihandgrade.click"
DEFAULT_LOCAL_URL = "http://localhost:3000"

def get_repo_root():
    curr = os.path.abspath(os.path.dirname(__file__))
    while curr and curr != os.path.dirname(curr):
        if os.path.exists(os.path.join(curr, "package.json")) and os.path.exists(os.path.join(curr, "app")):
            return curr
        curr = os.path.dirname(curr)
    return os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", ".."))

def find_sample_image(repo_root):
    candidates = [
        os.path.join(repo_root, "02_Kich_ban_Thuc_nghiem", "tien_xu_ly_anh", "err_01", "00_anh_goc.jpg"),
        os.path.join(repo_root, "02_Kich_ban_Thuc_nghiem", "tien_xu_ly_anh", "err_02", "00_anh_goc.jpg"),
        os.path.join(repo_root, "public", "uploads", "grades", "1789649616959-lccgzee.jpg"),
    ]
    for path in candidates:
        if os.path.exists(path) and os.path.getsize(path) > 1000:
            return path
    return None

def verify_bff_grade(base_url=None):
    repo_root = get_repo_root()

    if not base_url:
        # Check local first
        local_alive = False
        try:
            req = urllib.request.Request(f"{DEFAULT_LOCAL_URL}/api/health", headers={"User-Agent": "ViHand-Verifier/1.0"})
            with urllib.request.urlopen(req, timeout=2) as resp:
                if resp.status == 200:
                    local_alive = True
        except Exception:
            local_alive = False

        if local_alive:
            base_url = DEFAULT_LOCAL_URL
        else:
            base_url = DEFAULT_REMOTE_URL

    print(f"[BFF Verification] Đang kiểm tra endpoint: {base_url}/api/mobile/grade", flush=True)

    img_path = find_sample_image(repo_root)
    if not img_path:
        return {
            "status": "FAIL",
            "message": f"Không tìm thấy ảnh bài thi mẫu thực tế trong thư mục {repo_root}/02_Kich_ban_Thuc_nghiem.",
            "evidence": {"repo_root": repo_root}
        }

    print(f"[BFF Verification] Sử dụng ảnh bài thi thật: {os.path.basename(img_path)} ({os.path.getsize(img_path) // 1024} KB)", flush=True)

    with open(img_path, "rb") as f:
        img_bytes = f.read()
    b64_str = base64.b64encode(img_bytes).decode("utf-8")
    data_uri = f"data:image/jpeg;base64,{b64_str}"

    payload = {
        "imageBase64": data_uri,
        "studentGrade": 3,
        "gradingMode": "dictation",
        "studentName": "Nguyễn Bảo Nam (Test Verifier)",
        "className": "Lớp 3A1",
        "penalty_per_error": 0.5
    }

    start_time = time.time()
    req = urllib.request.Request(
        f"{base_url}/api/mobile/grade",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "User-Agent": "ViHand-Agentic-Verifier/1.0"
        }
    )

    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            elapsed_ms = int((time.time() - start_time) * 1000)
            status_code = resp.status
            body_raw = resp.read().decode("utf-8")
            body = json.loads(body_raw)

            criteria = body.get("criteria", {})
            total_score = criteria.get("totalScore")
            errors = body.get("errors", [])
            pedagogical_comment = body.get("pedagogicalComment", "")
            server_grade_id = body.get("serverGradeId", "")

            valid_boxes = 0
            for idx, err in enumerate(errors):
                rx1 = err.get("relX1") if err.get("relX1") is not None else err.get("rel_x1", -1)
                ry1 = err.get("relY1") if err.get("relY1") is not None else err.get("rel_y1", -1)
                rw = err.get("relW") if err.get("relW") is not None else err.get("rel_w", -1)
                rh = err.get("relH") if err.get("relH") is not None else err.get("rel_h", -1)

                if 0.0 <= rx1 <= 1.0 and 0.0 <= ry1 <= 1.0 and 0.0 <= rw <= 1.0 and 0.0 <= rh <= 1.0:
                    valid_boxes += 1

            evidence = {
                "endpoint_used": f"{base_url}/api/mobile/grade",
                "http_status": status_code,
                "latency_ms": elapsed_ms,
                "server_grade_id": server_grade_id,
                "total_score": total_score,
                "criteria_breakdown": {
                    "spelling": criteria.get("spellingScore"),
                    "format": criteria.get("formatScore"),
                    "content": criteria.get("contentScore"),
                    "creativity": criteria.get("creativityScore")
                },
                "errors_detected_count": len(errors),
                "valid_bounding_boxes": f"{valid_boxes}/{len(errors)}",
                "sample_errors": [
                    f"#{i+1}: '{e.get('originalWord')}' -> '{e.get('correctedWord')}' ({e.get('errorType')})"
                    for i, e in enumerate(errors[:3])
                ],
                "has_pedagogical_comment": bool(pedagogical_comment and len(pedagogical_comment) > 10)
            }

            is_pass = (
                status_code == 200 and
                total_score is not None and 0.0 <= float(total_score) <= 10.0 and
                len(errors) > 0 and
                valid_boxes == len(errors) and
                evidence["has_pedagogical_comment"]
            )

            return {
                "status": "PASS" if is_pass else "FAIL",
                "message": f"BFF Gateway phản hồi thành công sau {elapsed_ms}ms, phát hiện {len(errors)} lỗi kèm Bounding Box hợp lệ." if is_pass else "Dữ liệu trả về thiếu trường hoặc tọa độ box không hợp lệ.",
                "evidence": evidence
            }

    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8", errors="replace")
        return {
            "status": "FAIL",
            "message": f"HTTP Error {e.code}: {err_body[:200]}",
            "evidence": {"endpoint": base_url, "http_status": e.code, "error_body": err_body}
        }
    except Exception as e:
        return {
            "status": "FAIL",
            "message": f"Không thể kết nối tới {base_url}. (Gợi ý: Bật 'npm run dev' tại localhost:3000 hoặc khởi động trạm Pi): {str(e)}",
            "evidence": {"endpoint": base_url, "error": str(e)}
        }

if __name__ == "__main__":
    target = sys.argv[1] if len(sys.argv) > 1 else None
    res = verify_bff_grade(target)
    print("\n" + json.dumps(res, indent=2, ensure_ascii=False))
    sys.exit(0 if res["status"] == "PASS" else 1)
