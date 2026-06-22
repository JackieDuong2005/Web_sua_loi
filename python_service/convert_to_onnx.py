"""
convert_to_onnx.py
==================
Script chuyển đổi mô hình ViT5 PyTorch → ONNX → Quantize INT8

Chạy MỘT LẦN DUY NHẤT trước khi khởi động server:
    python convert_to_onnx.py

Kết quả:
    - ./vit5_onnx/          : Model ONNX gốc (encoder + decoder)
    - ./vit5_onnx_quantized/ : Model ONNX đã nén INT8 (dùng để inference)

Hiệu quả dự kiến:
    - Kích thước model: giảm ~50%
    - Tốc độ inference CPU: nhanh hơn ~30-50%
    - Độ chính xác: gần như không thay đổi (dynamic quantization)
"""

import os
import sys
import shutil
import platform
import logging
from pathlib import Path

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(message)s")
logger = logging.getLogger(__name__)

MODEL_NAME      = "chamdentimem/ViT5_Vietnamese_Correction"
ONNX_DIR        = Path(__file__).parent / "vit5_onnx"
QUANTIZED_DIR   = Path(__file__).parent / "vit5_onnx_quantized"


def check_dependencies():
    try:
        import optimum
        import onnxruntime
        logger.info(f"✅ optimum {optimum.__version__}, onnxruntime {onnxruntime.__version__}")
    except ImportError as e:
        logger.error(f"❌ Thiếu thư viện: {e}")
        logger.error("Chạy: pip install 'optimum[onnxruntime]>=1.18.0' onnxruntime")
        sys.exit(1)


def export_to_onnx():
    """Bước 1: Xuất mô hình PyTorch → ONNX"""
    if ONNX_DIR.exists() and any(ONNX_DIR.iterdir()):
        logger.info(f"📂 ONNX model đã tồn tại tại {ONNX_DIR}, bỏ qua bước export.")
        return

    logger.info(f"📥 Đang tải model từ HuggingFace: {MODEL_NAME}")
    logger.info("⏳ Quá trình này có thể mất 5-10 phút tùy tốc độ mạng...")

    from optimum.onnxruntime import ORTModelForSeq2SeqLM
    from transformers import AutoTokenizer

    model = ORTModelForSeq2SeqLM.from_pretrained(
        MODEL_NAME,
        export=True,
        trust_remote_code=False,
    )
    tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME, use_fast=False)

    ONNX_DIR.mkdir(parents=True, exist_ok=True)
    model.save_pretrained(str(ONNX_DIR))
    tokenizer.save_pretrained(str(ONNX_DIR))

    logger.info(f"✅ Đã xuất ONNX model → {ONNX_DIR}")


def quantize_int8():
    """Bước 2: Quantize INT8 dynamic → giảm kích thước và tăng tốc CPU"""
    if QUANTIZED_DIR.exists() and any(QUANTIZED_DIR.iterdir()):
        logger.info(f"📂 Quantized model đã tồn tại tại {QUANTIZED_DIR}, bỏ qua.")
        return

    logger.info("🔧 Đang áp dụng Dynamic INT8 Quantization...")

    from optimum.onnxruntime import ORTQuantizer
    from optimum.onnxruntime.configuration import AutoQuantizationConfig

    QUANTIZED_DIR.mkdir(parents=True, exist_ok=True)

    # Phát hiện kiến trúc CPU để chọn config tối ưu
    machine = platform.machine().lower()
    if machine in ("arm64", "aarch64"):
        # Raspberry Pi 4 (ARM64)
        logger.info("🍓 Phát hiện ARM64 (Raspberry Pi) - dùng ARM64 config")
        qconfig = AutoQuantizationConfig.arm64(is_static=False, per_channel=False)
    else:
        # Windows/Linux x86-64
        logger.info("🖥️  Phát hiện x86-64 - dùng AVX2 config")
        try:
            qconfig = AutoQuantizationConfig.avx2(is_static=False, per_channel=False)
        except Exception:
            from optimum.onnxruntime.configuration import QuantizationConfig
            from onnxruntime.quantization import QuantType
            qconfig = QuantizationConfig(
                is_static=False,
                format="QOperator",
                per_channel=False,
                operators_to_quantize=["MatMul", "Add"],
            )

    # Quantize từng file ONNX
    onnx_files = list(ONNX_DIR.glob("*.onnx"))
    if not onnx_files:
        logger.error("❌ Không tìm thấy file .onnx trong thư mục ONNX!")
        sys.exit(1)

    for onnx_file in onnx_files:
        logger.info(f"   Quantizing {onnx_file.name}...")
        try:
            quantizer = ORTQuantizer.from_pretrained(
                str(ONNX_DIR),
                file_name=onnx_file.name
            )
            quantizer.quantize(
                save_dir=str(QUANTIZED_DIR),
                quantization_config=qconfig,
            )
            logger.info(f"   ✅ {onnx_file.name} → quantized")
        except Exception as e:
            logger.warning(f"   ⚠️  Không thể quantize {onnx_file.name}: {e}")
            # Copy file gốc nếu quantize thất bại
            shutil.copy(onnx_file, QUANTIZED_DIR / onnx_file.name)

    # Copy các file config cần thiết
    config_files = [
        "config.json", "generation_config.json",
        "tokenizer_config.json", "special_tokens_map.json",
        "spiece.model", "tokenizer.json",
    ]
    for fname in config_files:
        src = ONNX_DIR / fname
        if src.exists():
            shutil.copy(src, QUANTIZED_DIR / fname)

    logger.info(f"✅ Quantized model lưu tại: {QUANTIZED_DIR}")


def print_size_comparison():
    """So sánh kích thước trước và sau"""
    def dir_size_mb(path: Path) -> float:
        return sum(f.stat().st_size for f in path.rglob("*") if f.is_file()) / 1_048_576

    if ONNX_DIR.exists():
        logger.info(f"📊 ONNX gốc:       {dir_size_mb(ONNX_DIR):.1f} MB")
    if QUANTIZED_DIR.exists():
        logger.info(f"📊 ONNX quantized: {dir_size_mb(QUANTIZED_DIR):.1f} MB")
    if ONNX_DIR.exists() and QUANTIZED_DIR.exists():
        ratio = dir_size_mb(QUANTIZED_DIR) / dir_size_mb(ONNX_DIR) * 100
        logger.info(f"💾 Tiết kiệm: {100 - ratio:.1f}% dung lượng")


def benchmark():
    """Kiểm tra tốc độ sau khi quantize"""
    import time
    logger.info("\n🏎️  Đang benchmark tốc độ inference...")

    test_text = "em thức zậy từ rấc sớm dể đi hco, học sinh chăm chỉ rấc là đáng khen."

    try:
        from optimum.onnxruntime import ORTModelForSeq2SeqLM
        from transformers import AutoTokenizer

        tokenizer = AutoTokenizer.from_pretrained(str(QUANTIZED_DIR), use_fast=False)
        model = ORTModelForSeq2SeqLM.from_pretrained(str(QUANTIZED_DIR))

        # Warm-up
        inputs = tokenizer([test_text], return_tensors="pt", padding=True, truncation=True, max_length=256)
        _ = model.generate(**inputs, max_length=128, num_beams=3, early_stopping=True)

        # Benchmark 3 lần
        times = []
        for i in range(3):
            t0 = time.time()
            outputs = model.generate(**inputs, max_length=128, num_beams=3, early_stopping=True)
            times.append((time.time() - t0) * 1000)

        result = tokenizer.batch_decode(outputs, skip_special_tokens=True)
        avg_ms = sum(times) / len(times)

        logger.info(f"   Input:  {test_text}")
        logger.info(f"   Output: {result[0]}")
        logger.info(f"   ⏱️  Trung bình: {avg_ms:.0f}ms / inference")
    except Exception as e:
        logger.warning(f"   ⚠️  Benchmark thất bại: {e}")


if __name__ == "__main__":
    logger.info("=" * 60)
    logger.info("  ViT5 ONNX Conversion + INT8 Quantization")
    logger.info("=" * 60)

    check_dependencies()

    # Bước 1: Export sang ONNX
    export_to_onnx()

    # Bước 2: Quantize INT8
    quantize_int8()

    # Báo cáo
    print_size_comparison()

    # Benchmark
    benchmark()

    logger.info("\n✅ Hoàn tất! Khởi động lại server để dùng model ONNX:")
    logger.info("   python main.py")
