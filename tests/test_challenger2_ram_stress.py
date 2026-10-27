"""
Challenger 2 Empirical Stress Test Harness:
RAM Lifecycle, Memory Leak Prevention & Low-RAM Fallback Verification

Target:
- python_service/main.py
  * GET /qwen/status
  * POST /qwen/extract-sgk
  * POST /qwen/direct-prosody
  * get_available_ram_mb()
  * get_qwen_model()
  * unload_qwen_model()

Focus:
1. 10 consecutive alternating calls across /qwen/extract-sgk and /qwen/direct-prosody.
2. After every call: verify is_loaded == False, lifecycle_mode == "on_demand_unload", memory_mode == "zero_idle_ram".
3. Measure process RSS before, during, and after 10 calls to evaluate memory leak risk.
4. Low-RAM simulation (< 650MB): verify clean fallback to deterministic pedagogy with HTTP 200 and no crash.
"""

import sys
import os
import gc
import time
import json
from unittest import mock
import psutil

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

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from fastapi.testclient import TestClient
from python_service.main import app, get_available_ram_mb, get_qwen_model, unload_qwen_model

client = TestClient(app)
process = psutil.Process(os.getpid())


def get_current_rss_mb() -> float:
    """Return process RSS memory in Megabytes."""
    return process.memory_info().rss / (1024.0 * 1024.0)


class ChallengerTestLogger:
    def __init__(self):
        self.total = 0
        self.passed = 0
        self.failed = 0
        self.failures = []

    def log_pass(self, name: str, details: str):
        self.total += 1
        self.passed += 1
        print(f"  [PASS] {name}: {details}")

    def log_fail(self, name: str, details: str, error: Exception = None):
        self.total += 1
        self.failed += 1
        msg = f"{details} -> {error}" if error else details
        self.failures.append((name, msg))
        print(f"  [FAIL] {name}: {msg}")

    def print_summary(self):
        print("\n" + "=" * 80)
        print("CHALLENGER 2: EMPIRICAL STRESS TEST HARNESS SUMMARY")
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


runner = ChallengerTestLogger()


# ==============================================================================
# TEST SUITE 1: 10 CONSECUTIVE ALTERNATING CALLS & POST-CALL RAM UNLOAD VERIFICATION
# ==============================================================================

SAMPLES_SGK = [
    {
        "grade": 1,
        "text": """
        Tiếng Việt 1 - Tập 1
        Bài đọc: Bé và Chú Cún Nhỏ
        Trang 15

        Bé Na có một chú cún nhỏ rất xinh. Bộ lông của cún trắng tinh như bông.
        Mỗi khi bé đi học về, cún lại vẫy đuôi mừng rỡ đón bé vào nhà.

        Câu 1: Chú cún của bé Na màu gì?
        Ghi nhớ: Học sinh luyện viết chữ c, n.
        """
    },
    {
        "grade": 2,
        "text": """
        Tiếng Việt 2 - Tuần 8
        Trang 28
        Đôi Bạn Thân

        Nam và Minh là đôi bạn cùng tiến của lớp em.
        Giờ ra chơi, hai bạn thường ngồi dưới gốc cây bàng râm mát để cùng nhau học tập.

        28
        Câu hỏi: Hai bạn làm gì vào giờ ra chơi?
        """
    },
    {
        "grade": 3,
        "text": """
        Tiếng Việt 3 - Bài 14
        Trang 45
        Buổi Sáng Mùa Thu

        Gió mùa thu se lạnh thổi qua từng kẽ lá. Bầu trời xanh trong vắt, không một gợn mây đen.
        Những tia nắng vàng dịu dàng trải dài trên con đường làng thân quen.

        45
        Câu 1: Em hãy tìm từ ngữ chỉ mùa thu?
        Ghi nhớ: Quy tắc viết hoa tên riêng.
        """
    },
    {
        "grade": 4,
        "text": """
        Tiếng Việt 4 - Tuần 15
        Trang 72
        Dòng Sông Tuổi Thơ

        Dòng sông quê hương hiền hòa uốn lượn quanh những bãi mía nương dâu xanh mướt.
        Mặt nước trong veo in bóng những rặng tre rì rào trong gió sớm ban mai.

        72
        Bài tập: Tìm các từ láy trong đoạn văn trên.
        """
    },
    {
        "grade": 5,
        "text": """
        Tiếng Việt 5 - Tập 2
        Trang 102
        Kỳ Quan Đất Nước

        Vịnh Hạ Long sừng sững giữa biển trời mênh mông với hàng ngàn hòn đảo đá vôi nhấp nhô tuyệt đẹp.
        Nước biển bốn mùa trong xanh như ngọc bích, phản chiếu ánh bình minh rạng ngời.

        102
        Câu hỏi và bài tập: Nêu cảm nghĩ của em về Vịnh Hạ Long.
        """
    }
]

SAMPLES_PROSODY = [
    {
        "passage": "Bé Na có một chú cún nhỏ rất xinh. Bộ lông của cún trắng tinh như bông.",
        "difficult_words": ["chú cún", "trắng tinh"],
        "grade": 1,
        "chunk_mode": "phrase"
    },
    {
        "passage": "Nam và Minh là đôi bạn cùng tiến. Giờ ra chơi, hai bạn cùng nhau học tập dưới tán cây bàng.",
        "difficult_words": ["cùng tiến", "cây bàng"],
        "grade": 2,
        "chunk_mode": "phrase"
    },
    {
        "passage": "Gió mùa thu se lạnh thổi qua từng kẽ lá. Bầu trời xanh trong vắt, không một gợn mây đen dịu dàng trải dài.",
        "difficult_words": ["se lạnh", "trong vắt", "dịu dàng"],
        "grade": 3,
        "chunk_mode": "phrase"
    },
    {
        "passage": "Dòng sông quê hương hiền hòa uốn lượn quanh những bãi mía nương dâu. Rặng tre rì rào trong gió sớm ban mai.",
        "difficult_words": ["uốn lượn", "rì rào", "ban mai"],
        "grade": 4,
        "chunk_mode": "phrase"
    },
    {
        "passage": "Vịnh Hạ Long sừng sững giữa biển trời mênh mông. Nước biển trong xanh như ngọc bích, phản chiếu ánh bình minh rạng ngời.",
        "difficult_words": ["sừng sững", "mênh mông", "ngọc bích", "rạng ngời"],
        "grade": 5,
        "chunk_mode": "phrase"
    }
]


def test_10_consecutive_calls_and_lifecycle():
    print("\n--- 1. EMPIRICAL TEST: 10 CONSECUTIVE ALTERNATING CALLS & STATUS CHECK ---")
    
    # Raw process memory before any library imports or requests
    gc.collect()
    rss_raw_initial = get_current_rss_mb()
    print(f"  [Baseline] Process RSS before any requests: {rss_raw_initial:.2f} MB")

    # Warmup call: Triggers one-time loading of dynamic libraries (torch, transformers, ctypes) into sys.modules
    warmup_resp = client.post("/qwen/extract-sgk", json={"raw_text": "Khởi động thư viện.\nTrang 1\nBài 1", "grade": 1})
    assert warmup_resp.status_code == 200
    gc.collect()
    rss_baseline_warmed = get_current_rss_mb()
    print(f"  [Baseline] Post-Warmup Baseline RSS (Libraries in memory): {rss_baseline_warmed:.2f} MB")
    print(f"  [Note] Library loading overhead (one-time DLL/module load): {rss_baseline_warmed - rss_raw_initial:+.2f} MB")

    # Verify idle status after warmup
    init_status = client.get("/qwen/status").json()
    assert init_status.get("is_loaded") is False, "Initial is_loaded is not False!"
    assert init_status.get("lifecycle_mode") == "on_demand_unload", "Initial lifecycle_mode mismatch!"

    rss_readings = [rss_baseline_warmed]
    call_log = []

    for i in range(10):
        step_num = i + 1
        is_extract = (i % 2 == 0)
        idx = i // 2

        if is_extract:
            sample = SAMPLES_SGK[idx]
            endpoint = "/qwen/extract-sgk"
            payload = {"raw_text": sample["text"], "grade": sample["grade"]}
            t0 = time.perf_counter()
            resp = client.post(endpoint, json=payload)
            elapsed = (time.perf_counter() - t0) * 1000
            
            assert resp.status_code == 200, f"Call {step_num} ({endpoint}) failed with {resp.status_code}: {resp.text}"
            data = resp.json()
            assert data.get("ram_unloaded") is True, f"Call {step_num} ram_unloaded is not True"
            assert "clean_content" in data and len(data["clean_content"]) > 0, f"Call {step_num} missing clean_content"
            assert "difficultWords" in data and len(data["difficultWords"]) > 0, f"Call {step_num} missing difficultWords"
            call_type = f"extract-sgk (Gr{sample['grade']})"
        else:
            sample = SAMPLES_PROSODY[idx]
            endpoint = "/qwen/direct-prosody"
            payload = {
                "passage": sample["passage"],
                "difficult_words": sample["difficult_words"],
                "grade": sample["grade"],
                "chunk_mode": sample["chunk_mode"]
            }
            t0 = time.perf_counter()
            resp = client.post(endpoint, json=payload)
            elapsed = (time.perf_counter() - t0) * 1000

            assert resp.status_code == 200, f"Call {step_num} ({endpoint}) failed with {resp.status_code}: {resp.text}"
            data = resp.json()
            assert data.get("ram_unloaded") is True, f"Call {step_num} ram_unloaded is not True"
            assert "clauses" in data and len(data["clauses"]) > 0, f"Call {step_num} missing clauses"
            call_type = f"direct-prosody (Gr{sample['grade']})"

        # Query /qwen/status IMMEDIATELY after call
        status_resp = client.get("/qwen/status")
        assert status_resp.status_code == 200, f"Status check after call {step_num} failed"
        status_data = status_resp.json()

        is_loaded = status_data.get("is_loaded")
        lifecycle_mode = status_data.get("lifecycle_mode")
        memory_mode = status_data.get("memory_mode")
        avail_ram = status_data.get("available_ram_mb", 0.0)

        current_rss = get_current_rss_mb()
        rss_readings.append(current_rss)

        assert is_loaded is False, (
            f"VIOLATION: Call {step_num} ({call_type}) left Qwen loaded in RAM! is_loaded={is_loaded}"
        )
        assert lifecycle_mode == "on_demand_unload", (
            f"VIOLATION: Call {step_num} changed lifecycle_mode to '{lifecycle_mode}'"
        )
        assert memory_mode == "zero_idle_ram", (
            f"VIOLATION: Call {step_num} memory_mode is '{memory_mode}'"
        )

        call_log.append({
            "step": step_num,
            "call_type": call_type,
            "status_code": resp.status_code,
            "is_loaded": is_loaded,
            "lifecycle_mode": lifecycle_mode,
            "rss_mb": round(current_rss, 2),
            "elapsed_ms": round(elapsed, 2)
        })

        runner.log_pass(
            f"Call {step_num:02d} [{call_type}]",
            f"HTTP 200, is_loaded={is_loaded}, lifecycle={lifecycle_mode}, RSS={current_rss:.2f}MB, time={elapsed:.1f}ms"
        )

    # Post-10-calls garbage collection
    gc.collect()
    rss_final = get_current_rss_mb()
    delta_warmed = rss_final - rss_baseline_warmed

    print(f"\n  [Memory Leak & Stability Summary]")
    print(f"  - Pre-Warmup Raw RSS        : {rss_raw_initial:.2f} MB")
    print(f"  - Post-Warmup Baseline RSS  : {rss_baseline_warmed:.2f} MB")
    print(f"  - Final RSS After 10 Calls  : {rss_final:.2f} MB")
    print(f"  - Active Inferences Delta   : {delta_warmed:+.2f} MB")
    print(f"  - Peak RSS Seen             : {max(rss_readings):.2f} MB")

    # Verification criteria:
    # After warmup, 10 consecutive calls must not leak memory (delta < 15 MB)
    assert delta_warmed < 15.0, (
        f"Memory leak detected! Active RSS growth across 10 calls = {delta_warmed:.2f}MB >= 15MB"
    )
    runner.log_pass(
        "TC-01 Memory Leak Prevention (10 calls)",
        f"Baseline={rss_baseline_warmed:.2f}MB, Final={rss_final:.2f}MB, ActiveDelta={delta_warmed:+.2f}MB (< 15MB threshold) -> NO RUNAWAY LEAK CONFIRMED"
    )


# ==============================================================================
# TEST SUITE 2: LOW-RAM SIMULATION (< 650MB) FALLBACK BEHAVIOR
# ==============================================================================

def test_low_ram_simulation_extract_sgk():
    print("\n--- 2. LOW-RAM SIMULATION (< 650MB) ON /qwen/extract-sgk ---")
    raw_sample = """
    Tiếng Việt 3 - Tuần 12
    Trang 45
    Buổi Sáng Mùa Thu

    Gió mùa thu se lạnh thổi qua từng kẽ lá. Bầu trời xanh trong vắt, không một gợn mây đen.
    Những tia nắng vàng dịu dàng trải dài trên con đường làng thân quen.

    45
    Câu 1: Em hãy tìm các hình ảnh so sánh trong bài thơ trên?
    """

    # Scenario A: Free RAM is 450MB (< 650MB threshold)
    # main.py checks avail_ram >= QWEN_RAM_THRESHOLD_MB, should automatically bypass Qwen
    # and use deterministic extractor cleanly without crash
    with mock.patch("python_service.main.get_available_ram_mb", return_value=450.0):
        t0 = time.perf_counter()
        resp = client.post("/qwen/extract-sgk", json={"raw_text": raw_sample, "grade": 3})
        elapsed = (time.perf_counter() - t0) * 1000

        assert resp.status_code == 200, f"Expected HTTP 200 under 450MB RAM, got {resp.status_code}: {resp.text}"
        data = resp.json()

        assert "clean_content" in data and len(data["clean_content"]) > 0, "Missing clean_content under low RAM"
        assert "difficultWords" in data and len(data["difficultWords"]) >= 1, "Missing difficultWords under low RAM"
        assert "summary" in data and len(data["summary"]) > 0, "Missing summary under low RAM"
        assert data.get("source") in ("deterministic_pedagogy", "deterministic_pedagogy_fallback"), (
            f"Expected deterministic fallback source, got '{data.get('source')}'"
        )
        assert data.get("ram_unloaded") is True, "ram_unloaded should be True"

        # Check status endpoint under 450MB simulation
        status = client.get("/qwen/status").json()
        assert status.get("is_loaded") is False, "Qwen must remain unloaded under low RAM"
        assert status.get("available_ram_mb") == 450.0, "Status must reflect simulated 450MB RAM"

        runner.log_pass(
            "TC-02 Low-RAM Simulation (450MB < 650MB)",
            f"HTTP 200, source='{data.get('source')}', difficultWords={data.get('difficultWords')}, is_loaded={status.get('is_loaded')}, time={elapsed:.1f}ms"
        )

    # Scenario B: Simulated severe RAM drop where get_qwen_model() raises MemoryError
    # Verifying that extract-sgk catches MemoryError and executes finally unload
    with mock.patch("python_service.main.get_available_ram_mb", return_value=700.0):
        # Force get_qwen_model to raise MemoryError as if allocation failed
        with mock.patch("python_service.main.get_qwen_model", side_effect=MemoryError("OOM simulated")):
            resp = client.post("/qwen/extract-sgk", json={"raw_text": raw_sample, "grade": 3})
            assert resp.status_code == 200, f"Expected HTTP 200 on MemoryError fallback, got {resp.status_code}"
            data = resp.json()

            assert data.get("source") == "deterministic_pedagogy_fallback", (
                f"Expected source 'deterministic_pedagogy_fallback', got '{data.get('source')}'"
            )
            assert len(data.get("difficultWords", [])) >= 1, "Expected extracted difficult words in fallback"
            assert data.get("ram_unloaded") is True, "ram_unloaded must be True"

            status = client.get("/qwen/status").json()
            assert status.get("is_loaded") is False, "Qwen must be unloaded after MemoryError in finally block"

            runner.log_pass(
                "TC-03 Severe Low-RAM OOM MemoryError Trapping",
                f"HTTP 200, graceful fallback to '{data.get('source')}', is_loaded={status.get('is_loaded')}"
            )


# ==============================================================================
# TEST SUITE 3: LOW-RAM SIMULATION ON OTHER PEDAGOGICAL ENDPOINTS
# ==============================================================================

def test_low_ram_simulation_pedagogical_comment_and_passage():
    print("\n--- 3. LOW-RAM SIMULATION ON PEDAGOGICAL COMMENT & PASSAGE GENERATOR ---")
    
    # Direct test of generate_pedagogical_comment_tier2 under low RAM
    from python_service.main import generate_pedagogical_comment_tier2, generate_dictation_passage_tier2

    creativity_info = {"score": 1.0, "evidence": ["Từ láy: róc rách"]}
    errors = [{"error": "suối", "suggestion": "suối", "error_type": "chinh_ta", "error_label": "Chính tả"}]

    # When get_available_ram_mb returns 300MB (< 650MB), get_qwen_model raises MemoryError
    with mock.patch("python_service.main.get_available_ram_mb", return_value=300.0):
        comment_res = generate_pedagogical_comment_tier2(creativity_info, errors)
        assert isinstance(comment_res, dict), "Expected dict response"
        assert "text" in comment_res and len(comment_res["text"]) > 0, "Missing comment text"
        assert "suggestions" in comment_res and len(comment_res["suggestions"]) >= 1, "Missing suggestions"
        assert comment_res.get("source") == "tang1_deterministic_fallback", (
            f"Expected tang1_deterministic_fallback, got {comment_res.get('source')}"
        )

        runner.log_pass(
            "TC-04 Low-RAM Comment Fallback (300MB)",
            f"source='{comment_res.get('source')}', suggestions_count={len(comment_res.get('suggestions', []))}"
        )

        passage_res = generate_dictation_passage_tier2(grade=3, topic="Mùa xuân")
        assert isinstance(passage_res, dict), "Expected dict response"
        assert "content" in passage_res and len(passage_res["content"]) > 0, "Missing passage content"
        assert "difficultWords" in passage_res and len(passage_res["difficultWords"]) > 0, "Missing difficult words"
        assert passage_res.get("source") == "curriculum_bank_fallback", (
            f"Expected curriculum_bank_fallback, got {passage_res.get('source')}"
        )

        runner.log_pass(
            "TC-05 Low-RAM Passage Fallback (300MB)",
            f"source='{passage_res.get('source')}', title='{passage_res.get('title')}', content_words={len(passage_res['content'].split())}"
        )


# ==============================================================================
# TEST SUITE 4: RAPID-FIRE CONCURRENCY & CACHE BURST STRESS
# ==============================================================================

def test_rapid_fire_prosody_cache_burst():
    print("\n--- 4. RAPID-FIRE PROSODY REPETITION & LRU CACHE LATENCY ---")
    
    passage = "Gió mùa thu se lạnh thổi qua từng kẽ lá. Bầu trời xanh trong vắt, không một gợn mây đen."
    difficult_words = ["se lạnh", "trong vắt"]
    payload = {
        "passage": passage,
        "difficult_words": difficult_words,
        "grade": 3,
        "chunk_mode": "phrase"
    }

    # Call 1: Miss & generate
    t0 = time.perf_counter()
    resp1 = client.post("/qwen/direct-prosody", json=payload)
    t_miss = (time.perf_counter() - t0) * 1000
    assert resp1.status_code == 200
    data1 = resp1.json()
    assert data1.get("cache_hit") is False

    # Calls 2-6: Consecutive Rapid Hits
    hit_latencies = []
    for burst_idx in range(5):
        t0 = time.perf_counter()
        resp = client.post("/qwen/direct-prosody", json=payload)
        t_hit = (time.perf_counter() - t0) * 1000
        hit_latencies.append(t_hit)
        assert resp.status_code == 200
        data = resp.json()
        assert data.get("cache_hit") is True, f"Burst {burst_idx+1} expected cache_hit=True"
        assert data.get("ram_unloaded") is True

        # Check status after every hit
        status = client.get("/qwen/status").json()
        assert status.get("is_loaded") is False

    avg_hit_ms = sum(hit_latencies) / len(hit_latencies)
    runner.log_pass(
        "TC-06 Rapid-Fire Cache Burst (5 consecutive hits)",
        f"Miss={t_miss:.2f}ms, AvgHit={avg_hit_ms:.2f}ms (< 15ms target), all is_loaded=False"
    )


# ==============================================================================
# ENTRY POINT
# ==============================================================================

if __name__ == "__main__":
    print("=" * 80)
    print("RUNNING CHALLENGER 2 EMPIRICAL STRESS TEST HARNESS")
    print("=" * 80)

    try:
        test_10_consecutive_calls_and_lifecycle()
        test_low_ram_simulation_extract_sgk()
        test_low_ram_simulation_pedagogical_comment_and_passage()
        test_rapid_fire_prosody_cache_burst()
    except Exception as e:
        runner.log_fail("Execution Error", "Unhandled exception in test harness", e)
        import traceback
        traceback.print_exc()

    success = runner.print_summary()
    sys.exit(0 if success else 1)
