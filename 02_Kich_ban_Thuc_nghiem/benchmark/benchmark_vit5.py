"""
===============================================================================
ViHand Grade — Benchmark Script: Đánh giá mô hình sửa lỗi chính tả tiếng Việt
===============================================================================
Mô tả:
    So sánh 3 mô hình T5/ViT5 trên HuggingFace bằng các metric chuẩn nghiên cứu:
      • SacreBLEU  – đo chất lượng sinh văn bản
      • WER        – Word Error Rate
      • CER        – Character Error Rate
      • Exact Match – tỷ lệ câu sửa hoàn toàn trùng khớp Ground Truth

Cách chạy:
    pip install torch transformers==4.44.2 sentencepiece evaluate sacrebleu jiwer tabulate
    python benchmark_vit5.py

Tác giả: ViHand Grade Research — 2026
===============================================================================
"""

import time
import statistics
import json
import os
import sys
from datetime import datetime
from typing import Optional

import torch
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM
import evaluate

# ============================================================
# CẤU HÌNH (Configuration)
# ============================================================

# Danh sách mô hình benchmark
MODELS = [
    {
        "id": "nrl-ai/vn-spell-correction-base",
        "short_name": "NRL-AI SpellCorrection",
        "prefix": "",                    # Một số model cần prefix "correct: " hoặc "sửa lỗi: "
    },
    {
        "id": "hoanghaiduong/vit5-correction",
        "short_name": "HoangHaiDuong ViT5",
        "prefix": "",
    },
    {
        "id": "chamdentimem/ViT5_Vietnamese_Correction",
        "short_name": "ChamDenTimEm ViT5",
        "prefix": "",
    },
]

# Tham số sinh văn bản — Giữ nhất quán với production (python_service/main.py)
# Số mẫu benchmark — 200 đủ chuẩn thống kê, nhanh hơn 1000 mẫu ~5x
BENCHMARK_N = 1000

GENERATION_CONFIG = {
    "max_new_tokens": 128,
    "num_beams": 1,            # Greedy decoding (nhanh nhất, benchmark chuẩn)
    "do_sample": False,
    "early_stopping": False,
    "repetition_penalty": 1.5,
    "no_repeat_ngram_size": 4,
}

# Đường dẫn lưu kết quả
RESULTS_DIR = os.path.join(os.path.dirname(__file__), "benchmark_results")


# ============================================================
# TẢI DỮ LIỆU (Import dataset)
# ============================================================
def load_dataset(n: int = BENCHMARK_N):
    """Import bộ dữ liệu từ file benchmark_dataset.py, lấy n mẫu đầu."""
    sys.path.insert(0, os.path.dirname(__file__))
    from benchmark_dataset import input_texts, reference_texts
    assert len(input_texts) == len(reference_texts), \
        f"Dataset lỗi: input ({len(input_texts)}) ≠ reference ({len(reference_texts)})"
    return input_texts[:n], reference_texts[:n]


# ============================================================
# TẢI MÔ HÌNH
# ============================================================
def load_model(model_id: str, device: str = "cpu"):
    """Tải Tokenizer + Model, trả về (tokenizer, model, load_time_seconds)."""
    print(f"\n{'='*60}")
    print(f"⏳ Đang tải mô hình: {model_id}")
    print(f"{'='*60}")

    t0 = time.perf_counter()

    # use_fast=False: bắt buộc cho SentencePiece tokenizer của ViT5
    tokenizer = AutoTokenizer.from_pretrained(model_id, use_fast=False)
    model = AutoModelForSeq2SeqLM.from_pretrained(model_id)
    model.eval()
    model.to(device)

    load_time = time.perf_counter() - t0
    n_params = sum(p.numel() for p in model.parameters())

    print(f"✅ Tải xong trong {load_time:.1f}s")
    print(f"   Tham số: {n_params / 1e6:.1f}M | Device: {device}")

    return tokenizer, model, load_time, n_params


# ============================================================
# CHẠY INFERENCE
# ============================================================
def run_inference(
    tokenizer,
    model,
    texts: list[str],
    prefix: str = "",
    device: str = "cpu",
    batch_size: int = 16,
) -> tuple[list[str], list[float]]:
    """
    Chạy inference trên danh sách văn bản, trả về (predictions, latencies_ms).
    Mỗi phần tử trong latencies_ms là thời gian xử lý 1 sample (mili-giây).
    """
    predictions: list[str] = []
    latencies: list[float] = []

    total = len(texts)
    for i in range(0, total, batch_size):
        batch = texts[i : i + batch_size]
        # Thêm prefix nếu model yêu cầu
        batch_input = [prefix + t for t in batch] if prefix else batch

        inputs = tokenizer(
            batch_input,
            return_tensors="pt",
            padding=True,
            truncation=True,
            max_length=256,
        ).to(device)

        t0 = time.perf_counter()
        with torch.inference_mode():
            outputs = model.generate(**inputs, **GENERATION_CONFIG)
        elapsed_ms = (time.perf_counter() - t0) * 1000

        # ETA estimate
        done = min(i + batch_size, total)
        batches_done = done / batch_size
        batches_total = total / batch_size
        avg_ms = elapsed_ms  # rough
        eta_s = int(avg_ms / 1000 * (batches_total - batches_done))

        decoded = tokenizer.batch_decode(outputs, skip_special_tokens=True)
        predictions.extend(decoded)

        # Chia đều thời gian batch cho từng sample
        per_sample_ms = elapsed_ms / len(batch)
        latencies.extend([per_sample_ms] * len(batch))

        # Progress
        print(f"   [{done}/{total}] — batch {elapsed_ms:.0f}ms | ETA ~{eta_s}s   ", end="\r")

    print()  # Newline sau progress
    return predictions, latencies


# ============================================================
# TÍNH METRICS
# ============================================================
def compute_metrics(
    predictions: list[str],
    references: list[str],
) -> dict:
    """
    Tính toán các metric chuẩn nghiên cứu:
      - SacreBLEU (corpus-level)
      - WER (Word Error Rate)
      - CER (Character Error Rate)
      - Exact Match (%)
    """
    # ---- SacreBLEU ----
    bleu_metric = evaluate.load("sacrebleu")
    # sacrebleu nhận references dạng list of lists
    bleu_result = bleu_metric.compute(
        predictions=predictions,
        references=[[r] for r in references],
    )

    # ---- WER ----
    wer_metric = evaluate.load("wer")
    wer_score = wer_metric.compute(
        predictions=predictions,
        references=references,
    )

    # ---- CER ----
    cer_metric = evaluate.load("cer")
    cer_score = cer_metric.compute(
        predictions=predictions,
        references=references,
    )

    # ---- Exact Match ----
    exact_matches = sum(
        1 for p, r in zip(predictions, references) if p.strip() == r.strip()
    )
    exact_match_pct = exact_matches / len(references) * 100

    return {
        "sacrebleu": round(bleu_result["score"], 2),
        "wer": round(wer_score * 100, 2),          # tính %
        "cer": round(cer_score * 100, 2),          # tính %
        "exact_match": round(exact_match_pct, 2),
        "exact_match_count": exact_matches,
        "total_samples": len(references),
    }


# ============================================================
# PHÂN TÍCH CHI TIẾT (Per-sample Analysis)
# ============================================================
def print_sample_comparison(
    inputs: list[str],
    references: list[str],
    predictions: list[str],
    latencies: list[float],
    model_name: str,
    n_show: int = 15,
):
    """In ra so sánh chi tiết Input / Reference / Prediction cho n_show mẫu đầu."""
    print(f"\n{'─'*70}")
    print(f"📋 So sánh chi tiết — {model_name} (hiển thị {n_show}/{len(inputs)} mẫu)")
    print(f"{'─'*70}")

    for idx in range(min(n_show, len(inputs))):
        inp = inputs[idx]
        ref = references[idx]
        pred = predictions[idx]
        lat = latencies[idx]

        match_status = "✅ EXACT" if pred.strip() == ref.strip() else "❌ DIFF"

        print(f"\n  [{idx+1:3d}] {match_status}  ({lat:.0f}ms)")
        print(f"   Input     : {inp[:120]}{'…' if len(inp)>120 else ''}")
        print(f"   Reference : {ref[:120]}{'…' if len(ref)>120 else ''}")
        print(f"   Prediction: {pred[:120]}{'…' if len(pred)>120 else ''}")

        # Highlight từ khác biệt giữa Prediction và Reference
        ref_words = ref.split()
        pred_words = pred.split()
        diffs = []
        for j, (rw, pw) in enumerate(zip(ref_words, pred_words)):
            if rw != pw:
                diffs.append(f"'{pw}'→'{rw}'")
        if len(pred_words) != len(ref_words):
            diffs.append(f"(len: pred={len(pred_words)} vs ref={len(ref_words)})")
        if diffs:
            print(f"   Diffs     : {', '.join(diffs[:8])}")


# ============================================================
# PHÂN TÍCH LỖI (Error Analysis)
# ============================================================
def error_analysis(
    inputs: list[str],
    references: list[str],
    predictions: list[str],
) -> dict:
    """
    Phân tích chi tiết các loại lỗi còn sót sau khi mô hình sửa.
      - False Positive (Overcorrection): từ đúng bị sửa thành sai
      - False Negative (Missed):         từ sai không được sửa
      - True Positive  (Correct fix):    từ sai được sửa đúng
    """
    total_errors_in_input = 0
    true_positives = 0
    false_negatives = 0
    false_positives = 0

    for inp, ref, pred in zip(inputs, references, predictions):
        inp_words = inp.split()
        ref_words = ref.split()
        pred_words = pred.split()

        # Đếm lỗi trong input (từ khác nhau giữa input và reference)
        min_len = min(len(inp_words), len(ref_words))
        for j in range(min_len):
            if inp_words[j] != ref_words[j]:
                total_errors_in_input += 1
                # Kiểm tra prediction có sửa đúng không
                if j < len(pred_words) and pred_words[j] == ref_words[j]:
                    true_positives += 1
                else:
                    false_negatives += 1

        # False Positive: từ vốn đúng mà bị sửa sai
        for j in range(min(len(inp_words), len(ref_words), len(pred_words))):
            if inp_words[j] == ref_words[j] and pred_words[j] != ref_words[j]:
                false_positives += 1

    precision = true_positives / (true_positives + false_positives) * 100 if (true_positives + false_positives) > 0 else 0
    recall = true_positives / (true_positives + false_negatives) * 100 if (true_positives + false_negatives) > 0 else 0
    f1 = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0

    return {
        "total_errors_in_input": total_errors_in_input,
        "true_positives": true_positives,
        "false_negatives": false_negatives,
        "false_positives": false_positives,
        "precision": round(precision, 2),
        "recall": round(recall, 2),
        "f1_score": round(f1, 2),
    }


# ============================================================
# IN KẾT QUẢ TỔNG HỢP
# ============================================================
def print_summary_table(all_results: list[dict]):
    """In bảng so sánh tổng hợp tất cả mô hình."""
    try:
        from tabulate import tabulate
        has_tabulate = True
    except ImportError:
        has_tabulate = False

    print(f"\n{'='*90}")
    print(f"📊 BẢNG TỔNG HỢP KẾT QUẢ BENCHMARK")
    print(f"   Thời điểm: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"   Generation Config: {json.dumps(GENERATION_CONFIG, ensure_ascii=False)}")
    print(f"{'='*90}")

    if has_tabulate:
        headers = [
            "Mô hình",
            "SacreBLEU↑", "WER↓(%)", "CER↓(%)", "ExactMatch↑(%)",
            "Precision↑", "Recall↑", "F1↑",
            "Latency\n(ms/sample)", "Load (s)", "Params (M)",
        ]
        rows = []
        for r in all_results:
            rows.append([
                r["model_short"],
                r["metrics"]["sacrebleu"],
                r["metrics"]["wer"],
                r["metrics"]["cer"],
                r["metrics"]["exact_match"],
                r["errors"]["precision"],
                r["errors"]["recall"],
                r["errors"]["f1_score"],
                f"{r['latency_mean']:.0f} ± {r['latency_std']:.0f}",
                f"{r['load_time']:.1f}",
                f"{r['n_params']/1e6:.1f}",
            ])
        print(tabulate(rows, headers=headers, tablefmt="fancy_grid", stralign="center"))
    else:
        # Fallback nếu không có tabulate
        for r in all_results:
            print(f"\n  📌 {r['model_short']}")
            print(f"     SacreBLEU: {r['metrics']['sacrebleu']}")
            print(f"     WER:       {r['metrics']['wer']}%")
            print(f"     CER:       {r['metrics']['cer']}%")
            print(f"     ExactMatch:{r['metrics']['exact_match']}%")
            print(f"     Precision: {r['errors']['precision']}%")
            print(f"     Recall:    {r['errors']['recall']}%")
            print(f"     F1:        {r['errors']['f1_score']}%")
            print(f"     Latency:   {r['latency_mean']:.0f} ± {r['latency_std']:.0f} ms/sample")
            print(f"     Load time: {r['load_time']:.1f}s")
            print(f"     Params:    {r['n_params']/1e6:.1f}M")


# ============================================================
# LƯU KẾT QUẢ RA FILE JSON
# ============================================================
def save_results(all_results: list[dict], inputs, references):
    """Lưu toàn bộ kết quả ra file JSON để phân tích sau."""
    os.makedirs(RESULTS_DIR, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filepath = os.path.join(RESULTS_DIR, f"benchmark_{timestamp}.json")

    output = {
        "timestamp": timestamp,
        "generation_config": GENERATION_CONFIG,
        "dataset_size": len(inputs),
        "models": [],
    }

    for r in all_results:
        model_data = {
            "model_id": r["model_id"],
            "model_short": r["model_short"],
            "n_params": r["n_params"],
            "load_time_s": round(r["load_time"], 2),
            "metrics": r["metrics"],
            "error_analysis": r["errors"],
            "latency_ms": {
                "mean": round(r["latency_mean"], 1),
                "std": round(r["latency_std"], 1),
                "median": round(r["latency_median"], 1),
                "p95": round(r["latency_p95"], 1),
            },
            # Lưu 20 mẫu đầu cho phân tích
            "sample_predictions": [
                {
                    "input": inputs[i],
                    "reference": references[i],
                    "prediction": r["predictions"][i],
                }
                for i in range(min(20, len(inputs)))
            ],
        }
        output["models"].append(model_data)

    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print(f"\n💾 Kết quả đã lưu: {filepath}")
    return filepath


# ============================================================
# MAIN — Chạy Benchmark
# ============================================================
def main():
    print("╔══════════════════════════════════════════════════════════════╗")
    print("║  ViHand Grade — Benchmark Mô Hình Sửa Lỗi Chính Tả VN    ║")
    print("║  3 Models × SacreBLEU / WER / CER / ExactMatch / F1       ║")
    print("╚══════════════════════════════════════════════════════════════╝")

    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"\n🖥️  Device: {device} | PyTorch: {torch.__version__}")

    # ---- Tải Dataset ----
    input_texts, reference_texts = load_dataset()
    print(f"📂 Dataset: {len(input_texts)} mẫu")

    all_results: list[dict] = []

    # ---- Benchmark từng mô hình ----
    for model_cfg in MODELS:
        model_id = model_cfg["id"]
        short_name = model_cfg["short_name"]
        prefix = model_cfg["prefix"]

        # 1. Tải model
        try:
            tokenizer, model, load_time, n_params = load_model(model_id, device)
        except Exception as e:
            print(f"❌ Không tải được {model_id}: {e}")
            continue

        # 2. Chạy inference
        print(f"   ⏳ Đang chạy inference trên {len(input_texts)} mẫu...")
        predictions, latencies = run_inference(
            tokenizer, model, input_texts,
            prefix=prefix, device=device, batch_size=8,
        )

        # 3. Tính metrics
        metrics = compute_metrics(predictions, reference_texts)
        errors = error_analysis(input_texts, reference_texts, predictions)

        # 4. Thống kê latency
        latency_mean = statistics.mean(latencies)
        latency_std = statistics.stdev(latencies) if len(latencies) > 1 else 0
        latency_median = statistics.median(latencies)
        sorted_lat = sorted(latencies)
        latency_p95 = sorted_lat[int(len(sorted_lat) * 0.95)] if latencies else 0

        # 5. In so sánh chi tiết
        print_sample_comparison(
            input_texts, reference_texts, predictions, latencies,
            model_name=short_name, n_show=15,
        )

        # 6. In tóm tắt nhanh
        print(f"\n  📊 {short_name}:")
        print(f"     BLEU={metrics['sacrebleu']} | WER={metrics['wer']}% | CER={metrics['cer']}%")
        print(f"     ExactMatch={metrics['exact_match']}% ({metrics['exact_match_count']}/{metrics['total_samples']})")
        print(f"     Precision={errors['precision']}% | Recall={errors['recall']}% | F1={errors['f1_score']}%")
        print(f"     Latency: mean={latency_mean:.0f}ms | p95={latency_p95:.0f}ms")

        all_results.append({
            "model_id": model_id,
            "model_short": short_name,
            "n_params": n_params,
            "load_time": load_time,
            "metrics": metrics,
            "errors": errors,
            "predictions": predictions,
            "latencies": latencies,
            "latency_mean": latency_mean,
            "latency_std": latency_std,
            "latency_median": latency_median,
            "latency_p95": latency_p95,
        })

        # Giải phóng VRAM/RAM
        del model, tokenizer
        if device == "cuda":
            torch.cuda.empty_cache()

    # ---- Bảng tổng hợp ----
    if all_results:
        print_summary_table(all_results)
        save_results(all_results, input_texts, reference_texts)

    print(f"\n🏁 Benchmark hoàn tất!")


if __name__ == "__main__":
    main()
