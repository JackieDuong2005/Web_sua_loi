#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
verify_ai.py - Verification Harness for ViHand Grade Python AI Core (ViT5 + YOLOv8)
Part of the verify-vihand-grade skill (based on Lauren Tan's pstack methodology).

Drives the AI microservice directly:
1. Pings FastAPI health status on http://localhost:8000/health (fallback to Pi http://192.168.1.56:8000).
2. Sends classic elementary student misspellings to /correct:
   Input: "cô giáo bẩu em cố gắn học tập"
   Expected Ground Truth: "Cô giáo bảo em cố gắng học tập."
3. Captures model inference latency and accuracy evidence.
"""

import sys
import os
import json
import time
import urllib.request
import urllib.error

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

DEFAULT_CANDIDATE_URLS = [
    os.environ.get("VIT5_SERVICE_URL", "http://localhost:8000"),
    "http://192.168.1.56:8000",
]

def verify_ai_service(ai_url=None):
    candidate_urls = [ai_url] if ai_url else DEFAULT_CANDIDATE_URLS
    
    test_input = "cô giáo bẩu em cố gắn học tập"
    expected_keywords = ["bảo", "gắng"]

    evidence = {
        "candidate_urls": candidate_urls,
        "test_input": test_input,
    }

    active_url = None

    # 1. Health check - Tìm service đang online
    for url in candidate_urls:
        if not url:
            continue
        try:
            print(f"[AI Core Verification] Đang kiểm tra service tại: {url}", flush=True)
            health_req = urllib.request.Request(f"{url}/health", headers={"User-Agent": "ViHand-Verifier/1.0"})
            with urllib.request.urlopen(health_req, timeout=4) as resp:
                if resp.status == 200:
                    data = json.loads(resp.read().decode("utf-8"))
                    evidence["service_url"] = url
                    evidence["health_status"] = resp.status
                    evidence["health_body"] = data
                    active_url = url
                    break
        except Exception as e:
            continue

    if not active_url:
        evidence["health_status"] = "UNREACHABLE"
        evidence["error"] = "Không thể kết nối tới bất kỳ Python AI service nào (localhost:8000 hoặc 192.168.1.56:8000)"
        return {
            "status": "FAIL",
            "message": "Không tìm thấy Python AI Service đang hoạt động.",
            "evidence": evidence
        }

    # 2. Prediction / Correction test
    try:
        correct_payload = json.dumps({"text": test_input}).encode("utf-8")
        
        # Thử /correct trước, nếu 404 thì thử /predict
        for endpoint in ["/correct", "/predict", "/grade"]:
            try:
                req = urllib.request.Request(
                    f"{active_url}{endpoint}",
                    data=correct_payload,
                    headers={"Content-Type": "application/json", "User-Agent": "ViHand-Verifier/1.0"}
                )
                p_start = time.time()
                with urllib.request.urlopen(req, timeout=15) as resp:
                    p_elapsed_ms = int((time.time() - p_start) * 1000)
                    res_body = json.loads(resp.read().decode("utf-8"))
                    
                    corrected = (
                        res_body.get("fixed_text") or 
                        res_body.get("corrected_text") or 
                        res_body.get("output") or 
                        ""
                    )

                    evidence["endpoint_used"] = endpoint
                    evidence["predict_latency_ms"] = p_elapsed_ms
                    evidence["corrected_output"] = corrected

                    # Check if keywords are corrected
                    matches = [kw for kw in expected_keywords if kw in corrected.lower()]
                    evidence["keywords_matched"] = f"{len(matches)}/{len(expected_keywords)} ({', '.join(matches)})"

                    is_pass = len(matches) >= 1 and p_elapsed_ms < 5000

                    return {
                        "status": "PASS" if is_pass else "FAIL",
                        "message": f"ViT5 phản hồi trong {p_elapsed_ms}ms, sửa thành: '{corrected}'" if is_pass else "Kết quả sửa lỗi không khớp từ điển hoặc vượt quá thời gian.",
                        "evidence": evidence
                    }
            except urllib.error.HTTPError as he:
                if he.code == 404:
                    continue
                raise he

    except Exception as e:
        return {
            "status": "FAIL",
            "message": f"Lỗi gọi API sửa lỗi chính tả: {str(e)}",
            "evidence": evidence
        }

    return {
        "status": "FAIL",
        "message": "Không có endpoint sửa lỗi nào khả dụng (/correct, /predict, /grade)",
        "evidence": evidence
    }

if __name__ == "__main__":
    url = sys.argv[1] if len(sys.argv) > 1 else None
    res = verify_ai_service(url)
    print("\n" + json.dumps(res, indent=2, ensure_ascii=False))
    sys.exit(0 if res["status"] == "PASS" else 1)
