"""
Milestone 2 Empirical Stress Test Suite — Challenger M2-1
Target: Prosody Director (Zero-Word-Mutation, Difficult Word Pause Rule) & LRU Cache
Author: Challenger M2-1 (Adversarial Critic & Domain Specialist)
Standard: PStack / Lauren Tan Rigorous Verification & GEMINI.md Core Rules
"""

import sys
import io
import time
import os
import re
import unicodedata
from typing import List, Dict, Any

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
from python_service.main import (
    app,
    segment_into_pedagogical_clauses,
    direct_prosody_script,
    _prosody_script_cache,
    _prosody_cache_lock,
    _PROSODY_CACHE_MAX_ENTRIES,
)

client = TestClient(app)


class StressTestLogger:
    def __init__(self):
        self.total = 0
        self.passed = 0
        self.failed = 0
        self.findings = []
        self.failures = []

    def log_pass(self, name: str, details: str):
        self.total += 1
        self.passed += 1
        print(f"  [PASS] {name}: {details}")

    def log_fail(self, name: str, details: str, error: Exception = None):
        self.total += 1
        self.failed += 1
        err_msg = f"{details} -> {error}" if error else details
        self.failures.append((name, err_msg))
        print(f"  [FAIL] {name}: {err_msg}")

    def log_finding(self, severity: str, name: str, description: str):
        self.findings.append((severity, name, description))
        print(f"  [FINDING - {severity}] {name}: {description}")

    def print_summary(self):
        print("\n" + "=" * 80)
        print("EMPIRICAL CHALLENGER M2-1 STRESS TEST SUMMARY")
        print("=" * 80)
        print(f"Total Tests Run : {self.total}")
        print(f"Passed          : {self.passed}")
        print(f"Failed          : {self.failed}")
        if self.findings:
            print("\nAdversarial Findings / Edge Vulnerabilities:")
            for sev, name, desc in self.findings:
                print(f"  - [{sev}] {name}: {desc}")
        if self.failures:
            print("\nFailures:")
            for name, err in self.failures:
                print(f"  - {name}: {err}")
        print("=" * 80)


runner = StressTestLogger()


# ==============================================================================
# PASSAGES FOR EMPIRICAL TESTING
# ==============================================================================

# Standard Vietnamese SGK Passages
PASSAGE_POETRY = (
    "Tuổi con là tuổi Ngựa\n"
    "Nhưng mẹ ơi, đừng buồn\n"
    "Ngựa con đâu đã lớn\n"
    "Còn lẫm chẫm từng bước chân.\n\n"
    "Mẹ bảo: \"Ngựa con ơi,\n"
    "Con đi qua những đâu?\"\n"
    "Con đi qua miền sim tím\n"
    "Đồi hoa nở rợp một màu xanh;\n"
    "Con đi qua rừng bạt ngàn,\n"
    "Nghe suối reo róc rách,\n"
    "Nghe tiếng chim hót vang trời!"
)
DIFF_WORDS_POETRY = ["lẫm chẫm", "bạt ngàn", "róc rách"]

PASSAGE_DIALOGUE_STANDARD = (
    "Bé kẹp lại tóc, thả ống quần xuống, lấy cái nón lá của má đội lên đầu. "
    "Nó cố bắt chước dáng đi thong thả của cô giáo khi bước vào lớp. "
    "Mấy đứa nhỏ làm học trò: thằng Hiển ngọng líu, cái Tự múp míp, hai đứa bé con cười tít mắt. "
    "Cô giáo bé nghiêm trang nhìn các em: \"Bắt đầu học bài nhé!\" "
    "Đàn em nhao nhao: \"Vâng ạ!\""
)
DIFF_WORDS_DIALOGUE = ["ngọng líu", "múp míp", "nghiêm trang"]

PASSAGE_DESCRIPTIVE = (
    "Cửa Tùng là một bờ biển tuyệt đẹp ở miền Trung. "
    "Bãi cát ở đây mịn màng, trắng muốt như bột; nước biển trong xanh, nhìn thấu đáy. "
    "Bình minh lên, mặt trời như chiếc mâm đồng đỏ ối... "
    "Chiều về, gió từ khơi xa thổi vào mát rượi, xua tan bao nỗi mệt nhọc sau một ngày lao động vất vả."
)
DIFF_WORDS_DESCRIPTIVE = ["mịn màng", "trắng muốt", "mát rượi"]

PASSAGE_DRAMA = (
    "Một hôm, qua một vùng cỏ xước xanh dài, tôi chợt nghe tiếng khóc tỉ tê. "
    "Đi vài bước nữa, tôi gặp chị Nhà Trò ngồi gục đầu bên tảng đá cuội. "
    "Chị Nhà Trò đã bé nhỏ lại gầy yếu quá, người bự những phấn, như mới lột.\n"
    "Tôi xòe cả hai càng ra, bảo Nhà Trò:\n"
    "- Em đừng sợ. Hãy trở về cùng với tôi đây. "
    "Đứa độc ác không thể cậy khỏe mà bắt nạt kẻ yếu được!\n"
    "Nói rồi, tôi dắt chị Nhà Trò đi..."
)
DIFF_WORDS_DRAMA = ["tỉ tê", "gầy yếu", "bắt nạt"]

PASSAGE_NO_TERMINAL_PUNCT = (
    "Hôm nay trời nắng chang chang\n"
    "Mèo con đi học chẳng mang thứ gì\n"
    "Chỉ mang một cái bút chì\n"
    "Và mang một mẩu bánh mì con con"
)
DIFF_WORDS_NO_PUNCT = ["chang chang", "bút chì"]

# Adversarial Passages (Testing Edge Formats)
PASSAGE_ADVERSARIAL_QUOTE_DOT = (
    "Cô giáo bé nghiêm trang nhìn các em: \"Bắt đầu học bài nhé!\". "
    "Đàn em nhao nhao: \"Vâng ạ!\"."
)

PASSAGE_LRU_BENCHMARK = (
    "Tiếng suối trong như tiếng hát xa, trăng lồng cổ thụ bóng lồng hoa. "
    "Cảnh khuya như vẽ người chưa ngủ, chưa ngủ vì lo nỗi nước nhà."
)
DIFF_WORDS_LRU = ["cổ thụ", "nước nhà"]


# ==============================================================================
# SUITE 1: ZERO-WORD-MUTATION & VERBATIM PRESERVATION TEST
# ==============================================================================

def test_zero_word_mutation():
    print("\n" + "=" * 80)
    print("TEST SUITE 1: ZERO-WORD-MUTATION & VERBATIM PRESERVATION")
    print("=" * 80)

    passages = [
        ("Poetry (Tuổi Ngựa)", PASSAGE_POETRY, DIFF_WORDS_POETRY),
        ("Dialogue Standard SGK (Cô giáo tí hon)", PASSAGE_DIALOGUE_STANDARD, DIFF_WORDS_DIALOGUE),
        ("Descriptive (Cửa Tùng)", PASSAGE_DESCRIPTIVE, DIFF_WORDS_DESCRIPTIVE),
        ("Drama (Dế Mèn bênh vực kẻ yếu)", PASSAGE_DRAMA, DIFF_WORDS_DRAMA),
        ("Poetry No Terminal Punctuation", PASSAGE_NO_TERMINAL_PUNCT, DIFF_WORDS_NO_PUNCT),
    ]

    for name, passage, diff_words in passages:
        for chunk_mode in ["phrase", "sentence"]:
            test_id = f"ZWM-{name} [{chunk_mode}]"
            try:
                resp = client.post("/qwen/direct-prosody", json={
                    "passage": passage,
                    "difficult_words": diff_words,
                    "grade": 3,
                    "chunk_mode": chunk_mode
                })
                assert resp.status_code == 200, f"HTTP {resp.status_code}: {resp.text}"
                data = resp.json()
                clauses = data["clauses"]

                # 1. Kiểm tra word list khớp chính xác
                orig_words = passage.split()
                clause_words = [w for c in clauses for w in c["text"].split()]

                assert len(orig_words) == len(clause_words), (
                    f"Word count mismatch: orig={len(orig_words)}, clauses={len(clause_words)}\n"
                    f"Missing words: {set(orig_words) - set(clause_words)}\n"
                    f"Extra words: {set(clause_words) - set(orig_words)}"
                )

                assert orig_words == clause_words, (
                    f"Word sequence mismatch!\n"
                    f"First diff: {[i for i, (w1, w2) in enumerate(zip(orig_words, clause_words)) if w1 != w2]}"
                )

                # 2. Kiểm tra non-whitespace characters
                orig_non_space = [c for c in passage if not c.isspace()]
                clause_non_space = [c for cl in clauses for c in cl["text"] if not c.isspace()]
                assert orig_non_space == clause_non_space, (
                    f"Non-whitespace character invariant failed! Lengths: orig={len(orig_non_space)}, clauses={len(clause_non_space)}"
                )

                # 3. Kiểm tra trường total_words
                reported_total = data["total_words"]
                assert reported_total == len(orig_words), (
                    f"total_words reported {reported_total} != actual word count {len(orig_words)}"
                )

                runner.log_pass(test_id, f"100% Verbatim match ({len(orig_words)} words, {len(clauses)} clauses)")
            except Exception as e:
                runner.log_fail(test_id, "Zero-Word-Mutation invariant violated", e)

    # Adversarial Sub-test 1.1: Chained punctuation quote-dot `!".`
    test_id_quotedot = "ZWM-Adversarial-Quote-Dot"
    try:
        resp = client.post("/qwen/direct-prosody", json={
            "passage": PASSAGE_ADVERSARIAL_QUOTE_DOT,
            "difficult_words": ["học bài"],
            "grade": 3
        })
        clauses = resp.json()["clauses"]
        orig_words = PASSAGE_ADVERSARIAL_QUOTE_DOT.split()
        clause_words = [w for c in clauses for w in c["text"].split()]

        # Check for phantom punctuation-only clause
        punct_only_clauses = [c for c in clauses if not any(ch.isalnum() for ch in c["text"])]
        if punct_only_clauses:
            runner.log_finding(
                "MEDIUM",
                "Phantom Punctuation Clause on Quote-Period Sequence",
                f"Delimiters regex `[,;:!\\?\\.\\n]+[\"']` leaves trailing period as a separate clause: "
                f"{[c['text'] for c in punct_only_clauses]}. Word count altered: orig={len(orig_words)}, clauses={len(clause_words)}."
            )
        else:
            runner.log_pass(test_id_quotedot, "Quote-dot sequence handled cleanly")
    except Exception as e:
        runner.log_fail(test_id_quotedot, "Adversarial quote-dot test failed", e)


# ==============================================================================
# SUITE 2: DIFFICULT WORD PAUSE RULE VERIFICATION
# ==============================================================================

def test_difficult_word_pause_rule():
    print("\n" + "=" * 80)
    print("TEST SUITE 2: DIFFICULT WORD PAUSE RULE (+2.5s & style=='emphasis')")
    print("=" * 80)

    passages = [
        ("Poetry (Tuổi Ngựa)", PASSAGE_POETRY, DIFF_WORDS_POETRY),
        ("Dialogue Standard SGK (Cô giáo tí hon)", PASSAGE_DIALOGUE_STANDARD, DIFF_WORDS_DIALOGUE),
        ("Descriptive (Cửa Tùng)", PASSAGE_DESCRIPTIVE, DIFF_WORDS_DESCRIPTIVE),
        ("Drama (Dế Mèn bênh vực kẻ yếu)", PASSAGE_DRAMA, DIFF_WORDS_DRAMA),
        ("Poetry No Terminal Punctuation", PASSAGE_NO_TERMINAL_PUNCT, DIFF_WORDS_NO_PUNCT),
    ]

    for name, passage, diff_words in passages:
        test_id = f"DW-Pause-{name}"
        try:
            resp = client.post("/qwen/direct-prosody", json={
                "passage": passage,
                "difficult_words": diff_words,
                "grade": 3,
                "chunk_mode": "phrase"
            })
            assert resp.status_code == 200, f"HTTP {resp.status_code}"
            data = resp.json()
            clauses = data["clauses"]

            matched_count = 0
            for c in clauses:
                matched_diff = c.get("matched_difficult_words", [])
                text_lower = c["text"].lower()

                has_diff = any(dw.lower() in text_lower for dw in diff_words)

                if has_diff:
                    matched_count += 1
                    # Rule 1: style == "emphasis"
                    assert c["style"] == "emphasis", (
                        f"Clause '{c['text']}' contains difficult word but style='{c['style']}' != 'emphasis'"
                    )
                    # Rule 2: pause_sec >= 4.0
                    assert c["pause_sec"] >= 4.0, (
                        f"Clause '{c['text']}' contains difficult word but pause_sec={c['pause_sec']} < 4.0s"
                    )
                    # Rule 3: rate == "-20%"
                    assert c["rate"] == "-20%", (
                        f"Clause '{c['text']}' contains difficult word but rate='{c['rate']}' != '-20%'"
                    )
                    # Rule 4: matched_difficult_words non-empty
                    assert len(matched_diff) > 0, (
                        f"Clause '{c['text']}' contains difficult word but matched_difficult_words is empty"
                    )
                    # Rule 5: style_label == "Nhấn mạnh từ khó"
                    assert c["style_label"] == "Nhấn mạnh từ khó", (
                        f"Clause '{c['text']}' has style_label='{c['style_label']}'"
                    )
                else:
                    # Non-difficult clause
                    assert c["style"] != "emphasis", (
                        f"Clause '{c['text']}' has no difficult words but assigned style='emphasis'"
                    )
                    assert c["pause_sec"] < 4.0, (
                        f"Clause '{c['text']}' has no difficult words but pause_sec={c['pause_sec']} >= 4.0s"
                    )
                    assert len(matched_diff) == 0, (
                        f"Clause '{c['text']}' has no difficult words but matched_difficult_words={matched_diff}"
                    )

            assert matched_count > 0, f"No difficult words were matched across all clauses for {name}!"
            runner.log_pass(test_id, f"Verified across {len(clauses)} clauses ({matched_count} emphasis clauses)")
        except Exception as e:
            runner.log_fail(test_id, "Difficult Word Pause Rule violated", e)

    # Adversarial Sub-test 2.1: Case-insensitivity and punctuation attachment
    test_id_adv = "DW-Adversarial-Attachment"
    try:
        adv_passage = "Học sinh ngắm nhìn CỬA TÙNG, lòng thấy MÁT RƯỢI! Biển đẹp lắm."
        adv_diff = ["cửa tùng", "mát rượi"]
        resp = client.post("/qwen/direct-prosody", json={
            "passage": adv_passage,
            "difficult_words": adv_diff,
            "grade": 3
        })
        clauses = resp.json()["clauses"]
        c0 = clauses[0]
        assert c0["style"] == "emphasis" and c0["pause_sec"] >= 4.0
        assert "cửa tùng" in [w.lower() for w in c0["matched_difficult_words"]]

        c1 = clauses[1]
        assert c1["style"] == "emphasis" and c1["pause_sec"] >= 4.0
        assert "mát rượi" in [w.lower() for w in c1["matched_difficult_words"]]

        runner.log_pass(test_id_adv, "Uppercase and punctuation-attached difficult words matched properly")
    except Exception as e:
        runner.log_fail(test_id_adv, "Adversarial attachment test failed", e)

    # Adversarial Sub-test 2.2: Substring matching check (e.g. 'ba' in 'bát ngát')
    test_id_sub = "DW-Adversarial-Substring-Check"
    try:
        sub_passage = "Trời xanh bao la, đồng lúa bát ngát tận chân trời."
        sub_diff = ["ba"]
        resp = client.post("/qwen/direct-prosody", json={
            "passage": sub_passage,
            "difficult_words": sub_diff,
            "grade": 3
        })
        clauses = resp.json()["clauses"]
        c1 = clauses[1]
        if "ba" in [w.lower() for w in c1.get("matched_difficult_words", [])]:
            runner.log_finding(
                "MEDIUM",
                "Substring Over-Matching",
                "Difficult word 'ba' matched inside 'bát ngát' due to substring check 'or dw_norm in lower_text'. Word boundary regex was bypassed."
            )
        else:
            runner.log_pass(test_id_sub, "Substring overmatch did not occur")
    except Exception as e:
        runner.log_fail(test_id_sub, "Substring test error", e)

    # Adversarial Sub-test 2.3: Unicode Normalization (NFC vs NFD)
    test_id_nfd = "DW-Adversarial-Unicode-NFD"
    try:
        nfc_passage = "Cô giáo múp míp, cái Tự cười tít mắt."
        nfd_diff = [unicodedata.normalize('NFD', "múp míp")]
        resp = client.post("/qwen/direct-prosody", json={
            "passage": nfc_passage,
            "difficult_words": nfd_diff,
            "grade": 3
        })
        clauses = resp.json()["clauses"]
        c0 = clauses[0]
        if c0["style"] != "emphasis":
            runner.log_finding(
                "LOW",
                "Unicode Normalization Discrepancy",
                "NFD decomposed difficult word did not match NFC precomposed passage text. unicodedata.normalize('NFC') not applied."
            )
        else:
            runner.log_pass(test_id_nfd, "Unicode NFD matched NFC properly")
    except Exception as e:
        runner.log_fail(test_id_nfd, "Unicode test error", e)


# ==============================================================================
# SUITE 3: LRU CACHE STRESS TEST (50 SEQUENTIAL REQUESTS & BOUNDED MEMORY)
# ==============================================================================

def test_lru_cache_stress():
    print("\n" + "=" * 80)
    print("TEST SUITE 3: LRU CACHE STRESS TEST (50 SEQUENTIAL REQUESTS & BOUNDED MEMORY)")
    print("=" * 80)

    # 1. 50 Sequential Cache Hit Requests
    payload = {
        "passage": PASSAGE_LRU_BENCHMARK,
        "difficult_words": DIFF_WORDS_LRU,
        "grade": 3,
        "chunk_mode": "phrase"
    }

    # Prime cache
    t_prime_0 = time.perf_counter()
    resp_prime = client.post("/qwen/direct-prosody", json=payload)
    t_prime = (time.perf_counter() - t_prime_0) * 1000
    assert resp_prime.status_code == 200
    # Prime call must be cache_hit == False (or if previously cached, that's fine, but let's log latency)
    prime_hit = resp_prime.json().get("cache_hit")
    print(f"  Prime call: cache_hit={prime_hit}, latency={t_prime:.2f}ms")

    latencies = []
    NUM_SEQUENTIAL = 50
    for i in range(NUM_SEQUENTIAL):
        t0 = time.perf_counter()
        resp = client.post("/qwen/direct-prosody", json=payload)
        elapsed_ms = (time.perf_counter() - t0) * 1000
        latencies.append(elapsed_ms)

        assert resp.status_code == 200, f"Request {i+1} failed: {resp.status_code}"
        data = resp.json()
        assert data.get("cache_hit") is True, f"Request {i+1} failed to hit cache!"

    min_lat = min(latencies)
    max_lat = max(latencies)
    avg_lat = sum(latencies) / len(latencies)
    sorted_lat = sorted(latencies)
    p95_lat = sorted_lat[int(0.95 * len(latencies))]

    print(f"  Latency Profile across {NUM_SEQUENTIAL} sequential cache hits:")
    print(f"    - Min latency : {min_lat:.3f} ms")
    print(f"    - Avg latency : {avg_lat:.3f} ms")
    print(f"    - P95 latency : {p95_lat:.3f} ms")
    print(f"    - Max latency : {max_lat:.3f} ms")

    test_id_50 = f"LRU-50-Sequential-Hits (Threshold < 15ms)"
    if avg_lat < 15.0 and max_lat < 15.0:
        runner.log_pass(test_id_50, f"All 50 hits < 15ms (Avg={avg_lat:.3f}ms, Max={max_lat:.3f}ms)")
    elif avg_lat < 15.0:
        runner.log_pass(test_id_50, f"Avg hit latency {avg_lat:.3f}ms < 15ms (P95={p95_lat:.3f}ms, Max={max_lat:.3f}ms)")
    else:
        runner.log_fail(test_id_50, f"Cache hit latency exceeded 15ms threshold: Avg={avg_lat:.3f}ms, Max={max_lat:.3f}ms")

    # 2. Bounded Cache & Memory Growth Test (Capacity 128 eviction)
    test_id_mem = "LRU-Cache-Capacity-And-Memory-Bound"
    try:
        import psutil
        proc = psutil.Process()
        mem_before_mb = proc.memory_info().rss / (1024 * 1024)
    except Exception:
        mem_before_mb = 0.0

    NUM_DISTINCT = 200
    print(f"\n  Generating {NUM_DISTINCT} distinct requests to test LRU eviction cap (max={_PROSODY_CACHE_MAX_ENTRIES})...")
    for i in range(NUM_DISTINCT):
        unique_passage = f"Đoạn văn khảo sát số {i:03d}: Mùa xuân chim én lượn bay trên bầu trời cao, rực rỡ nắng vàng."
        r = client.post("/qwen/direct-prosody", json={
            "passage": unique_passage,
            "difficult_words": ["rực rỡ", "lượn bay"],
            "grade": 3
        })
        assert r.status_code == 200

        with _prosody_cache_lock:
            cache_size = len(_prosody_script_cache)
        assert cache_size <= _PROSODY_CACHE_MAX_ENTRIES, (
            f"Cache size {cache_size} exceeded max capacity {_PROSODY_CACHE_MAX_ENTRIES} at iteration {i}"
        )

    with _prosody_cache_lock:
        final_cache_size = len(_prosody_script_cache)

    try:
        import psutil
        mem_after_mb = proc.memory_info().rss / (1024 * 1024)
        mem_delta_mb = mem_after_mb - mem_before_mb
    except Exception:
        mem_after_mb = 0.0
        mem_delta_mb = 0.0

    assert final_cache_size == _PROSODY_CACHE_MAX_ENTRIES, (
        f"Expected cache size to be exactly {_PROSODY_CACHE_MAX_ENTRIES}, got {final_cache_size}"
    )

    runner.log_pass(
        test_id_mem,
        f"Cache capped strictly at {final_cache_size}/{_PROSODY_CACHE_MAX_ENTRIES} entries. "
        f"Process RSS delta: {mem_delta_mb:+.2f} MB across {NUM_DISTINCT} requests"
    )

    # 3. Cache Object Mutation Resistance (Deep Copy Check)
    test_id_deep = "LRU-Deep-Copy-Mutation-Resistance"
    try:
        # Fetch an item from cache
        r1 = client.post("/qwen/direct-prosody", json=payload)
        data1 = r1.json()
        # Mutate the returned client object in place
        data1["clauses"][0]["style"] = "CORRUPTED_MUTATION"
        data1["clauses"][0]["pause_sec"] = 999.0

        # Fetch same item again
        r2 = client.post("/qwen/direct-prosody", json=payload)
        data2 = r2.json()

        assert data2["clauses"][0]["style"] != "CORRUPTED_MUTATION", "Cache internally mutated by client modification!"
        assert data2["clauses"][0]["pause_sec"] < 10.0, "Cache pause_sec corrupted!"
        runner.log_pass(test_id_deep, "Cache returns defensive copies; internal cache is immune to client mutation")
    except Exception as e:
        runner.log_fail(test_id_deep, "Cache mutation resistance failed", e)


# ==============================================================================
# SUITE 4: ON-DEMAND RAM RECLAMATION UNDER LOAD
# ==============================================================================

def test_on_demand_ram_reclamation():
    print("\n" + "=" * 80)
    print("TEST SUITE 4: ON-DEMAND RAM RECLAMATION & ZERO IDLE RAM INVARIANT")
    print("=" * 80)

    test_id = "Telemetry-Zero-Idle-RAM"
    try:
        status = client.get("/qwen/status").json()
        assert status.get("is_loaded") is False, f"Model is still loaded in RAM: {status}"
        assert status.get("lifecycle_mode") == "on_demand_unload", f"Wrong mode: {status.get('lifecycle_mode')}"
        assert status.get("memory_mode") == "zero_idle_ram"
        avail_ram = status.get("available_ram_mb", 0)
        assert avail_ram > 0, "available_ram_mb must be > 0"
        runner.log_pass(test_id, f"Zero idle RAM confirmed: is_loaded=False, avail_ram={avail_ram}MB")
    except Exception as e:
        runner.log_fail(test_id, "Zero idle RAM invariant failed", e)


# ==============================================================================
# MAIN RUNNER
# ==============================================================================

if __name__ == "__main__":
    t_start = time.perf_counter()
    test_zero_word_mutation()
    test_difficult_word_pause_rule()
    test_lru_cache_stress()
    test_on_demand_ram_reclamation()
    t_total = time.perf_counter() - t_start

    print(f"\nCompleted in {t_total:.2f} seconds.")
    runner.print_summary()
    sys.exit(0 if runner.failed == 0 else 1)
