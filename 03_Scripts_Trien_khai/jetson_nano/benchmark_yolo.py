#!/usr/bin/env python3
"""
==============================================================================
ViHand Grade — Benchmark Script: YOLOv8 Word Detector trên NVIDIA Jetson Nano
Đo đạc: Tốc độ xử lý (FPS), Độ trễ (ms/ảnh), Sử dụng VRAM GPU CUDA vs CPU
==============================================================================
"""

import time
import os
import sys
import json
import argparse
from pathlib import Path
import numpy as np
from PIL import Image

try:
    import torch
    from ultralytics import YOLO
except ImportError as e:
    print(f"❌ Thiếu thư viện: {e}")
    print("Hãy chạy trong virtualenv: source ../../python_service/venv/bin/activate")
    sys.exit(1)

SCRIPT_DIR = Path(__file__).parent.resolve()
APP_DIR = SCRIPT_DIR.parent.parent
DEFAULT_WEIGHTS = APP_DIR / "Test_train_29_12" / "ver2" / "runs" / "detect" / "train" / "weights" / "best.pt"


def parse_args():
    parser = argparse.ArgumentParser(description="Benchmark YOLOv8 Word Detector")
    parser.add_argument("--weights", type=str, default=str(DEFAULT_WEIGHTS), help="Đường dẫn file weights best.pt")
    parser.add_argument("--device", type=str, default="auto", choices=["auto", "cuda", "cpu"], help="Thiết bị chạy")
    parser.add_argument("--iterations", type=int, default=20, help="Số lần chạy suy luận")
    parser.add_argument("--imgsz", type=int, default=640, help="Kích thước ảnh đầu vào (640x640)")
    parser.add_argument("--image", type=str, default="", help="Đường dẫn ảnh bài thi thực tế (nếu có)")
    parser.add_argument("--output-json", type=str, default="yolo_benchmark_result.json", help="File xuất kết quả JSON")
    return parser.parse_args()


def main():
    args = parse_args()
    print("=" * 65)
    print("  VIHAND GRADE — BENCHMARK YOLOV8 WORD DETECTOR")
    print("=" * 65)

    if not os.path.exists(args.weights):
        print(f"❌ Không tìm thấy trọng số tại: {args.weights}")
        sys.exit(1)

    # Xác định device
    if args.device == "auto":
        device = "cuda:0" if torch.cuda.is_available() else "cpu"
    else:
        device = "cuda:0" if args.device == "cuda" and torch.cuda.is_available() else "cpu"

    print(f"• Trọng số    : {args.weights}")
    print(f"• Thiết bị    : {device}")
    print(f"• Kích thước  : {args.imgsz}x{args.imgsz}")
    print(f"• Số lần lặp  : {args.iterations}")

    # Chuẩn bị ảnh
    if args.image and os.path.exists(args.image):
        print(f"• Ảnh kiểm thử: {args.image}")
        test_img = Image.open(args.image).convert("RGB")
    else:
        print("• Ảnh kiểm thử: Giả lập ảnh bài viết tay (Random Synthetic 640x640)")
        test_img = Image.fromarray(np.random.randint(180, 255, (args.imgsz, args.imgsz, 3), dtype=np.uint8))

    # 1. Đo thời gian tải model (Cold Start)
    print("\n⏳ [1/3] Đang nạp model YOLOv8 vào bộ nhớ...")
    t_load_start = time.time()
    model = YOLO(args.weights)
    load_time_ms = (time.time() - t_load_start) * 1000
    print(f"  ✔ Thời gian nạp model: {load_time_ms:.1f}ms")

    # 2. Warmup
    print("🔥 [2/3] Chạy Warmup 3 lần...")
    for _ in range(3):
        _ = model(test_img, device=device, imgsz=args.imgsz, verbose=False)

    # 3. Đo đạc chi tiết
    print(f"⚡ [3/3] Tiến hành đo {args.iterations} lần suy luận...")
    latencies = []
    box_counts = []

    if torch.cuda.is_available() and "cuda" in device:
        torch.cuda.reset_peak_memory_stats()

    for i in range(args.iterations):
        if torch.cuda.is_available() and "cuda" in device:
            torch.cuda.synchronize()

        t0 = time.time()
        results = model(test_img, device=device, imgsz=args.imgsz, conf=0.45, iou=0.45, verbose=False)
        
        if torch.cuda.is_available() and "cuda" in device:
            torch.cuda.synchronize()
            
        t_elapsed = (time.time() - t0) * 1000
        latencies.append(t_elapsed)

        boxes = results[0].boxes
        box_counts.append(len(boxes) if boxes is not None else 0)

    # Tính toán chỉ số
    avg_latency = float(np.mean(latencies))
    std_latency = float(np.std(latencies))
    min_latency = float(np.min(latencies))
    max_latency = float(np.max(latencies))
    p95_latency = float(np.percentile(latencies, 95))
    fps = 1000.0 / avg_latency if avg_latency > 0 else 0

    vram_peak_mb = 0.0
    if torch.cuda.is_available() and "cuda" in device:
        vram_peak_mb = float(torch.cuda.max_memory_allocated() / (1024 * 1024))

    print("\n" + "═" * 65)
    print("  KẾT QUẢ BENCHMARK YOLOV8:")
    print("═" * 65)
    print(f"  • Tốc độ khung hình (FPS) : {fps:.2f} frames/s")
    print(f"  • Độ trễ trung bình       : {avg_latency:.2f} ms")
    print(f"  • Độ trễ nhỏ nhất (Min)   : {min_latency:.2f} ms")
    print(f"  • Độ trễ lớn nhất (Max)   : {max_latency:.2f} ms")
    print(f"  • Độ trễ 95th percentile  : {p95_latency:.2f} ms")
    print(f"  • Độ lệch chuẩn (Std)     : ±{std_latency:.2f} ms")
    print(f"  • Trung bình số từ nhận diện : {np.mean(box_counts):.1f} boxes")
    if vram_peak_mb > 0:
        print(f"  • Đỉnh VRAM sử dụng       : {vram_peak_mb:.1f} MB")
    print("═" * 65)

    # Xuất file JSON
    result_data = {
        "engine": "YOLOv8-Nano-Word-Detector",
        "weights": str(args.weights),
        "device": device,
        "imgsz": args.imgsz,
        "iterations": args.iterations,
        "load_time_ms": round(load_time_ms, 2),
        "avg_latency_ms": round(avg_latency, 2),
        "min_latency_ms": round(min_latency, 2),
        "max_latency_ms": round(max_latency, 2),
        "p95_latency_ms": round(p95_latency, 2),
        "std_latency_ms": round(std_latency, 2),
        "fps": round(fps, 2),
        "avg_boxes_detected": round(float(np.mean(box_counts)), 1),
        "vram_peak_mb": round(vram_peak_mb, 2),
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
    }

    out_file = SCRIPT_DIR / args.output_json
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(result_data, f, indent=2, ensure_ascii=False)
    print(f"\n✅ Đã lưu kết quả chi tiết vào: {out_file}\n")


if __name__ == "__main__":
    main()
