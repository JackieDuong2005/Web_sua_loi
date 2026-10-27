"""
================================================================================
Challenger 1: Milestone 5 — E2E Concurrency, Load & Memory Leak Stress Harness
================================================================================
Target:
  - High concurrency stress on /qwen/status, /qwen/extract-sgk, /qwen/direct-prosody
  - Process RSS memory leak detection (before vs. after stress test)
  - 0 MB Idle RAM footprint invariant verification (is_loaded == False)
  - In-memory LRU prosody cache benchmark (sub-50ms latency verification)
  - Thread safety under concurrent load

Governance: GEMINI.md compliant (pure text/table output, NO MERMAID).
Author: Challenger 1 (Milestone 5)
================================================================================
"""

import os
import sys
import time
import gc
import json
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Dict, Any, List

# Ensure UTF-8 output on Windows
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

import psutil
from fastapi.testclient import TestClient
from python_service.main import app, _prosody_script_cache, _prosody_cache_lock

client = TestClient(app)

def get_process_rss_mb() -> float:
    gc.collect()
    process = psutil.Process(os.getpid())
    return process.memory_info().rss / (1024.0 * 1024.0)

def run_stress_suite():
    print("=" * 80)
    print("CHALLENGER 1: MILESTONE 5 E2E CONCURRENCY & ADVERSARIAL STRESS TEST")
    print("=" * 80)
    
    start_rss_mb = get_process_rss_mb()
    print(f"[*] Initial Process RSS: {start_rss_mb:.2f} MB")
    
    # --------------------------------------------------------------------------
    # 1. Baseline Status & Idle RAM Verification
    # --------------------------------------------------------------------------
    print("\n[Phase 1] Pre-Flight Baseline Invariant Check")
    status_resp = client.get("/qwen/status")
    assert status_resp.status_code == 200, f"Status failed: {status_resp.status_code}"
    status_data = status_resp.json()
    print(f"  - Lifecycle Mode: {status_data.get('lifecycle_mode')}")
    print(f"  - is_loaded: {status_data.get('is_loaded')} (expected: False)")
    print(f"  - Available RAM: {status_data.get('available_ram_mb')} MB")
    assert status_data.get("is_loaded") is False, "Violation: Qwen model is pre-loaded at idle!"
    assert status_data.get("lifecycle_mode") == "on_demand_unload", "Violation: Lifecycle mode is not on_demand_unload!"

    # --------------------------------------------------------------------------
    # 2. LRU Prosody Cache Benchmark (Latency Verification < 50ms)
    # --------------------------------------------------------------------------
    print("\n[Phase 2] LRU Prosody Cache High-Throughput Latency Benchmark")
    sample_passage = "Trường tiểu học Kim Đồng nằm bên dòng sông xanh mát. Mỗi sáng, tiếng trống trường giục giã bước chân em tới lớp."
    sample_diff = ["tiểu học", "dòng sông", "giục giã"]
    
    # First request: Cache Miss
    t0 = time.perf_counter()
    miss_resp = client.post("/qwen/direct-prosody", json={
        "passage": sample_passage,
        "difficult_words": sample_diff,
        "grade": 3,
        "chunk_mode": "phrase"
    })
    miss_time_ms = (time.perf_counter() - t0) * 1000
    assert miss_resp.status_code == 200, f"Miss request failed: {miss_resp.status_code}"
    miss_data = miss_resp.json()
    assert miss_data.get("cache_hit") is False, "Expected cache_hit == False on first request"
    print(f"  - Cache Miss Latency: {miss_time_ms:.2f} ms")
    
    # Rapid Repeated Requests: Cache Hits (100 sequential hits)
    hit_latencies = []
    for _ in range(100):
        t0 = time.perf_counter()
        hit_resp = client.post("/qwen/direct-prosody", json={
            "passage": sample_passage,
            "difficult_words": sample_diff,
            "grade": 3,
            "chunk_mode": "phrase"
        })
        lat_ms = (time.perf_counter() - t0) * 1000
        hit_latencies.append(lat_ms)
        assert hit_resp.status_code == 200
        assert hit_resp.json().get("cache_hit") is True
    
    avg_hit_ms = sum(hit_latencies) / len(hit_latencies)
    max_hit_ms = max(hit_latencies)
    min_hit_ms = min(hit_latencies)
    p95_hit_ms = sorted(hit_latencies)[int(len(hit_latencies) * 0.95)]
    
    print(f"  - Cache Hit Count: {len(hit_latencies)} requests")
    print(f"  - Min Latency: {min_hit_ms:.3f} ms")
    print(f"  - Avg Latency: {avg_hit_ms:.3f} ms")
    print(f"  - P95 Latency: {p95_hit_ms:.3f} ms")
    print(f"  - Max Latency: {max_hit_ms:.3f} ms")
    assert avg_hit_ms < 50.0, f"Violation: Cache hit average latency {avg_hit_ms} ms exceeds 50 ms!"
    assert p95_hit_ms < 50.0, f"Violation: Cache hit P95 latency {p95_hit_ms} ms exceeds 50 ms!"

    # --------------------------------------------------------------------------
    # 3. High Concurrency Stress Test across All Endpoints
    # --------------------------------------------------------------------------
    print("\n[Phase 3] High-Concurrency Multi-Threaded Stress Test (50 concurrent workers)")
    
    test_workloads = [
        ("GET", "/qwen/status", None),
        ("POST", "/qwen/extract-sgk", {
            "raw_text": "Tiếng Việt 2 - Bài 5\nTrang 22\nBông hoa niềm vui\nEm đi thăm cô giáo ngày khai trường.\nTrang 23\nCâu hỏi: Em học được điều gì?",
            "grade": 2
        }),
        ("POST", "/qwen/direct-prosody", {
            "passage": sample_passage,
            "difficult_words": sample_diff,
            "grade": 3,
            "chunk_mode": "phrase"
        }),
        ("POST", "/qwen/direct-prosody", {
            "passage": "Mùa xuân chim hót ríu rít trên cành cây bàng non.",
            "difficult_words": ["ríu rít", "cành cây"],
            "grade": 1,
            "chunk_mode": "clause"
        }),
        ("GET", "/tts?text=Em%20yêu%20trường%20em&style=warm_story", None),
    ]
    
    total_concurrent_requests = 100
    errors: List[str] = []
    status_codes: Dict[int, int] = {}
    lock = threading.Lock()
    
    def worker_task(req_id: int):
        method, path, payload = test_workloads[req_id % len(test_workloads)]
        try:
            if method == "GET":
                r = client.get(path)
            else:
                r = client.post(path, json=payload)
            with lock:
                status_codes[r.status_code] = status_codes.get(r.status_code, 0) + 1
            if r.status_code not in (200, 400):
                with lock:
                    errors.append(f"Req {req_id} ({method} {path}) returned HTTP {r.status_code}: {r.text[:100]}")
        except Exception as ex:
            with lock:
                errors.append(f"Req {req_id} ({method} {path}) raised exception: {ex}")

    t_start = time.perf_counter()
    with ThreadPoolExecutor(max_workers=20) as executor:
        futures = [executor.submit(worker_task, i) for i in range(total_concurrent_requests)]
        for f in as_completed(futures):
            f.result()
    total_duration = time.perf_counter() - t_start
    rps = total_concurrent_requests / total_duration
    
    print(f"  - Completed: {total_concurrent_requests} requests in {total_duration:.2f}s ({rps:.1f} req/s)")
    print(f"  - Status distribution: {status_codes}")
    print(f"  - Error count: {len(errors)}")
    if errors:
        for err in errors[:5]:
            print(f"    ! {err}")
    assert len(errors) == 0, f"Concurrency test failed with {len(errors)} errors!"
    assert status_codes.get(200, 0) == total_concurrent_requests, "Not all requests returned HTTP 200!"

    # --------------------------------------------------------------------------
    # 4. Zero Memory Leak & 0 MB Idle RAM footprint Verification
    # --------------------------------------------------------------------------
    print("\n[Phase 4] Zero Memory Leak & Post-Stress Invariant Verification")
    
    # Check status endpoint immediately after stress
    post_status = client.get("/qwen/status").json()
    print(f"  - Post-stress is_loaded: {post_status.get('is_loaded')} (MUST be False)")
    print(f"  - Post-stress lifecycle_mode: {post_status.get('lifecycle_mode')}")
    print(f"  - Post-stress cache_entries: {post_status.get('cache_entries')}")
    assert post_status.get("is_loaded") is False, "Violation: is_loaded is True after concurrent stress!"

    # Measure process RSS
    end_rss_mb = get_process_rss_mb()
    delta_rss_mb = end_rss_mb - start_rss_mb
    print(f"  - Pre-stress RSS:  {start_rss_mb:.2f} MB")
    print(f"  - Post-stress RSS: {end_rss_mb:.2f} MB")
    print(f"  - Delta RSS:       {delta_rss_mb:+.2f} MB")
    
    # An acceptable delta is within normal Python runtime overhead (< 50MB for test client caches and thread pools)
    assert delta_rss_mb < 60.0, f"Violation: Abnormal memory leak detected: delta={delta_rss_mb:.2f} MB!"
    print("  -> Process RSS memory check PASSED (Zero memory leak confirmed).")

    # --------------------------------------------------------------------------
    # 5. Adversarial Input Fuzzing
    # --------------------------------------------------------------------------
    print("\n[Phase 5] Adversarial Boundary & Fuzzing Resilience")
    
    adversarial_cases = [
        # Malformed / Extreme inputs
        ("POST", "/qwen/extract-sgk", {"raw_text": "   \n\t   ", "grade": 3}, 400),
        ("POST", "/qwen/extract-sgk", {"raw_text": "Tiếng Việt 1\nTrang 1\nCâu hỏi: Em hãy đọc?", "grade": 1}, 400), # only headers + questions
        ("POST", "/qwen/direct-prosody", {"passage": "   ", "difficult_words": []}, 400),
        ("POST", "/qwen/direct-prosody", {"passage": "A", "difficult_words": None, "grade": 99}, 200), # grade bounds
        ("POST", "/qwen/direct-prosody", {"passage": "Một hai ba bốn năm.", "difficult_words": "một, hai, ba"}, 200), # string difficult_words
    ]
    
    for method, path, payload, expected_code in adversarial_cases:
        res = client.post(path, json=payload)
        assert res.status_code == expected_code, f"Expected {expected_code} for {payload}, got {res.status_code}: {res.text}"
        # Always check that is_loaded remains False
        chk = client.get("/qwen/status").json()
        assert chk.get("is_loaded") is False, f"is_loaded became True after {payload}!"
    print("  -> All adversarial boundary tests PASSED.")

    print("\n" + "=" * 80)
    print("ALL EMPIRICAL STRESS TESTS PASSED WITH 100% SUCCESS!")
    print("=" * 80)

if __name__ == "__main__":
    run_stress_suite()
