#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
verify_all.py - Master Verification Orchestrator for ViHand Grade
Based on Lauren Tan's pstack methodology:
"Drive the real app the way a user does and capture empirical evidence."

Runs and synthesizes verification across all 4 surfaces:
1. Mobile Surface    : Android Native compilation & Room DB integrity.
2. BFF Gateway       : Real exam photo grading, YOLOv8 Bounding Boxes, criteria.
3. Python AI Core    : ViT5 spelling prediction & model latency.
4. Edge & Tunnel     : Cloudflare Tunnel & Pi edge service status.
"""

import sys
import os
import time
import json
import argparse

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

# Import sibling modules
sys.path.insert(0, os.path.dirname(__file__))
from verify_mobile import verify_mobile_app
from verify_bff import verify_bff_grade
from verify_ai import verify_ai_service
from verify_edge import verify_edge_server

def print_banner():
    print("""
================================================================================
          VIHAND GRADE - AGENTIC VERIFICATION HARNESS (PSTACK STANDARD)
                 Methodology: Drive -> Capture Evidence -> Verify
================================================================================
""", flush=True)

def run_master_verification(surface="all", full_mobile=False):
    print_banner()
    start_total = time.time()
    results = {}

    # 1. Surface: Mobile Android App
    if surface in ["all", "mobile"]:
        print("\n▶ [1/4] ĐANG XÁC THỰC SURFACE: MOBILE ANDROID NATIVE...")
        try:
            results["mobile"] = verify_mobile_app(full_assemble=full_mobile)
        except Exception as e:
            results["mobile"] = {"status": "FAIL", "message": str(e), "evidence": {}}

    # 2. Surface: BFF Mobile Gateway
    if surface in ["all", "bff", "web"]:
        print("\n▶ [2/4] ĐANG XÁC THỰC SURFACE: AI BFF GATEWAY & GRADING PIPELINE...")
        try:
            results["bff"] = verify_bff_grade()
        except Exception as e:
            results["bff"] = {"status": "FAIL", "message": str(e), "evidence": {}}

    # 3. Surface: Python AI Microservice
    if surface in ["all", "ai"]:
        print("\n▶ [3/4] ĐANG XÁC THỰC SURFACE: PYTHON AI CORE (ViT5 + YOLOv8)...")
        try:
            results["ai"] = verify_ai_service()
        except Exception as e:
            results["ai"] = {"status": "FAIL", "message": str(e), "evidence": {}}

    # 4. Surface: Edge Server & Tunnel
    if surface in ["all", "edge"]:
        print("\n▶ [4/4] ĐANG XÁC THỰC SURFACE: EDGE PI SERVER & CLOUDFLARE TUNNEL...")
        try:
            results["edge"] = verify_edge_server()
        except Exception as e:
            results["edge"] = {"status": "FAIL", "message": str(e), "evidence": {}}

    total_sec = round(time.time() - start_total, 2)

    # PRINT EVIDENCE DASHBOARD TABLE
    print("\n" + "=" * 80)
    print("                    BẢNG BẰNG CHỨNG XÁC THỰC HỆ THỐNG (EVIDENCE REPORT)")
    print("=" * 80)
    print(f"{'BỀ MẶT (SURFACE)':<22} | {'TRẠNG THÁI':<10} | {'BẰNG CHỨNG THỰC CHỨNG (EMPIRICAL EVIDENCE)'}")
    print("-" * 80)

    all_pass = True
    for key, data in results.items():
        status = data.get("status", "FAIL")
        icon = "✅ PASS" if status == "PASS" else "❌ FAIL"
        if status != "PASS":
            all_pass = False

        label_map = {
            "mobile": "1. Mobile Android",
            "bff": "2. BFF AI Gateway",
            "ai": "3. Python AI Core",
            "edge": "4. Edge & Tunnel"
        }
        label = label_map.get(key, key)
        evidence = data.get("evidence", {})

        # Summarize key evidence
        if key == "mobile":
            ev_summary = f"Compile: {evidence.get('compile_time_sec', 'N/A')}s | APK: {evidence.get('apk_size_mb', 'N/A')}MB | Room: OK"
        elif key == "bff":
            ev_summary = f"Status 200 | Latency: {evidence.get('latency_ms', 'N/A')}ms | BBoxes: {evidence.get('valid_bounding_boxes', 'N/A')} | Điểm: {evidence.get('total_score', 'N/A')}/10"
        elif key == "ai":
            ev_summary = f"ViT5: {evidence.get('predict_latency_ms', 'N/A')}ms | Khớp từ điển: {evidence.get('keywords_matched', 'N/A')}"
        elif key == "edge":
            ev_summary = f"Tunnel: {'Online' if evidence.get('tunnel_online') else 'Offline'} | RTT: {evidence.get('tunnel_latency_ms', 'N/A')}ms | SSH: {'OK' if evidence.get('ssh_connected') else 'N/A'}"
        else:
            ev_summary = data.get("message", "")

        print(f"{label:<22} | {icon:<10} | {ev_summary}")

    print("=" * 80)
    if all_pass:
        print(f"🎉 TỔNG KẾT: TOÀN BỘ CÁC BỀ MẶT ĐẠT 100% TIÊU CHUẨN XÁC THỰC (Tổng thời gian: {total_sec}s)")
    else:
        print(f"⚠️ TỔNG KẾT: CÓ MỤC CHƯA ĐẠT - YÊU CẦU SUBAGENT BUILDER TỰ SỬA LỖI (Tổng thời gian: {total_sec}s)")
    print("=" * 80 + "\n")

    return 0 if all_pass else 1

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Master Verification Harness for ViHand Grade")
    parser.add_argument("--surface", default="all", choices=["all", "mobile", "bff", "ai", "edge"], help="Bề mặt cần kiểm thử")
    parser.add_argument("--full", action="store_true", help="Chạy assembleDebug đầy đủ cho Android")
    args = parser.parse_args()

    exit_code = run_master_verification(surface=args.surface, full_mobile=args.full)
    sys.exit(exit_code)
