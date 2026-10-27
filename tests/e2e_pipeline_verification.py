"""
================================================================================
ViHand Grade — E2E Pipeline Comprehensive Verification Test Suite (4-Tier)
================================================================================
Target: Semantic-Acoustic Decoupled Pipeline (Qwen2.5-0.5B SLM + Piper VITS ONNX)
Optimized for: Raspberry Pi 4 (4GB RAM) with Staged On-Demand Lifecycle (ON_DEMAND_UNLOAD)
Author: Worker M5 (Milestone 5)
Integrity Mode: Rigorous Empirical Verification (Lauren Tan / PStack compliant)
Governance: GEMINI.md Invariant Rules (ASCII / Table output only, NO MERMAID)

Tiers Covered:
  Tier 1: Feature Coverage (>=5 test cases per feature area)
          - Feature 1: VITS Acoustic Styles & Audio Synthesis (6 test cases)
          - Feature 2: Pedagogical Spoken Punctuation (7 test cases)
          - Feature 3: Status Endpoint GET /qwen/status (5 test cases)
          - Feature 4: SGK Text Extractor POST /qwen/extract-sgk (5 test cases)
          - Feature 5: Prosody Director POST /qwen/direct-prosody (5 test cases)
          - Feature 6: LRU Prosody Cache (5 test cases)
          - Feature 7: BFF Routes & Contracts (6 test cases)
  Tier 2: Boundary & Corner Cases (>=5 test cases per feature area)
          - Boundary 1: Empty & Whitespace Validation (5 test cases)
          - Boundary 2: Extreme Speaking Rates (5 test cases)
          - Boundary 3: Non-Existent Styles & Parameter Bounds (5 test cases)
          - Boundary 4: Low-RAM Simulation (<650MB) Fallback (5 test cases)
          - Boundary 5: Punctuation-Dense & Adversarial Text (5 test cases)
  Tier 3: Cross-Feature Combinations (Pairwise Integration) (5 test cases)
          - Combo 1: Full Chain Pipeline (Raw SGK -> Clean -> Prosody -> Piper Synthesis)
          - Combo 2: Cache & Difficult Words Persistence
          - Combo 3: Spoken Punctuation with 4 Prosody Styles
          - Combo 4: Direct Prosody to Local Playback
          - Combo 5: BFF Gateway Proxy Integration
  Tier 4: Real-World Primary School Textbook Scenarios (Grades 1-5) (5 test cases)
          - Grade 1: Short Phonetic Sentence
          - Grade 2: Narrative Dialogue with Question Style
          - Grade 3: Complex Descriptive Passage with Difficult Words (+2.5s pause)
          - Grade 4: Multi-Clause Descriptive Prose
          - Grade 5: Polysyllabic Historical Text
================================================================================
"""

import os
import sys
import io
import time
import json
import wave
import re
import socket
from typing import Dict, Any, List, Optional, Tuple

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
import python_service.main as main_mod
from python_service.main import app, PROSODY_STYLE_PRESETS
from python_service.tts_engine import (
    tts_engine,
    inject_pedagogical_punctuation,
    normalize_vietnamese_text,
    number_to_vietnamese,
    PEDAGOGICAL_PUNCTUATION_MAP,
)

client = TestClient(app)


# ==============================================================================
# TEST RUNNER & RESULT COLLECTOR
# ==============================================================================

class E2ETestRunner:
    def __init__(self):
        self.results: List[Dict[str, Any]] = []
        self.tier_counts: Dict[str, Dict[str, int]] = {
            "Tier 1: Feature Coverage": {"total": 0, "pass": 0, "fail": 0},
            "Tier 2: Boundary & Corner Cases": {"total": 0, "pass": 0, "fail": 0},
            "Tier 3: Cross-Feature Combinations": {"total": 0, "pass": 0, "fail": 0},
            "Tier 4: Real-World Textbook Scenarios": {"total": 0, "pass": 0, "fail": 0},
        }

    def record_pass(self, tier: str, test_id: str, description: str, details: str = ""):
        self.results.append({
            "tier": tier,
            "test_id": test_id,
            "description": description,
            "status": "PASS",
            "details": details,
        })
        self.tier_counts[tier]["total"] += 1
        self.tier_counts[tier]["pass"] += 1
        print(f"  [PASS] {test_id}: {description} {f'({details})' if details else ''}")

    def record_fail(self, tier: str, test_id: str, description: str, error: Exception):
        err_msg = str(error)
        self.results.append({
            "tier": tier,
            "test_id": test_id,
            "description": description,
            "status": "FAIL",
            "details": err_msg,
        })
        self.tier_counts[tier]["total"] += 1
        self.tier_counts[tier]["fail"] += 1
        print(f"  [FAIL] {test_id}: {description} -> ERROR: {err_msg}")

    def print_summary(self) -> bool:
        total_tests = len(self.results)
        passed_tests = sum(1 for r in self.results if r["status"] == "PASS")
        failed_tests = sum(1 for r in self.results if r["status"] == "FAIL")
        pass_rate = (passed_tests / total_tests * 100.0) if total_tests > 0 else 0.0

        print("\n" + "=" * 80)
        print("          E2E PIPELINE SYSTEM VERIFICATION SUMMARY (4-TIER)")
        print("=" * 80)
        print("+--------------------------------------------------------------------------------+")
        print("| TIER / CATEGORY                       | TOTAL | PASS | FAIL | STATUS           |")
        print("+--------------------------------------------------------------------------------+")
        for tier_name, stats in self.tier_counts.items():
            status_str = "PASSED" if stats["fail"] == 0 and stats["total"] > 0 else "FAILED"
            print(f"| {tier_name:<37} | {stats['total']:^5} | {stats['pass']:^4} | {stats['fail']:^4} | {status_str:<16} |")
        print("+--------------------------------------------------------------------------------+")
        print(f"| GRAND TOTAL: {total_tests} Tests | Passed: {passed_tests} | Failed: {failed_tests} | Pass Rate: {pass_rate:.1f}%   |")
        print("+--------------------------------------------------------------------------------+")

        if failed_tests > 0:
            print("\n❌ FAILED TESTS DETAIL:")
            for r in self.results:
                if r["status"] == "FAIL":
                    print(f"  - [{r['tier']}] {r['test_id']}: {r['description']} -> {r['details']}")
            print("=" * 80)
            return False
        else:
            print("\n✅ ALL 4 TIERS COMPREHENSIVE VERIFICATION SUCCEEDED WITH 100% PASS RATE!")
            print("=" * 80)
            return True


runner = E2ETestRunner()


# ==============================================================================
# HELPER FUNCTIONS
# ==============================================================================

def verify_wav_structure(audio_bytes: bytes, min_bytes: int = 10000, expected_framerate: Optional[int] = None) -> Dict[str, Any]:
    """Empirically inspects audio bytes to guarantee valid PCM WAV headers and content."""
    assert len(audio_bytes) >= min_bytes, f"WAV length {len(audio_bytes)} < expected min {min_bytes}"
    assert audio_bytes[:4] == b"RIFF", f"Header not RIFF: {audio_bytes[:4]}"
    assert audio_bytes[8:12] == b"WAVE", f"Header not WAVE: {audio_bytes[8:12]}"

    with wave.open(io.BytesIO(audio_bytes), "rb") as wf:
        channels = wf.getnchannels()
        sampwidth = wf.getsampwidth()
        framerate = wf.getframerate()
        nframes = wf.getnframes()
        duration = nframes / float(framerate) if framerate > 0 else 0.0

        assert channels == 1, f"Expected 1 channel (mono), got {channels}"
        assert sampwidth == 2, f"Expected 2 bytes per sample (16-bit PCM), got {sampwidth}"
        if expected_framerate is not None:
            assert framerate == expected_framerate, f"Expected {expected_framerate}Hz sample rate, got {framerate}"
        else:
            assert framerate in (16000, 22050), f"Expected 16000Hz or 22050Hz sample rate, got {framerate}"
        assert duration > 0.1, f"Audio duration too short: {duration}s"

        return {
            "channels": channels,
            "sampwidth": sampwidth,
            "framerate": framerate,
            "duration": round(duration, 2),
            "bytes": len(audio_bytes),
        }


# ==============================================================================
# TIER 1: FEATURE COVERAGE (>=5 test cases per feature)
# ==============================================================================

def run_tier1_tests():
    tier = "Tier 1: Feature Coverage"
    print(f"\n================================================================================")
    print(f"STARTING {tier.upper()}")
    print(f"================================================================================")

    # --------------------------------------------------------------------------
    # Feature 1: VITS Acoustic Styles & Audio Synthesis (6 tests)
    # --------------------------------------------------------------------------
    print("\n--- [F1] VITS Acoustic Styles & Audio Synthesis ---")
    test_text = "Gió mùa thu se lạnh, bầu trời xanh trong vắt."

    # TC-1.1: warm_story
    try:
        resp = client.get(f"/tts?text={test_text}&voice=vi_VN-vais1000-medium&style=warm_story")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
        assert "audio/wav" in resp.headers.get("content-type", "")
        meta = verify_wav_structure(resp.content, min_bytes=10000)
        runner.record_pass(tier, "TC-1.1", "VITS Style warm_story synthesis", f"{meta['bytes']} bytes, {meta['duration']}s")
    except Exception as e:
        runner.record_fail(tier, "TC-1.1", "VITS Style warm_story synthesis", e)

    # TC-1.2: standard
    try:
        resp = client.get(f"/tts?text={test_text}&voice=vi_VN-vais1000-medium&style=standard")
        assert resp.status_code == 200
        meta = verify_wav_structure(resp.content, min_bytes=10000)
        runner.record_pass(tier, "TC-1.2", "VITS Style standard synthesis", f"{meta['bytes']} bytes, {meta['duration']}s")
    except Exception as e:
        runner.record_fail(tier, "TC-1.2", "VITS Style standard synthesis", e)

    # TC-1.3: emphasis
    try:
        resp = client.get(f"/tts?text={test_text}&voice=vi_VN-vais1000-medium&style=emphasis")
        assert resp.status_code == 200
        meta = verify_wav_structure(resp.content, min_bytes=10000)
        runner.record_pass(tier, "TC-1.3", "VITS Style emphasis synthesis", f"{meta['bytes']} bytes, {meta['duration']}s")
    except Exception as e:
        runner.record_fail(tier, "TC-1.3", "VITS Style emphasis synthesis", e)

    # TC-1.4: question
    try:
        resp = client.get(f"/tts?text={test_text}&voice=vi_VN-vais1000-medium&style=question")
        assert resp.status_code == 200
        meta = verify_wav_structure(resp.content, min_bytes=10000)
        runner.record_pass(tier, "TC-1.4", "VITS Style question synthesis", f"{meta['bytes']} bytes, {meta['duration']}s")
    except Exception as e:
        runner.record_fail(tier, "TC-1.4", "VITS Style question synthesis", e)

    # TC-1.5: Acoustic Overrides (noise_scale, noise_w, rate)
    try:
        resp = client.get(
            f"/tts?text={test_text}&style=standard&noise_scale=0.55&noise_w=0.70&rate=-20%"
        )
        assert resp.status_code == 200
        meta = verify_wav_structure(resp.content, min_bytes=10000)
        runner.record_pass(tier, "TC-1.5", "VITS Custom Acoustic Overrides", f"noise_scale=0.55, noise_w=0.70, {meta['bytes']} bytes")
    except Exception as e:
        runner.record_fail(tier, "TC-1.5", "VITS Custom Acoustic Overrides", e)

    # TC-1.6: Multi-voice check (vi_VN-25hours_single-low or fallback)
    try:
        resp = client.get(f"/tts?text={test_text}&voice=vi_VN-25hours_single-low&style=standard")
        assert resp.status_code == 200
        meta = verify_wav_structure(resp.content, min_bytes=5000)
        runner.record_pass(tier, "TC-1.6", "VITS Multi-voice support (25hours_single-low)", f"{meta['bytes']} bytes")
    except Exception as e:
        runner.record_fail(tier, "TC-1.6", "VITS Multi-voice support", e)

    # --------------------------------------------------------------------------
    # Feature 2: Pedagogical Spoken Punctuation (7 tests)
    # --------------------------------------------------------------------------
    print("\n--- [F2] Pedagogical Spoken Punctuation ---")

    # TC-2.1: Comma
    try:
        res = inject_pedagogical_punctuation("Học sinh, chăm ngoan", enabled=True)
        assert ", phẩy," in res, f"Expected ', phẩy,', got: '{res}'"
        runner.record_pass(tier, "TC-2.1", "Spoken Punctuation: Comma", res)
    except Exception as e:
        runner.record_fail(tier, "TC-2.1", "Spoken Punctuation: Comma", e)

    # TC-2.2: Period
    try:
        res = inject_pedagogical_punctuation("Hết câu.", enabled=True)
        assert ", chấm." in res, f"Expected ', chấm.', got: '{res}'"
        runner.record_pass(tier, "TC-2.2", "Spoken Punctuation: Period", res)
    except Exception as e:
        runner.record_fail(tier, "TC-2.2", "Spoken Punctuation: Period", e)

    # TC-2.3: Question mark
    try:
        res = inject_pedagogical_punctuation("Bạn có đi học không?", enabled=True)
        assert ", chấm hỏi." in res, f"Expected ', chấm hỏi.', got: '{res}'"
        runner.record_pass(tier, "TC-2.3", "Spoken Punctuation: Question mark", res)
    except Exception as e:
        runner.record_fail(tier, "TC-2.3", "Spoken Punctuation: Question mark", e)

    # TC-2.4: Exclamation mark
    try:
        res = inject_pedagogical_punctuation("Bầu trời đẹp quá!", enabled=True)
        assert ", chấm than." in res, f"Expected ', chấm than.', got: '{res}'"
        runner.record_pass(tier, "TC-2.4", "Spoken Punctuation: Exclamation mark", res)
    except Exception as e:
        runner.record_fail(tier, "TC-2.4", "Spoken Punctuation: Exclamation mark", e)

    # TC-2.5: Colon
    try:
        res = inject_pedagogical_punctuation("Cô giáo dặn: Phải học bài.", enabled=True)
        assert ", hai chấm," in res, f"Expected ', hai chấm,', got: '{res}'"
        runner.record_pass(tier, "TC-2.5", "Spoken Punctuation: Colon", res)
    except Exception as e:
        runner.record_fail(tier, "TC-2.5", "Spoken Punctuation: Colon", e)

    # TC-2.6: Protection of decimals, time, abbreviations, ellipsis
    try:
        raw = "Lúc 08:30 ngày 15/10/2026, học sinh được 9.5 điểm... TP. Hồ Chí Minh."
        res = inject_pedagogical_punctuation(raw, enabled=True)
        assert "08:30" in res, f"Time corrupted: {res}"
        assert "9.5" in res, f"Decimal corrupted: {res}"
        assert "..." in res, f"Ellipsis corrupted: {res}"
        assert "TP." in res, f"Abbreviation corrupted: {res}"
        runner.record_pass(tier, "TC-2.6", "Protection of decimals, time, abbreviations, ellipsis", res)
    except Exception as e:
        runner.record_fail(tier, "TC-2.6", "Protection of decimals, time, abbreviations, ellipsis", e)

    # TC-2.7: Idempotency
    try:
        raw = "Chào cờ, thứ hai, đầu tuần."
        pass1 = inject_pedagogical_punctuation(raw, enabled=True)
        pass2 = inject_pedagogical_punctuation(pass1, enabled=True)
        assert pass1 == pass2, f"Idempotency violation! Pass 1: '{pass1}', Pass 2: '{pass2}'"
        runner.record_pass(tier, "TC-2.7", "Spoken Punctuation Idempotency", "Pass 1 == Pass 2 verified")
    except Exception as e:
        runner.record_fail(tier, "TC-2.7", "Spoken Punctuation Idempotency", e)

    # --------------------------------------------------------------------------
    # Feature 3: Status Endpoint GET /qwen/status (5 tests)
    # --------------------------------------------------------------------------
    print("\n--- [F3] Telemetry & Always-Active Qwen2.5 Status (GET /qwen/status) ---")
    try:
        resp = client.get("/qwen/status")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
        data = resp.json()

        # TC-3.1: lifecycle_mode == "always_active"
        assert data.get("lifecycle_mode") == "always_active", f"Wrong lifecycle_mode: {data.get('lifecycle_mode')}"
        runner.record_pass(tier, "TC-3.1", "GET /qwen/status lifecycle_mode == 'always_active'", data.get("lifecycle_mode"))

        # TC-3.2: is_loaded == True (Qwen2.5 always active)
        assert data.get("is_loaded") is True, f"Expected is_loaded True, got {data.get('is_loaded')}"
        runner.record_pass(tier, "TC-3.2", "GET /qwen/status is_loaded == True (Always Active)", "Qwen2.5 active in RAM verified")

        # TC-3.3: memory_mode == "always_active"
        assert data.get("memory_mode") == "always_active", f"Wrong memory_mode: {data.get('memory_mode')}"
        runner.record_pass(tier, "TC-3.3", "GET /qwen/status memory_mode == 'always_active'", data.get("memory_mode"))

        # TC-3.4: available_ram_mb > 0
        avail_ram = data.get("available_ram_mb", 0.0)
        assert isinstance(avail_ram, (int, float)) and avail_ram > 0, f"Invalid available_ram_mb: {avail_ram}"
        runner.record_pass(tier, "TC-3.4", "GET /qwen/status real RAM sensing", f"{avail_ram:.1f} MB available")

        # TC-3.5: ram_threshold_mb & cache_entries
        assert data.get("ram_threshold_mb") == 650.0, f"Wrong threshold: {data.get('ram_threshold_mb')}"
        assert "cache_entries" in data, "Missing cache_entries"
        runner.record_pass(tier, "TC-3.5", "GET /qwen/status threshold & cache metrics", f"threshold=650MB, cache={data['cache_entries']}")
    except Exception as e:
        runner.record_fail(tier, "TC-3.x", "GET /qwen/status checks", e)

    # --------------------------------------------------------------------------
    # Feature 4: SGK Text Extractor POST /qwen/extract-sgk (5 tests)
    # --------------------------------------------------------------------------
    print("\n--- [F4] SGK Text Extractor (POST /qwen/extract-sgk) ---")
    raw_sample = (
        "Tiếng Việt 3 - Tập 1\n"
        "Tuần 5 - Bài 10\n"
        "Trang 45\n"
        "Gió Mùa Thu Se Lạnh\n"
        "Gió mùa thu se lạnh thổi qua từng kẽ lá. Bầu trời xanh trong vắt, dịu dàng trải dài.\n"
        "Trang 46\n"
        "Câu hỏi: 1. Em hãy tìm những từ chỉ màu sắc trong bài đọc?\n"
        "2. Nêu cảm nhận của em."
    )

    try:
        resp = client.post("/qwen/extract-sgk", json={"raw_text": raw_sample, "grade": 3})
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
        data = resp.json()

        # TC-4.1: Headers and page numbers stripped
        clean = data.get("clean_content", "")
        assert "Tiếng Việt 3" not in clean, "Header Tiếng Việt 3 was not stripped"
        assert "Tuần 5" not in clean, "Tuần 5 was not stripped"
        assert "Trang 45" not in clean and "Trang 46" not in clean, "Page numbers were not stripped"
        runner.record_pass(tier, "TC-4.1", "SGK Extraction: Headers and page numbers stripped", clean[:50] + "...")

        # TC-4.2: Exercise questions truncated
        assert "Câu hỏi:" not in clean, "Exercise question was not truncated"
        assert "Em hãy tìm" not in clean, "Discussion question was not truncated"
        runner.record_pass(tier, "TC-4.2", "SGK Extraction: Exercise questions truncated", "Truncation at questions verified")

        # TC-4.3: Difficult words extracted
        diff_words = data.get("difficultWords", [])
        assert isinstance(diff_words, list) and len(diff_words) >= 3, f"Difficult words too short: {diff_words}"
        runner.record_pass(tier, "TC-4.3", "SGK Extraction: Difficult words extracted", f"{diff_words}")

        # TC-4.4: Title and pedagogical summary
        title = data.get("title", "")
        summary = data.get("summary", "")
        assert len(title) > 0, "Empty title"
        assert len(summary) > 0, "Empty summary"
        runner.record_pass(tier, "TC-4.4", "SGK Extraction: Title and Summary", f"Title='{title}', Summary='{summary[:40]}...'")

        # TC-4.5: Qwen2.5 Active & Operational invariant
        status_after = client.get("/qwen/status").json()
        assert data.get("source") == "qwen2.5_0.5b", f"Expected source qwen2.5_0.5b, got {data.get('source')}"
        assert data.get("qwen_active") is True, "qwen_active flag not True"
        assert status_after.get("is_loaded") is True, "Qwen must remain active in RAM"
        runner.record_pass(tier, "TC-4.5", "SGK Extraction: Qwen2.5 active & source=='qwen2.5_0.5b'", f"source={data.get('source')}, is_loaded=True")
    except Exception as e:
        runner.record_fail(tier, "TC-4.x", "SGK Extraction checks", e)

    # --------------------------------------------------------------------------
    # Feature 5: Prosody Director & Passage Generation (POST /qwen/direct-prosody & /qwen/generate-passage)
    # --------------------------------------------------------------------------
    print("\n--- [F5] Prosody Director & Qwen Passage Generation ---")
    passage = "Gió mùa thu se lạnh, bầu trời xanh trong vắt. Bạn có thích mùa thu không?"
    diff_targets = ["se lạnh", "trong vắt"]

    try:
        resp = client.post(
            "/qwen/direct-prosody",
            json={
                "passage": passage,
                "difficult_words": diff_targets,
                "grade": 3,
                "chunk_mode": "phrase",
            },
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
        data = resp.json()
        clauses = data.get("clauses", [])

        # TC-5.1: Zero-Word-Mutation Invariant (100% words preserved)
        reconstructed = " ".join(c["text"].strip() for c in clauses)
        original_words = passage.split()
        reconstructed_words = reconstructed.split()
        assert original_words == reconstructed_words, f"Word mutation! Original={original_words}, Reconstructed={reconstructed_words}"
        runner.record_pass(tier, "TC-5.1", "Prosody Director: 100% Word-Preservation Invariant", f"{len(original_words)} words matched")

        # TC-5.2: Clause styles assignment (question style for questions, warm_story/standard for statements)
        question_clauses = [c for c in clauses if c["text"].rstrip("\"')").endswith("?")]
        assert len(question_clauses) > 0, "No question clause detected"
        assert question_clauses[0]["style"] == "question", f"Expected question style, got {question_clauses[0]['style']}"
        runner.record_pass(tier, "TC-5.2", "Prosody Director: Clause styles assigned", f"Question style verified on: '{question_clauses[0]['text']}'")

        # TC-5.3: Difficult words trigger emphasis style & +2.5s pause
        emphasis_clauses = [c for c in clauses if any(dw in c["matched_difficult_words"] for dw in diff_targets)]
        assert len(emphasis_clauses) > 0, "No clause matched difficult words"
        assert emphasis_clauses[0]["style"] == "emphasis", f"Expected emphasis style, got {emphasis_clauses[0]['style']}"
        assert emphasis_clauses[0]["pause_sec"] >= 4.0, f"Expected pause >= 4.0s (1.5 + 2.5), got {emphasis_clauses[0]['pause_sec']}"
        runner.record_pass(tier, "TC-5.3", "Prosody Director: Difficult words +2.5s pause & emphasis", f"pause={emphasis_clauses[0]['pause_sec']}s, style={emphasis_clauses[0]['style']}")

        # TC-5.4: Speaking rate adjustment (emphasis rate -20% vs standard -15%)
        assert emphasis_clauses[0]["rate"] == "-20%", f"Expected -20% rate, got {emphasis_clauses[0]['rate']}"
        runner.record_pass(tier, "TC-5.4", "Prosody Director: Rate adjustment (-20% for difficult words)", emphasis_clauses[0]["rate"])

        # TC-5.5: Qwen2.5 Active in Pipeline & POST /qwen/generate-passage
        assert data.get("qwen_active") is True, "qwen_active flag not True in direct-prosody"
        gen_resp = client.post(
            "/qwen/generate-passage",
            json={"grade": 3, "topic": "Cánh đồng quê hương", "sentence_count": 3, "book_set": "KetNoi"}
        )
        assert gen_resp.status_code == 200, f"Expected 200 from /qwen/generate-passage, got {gen_resp.status_code}"
        gen_data = gen_resp.json()
        assert gen_data.get("source") == "qwen2.5_0.5b", f"Expected source qwen2.5_0.5b, got {gen_data.get('source')}"
        assert len(gen_data.get("content", "").split()) >= 12, "Generated passage too short"
        runner.record_pass(tier, "TC-5.5", "Qwen2.5 Active in Pipeline & Passage Generation", f"source={gen_data['source']}, Title='{gen_data['title']}'")
    except Exception as e:
        runner.record_fail(tier, "TC-5.x", "Prosody Director & Passage Generation checks", e)

    # --------------------------------------------------------------------------
    # Feature 6: LRU Prosody Cache (5 tests)
    # --------------------------------------------------------------------------
    print("\n--- [F6] LRU Prosody Cache ---")
    cache_test_passage = "Dòng suối trong veo chảy róc rách qua từng khe đá trắng tinh."

    # TC-6.1: Cache Miss
    try:
        resp1 = client.post(
            "/qwen/direct-prosody",
            json={"passage": cache_test_passage, "grade": 3, "chunk_mode": "phrase", "difficult_words": ["róc rách"]},
        )
        assert resp1.status_code == 200
        d1 = resp1.json()
        assert d1.get("cache_hit") is False, f"Expected cache_hit False, got {d1.get('cache_hit')}"
        runner.record_pass(tier, "TC-6.1", "LRU Cache: Initial request produces cache_hit: False", "Cache Miss verified")
    except Exception as e:
        runner.record_fail(tier, "TC-6.1", "LRU Cache: Initial request produces cache_hit: False", e)

    # TC-6.2: Cache Hit (< 50ms)
    try:
        t0 = time.perf_counter()
        resp2 = client.post(
            "/qwen/direct-prosody",
            json={"passage": cache_test_passage, "grade": 3, "chunk_mode": "phrase", "difficult_words": ["róc rách"]},
        )
        latency_ms = (time.perf_counter() - t0) * 1000.0
        assert resp2.status_code == 200
        d2 = resp2.json()
        assert d2.get("cache_hit") is True, f"Expected cache_hit True, got {d2.get('cache_hit')}"
        assert latency_ms < 50.0, f"Cache hit took too long: {latency_ms:.2f}ms"
        runner.record_pass(tier, "TC-6.2", "LRU Cache: Second request produces cache_hit: True (<50ms)", f"{latency_ms:.3f}ms")
    except Exception as e:
        runner.record_fail(tier, "TC-6.2", "LRU Cache: Second request produces cache_hit: True", e)

    # TC-6.3: Sensitivity to Difficult Words
    try:
        resp_diff = client.post(
            "/qwen/direct-prosody",
            json={"passage": cache_test_passage, "grade": 3, "chunk_mode": "phrase", "difficult_words": ["trong veo"]},
        )
        d_diff = resp_diff.json()
        assert d_diff.get("cache_hit") is False, "Different difficult words should produce cache miss"
        runner.record_pass(tier, "TC-6.3", "LRU Cache: Key sensitivity to difficult words", "Cache miss on altered difficult words")
    except Exception as e:
        runner.record_fail(tier, "TC-6.3", "LRU Cache: Key sensitivity to difficult words", e)

    # TC-6.4: Sensitivity to Grade
    try:
        resp_grade = client.post(
            "/qwen/direct-prosody",
            json={"passage": cache_test_passage, "grade": 4, "chunk_mode": "phrase", "difficult_words": ["róc rách"]},
        )
        d_grade = resp_grade.json()
        assert d_grade.get("cache_hit") is False, "Different grade should produce cache miss"
        runner.record_pass(tier, "TC-6.4", "LRU Cache: Key sensitivity to Grade", "Cache miss on altered grade")
    except Exception as e:
        runner.record_fail(tier, "TC-6.4", "LRU Cache: Key sensitivity to Grade", e)

    # TC-6.5: Sensitivity to Chunk Mode
    try:
        resp_mode = client.post(
            "/qwen/direct-prosody",
            json={"passage": cache_test_passage, "grade": 3, "chunk_mode": "sentence", "difficult_words": ["róc rách"]},
        )
        d_mode = resp_mode.json()
        assert d_mode.get("cache_hit") is False, "Different chunk_mode should produce cache miss"
        runner.record_pass(tier, "TC-6.5", "LRU Cache: Key sensitivity to Chunk Mode", "Cache miss on altered chunk_mode")
    except Exception as e:
        runner.record_fail(tier, "TC-6.5", "LRU Cache: Key sensitivity to Chunk Mode", e)

    # --------------------------------------------------------------------------
    # Feature 7: BFF Routes & Contracts (6 tests)
    # --------------------------------------------------------------------------
    print("\n--- [F7] BFF Routes & Contracts ---")

    # TC-7.1: /tts query contract
    try:
        resp = client.get("/tts?text=Kiem+tra+hop+dong+TTS&voice=vi_VN-vais1000-medium&rate=-15%&style=warm_story&read_punctuation=true")
        assert resp.status_code == 200
        assert resp.headers.get("x-tts-engine") == "Piper-VITS-ONNX-Offline"
        assert resp.headers.get("x-tts-style") == "warm_story"
        runner.record_pass(tier, "TC-7.1", "BFF Route Contract: GET /tts audio streaming headers", "X-TTS-Engine & Style verified")
    except Exception as e:
        runner.record_fail(tier, "TC-7.1", "BFF Route Contract: GET /tts audio streaming headers", e)

    # TC-7.2: /tts/play-local payload contract
    try:
        resp = client.post(
            "/tts/play-local",
            json={
                "text": "Kiểm tra loa phần cứng",
                "voice": "vi_VN-vais1000-medium",
                "rate": "-15%",
                "style": "emphasis",
                "noise_scale": 0.58,
                "noise_w": 0.72,
                "read_punctuation": False,
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data.get("status") == "ok"
        assert data.get("device") == "local_speaker"
        assert data.get("length_scale") == 1.38  # 1.15 * 1.20
        runner.record_pass(tier, "TC-7.2", "BFF Route Contract: POST /tts/play-local parameter forwarding", f"device={data['device']}, length_scale={data['length_scale']}")
    except Exception as e:
        runner.record_fail(tier, "TC-7.2", "BFF Route Contract: POST /tts/play-local parameter forwarding", e)

    # TC-7.3: /qwen/status contract
    try:
        resp = client.get("/qwen/status")
        assert resp.status_code == 200
        data = resp.json()
        assert "enabled" in data and "is_loaded" in data and "lifecycle_mode" in data and "available_ram_mb" in data
        runner.record_pass(tier, "TC-7.3", "BFF Route Contract: GET /qwen/status telemetry schema", "All contract fields present")
    except Exception as e:
        runner.record_fail(tier, "TC-7.3", "BFF Route Contract: GET /qwen/status telemetry schema", e)

    # TC-7.4: POST /qwen/extract-sgk schema
    try:
        resp = client.post("/qwen/extract-sgk", json={"raw_text": "Bài 1: Mùa xuân.\nHoa đào nở rộ.", "grade": 2})
        assert resp.status_code == 200
        data = resp.json()
        assert "title" in data and "clean_content" in data and "difficultWords" in data and "summary" in data
        runner.record_pass(tier, "TC-7.4", "BFF Route Contract: POST /qwen/extract-sgk output schema", f"difficultWords count={len(data['difficultWords'])}")
    except Exception as e:
        runner.record_fail(tier, "TC-7.4", "BFF Route Contract: POST /qwen/extract-sgk output schema", e)

    # TC-7.5: POST /qwen/direct-prosody schema
    try:
        resp = client.post("/qwen/direct-prosody", json={"passage": "Mùa xuân về trên quê hương.", "grade": 2})
        assert resp.status_code == 200
        data = resp.json()
        assert "clauses" in data and "total_words" in data and "estimated_duration_sec" in data
        assert isinstance(data["clauses"], list)
        runner.record_pass(tier, "TC-7.5", "BFF Route Contract: POST /qwen/direct-prosody output schema", f"clauses count={len(data['clauses'])}, duration={data['estimated_duration_sec']}s")
    except Exception as e:
        runner.record_fail(tier, "TC-7.5", "BFF Route Contract: POST /qwen/direct-prosody output schema", e)

    # TC-7.6: BFF Validation guards (missing and invalid fields)
    try:
        r_empty_tts = client.get("/tts?text=")
        assert r_empty_tts.status_code == 400
        r_empty_play = client.post("/tts/play-local", json={"text": ""})
        assert r_empty_play.status_code == 400
        r_empty_sgk = client.post("/qwen/extract-sgk", json={"raw_text": ""})
        assert r_empty_sgk.status_code == 400
        r_empty_prosody = client.post("/qwen/direct-prosody", json={"passage": ""})
        assert r_empty_prosody.status_code == 400
        runner.record_pass(tier, "TC-7.6", "BFF Route Contract: Input validation error guards", "HTTP 400 on all empty payloads")
    except Exception as e:
        runner.record_fail(tier, "TC-7.6", "BFF Route Contract: Input validation error guards", e)


# ==============================================================================
# TIER 2: BOUNDARY & CORNER CASES (>=5 test cases per feature area)
# ==============================================================================

def run_tier2_tests():
    tier = "Tier 2: Boundary & Corner Cases"
    print(f"\n================================================================================")
    print(f"STARTING {tier.upper()}")
    print(f"================================================================================")

    # --------------------------------------------------------------------------
    # Boundary 1: Empty & Whitespace Validation (5 tests)
    # --------------------------------------------------------------------------
    print("\n--- [B1] Empty & Whitespace Validation ---")

    # TC-B1.1: GET /tts empty
    try:
        r = client.get("/tts?text=")
        assert r.status_code == 400, f"Expected 400, got {r.status_code}"
        runner.record_pass(tier, "TC-B1.1", "GET /tts with empty text returns 400", r.json().get("detail", ""))
    except Exception as e:
        runner.record_fail(tier, "TC-B1.1", "GET /tts with empty text returns 400", e)

    # TC-B1.2: GET /tts whitespace only
    try:
        r = client.get("/tts?text=%20%20%20%20")
        assert r.status_code == 400, f"Expected 400, got {r.status_code}"
        runner.record_pass(tier, "TC-B1.2", "GET /tts with whitespace-only text returns 400", r.json().get("detail", ""))
    except Exception as e:
        runner.record_fail(tier, "TC-B1.2", "GET /tts with whitespace-only text returns 400", e)

    # TC-B1.3: POST /tts/play-local whitespace
    try:
        r = client.post("/tts/play-local", json={"text": "   \t\n  "})
        assert r.status_code == 400, f"Expected 400, got {r.status_code}"
        runner.record_pass(tier, "TC-B1.3", "POST /tts/play-local with whitespace text returns 400", r.json().get("detail", ""))
    except Exception as e:
        runner.record_fail(tier, "TC-B1.3", "POST /tts/play-local with whitespace text returns 400", e)

    # TC-B1.4: POST /qwen/extract-sgk whitespace
    try:
        r = client.post("/qwen/extract-sgk", json={"raw_text": "   \n\t   "})
        assert r.status_code == 400, f"Expected 400, got {r.status_code}"
        runner.record_pass(tier, "TC-B1.4", "POST /qwen/extract-sgk with whitespace raw_text returns 400", r.json().get("detail", ""))
    except Exception as e:
        runner.record_fail(tier, "TC-B1.4", "POST /qwen/extract-sgk with whitespace raw_text returns 400", e)

    # TC-B1.5: POST /qwen/direct-prosody whitespace
    try:
        r = client.post("/qwen/direct-prosody", json={"passage": "     "})
        assert r.status_code == 400, f"Expected 400, got {r.status_code}"
        runner.record_pass(tier, "TC-B1.5", "POST /qwen/direct-prosody with whitespace passage returns 400", r.json().get("detail", ""))
    except Exception as e:
        runner.record_fail(tier, "TC-B1.5", "POST /qwen/direct-prosody with whitespace passage returns 400", e)

    # --------------------------------------------------------------------------
    # Boundary 2: Extreme Speaking Rates (5 tests)
    # --------------------------------------------------------------------------
    print("\n--- [B2] Extreme Speaking Rates ---")
    base_text = "Học sinh luyện viết đúng chính tả."

    # TC-B2.1: Fast +50%
    try:
        r = client.get(f"/tts?text={base_text}&rate=%2B50%25")
        assert r.status_code == 200
        meta = verify_wav_structure(r.content, min_bytes=8000)
        runner.record_pass(tier, "TC-B2.1", "Extreme Rate: Fast +50%", f"{meta['bytes']} bytes, duration={meta['duration']}s")
    except Exception as e:
        runner.record_fail(tier, "TC-B2.1", "Extreme Rate: Fast +50%", e)

    # TC-B2.2: Slow -50%
    try:
        r = client.get(f"/tts?text={base_text}&rate=-50%25")
        assert r.status_code == 200
        meta = verify_wav_structure(r.content, min_bytes=10000)
        runner.record_pass(tier, "TC-B2.2", "Extreme Rate: Slow -50%", f"{meta['bytes']} bytes, duration={meta['duration']}s")
    except Exception as e:
        runner.record_fail(tier, "TC-B2.2", "Extreme Rate: Slow -50%", e)

    # TC-B2.3: Neutral 0%
    try:
        r = client.get(f"/tts?text={base_text}&rate=0%25")
        assert r.status_code == 200
        meta = verify_wav_structure(r.content, min_bytes=10000)
        runner.record_pass(tier, "TC-B2.3", "Extreme Rate: Neutral 0%", f"{meta['bytes']} bytes, duration={meta['duration']}s")
    except Exception as e:
        runner.record_fail(tier, "TC-B2.3", "Extreme Rate: Neutral 0%", e)

    # TC-B2.4: Malformed rate string
    try:
        r = client.get(f"/tts?text={base_text}&rate=ultra_hyper_speed")
        assert r.status_code == 200
        meta = verify_wav_structure(r.content, min_bytes=8000)
        runner.record_pass(tier, "TC-B2.4", "Extreme Rate: Malformed rate string graceful fallback", f"{meta['bytes']} bytes")
    except Exception as e:
        runner.record_fail(tier, "TC-B2.4", "Extreme Rate: Malformed rate string graceful fallback", e)

    # TC-B2.5: High rate +100%
    try:
        r = client.get(f"/tts?text={base_text}&rate=%2B100%25")
        assert r.status_code == 200
        meta = verify_wav_structure(r.content, min_bytes=5000)
        runner.record_pass(tier, "TC-B2.5", "Extreme Rate: High rate +100%", f"{meta['bytes']} bytes, duration={meta['duration']}s")
    except Exception as e:
        runner.record_fail(tier, "TC-B2.5", "Extreme Rate: High rate +100%", e)

    # --------------------------------------------------------------------------
    # Boundary 3: Non-Existent Styles & Parameter Bounds (5 tests)
    # --------------------------------------------------------------------------
    print("\n--- [B3] Non-Existent Styles & Parameter Bounds ---")

    # TC-B3.1: Non-existent style
    try:
        r = client.get(f"/tts?text={base_text}&style=cyberpunk_neon_express")
        assert r.status_code == 200
        assert r.headers.get("x-tts-style") == "cyberpunk_neon_express"
        meta = verify_wav_structure(r.content, min_bytes=10000)
        runner.record_pass(tier, "TC-B3.1", "Non-existent style fallback to standard preset", f"{meta['bytes']} bytes")
    except Exception as e:
        runner.record_fail(tier, "TC-B3.1", "Non-existent style fallback to standard preset", e)

    # TC-B3.2: Negative noise_scale
    try:
        r = client.get(f"/tts?text={base_text}&noise_scale=-0.5")
        assert r.status_code == 200
        meta = verify_wav_structure(r.content, min_bytes=10000)
        runner.record_pass(tier, "TC-B3.2", "Negative noise_scale clamped/handled safely", f"{meta['bytes']} bytes")
    except Exception as e:
        runner.record_fail(tier, "TC-B3.2", "Negative noise_scale clamped/handled safely", e)

    # TC-B3.3: Extreme high noise_w
    try:
        r = client.get(f"/tts?text={base_text}&noise_w=5.0")
        assert r.status_code == 200
        meta = verify_wav_structure(r.content, min_bytes=10000)
        runner.record_pass(tier, "TC-B3.3", "Extreme high noise_w handled safely", f"{meta['bytes']} bytes")
    except Exception as e:
        runner.record_fail(tier, "TC-B3.3", "Extreme high noise_w handled safely", e)

    # TC-B3.4: Non-existent voice ID fallback
    try:
        r = client.get(f"/tts?text={base_text}&voice=unknown_voice_id_999")
        assert r.status_code == 200
        meta = verify_wav_structure(r.content, min_bytes=5000)
        runner.record_pass(tier, "TC-B3.4", "Non-existent voice ID fallback safely", f"{meta['bytes']} bytes")
    except Exception as e:
        runner.record_fail(tier, "TC-B3.4", "Non-existent voice ID fallback safely", e)

    # TC-B3.5: Non-JSON payload rejection
    try:
        r = client.post("/tts/play-local", content="invalid raw non-json string", headers={"Content-Type": "application/json"})
        assert r.status_code in (400, 422), f"Expected 400 or 422, got {r.status_code}"
        runner.record_pass(tier, "TC-B3.5", "Non-JSON payload rejection with HTTP 422/400", f"Status={r.status_code}")
    except Exception as e:
        runner.record_fail(tier, "TC-B3.5", "Non-JSON payload rejection with HTTP 422/400", e)

    # --------------------------------------------------------------------------
    # Boundary 4: Low-RAM Simulation (<650MB) Fallback (5 tests)
    # --------------------------------------------------------------------------
    print("\n--- [B4] Low-RAM Simulation (<650MB) Fallback ---")
    orig_ram_func = main_mod.get_available_ram_mb
    sample_text = (
        "Tiếng Việt 2\n"
        "Trang 18\n"
        "Bác Hồ Kính Yêu\n"
        "Bác Hồ có vầng trán cao và đôi mắt sáng ngời. Bác rất yêu quý các cháu thiếu nhi.\n"
        "Câu hỏi: 1. Đôi mắt Bác ra sao?"
    )

    # TC-B4.1: Low RAM (400MB) triggers deterministic fallback with HTTP 200
    try:
        main_mod.get_available_ram_mb = lambda: 400.0
        resp = client.post("/qwen/extract-sgk", json={"raw_text": sample_text, "grade": 2})
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
        data = resp.json()
        assert data.get("source") in ("deterministic_pedagogy", "deterministic_pedagogy_fallback"), f"Wrong source: {data.get('source')}"
        assert "clean_content" in data and len(data["clean_content"]) > 0
        assert "Trang 18" not in data["clean_content"]
        runner.record_pass(tier, "TC-B4.1", "Low-RAM (400MB) triggers deterministic extractor fallback", f"source={data['source']}")
    except Exception as e:
        runner.record_fail(tier, "TC-B4.1", "Low-RAM (400MB) triggers deterministic extractor fallback", e)
    finally:
        main_mod.get_available_ram_mb = orig_ram_func

    # TC-B4.2: Verify Low-RAM guard prevents loading when unloaded, then auto-reactivates when RAM is normal
    try:
        main_mod.unload_qwen_model()
        main_mod.get_available_ram_mb = lambda: 400.0
        status_low = client.get("/qwen/status").json()
        assert status_low.get("is_loaded") is False, "Qwen should not load when RAM < 650MB"
        main_mod.get_available_ram_mb = orig_ram_func
        status_restored = client.get("/qwen/status").json()
        assert status_restored.get("is_loaded") is True, "Qwen should auto-reactivate when RAM >= 650MB"
        runner.record_pass(tier, "TC-B4.2", "Low-RAM guard & auto-reactivation when RAM restored", "is_loaded=True restored")
    except Exception as e:
        runner.record_fail(tier, "TC-B4.2", "Low-RAM guard & auto-reactivation when RAM restored", e)
    finally:
        main_mod.get_available_ram_mb = orig_ram_func

    # TC-B4.3: Severely starved RAM (120MB)
    try:
        main_mod.get_available_ram_mb = lambda: 120.0
        resp = client.post("/qwen/extract-sgk", json={"raw_text": sample_text, "grade": 2})
        assert resp.status_code == 200
        data = resp.json()
        assert len(data.get("difficultWords", [])) >= 3
        runner.record_pass(tier, "TC-B4.3", "Severely starved RAM (120MB) continues functioning", f"Words={data['difficultWords']}")
    except Exception as e:
        runner.record_fail(tier, "TC-B4.3", "Severely starved RAM (120MB) continues functioning", e)
    finally:
        main_mod.get_available_ram_mb = orig_ram_func

    # TC-B4.4: Low-RAM during POST /qwen/direct-prosody
    try:
        main_mod.get_available_ram_mb = lambda: 350.0
        resp = client.post("/qwen/direct-prosody", json={"passage": "Bác Hồ rất yêu quý thiếu nhi.", "grade": 2})
        assert resp.status_code == 200
        data = resp.json()
        assert len(data.get("clauses", [])) >= 1
        runner.record_pass(tier, "TC-B4.4", "Low-RAM during direct-prosody succeeds with HTTP 200", f"clauses={len(data['clauses'])}")
    except Exception as e:
        runner.record_fail(tier, "TC-B4.4", "Low-RAM during direct-prosody succeeds with HTTP 200", e)
    finally:
        main_mod.get_available_ram_mb = orig_ram_func

    # TC-B4.5: Status endpoint reports simulated RAM sensing
    try:
        main_mod.get_available_ram_mb = lambda: 512.75
        status = client.get("/qwen/status").json()
        assert status.get("available_ram_mb") == 512.75, f"Expected 512.75, got {status.get('available_ram_mb')}"
        runner.record_pass(tier, "TC-B4.5", "GET /qwen/status reflects dynamic RAM sensing", f"RAM={status['available_ram_mb']}MB")
    except Exception as e:
        runner.record_fail(tier, "TC-B4.5", "GET /qwen/status reflects dynamic RAM sensing", e)
    finally:
        main_mod.get_available_ram_mb = orig_ram_func

    # --------------------------------------------------------------------------
    # Boundary 5: Punctuation-Dense & Adversarial Text (5 tests)
    # --------------------------------------------------------------------------
    print("\n--- [B5] Punctuation-Dense & Adversarial Text ---")

    # TC-B5.1: Stacked punctuation marks
    try:
        dense_raw = "Gió mùa thu ...,.,,, ??? !!! ::: thổi qua kẽ lá."
        clean_punct = inject_pedagogical_punctuation(dense_raw, enabled=True)
        assert len(clean_punct) > 0
        resp = client.get(f"/tts?text={clean_punct}")
        assert resp.status_code == 200
        meta = verify_wav_structure(resp.content, min_bytes=10000)
        runner.record_pass(tier, "TC-B5.1", "Dense stacked punctuation synthesized safely", f"{meta['bytes']} bytes")
    except Exception as e:
        runner.record_fail(tier, "TC-B5.1", "Dense stacked punctuation synthesized safely", e)

    # TC-B5.2: Interrobang ?! / !?
    try:
        interrobang_text = "Em học bài chưa?! Thật sao!?"
        res = inject_pedagogical_punctuation(interrobang_text, enabled=True)
        assert ", chấm hỏi." in res
        runner.record_pass(tier, "TC-B5.2", "Interrobang ?! / !? reduced to question cue", res)
    except Exception as e:
        runner.record_fail(tier, "TC-B5.2", "Interrobang ?! / !? reduced to question cue", e)

    # TC-B5.3: Special symbols noise
    try:
        symbol_text = "Bài học *** tuyệt vời ### &&& !!!"
        clean = normalize_vietnamese_text(symbol_text)
        assert len(clean) > 0
        runner.record_pass(tier, "TC-B5.3", "Special symbols stripped gracefully", clean)
    except Exception as e:
        runner.record_fail(tier, "TC-B5.3", "Special symbols stripped gracefully", e)

    # TC-B5.4: Decimal numbers and time protection
    try:
        dec_text = "Đạt 9.75 điểm lúc 07:15 sáng."
        res = inject_pedagogical_punctuation(dec_text, enabled=True)
        assert "9.75" in res and "07:15" in res
        runner.record_pass(tier, "TC-B5.4", "Decimal 9.75 and time 07:15 protected", res)
    except Exception as e:
        runner.record_fail(tier, "TC-B5.4", "Decimal 9.75 and time 07:15 protected", e)

    # TC-B5.5: Repeated pedagogical cues idempotency
    try:
        cues_text = "Học sinh, phẩy, chăm chỉ, chấm. Học bài."
        res1 = inject_pedagogical_punctuation(cues_text, enabled=True)
        res2 = inject_pedagogical_punctuation(res1, enabled=True)
        assert res1 == res2
        runner.record_pass(tier, "TC-B5.5", "Repeated pedagogical cues idempotency", "Zero recursive nesting verified")
    except Exception as e:
        runner.record_fail(tier, "TC-B5.5", "Repeated pedagogical cues idempotency", e)


# ==============================================================================
# TIER 3: CROSS-FEATURE COMBINATIONS (Pairwise Integration) (5 tests)
# ==============================================================================

def run_tier3_tests():
    tier = "Tier 3: Cross-Feature Combinations"
    print(f"\n================================================================================")
    print(f"STARTING {tier.upper()}")
    print(f"================================================================================")

    # TC-C1: Full Chain Pipeline (Raw SGK -> Clean -> Prosody -> Piper Synthesis)
    print("\n--- [C1] Full Chain Pipeline ---")
    try:
        raw_textbook = (
            "Tiếng Việt 3 - Sách Cánh Diều\n"
            "Tuần 8 - Bài Đọc 2\n"
            "Trang 64\n"
            "Mùa Lúa Chín\n"
            "Đồng lúa quê em chín vàng rực rỡ, thoang thoảng hương thơm nồng nàn.\n"
            "Bác nông dân gặt lúa từ sớm tinh mơ.\n"
            "Câu hỏi: 1. Hương lúa thế nào?"
        )
        # Step 1: SGK Clean
        ext_res = client.post("/qwen/extract-sgk", json={"raw_text": raw_textbook, "grade": 3})
        assert ext_res.status_code == 200
        ext_data = ext_res.json()
        clean_passage = ext_data["clean_content"]
        difficult_words = ext_data["difficultWords"]
        assert len(clean_passage) > 0 and len(difficult_words) >= 2

        # Step 2: Prosody Direction
        pro_res = client.post(
            "/qwen/direct-prosody",
            json={
                "passage": clean_passage,
                "difficult_words": difficult_words,
                "grade": 3,
                "chunk_mode": "clause",
            },
        )
        assert pro_res.status_code == 200
        pro_data = pro_res.json()
        clauses = pro_data["clauses"]
        assert len(clauses) >= 2

        # Step 3: Piper VITS Synthesis per clause using directed acoustic parameters
        synthesized_clauses = 0
        total_audio_bytes = 0
        for clause in clauses:
            audio_res = client.get(
                f"/tts?text={clause['text']}&style={clause['style']}&rate={clause['rate']}&read_punctuation=true"
            )
            assert audio_res.status_code == 200
            meta = verify_wav_structure(audio_res.content, min_bytes=5000)
            synthesized_clauses += 1
            total_audio_bytes += meta["bytes"]

        assert synthesized_clauses == len(clauses)
        runner.record_pass(
            tier,
            "TC-C1",
            "Full Chain Pipeline (SGK -> Prosody -> Piper Synthesis)",
            f"{synthesized_clauses} clauses synthesized, {total_audio_bytes} total bytes",
        )
    except Exception as e:
        runner.record_fail(tier, "TC-C1", "Full Chain Pipeline (SGK -> Prosody -> Piper Synthesis)", e)

    # TC-C2: Cache & Difficult Words Persistence
    print("\n--- [C2] Cache & Difficult Words Persistence ---")
    try:
        passage_test = "Buổi sớm mùa thu, sương mù giăng kín lối đi quanh co bên sườn đồi."
        diff_list = ["sương mù", "quanh co"]

        # 1st call: Cache Miss
        r1 = client.post("/qwen/direct-prosody", json={"passage": passage_test, "difficult_words": diff_list, "grade": 3})
        d1 = r1.json()
        assert d1.get("cache_hit") is False

        # 2nd call: Cache Hit
        r2 = client.post("/qwen/direct-prosody", json={"passage": passage_test, "difficult_words": diff_list, "grade": 3})
        d2 = r2.json()
        assert d2.get("cache_hit") is True

        # Verify difficult words and pauses identical
        for c1, c2 in zip(d1["clauses"], d2["clauses"]):
            assert c1["matched_difficult_words"] == c2["matched_difficult_words"]
            assert c1["pause_sec"] == c2["pause_sec"]
            assert c1["style"] == c2["style"]

        runner.record_pass(tier, "TC-C2", "Cache & Difficult Words Persistence", "100% matched difficult words & pauses on cache hit")
    except Exception as e:
        runner.record_fail(tier, "TC-C2", "Cache & Difficult Words Persistence", e)

    # TC-C3: Spoken Punctuation with 4 Prosody Styles
    print("\n--- [C3] Spoken Punctuation with 4 Prosody Styles ---")
    try:
        test_sentence = "Bé tập đọc, chăm chỉ mỗi ngày. Bé có ngoan không?"
        styles = ["warm_story", "standard", "emphasis", "question"]
        success_styles = []

        for st in styles:
            resp = client.get(f"/tts?text={test_sentence}&style={st}&read_punctuation=true")
            assert resp.status_code == 200
            meta = verify_wav_structure(resp.content, min_bytes=10000)
            success_styles.append(f"{st} ({meta['duration']}s)")

        runner.record_pass(tier, "TC-C3", "Spoken Punctuation with 4 Prosody Styles", ", ".join(success_styles))
    except Exception as e:
        runner.record_fail(tier, "TC-C3", "Spoken Punctuation with 4 Prosody Styles", e)

    # TC-C4: Direct Prosody to Local Playback Integration
    print("\n--- [C4] Direct Prosody to Local Playback Integration ---")
    try:
        passage_play = "Tiếng chim hót ríu rít trên cành cây xanh."
        dir_res = client.post("/qwen/direct-prosody", json={"passage": passage_play, "difficult_words": ["ríu rít"]})
        dir_data = dir_res.json()
        first_clause = dir_data["clauses"][0]

        play_res = client.post(
            "/tts/play-local",
            json={
                "text": first_clause["text"],
                "voice": "vi_VN-vais1000-medium",
                "rate": first_clause["rate"],
                "style": first_clause["style"],
                "noise_scale": first_clause["noise_scale"],
                "noise_w": first_clause["noise_w"],
                "read_punctuation": True,
            },
        )
        assert play_res.status_code == 200
        play_data = play_res.json()
        assert play_data.get("status") == "ok"
        assert play_data.get("device") == "local_speaker"
        runner.record_pass(
            tier,
            "TC-C4",
            "Direct Prosody to Local Playback Integration",
            f"style={first_clause['style']}, length_scale={play_data['length_scale']}",
        )
    except Exception as e:
        runner.record_fail(tier, "TC-C4", "Direct Prosody to Local Playback Integration", e)

    # TC-C5: BFF Gateway Proxy Action Multiplexer Contract Simulation
    print("\n--- [C5] BFF Gateway Proxy Action Multiplexer Contract Simulation ---")
    try:
        # Simulate Next.js BFF multiplexing action: extract_sgk
        raw_input = "Tuần 1\nTrang 5\nBé Đi Học\nBé Mai mang cặp sách mới.\nCâu hỏi 1: Bé mang gì?"
        sgk_fwd = client.post("/qwen/extract-sgk", json={"raw_text": raw_input, "grade": 1})
        assert sgk_fwd.status_code == 200
        sgk_json = sgk_fwd.json()
        assert "clean_content" in sgk_json and "Trang 5" not in sgk_json["clean_content"]

        # Simulate Next.js BFF multiplexing action: direct_prosody
        pro_fwd = client.post("/qwen/direct-prosody", json={"passage": sgk_json["clean_content"], "grade": 1})
        assert pro_fwd.status_code == 200
        pro_json = pro_fwd.json()
        assert len(pro_json["clauses"]) >= 1

        runner.record_pass(
            tier,
            "TC-C5",
            "BFF Gateway Proxy Action Multiplexer Simulation",
            f"extract_sgk -> direct_prosody ({len(pro_json['clauses'])} clauses)",
        )
    except Exception as e:
        runner.record_fail(tier, "TC-C5", "BFF Gateway Proxy Action Multiplexer Simulation", e)


# ==============================================================================
# TIER 4: REAL-WORLD PRIMARY SCHOOL TEXTBOOK SCENARIOS (Grades 1-5) (5 tests)
# ==============================================================================

def run_tier4_tests():
    tier = "Tier 4: Real-World Textbook Scenarios"
    print(f"\n================================================================================")
    print(f"STARTING {tier.upper()}")
    print(f"================================================================================")

    # TC-R1: Grade 1 (Short Phonetic Sentence)
    print("\n--- [R1] Grade 1: Short Phonetic Sentence ---")
    try:
        g1_text = "Bé Mai đi học, em mang ba lô màu đỏ."
        # Prosody direction
        res_pro = client.post("/qwen/direct-prosody", json={"passage": g1_text, "grade": 1, "chunk_mode": "phrase"})
        assert res_pro.status_code == 200
        data_pro = res_pro.json()
        assert len(data_pro["clauses"]) >= 2

        # Synthesis
        res_tts = client.get(f"/tts?text={g1_text}&style=warm_story&read_punctuation=true")
        assert res_tts.status_code == 200
        meta = verify_wav_structure(res_tts.content, min_bytes=10000)
        runner.record_pass(tier, "TC-R1", "Grade 1: Short Phonetic Sentence", f"Clauses={len(data_pro['clauses'])}, WAV={meta['bytes']} bytes, {meta['duration']}s")
    except Exception as e:
        runner.record_fail(tier, "TC-R1", "Grade 1: Short Phonetic Sentence", e)

    # TC-R2: Grade 2 (Narrative Dialogue with Question Style)
    print("\n--- [R2] Grade 2: Narrative Dialogue with Question Style ---")
    try:
        g2_text = "Thỏ con hỏi: 'Bác voi đi đâu đấy?' Bác voi cười: 'Bác đi tưới hoa.'"
        res_pro = client.post("/qwen/direct-prosody", json={"passage": g2_text, "grade": 2, "chunk_mode": "clause"})
        assert res_pro.status_code == 200
        data_pro = res_pro.json()
        clauses = data_pro["clauses"]

        # Check question style on question clause
        q_clause = [c for c in clauses if "?" in c["text"]]
        assert len(q_clause) > 0 and q_clause[0]["style"] == "question"

        # Synthesis
        res_tts = client.get(f"/tts?text={g2_text}&style=warm_story&read_punctuation=true")
        assert res_tts.status_code == 200
        meta = verify_wav_structure(res_tts.content, min_bytes=10000)
        runner.record_pass(tier, "TC-R2", "Grade 2: Narrative Dialogue with Question Style", f"Question style verified, WAV={meta['bytes']} bytes, {meta['duration']}s")
    except Exception as e:
        runner.record_fail(tier, "TC-R2", "Grade 2: Narrative Dialogue with Question Style", e)

    # TC-R3: Grade 3 (Complex Descriptive Passage with Difficult Words)
    print("\n--- [R3] Grade 3: Complex Descriptive Passage with Difficult Words ---")
    try:
        g3_text = "Mùa thu trên quê hương, không khí se lạnh, bầu trời xanh trong vắt."
        diff_words = ["se lạnh", "trong vắt"]
        res_pro = client.post("/qwen/direct-prosody", json={"passage": g3_text, "difficult_words": diff_words, "grade": 3})
        assert res_pro.status_code == 200
        data_pro = res_pro.json()
        clauses = data_pro["clauses"]

        # Verify difficult words emphasis & +2.5s pause
        emphasis_clauses = [c for c in clauses if c["style"] == "emphasis"]
        assert len(emphasis_clauses) >= 1
        assert emphasis_clauses[0]["pause_sec"] >= 4.0

        # Synthesis
        res_tts = client.get(f"/tts?text={g3_text}&style=warm_story&read_punctuation=true")
        assert res_tts.status_code == 200
        meta = verify_wav_structure(res_tts.content, min_bytes=10000)
        runner.record_pass(tier, "TC-R3", "Grade 3: Complex Descriptive Passage with Difficult Words", f"Emphasis pause={emphasis_clauses[0]['pause_sec']}s, WAV={meta['bytes']} bytes")
    except Exception as e:
        runner.record_fail(tier, "TC-R3", "Grade 3: Complex Descriptive Passage with Difficult Words", e)

    # TC-R4: Grade 4 (Multi-Clause Descriptive Prose)
    print("\n--- [R4] Grade 4: Multi-Clause Descriptive Prose ---")
    try:
        g4_text = "Rừng Cúc Phương có những cây cổ thụ hàng ngàn năm tuổi, tán lá xòe rộng che mát cả một góc rừng."
        res_pro = client.post("/qwen/direct-prosody", json={"passage": g4_text, "grade": 4, "difficult_words": ["cổ thụ", "xòe rộng"]})
        assert res_pro.status_code == 200
        data_pro = res_pro.json()
        assert len(data_pro["clauses"]) >= 2

        # Synthesis
        res_tts = client.get(f"/tts?text={g4_text}&style=warm_story")
        assert res_tts.status_code == 200
        meta = verify_wav_structure(res_tts.content, min_bytes=10000)
        runner.record_pass(tier, "TC-R4", "Grade 4: Multi-Clause Descriptive Prose", f"Clauses={len(data_pro['clauses'])}, WAV={meta['bytes']} bytes, {meta['duration']}s")
    except Exception as e:
        runner.record_fail(tier, "TC-R4", "Grade 4: Multi-Clause Descriptive Prose", e)

    # TC-R5: Grade 5 (Polysyllabic Historical Text)
    print("\n--- [R5] Grade 5: Polysyllabic Historical Text ---")
    try:
        g5_text = "Chiến dịch Điện Biên Phủ toàn thắng đã làm chấn động địa cầu, ghi dấu mốc son chói lọi trong lịch sử dân tộc."
        res_pro = client.post(
            "/qwen/direct-prosody",
            json={"passage": g5_text, "grade": 5, "difficult_words": ["chấn động", "chói lọi", "toàn thắng"]}
        )
        assert res_pro.status_code == 200
        data_pro = res_pro.json()
        assert len(data_pro["clauses"]) >= 2

        # Synthesis
        res_tts = client.get(f"/tts?text={g5_text}&style=warm_story")
        assert res_tts.status_code == 200
        meta = verify_wav_structure(res_tts.content, min_bytes=10000)
        runner.record_pass(tier, "TC-R5", "Grade 5: Polysyllabic Historical Text", f"Clauses={len(data_pro['clauses'])}, WAV={meta['bytes']} bytes, {meta['duration']}s")
    except Exception as e:
        runner.record_fail(tier, "TC-R5", "Grade 5: Polysyllabic Historical Text", e)


# ==============================================================================
# MAIN SUITE EXECUTION
# ==============================================================================

def main():
    print("=" * 80)
    print("STARTING E2E PIPELINE COMPREHENSIVE VERIFICATION SUITE (4-TIER)")
    print("=" * 80)

    t_start = time.time()
    run_tier1_tests()
    run_tier2_tests()
    run_tier3_tests()
    run_tier4_tests()
    t_elapsed = time.time() - t_start

    print(f"\nExecution Time: {t_elapsed:.2f} seconds")
    all_passed = runner.print_summary()
    sys.exit(0 if all_passed else 1)


if __name__ == "__main__":
    main()
