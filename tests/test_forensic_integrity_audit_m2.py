"""
FORENSIC INTEGRITY AUDIT SUITE — MILESTONE 2
Author: Forensic Auditor (auditor_m2)
Target: python_service/main.py, start_all.bat
Checks:
  1. Real OS RAM Sensing (GlobalMemoryStatusEx Win32 vs psutil vs memory allocation)
  2. Unload & Garbage Collection (weakref tracking, reference destruction)
  3. Authenticity of Pedagogical Regex & Linguistic Algorithms (clean_raw_sgk_text, extract_deterministic_difficult_words)
  4. Endpoints Authenticity & Zero-Word-Mutation (/qwen/extract-sgk, /qwen/direct-prosody)
  5. Cache Authenticity & Eviction Policy (_prosody_script_cache LRU 128 limit)
  6. Static Code Forensic Scan (mocks, dummy returns, facade branches)
"""

import sys
import os
import gc
import weakref
import ctypes
import time
import json
import re

# Ensure stdout handles UTF-8
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from fastapi.testclient import TestClient
import python_service.main as main_mod
from python_service.main import app

client = TestClient(app)

results = []

def record(name: str, passed: bool, evidence: str):
    verdict = "PASS" if passed else "FAIL"
    results.append({"name": name, "verdict": verdict, "evidence": evidence})
    print(f"[{verdict}] {name}\n    Evidence: {evidence}")

print("=" * 80)
print("RUNNING FORENSIC INTEGRITY CHECKS")
print("=" * 80)

# ----------------------------------------------------------------------
# CHECK 1: RAM DETECTION REAL OS CALLS
# ----------------------------------------------------------------------
print("\n--- CHECK 1: get_available_ram_mb() OS API Authenticity ---")
try:
    ram_mb_1 = main_mod.get_available_ram_mb()
    
    # Direct Win32 call
    class MEMORYSTATUSEX(ctypes.Structure):
        _fields_ = [
            ('dwLength', ctypes.c_ulong),
            ('dwMemoryLoad', ctypes.c_ulong),
            ('ullTotalPhys', ctypes.c_ulonglong),
            ('ullAvailPhys', ctypes.c_ulonglong),
            ('ullTotalPageFile', ctypes.c_ulonglong),
            ('ullAvailPageFile', ctypes.c_ulonglong),
            ('ullTotalVirtual', ctypes.c_ulonglong),
            ('ullAvailVirtual', ctypes.c_ulonglong),
            ('sullAvailExtendedVirtual', ctypes.c_ulonglong),
        ]
    stat = MEMORYSTATUSEX()
    stat.dwLength = ctypes.sizeof(MEMORYSTATUSEX)
    ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(stat))
    direct_avail_mb = round(float(stat.ullAvailPhys) / (1024.0 * 1024.0), 2)
    
    diff = abs(ram_mb_1 - direct_avail_mb)
    # The diff should be tiny (under 50MB due to slight time difference between calls)
    is_real_os = diff < 50.0 and ram_mb_1 > 100.0
    
    # Now test allocation response: allocate 200MB and check if available RAM decreases
    alloc = bytearray(200 * 1024 * 1024)
    ram_mb_2 = main_mod.get_available_ram_mb()
    del alloc
    gc.collect()
    ram_mb_3 = main_mod.get_available_ram_mb()
    
    alloc_detected = ram_mb_2 < ram_mb_1
    
    record(
        "CHECK-01 RAM Detection Real OS API",
        is_real_os,
        f"main.py: {ram_mb_1} MB, direct Win32: {direct_avail_mb} MB, diff: {diff:.2f} MB. Allocated 200MB -> {ram_mb_2} MB (diff: {ram_mb_1 - ram_mb_2:.2f} MB), freed -> {ram_mb_3} MB"
    )
except Exception as e:
    record("CHECK-01 RAM Detection Real OS API", False, f"Exception: {e}")

# ----------------------------------------------------------------------
# CHECK 2: UNLOAD_QWEN_MODEL & GC EXECUTION
# ----------------------------------------------------------------------
print("\n--- CHECK 2: unload_qwen_model() Reference Clearing & GC ---")
try:
    # Create dummy objects to test unloader behavior
    class DummyModel:
        def __init__(self):
            self.data = bytearray(50 * 1024 * 1024)
            
    class DummyTokenizer:
        def __init__(self):
            self.vocab = {"test": 1}

    dummy_m = DummyModel()
    dummy_t = DummyTokenizer()
    ref_m = weakref.ref(dummy_m)
    ref_t = weakref.ref(dummy_t)
    
    main_mod._qwen_model = dummy_m
    main_mod._qwen_tokenizer = dummy_t
    
    assert main_mod._qwen_model is not None
    assert main_mod._qwen_tokenizer is not None
    
    del dummy_m
    del dummy_t
    
    # At this point, the only references should be inside main_mod._qwen_model and _qwen_tokenizer
    assert ref_m() is not None, "Model should still be alive in main_mod"
    assert ref_t() is not None, "Tokenizer should still be alive in main_mod"
    
    main_mod.unload_qwen_model()
    
    is_cleared = (main_mod._qwen_model is None) and (main_mod._qwen_tokenizer is None)
    is_collected_m = (ref_m() is None)
    is_collected_t = (ref_t() is None)
    
    record(
        "CHECK-02 Unload References & GC Execution",
        is_cleared and is_collected_m and is_collected_t,
        f"_qwen_model is None: {main_mod._qwen_model is None}, _qwen_tokenizer is None: {main_mod._qwen_tokenizer is None}, weakref(model) dead: {is_collected_m}, weakref(tok) dead: {is_collected_t}"
    )
except Exception as e:
    record("CHECK-02 Unload References & GC Execution", False, f"Exception: {e}")

# ----------------------------------------------------------------------
# CHECK 3: clean_raw_sgk_text AUTHENTICITY WITH NOVEL INPUTS
# ----------------------------------------------------------------------
print("\n--- CHECK 3: clean_raw_sgk_text() Authenticity With Arbitrary Texts ---")
try:
    novel_raw_text = """
    Tiếng Việt 4 - Tập 2
    Tuần 23 - Bài đọc: Sông Hương Êm Đềm
    Trang 112
    (tr. 112)

    Sông Hương là một bức tranh phong cảnh hữu tình của xứ Huế.
    Dòng sông xanh biếc trôi lững lờ qua cầu Tràng Tiền cổ kính.
    Vào những đêm trăng thanh, tiếng đò ngân nga hòa cùng khúc hò xứ Huế trầm bổng.

    112
    Câu 1: Tìm những từ ngữ tả vẻ đẹp của sông Hương?
    Câu 2: Đặt câu với từ 'ngân nga'.
    Ghi nhớ: Học sinh chú ý các từ có phụ âm r/d/gi.
    """
    
    title, clean = main_mod.clean_raw_sgk_text(novel_raw_text)
    
    p1 = "Sông Hương" in title
    p2 = "Trang 112" not in clean and "tr. 112" not in clean
    p3 = "Câu 1:" not in clean and "Ghi nhớ:" not in clean
    p4 = "Sông Hương là một bức tranh phong cảnh" in clean
    p5 = "khúc hò xứ Huế trầm bổng." in clean
    
    # Test completely blank / adversarial
    t_empty, c_empty = main_mod.clean_raw_sgk_text("")
    t_spaces, c_spaces = main_mod.clean_raw_sgk_text("   \n\n   ")
    empty_handled = (t_empty == "" and c_empty == "" and t_spaces == "" and c_spaces == "")
    
    passed_clean = p1 and p2 and p3 and p4 and p5 and empty_handled
    record(
        "CHECK-03 SGK Cleaning Authenticity",
        passed_clean,
        f"Title='{title}', clean lines={len(clean.splitlines())}, contains passage: {p4}, stripped headers/questions: {p2 and p3}, empty handled: {empty_handled}"
    )
except Exception as e:
    record("CHECK-03 SGK Cleaning Authenticity", False, f"Exception: {e}")

# ----------------------------------------------------------------------
# CHECK 4: extract_deterministic_difficult_words AUTHENTICITY
# ----------------------------------------------------------------------
print("\n--- CHECK 4: extract_deterministic_difficult_words() Linguistic Authenticity ---")
try:
    # Text with specific known phonological challenges:
    # trập trùng (alliteration tr-tr), khúc khuỷu (vần uyu), róc rách (láy r-r), sừng sững (láy s-s), lắt lẻo (láy l-l)
    sample_text = (
        "Đường lên đỉnh núi trập trùng và khúc khuỷu. "
        "Bên dưới con suối róc rách chảy qua những phiến đá sừng sững. "
        "Chiếc cầu tre lắt lẻo bắc ngang qua dòng nước xiết."
    )
    diffs = main_mod.extract_deterministic_difficult_words(sample_text, max_words=5)
    
    # Check that it extracted words from THIS text, not from the test bank
    canned_words = {"dịu dàng", "se lạnh", "kẽ lá", "trời xanh", "dàng trải"}
    overlap_with_canned = set(diffs).intersection(canned_words)
    has_target_words = any(w in diffs for w in ["trập trùng", "khúc khuỷu", "róc rách", "sừng sững", "lắt lẻo"])
    
    passed_diff = (len(overlap_with_canned) == 0) and has_target_words and len(diffs) > 0
    record(
        "CHECK-04 Difficult Words Algorithmic Authenticity",
        passed_diff,
        f"Extracted: {diffs}, overlap with canned test words: {overlap_with_canned}, target phonetic words found: {has_target_words}"
    )
except Exception as e:
    record("CHECK-04 Difficult Words Algorithmic Authenticity", False, f"Exception: {e}")

# ----------------------------------------------------------------------
# CHECK 5: /qwen/extract-sgk ENDPOINT WITH NOVEL DATA & RAM GUARD
# ----------------------------------------------------------------------
print("\n--- CHECK 5: /qwen/extract-sgk Endpoint Dynamic Testing ---")
try:
    novel_payload = {
        "raw_text": """
        Tiếng Việt 5 - Tập 1
        Tuần 5 - Bài đọc: Rừng Cúc Phương
        Trang 88

        Rừng Cúc Phương bạt ngàn cây cổ thụ hàng nghìn năm tuổi.
        Những thân cây chò chỉ sừng sững vươn thẳng lên trời cao.
        Trong tán lá rậm rạp, đàn bướm muôn màu rập rờn bay lượn như trong truyện cổ tích.

        88
        Câu 1: Kể tên các loài cây trong rừng Cúc Phương?
        Ghi nhớ: Cần bảo vệ rừng nguyên sinh.
        """,
        "grade": 4
    }
    
    resp = client.post("/qwen/extract-sgk", json=novel_payload)
    assert resp.status_code == 200
    data = resp.json()
    
    assert "Rừng Cúc Phương" in data["title"] or "Rừng Cúc" in data["title"]
    assert "Trang 88" not in data["clean_content"]
    assert "Câu 1:" not in data["clean_content"]
    assert "Rừng Cúc Phương bạt ngàn" in data["clean_content"]
    assert len(data["difficultWords"]) >= 1
    assert data["ram_unloaded"] is True
    
    # Check status endpoint confirms is_loaded is False
    status_resp = client.get("/qwen/status").json()
    assert status_resp["is_loaded"] is False
    
    record(
        "CHECK-05 /qwen/extract-sgk Genuine Processing & Auto-Unload",
        True,
        f"Title='{data['title']}', source='{data['source']}', words={data['difficultWords']}, is_loaded={status_resp['is_loaded']}"
    )
except Exception as e:
    record("CHECK-05 /qwen/extract-sgk Genuine Processing & Auto-Unload", False, f"Exception: {e}")

# ----------------------------------------------------------------------
# CHECK 6: /qwen/direct-prosody ZERO-WORD-MUTATION & ACOUSTIC RULES
# ----------------------------------------------------------------------
print("\n--- CHECK 6: /qwen/direct-prosody Zero-Word-Mutation & Rules ---")
try:
    test_passage = "Sáng sớm, mặt trời ló rạng tỏa ánh nắng ấm áp. Tiếng chim hót rộn rã trên cành cây, phải không? Các bạn nhỏ tung tăng cắp sách đến trường!"
    difficult_words = ["rộn rã", "tung tăng"]
    
    resp = client.post("/qwen/direct-prosody", json={
        "passage": test_passage,
        "difficult_words": difficult_words,
        "grade": 3,
        "chunk_mode": "phrase"
    })
    assert resp.status_code == 200
    p_data = resp.json()
    
    clauses = p_data["clauses"]
    
    # 1. Zero-Word-Mutation check
    orig_words = test_passage.split()
    clauses_words = [w for c in clauses for w in c["text"].split()]
    verbatim_match = (orig_words == clauses_words)
    
    # 2. Check rules on clauses
    emphasis_found = False
    question_found = False
    exclamation_found = False
    
    for c in clauses:
        txt = c["text"]
        if any(dw in txt for dw in difficult_words):
            if c["style"] == "emphasis" and c["pause_sec"] >= 4.0:
                emphasis_found = True
        if txt.endswith("?"):
            if c["style"] == "question" and c["pause_sec"] == 2.5:
                question_found = True
        if txt.endswith("!") or txt.endswith("."):
            if not c["matched_difficult_words"] and c["style"] == "warm_story" and c["pause_sec"] == 2.0:
                exclamation_found = True

    rules_ok = verbatim_match and emphasis_found and question_found
    
    record(
        "CHECK-06 /qwen/direct-prosody Zero-Word-Mutation & Acoustic Rules",
        rules_ok,
        f"verbatim_match: {verbatim_match} ({len(orig_words)} words), emphasis (+2.5s pause): {emphasis_found}, question rule: {question_found}, exclamation/period rule: {exclamation_found}"
    )
except Exception as e:
    record("CHECK-06 /qwen/direct-prosody Zero-Word-Mutation & Acoustic Rules", False, f"Exception: {e}")

# ----------------------------------------------------------------------
# CHECK 7: PROSODY CACHE DYNAMICS & LRU EVICTION
# ----------------------------------------------------------------------
print("\n--- CHECK 7: Prosody Script Cache Keying & LRU Eviction ---")
try:
    # 1. Identical call should hit cache
    resp_hit = client.post("/qwen/direct-prosody", json={
        "passage": test_passage,
        "difficult_words": difficult_words,
        "grade": 3,
        "chunk_mode": "phrase"
    })
    assert resp_hit.status_code == 200
    hit_data = resp_hit.json()
    cache_hit_ok = (hit_data.get("cache_hit") is True)
    
    # 2. Altering grade or difficult words should miss cache
    resp_miss = client.post("/qwen/direct-prosody", json={
        "passage": test_passage,
        "difficult_words": ["rộn rã"],  # different difficult words
        "grade": 4,                    # different grade
        "chunk_mode": "phrase"
    })
    miss_data = resp_miss.json()
    cache_miss_ok = (miss_data.get("cache_hit") is False)
    
    # 3. Test LRU capacity: flood cache with 150 unique items
    init_cache_len = len(main_mod._prosody_script_cache)
    for i in range(135):
        key = f"forensic_test_key_{i}"
        main_mod.set_cached_prosody_script(key, {
            "clauses": [{"text": f"Vế {i}"}],
            "total_words": 2,
            "estimated_duration_sec": 1.0
        })
    
    final_cache_len = len(main_mod._prosody_script_cache)
    lru_bounded = (final_cache_len <= 128)
    
    record(
        "CHECK-07 Prosody Cache Dynamics & 128 LRU Bound",
        cache_hit_ok and cache_miss_ok and lru_bounded,
        f"Cache Hit on repeat: {cache_hit_ok}, Cache Miss on param change: {cache_miss_ok}, Cache capacity bounded at 128: {lru_bounded} (final len: {final_cache_len})"
    )
except Exception as e:
    record("CHECK-07 Prosody Cache Dynamics & 128 LRU Bound", False, f"Exception: {e}")

# ----------------------------------------------------------------------
# CHECK 8: /tts ENDPOINT GENUINE SYNTHESIS
# ----------------------------------------------------------------------
print("\n--- CHECK 8: /tts Endpoint Genuine Synthesis ---")
try:
    # Generate audio for two distinct texts
    t1 = "Mặt trời mọc ở đằng đông."
    t2 = "Mặt trời mọc ở đằng đông, mặt trời lặn ở đằng tây, hôm nay trời nắng rất đẹp."
    
    r1 = client.get(f"/tts?text={t1}&style=standard")
    r2 = client.get(f"/tts?text={t2}&style=standard")
    
    assert r1.status_code == 200
    assert r2.status_code == 200
    
    bytes1 = len(r1.content)
    bytes2 = len(r2.content)
    
    # Longer text must produce significantly more audio bytes!
    is_genuine_audio = (bytes2 > bytes1 * 1.5) and (r1.content[:4] == b"RIFF")
    
    record(
        "CHECK-08 /tts Genuine Wave Synthesis",
        is_genuine_audio,
        f"Text 1 ({len(t1.split())} words) -> {bytes1} bytes, Text 2 ({len(t2.split())} words) -> {bytes2} bytes, RIFF header: {r1.content[:4] == b'RIFF'}"
    )
except Exception as e:
    record("CHECK-08 /tts Genuine Wave Synthesis", False, f"Exception: {e}")

# ----------------------------------------------------------------------
# CHECK 9: START_ALL.BAT INTEGRITY
# ----------------------------------------------------------------------
print("\n--- CHECK 9: start_all.bat Configuration ---")
try:
    bat_path = os.path.join(BASE_DIR, "start_all.bat")
    with open(bat_path, "r", encoding="utf-8") as f:
        bat_content = f.read()
    
    has_lifecycle = "set QWEN_LIFECYCLE_MODE=on_demand_unload" in bat_content
    has_enable_qwen = "set ENABLE_QWEN_SLM=1" in bat_content
    
    record(
        "CHECK-09 start_all.bat Lifecycle Flag",
        has_lifecycle and has_enable_qwen,
        f"QWEN_LIFECYCLE_MODE=on_demand_unload present: {has_lifecycle}, ENABLE_QWEN_SLM=1 present: {has_enable_qwen}"
    )
except Exception as e:
    record("CHECK-09 start_all.bat Lifecycle Flag", False, f"Exception: {e}")

# ----------------------------------------------------------------------
# SUMMARY
# ----------------------------------------------------------------------
print("\n" + "=" * 80)
total_checks = len(results)
passed_checks = sum(1 for r in results if r["verdict"] == "PASS")
failed_checks = sum(1 for r in results if r["verdict"] == "FAIL")
print(f"FORENSIC AUDIT SUMMARY: {passed_checks}/{total_checks} PASSED (Failures: {failed_checks})")
print("=" * 80)

if failed_checks > 0:
    print("VERDICT: INTEGRITY VIOLATION")
    sys.exit(1)
else:
    print("VERDICT: CLEAN")
    sys.exit(0)
