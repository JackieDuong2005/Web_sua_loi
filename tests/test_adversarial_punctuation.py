"""
Adversarial Stress-Testing & Empirical Fuzzing Suite for
Pedagogical Punctuation Injection & Piper VITS Synthesis in python_service/tts_engine.py
Author: Challenger M1-2
"""

import sys
import io
import re
import wave
import time
import traceback
from typing import Dict, List, Tuple, Any

# Ensure stdout handles UTF-8 on Windows
if sys.stdout.encoding != "utf-8":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from python_service.tts_engine import (
    tts_engine,
    inject_pedagogical_punctuation,
    normalize_vietnamese_text,
    PROSODY_STYLE_PRESETS,
    PEDAGOGICAL_PUNCTUATION_MAP,
)


class AdversarialTestRunner:
    def __init__(self):
        self.results = []
        self.total_tests = 0
        self.passed_tests = 0
        self.failed_tests = 0
        self.findings = []

    def record_result(self, category: str, test_name: str, passed: bool, details: str, severity: str = "INFO"):
        self.total_tests += 1
        if passed:
            self.passed_tests += 1
            status = "PASS"
        else:
            self.failed_tests += 1
            status = "FAIL"
            self.findings.append({
                "category": category,
                "test_name": test_name,
                "severity": severity,
                "details": details,
            })
        self.results.append({
            "category": category,
            "test_name": test_name,
            "status": status,
            "details": details,
        })
        print(f"[{status}] [{category}] {test_name}: {details[:120]}")

    # =========================================================================
    # 1. NESTED OR REPEATED PUNCTUATION
    # =========================================================================
    def test_nested_and_repeated_punctuation(self):
        cat = "Repeated/Nested Punctuation"
        cases = [
            (",,,", "triple comma"),
            ("....", "four dots"),
            ("?!?!", "interrobang sequence"),
            (": : :", "spaced colons"),
            (", . ? ! :", "standard punctuation list"),
            (".,?!:", "consecutive punctuation sequence"),
            ("!!??", "double exclamation double question"),
            ("??!!", "double question double exclamation"),
            (",,,,....", "quad comma quad dot"),
        ]

        for text, desc in cases:
            # 1. First pass
            r1 = inject_pedagogical_punctuation(text, enabled=True)
            # 2. Second pass (Idempotence)
            r2 = inject_pedagogical_punctuation(r1, enabled=True)

            idempotent = (r1 == r2)
            if not idempotent:
                self.record_result(
                    cat,
                    f"Idempotency: {desc} ({repr(text)})",
                    False,
                    f"IDEMPOTENCY BROKEN: f(x)={repr(r1)} != f(f(x))={repr(r2)}",
                    severity="HIGH"
                )
            else:
                self.record_result(
                    cat,
                    f"Idempotency: {desc} ({repr(text)})",
                    True,
                    f"Idempotent: {repr(r1)}"
                )

            # Check for cue explosion or duplicate words
            exploded = False
            for word in ["phẩy", "chấm", "hai chấm"]:
                # Check for repeated cue tokens like ", phẩy, , phẩy," or "chấm, chấm"
                if len(re.findall(rf"\b{word}\b", r2)) > len(re.findall(rf"\b{word}\b", r1)) * 1.5:
                    exploded = True
            if exploded:
                self.record_result(
                    cat,
                    f"Mutation Explosion: {desc}",
                    False,
                    f"Cue words multiplied across passes! Pass 1: {repr(r1)} -> Pass 2: {repr(r2)}",
                    severity="HIGH"
                )

    # =========================================================================
    # 2. TEXT WITH ONLY PUNCTUATION AND NO WORDS
    # =========================================================================
    def test_punctuation_only_text(self):
        cat = "Punctuation-Only Text"
        cases = [
            ",",
            ".",
            "?",
            "!",
            ":",
            "...",
            "....",
            ": : :",
            ",,,",
            ", . ? ! :",
        ]

        for text in cases:
            r1 = inject_pedagogical_punctuation(text, enabled=True)
            r2 = inject_pedagogical_punctuation(r1, enabled=True)
            idempotent = (r1 == r2)
            self.record_result(
                cat,
                f"Injection format: {repr(text)}",
                idempotent,
                f"r1={repr(r1)}, idempotent={idempotent}",
                severity="MEDIUM" if not idempotent else "INFO"
            )

    # =========================================================================
    # 3. MIXED PUNCTUATION AND VIETNAMESE DIACRITICS
    # =========================================================================
    def test_mixed_punctuation_and_diacritics(self):
        cat = "Mixed Punctuation & Diacritics"
        sentences = [
            "Ơ kìa, em ơi! Có phải... chú mèo? Đúng rồi: mèo tam thể.",
            "Bác Hồ từng căn dặn: 'Học tập tốt, lao động tốt!'.",
            "Trời thu trong xanh... ngút ngàn, từng đàn chim én bay về phương nam.",
            "Tại sao em lại làm vậy? Vì em muốn giúp đỡ bạn bè!",
            "Một, hai, ba: tất cả cùng hô vang!",
        ]

        for s in sentences:
            r1 = inject_pedagogical_punctuation(s, enabled=True)
            r2 = inject_pedagogical_punctuation(r1, enabled=True)
            idempotent = (r1 == r2)

            # Verify diacritics not corrupted
            # Check for vowel corruptions or mojibake
            vietnamese_vowels = set("aáàảãạăắằẳẵặâấầẩẫậeéèẻẽẹêếềểễệiíìỉĩịoóòỏõọôốồổỗộơớờởỡợuúùủũụưứừửữựyýỳỷỹỵđ")
            orig_vowels = set(c.lower() for c in s if c.lower() in vietnamese_vowels)
            out_vowels = set(c.lower() for c in r1 if c.lower() in vietnamese_vowels)
            vowels_preserved = orig_vowels.issubset(out_vowels)

            # Verify punctuation marks are converted
            has_unconverted = bool(re.search(r'(?<!\.)[.?!,:](?!\.)', r1.replace(', phẩy,', '').replace(', chấm.', '').replace(', chấm hỏi.', '').replace(', chấm than.', '').replace(', hai chấm,', '')))

            passed = idempotent and vowels_preserved
            self.record_result(
                cat,
                f"Sentence: {s[:35]}...",
                passed,
                f"r1={repr(r1)} | Idempotent={idempotent} | VowelsPreserved={vowels_preserved}",
                severity="HIGH" if not passed else "INFO"
            )

    # =========================================================================
    # 4. VIETNAMESE WORDS CONTAINING PUNCTUATION NAMES
    # =========================================================================
    def test_words_containing_punctuation_names(self):
        cat = "Words Containing Punctuation Substrings"
        # Isolated test words
        words = ["chấm bài", "dấu chấm", "phẩy đuôi", "chấm thi", "dấu hai chấm", "phẩy tay", "dấu hỏi", "dấu than"]
        for w in words:
            r = inject_pedagogical_punctuation(w, enabled=True)
            # The word should remain exactly as is without added punctuation or commas
            passed = (r == w)
            self.record_result(
                cat,
                f"Isolated word: {repr(w)}",
                passed,
                f"Output={repr(r)}",
                severity="HIGH" if not passed else "INFO"
            )

        # Contextual sentences
        sents = [
            ("Thầy giáo chấm bài cho các em học sinh.", "chấm bài without punct"),
            ("Chú cá nhỏ phẩy đuôi bơi qua rạn san hô.", "phẩy đuôi without punct"),
            ("Cuối năm, hội đồng giáo viên tổ chức chấm thi.", "chấm thi without punct"),
            ("Em cần điền dấu chấm hoặc dấu phẩy vào ô trống.", "dấu chấm / dấu phẩy without punct"),
            ("Dấu hai chấm dùng để mở đầu lời thoại.", "dấu hai chấm without punct"),
            ("Thầy giáo chấm bài, em đứng nhìn.", "chấm bài with subsequent comma"),
            ("Con mèo phẩy đuôi, chạy mất.", "phẩy đuôi with subsequent comma"),
            ("Dấu hai chấm: giải thích nội dung.", "dấu hai chấm followed by colon"),
        ]

        for s, label in sents:
            r1 = inject_pedagogical_punctuation(s, enabled=True)
            r2 = inject_pedagogical_punctuation(r1, enabled=True)
            idempotent = (r1 == r2)

            # Check that words like 'chấm bài', 'phẩy đuôi' are not altered
            preserved = True
            for kw in ["chấm bài", "phẩy đuôi", "chấm thi", "dấu chấm", "dấu phẩy", "dấu hai chấm"]:
                if kw in s and kw not in r1:
                    preserved = False

            passed = idempotent and preserved
            self.record_result(
                cat,
                f"Sentence: {label}",
                passed,
                f"Output={repr(r1)} | Preserved={preserved} | Idempotent={idempotent}",
                severity="HIGH" if not passed else "INFO"
            )

    # =========================================================================
    # 5. EXTREME AND BOUNDARY INPUTS
    # =========================================================================
    def test_extreme_and_boundary_inputs(self):
        cat = "Extreme Inputs"
        # 1. Empty string
        r_empty = inject_pedagogical_punctuation("", enabled=True)
        self.record_result(
            cat,
            "Empty string ''",
            r_empty == "",
            f"Output={repr(r_empty)}",
            severity="MEDIUM" if r_empty != "" else "INFO"
        )

        # 2. Whitespace only
        r_ws = inject_pedagogical_punctuation("   \t\n  ", enabled=True)
        self.record_result(
            cat,
            "Whitespace only '   \\t\\n  '",
            r_ws == "",
            f"Output={repr(r_ws)}",
            severity="MEDIUM" if r_ws != "" else "INFO"
        )

        # 3. Space before ellipsis
        s_ell = "Hôm nay ... trời đẹp"
        r_ell = inject_pedagogical_punctuation(s_ell, enabled=True)
        # Ellipsis should NOT be split into ', chấm. ..'
        ell_preserved = "..." in r_ell and ", chấm. .." not in r_ell
        self.record_result(
            cat,
            "Space before ellipsis: 'Hôm nay ... trời đẹp'",
            ell_preserved,
            f"Output={repr(r_ell)} (Expected ellipsis to be preserved without inserting ', chấm.')",
            severity="HIGH" if not ell_preserved else "INFO"
        )

        # 4. Space before punctuation cue
        s_cue = "Chào em , phẩy, hôm nay"
        r_cue1 = inject_pedagogical_punctuation(s_cue, enabled=True)
        r_cue2 = inject_pedagogical_punctuation(r_cue1, enabled=True)
        cue_intact = ("phẩy, phẩy" not in r_cue1) and (r_cue1 == r_cue2)
        self.record_result(
            cat,
            "Space before existing cue: 'Chào em , phẩy, hôm nay'",
            cue_intact,
            f"r1={repr(r_cue1)} | r2={repr(r_cue2)}",
            severity="HIGH" if not cue_intact else "INFO"
        )

        # 5. 100+ punctuation marks in a single paragraph
        long_punct = ", . ? ! : " * 25  # 125 punctuation marks
        t0 = time.time()
        r_long = inject_pedagogical_punctuation(long_punct, enabled=True)
        dur = time.time() - t0
        self.record_result(
            cat,
            "125 punctuation marks paragraph",
            dur < 0.5,
            f"Execution time={dur*1000:.2f}ms, Output length={len(r_long)}",
            severity="MEDIUM" if dur >= 0.5 else "INFO"
        )

        # 6. 200 repeated commas
        t0 = time.time()
        r_commas = inject_pedagogical_punctuation("," * 200, enabled=True)
        dur = time.time() - t0
        self.record_result(
            cat,
            "200 consecutive commas",
            r_commas == ", phẩy,",
            f"Execution time={dur*1000:.2f}ms, Output={repr(r_commas)}",
            severity="MEDIUM" if r_commas != ", phẩy," else "INFO"
        )

        # 7. Abbreviation with spaces e.g. 'TP. HCM'
        s_abbr = "UBND TP. HCM vừa ra quyết định."
        r_abbr = inject_pedagogical_punctuation(s_abbr, enabled=True)
        abbr_intact = "TP, chấm." not in r_abbr
        self.record_result(
            cat,
            "Abbreviation with space: 'TP. HCM'",
            abbr_intact,
            f"Output={repr(r_abbr)}",
            severity="MEDIUM" if not abbr_intact else "INFO"
        )

    # =========================================================================
    # 6. REAL AUDIO SYNTHESIS WITH PIPER VITS
    # =========================================================================
    def test_piper_audio_synthesis_crash_resistance(self):
        cat = "Piper VITS Audio Generation"
        test_inputs = [
            ("Ơ kìa, em ơi! Có phải... chú mèo? Đúng rồi: mèo tam thể.", "Vietnamese with diacritics & punct", True),
            ("Ơ kìa, em ơi! Có phải... chú mèo? Đúng rồi: mèo tam thể.", "Vietnamese with diacritics & punct", False),
            ("Thầy giáo chấm bài cho các em.", "Sentence with 'chấm bài'", True),
            (",,,", "Repeated commas", True),
            (",,,", "Repeated commas (rp=False)", False),
            ("....", "Four dots", True),
            ("....", "Four dots (rp=False)", False),
            ("...", "Ellipsis", True),
            ("...", "Ellipsis (rp=False)", False),
            ("?!?!", "Interrobang sequence", True),
            ("?!?!", "Interrobang sequence (rp=False)", False),
            (": : :", "Spaced colons", True),
            (": : :", "Spaced colons (rp=False)", False),
            (", . ? ! :", "Punctuation sequence", True),
            (", . ? ! :", "Punctuation sequence (rp=False)", False),
            ("   ...   ", "Spaced ellipsis", True),
            ("   ...   ", "Spaced ellipsis (rp=False)", False),
            ("", "Empty string", False),
            ("   ", "Whitespace only", False),
            (", . ? ! : " * 10, "50 punctuation sequence", True),
        ]

        for text, label, rp in test_inputs:
            test_id = f"{label} (read_punct={rp})"
            try:
                wav = tts_engine.synthesize_wav(text, style="standard", read_punctuation=rp)
                is_valid = isinstance(wav, bytes) and len(wav) > 44
                if is_valid:
                    with wave.open(io.BytesIO(wav), "rb") as wf:
                        channels = wf.getnchannels()
                        rate = wf.getframerate()
                        frames = wf.getnframes()
                    self.record_result(
                        cat,
                        test_id,
                        True,
                        f"SUCCESS: Generated {len(wav)} bytes, {channels}ch, {rate}Hz, {frames} frames"
                    )
                else:
                    self.record_result(
                        cat,
                        test_id,
                        False,
                        f"INVALID AUDIO: Bytes length={len(wav) if isinstance(wav, bytes) else 'not bytes'}",
                        severity="CRITICAL"
                    )
            except ValueError as ve:
                # For empty string or whitespace only, ValueError is graceful and expected
                if text.strip() == "":
                    self.record_result(
                        cat,
                        test_id,
                        True,
                        f"GRACEFUL REJECTION: Caught expected ValueError: {ve}"
                    )
                else:
                    self.record_result(
                        cat,
                        test_id,
                        False,
                        f"UNEXPECTED ValueError: {ve}",
                        severity="HIGH"
                    )
            except Exception as e:
                # Wave errors, crashes, etc.
                exc_type = type(e).__name__
                self.record_result(
                    cat,
                    test_id,
                    False,
                    f"CRASH/EXCEPTION: {exc_type}: {e}",
                    severity="CRITICAL" if "wave.Error" in f"{exc_type}: {e}" else "HIGH"
                )

    def run_all(self):
        print("=" * 80)
        print("STARTING ADVERSARIAL STRESS TEST SUITE FOR PIPER TTS & PUNCTUATION")
        print("=" * 80)
        t_start = time.time()

        self.test_nested_and_repeated_punctuation()
        self.test_punctuation_only_text()
        self.test_mixed_punctuation_and_diacritics()
        self.test_words_containing_punctuation_names()
        self.test_extreme_and_boundary_inputs()
        self.test_piper_audio_synthesis_crash_resistance()

        duration = time.time() - t_start
        print("=" * 80)
        print(f"ADVERSARIAL SUITE FINISHED in {duration:.2f}s")
        print(f"TOTAL TESTS: {self.total_tests}")
        print(f"PASSED: {self.passed_tests}")
        print(f"FAILED: {self.failed_tests}")
        print("=" * 80)

        return {
            "total": self.total_tests,
            "passed": self.passed_tests,
            "failed": self.failed_tests,
            "duration": duration,
            "findings": self.findings,
            "results": self.results,
        }


if __name__ == "__main__":
    runner = AdversarialTestRunner()
    res = runner.run_all()
    if res["failed"] > 0:
        print(f"\n[SUMMARY OF {len(res['findings'])} FAILURES/FINDINGS]")
        for idx, f in enumerate(res["findings"], 1):
            print(f"{idx}. [{f['severity']}] [{f['category']}] {f['test_name']}")
            print(f"   Details: {f['details']}")
    sys.exit(0)
