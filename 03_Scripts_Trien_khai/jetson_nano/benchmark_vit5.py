#!/usr/bin/env python3
"""
==============================================================================
ViHand Grade — Benchmark Script: ViT5 Spell Correction trên NVIDIA Jetson Nano
Đo đạc: Độ trễ (ms) và Throughput (tokens/s) theo các độ dài câu (10, 25, 50, 100 từ)
So sánh giữa chế độ CPU Dynamic INT8 Quantization và GPU CUDA FP16
==============================================================================
"""

import time
import os
import sys
import json
import argparse
from pathlib import Path
import numpy as np

try:
    import torch
    from transformers import AutoTokenizer, AutoModelForSeq2SeqLM
except ImportError as e:
    print(f"❌ Thiếu thư viện: {e}")
    print("Hãy chạy trong virtualenv: source ../../python_service/venv/bin/activate")
    sys.exit(1)

SCRIPT_DIR = Path(__file__).parent.resolve()
MODEL_ID = "chamdentimem/ViT5_Vietnamese_Correction"

# Bộ ngữ liệu kiểm thử mẫu chuẩn tiếng Việt theo các độ dài từ
TEST_CORPUS = {
    "10_words": "Em bé chăm chỉ họk tập vâng lời cha mẹ ngoan.",
    "25_words": "Buổi sáng mùa thu trên con đường làng thân wen, những tia nắng vàng rực rỡ chiếu xuyến qua từng kẽ lá cây bàng tỏa bóng râm mát dịu dàng.",
    "50_words": "Mùa gặt lúa chín quê em rộn rã tiếng cừoi nói của các bác nông dân. Cánh đồng trải dài mênh mông như dải lụa vàng óng ả, thoang thoảng hương thơm ngòn ngọt mộc mạc của bông lúa non. Chúng em tíu tít cùng nhau đến chường trong niềm hân hoan rạng rỡ của ngày mới.",
    "100_words": "Mỗi ngày đến trường là một ngày vui của tuổi thơ chúng em. Ngôi trường tiểu học thân thương nằm nép mình bên hàng cây xanh mát, rộn rã tiếng chim ca líu no mỗi sớm mai. Trong lớp học, cô giáo ân cần rảng bài với giọng nói ấm áp truyền cảm, chỉ dạy từng nét chữ nết người cho đàn em thơ dại. Giờ ra chơi, sân trường bừng sáng bởi những tiếng cười đùa trong trẻo, các bạn cùng nhau chia sẻ những câu chiện vui và giúp đỡ nhau trong học tập. Tình bạn học trò trong sáng như giọt sương mai đọng trên cánh hoa ban ban sớm rạng ngời."
}


def parse_args():
    parser = argparse.ArgumentParser(description="Benchmark ViT5 Spell Correction")
    parser.add_argument("--model-id", type=str, default=MODEL_ID, help="Tên model HuggingFace")
    parser.add_argument("--iterations", type=int, default=5, help="Số lần lặp lại cho mỗi độ dài câu")
    parser.add_argument("--output-json", type=str, default="vit5_benchmark_result.json", help="File xuất kết quả JSON")
    return parser.parse_args()


def benchmark_engine(model, tokenizer, device, mode_name, iterations):
    print(f"\n🧪 Đang kiểm thử cấu hình: {mode_name} (Thiết bị: {device})...")
    results_by_length = {}

    for length_key, sample_text in TEST_CORPUS.items():
        word_count = len(sample_text.split())
        inputs = tokenizer(sample_text, return_tensors="pt")
        inputs = {k: v.to(device) for k, v in inputs.items()}
        input_token_count = inputs["input_ids"].shape[1]

        # Warmup
        with torch.no_grad():
            _ = model.generate(**inputs, max_new_tokens=input_token_count + 16)

        latencies = []
        out_tokens_list = []

        for _ in range(iterations):
            if "cuda" in str(device) and torch.cuda.is_available():
                torch.cuda.synchronize()

            t0 = time.time()
            with torch.no_grad():
                out = model.generate(**inputs, max_new_tokens=input_token_count + 16)

            if "cuda" in str(device) and torch.cuda.is_available():
                torch.cuda.synchronize()

            elapsed = (time.time() - t0) * 1000
            latencies.append(elapsed)
            out_tokens_list.append(out.shape[1])

        avg_lat = float(np.mean(latencies))
        avg_tokens = float(np.mean(out_tokens_list))
        throughput = (avg_tokens / (avg_lat / 1000.0)) if avg_lat > 0 else 0

        corrected_text = tokenizer.decode(out[0], skip_special_tokens=True)

        results_by_length[length_key] = {
            "word_count": word_count,
            "input_tokens": input_token_count,
            "output_tokens": avg_tokens,
            "avg_latency_ms": round(avg_lat, 2),
            "std_latency_ms": round(float(np.std(latencies)), 2),
            "throughput_tokens_per_sec": round(throughput, 2),
            "sample_input": sample_text[:60] + "...",
            "sample_output": corrected_text[:60] + "..."
        }
        print(f"  • {length_key} ({word_count} từ): {avg_lat:.1f}ms (Throughput: {throughput:.1f} tok/s)")

    return results_by_length


def main():
    args = parse_args()
    print("=" * 65)
    print("  VIHAND GRADE — BENCHMARK VIT5 SPELL CORRECTION")
    print("=" * 65)
    print(f"• Model HuggingFace: {args.model_id}")
    print(f"• Số lần lặp lại   : {args.iterations}")

    t_load = time.time()
    print("\n⏳ Đang nạp model ViT5...")
    tokenizer = AutoTokenizer.from_pretrained(args.model_id, use_fast=False)
    base_model = AutoModelForSeq2SeqLM.from_pretrained(args.model_id)
    base_model.eval()
    print(f"✔ Nạp model hoàn tất trong {(time.time() - t_load):.1f}s")

    all_results = {
        "model_id": args.model_id,
        "iterations": args.iterations,
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
        "modes": {}
    }

    # 1. Benchmark CPU Dynamic INT8
    print("\n🔧 Chuẩn bị mô hình CPU Dynamic INT8 Quantized...")
    int8_model = torch.quantization.quantize_dynamic(base_model, {torch.nn.Linear}, dtype=torch.qint8)
    cpu_res = benchmark_engine(int8_model, tokenizer, "cpu", "CPU Dynamic INT8 Quantization", args.iterations)
    all_results["modes"]["cpu_int8"] = cpu_res

    # 2. Benchmark GPU CUDA FP16 (nếu có CUDA)
    if torch.cuda.is_available():
        print("\n🚀 Chuẩn bị mô hình GPU CUDA FP16 (NVIDIA Maxwell)...")
        cuda_model = base_model.to("cuda").half()
        cuda_res = benchmark_engine(cuda_model, tokenizer, "cuda:0", "GPU CUDA FP16", args.iterations)
        all_results["modes"]["gpu_cuda_fp16"] = cuda_res
    else:
        print("\nℹ️ Không phát hiện GPU CUDA, bỏ qua nhánh GPU.")

    # Bảng tổng kết
    print("\n" + "═" * 70)
    print(f"{'Độ dài':<12} | {'CPU INT8 (ms)':<16} | {'CUDA FP16 (ms)':<16} | {'Tăng tốc':<10}")
    print("─" * 70)
    for length_key in TEST_CORPUS.keys():
        cpu_lat = all_results["modes"]["cpu_int8"][length_key]["avg_latency_ms"]
        if "gpu_cuda_fp16" in all_results["modes"]:
            gpu_lat = all_results["modes"]["gpu_cuda_fp16"][length_key]["avg_latency_ms"]
            speedup = f"{cpu_lat / gpu_lat:.2f}x" if gpu_lat > 0 else "N/A"
            gpu_str = f"{gpu_lat:.1f}"
        else:
            gpu_str = "N/A"
            speedup = "N/A"
        print(f"{length_key:<12} | {cpu_lat:<16.1f} | {gpu_str:<16} | {speedup:<10}")
    print("═" * 70)

    out_file = SCRIPT_DIR / args.output_json
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(all_results, f, indent=2, ensure_ascii=False)
    print(f"\n✅ Đã lưu kết quả ViT5 Benchmark vào: {out_file}\n")


if __name__ == "__main__":
    main()
