"""
yolo_detector.py — Universal Word Detection & Dynamic Layout Analysis for Handwriting.
Sử dụng YOLOv8 phát hiện tọa độ từ viết tay và thuật toán Adaptive Line-Clustering
sắp xếp theo thứ tự đọc tự nhiên cho mọi loại văn bản tiếng Việt.
"""

import os
import io
import logging
from typing import List, Dict, Any, Optional
import numpy as np
from PIL import Image

logger = logging.getLogger("yolo_detector")

# Đường dẫn mặc định đến trọng số đã train
DEFAULT_WEIGHTS_PATH = os.path.abspath(
    os.path.join(
        os.path.dirname(__file__),
        "..",
        "Test_train_29_12",
        "ver2",
        "runs",
        "detect",
        "train",
        "weights",
        "best.pt",
    )
)

_yolo_model = None
_model_loaded = False


def load_yolo_model(weights_path: Optional[str] = None):
    """Khởi tạo và tải model YOLOv8 (Singleton)"""
    global _yolo_model, _model_loaded
    if _model_loaded and _yolo_model is not None:
        return _yolo_model

    path = weights_path or os.getenv("YOLO_WEIGHTS_PATH") or DEFAULT_WEIGHTS_PATH
    if not os.path.exists(path):
        logger.warning(f"[YOLO] Không tìm thấy file trọng số tại: {path}")
        return None

    try:
        from ultralytics import YOLO

        logger.info(f"[YOLO] Đang nạp model từ: {path}...")
        _yolo_model = YOLO(path)
        _model_loaded = True
        logger.info("[YOLO] ✅ Nạp model YOLOv8 thành công!")
        return _yolo_model
    except Exception as e:
        logger.error(f"[YOLO] ❌ Lỗi khi nạp model YOLOv8: {e}")
        return None


def sort_reading_order_dynamic(
    boxes: List[Dict[str, Any]], img_width: int, img_height: int
) -> Dict[str, Any]:
    """
    Thuật toán Phân tích Bố cục Không gian Động (Dynamic Layout Analysis):
    - Tự động tính chiều cao chữ trung vị (Median Height).
    - Gom cụm thích ứng các từ cùng dòng (Adaptive Line-Clustering).
    - Sắp xếp dòng từ trên xuống dưới, trong từng dòng từ trái sang phải.
    - Chuẩn hóa tọa độ theo tỉ lệ tương đối [0..1] để hiển thị responsive trên mọi màn hình.
    """
    if not boxes:
        return {
            "total_words": 0,
            "image_dimensions": {"width": img_width, "height": img_height},
            "lines": [],
            "flat_boxes": [],
        }

    # Tính toán thông số hình học từng hộp
    enriched_boxes = []
    for b in boxes:
        x1, y1, x2, y2 = b["x1"], b["y1"], b["x2"], b["y2"]
        w = max(1.0, x2 - x1)
        h = max(1.0, y2 - y1)
        y_mid = (y1 + y2) / 2.0
        x_mid = (x1 + x2) / 2.0
        enriched_boxes.append(
            {
                "x1": x1,
                "y1": y1,
                "x2": x2,
                "y2": y2,
                "w": w,
                "h": h,
                "x_mid": x_mid,
                "y_mid": y_mid,
                "conf": b.get("conf", 1.0),
            }
        )

    # 1. Tính chiều cao trung vị (Median Height) để loại bỏ ngoại lai nét kéo dài (g, y, p, b, h)
    heights = [b["h"] for b in enriched_boxes]
    median_h = float(np.median(heights)) if heights else 30.0
    line_threshold = max(15.0, 0.55 * median_h)

    # 2. Sắp xếp sơ bộ theo trục dọc (y_mid)
    enriched_boxes.sort(key=lambda b: b["y_mid"])

    # 3. Phân cụm dòng thích ứng (Adaptive Line Sweeping)
    lines_raw: List[List[Dict[str, Any]]] = []
    current_line: List[Dict[str, Any]] = [enriched_boxes[0]]
    current_line_y = enriched_boxes[0]["y_mid"]

    for b in enriched_boxes[1:]:
        if abs(b["y_mid"] - current_line_y) <= line_threshold:
            current_line.append(b)
            # Cập nhật y_mid trung bình của dòng đang xét
            current_line_y = np.mean([item["y_mid"] for item in current_line])
        else:
            lines_raw.append(current_line)
            current_line = [b]
            current_line_y = b["y_mid"]
    if current_line:
        lines_raw.append(current_line)

    # 4. Sắp xếp các dòng từ trên xuống dưới theo y trung bình
    lines_raw.sort(key=lambda line: np.mean([b["y_mid"] for b in line]))

    # 5. Trong mỗi dòng, sắp xếp các từ từ trái sang phải theo x1
    structured_lines = []
    flat_boxes = []
    box_id_counter = 0

    for line_idx, line in enumerate(lines_raw):
        # Sắp xếp từ trái qua phải
        line_sorted = sorted(line, key=lambda b: b["x1"])
        line_boxes = []

        for word_idx_in_line, b in enumerate(line_sorted):
            x1, y1, x2, y2 = b["x1"], b["y1"], b["x2"], b["y2"]

            # Chuẩn hóa tỉ lệ tương đối [0..1]
            rel_x1 = max(0.0, min(1.0, x1 / img_width)) if img_width > 0 else 0.0
            rel_y1 = max(0.0, min(1.0, y1 / img_height)) if img_height > 0 else 0.0
            rel_x2 = max(0.0, min(1.0, x2 / img_width)) if img_width > 0 else 1.0
            rel_y2 = max(0.0, min(1.0, y2 / img_height)) if img_height > 0 else 1.0
            rel_w = max(0.0, min(1.0, (x2 - x1) / img_width)) if img_width > 0 else 0.0
            rel_h = max(0.0, min(1.0, (y2 - y1) / img_height)) if img_height > 0 else 0.0

            box_data = {
                "box_id": box_id_counter,
                "line_index": line_idx,
                "word_index_in_line": word_idx_in_line,
                "x1": round(x1, 1),
                "y1": round(y1, 1),
                "x2": round(x2, 1),
                "y2": round(y2, 1),
                "width": round(x2 - x1, 1),
                "height": round(y2 - y1, 1),
                "conf": round(float(b["conf"]), 4),
                "rel_x1": round(rel_x1, 5),
                "rel_y1": round(rel_y1, 5),
                "rel_x2": round(rel_x2, 5),
                "rel_y2": round(rel_y2, 5),
                "rel_w": round(rel_w, 5),
                "rel_h": round(rel_h, 5),
            }

            line_boxes.append(box_data)
            flat_boxes.append(box_data)
            box_id_counter += 1

        structured_lines.append(
            {
                "line_index": line_idx,
                "word_count": len(line_boxes),
                "y_avg": round(float(np.mean([b["y1"] for b in line_boxes])), 1),
                "boxes": line_boxes,
                "words": line_boxes,
            }
        )

    return {
        "total_words": len(flat_boxes),
        "total_lines": len(structured_lines),
        "image_dimensions": {"width": img_width, "height": img_height},
        "lines": structured_lines,
        "flat_boxes": flat_boxes,
        "boxes": flat_boxes,
    }


def detect_words_from_image(
    image: Image.Image, conf_threshold: float = 0.25
) -> Dict[str, Any]:
    """
    Chạy YOLOv8 detect trên ảnh PIL và tự động sắp xếp theo thứ tự đọc tự nhiên.
    """
    model = load_yolo_model()
    if model is None:
        return {
            "error": "Model YOLOv8 chưa sẵn sàng hoặc không tìm thấy file trọng số",
            "total_words": 0,
            "lines": [],
            "flat_boxes": [],
        }

    width, height = image.size

    # Inference YOLOv8
    results = model(image, conf=conf_threshold, verbose=False)
    raw_boxes = []

    if results and len(results) > 0:
        det_boxes = results[0].boxes
        if det_boxes is not None and len(det_boxes) > 0:
            xyxy_list = det_boxes.xyxy.cpu().numpy()
            conf_list = det_boxes.conf.cpu().numpy()
            for coords, conf in zip(xyxy_list, conf_list):
                x1, y1, x2, y2 = coords.tolist()
                raw_boxes.append(
                    {
                        "x1": float(x1),
                        "y1": float(y1),
                        "x2": float(x2),
                        "y2": float(y2),
                        "conf": float(conf),
                    }
                )

    return sort_reading_order_dynamic(raw_boxes, width, height)
