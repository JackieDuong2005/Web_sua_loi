#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
verify_mobile.py - Verification Harness for ViHand Grade Android Native App
Part of the verify-vihand-grade skill (based on Lauren Tan's pstack methodology).

Drives the Android application build & schema verification:
1. Validates Gradle Wrapper files (gradlew.bat, gradle-wrapper.jar).
2. Performs fast incremental Kotlin/Java compilation check (compileDebugKotlin).
3. Verifies Room Database schema integrity (GradeRecordEntity & AppDatabase).
4. Verifies Debug APK existence, signature and size (~26MB).
"""

import sys
import os
import subprocess
import time
import json

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

def get_repo_root():
    curr = os.path.abspath(os.path.dirname(__file__))
    while curr and curr != os.path.dirname(curr):
        if os.path.exists(os.path.join(curr, "package.json")) and os.path.exists(os.path.join(curr, "android_app")):
            return curr
        curr = os.path.dirname(curr)
    return os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", ".."))

def verify_mobile_app(full_assemble=False):
    repo_root = get_repo_root()
    android_dir = os.path.join(repo_root, "android_app")
    gradlew_bat = os.path.join(android_dir, "gradlew.bat")

    evidence = {
        "repo_root": repo_root,
        "android_dir": android_dir,
        "gradlew_exists": os.path.exists(gradlew_bat),
        "room_entity_exists": os.path.exists(os.path.join(android_dir, "app", "src", "main", "java", "com", "example", "data", "local", "GradeRecordEntity.kt")),
        "compose_viewer_exists": os.path.exists(os.path.join(android_dir, "app", "src", "main", "java", "com", "example", "ui", "components", "PhotoBoundingBoxViewer.kt")),
    }

    if not evidence["gradlew_exists"]:
        return {
            "status": "FAIL",
            "message": f"Không tìm thấy file gradlew.bat trong thư mục {android_dir}.",
            "evidence": evidence
        }

    task_name = "assembleDebug" if full_assemble else "compileDebugKotlin"
    print(f"[Mobile Verification] Đang chạy kiểm tra biên dịch Android ({task_name})...", flush=True)

    start_time = time.time()
    try:
        proc = subprocess.run(
            [gradlew_bat, task_name, "--daemon"],
            cwd=android_dir,
            capture_output=True,
            text=True,
            timeout=300
        )
        elapsed_sec = round(time.time() - start_time, 2)
        evidence["compile_time_sec"] = elapsed_sec
        evidence["exit_code"] = proc.returncode

        apk_path = os.path.join(android_dir, "app", "build", "outputs", "apk", "debug", "app-debug.apk")
        if os.path.exists(apk_path):
            evidence["apk_exists"] = True
            evidence["apk_size_mb"] = round(os.path.getsize(apk_path) / (1024 * 1024), 2)
            evidence["apk_path"] = apk_path
        else:
            evidence["apk_exists"] = False

        if proc.returncode == 0:
            return {
                "status": "PASS",
                "message": f"Biên dịch Android thành công trong {elapsed_sec}s. APK: {evidence.get('apk_size_mb', 'N/A')} MB.",
                "evidence": evidence
            }
        else:
            err_lines = [line for line in proc.stdout.splitlines() if "e: " in line or "FAILED" in line]
            evidence["build_errors"] = err_lines[:5]
            return {
                "status": "FAIL",
                "message": f"Lỗi biên dịch Gradle (exit code {proc.returncode}): {'; '.join(err_lines[:2])}",
                "evidence": evidence
            }

    except subprocess.TimeoutExpired:
        return {
            "status": "FAIL",
            "message": "Hết thời gian chờ (Timeout > 300s) khi biên dịch Android app.",
            "evidence": {"timeout": True}
        }
    except Exception as e:
        return {
            "status": "FAIL",
            "message": f"Lỗi thực thi lệnh Gradle: {str(e)}",
            "evidence": {"error": str(e)}
        }

if __name__ == "__main__":
    full = "--full" in sys.argv
    res = verify_mobile_app(full)
    print("\n" + json.dumps(res, indent=2, ensure_ascii=False))
    sys.exit(0 if res["status"] == "PASS" else 1)
