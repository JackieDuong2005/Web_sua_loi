"""
Empirical Adversarial Test Suite for Milestone 1:
Expressive Piper VITS Engine & Spoken Punctuation (python_service/tts_engine.py)
"""

import io
import os
import sys
import time
import wave
import gc
import tracemalloc
import threading
from typing import Dict, Any, List
import numpy as np

# Force UTF-8 on Windows console
if sys.platform.startswith("win"):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

# Ensure project root is in sys.path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from python_service.tts_engine import (
    tts_engine,
    PROSODY_STYLE_PRESETS,
    inject_pedagogical_punctuation,
    normalize_vietnamese_text,
)


def analyze_wav_bytes(wav_bytes: bytes) -> Dict[str, Any]:
    """Parse WAV byte stream and compute acoustic metrics."""
    with wave.open(io.BytesIO(wav_bytes), "rb") as wf:
        n_channels = wf.getnchannels()
        sampwidth = wf.getsampwidth()
        framerate = wf.getframerate()
        n_frames = wf.getnframes()
        frames = wf.readframes(n_frames)

    # Convert PCM16 to numpy array
    dtype = np.int16 if sampwidth == 2 else np.int8
    samples = np.frombuffer(frames, dtype=dtype).astype(np.float32)

    duration_sec = n_frames / float(framerate)
    rms_energy = float(np.sqrt(np.mean(samples ** 2))) if len(samples) > 0 else 0.0
    peak_amp = float(np.max(np.abs(samples))) if len(samples) > 0 else 0.0

    return {
        "byte_len": len(wav_bytes),
        "channels": n_channels,
        "sampwidth": sampwidth,
        "framerate": framerate,
        "n_frames": n_frames,
        "duration_sec": round(duration_sec, 3),
        "rms_energy": round(rms_energy, 2),
        "peak_amp": round(peak_amp, 2),
        "sample_count": len(samples),
    }


def test_parameter_boundaries():
    print("\n--- 1. PARAMETER BOUNDARY TESTS ---")
    test_phrase = "Bé tập viết chính tả thật nắn nót."

    # Test 1a: extreme noise_scale
    for ns in [0.0, 0.3, 0.667, 1.0, 2.0]:
        resolved = tts_engine.resolve_prosody_params("standard", noise_scale=ns)
        assert resolved["noise_scale"] == ns, f"Failed resolved noise_scale: {resolved}"
        audio = tts_engine.synthesize_wav(test_phrase, noise_scale=ns)
        metrics = analyze_wav_bytes(audio)
        assert metrics["byte_len"] > 10000, f"Audio too small for noise_scale={ns}"
        print(f"  [PASS] noise_scale={ns:<4} -> bytes={metrics['byte_len']}, duration={metrics['duration_sec']}s, RMS={metrics['rms_energy']}")

    # Test 1b: extreme noise_w
    for nw in [0.0, 0.5, 0.8, 1.0]:
        resolved = tts_engine.resolve_prosody_params("standard", noise_w=nw)
        assert resolved["noise_w_scale"] == nw, f"Failed resolved noise_w: {resolved}"
        audio = tts_engine.synthesize_wav(test_phrase, noise_w=nw)
        metrics = analyze_wav_bytes(audio)
        assert metrics["byte_len"] > 10000, f"Audio too small for noise_w={nw}"
        print(f"  [PASS] noise_w={nw:<4}     -> bytes={metrics['byte_len']}, duration={metrics['duration_sec']}s, RMS={metrics['rms_energy']}")

    # Test 1c: extreme rates ("-50%", "+100%", "0%", "-200%", "+200%", invalid)
    rates = ["-50%", "+100%", "0%", "-200%", "+200%", "invalid", None]
    for r in rates:
        resolved = tts_engine.resolve_prosody_params("standard", rate=r)
        ls = resolved["length_scale"]
        assert 0.5 <= ls <= 3.0, f"length_scale out of safe bounds [0.5, 3.0]: {ls} for rate={r}"
        audio = tts_engine.synthesize_wav(test_phrase, rate=r)
        metrics = analyze_wav_bytes(audio)
        assert metrics["byte_len"] > 5000, f"Audio too small for rate={r}"
        print(f"  [PASS] rate={str(r):<10} -> length_scale={ls:<5} bytes={metrics['byte_len']}, duration={metrics['duration_sec']}s")

    # Test 1d: invalid type robustness
    resolved = tts_engine.resolve_prosody_params("standard", noise_scale="invalid_str", noise_w="bad_str")
    assert resolved["noise_scale"] == PROSODY_STYLE_PRESETS["standard"]["noise_scale"]
    assert resolved["noise_w_scale"] == PROSODY_STYLE_PRESETS["standard"]["noise_w_scale"]
    print(f"  [PASS] non-numeric noise_scale/noise_w gracefully falls back to preset values.")


def test_style_fallback():
    print("\n--- 2. STYLE FALLBACK & SANITIZATION TESTS ---")
    test_phrase = "Mùa thu Hà Nội đẹp dịu dàng."

    # Unknown style
    res_unknown = tts_engine.resolve_prosody_params("unknown_style")
    assert res_unknown["noise_scale"] == PROSODY_STYLE_PRESETS["standard"]["noise_scale"]
    assert res_unknown["noise_w_scale"] == PROSODY_STYLE_PRESETS["standard"]["noise_w_scale"]
    wav_unknown = tts_engine.synthesize_wav(test_phrase, style="unknown_style")
    m_unknown = analyze_wav_bytes(wav_unknown)
    assert m_unknown["byte_len"] > 10000
    print(f"  [PASS] style='unknown_style' -> fallback to standard (bytes={m_unknown['byte_len']})")

    # Empty string style
    res_empty = tts_engine.resolve_prosody_params("")
    assert res_empty["noise_scale"] == PROSODY_STYLE_PRESETS["standard"]["noise_scale"]
    print(f"  [PASS] style='' -> fallback to standard")

    # None style
    res_none = tts_engine.resolve_prosody_params(None)
    assert res_none["noise_scale"] == PROSODY_STYLE_PRESETS["standard"]["noise_scale"]
    print(f"  [PASS] style=None -> fallback to standard")

    # Uppercase and spaced style
    res_upper = tts_engine.resolve_prosody_params("  WARM_STORY  ")
    assert res_upper["noise_scale"] == PROSODY_STYLE_PRESETS["warm_story"]["noise_scale"]
    print(f"  [PASS] style='  WARM_STORY  ' -> normalized and matches warm_story")


def test_audio_diversity():
    print("\n--- 3. ACOUSTIC DIVERSITY ACROSS 4 PRESETS ---")
    test_phrase = "Trời thu xanh biếc, những chú chim hót líu lo trên cành cây."

    styles = ["warm_story", "standard", "emphasis", "question"]
    metrics_by_style = {}
    raw_samples_by_style = {}

    for st in styles:
        wav_data = tts_engine.synthesize_wav(test_phrase, style=st)
        met = analyze_wav_bytes(wav_data)
        metrics_by_style[st] = met
        with wave.open(io.BytesIO(wav_data), "rb") as wf:
            raw_samples_by_style[st] = wf.readframes(wf.getnframes())
        print(f"  Style '{st:<10}': bytes={met['byte_len']}, duration={met['duration_sec']}s, RMS={met['rms_energy']}, Peak={met['peak_amp']}")

    # 1. Byte length diversity
    byte_lens = [met["byte_len"] for met in metrics_by_style.values()]
    assert len(set(byte_lens)) == 4, f"All 4 styles must have distinct byte lengths! Got: {byte_lens}"

    # 2. Raw waveform byte diversity
    raw_hashes = [hash(raw) for raw in raw_samples_by_style.values()]
    assert len(set(raw_hashes)) == 4, f"All 4 styles must have distinct raw waveforms! Got: {raw_hashes}"

    # 3. RMS diversity
    rms_vals = [met["rms_energy"] for met in metrics_by_style.values()]
    assert len(set(rms_vals)) == 4, f"All 4 styles must have distinct RMS energy! Got: {rms_vals}"

    # 4. Verify emphasis has markedly longer duration than standard (length_multiplier 1.20 vs 1.00)
    assert metrics_by_style["emphasis"]["duration_sec"] > metrics_by_style["standard"]["duration_sec"], (
        f"Emphasis ({metrics_by_style['emphasis']['duration_sec']}s) should be longer than "
        f"standard ({metrics_by_style['standard']['duration_sec']}s)"
    )

    print("  [PASS] Acoustic diversity across all 4 presets is statistically and physically confirmed!")


def test_pedagogical_punctuation():
    print("\n--- 4. PEDAGOGICAL PUNCTUATION STRESS TESTS ---")

    # Standard cues
    base = "Em học bài, chăm chỉ. Em hiểu bài chưa? Rất tuyệt! Bài 1: Chính tả"
    expected = (
        "Em học bài, phẩy, chăm chỉ, chấm. Em hiểu bài chưa, chấm hỏi. "
        "Rất tuyệt, chấm than. Bài một, hai chấm, Chính tả"
    )
    # Text normalizer changes "Bài 1" -> "Bài một"
    norm = normalize_vietnamese_text(base)
    injected = inject_pedagogical_punctuation(norm, enabled=True)
    print(f"  Injected: {injected}")
    assert ", phẩy," in injected
    assert ", chấm." in injected
    assert ", chấm hỏi." in injected
    assert ", chấm than." in injected
    assert ", hai chấm," in injected

    # Idempotence: f(f(x)) == f(x)
    injected_twice = inject_pedagogical_punctuation(injected, enabled=True)
    assert injected == injected_twice, f"Idempotence failed!\nOnce: {injected}\nTwice: {injected_twice}"
    print("  [PASS] Idempotence f(f(x)) == f(x) verified.")

    # Numerical & format protection: decimals, times, ellipsis, abbreviations
    edge_text = "Điểm 9.5 hoặc 8,5 lúc 08:30 sáng... Học tại TP.HCM rất vui!"
    res_edge = inject_pedagogical_punctuation(edge_text, enabled=True)
    print(f"  Edge format result: {res_edge}")
    assert "9.5" in res_edge
    assert "8,5" in res_edge
    assert "08:30" in res_edge
    assert "..." in res_edge
    assert "TP.HCM" in res_edge
    print("  [PASS] Decimal, time, ellipsis, and abbreviation protection verified.")

    # Duplicate punctuation collapsing
    dup_text = "Thật sao??? Tuyệt vời!!!"
    dup_res = inject_pedagogical_punctuation(dup_text, enabled=True)
    assert dup_res.count("chấm hỏi") == 1
    assert dup_res.count("chấm than") == 1
    print("  [PASS] Repeated punctuation collapsed cleanly.")

    # Multiline preservation
    multi_poem = "Hạt gạo làng ta\nCó vị phù sa,\nCó hương sen thơm."
    multi_res = inject_pedagogical_punctuation(multi_poem, enabled=True)
    assert "\n" in multi_res
    assert len(multi_res.split("\n")) == 3
    print("  [PASS] Multiline poem formatting preserved.")


def test_concurrency_and_memory_leak():
    print("\n--- 5. CONCURRENCY & MEMORY LEAK CHECK ---")
    tracemalloc.start()
    gc.collect()

    initial_mem, _ = tracemalloc.get_traced_memory()
    print(f"  Initial traced memory: {initial_mem / 1024:.1f} KB")

    # Successive generation (5 runs)
    durations = []
    phrase = "Tiếng suối trong như tiếng hát xa, trăng lồng cổ thụ bóng lồng hoa."
    for i in range(5):
        t0 = time.time()
        audio = tts_engine.synthesize_wav(phrase, style="warm_story", read_punctuation=True)
        durations.append(time.time() - t0)
        assert len(audio) > 10000
        cur_mem, peak_mem = tracemalloc.get_traced_memory()
        print(f"  Run {i+1}: generated {len(audio)} bytes in {durations[-1]:.3f}s | Current mem: {cur_mem / 1024:.1f} KB, Peak: {peak_mem / 1024:.1f} KB")

    gc.collect()
    final_mem, peak_mem = tracemalloc.get_traced_memory()
    tracemalloc.stop()

    mem_growth_kb = (final_mem - initial_mem) / 1024
    print(f"  Memory net growth after 5 runs: {mem_growth_kb:.1f} KB (Peak: {peak_mem / 1024:.1f} KB)")
    # Memory growth should not exceed 5MB
    assert mem_growth_kb < 5120, f"Potential memory leak! Memory grew by {mem_growth_kb} KB"
    print("  [PASS] No memory leak detected across successive audio generations.")

    # Concurrency test: 3 simultaneous synthesis threads
    print("  Testing 3 concurrent synthesis threads...")
    results = [None, None, None]
    errors = []

    def worker(idx):
        try:
            p = f"Luồng xử lý thứ {idx}: Chăm chỉ học tập, rèn luyện thân thể."
            res = tts_engine.synthesize_wav(p, style="standard")
            results[idx] = res
        except Exception as e:
            errors.append((idx, str(e)))

    threads = [threading.Thread(target=worker, args=(i,)) for i in range(3)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()

    assert len(errors) == 0, f"Concurrent thread errors: {errors}"
    for i, r in enumerate(results):
        assert r is not None and len(r) > 10000, f"Thread {i} generated invalid audio"
    print(f"  [PASS] Concurrent thread execution verified: all 3 threads synthesized valid audio without collision.")


if __name__ == "__main__":
    print("===============================================================")
    print("STARTING ADVERSARIAL STRESS TEST SUITE FOR MILESTONE 1 (TTS)")
    print("===============================================================")
    t_start = time.time()
    try:
        test_parameter_boundaries()
        test_style_fallback()
        test_audio_diversity()
        test_pedagogical_punctuation()
        test_concurrency_and_memory_leak()
        print("\n===============================================================")
        print(f"✅ ALL ADVERSARIAL STRESS TESTS PASSED IN {time.time() - t_start:.2f}s!")
        print("VERDICT: APPROVE")
        print("===============================================================")
    except Exception as e:
        print(f"\n❌ ADVERSARIAL TEST FAILED: {e}")
        import traceback
        traceback.print_exc()
        print("VERDICT: REJECT")
        sys.exit(1)
