#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
verify_ai.py - Verification Harness for ViHand Grade Python AI Core (ViT5 + YOLOv8)
Part of the verify-vihand-grade skill (based on Lauren Tan's pstack methodology).

Drives the AI microservice directly:
1. Pings FastAPI health status on http://localhost:8000/health (or via SSH/Remote).
2. Sends classic elementary student misspellings to /predict:
   Input: "su bé ngủ xay, thay cho só xời"
   Expected Ground Truth: "ru bé ngủ say, thay cho gió trời"
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

DEFAULT_AI_URL = os.environ.get("VIT5_SERVICE_URL", "http://localhost:8000")

def verify_ai_service(ai_url=None):
    if not ai_url:
        ai_url = DEFAULT_AI_URL

    print(f"[AI Core Verification] Đang kiểm tra service tại: {ai_url}", flush=True)

    test_input = "su bé ngủ xay, thay cho só xời"
    expected_keywords = ["ru", "say", "gió", "trời"]

    start_time = time.time()
    evidence = {
        "service_url": ai_url,
        "test_input": test_input,
    }

    # 1. Health check
    try:
        health_req = urllib.request.Request(f"{ai_url}/health", headers={"User-Agent": "ViHand-Verifier/1.0"})
        with urllib.request.urlopen(health_req, timeout=5) as resp:
            evidence["health_status"] = resp.status
            evidence["health_body"] = json.loads(resp.read().decode("utf-8"))
    except Exception as e:
        evidence["health_status"] = "UNREACHABLE"
        evidence["health_error"] = str(e)
        # Service might not be running locally, report warning or fail
        return {
            "status": "FAIL",
            "message": f"Không thể kết nối Python AI service tại {ai_url}: {str(e)}",
            "evidence": evidence
        }

    # 2. Prediction test
    try:
        predict_payload = json.dumps({"text": test_input}).encode("utf-8")
        predict_req = urllib.request.Request(
            f"{ai_url}/predict",
            data=predict_payload,
            headers={"Content-Type": "application/json", "User-Agent": "ViHand-Verifier/1.0"}
        )
        p_start = time.time()
        with urllib.request.urlopen(predict_req, timeout=15) as resp:
            p_elapsed_ms = int((time.time() - p_start) * 1000)
            res_body = json.loads(resp.read().decode("utf-8"))
            corrected = res_body.get("corrected_text", res_body.get("output", ""))

            evidence["predict_latency_ms"] = p_elapsed_ms
            evidence["corrected_output"] = corrected

            # Check if keywords are corrected
            matches = [kw for kw in expected_keywords if kw in corrected.lower()]
            evidence["keywords_matched"] = f"{len(matches)}/{len(expected_keywords)} ({', '.join(matches)})"

            is_pass = len(matches) >= 2 and p_elapsed_ms < 3000

            return {
                "status": "PASS" if is_pass else "FAIL",
                "message": f"ViT5 phản hồi trong {p_elapsed_ms}ms, sửa thành: '{corrected}'" if is_pass else "Kết quả sửa lỗi không khớp từ điển hoặc vượt quá thời gian cho phép.",
                "evidence": evidence
            }

    except Exception as e:
        return {
            "status": "FAIL",
            "message": f"Lỗi gọi API /predict: {str(e)}",
            "evidence": evidence
        }

if __name__ == "__main__":
    url = sys.argv[1] if len(sys.argv) > 1 else None
    res = verify_ai_service(url)
    print("\n" + json.dumps(res, indent=2, ensure_ascii=False))
    sys.exit(0 if res["status"] == "PASS" else 1)
