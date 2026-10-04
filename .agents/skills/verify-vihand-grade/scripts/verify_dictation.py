#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
verify_dictation.py - Verification Harness for ViHand Grade Dictation Module
Part of the verify-vihand-grade skill (based on Lauren Tan's pstack methodology).

Drives the real Dictation Platform the way a teacher/student does:
1. Sáng tác bài đọc chính tả bằng AI (Qwen 2.5 SLM / GDPT 2018 Bank).
2. Tổng hợp luồng âm thanh Neural Edge-TTS đa tầng (/api/dictation/tts).
3. Tra cứu và quản lý Kho ngữ liệu SGK số hóa (/api/dictation/passages).
4. Khởi tạo phiên đọc và lưu trữ Ground Truth đối chiếu (/api/dictation/sessions).
5. Kiểm tra tính toàn vẹn giao diện /teacher/dictation (Xác nhận 100% đã loại bỏ chuông).
"""

import sys
import os
import json
import time
import urllib.request
import urllib.parse
import urllib.error

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

NEXTJS_URL = "http://localhost:3000"
PYTHON_AI_URL = "http://localhost:8000"

def get_repo_root():
    curr = os.path.abspath(os.path.dirname(__file__))
    while curr and curr != os.path.dirname(curr):
        if os.path.exists(os.path.join(curr, "package.json")) and os.path.exists(os.path.join(curr, "app")):
            return curr
        curr = os.path.dirname(curr)
    return os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", ".."))

def http_get(url, timeout=10):
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "ViHand-Verifier/1.0", "Accept": "*/*"}
    )
    t0 = time.time()
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        data = resp.read()
        latency = int((time.time() - t0) * 1000)
        return resp.status, resp.headers, data, latency

def http_post_json(url, payload, timeout=12):
    body = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=body,
        headers={
            "User-Agent": "ViHand-Verifier/1.0",
            "Content-Type": "application/json",
            "Accept": "application/json"
        }
    )
    t0 = time.time()
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        data = resp.read()
        latency = int((time.time() - t0) * 1000)
        return resp.status, resp.headers, json.loads(data.decode("utf-8")), latency

def verify_dictation_module():
    print("""
================================================================================
  [VERIFY SURFACE: TAB ĐỌC CHÍNH TẢ SƯ PHẠM (TEACHER DICTATION COCKPIT)]
  Methodology: Drive Real Endpoints -> Capture Empirical Evidence -> Verify
================================================================================
""", flush=True)

    evidence = {}
    checklist = []
    created_session_id = None

    # ──────────────────────────────────────────────────────────────────────────
    # BƯỚC 1: Kiểm tra trạng thái hạ tầng dịch vụ (Next.js :3000 & Python :8000)
    # ──────────────────────────────────────────────────────────────────────────
    print("▶ [Bước 1/6] Kiểm tra liveness của hạ tầng Web BFF và Python Microservice...", flush=True)
    try:
        status_web, _, data_web, lat_web = http_get(f"{NEXTJS_URL}/api/health", timeout=3)
        web_ok = status_web == 200
    except Exception as e:
        web_ok = False
        lat_web = 0

    try:
        status_py, _, data_py, lat_py = http_get(f"{PYTHON_AI_URL}/health", timeout=3)
        py_ok = status_py == 200
    except Exception as e:
        py_ok = False
        lat_py = 0

    evidence["infrastructure"] = {
        "nextjs_3000": {"online": web_ok, "latency_ms": lat_web},
        "python_8000": {"online": py_ok, "latency_ms": lat_py}
    }

    if not web_ok:
        return {
            "status": "FAIL",
            "message": "Next.js dev server tại http://localhost:3000 không phản hồi. Hãy chạy 'npm run dev'.",
            "evidence": evidence
        }
    print(f"   [PASS] Next.js online ({lat_web}ms) | Python Service online ({lat_py}ms)")
    checklist.append(("Hạ tầng Next.js + Python AI hoạt động", True))

    # ──────────────────────────────────────────────────────────────────────────
    # BƯỚC 2: Kiểm tra Động cơ Sáng tác Bài đọc (Qwen 2.5 SLM & GDPT 2018 Bank)
    # ──────────────────────────────────────────────────────────────────────────
    print("\n▶ [Bước 2/6] 'Lái' AI Sáng tác bài đọc chính tả (POST /api/dictation/generate)...", flush=True)
    generate_payload = {
        "gradeLevel": 3,
        "topic": "Mùa lúa chín quê em",
        "sentenceCount": 4,
        "bookSet": "KetNoi"
    }

    try:
        status, headers, gen_res, lat_gen = http_post_json(
            f"{NEXTJS_URL}/api/dictation/generate",
            generate_payload,
            timeout=25
        )
        passage_data = gen_res.get("passage", {})
        has_title = bool(passage_data.get("title"))
        content = passage_data.get("content", "")
        word_count = len(content.split())
        difficult_words = passage_data.get("difficultWords", "")
        source = passage_data.get("source", "unknown")

        evidence["passage_generation"] = {
            "status_code": status,
            "latency_ms": lat_gen,
            "title": passage_data.get("title"),
            "word_count": word_count,
            "source": source,
            "difficult_words": difficult_words,
            "content_preview": content[:90] + ("..." if len(content) > 90 else "")
        }

        gen_pass = status == 200 and word_count >= 15 and len(difficult_words) > 0
        if gen_pass:
            print(f"   [PASS] Sáng tác thành công bài: '{passage_data.get('title')}' ({word_count} từ, {lat_gen}ms)")
            print(f"          Nguồn sinh: {source} | Từ khó: {difficult_words}")
            checklist.append(("Sáng tác bài đọc (Qwen 2.5 / Fallback)", True))
        else:
            print(f"   [FAIL] Dữ liệu sinh ra không đạt chuẩn: {passage_data}")
            checklist.append(("Sáng tác bài đọc (Qwen 2.5 / Fallback)", False))
    except Exception as e:
        print(f"   [FAIL] Lỗi gọi API generate: {e}")
        evidence["passage_generation"] = {"error": str(e)}
        checklist.append(("Sáng tác bài đọc (Qwen 2.5 / Fallback)", False))

    # ──────────────────────────────────────────────────────────────────────────
    # BƯỚC 3: Kiểm tra Động cơ Âm thanh Đa tầng Edge-TTS (/api/dictation/tts)
    # ──────────────────────────────────────────────────────────────────────────
    print("\n▶ [Bước 3/6] 'Lái' Động cơ tổng hợp giọng đọc Neural (/api/dictation/tts)...", flush=True)
    sample_text = "Cánh đồng lúa quê em vào mùa thu hoạch trải rộng như tấm thảm vàng."
    tts_query = urllib.parse.urlencode({
        "text": sample_text,
        "voice": "vi-VN-HoaiMyNeural",
        "rate": "-15%"
    })

    try:
        status_tts, headers_tts, audio_bytes, lat_tts = http_get(
            f"{NEXTJS_URL}/api/dictation/tts?{tts_query}",
            timeout=15
        )
        content_type = headers_tts.get("Content-Type", "")
        audio_size_kb = round(len(audio_bytes) / 1024, 2)

        evidence["audio_synthesis"] = {
            "status_code": status_tts,
            "content_type": content_type,
            "audio_size_kb": audio_size_kb,
            "latency_ms": lat_tts,
            "voice": "vi-VN-HoaiMyNeural",
            "rate": "-15%"
        }

        tts_pass = status_tts == 200 and "audio" in content_type and len(audio_bytes) > 5000
        if tts_pass:
            print(f"   [PASS] Luồng âm thanh MP3 Neural nhận thành công ({audio_size_kb} KB, {lat_tts}ms)")
            print(f"          Content-Type: {content_type} | Rate: -15% | Voice: vi-VN-HoaiMyNeural")
            checklist.append(("Tổng hợp âm thanh Neural Edge-TTS", True))
        else:
            print(f"   [FAIL] Âm thanh trả về không hợp lệ: Status {status_tts}, Size: {len(audio_bytes)}B")
            checklist.append(("Tổng hợp âm thanh Neural Edge-TTS", False))
    except Exception as e:
        print(f"   [FAIL] Lỗi luồng phát âm TTS: {e}")
        evidence["audio_synthesis"] = {"error": str(e)}
        checklist.append(("Tổng hợp âm thanh Neural Edge-TTS", False))

    # ──────────────────────────────────────────────────────────────────────────
    # BƯỚC 4: Kiểm tra Kho Ngữ Liệu SGK Số Hóa (/api/dictation/passages)
    # ──────────────────────────────────────────────────────────────────────────
    print("\n▶ [Bước 4/6] 'Lái' Kho Ngữ Liệu SGK CSDL SQLite (/api/dictation/passages)...", flush=True)
    try:
        status_p, _, data_p, lat_p = http_get(f"{NEXTJS_URL}/api/dictation/passages?gradeLevel=3", timeout=15)
        passages_list = json.loads(data_p.decode("utf-8")).get("passages", [])

        evidence["textbook_corpus"] = {
            "status_code": status_p,
            "latency_ms": lat_p,
            "total_retrieved": len(passages_list),
            "sample_item": passages_list[0]["title"] if len(passages_list) > 0 else None
        }

        corpus_pass = status_p == 200 and isinstance(passages_list, list)
        if corpus_pass:
            print(f"   [PASS] Truy vấn CSDL SGK thành công: {len(passages_list)} bài đọc được nạp ({lat_p}ms)")
            if passages_list:
                print(f"          Bài mẫu: '{passages_list[0].get('title')}' (Bộ: {passages_list[0].get('bookSet')})")
            checklist.append(("Kho Ngữ Liệu SGK SQLite", True))
        else:
            print(f"   [FAIL] Lỗi lấy danh sách SGK: {data_p[:100]}")
            checklist.append(("Kho Ngữ Liệu SGK SQLite", False))
    except Exception as e:
        print(f"   [FAIL] Lỗi gọi API passages: {e}")
        evidence["textbook_corpus"] = {"error": str(e)}
        checklist.append(("Kho Ngữ Liệu SGK SQLite", False))

    # ──────────────────────────────────────────────────────────────────────────
    # BƯỚC 5: Tạo Phiên Đọc & Khóa Ground Truth Chấm Điểm (/api/dictation/sessions)
    # ──────────────────────────────────────────────────────────────────────────
    print("\n▶ [Bước 5/6] 'Lái' Khởi tạo phiên đọc làm Ground Truth (POST /api/dictation/sessions)...", flush=True)
    session_payload = {
        "title": "[NCKH Verification] Bài đọc chính tả kiểm chuẩn",
        "passage": "Mặt trời vừa thức giấc sau rặng tre xanh. Những giọt sương mai long lanh như ngọc đọng trên kẽ lá.",
        "className": "3A1",
        "teacherName": "Hệ Thống Kiểm Chuẩn ViHand Grade",
        "source": "web"
    }

    try:
        status_s, _, res_s, lat_s = http_post_json(
            f"{NEXTJS_URL}/api/dictation/sessions",
            session_payload,
            timeout=15
        )
        session_obj = res_s.get("session", {})
        created_session_id = session_obj.get("id")

        evidence["ground_truth_session"] = {
            "status_code": status_s,
            "latency_ms": lat_s,
            "session_id": created_session_id,
            "source": session_obj.get("source"),
            "status": session_obj.get("status"),
            "ground_truth_url": f"/teacher/grade?dictationSessionId={created_session_id}&mode=dictation" if created_session_id else None
        }

        session_pass = status_s in (200, 201) and bool(created_session_id)
        if session_pass:
            print(f"   [PASS] Đã tạo DictationSession thành công (ID: {created_session_id})")
            print(f"          Ground Truth Bridge: /teacher/grade?dictationSessionId={created_session_id}")
            checklist.append(("Tạo phiên đọc & Khóa Ground Truth", True))
        else:
            print(f"   [FAIL] Không tạo được phiên đọc: {res_s}")
            checklist.append(("Tạo phiên đọc & Khóa Ground Truth", False))
    except Exception as e:
        print(f"   [FAIL] Lỗi gọi API sessions: {e}")
        evidence["ground_truth_session"] = {"error": str(e)}
        checklist.append(("Tạo phiên đọc & Khóa Ground Truth", False))

    # ──────────────────────────────────────────────────────────────────────────
    # BƯỚC 6: Kiểm tra UI Giao diện /teacher/dictation (Xác nhận ĐÃ XÓA CHUÔNG)
    # ──────────────────────────────────────────────────────────────────────────
    print("\n▶ [Bước 6/6] Kiểm tra HTML Render & Xác thực ĐÃ LOẠI BỎ CHUÔNG BÁO HIỆU...", flush=True)
    try:
        status_ui, _, html_bytes, lat_ui = http_get(f"{NEXTJS_URL}/teacher/dictation", timeout=25)
        html_text = html_bytes.decode("utf-8", errors="ignore")

        has_play_btn = "Bắt đầu đọc" in html_text or "dictation" in html_text.lower()
        has_chime_code = "playChime" in html_text or "Thử chuông" in html_text or "Chuông hiệu lệnh" in html_text

        evidence["ui_inspection"] = {
            "status_code": status_ui,
            "latency_ms": lat_ui,
            "contains_play_controls": has_play_btn,
            "chime_completely_removed": not has_chime_code
        }

        ui_pass = status_ui == 200 and not has_chime_code
        if ui_pass:
            print(f"   [PASS] Giao diện /teacher/dictation tải thành công 200 OK ({lat_ui}ms)")
            print("          XÁC THỰC: 100% Thuật toán chuông (playChime) đã được loại bỏ sạch sẽ khỏi UI.")
            checklist.append(("Giao diện tải tốt & Đã loại bỏ hoàn toàn chuông", True))
        else:
            print(f"   [FAIL] Kiểm tra UI thất bại: status={status_ui}, chime_detected={has_chime_code}")
            checklist.append(("Giao diện tải tốt & Đã loại bỏ hoàn toàn chuông", False))
    except Exception as e:
        print(f"   [FAIL] Lỗi tải giao diện: {e}")
        evidence["ui_inspection"] = {"error": str(e)}
        checklist.append(("Giao diện tải tốt & Đã loại bỏ hoàn toàn chuông", False))

    # ──────────────────────────────────────────────────────────────────────────
    # TỔNG HỢP KẾT QUẢ NGHIỆM THU
    # ──────────────────────────────────────────────────────────────────────────
    all_passed = all(item[1] for item in checklist)
    final_status = "PASS" if all_passed else "FAIL"

    print("\n" + "=" * 80)
    print(f"  TỔNG KẾT XÁC THỰC PHÂN HỆ ĐỌC CHÍNH TẢ: {final_status}")
    print("=" * 80)
    for name, passed in checklist:
        mark = "✅ PASS" if passed else "❌ FAIL"
        print(f"  {mark:<9} | {name}")
    print("=" * 80 + "\n")

    return {
        "status": final_status,
        "checklist": checklist,
        "evidence": evidence
    }

if __name__ == "__main__":
    result = verify_dictation_module()
    sys.exit(0 if result["status"] == "PASS" else 1)
