"""
Adversarial Stress Test & Integrity Audit Suite for Milestone 2
Author: Reviewer 2 & Adversarial Critic
Target: python_service/main.py (Qwen2.5 Lifecycle & Pedagogical Endpoints)
"""

import sys
import io
import time
import wave
import json
import re
import unittest
from typing import List, Dict, Any

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

import os
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from fastapi.testclient import TestClient
from python_service.main import (
    app,
    get_available_ram_mb,
    unload_qwen_model,
    clean_raw_sgk_text,
    extract_deterministic_difficult_words,
    segment_into_pedagogical_clauses,
    direct_prosody_script,
    compute_prosody_cache_key,
    get_cached_prosody_script,
    set_cached_prosody_script,
    _prosody_script_cache,
    _prosody_cache_lock,
    _PROSODY_CACHE_MAX_ENTRIES,
    PROSODY_STYLE_PRESETS,
)

client = TestClient(app)


class TestMilestone2Adversarial(unittest.TestCase):

    def test_01_integrity_scan_no_mock_hardcoding(self):
        """Kiểm tra tính liêm chính (Integrity): Không có kết quả test bị hardcode trong source code."""
        main_path = os.path.join(BASE_DIR, "python_service", "main.py")
        with open(main_path, "r", encoding="utf-8") as f:
            code = f.read()

        # Isolate the Milestone 2 endpoints and helper functions
        m2_start = code.find("clean_raw_sgk_text")
        m2_end = code.find("class QwenTestRequest")
        self.assertGreater(m2_start, 0)
        self.assertGreater(m2_end, m2_start)
        m2_code = code[m2_start:m2_end]

        # Check for suspicious mock returns within M2 logic
        mock_strings = [
            "TC-01", "TC-02", "TC-03", "TC-04", "TC-05", "TC-06", "TC-07",
            "mock_", "fake_", "dummy_",
        ]
        for s in mock_strings:
            self.assertNotIn(s, m2_code, f"INTEGRITY VIOLATION: Mock marker '{s}' found in Milestone 2 code!")

        # Verify real logic implementations exist
        self.assertIn("clean_raw_sgk_text", code)
        self.assertIn("segment_into_pedagogical_clauses", code)
        self.assertIn("direct_prosody_script", code)
        self.assertIn("get_available_ram_mb", code)
        self.assertIn("unload_qwen_model", code)
        print("  [PASS] Integrity Scan: No hardcoded test responses or facades found.")

    def test_02_zero_word_mutation_adversarial_passages(self):
        """Kiểm tra bất biến 100% Zero-Word-Mutation với các đoạn văn phức tạp."""
        adversarial_passages = [
            # 1. Đoạn thơ với xuống dòng và dấu câu đa dạng
            "Mặt trời lặn xế bóng...\nChim bay về tổ ấm; tiếng sáo diều vi vu, vi vu!",
            # 2. Đoạn có câu hỏi, dấu than, dấu chấm phẩy
            "Ai là người đầu tiên đặt chân lên Mặt Trăng? Neil Armstrong! Đúng vậy; một kỳ tích vĩ đại.",
            # 3. Đoạn ngắn không có dấu phẩy hoặc chấm
            "Trời thu trong xanh ngắt một màu",
            # 4. Đoạn có lời thoại kết thúc câu không có dấu chấm ngoài
            'Bác Hồ căn dặn: "Các vua Hùng đã có công dựng nước, Bác cháu ta phải cùng nhau giữ lấy nước!" Đó là lời dạy thiêng liêng.',
        ]

        for i, passage in enumerate(adversarial_passages, 1):
            for mode in ["phrase", "sentence"]:
                script = direct_prosody_script(passage, chunk_mode=mode)
                clauses = script["clauses"]
                self.assertGreater(len(clauses), 0, f"Case {i} ({mode}): No clauses returned")

                orig_words = passage.split()
                clause_words = [w for c in clauses for w in c["text"].split()]
                self.assertEqual(
                    orig_words,
                    clause_words,
                    f"ZERO-WORD-MUTATION VIOLATION in Case {i} ({mode})!\nOrig:   {orig_words}\nClause: {clause_words}"
                )
        print("  [PASS] Zero-Word-Mutation Stress Test: 100% words preserved across all adversarial passages.")

    def test_03_difficult_word_matching_and_pause_inflation(self):
        """Kiểm tra việc nhận diện từ khó, gán style='emphasis' và cộng dồn +2.5s vào pause_sec."""
        passage = "Dòng sông uốn lượn quanh co qua sườn đồi, tạo nên cảnh sắc êm đềm."
        # Case A: từ khó chuẩn xác
        script1 = direct_prosody_script(passage, difficult_words=["uốn lượn", "sườn đồi"])
        matched_count = 0
        for c in script1["clauses"]:
            if any(w in c["text"].lower() for w in ["uốn lượn", "sườn đồi"]):
                matched_count += 1
                self.assertEqual(c["style"], "emphasis", f"Clause '{c['text']}' should have style 'emphasis'")
                self.assertEqual(c["rate"], "-20%")
                self.assertGreaterEqual(c["pause_sec"], 4.0, f"Clause '{c['text']}' pause too short: {c['pause_sec']}")

        self.assertGreater(matched_count, 0, "No difficult words were matched")

        # Case B: từ khó viết hoa và có khoảng trắng dư thừa
        script2 = direct_prosody_script(passage, difficult_words=["  UỐN LƯỢN  ", " SƯỜN ĐỒI "])
        matched_count2 = sum(1 for c in script2["clauses"] if c.get("matched_difficult_words"))
        self.assertGreater(matched_count2, 0, "Case-insensitive and trimmed difficult words failed to match")
        print("  [PASS] Difficult Word Matching: Emphasis style, -20% rate, and +2.5s pause inflation verified.")

    def test_04_pedagogical_clause_styles(self):
        """Kiểm tra gán style chuẩn theo dấu câu kết thúc của từng vế câu."""
        test_cases = [
            ("Hôm nay trời có mưa không?", "question", 2.5),
            ("Cảnh bình minh đẹp quá!", "warm_story", 2.0),
            ("Đàn chim tung cánh bay về tổ.", "warm_story", 2.0),
            ("Mặt trời lên cao,", "standard", 1.5),
            ("Gió thổi vi vu;", "standard", 1.5),
            ("Thầy giáo dặn dò:", "standard", 1.5),
        ]
        for text, expected_style, expected_pause in test_cases:
            script = direct_prosody_script(text, difficult_words=[])
            clause = script["clauses"][0]
            self.assertEqual(clause["style"], expected_style, f"Text '{text}' expected style '{expected_style}', got '{clause['style']}'")
            self.assertEqual(clause["pause_sec"], expected_pause, f"Text '{text}' expected pause '{expected_pause}', got '{clause['pause_sec']}'")
        print("  [PASS] Clause Styling: question (2.5s), warm_story (2.0s), standard (1.5s) strictly verified.")

    def test_05_sgk_cleaning_robustness(self):
        """Kiểm tra độ bền bỉ của SGK text cleaning với các định dạng đề thi/SGK thực tế."""
        raw_input = """
        TẬP ĐỌC - TUẦN 8
        Tiếng Việt 2 - Tập 1
        Trang 64 / 120

        Bé Hoa chăm chỉ học bài vào mỗi buổi tối.
        Hoa luôn giúp mẹ quét nhà và tưới cây quanh vườn.

        64
        Câu 1. Em hãy tìm từ ngữ chỉ hoạt động của bạn Hoa?
        Câu 2: Đặt câu với từ 'chăm chỉ'.
        * Ghi nhớ: Cần làm việc nhà vừa sức để giúp đỡ cha mẹ.
        """
        title, clean_content = clean_raw_sgk_text(raw_input)
        self.assertNotIn("TẬP ĐỌC", clean_content)
        self.assertNotIn("Trang 64", clean_content)
        self.assertNotIn("Câu 1", clean_content)
        self.assertNotIn("Ghi nhớ", clean_content)
        self.assertIn("Bé Hoa chăm chỉ học bài", clean_content)
        self.assertIn("Hoa luôn giúp mẹ quét nhà", clean_content)

        # Endpoint validation
        resp = client.post("/qwen/extract-sgk", json={"raw_text": raw_input, "grade": 2})
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        expected_keys = {"title", "clean_content", "difficultWords", "summary", "source", "ram_unloaded"}
        self.assertTrue(expected_keys.issubset(data.keys()), f"Missing keys in extract-sgk response: {expected_keys - data.keys()}")
        self.assertTrue(data["ram_unloaded"])
        self.assertIsInstance(data["difficultWords"], list)
        self.assertGreater(len(data["difficultWords"]), 0)
        print("  [PASS] SGK Cleaning Robustness: Page numbers & questions stripped, exact JSON schema verified.")

    def test_06_ram_guard_and_unload_lifecycle(self):
        """Kiểm tra chức năng RAM Guard và chu trình Auto-Unload đảm bảo 0 MB RAM idle."""
        # 1. RAM detection
        avail = get_available_ram_mb()
        self.assertGreater(avail, 0.0, f"Available RAM must be positive, got {avail}")

        # 2. Unload model
        unload_qwen_model()
        from python_service import main as m
        self.assertIsNone(m._qwen_model, "_qwen_model should be None after unload")
        self.assertIsNone(m._qwen_tokenizer, "_qwen_tokenizer should be None after unload")

        # 3. Direct prosody call maintains unloaded state
        resp = client.post("/qwen/direct-prosody", json={"passage": "Mùa thu đã về trên khắp nẻo đường."})
        self.assertEqual(resp.status_code, 200)
        self.assertTrue(resp.json().get("ram_unloaded"))

        status = client.get("/qwen/status").json()
        self.assertFalse(status["is_loaded"], "Qwen should be unloaded after /qwen/direct-prosody")
        self.assertEqual(status["lifecycle_mode"], "on_demand_unload")
        self.assertEqual(status["memory_mode"], "zero_idle_ram")
        print(f"  [PASS] RAM Guard & Lifecycle: Available RAM={avail:.1f}MB, 0MB RAM idle state confirmed.")

    def test_07_prosody_cache_lru_and_isolation(self):
        """Kiểm tra LRU Cache: Khả năng cách ly theo tham số và cơ chế đẩy bản ghi cũ."""
        p1 = "Buổi sáng ở làng quê thật thanh bình."
        k1 = compute_prosody_cache_key(p1, grade=3, chunk_mode="phrase", difficult_words=["thanh bình"])
        k2 = compute_prosody_cache_key(p1, grade=4, chunk_mode="phrase", difficult_words=["thanh bình"])
        k3 = compute_prosody_cache_key(p1, grade=3, chunk_mode="sentence", difficult_words=["thanh bình"])
        k4 = compute_prosody_cache_key(p1, grade=3, chunk_mode="phrase", difficult_words=["làng quê"])

        # All keys must be unique
        keys = {k1, k2, k3, k4}
        self.assertEqual(len(keys), 4, "Cache keys must differ when parameters change")

        # Test LRU eviction
        with _prosody_cache_lock:
            _prosody_script_cache.clear()

        dummy_script = {"clauses": [{"index": 0, "text": "test"}], "total_words": 1, "estimated_duration_sec": 1.0}
        for i in range(_PROSODY_CACHE_MAX_ENTRIES + 10):
            set_cached_prosody_script(f"key_{i}", dummy_script)

        with _prosody_cache_lock:
            cache_size = len(_prosody_script_cache)
        self.assertEqual(cache_size, _PROSODY_CACHE_MAX_ENTRIES, f"Cache size should not exceed {_PROSODY_CACHE_MAX_ENTRIES}")
        print(f"  [PASS] Prosody LRU Cache: Key isolation and Max Entries ({_PROSODY_CACHE_MAX_ENTRIES}) verified.")

    def test_08_tts_acoustic_parameter_forwarding(self):
        """Kiểm tra chuyển tiếp đầy đủ các tham số âm học qua GET /tts và POST /tts/play-local."""
        # 1. GET /tts with acoustic parameters
        resp = client.get(
            "/tts",
            params={
                "text": "Bình minh rực rỡ, chim hót ríu rít.",
                "voice": "vi_VN-vais1000-medium",
                "rate": "-15%",
                "style": "emphasis",
                "noise_scale": 0.58,
                "noise_w": 0.72,
                "read_punctuation": "false",
            }
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.headers.get("X-TTS-Style"), "emphasis")
        self.assertEqual(resp.headers.get("Content-Type"), "audio/wav")
        self.assertGreater(len(resp.content), 5000)

        # 2. POST /tts/play-local
        play_payload = {
            "text": "Kiểm tra loa phần cứng thiết bị.",
            "voice": "vi_VN-vais1000-medium",
            "rate": "-10%",
            "style": "question",
            "noise_scale": 0.82,
            "noise_w": 0.92,
            "read_punctuation": False,
        }
        resp2 = client.post("/tts/play-local", json=play_payload)
        self.assertEqual(resp2.status_code, 200)
        d2 = resp2.json()
        self.assertEqual(d2.get("status"), "ok")
        self.assertEqual(d2.get("device"), "local_speaker")
        self.assertEqual(d2.get("noise_scale"), 0.82)
        self.assertEqual(d2.get("noise_w_scale"), 0.92)
        print("  [PASS] TTS Acoustic Forwarding: Style, noise_scale, noise_w, read_punct verified.")


if __name__ == "__main__":
    print("=" * 80)
    print("REVIEWER 2 ADVERSARIAL STRESS TEST & AUDIT SUITE")
    print("=" * 80)
    unittest.main(verbosity=1)
