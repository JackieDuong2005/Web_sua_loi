"""
Milestone 2 Automated Verification Test Suite
Pipeline: Qwen2.5 Staged On-Demand Lifecycle + Piper VITS Acoustic Presets
Author: Worker M2
Compliant with: PStack / Lauren Tan Rigorous Verification & GEMINI.md Core Rules
"""

import sys
import io
import time
import wave
import json
from typing import Dict, Any

# Ensure stdout and stderr handle UTF-8 on Windows Console
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass
if hasattr(sys.stderr, "reconfigure"):
    try:
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

import os
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from fastapi.testclient import TestClient
from python_service.main import app

client = TestClient(app)


class TestResultLogger:
    def __init__(self):
        self.total = 0
        self.passed = 0
        self.failed = 0
        self.failures = []

    def log_pass(self, test_name: str, details: str):
        self.total += 1
        self.passed += 1
        print(f"  [PASS] {test_name}: {details}")

    def log_fail(self, test_name: str, details: str, error: Exception = None):
        self.total += 1
        self.failed += 1
        err_msg = f"{details} -> {error}" if error else details
        self.failures.append((test_name, err_msg))
        print(f"  [FAIL] {test_name}: {err_msg}")

    def print_summary(self):
        print("\n" + "=" * 80)
        print("MILESTONE 2 VERIFICATION SUITE SUMMARY")
        print("=" * 80)
        print(f"Total Tests Run : {self.total}")
        print(f"Passed          : {self.passed}")
        print(f"Failed          : {self.failed}")
        if self.failures:
            print("\nFailures Detail:")
            for name, err in self.failures:
                print(f"  - {name}: {err}")
        print("=" * 80)
        return self.failed == 0


runner = TestResultLogger()


def test_qwen_status_idle():
    print("\n--- 1. TELEMETRY & IDLE RAM PROTECTION (GET /qwen/status) ---")
    try:
        resp = client.get("/qwen/status")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
        data = resp.json()

        assert data.get("lifecycle_mode") == "on_demand_unload", (
            f"Expected lifecycle_mode 'on_demand_unload', got '{data.get('lifecycle_mode')}'"
        )
        assert data.get("is_loaded") is False, (
            f"Expected is_loaded False at idle, got {data.get('is_loaded')}"
        )
        assert data.get("memory_mode") == "zero_idle_ram", (
            f"Expected memory_mode 'zero_idle_ram', got '{data.get('memory_mode')}'"
        )
        avail_ram = data.get("available_ram_mb", 0.0)
        assert isinstance(avail_ram, (int, float)) and avail_ram > 0, (
            f"Invalid available_ram_mb: {avail_ram}"
        )
        assert "cache_entries" in data, "Missing cache_entries in status payload"

        runner.log_pass(
            "TC-01 Status Idle",
            f"lifecycle_mode={data['lifecycle_mode']}, is_loaded={data['is_loaded']}, avail_ram={avail_ram}MB, cache={data['cache_entries']}",
        )
    except Exception as e:
        runner.log_fail("TC-01 Status Idle", "Status assertion failure", e)


def test_qwen_extract_sgk():
    print("\n--- 2. SGK TEXT CLEANING & RAM AUTO-UNLOAD (POST /qwen/extract-sgk) ---")
    raw_sample = """
    Tiếng Việt 3 - Tập 1
    Tuần 12 - Bài đọc: Buổi Sáng Mùa Thu
    Trang 45

    Gió mùa thu se lạnh thổi qua từng kẽ lá. Bầu trời xanh trong vắt, không một gợn mây đen.
    Những tia nắng vàng dịu dàng trải dài trên con đường làng thân quen.

    45
    Câu 1: Em hãy tìm các hình ảnh so sánh trong bài thơ trên?
    Câu 2: Đặt câu với từ 'dịu dàng'.
    Ghi nhớ: Học sinh lớp 3 cần viết đúng dấu thanh hỏi, ngã.
    """
    try:
        t0 = time.perf_counter()
        resp = client.post("/qwen/extract-sgk", json={"raw_text": raw_sample, "grade": 3})
        elapsed_ms = (time.perf_counter() - t0) * 1000
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()

        clean_content = data.get("clean_content", "")
        difficult_words = data.get("difficultWords", [])

        # Kiểm tra lọc sạch rác SGK
        assert "Trang 45" not in clean_content, "clean_content contains 'Trang 45'"
        assert "Câu 1: Em hãy" not in clean_content, "clean_content contains exercise questions"
        assert "Ghi nhớ:" not in clean_content, "clean_content contains discussion notes"
        assert "Gió mùa thu se lạnh" in clean_content, "clean_content missing legitimate passage text"
        assert len(difficult_words) >= 1, "Failed to extract difficult words"
        assert data.get("ram_unloaded") is True, "Expected ram_unloaded True"

        # Kiểm tra hậu kiểm RAM: is_loaded phải duy trì False
        status_resp = client.get("/qwen/status").json()
        assert status_resp.get("is_loaded") is False, "Qwen was NOT unloaded from RAM after extraction!"

        runner.log_pass(
            "TC-02 SGK Cleaning",
            f"Title='{data.get('title')}', DifficultWords={difficult_words}, Latency={elapsed_ms:.1f}ms, is_loaded={status_resp.get('is_loaded')}",
        )
    except Exception as e:
        runner.log_fail("TC-02 SGK Cleaning", "SGK cleaning failure", e)


def test_qwen_direct_prosody_and_cache():
    print("\n--- 3. PROSODY DIRECTOR & CACHE HARNESS (POST /qwen/direct-prosody) ---")
    passage = "Gió mùa thu se lạnh, bầu trời xanh trong vắt. Những đám mây bồng bềnh trôi về đâu?"
    diff_words = ["bồng bềnh", "trong vắt"]
    payload = {
        "passage": passage,
        "difficult_words": diff_words,
        "grade": 3,
        "chunk_mode": "phrase",
    }

    try:
        # Lần 1: Cache Miss & Phân đoạn đạo diễn
        t0 = time.perf_counter()
        resp1 = client.post("/qwen/direct-prosody", json=payload)
        lat1 = (time.perf_counter() - t0) * 1000
        assert resp1.status_code == 200, f"Call 1 failed: {resp1.status_code}: {resp1.text}"
        data1 = resp1.json()

        assert data1.get("cache_hit") is False, "Call 1 should have been a cache miss"
        assert data1.get("ram_unloaded") is True, "Call 1 should report ram_unloaded True"
        clauses = data1.get("clauses", [])
        assert len(clauses) >= 2, f"Expected at least 2 clauses, got {len(clauses)}"

        # 1. Kiểm tra Bất biến Bảo toàn Từ gốc 100% (Zero-Word-Mutation)
        orig_words = passage.split()
        clause_words = [w for c in clauses for w in c["text"].split()]
        assert orig_words == clause_words, (
            f"Zero-word mutation invariant violated!\nOrig:   {orig_words}\nClause: {clause_words}"
        )

        # 2. Kiểm tra quy tắc cộng thêm +2.5s và style='emphasis' cho vế chứa từ khó
        matched_found = False
        for c in clauses:
            if c.get("matched_difficult_words"):
                matched_found = True
                assert c["style"] == "emphasis", f"Clause with difficult word should have style 'emphasis', got {c['style']}"
                assert c["pause_sec"] >= 4.0, f"Clause with difficult word should pause >= 4.0s, got {c['pause_sec']}s"

        assert matched_found, f"None of the clauses matched difficult words: {diff_words}"

        # Kiểm tra hậu kiểm RAM
        status1 = client.get("/qwen/status").json()
        assert status1.get("is_loaded") is False, "Qwen was NOT unloaded after direct-prosody!"

        runner.log_pass(
            "TC-03 Prosody Direction (Miss)",
            f"Verbatim Invariant 100% matched ({len(orig_words)} words), Clauses={len(clauses)}, Latency={lat1:.1f}ms",
        )

        # Lần 2: Cache Hit & Sub-millisecond Recall
        t1 = time.perf_counter()
        resp2 = client.post("/qwen/direct-prosody", json=payload)
        lat2 = (time.perf_counter() - t1) * 1000
        assert resp2.status_code == 200, f"Call 2 failed: {resp2.status_code}"
        data2 = resp2.json()

        assert data2.get("cache_hit") is True, "Call 2 should have hit LRU cache"
        assert lat2 < 50.0, f"Cache hit latency too slow: {lat2:.2f}ms >= 50ms"

        runner.log_pass(
            "TC-04 Prosody Cache Hit",
            f"Cache Hit confirmed (cache_hit=True), Latency={lat2:.3f}ms (< 50ms threshold)",
        )
    except Exception as e:
        runner.log_fail("TC-03/TC-04 Prosody Harness", "Prosody director failure", e)


def test_tts_expressive_synthesis():
    print("\n--- 4. EXPRESSIVE TTS WAV SYNTHESIS (GET /tts) ---")
    query = (
        "/tts?text=Gió mùa thu se lạnh, bầu trời xanh trong vắt."
        "&voice=vi_VN-vais1000-medium"
        "&style=warm_story"
        "&read_punctuation=true"
    )
    try:
        t0 = time.perf_counter()
        resp = client.get(query)
        lat = (time.perf_counter() - t0) * 1000
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"

        content_type = resp.headers.get("content-type", "")
        assert "audio/wav" in content_type, f"Expected audio/wav content-type, got '{content_type}'"

        wav_bytes = resp.content
        byte_len = len(wav_bytes)
        assert byte_len > 10000, f"Generated WAV too small ({byte_len} bytes <= 10000 bytes)"

        # Kiểm tra tính toàn vẹn của WAV Header
        with wave.open(io.BytesIO(wav_bytes), "rb") as wf:
            channels = wf.getnchannels()
            framerate = wf.getframerate()
            n_frames = wf.getnframes()
            duration_sec = n_frames / float(framerate)

        assert channels == 1, f"Expected Mono audio, got {channels} channels"
        assert framerate == 22050, f"Expected 22050Hz sample rate, got {framerate}"
        assert duration_sec > 1.0, f"Duration too short ({duration_sec:.2f}s)"

        runner.log_pass(
            "TC-05 Expressive TTS Synthesis",
            f"Bytes={byte_len}, Duration={duration_sec:.2f}s, Latency={lat:.1f}ms, Header={channels}ch@{framerate}Hz",
        )
    except Exception as e:
        runner.log_fail("TC-05 Expressive TTS Synthesis", "TTS synthesis failure", e)


def test_tts_play_local_speaker():
    print("\n--- 5. LOCAL HARDWARE SPEAKER PLAYBACK (POST /tts/play-local) ---")
    payload = {
        "text": "Bé tập viết chính tả thật nắn nót.",
        "voice": "vi_VN-vais1000-medium",
        "style": "emphasis",
        "noise_scale": 0.58,
        "noise_w": 0.72,
        "read_punctuation": False,
    }
    try:
        resp = client.post("/tts/play-local", json=payload)
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()

        assert data.get("status") == "ok", f"Expected status 'ok', got '{data.get('status')}'"
        assert data.get("device") == "local_speaker", f"Expected device 'local_speaker', got '{data.get('device')}'"
        assert data.get("noise_scale") == 0.58, f"Expected noise_scale 0.58, got {data.get('noise_scale')}"
        assert data.get("noise_w_scale") == 0.72, f"Expected noise_w_scale 0.72, got {data.get('noise_w_scale')}"
        assert "length_scale" in data, "Missing length_scale in response"

        runner.log_pass(
            "TC-06 Local Speaker Playback",
            f"status={data['status']}, device={data['device']}, length_scale={data['length_scale']}, noise={data['noise_scale']}/{data['noise_w_scale']}",
        )
    except Exception as e:
        runner.log_fail("TC-06 Local Speaker Playback", "Local speaker assertion failure", e)


def test_edge_cases_and_rejections():
    print("\n--- 6. EDGE CASES & REJECTION HARNESS ---")
    try:
        # 1. GET /tts chuỗi rỗng -> HTTP 400
        r1 = client.get("/tts?text=")
        assert r1.status_code == 400, f"Expected 400 for empty text, got {r1.status_code}"

        # 2. POST /tts/play-local chuỗi trắng -> HTTP 400
        r2 = client.post("/tts/play-local", json={"text": "   "})
        assert r2.status_code == 400, f"Expected 400 for whitespace text, got {r2.status_code}"

        # 3. POST /qwen/extract-sgk chuỗi rỗng -> HTTP 400
        r3 = client.post("/qwen/extract-sgk", json={"raw_text": ""})
        assert r3.status_code == 400, f"Expected 400 for empty raw_text, got {r3.status_code}"

        # 4. POST /qwen/direct-prosody chuỗi rỗng -> HTTP 400
        r4 = client.post("/qwen/direct-prosody", json={"passage": ""})
        assert r4.status_code == 400, f"Expected 400 for empty passage, got {r4.status_code}"

        runner.log_pass(
            "TC-07 Edge Cases",
            "Empty and whitespace inputs properly rejected with HTTP 400",
        )
    except Exception as e:
        runner.log_fail("TC-07 Edge Cases", "Rejection assertion failure", e)


if __name__ == "__main__":
    print("=" * 80)
    print("STARTING MILESTONE 2 COMPREHENSIVE VERIFICATION SUITE")
    print("=" * 80)

    test_qwen_status_idle()
    test_qwen_extract_sgk()
    test_qwen_direct_prosody_and_cache()
    test_tts_expressive_synthesis()
    test_tts_play_local_speaker()
    test_edge_cases_and_rejections()

    success = runner.print_summary()
    sys.exit(0 if success else 1)
