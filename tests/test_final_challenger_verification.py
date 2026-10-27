"""
Empirical Challenger Final Verification & Fuzzing Harness
Milestone 1: Expressive Piper VITS Engine & Spoken Punctuation
"""

import sys
import io
import re
import wave
import random

# Ensure UTF-8 output
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


def run_tests():
    print("=" * 80)
    print("FINAL CHALLENGER: EMPIRICAL FUZZING & DEEP STRESS HARNESS")
    print("=" * 80)

    # -------------------------------------------------------------
    # Test 1: Empty and whitespace synthesis
    # -------------------------------------------------------------
    empty_inputs = ['', '   ', '\t', '\n\n\r\t', '   \t  \n  ']
    for s in empty_inputs:
        try:
            tts_engine.synthesize_wav(s)
            assert False, f"Expected ValueError for {repr(s)}"
        except ValueError:
            pass  # Expected graceful rejection
    print("[PASS 1] Empty & whitespace inputs rejected with graceful ValueError")

    # -------------------------------------------------------------
    # Test 2: Emoji and Non-Latin / Special symbols
    # -------------------------------------------------------------
    symbols = ['😊🚀🎉', '👍... ???', '★☆♦♣', '---===+++', '///\\\\\\', '@@@###$$$']
    for s in symbols:
        for rp in [True, False]:
            try:
                norm = normalize_vietnamese_text(s)
                if not norm:
                    continue
                wav = tts_engine.synthesize_wav(s, read_punctuation=rp)
                assert isinstance(wav, bytes) and len(wav) >= 44
                with wave.open(io.BytesIO(wav), 'rb') as wf:
                    assert wf.getnchannels() == 1
                    assert wf.getframerate() == 22050
            except ValueError:
                pass  # Graceful rejection when normalized text is empty
            except Exception as e:
                assert False, f"Crash on symbol {repr(s)} (rp={rp}): {type(e).__name__}: {e}"
    print("[PASS 2] Emojis and symbol inputs handled gracefully without wave.Error")

    # -------------------------------------------------------------
    # Test 3: Large punctuation sequences (idempotency + audio synthesis)
    # -------------------------------------------------------------
    large_punct = [
        ',' * 50,
        ':' * 30,
        '?!' * 30,
        '. ' * 30,
        ', ' * 30,
        '; ' * 30,
        '??? !!! ' * 10,
        '... ' * 20,
        ', phẩy, ' * 10,
        ', chấm. ' * 10,
        ', hai chấm, ' * 10,
        ', chấm hỏi. ' * 10,
    ]

    for lp in large_punct:
        r1 = inject_pedagogical_punctuation(lp, enabled=True)
        r2 = inject_pedagogical_punctuation(r1, enabled=True)
        r3 = inject_pedagogical_punctuation(r2, enabled=True)
        assert r1 == r2 == r3, f"Idempotency failed for {repr(lp[:20])}: r1={repr(r1[:40])}, r2={repr(r2[:40])}"
        # Synthesis must not raise wave.Error
        for rp in [True, False]:
            wav = tts_engine.synthesize_wav(lp, read_punctuation=rp)
            with wave.open(io.BytesIO(wav), 'rb') as wf:
                assert wf.getnchannels() == 1
                assert wf.getframerate() == 22050
    print("[PASS 3] Large punctuation sequences verified (idempotency + audio synthesis)")

    # -------------------------------------------------------------
    # Test 4: Realistic classroom texts with numbers, times, abbreviations, decimals
    # -------------------------------------------------------------
    classroom_texts = [
        'Lúc 07:15, em đến trường. Điểm số: 10,0 và 9.75!',
        'Nhiệt độ hôm nay là -5°C... Thật lạnh!',
        'Bài 1: Hãy chọn đáp án A, B, C hoặc D.',
        '1/2 quả táo + 3/4 quả cam = 5/4 quả.',
        'HĐND, UBND TP. Hà Nội và TX. Sơn Tây.',
        'GS. TS. Lê Văn B; PGS. ThS. Trần Thị C.',
        "Em nói: 'Dạ, con xin phép!'.",
    ]

    for ct in classroom_texts:
        r1 = inject_pedagogical_punctuation(ct, enabled=True)
        r2 = inject_pedagogical_punctuation(r1, enabled=True)
        assert r1 == r2, f"Classroom text idempotency failed: {repr(ct)}"
        wav = tts_engine.synthesize_wav(ct, read_punctuation=True)
        assert len(wav) > 10000, f"WAV too small for {repr(ct)}: {len(wav)}"
        with wave.open(io.BytesIO(wav), 'rb') as wf:
            assert wf.getnchannels() == 1
            assert wf.getframerate() == 22050
    print("[PASS 4] Realistic classroom texts synthesized with valid audio (>10KB)")

    # -------------------------------------------------------------
    # Test 5: 200-cycle randomized fuzzer
    # -------------------------------------------------------------
    random.seed(42)
    tokens = [
        ',', '.', '?', '!', ':', '...', '....', ' ', '  ', '\t',
        ', phẩy,', ', chấm.', ', chấm hỏi.', ', chấm than.', ', hai chấm,',
        'em', 'cô giáo', 'học sinh', 'chấm bài', 'phẩy đuôi', 'TP. HCM', '12.5', '08:30',
    ]

    for i in range(200):
        length = random.randint(3, 15)
        sample = ''.join(random.choice(tokens) for _ in range(length))
        res1 = inject_pedagogical_punctuation(sample, enabled=True)
        res2 = inject_pedagogical_punctuation(res1, enabled=True)
        assert res1 == res2, f"Fuzzer iteration {i} broke idempotency on {repr(sample)}: res1={repr(res1)} != res2={repr(res2)}"

    print("[PASS 5] 200 random fuzzed iterations verified 100% idempotent!")

    # -------------------------------------------------------------
    # Test 6: Silence buffer verification
    # -------------------------------------------------------------
    silence = tts_engine._generate_silence_wav(duration_sec=0.25, sample_rate=22050)
    assert isinstance(silence, bytes) and len(silence) > 44
    with wave.open(io.BytesIO(silence), 'rb') as wf:
        assert wf.getnchannels() == 1
        assert wf.getsampwidth() == 2
        assert wf.getframerate() == 22050
        n_frames = wf.getnframes()
        assert n_frames == int(22050 * 0.25)
    print(f"[PASS 6] Silence buffer format verified: {len(silence)} bytes, {n_frames} frames (PCM 16-bit Mono 22050Hz)")

    print("=" * 80)
    print("ALL 6 EMPIRICAL CHALLENGER TESTS PASSED (EXIT CODE 0)")
    print("=" * 80)


if __name__ == "__main__":
    run_tests()
