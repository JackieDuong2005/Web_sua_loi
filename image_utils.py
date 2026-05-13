"""
image_utils.py — Module tiền xử lý ảnh cho OCR chữ viết tay học sinh tiểu học.

Tối ưu cho:
  • Giấy ô ly (dòng kẻ xanh/đỏ)
  • Chữ viết tay trẻ em (nét không đều, bút chì nhạt)
  • Ảnh chụp điện thoại (ánh sáng lệch, bóng tay, rung, lệch góc)
  • Tiếng Việt có dấu (giữ nguyên dấu thanh & nét mảnh)

Chỉ dùng: OpenCV + NumPy (+ pilow cho EXIF).
"""

from __future__ import annotations

import logging
import math
import os
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple

import cv2
import numpy as np

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# 1. CONFIG
# ---------------------------------------------------------------------------

@dataclass
class PreprocessConfig:
    """Cấu hình pipeline tiền xử lý. Mọi bước có thể bật/tắt."""

    # --- Resize ---
    resize_max_width: int = 1600

    # --- CLAHE ---
    enable_clahe: bool = True
    clahe_clip_limit: float = 2.0
    clahe_tile_grid_size: Tuple[int, int] = (8, 8)

    # --- Shadow removal ---
    enable_shadow_removal: bool = True
    shadow_kernel_size: int = 51  # phải là số lẻ

    # --- White balance ---
    enable_white_balance: bool = True

    # --- Grid‑line removal ---
    enable_grid_removal: bool = True
    grid_line_min_length: int = 80   # px tối thiểu để coi là dòng kẻ
    grid_morph_kernel_ratio: float = 0.04  # tỉ lệ kernel / chiều ảnh

    # --- Sharpen ---
    enable_sharpen: bool = True
    sharpen_amount: float = 0.5  # 0‑1, unsharp mask strength

    # --- Deskew ---
    enable_deskew: bool = True

    # --- Threshold ---
    threshold_mode: str = "adaptive_gaussian"
    # "otsu" | "adaptive_gaussian" | "adaptive_mean"
    adaptive_block_size: int = 0  # 0 = tự tính theo ảnh
    adaptive_c: int = 10

    # --- Quality assessment ---
    blur_threshold: float = 80.0
    brightness_low: int = 50
    brightness_high: int = 220
    min_resolution: int = 640  # px (cạnh nhỏ nhất)
    min_text_area_ratio: float = 0.005  # tỉ lệ vùng chữ / ảnh

    # --- Debug ---
    debug: bool = False
    debug_dir: str = "debug_preprocess"


# ---------------------------------------------------------------------------
# 2. IMAGE QUALITY ASSESSMENT
# ---------------------------------------------------------------------------

def assess_quality(
    gray: np.ndarray,
    config: PreprocessConfig,
) -> Dict[str, Any]:
    """Đánh giá chất lượng ảnh, trả dict chuẩn."""
    h, w = gray.shape[:2]
    warnings: List[str] = []

    # 2a. Độ mờ — Variance of Laplacian
    blur_score = float(cv2.Laplacian(gray, cv2.CV_64F).var())
    if blur_score < config.blur_threshold:
        warnings.append("Ảnh bị mờ (blur score thấp)")

    # 2b. Độ sáng trung bình
    brightness = float(np.mean(gray))
    if brightness < config.brightness_low:
        warnings.append("Ảnh quá tối")
    elif brightness > config.brightness_high:
        warnings.append("Ảnh bị cháy sáng")

    # 2c. Độ phân giải
    resolution = min(h, w)
    if resolution < config.min_resolution:
        warnings.append("Độ phân giải quá thấp")

    # 2d. Kiểm tra mất nét vùng trung tâm
    ch, cw = h // 4, w // 4
    center = gray[ch : h - ch, cw : w - cw]
    center_blur = float(cv2.Laplacian(center, cv2.CV_64F).var())
    if center_blur < config.blur_threshold * 0.6:
        warnings.append("Mất nét ở vùng trung tâm")

    # 2e. Nét chữ quá nhạt — histogram: ít pixel tối
    dark_ratio = float(np.sum(gray < 100)) / gray.size
    if dark_ratio < 0.02:
        warnings.append("Nét chữ quá nhạt, khó nhận dạng")

    # 2f. Chữ viết quá nhỏ — tìm contour sau threshold nhanh
    _, bw = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
    text_ratio = float(np.sum(bw > 0)) / bw.size
    if text_ratio < config.min_text_area_ratio:
        warnings.append("Chữ viết quá nhỏ hoặc ảnh chụp quá xa")

    return {
        "is_good": len(warnings) == 0,
        "warnings": warnings,
        "blur_score": round(blur_score, 2),
        "center_blur_score": round(center_blur, 2),
        "brightness": round(brightness, 2),
        "resolution": resolution,
        "dark_pixel_ratio": round(dark_ratio, 4),
        "text_area_ratio": round(text_ratio, 4),
    }


# ---------------------------------------------------------------------------
# 3. AUTO ROTATE (EXIF)
# ---------------------------------------------------------------------------

def auto_rotate_exif(image: np.ndarray, raw_bytes: Optional[bytes] = None) -> np.ndarray:
    """Xoay ảnh theo EXIF orientation (nếu có).

    Cần truyền raw_bytes gốc (trước decode) để đọc EXIF.
    Nếu không có raw_bytes, trả ảnh nguyên.
    """
    if raw_bytes is None:
        return image
    try:
        from PIL import Image as PILImage, ExifTags
        import io

        pil = PILImage.open(io.BytesIO(raw_bytes))
        exif = pil.getexif()
        orientation = None
        for tag, val in exif.items():
            if ExifTags.TAGS.get(tag) == "Orientation":
                orientation = val
                break
        if orientation is None:
            return image

        rotate_map = {
            3: cv2.ROTATE_180,
            6: cv2.ROTATE_90_CLOCKWISE,
            8: cv2.ROTATE_90_COUNTERCLOCKWISE,
        }
        if orientation in rotate_map:
            image = cv2.rotate(image, rotate_map[orientation])
    except Exception as exc:
        logger.debug("EXIF rotate skipped: %s", exc)
    return image


# ---------------------------------------------------------------------------
# 4. RESIZE
# ---------------------------------------------------------------------------

def resize_max_width(image: np.ndarray, max_width: int = 1600) -> np.ndarray:
    """Thu nhỏ ảnh nếu rộng hơn max_width, giữ tỷ lệ."""
    h, w = image.shape[:2]
    if w <= max_width:
        return image
    ratio = max_width / w
    new_size = (max_width, int(h * ratio))
    # INTER_AREA cho downscale giữ nét chữ nhỏ tốt hơn
    return cv2.resize(image, new_size, interpolation=cv2.INTER_AREA)


# ---------------------------------------------------------------------------
# 5. WHITE BALANCE (Gray World Assumption)
# ---------------------------------------------------------------------------

def white_balance(image: np.ndarray) -> np.ndarray:
    """Cân bằng trắng — giảm ám vàng/xanh do đèn lớp học.

    Gray World Assumption: trung bình 3 kênh nên bằng nhau.
    """
    if len(image.shape) < 3:
        return image
    result = image.astype(np.float32)
    avg_b = np.mean(result[:, :, 0])
    avg_g = np.mean(result[:, :, 1])
    avg_r = np.mean(result[:, :, 2])
    avg_all = (avg_b + avg_g + avg_r) / 3.0

    if avg_b > 0:
        result[:, :, 0] *= avg_all / avg_b
    if avg_g > 0:
        result[:, :, 1] *= avg_all / avg_g
    if avg_r > 0:
        result[:, :, 2] *= avg_all / avg_r

    return np.clip(result, 0, 255).astype(np.uint8)


# ---------------------------------------------------------------------------
# 6. SHADOW REMOVAL
# ---------------------------------------------------------------------------

def remove_shadow(gray: np.ndarray, kernel_size: int = 51) -> np.ndarray:
    """Loại bóng không đều (bóng tay, bóng điện thoại).

    Nguyên lý: ước lượng nền bằng medianBlur kernel lớn,
    rồi chia ảnh gốc cho nền → chuẩn hoá ánh sáng.
    Giữ nét chữ mảnh vì phép chia bảo toàn tỉ lệ tương phản cục bộ.
    """
    ks = kernel_size if kernel_size % 2 == 1 else kernel_size + 1
    bg = cv2.medianBlur(gray, ks)
    # cv2.divide scale=255 → pixel gốc ≈ nền thì ra ~255 (trắng)
    normalized = cv2.divide(gray, bg, scale=255)
    return normalized


# ---------------------------------------------------------------------------
# 7. REMOVE NOTEBOOK GRID LINES
# ---------------------------------------------------------------------------

def remove_grid_lines(gray: np.ndarray, config: PreprocessConfig) -> np.ndarray:
    """Loại bỏ dòng kẻ ô ly ngang/dọc, giữ nét chữ và dấu tiếng Việt.

    Dùng morphology mở (opening) với kernel dài theo 1 hướng
    để tách riêng thành phần ngang/dọc, rồi trừ khỏi ảnh.
    Kernel ngắn hơn nét chữ viết tay nên không xoá dấu thanh.
    """
    h, w = gray.shape[:2]

    # Nhị phân tạm để detect line
    _, bw = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)

    min_len = config.grid_line_min_length

    # --- Dòng ngang ---
    horiz_size = max(min_len, int(w * config.grid_morph_kernel_ratio))
    horiz_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (horiz_size, 1))
    horiz_lines = cv2.morphologyEx(bw, cv2.MORPH_OPEN, horiz_kernel, iterations=1)

    # --- Dòng dọc ---
    vert_size = max(min_len, int(h * config.grid_morph_kernel_ratio))
    vert_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (1, vert_size))
    vert_lines = cv2.morphologyEx(bw, cv2.MORPH_OPEN, vert_kernel, iterations=1)

    # Kết hợp mask dòng kẻ
    lines_mask = cv2.add(horiz_lines, vert_lines)

    # Làm mờ mask một chút để tránh cắt cứng vào nét chữ giao với dòng kẻ
    lines_mask = cv2.dilate(lines_mask, np.ones((3, 3), np.uint8), iterations=1)

    # Xoá dòng kẻ: đặt pixel dòng kẻ thành trắng (255 trên ảnh gốc)
    result = gray.copy()
    result[lines_mask > 0] = 255

    # Dùng inpaint nhẹ để nối lại nét chữ bị gián đoạn tại giao điểm
    # Chỉ inpaint vùng mask mỏng → nhanh, không làm biến dạng chữ
    thin_mask = cv2.erode(lines_mask, np.ones((3, 3), np.uint8), iterations=1)
    result = cv2.inpaint(result, thin_mask, inpaintRadius=2, flags=cv2.INPAINT_NS)

    return result


# ---------------------------------------------------------------------------
# 8. GRAYSCALE
# ---------------------------------------------------------------------------

def to_grayscale(image: np.ndarray) -> np.ndarray:
    """Chuyển sang ảnh xám nếu chưa."""
    if len(image.shape) == 2:
        return image
    if image.shape[2] == 4:
        image = cv2.cvtColor(image, cv2.COLOR_BGRA2BGR)
    return cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)


# ---------------------------------------------------------------------------
# 9. CLAHE CONTRAST ENHANCEMENT
# ---------------------------------------------------------------------------

def apply_clahe(
    gray: np.ndarray,
    clip_limit: float = 2.0,
    tile_grid_size: Tuple[int, int] = (8, 8),
) -> np.ndarray:
    """Tăng tương phản cục bộ bằng CLAHE.

    Làm nổi nét bút chì/mực nhạt mà không mất chữ nhỏ,
    vì CLAHE xử lý theo ô (tile) riêng biệt.
    """
    clahe = cv2.createCLAHE(clipLimit=clip_limit, tileGridSize=tile_grid_size)
    return clahe.apply(gray)


# ---------------------------------------------------------------------------
# 10. SHARPEN TEXT
# ---------------------------------------------------------------------------

def sharpen_text(gray: np.ndarray, amount: float = 0.5) -> np.ndarray:
    """Làm nét chữ viết tay bằng unsharp mask.

    Unsharp mask = original + amount * (original − blurred)
    Dùng GaussianBlur sigma nhỏ để chỉ sharpen edge ký tự,
    tránh oversharpen gây noise trên nền giấy.
    """
    amount = max(0.0, min(amount, 1.0))
    blurred = cv2.GaussianBlur(gray, (0, 0), sigmaX=1.5)
    sharpened = cv2.addWeighted(gray, 1.0 + amount, blurred, -amount, 0)
    return sharpened


# ---------------------------------------------------------------------------
# 11. DESKEW
# ---------------------------------------------------------------------------

def deskew(gray: np.ndarray) -> np.ndarray:
    """Chỉnh nghiêng ảnh dựa trên phân tích góc minAreaRect.

    Chỉ xoay nếu góc lệch < 15° để tránh xoay sai trên ảnh đúng.
    """
    # Threshold tạm
    _, bw = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
    coords = np.column_stack(np.where(bw > 0))
    if len(coords) < 100:
        return gray

    angle = cv2.minAreaRect(coords)[-1]
    # OpenCV trả angle trong [-90, 0)
    if angle < -45:
        angle = 90 + angle
    if abs(angle) > 15 or abs(angle) < 0.3:
        return gray

    h, w = gray.shape
    center = (w // 2, h // 2)
    M = cv2.getRotationMatrix2D(center, angle, 1.0)
    rotated = cv2.warpAffine(
        gray, M, (w, h),
        flags=cv2.INTER_CUBIC,
        borderMode=cv2.BORDER_REPLICATE,
    )
    return rotated


# ---------------------------------------------------------------------------
# 12. ADAPTIVE THRESHOLD
# ---------------------------------------------------------------------------

def apply_threshold(
    gray: np.ndarray,
    mode: str = "adaptive_gaussian",
    block_size: int = 0,
    c_val: int = 10,
) -> np.ndarray:
    """Nhị phân hoá ảnh.

    Modes:
      - "otsu": Otsu global threshold.
      - "adaptive_gaussian": Adaptive Gaussian (tốt cho ánh sáng lệch).
      - "adaptive_mean": Adaptive Mean.

    block_size=0 → tự tính theo chiều rộng ảnh.
    c_val: hằng số trừ, lọc nhiễu nền ô ly.
    """
    if mode == "otsu":
        _, result = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        return result

    # Tự tính block_size hợp lý theo ảnh
    if block_size <= 0:
        w = gray.shape[1]
        block_size = max(21, int(w / 40))
        if block_size % 2 == 0:
            block_size += 1

    method = (
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C
        if mode == "adaptive_gaussian"
        else cv2.ADAPTIVE_THRESH_MEAN_C
    )
    return cv2.adaptiveThreshold(gray, 255, method, cv2.THRESH_BINARY, block_size, c_val)


# ---------------------------------------------------------------------------
# 13. MAIN PIPELINE
# ---------------------------------------------------------------------------

def preprocess_for_ocr(
    image: np.ndarray,
    config: Optional[PreprocessConfig] = None,
    raw_bytes: Optional[bytes] = None,
) -> Tuple[np.ndarray, Dict[str, Any], Optional[Dict[str, np.ndarray]]]:
    """Pipeline tiền xử lý ảnh cho OCR chữ viết tay học sinh tiểu học.

    Pipeline:
      image → auto rotate → resize → white balance → grayscale
      → shadow removal → remove grid lines → CLAHE → sharpen
      → deskew → adaptive threshold → quality assessment

    Args:
        image: ảnh BGR (đọc từ cv2.imread hoặc decode).
        config: cấu hình pipeline; None = dùng mặc định.
        raw_bytes: byte gốc của file ảnh (dùng cho EXIF rotate).

    Returns:
        (processed_image, quality_report, debug_images)
        debug_images = dict tên→ảnh nếu config.debug, else None.
    """
    if config is None:
        config = PreprocessConfig()

    debug_imgs: Dict[str, np.ndarray] = {} if config.debug else {}
    save = config.debug  # cờ tắt/bật lưu debug

    def _save(name: str, img: np.ndarray) -> None:
        if save:
            debug_imgs[name] = img.copy()

    _save("00_original", image)

    # 1. Auto rotate EXIF
    img = auto_rotate_exif(image, raw_bytes)
    _save("01_rotated", img)

    # 2. Resize
    img = resize_max_width(img, config.resize_max_width)
    _save("02_resized", img)

    # 3. White balance (trên ảnh màu)
    if config.enable_white_balance and len(img.shape) == 3:
        img = white_balance(img)
        _save("03_white_balance", img)

    # 4. Grayscale
    gray = to_grayscale(img)
    _save("04_grayscale", gray)

    # 5. Shadow removal
    if config.enable_shadow_removal:
        gray = remove_shadow(gray, config.shadow_kernel_size)
        _save("05_shadow_removed", gray)

    # 6. Grid‑line removal
    if config.enable_grid_removal:
        gray = remove_grid_lines(gray, config)
        _save("06_grid_removed", gray)

    # 7. CLAHE
    if config.enable_clahe:
        gray = apply_clahe(gray, config.clahe_clip_limit, config.clahe_tile_grid_size)
        _save("07_clahe", gray)

    # 8. Sharpen
    if config.enable_sharpen:
        gray = sharpen_text(gray, config.sharpen_amount)
        _save("08_sharpened", gray)

    # 9. Deskew
    if config.enable_deskew:
        gray = deskew(gray)
        _save("09_deskewed", gray)

    # 10. Threshold
    result = apply_threshold(
        gray,
        mode=config.threshold_mode,
        block_size=config.adaptive_block_size,
        c_val=config.adaptive_c,
    )
    _save("10_threshold", result)

    # 11. Quality assessment (trên ảnh grayscale trước threshold)
    quality = assess_quality(gray, config)
    if quality["warnings"]:
        logger.warning("Quality warnings: %s", quality["warnings"])

    # Lưu debug ra file nếu bật
    if save:
        os.makedirs(config.debug_dir, exist_ok=True)
        for name, dbg_img in debug_imgs.items():
            path = os.path.join(config.debug_dir, f"{name}.png")
            cv2.imwrite(path, dbg_img)
            logger.debug("Debug image saved: %s", path)

    return result, quality, debug_imgs if save else None


# ---------------------------------------------------------------------------
# 14. CONVENIENCE HELPERS
# ---------------------------------------------------------------------------

def load_image(path: str) -> Tuple[np.ndarray, bytes]:
    """Đọc ảnh từ file, trả (image_bgr, raw_bytes)."""
    with open(path, "rb") as f:
        raw = f.read()
    arr = np.frombuffer(raw, dtype=np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError(f"Không đọc được ảnh: {path}")
    return img, raw


def decode_base64_image(b64: str) -> Tuple[np.ndarray, bytes]:
    """Decode ảnh base64 → (image_bgr, raw_bytes)."""
    import base64
    raw = base64.b64decode(b64)
    arr = np.frombuffer(raw, dtype=np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("Không decode được ảnh từ base64")
    return img, raw


# ---------------------------------------------------------------------------
# 15. CLI TEST
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import sys

    if len(sys.argv) < 2:
        print("Usage: python image_utils.py <image_path> [--debug]")
        sys.exit(1)

    logging.basicConfig(level=logging.DEBUG)
    img_path = sys.argv[1]
    debug = "--debug" in sys.argv

    cfg = PreprocessConfig(debug=debug)
    img, raw = load_image(img_path)

    processed, report, dbg = preprocess_for_ocr(img, cfg, raw)

    print("\n=== QUALITY REPORT ===")
    for k, v in report.items():
        print(f"  {k}: {v}")

    out_path = "processed_output.png"
    cv2.imwrite(out_path, processed)
    print(f"\nSaved → {out_path}")
    if debug:
        print(f"Debug images → {cfg.debug_dir}/")
